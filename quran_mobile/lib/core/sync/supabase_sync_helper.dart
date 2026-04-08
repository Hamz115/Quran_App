import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/repositories/class_repository.dart';
import '../../data/repositories/mistake_repository.dart';
import '../database/database_helper.dart';

/// Syncs local SQLite data with Supabase cloud.
///
/// Strategy: write to local SQLite first (instant), then push to Supabase
/// in the background. Pull remote changes on app launch and periodically.
class SupabaseSyncHelper {
  final ClassRepository _classRepo;
  final MistakeRepository _mistakeRepo;
  final SupabaseClient _supabase;
  Timer? _periodicTimer;
  bool _isSyncing = false;

  SupabaseSyncHelper({
    ClassRepository? classRepo,
    MistakeRepository? mistakeRepo,
    SupabaseClient? supabaseClient,
  })  : _classRepo = classRepo ?? ClassRepository(),
        _mistakeRepo = mistakeRepo ?? MistakeRepository(),
        _supabase = supabaseClient ?? Supabase.instance.client;

  /// Full sync: push local pending changes first, then pull remote data.
  /// v2.0.0: role parameter kept for backward compat but ignored — always syncs everything.
  Future<void> sync(String userId, [String? role]) async {
    if (_isSyncing) return;
    _isSyncing = true;
    try {
      // Push first so we don't lose local changes
      await pushPendingClasses(userId);
      await pushPendingMistakes(userId);

      // Then pull remote data (both listener + reciter views)
      await pullAll(userId);
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] sync error: $e');
    } finally {
      _isSyncing = false;
    }
  }

  /// Start periodic sync (every 30 seconds).
  void startPeriodicSync(String userId, [String? role]) {
    _periodicTimer?.cancel();
    _periodicTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      sync(userId);
    });
  }

  /// Stop periodic sync.
  void stopPeriodicSync() {
    _periodicTimer?.cancel();
    _periodicTimer = null;
  }

  /// Push local pending mistakes to Supabase.
  Future<void> pushPendingMistakes(String userId) async {
    try {
      final pendingMistakes = await _mistakeRepo.getPendingSyncMistakes();
      if (pendingMistakes.isEmpty) return;

      for (final mistake in pendingMistakes) {
        try {
          final studentId = mistake.toMap()['student_id'] as String? ?? userId;

          if (mistake.supabaseId != null && mistake.supabaseId!.isNotEmpty) {
            // Update existing Supabase record
            await _supabase.from('mistakes').update({
              'error_count': mistake.errorCount,
              'word_text': mistake.wordText,
            }).eq('id', mistake.supabaseId!);

            if (mistake.id != null) {
              await _mistakeRepo.markMistakeSyncedWithSupabaseId(
                mistake.id!, mistake.supabaseId!,
              );
            }
          } else {
            // Check if it already exists on Supabase by location
            var query = _supabase
                .from('mistakes')
                .select('id, error_count')
                .eq('student_id', studentId)
                .eq('surah_number', mistake.surahNumber)
                .eq('ayah_number', mistake.ayahNumber)
                .eq('word_index', mistake.wordIndex);

            if (mistake.charIndex != null) {
              query = query.eq('char_index', mistake.charIndex!);
            } else {
              query = query.isFilter('char_index', null);
            }

            final existing = await query.maybeSingle();

            if (existing != null) {
              // Update existing — take max count
              final remoteCount = existing['error_count'] as int? ?? 1;
              final newCount = mistake.errorCount > remoteCount
                  ? mistake.errorCount
                  : remoteCount;
              await _supabase
                  .from('mistakes')
                  .update({'error_count': newCount})
                  .eq('id', existing['id']);

              if (mistake.id != null) {
                await _mistakeRepo.markMistakeSyncedWithSupabaseId(
                  mistake.id!, existing['id'].toString(),
                );
              }
            } else {
              // Create new on Supabase
              final response = await _supabase.from('mistakes').insert({
                'student_id': studentId,
                'surah_number': mistake.surahNumber,
                'ayah_number': mistake.ayahNumber,
                'word_index': mistake.wordIndex,
                'word_text': mistake.wordText,
                'char_index': mistake.charIndex,
                'error_count': mistake.errorCount,
              }).select('id').single();

              if (mistake.id != null) {
                await _mistakeRepo.markMistakeSyncedWithSupabaseId(
                  mistake.id!, response['id'].toString(),
                );
              }
            }
          }

          // Push pending occurrences for this mistake
          await _pushPendingOccurrences(mistake.id!);
        } catch (e) {
          debugPrint('[SupabaseSyncHelper] push mistake ${mistake.id} error: $e');
        }
      }
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] pushPendingMistakes error: $e');
    }
  }

  /// Push pending mistake occurrences.
  Future<void> _pushPendingOccurrences(int mistakeId) async {
    try {
      final db = await DatabaseHelper.instance.appDatabase;
      final pendingOccs = await db.query(
        'mistake_occurrences',
        where: "mistake_id = ? AND sync_status = 'pending' AND is_deleted = 0",
        whereArgs: [mistakeId],
      );

      for (final occ in pendingOccs) {
        final supabaseClassId = occ['supabase_class_id'] as String?;
        if (supabaseClassId == null || supabaseClassId.isEmpty) continue;

        // Get the supabase_id of the mistake
        final mistakeRow = await db.query('mistakes',
          columns: ['supabase_id'],
          where: 'id = ?',
          whereArgs: [mistakeId],
        );
        final supabaseMistakeId = mistakeRow.isNotEmpty
            ? mistakeRow.first['supabase_id'] as String?
            : null;
        if (supabaseMistakeId == null) continue;

        try {
          await _supabase.from('mistake_occurrences').insert({
            'mistake_id': supabaseMistakeId,
            'class_id': supabaseClassId,
          });

          await db.update(
            'mistake_occurrences',
            {'sync_status': 'synced'},
            where: 'id = ?',
            whereArgs: [occ['id']],
          );
        } catch (e) {
          // Might be duplicate — ignore and mark synced
          debugPrint('[SupabaseSyncHelper] push occurrence error: $e');
        }
      }
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] _pushPendingOccurrences error: $e');
    }
  }

  /// Push local pending classes to Supabase.
  Future<void> pushPendingClasses(String teacherId) async {
    try {
      final pendingClasses = await _classRepo.getPendingSyncClasses();
      if (pendingClasses.isEmpty) return;

      for (final cls in pendingClasses) {
        try {
          if (cls.supabaseId != null && cls.supabaseId!.isNotEmpty) {
            // Update existing Supabase record
            await _supabase.from('classes').update({
              'date': cls.date,
              'day': cls.day,
              'notes': cls.notes,
              'performance': cls.performance,
            }).eq('id', cls.supabaseId!);

            if (cls.id != null) {
              await _classRepo.markClassSyncedWithSupabaseId(
                cls.id!, cls.supabaseId!,
              );
            }
          } else {
            // Create new on Supabase (dual-write teacher_id + listener_id)
            final response = await _supabase.from('classes').insert({
              'teacher_id': teacherId,
              'listener_id': teacherId,
              'date': cls.date,
              'day': cls.day,
              'notes': cls.notes,
              'performance': cls.performance,
            }).select().single();

            final newSupabaseId = response['id'].toString();
            if (cls.id != null) {
              await _classRepo.markClassSyncedWithSupabaseId(
                cls.id!, newSupabaseId,
              );
            }

            // Push assignments for this class
            for (final assignment in cls.assignments) {
              try {
                final aResponse = await _supabase.from('assignments').insert({
                  'class_id': newSupabaseId,
                  'type': assignment.type,
                  'start_surah': assignment.startSurah,
                  'end_surah': assignment.endSurah,
                  'start_ayah': assignment.startAyah,
                  'end_ayah': assignment.endAyah,
                  if (assignment.studentId != null) 'student_id': assignment.studentId,
                }).select('id').single();

                if (assignment.id != null) {
                  await _classRepo.markAssignmentSyncedWithSupabaseId(
                    assignment.id!, aResponse['id'].toString(),
                  );
                }
              } catch (e) {
                debugPrint('[SupabaseSyncHelper] push assignment error: $e');
              }
            }
          }
        } catch (e) {
          debugPrint('[SupabaseSyncHelper] push class ${cls.id} error: $e');
        }
      }
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] pushPendingClasses error: $e');
    }
  }

  /// Pull all remote data to local SQLite.
  /// v2.0.0: always pulls both listener classes + reciter classes + all mistakes.
  Future<void> pullAll(String userId, [String? role]) async {
    try {
      // Pull classes I created (as listener)
      await _pullClasses(userId);
      // Pull classes I'm enrolled in (as reciter)
      await _pullClassesForStudent(userId);
      // Pull mistakes for my contacts + own mistakes
      await _pullMistakesForTeacher(userId);
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] pullAll error: $e');
    }
  }

  /// Pull classes from Supabase for a teacher.
  /// Also reconciles: deletes local synced classes that no longer exist on Supabase.
  Future<void> _pullClasses(String teacherId) async {
    try {
      final response = await _supabase
          .from('classes')
          .select('*, assignments(*)')
          .or('teacher_id.eq.$teacherId,listener_id.eq.$teacherId')
          .order('date', ascending: false);

      final remoteIds = <String>{};

      for (final row in (response as List)) {
        final supabaseId = row['id'].toString();
        remoteIds.add(supabaseId);
        final assignmentsRaw = (row['assignments'] as List?) ?? [];

        await _classRepo.upsertFromSupabase(
          supabaseId: supabaseId,
          teacherId: teacherId,
          date: row['date'] ?? '',
          day: row['day'] ?? '',
          notes: row['notes'] as String?,
          performance: row['performance'] as String?,
          createdAt: row['created_at'] as String?,
          assignments: assignmentsRaw,
        );
      }

      // Reconcile: remove local synced classes that no longer exist on Supabase
      await _classRepo.removeStaleClasses(teacherId, remoteIds);
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] _pullClasses error: $e');
    }
  }

  /// Pull classes for a student (via class_students join).
  Future<void> _pullClassesForStudent(String studentId) async {
    try {
      final response = await _supabase
          .from('class_students')
          .select('class_id, classes(*, assignments(*))')
          .eq('student_id', studentId);

      for (final row in (response as List)) {
        final classData = row['classes'];
        if (classData == null) continue;

        final supabaseId = classData['id'].toString();
        final teacherId = classData['teacher_id']?.toString() ?? '';
        final assignmentsRaw = (classData['assignments'] as List?) ?? [];

        await _classRepo.upsertFromSupabase(
          supabaseId: supabaseId,
          teacherId: teacherId,
          date: classData['date'] ?? '',
          day: classData['day'] ?? '',
          notes: classData['notes'] as String?,
          performance: classData['performance'] as String?,
          createdAt: classData['created_at'] as String?,
          assignments: assignmentsRaw,
        );
      }
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] _pullClassesForStudent error: $e');
    }
  }

  /// Pull mistakes for a teacher — pull mistakes of ALL their students.
  Future<void> _pullMistakesForTeacher(String teacherId) async {
    try {
      // Get all student IDs for this teacher
      final studentsResponse = await _supabase
          .from('teacher_students')
          .select('student_id')
          .eq('teacher_id', teacherId);

      final studentIds = (studentsResponse as List)
          .map((r) => r['student_id'].toString())
          .toList();

      // Also pull own mistakes if the teacher has any
      studentIds.add(teacherId);

      for (final studentId in studentIds) {
        await _pullMistakesForStudent(studentId);
      }

      // Pull mistake_occurrences for teacher's classes
      await _pullOccurrencesForTeacher(teacherId);
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] _pullMistakesForTeacher error: $e');
    }
  }

  /// Pull mistakes for a specific student.
  Future<void> _pullMistakesForStudent(String studentId) async {
    try {
      final response = await _supabase
          .from('mistakes')
          .select()
          .eq('student_id', studentId);

      for (final row in (response as List)) {
        await _mistakeRepo.upsertFromServer(
          supabaseId: row['id'].toString(),
          studentId: studentId,
          surahNumber: row['surah_number'] as int,
          ayahNumber: row['ayah_number'] as int,
          wordIndex: row['word_index'] as int,
          wordText: (row['word_text'] as String?) ?? '',
          charIndex: row['char_index'] as int?,
          errorCount: row['error_count'] as int? ?? 1,
        );
      }
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] _pullMistakesForStudent error: $e');
    }
  }

  /// Pull mistake_occurrences for all classes owned by a teacher.
  Future<void> _pullOccurrencesForTeacher(String teacherId) async {
    try {
      final db = await DatabaseHelper.instance.appDatabase;

      // Get all local classes for this listener that have supabase_id
      final localClasses = await db.query('classes',
        columns: ['id', 'supabase_id'],
        where: '(teacher_id = ? OR listener_id = ?) AND supabase_id IS NOT NULL AND is_deleted = 0',
        whereArgs: [teacherId, teacherId],
      );

      for (final cls in localClasses) {
        final supabaseClassId = cls['supabase_id'] as String;
        final localClassId = cls['id'] as int;

        try {
          final occResponse = await _supabase
              .from('mistake_occurrences')
              .select('id, mistake_id, class_id')
              .eq('class_id', supabaseClassId);

          for (final occ in (occResponse as List)) {
            final supabaseOccId = occ['id'].toString();
            final supabaseMistakeId = occ['mistake_id'].toString();

            // Check if this occurrence already exists locally
            final existing = await db.query('mistake_occurrences',
              where: 'supabase_id = ?',
              whereArgs: [supabaseOccId],
            );
            if (existing.isNotEmpty) continue;

            // Find local mistake by supabase_id
            final localMistake = await db.query('mistakes',
              columns: ['id'],
              where: 'supabase_id = ?',
              whereArgs: [supabaseMistakeId],
            );
            if (localMistake.isEmpty) continue;

            final localMistakeId = localMistake.first['id'] as int;

            await db.insert('mistake_occurrences', {
              'supabase_id': supabaseOccId,
              'mistake_id': localMistakeId,
              'supabase_mistake_id': supabaseMistakeId,
              'class_id': localClassId,
              'supabase_class_id': supabaseClassId,
              'occurred_at': DateTime.now().toIso8601String(),
              'sync_status': 'synced',
              'is_deleted': 0,
            });
          }
        } catch (e) {
          debugPrint('[SupabaseSyncHelper] pull occurrences for class $supabaseClassId error: $e');
        }
      }
    } catch (e) {
      debugPrint('[SupabaseSyncHelper] _pullOccurrencesForTeacher error: $e');
    }
  }

  /// Dispose resources.
  void dispose() {
    stopPeriodicSync();
  }
}

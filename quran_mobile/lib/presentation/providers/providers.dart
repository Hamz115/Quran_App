import 'package:flutter/foundation.dart' show kIsWeb, debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/constants.dart';
import '../../core/database/database_helper.dart';
import '../../core/network/api_client.dart';
import '../../core/network/connectivity_service.dart';
import '../../core/sync/sync_service.dart';
import '../../core/sync/supabase_sync_helper.dart';
import '../../data/repositories/quran_repository.dart';
import '../../data/repositories/class_repository.dart';
import '../../data/repositories/mistake_repository.dart';
import '../../data/models/surah.dart';
import '../../data/models/class_session.dart';
import '../../data/models/mistake.dart';
import '../../data/models/assignment.dart';
import '../../data/models/suggested_portions.dart';
import '../../data/models/app_user.dart';
import 'auth_provider.dart';

// View mode provider — lets teachers switch between Teacher/Student view
final viewModeProvider = StateProvider<UserRole>((ref) {
  final auth = ref.watch(authProvider);
  return auth.user?.role ?? UserRole.student;
});

// Core providers
final databaseHelperProvider = Provider((ref) => DatabaseHelper.instance);
final apiClientProvider = Provider((ref) => ApiClient());
final connectivityProvider = Provider((ref) => ConnectivityService());

// Repository providers (used for local-first data operations)
final quranRepositoryProvider = Provider((ref) => QuranRepository());
final classRepositoryProvider = Provider((ref) => ClassRepository());
final mistakeRepositoryProvider = Provider((ref) => MistakeRepository());

// Supabase sync helper provider
final supabaseSyncHelperProvider = Provider((ref) {
  return SupabaseSyncHelper(
    classRepo: ref.watch(classRepositoryProvider),
    mistakeRepo: ref.watch(mistakeRepositoryProvider),
  );
});

// Sync provider (legacy HTTP-based — kept for compatibility)
final syncServiceProvider = Provider((ref) {
  return SyncService(
    apiClient: ref.watch(apiClientProvider),
    connectivity: ref.watch(connectivityProvider),
    classRepository: ref.watch(classRepositoryProvider),
    mistakeRepository: ref.watch(mistakeRepositoryProvider),
  );
});

// Connectivity stream provider
final connectivityStreamProvider = StreamProvider<NetworkStatus>((ref) {
  if (kIsWeb) return Stream.value(NetworkStatus.online);
  return ref.watch(connectivityProvider).statusStream;
});

// Sync state stream provider
final syncStateProvider = StreamProvider<SyncState>((ref) {
  if (kIsWeb) return Stream.value(SyncState.idle);
  return ref.watch(syncServiceProvider).stateStream;
});

// Surah list provider (Quran text data: bundled SQLite on mobile, static on web)
final surahListProvider = FutureProvider<List<Surah>>((ref) async {
  if (kIsWeb) return _staticSurahs;
  final repo = ref.watch(quranRepositoryProvider);
  return repo.getAllSurahs();
});

// Single surah with ayahs provider (Quran text data: bundled SQLite on mobile, static on web)
final surahWithAyahsProvider = FutureProvider.family<SurahWithAyahs?, int>((ref, surahNumber) async {
  if (kIsWeb) return _getStaticSurahWithAyahs(surahNumber);
  final repo = ref.watch(quranRepositoryProvider);
  return repo.getSurahWithAyahs(surahNumber);
});

// Teacher's students provider (STAYS ON SUPABASE — cross-device operation)
final teacherStudentsProvider = FutureProvider<List<({String id, String name})>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) return [];

  final supabase = Supabase.instance.client;
  final response = await supabase
      .from('teacher_students')
      .select('student_id, student:profiles!student_id(id, name)')
      .eq('teacher_id', user.id);

  return (response as List).map((row) {
    final student = row['student'] as Map<String, dynamic>?;
    return (
      id: (student?['id'] ?? row['student_id']).toString(),
      name: (student?['name'] ?? 'Student').toString(),
    );
  }).toList();
});

/// Add a student by email address (STAYS ON SUPABASE — cross-device operation).
Future<String> addStudentByEmail(WidgetRef ref, String email) async {
  final user = ref.read(authProvider).user;
  if (user == null) throw Exception('Not authenticated');

  final supabase = Supabase.instance.client;

  // Find student by email
  final studentData = await supabase
      .from('profiles')
      .select('id, name')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

  if (studentData == null) {
    throw Exception('No user found with that email');
  }

  final studentId = studentData['id'].toString();
  final studentName = (studentData['name'] as String?) ?? 'Student';

  // Check if already added
  final existing = await supabase
      .from('teacher_students')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('student_id', studentId)
      .maybeSingle();

  if (existing != null) {
    throw Exception('Student already added to your list');
  }

  // Add relationship
  await supabase.from('teacher_students').insert({
    'teacher_id': user.id,
    'student_id': studentId,
  });

  // Invalidate provider so list refreshes
  ref.invalidate(teacherStudentsProvider);

  return studentName;
}

// ============ CLASS STUDENTS PROVIDER (fetches students enrolled in a specific class) ============

final classStudentsProvider = FutureProvider.family<List<({String id, String name})>, String>((ref, classId) async {
  final supabase = Supabase.instance.client;
  final response = await supabase
      .from('class_students')
      .select('student_id, student:profiles!student_id(id, name)')
      .eq('class_id', classId);

  return (response as List).map((row) {
    final student = row['student'] as Map<String, dynamic>?;
    return (
      id: (student?['id'] ?? row['student_id']).toString(),
      name: (student?['name'] ?? 'Student').toString(),
    );
  }).toList();
});

// ============ LOCAL-FIRST: MISTAKE IDS FOR CLASS ============

// Mistake IDs belonging to a specific class — LOCAL FIRST
final classMistakeIdsProvider = FutureProvider.family<Set<String>, String>((ref, classId) async {
  // Watch mistakesProvider so this re-fetches whenever mistakes are added/removed
  ref.watch(mistakesProvider);
  final mistakeRepo = ref.watch(mistakeRepositoryProvider);
  return mistakeRepo.getOccurrencesForClass(classId);
});

/// A mistake from a previous class, carrying class date context.
class PreviousMistakeInfo {
  final int surahNumber;
  final int ayahNumber;
  final int wordIndex;
  final String wordText;
  final int errorCount;
  final String classDate;
  final String classDay;

  const PreviousMistakeInfo({
    required this.surahNumber,
    required this.ayahNumber,
    required this.wordIndex,
    required this.wordText,
    required this.errorCount,
    required this.classDate,
    required this.classDay,
  });
}

/// A group of mistakes from a single previous class.
class PreviousClassMistakeGroup {
  final String classDate;
  final String classDay;
  final List<PreviousMistakeInfo> mistakes;

  const PreviousClassMistakeGroup({
    required this.classDate,
    required this.classDay,
    required this.mistakes,
  });
}

// ============ LOCAL-FIRST: PREVIOUS CLASS MISTAKES ============

/// Fetches mistakes from classes dated BEFORE the given class, grouped by class.
/// Returns list of groups sorted by date descending (most recent first).
/// LOCAL FIRST — reads from local SQLite.
final previousClassMistakesProvider = FutureProvider.family<List<PreviousClassMistakeGroup>, String>((ref, classId) async {
  final user = ref.read(authProvider).user;
  if (user == null) return [];

  final mistakeRepo = ref.watch(mistakeRepositoryProvider);
  final rawGroups = await mistakeRepo.getMistakesForPreviousClasses(user.id, classId);

  final groups = <PreviousClassMistakeGroup>[];
  for (final group in rawGroups) {
    final mistakeRows = group['mistakes'] as List<Map<String, Object?>>;

    // Deduplicate by location within this class, keep highest error count
    final Map<String, PreviousMistakeInfo> deduped = {};
    for (final m in mistakeRows) {
      final surahNumber = m['surah_number'] as int? ?? 0;
      final ayahNumber = m['ayah_number'] as int? ?? 0;
      final wordIndex = m['word_index'] as int? ?? 0;
      final key = '$surahNumber-$ayahNumber-$wordIndex';
      final info = PreviousMistakeInfo(
        surahNumber: surahNumber,
        ayahNumber: ayahNumber,
        wordIndex: wordIndex,
        wordText: (m['word_text'] as String?) ?? '',
        errorCount: m['error_count'] as int? ?? 1,
        classDate: group['date'] as String,
        classDay: group['day'] as String,
      );
      if (!deduped.containsKey(key) || info.errorCount > deduped[key]!.errorCount) {
        deduped[key] = info;
      }
    }

    final mistakes = deduped.values.toList()
      ..sort((a, b) => b.errorCount.compareTo(a.errorCount));
    groups.add(PreviousClassMistakeGroup(
      classDate: group['date'] as String,
      classDay: group['day'] as String,
      mistakes: mistakes,
    ));
  }

  return groups;
});

// ============ LOCAL-FIRST: CLASSES PROVIDER ============

final classesProvider = StateNotifierProvider<ClassesNotifier, AsyncValue<List<ClassSession>>>((ref) {
  return ClassesNotifier(ref);
});

class ClassesNotifier extends StateNotifier<AsyncValue<List<ClassSession>>> {
  final Ref _ref;

  ClassesNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadClasses();
  }

  /// Load classes from local SQLite (instant).
  Future<void> loadClasses() async {
    state = const AsyncValue.loading();
    try {
      final user = _ref.read(authProvider).user;
      if (user == null) {
        state = const AsyncValue.data([]);
        return;
      }

      final classRepo = _ref.read(classRepositoryProvider);
      final localClasses = await classRepo.getClassesByTeacherId(user.id);

      // Map local classes to include supabaseId for UI compatibility
      final classes = localClasses.map((cls) {
        // supabaseId: use the supabase_id from DB, or null
        // The ID the UI uses is supabaseId ?? id.toString()
        return cls.copyWith(
          supabaseId: cls.supabaseId ?? cls.toMap()['supabase_id'] as String?,
        );
      }).toList();

      state = AsyncValue.data(classes);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Create a class: write to LOCAL SQLite first (instant), then push to Supabase in background.
  Future<ClassSession> createClass({
    required String date,
    required String day,
    String? notes,
    required List<Map<String, dynamic>> assignments,
    List<String> studentIds = const [],
  }) async {
    final user = _ref.read(authProvider).user;
    if (user == null) throw Exception('Not authenticated');

    final classRepo = _ref.read(classRepositoryProvider);

    // 1. Write to local SQLite (instant)
    final localClass = await classRepo.createClass(
      date: date,
      day: day,
      notes: notes,
      teacherId: user.id,
      assignments: assignments,
    );

    // 2. Reload from local (instant)
    await loadClasses();

    // 3. Push to Supabase in background (non-blocking)
    _backgroundPushClass(localClass, assignments, studentIds, user.id);

    return localClass;
  }

  /// Background push a class to Supabase.
  Future<void> _backgroundPushClass(
    ClassSession localClass,
    List<Map<String, dynamic>> assignments,
    List<String> studentIds,
    String teacherId,
  ) async {
    try {
      final supabase = Supabase.instance.client;
      final classRepo = _ref.read(classRepositoryProvider);

      // Insert class to Supabase
      final classResponse = await supabase.from('classes').insert({
        'teacher_id': teacherId,
        'date': localClass.date,
        'day': localClass.day,
        'notes': localClass.notes,
      }).select().single();

      final supabaseClassId = classResponse['id'].toString();

      // Mark local class as synced
      if (localClass.id != null) {
        await classRepo.markClassSyncedWithSupabaseId(localClass.id!, supabaseClassId);
      }

      // Insert assignments to Supabase
      for (int i = 0; i < assignments.length; i++) {
        final aResponse = await supabase.from('assignments').insert({
          'class_id': supabaseClassId,
          'type': assignments[i]['type'],
          'start_surah': assignments[i]['start_surah'],
          'end_surah': assignments[i]['end_surah'],
          'start_ayah': assignments[i]['start_ayah'],
          'end_ayah': assignments[i]['end_ayah'],
        }).select('id').single();

        // Mark local assignment synced
        if (i < localClass.assignments.length && localClass.assignments[i].id != null) {
          await classRepo.markAssignmentSyncedWithSupabaseId(
            localClass.assignments[i].id!, aResponse['id'].toString(),
          );
        }
      }

      // Link students via class_students (Supabase only — cross-device)
      for (final studentId in studentIds) {
        await supabase.from('class_students').insert({
          'class_id': supabaseClassId,
          'student_id': studentId,
        });
      }

      // Reload to pick up supabase_id
      await loadClasses();
    } catch (e) {
      debugPrint('[ClassesNotifier] background push failed: $e');
      // Class is still saved locally — will sync on next periodic sync
    }
  }

  /// Update an existing assignment's surah/ayah range.
  /// Pushes to Supabase directly (assignments are always Supabase-managed).
  Future<void> updateAssignment({
    required String assignmentId,
    required Map<String, dynamic> data,
  }) async {
    final supabase = Supabase.instance.client;
    await supabase
        .from('assignments')
        .update(data)
        .eq('id', assignmentId);

    // Also update locally
    final classRepo = _ref.read(classRepositoryProvider);
    final db = await DatabaseHelper.instance.appDatabase;
    final localAssignment = await db.query('assignments',
      where: 'supabase_id = ?', whereArgs: [assignmentId]);
    if (localAssignment.isNotEmpty) {
      await classRepo.updateAssignment(localAssignment.first['id'] as int, data);
    }

    await loadClasses();
  }

  /// Add a new assignment to an existing class.
  Future<void> addAssignment({
    required String classId,
    required String type,
    required int startSurah,
    required int endSurah,
    int? startAyah,
    int? endAyah,
  }) async {
    final supabase = Supabase.instance.client;
    final response = await supabase.from('assignments').insert({
      'class_id': classId,
      'type': type,
      'start_surah': startSurah,
      'end_surah': endSurah,
      'start_ayah': startAyah,
      'end_ayah': endAyah,
    }).select('id').single();

    // Also add locally
    final db = await DatabaseHelper.instance.appDatabase;
    final localClass = await db.query('classes',
      where: 'supabase_id = ?', whereArgs: [classId]);
    if (localClass.isNotEmpty) {
      final localClassId = localClass.first['id'] as int;
      await db.insert('assignments', {
        'class_id': localClassId,
        'supabase_id': response['id'].toString(),
        'type': type,
        'start_surah': startSurah,
        'end_surah': endSurah,
        'start_ayah': startAyah,
        'end_ayah': endAyah,
        'sync_status': 'synced',
        'is_deleted': 0,
      });
    }

    await loadClasses();
  }

  /// Delete an assignment (hard delete on Supabase + local).
  Future<void> deleteAssignment(String assignmentId) async {
    final supabase = Supabase.instance.client;
    await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

    // Also delete locally
    final db = await DatabaseHelper.instance.appDatabase;
    await db.delete('assignments', where: 'supabase_id = ?', whereArgs: [assignmentId]);

    await loadClasses();
  }

  /// Find the Supabase UUID for a class by its int id.
  String? _findSupabaseId(int id) {
    final classes = state.value ?? [];
    return classes.where((c) => c.id == id).firstOrNull?.supabaseId;
  }

  /// Clean up mistakes linked to a class via Supabase before deleting.
  Future<void> _cleanupMistakesForClass(String classId) async {
    final supabase = Supabase.instance.client;

    // 1. Find all mistake_occurrences for this class
    final occResponse = await supabase
        .from('mistake_occurrences')
        .select('id, mistake_id')
        .eq('class_id', classId);
    final occurrences = occResponse as List;
    if (occurrences.isEmpty) return;

    final mistakeIds = occurrences.map((o) => o['mistake_id'].toString()).toSet().toList();

    // 2. Delete the occurrences for this class
    await supabase.from('mistake_occurrences').delete().eq('class_id', classId);

    // 3. For each affected mistake, check remaining occurrences
    for (final mistakeId in mistakeIds) {
      final remaining = await supabase
          .from('mistake_occurrences')
          .select('id')
          .eq('mistake_id', mistakeId);
      final count = (remaining as List).length;

      if (count == 0) {
        await supabase.from('mistakes').delete().eq('id', mistakeId);
      } else {
        await supabase.from('mistakes').update({'error_count': count}).eq('id', mistakeId);
      }
    }
  }

  Future<void> deleteClass(int id) async {
    final sbId = _findSupabaseId(id);

    // Delete locally first (instant)
    final classRepo = _ref.read(classRepositoryProvider);
    await classRepo.deleteClass(id);
    await loadClasses();

    // Then delete on Supabase in background (non-blocking)
    if (sbId != null) {
      _backgroundDeleteClassOnSupabase(sbId);
    }
  }

  /// Delete a class by its string ID (Supabase UUID).
  Future<void> deleteClassById(String classId) async {
    // Delete locally first (instant)
    final db = await DatabaseHelper.instance.appDatabase;
    final localClass = await db.query('classes',
      where: 'supabase_id = ?', whereArgs: [classId]);
    if (localClass.isNotEmpty) {
      final classRepo = _ref.read(classRepositoryProvider);
      await classRepo.deleteClass(localClass.first['id'] as int);
    }
    await loadClasses();

    // Delete on Supabase in background (non-blocking)
    _backgroundDeleteClassOnSupabase(classId);
  }

  /// Background helper: clean up mistakes + delete class on Supabase.
  Future<void> _backgroundDeleteClassOnSupabase(String classId) async {
    try {
      await _cleanupMistakesForClass(classId);
      final supabase = Supabase.instance.client;
      await supabase.from('classes').delete().eq('id', classId);
    } catch (e) {
      debugPrint('[ClassesNotifier] background delete class failed: $e');
    }
  }

  Future<void> updateNotes(int id, String? notes) async {
    // Update locally first (instant)
    final classRepo = _ref.read(classRepositoryProvider);
    await classRepo.updateClassNotes(id, notes);
    await loadClasses();

    // Then push to Supabase
    final sbId = _findSupabaseId(id);
    if (sbId != null) {
      try {
        final supabase = Supabase.instance.client;
        await supabase.from('classes').update({'notes': notes}).eq('id', sbId);
      } catch (e) {
        debugPrint('[ClassesNotifier] background updateNotes failed: $e');
      }
    }
  }

  Future<void> updatePerformance(int id, String? performance) async {
    // Update locally first (instant)
    final classRepo = _ref.read(classRepositoryProvider);
    await classRepo.updateClassPerformance(id, performance);
    await loadClasses();

    // Then push to Supabase
    final sbId = _findSupabaseId(id);
    if (sbId != null) {
      try {
        final supabase = Supabase.instance.client;
        await supabase.from('classes').update({'performance': performance}).eq('id', sbId);
      } catch (e) {
        debugPrint('[ClassesNotifier] background updatePerformance failed: $e');
      }
    }
  }
}

// Single class provider (int ID — finds from loaded classes cache)
final classProvider = FutureProvider.family<ClassSession?, int>((ref, id) async {
  final classesState = ref.watch(classesProvider);
  final classes = classesState.value ?? [];
  return classes.where((c) => c.id == id).firstOrNull;
});

// Single class provider (String ID — handles both int IDs and Supabase UUIDs)
final classFromStringIdProvider = FutureProvider.family<ClassSession?, String>((ref, classId) async {
  // Try from local loaded classes first
  final classesState = ref.watch(classesProvider);
  final classes = classesState.value ?? [];

  // Try matching by supabase_id
  final bySupabaseId = classes.where((c) => c.supabaseId == classId).firstOrNull;
  if (bySupabaseId != null) return bySupabaseId;

  // Try matching by int id
  final intId = int.tryParse(classId);
  if (intId != null) {
    final byIntId = classes.where((c) => c.id == intId).firstOrNull;
    if (byIntId != null) return byIntId;
  }

  // Fallback: fetch from local SQLite by supabase_id
  final classRepo = ref.read(classRepositoryProvider);
  final localClass = await classRepo.getClassBySupabaseId(classId);
  if (localClass != null) return localClass;

  // Last resort: fetch from Supabase directly
  final supabase = Supabase.instance.client;
  final data = await supabase
      .from('classes')
      .select('*, assignments(*)')
      .eq('id', classId)
      .maybeSingle();
  if (data == null) return null;

  final assignmentsRaw = (data['assignments'] as List?) ?? [];
  final assignments = assignmentsRaw.map<Assignment>((a) => Assignment(
    supabaseId: a['id']?.toString(),
    classId: 0,
    type: (a['type'] as String?) ?? '',
    startSurah: a['start_surah'] as int? ?? 0,
    endSurah: a['end_surah'] as int? ?? 0,
    startAyah: a['start_ayah'] as int?,
    endAyah: a['end_ayah'] as int?,
  )).toList();

  return ClassSession(
    supabaseId: classId,
    date: (data['date'] as String?) ?? '',
    day: (data['day'] as String?) ?? '',
    notes: data['notes'] as String?,
    performance: data['performance'] as String?,
    createdAt: (data['created_at'] as String?) ?? '',
    assignments: assignments,
  );
});

// ============ LOCAL-FIRST: MISTAKES PROVIDER ============

final mistakesProvider = StateNotifierProvider<MistakesNotifier, AsyncValue<List<Mistake>>>((ref) {
  return MistakesNotifier(ref);
});

class MistakesNotifier extends StateNotifier<AsyncValue<List<Mistake>>> {
  final Ref _ref;
  String? _studentId; // Track which student's mistakes are loaded

  MistakesNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadMistakes();
  }

  /// Set the student ID for mistake queries (teachers viewing student mistakes).
  Future<void> setStudentId(String? studentId) async {
    if (_studentId != studentId) {
      _studentId = studentId;
      await loadMistakes();
    }
  }

  /// Load mistakes from LOCAL SQLite (instant).
  Future<void> loadMistakes() async {
    state = const AsyncValue.loading();
    try {
      final user = _ref.read(authProvider).user;
      if (user == null) {
        state = const AsyncValue.data([]);
        return;
      }

      // Use explicit student ID if set (teacher viewing student), else own
      final targetId = _studentId ?? user.id;

      final mistakeRepo = _ref.read(mistakeRepositoryProvider);
      final localMistakes = await mistakeRepo.getMistakesByStudentId(targetId);

      // Ensure supabaseId has a fallback for UI compatibility
      final mistakes = localMistakes.map((m) {
        if (m.supabaseId != null) return m;
        return Mistake(
          id: m.id,
          supabaseId: m.id?.toString(),
          surahNumber: m.surahNumber,
          ayahNumber: m.ayahNumber,
          wordIndex: m.wordIndex,
          wordText: m.wordText,
          charIndex: m.charIndex,
          errorCount: m.errorCount,
        );
      }).toList();

      state = AsyncValue.data(mistakes);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Add mistake: write to LOCAL SQLite first (instant), then push to Supabase in background.
  Future<Mistake> addMistake({
    required int surahNumber,
    required int ayahNumber,
    required int wordIndex,
    required String wordText,
    int? charIndex,
    int? classId,
    String? classIdString, // Raw class ID string (Supabase UUID)
    String? studentId, // Supabase student UUID
  }) async {
    final user = _ref.read(authProvider).user;
    if (user == null) throw Exception('Not authenticated');

    final targetStudentId = studentId ?? user.id;
    final mistakeRepo = _ref.read(mistakeRepositoryProvider);

    // 1. Write to local SQLite (instant)
    final localMistake = await mistakeRepo.addMistake(
      surahNumber: surahNumber,
      ayahNumber: ayahNumber,
      wordIndex: wordIndex,
      wordText: wordText,
      charIndex: charIndex,
      classSupabaseId: classIdString,
      studentId: targetStudentId,
    );

    // 2. Update state from local (instant)
    await loadMistakes();

    // 3. Push to Supabase in background (non-blocking)
    _backgroundPushMistake(
      localMistake: localMistake,
      targetStudentId: targetStudentId,
      classIdString: classIdString,
    );

    return Mistake(
      id: localMistake.id,
      supabaseId: localMistake.toMap()['supabase_id'] as String? ?? localMistake.id?.toString(),
      surahNumber: surahNumber,
      ayahNumber: ayahNumber,
      wordIndex: wordIndex,
      wordText: wordText,
      charIndex: charIndex,
      errorCount: localMistake.errorCount,
    );
  }

  /// Background push a mistake to Supabase.
  Future<void> _backgroundPushMistake({
    required Mistake localMistake,
    required String targetStudentId,
    String? classIdString,
  }) async {
    try {
      final supabase = Supabase.instance.client;
      final mistakeRepo = _ref.read(mistakeRepositoryProvider);

      // Check for existing mistake on Supabase
      var query = supabase
          .from('mistakes')
          .select('id, error_count')
          .eq('student_id', targetStudentId)
          .eq('surah_number', localMistake.surahNumber)
          .eq('ayah_number', localMistake.ayahNumber)
          .eq('word_index', localMistake.wordIndex);

      if (localMistake.charIndex != null) {
        query = query.eq('char_index', localMistake.charIndex!);
      } else {
        query = query.isFilter('char_index', null);
      }

      final existing = await query.maybeSingle();

      String supabaseMistakeId;

      if (existing != null) {
        // Update existing — set to local count (which includes the increment)
        supabaseMistakeId = existing['id'].toString();
        await supabase.from('mistakes')
            .update({'error_count': localMistake.errorCount})
            .eq('id', supabaseMistakeId);
      } else {
        // Create new on Supabase
        final response = await supabase.from('mistakes').insert({
          'student_id': targetStudentId,
          'surah_number': localMistake.surahNumber,
          'ayah_number': localMistake.ayahNumber,
          'word_index': localMistake.wordIndex,
          'word_text': localMistake.wordText,
          'char_index': localMistake.charIndex,
          'error_count': localMistake.errorCount,
        }).select('id').single();
        supabaseMistakeId = response['id'].toString();
      }

      // Mark local mistake as synced with supabase ID
      if (localMistake.id != null) {
        await mistakeRepo.markMistakeSyncedWithSupabaseId(
          localMistake.id!, supabaseMistakeId,
        );
      }

      // Add occurrence if class ID provided
      if (classIdString != null && classIdString.isNotEmpty) {
        try {
          await supabase.from('mistake_occurrences').insert({
            'mistake_id': supabaseMistakeId,
            'class_id': classIdString,
          });
        } catch (e) {
          debugPrint('[MistakesNotifier] push occurrence error: $e');
        }
      }

      // Reload to pick up supabase_id
      await loadMistakes();
    } catch (e) {
      debugPrint('[MistakesNotifier] background push mistake failed: $e');
      // Mistake is still saved locally — will sync on next periodic sync
    }
  }

  /// Remove mistake: delete locally first (instant), then push to Supabase in background.
  Future<void> removeMistake(int id) async {
    // Find supabase ID before deleting locally
    final mistakes = state.value ?? [];
    final match = mistakes.where((m) => m.id == id).firstOrNull;
    final sbId = match?.supabaseId;

    // Delete locally (instant)
    final mistakeRepo = _ref.read(mistakeRepositoryProvider);
    await mistakeRepo.removeMistake(id);
    await loadMistakes();

    // Delete on Supabase (background)
    if (sbId != null) {
      try {
        final supabase = Supabase.instance.client;
        await supabase.from('mistakes').delete().eq('id', sbId);
      } catch (e) {
        debugPrint('[MistakesNotifier] background removeMistake failed: $e');
      }
    }
  }

  Future<void> deleteAllMistakes() async {
    final user = _ref.read(authProvider).user;
    if (user == null) return;

    // Delete locally (instant)
    final mistakeRepo = _ref.read(mistakeRepositoryProvider);
    await mistakeRepo.deleteAllMistakes();
    await loadMistakes();

    // Delete on Supabase (background)
    try {
      final supabase = Supabase.instance.client;
      await supabase.from('mistakes').delete().eq('student_id', user.id);
    } catch (e) {
      debugPrint('[MistakesNotifier] background deleteAllMistakes failed: $e');
    }
  }
}

// ============ ENROLLED CLASSES (for Student View — classes where user is a student) ============

final enrolledClassesProvider = FutureProvider<List<ClassSession>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) return [];

  final supabase = Supabase.instance.client;
  final response = await supabase
      .from('class_students')
      .select('''
        class_id,
        classes (
          id, date, day, notes, performance, created_at,
          assignments (id, type, start_surah, end_surah, start_ayah, end_ayah)
        )
      ''')
      .eq('student_id', user.id);

  final rows = response as List;
  final classes = <ClassSession>[];

  for (final row in rows) {
    final cls = row['classes'];
    if (cls == null) continue;

    final assignmentsRaw = (cls['assignments'] as List?) ?? [];
    final assignments = assignmentsRaw.map<Assignment>((a) => Assignment(
      supabaseId: a['id']?.toString(),
      classId: 0,
      type: (a['type'] as String?) ?? '',
      startSurah: a['start_surah'] as int? ?? 0,
      endSurah: a['end_surah'] as int? ?? 0,
      startAyah: a['start_ayah'] as int?,
      endAyah: a['end_ayah'] as int?,
    )).toList();

    classes.add(ClassSession(
      supabaseId: cls['id']?.toString(),
      date: (cls['date'] as String?) ?? '',
      day: (cls['day'] as String?) ?? '',
      notes: cls['notes'] as String?,
      performance: cls['performance'] as String?,
      createdAt: (cls['created_at'] as String?) ?? '',
      assignments: assignments,
    ));
  }

  // Sort by date descending
  classes.sort((a, b) => b.date.compareTo(a.date));
  return classes;
});

// ============ LOCAL-FIRST: MISTAKES FOR SURAH ============

final mistakesForSurahProvider = FutureProvider.family<List<Mistake>, int>((ref, surahNumber) async {
  final user = ref.read(authProvider).user;
  if (user == null) return [];

  final mistakeRepo = ref.watch(mistakeRepositoryProvider);
  return mistakeRepo.getMistakesForSurah(surahNumber);
});

// ============ LOCAL-FIRST: STATS PROVIDER ============

final statsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) {
    return {'totalClasses': 0, 'totalMistakes': 0, 'repeatedMistakes': 0};
  }

  // In Student View, teacher has no own mistakes — return empty stats
  final viewMode = ref.watch(viewModeProvider);
  final isActualTeacher = user.role == UserRole.teacher;
  if (isActualTeacher && viewMode == UserRole.student) {
    return {'totalClasses': 0, 'totalMistakes': 0, 'repeatedMistakes': 0};
  }

  final mistakeRepo = ref.watch(mistakeRepositoryProvider);
  return mistakeRepo.getStats();
});

// ============ LOCAL-FIRST: TOP MISTAKES PROVIDER ============

final topMistakesProvider = FutureProvider<List<Mistake>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) return [];

  // In Student View, teacher has no own mistakes
  final viewMode = ref.watch(viewModeProvider);
  final isActualTeacher = user.role == UserRole.teacher;
  if (isActualTeacher && viewMode == UserRole.student) return [];

  final mistakeRepo = ref.watch(mistakeRepositoryProvider);
  return mistakeRepo.getTopRepeatedMistakes(limit: 10);
});

// ============ LOCAL-FIRST: MISTAKE COUNTS BY SURAH ============

final mistakeCountsBySurahProvider = FutureProvider<Map<int, int>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) return {};

  // In Student View, teacher has no own mistakes
  final viewMode = ref.watch(viewModeProvider);
  final isActualTeacher = user.role == UserRole.teacher;
  if (isActualTeacher && viewMode == UserRole.student) return {};

  final mistakeRepo = ref.watch(mistakeRepositoryProvider);
  return mistakeRepo.getMistakeCountsBySurah();
});

// ============ SMART SUGGESTIONS (STAYS ON SUPABASE — cross-device) ============

/// Suggests hifz/sabqi/manzil portions based on the student's most recent class.
/// Mirrors web's getSuggestedPortions at supabase-api.ts:716-831.
final suggestedPortionsProvider = FutureProvider.family<SuggestedPortions, String>((ref, studentId) async {
  final supabase = Supabase.instance.client;

  SuggestedPortion? hifz, sabqi, manzil;
  ({String id, String date, String day})? lastClass;

  // Find student's most recent class with assignments
  final response = await supabase
      .from('class_students')
      .select('''
        class_id,
        classes (
          id, date, day,
          assignments (type, start_surah, end_surah, start_ayah, end_ayah)
        )
      ''')
      .eq('student_id', studentId)
      .limit(20);

  final rows = response as List;
  if (rows.isEmpty) {
    // Default to Al-Mulk
    return SuggestedPortions(
      hifz: const SuggestedPortion(
        startSurah: 67, endSurah: 67,
        startAyah: 1, endAyah: 30,
        surahName: 'Al-Mulk',
        note: 'No previous classes — starting from Al-Mulk',
      ),
    );
  }

  // Sort by date descending (can't ORDER BY UUID — it's random v4)
  rows.sort((a, b) {
    final dateA = a['classes']?['date'] ?? '';
    final dateB = b['classes']?['date'] ?? '';
    return dateB.toString().compareTo(dateA.toString());
  });

  final lastClassData = rows[0]['classes'];
  if (lastClassData == null) return const SuggestedPortions();

  lastClass = (
    id: lastClassData['id'].toString(),
    date: lastClassData['date'] ?? '',
    day: lastClassData['day'] ?? '',
  );

  // Parse assignments by type (same logic as web)
  final assignments = lastClassData['assignments'] as List? ?? [];

  for (final a in assignments) {
    final type = a['type'] as String?;
    final portion = SuggestedPortion(
      startSurah: a['start_surah'] ?? 0,
      endSurah: a['end_surah'] ?? 0,
      startAyah: a['start_ayah'],
      endAyah: a['end_ayah'],
      surahName: AppConstants.surahNames[a['start_surah']] ?? 'Surah ${a['start_surah']}',
      note: 'Same as last class — adjust as needed',
    );

    if (type == 'hifz') hifz = portion;
    else if (type == 'sabqi') sabqi = portion;
    else if (type == 'revision' || type == 'manzil') manzil = portion;
  }

  return SuggestedPortions(
    hifz: hifz, sabqi: sabqi, manzil: manzil, lastClass: lastClass,
  );
});

// ============ STATIC QURAN DATA FOR WEB ============
// Note: Quran text data is static since it doesn't change per user.

// Ayah counts for all 114 surahs (standard Quran data)
const _surahAyahCounts = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,
  112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,
  89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,
  12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,
  30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6,
];

final _staticSurahs = List<Surah>.generate(114, (i) {
  final num = i + 1;
  final name = AppConstants.surahNames[num] ?? 'Surah $num';
  return Surah(
    number: num,
    name: name, // Using English name as placeholder for Arabic
    englishName: name,
    englishNameTranslation: '',
    numberOfAyahs: _surahAyahCounts[i],
    revelationType: '',
  );
});

SurahWithAyahs _getStaticSurahWithAyahs(int surahNumber) {
  final surah = _staticSurahs.firstWhere(
    (s) => s.number == surahNumber,
    orElse: () => _staticSurahs.first,
  );

  // Generate ayahs with sample text for web preview
  final ayahs = List<Ayah>.generate(
    surah.numberOfAyahs,
    (i) => Ayah(
      surahNumber: surah.number,
      ayahNumber: i + 1,
      text: _getStaticAyahText(surahNumber, i + 1),
    ),
  );

  return SurahWithAyahs(surah: surah, ayahs: ayahs);
}

String _getStaticAyahText(int surah, int ayah) {
  // Sample Arabic text for web preview (Quran text is static)
  final samples = [
    '\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650',
    '\u0627\u0644\u0652\u062d\u064e\u0645\u0652\u062f\u064f \u0644\u0650\u0644\u0651\u064e\u0647\u0650 \u0631\u064e\u0628\u0651\u0650 \u0627\u0644\u0652\u0639\u064e\u0627\u0644\u064e\u0645\u0650\u064a\u0646\u064e',
    '\u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650',
    '\u0645\u064e\u0627\u0644\u0650\u0643\u0650 \u064a\u064e\u0648\u0652\u0645\u0650 \u0627\u0644\u062f\u0651\u0650\u064a\u0646\u0650',
    '\u0625\u0650\u064a\u0651\u064e\u0627\u0643\u064e \u0646\u064e\u0639\u0652\u0628\u064f\u062f\u064f \u0648\u064e\u0625\u0650\u064a\u0651\u064e\u0627\u0643\u064e \u0646\u064e\u0633\u0652\u062a\u064e\u0639\u0650\u064a\u0646\u064f',
    '\u0627\u0647\u0652\u062f\u0650\u0646\u064e\u0627 \u0627\u0644\u0635\u0651\u0650\u0631\u064e\u0627\u0637\u064e \u0627\u0644\u0652\u0645\u064f\u0633\u0652\u062a\u064e\u0642\u0650\u064a\u0645\u064e',
    '\u0635\u0650\u0631\u064e\u0627\u0637\u064e \u0627\u0644\u0651\u064e\u0630\u0650\u064a\u0646\u064e \u0623\u064e\u0646\u0652\u0639\u064e\u0645\u0652\u062a\u064e \u0639\u064e\u0644\u064e\u064a\u0652\u0647\u0650\u0645\u0652 \u063a\u064e\u064a\u0652\u0631\u0650 \u0627\u0644\u0652\u0645\u064e\u063a\u0652\u0636\u064f\u0648\u0628\u0650 \u0639\u064e\u0644\u064e\u064a\u0652\u0647\u0650\u0645\u0652 \u0648\u064e\u0644\u064e\u0627 \u0627\u0644\u0636\u0651\u064e\u0627\u0644\u0651\u0650\u064a\u0646\u064e',
    '\u062a\u064e\u0628\u064e\u0627\u0631\u064e\u0643\u064e \u0627\u0644\u0651\u064e\u0630\u0650\u064a \u0628\u0650\u064a\u064e\u062f\u0650\u0647\u0650 \u0627\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u064f \u0648\u064e\u0647\u064f\u0648\u064e \u0639\u064e\u0644\u064e\u0649\u0670 \u0643\u064f\u0644\u0651\u0650 \u0634\u064e\u064a\u0652\u0621\u064d \u0642\u064e\u062f\u0650\u064a\u0631\u064c',
    '\u0627\u0644\u0651\u064e\u0630\u0650\u064a \u062e\u064e\u0644\u064e\u0642\u064e \u0627\u0644\u0652\u0645\u064e\u0648\u0652\u062a\u064e \u0648\u064e\u0627\u0644\u0652\u062d\u064e\u064a\u064e\u0627\u0629\u064e \u0644\u0650\u064a\u064e\u0628\u0652\u0644\u064f\u0648\u064e\u0643\u064f\u0645\u0652 \u0623\u064e\u064a\u0651\u064f\u0643\u064f\u0645\u0652 \u0623\u064e\u062d\u0652\u0633\u064e\u0646\u064f \u0639\u064e\u0645\u064e\u0644\u064b\u0627',
    '\u0642\u064f\u0644\u0652 \u0647\u064f\u0648\u064e \u0627\u0644\u0644\u0651\u064e\u0647\u064f \u0623\u064e\u062d\u064e\u062f\u064c',
  ];
  return samples[(ayah - 1) % samples.length];
}

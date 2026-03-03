import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../config/constants.dart';
import '../../core/database/database_helper.dart';
import '../../core/network/api_client.dart';
import '../../core/network/connectivity_service.dart';
import '../../core/sync/sync_service.dart';
import '../../data/repositories/quran_repository.dart';
import '../../data/repositories/class_repository.dart';
import '../../data/repositories/mistake_repository.dart';
import '../../data/models/surah.dart';
import '../../data/models/class_session.dart';
import '../../data/models/mistake.dart';
import '../../data/models/assignment.dart';
import '../../data/models/suggested_portions.dart';
import 'auth_provider.dart';

// Core providers
final databaseHelperProvider = Provider((ref) => DatabaseHelper.instance);
final apiClientProvider = Provider((ref) => ApiClient());
final connectivityProvider = Provider((ref) => ConnectivityService());

// Repository providers (kept for infrastructure / sync)
final quranRepositoryProvider = Provider((ref) => QuranRepository());
final classRepositoryProvider = Provider((ref) => ClassRepository());
final mistakeRepositoryProvider = Provider((ref) => MistakeRepository());

// Sync provider
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

// Teacher's students provider (fetches from Supabase teacher_students table)
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

/// Add a student by email address.
/// Looks up the student in profiles, checks for duplicates, inserts into teacher_students.
/// Returns the student's name on success.
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

// Mistake IDs belonging to a specific class (via Supabase mistake_occurrences)
final classMistakeIdsProvider = FutureProvider.family<Set<String>, String>((ref, classId) async {
  // Watch mistakesProvider so this re-fetches whenever mistakes are added/removed
  ref.watch(mistakesProvider);
  final supabase = Supabase.instance.client;
  final response = await supabase
      .from('mistake_occurrences')
      .select('mistake_id')
      .eq('class_id', classId);
  return (response as List).map((r) => r['mistake_id'].toString()).toSet();
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

/// Fetches mistakes from classes dated BEFORE the given class, with class date info.
/// Returns deduplicated list (one entry per unique word location, keeping most recent class).
final previousClassMistakesProvider = FutureProvider.family<List<PreviousMistakeInfo>, String>((ref, classId) async {
  final supabase = Supabase.instance.client;

  // 1. Get current class date
  final classData = await supabase
      .from('classes')
      .select('date, teacher_id')
      .eq('id', classId)
      .maybeSingle();
  if (classData == null) return [];
  final currentDate = classData['date'] as String;
  final teacherId = classData['teacher_id'] as String;

  // 2. Get all classes by this teacher dated on or before the current class (excluding itself)
  final olderClassesRaw = await supabase
      .from('classes')
      .select('id, date, day')
      .eq('teacher_id', teacherId)
      .neq('id', classId)
      .lte('date', currentDate)
      .order('date', ascending: false);
  final olderClasses = olderClassesRaw as List;
  if (olderClasses.isEmpty) return [];

  final classInfoMap = <String, Map<String, dynamic>>{};
  final olderClassIds = <String>[];
  for (final c in olderClasses) {
    final cId = c['id'].toString();
    classInfoMap[cId] = c;
    olderClassIds.add(cId);
  }

  // 3. Get mistake occurrences for those classes
  final occRaw = await supabase
      .from('mistake_occurrences')
      .select('mistake_id, class_id')
      .inFilter('class_id', olderClassIds);
  final occurrences = occRaw as List;
  if (occurrences.isEmpty) return [];

  // Map mistake_id → most recent class_id (olderClasses already sorted desc)
  final mistakeToClass = <String, String>{};
  for (final occ in occurrences) {
    final mId = occ['mistake_id'].toString();
    if (!mistakeToClass.containsKey(mId)) {
      mistakeToClass[mId] = occ['class_id'].toString();
    }
  }

  // 4. Fetch those mistakes
  final mistakeIds = mistakeToClass.keys.toList();
  final mistakesRaw = await supabase
      .from('mistakes')
      .select('id, surah_number, ayah_number, word_index, word_text, error_count')
      .inFilter('id', mistakeIds);
  final mistakes = mistakesRaw as List;

  // 5. Build result — deduplicate by location, keep highest error count + most recent date
  final Map<String, PreviousMistakeInfo> deduped = {};
  for (final m in mistakes) {
    final mId = m['id'].toString();
    final classId = mistakeToClass[mId];
    final classInfo = classId != null ? classInfoMap[classId] : null;
    final key = '${m['surah_number']}-${m['ayah_number']}-${m['word_index']}';

    final info = PreviousMistakeInfo(
      surahNumber: m['surah_number'] as int? ?? 0,
      ayahNumber: m['ayah_number'] as int? ?? 0,
      wordIndex: m['word_index'] as int? ?? 0,
      wordText: (m['word_text'] as String?) ?? '',
      errorCount: m['error_count'] as int? ?? 1,
      classDate: (classInfo?['date'] as String?) ?? '',
      classDay: (classInfo?['day'] as String?) ?? '',
    );

    if (!deduped.containsKey(key) || info.errorCount > deduped[key]!.errorCount) {
      deduped[key] = info;
    }
  }

  return deduped.values.toList()
    ..sort((a, b) => b.errorCount.compareTo(a.errorCount));
});

// Classes provider
final classesProvider = StateNotifierProvider<ClassesNotifier, AsyncValue<List<ClassSession>>>((ref) {
  return ClassesNotifier(ref);
});

class ClassesNotifier extends StateNotifier<AsyncValue<List<ClassSession>>> {
  final Ref _ref;

  ClassesNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadClasses();
  }

  Future<void> loadClasses() async {
    state = const AsyncValue.loading();
    try {
      final user = _ref.read(authProvider).user;
      if (user == null) {
        state = const AsyncValue.data([]);
        return;
      }

      final supabase = Supabase.instance.client;
      final response = await supabase
          .from('classes')
          .select('*, assignments(*)')
          .eq('teacher_id', user.id)
          .order('date', ascending: false)
          .order('created_at', ascending: false);

      final classes = (response as List).map((row) {
        final rawId = row['id'];
        final supabaseId = rawId.toString();

        final assignmentsList = (row['assignments'] as List?)?.map((a) => Assignment(
          id: a['id'].hashCode,
          supabaseId: a['id'].toString(),
          classId: rawId is int ? rawId : supabaseId.hashCode,
          type: a['type'] ?? '',
          startSurah: a['start_surah'] ?? 0,
          endSurah: a['end_surah'] ?? 0,
          startAyah: a['start_ayah'],
          endAyah: a['end_ayah'],
        )).toList() ?? [];

        return ClassSession(
          id: rawId is int ? rawId : supabaseId.hashCode,
          supabaseId: supabaseId,
          date: row['date'] ?? '',
          day: row['day'] ?? '',
          notes: row['notes'],
          performance: row['performance'],
          createdAt: row['created_at'] ?? '',
          assignments: assignmentsList,
        );
      }).toList();

      state = AsyncValue.data(classes);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<ClassSession> createClass({
    required String date,
    required String day,
    String? notes,
    required List<Map<String, dynamic>> assignments,
    List<String> studentIds = const [],
  }) async {
    final user = _ref.read(authProvider).user;
    if (user == null) throw Exception('Not authenticated');

    final supabase = Supabase.instance.client;
    final classResponse = await supabase.from('classes').insert({
      'teacher_id': user.id,
      'date': date,
      'day': day,
      'notes': notes,
    }).select().single();

    final classId = classResponse['id'];

    for (final assignment in assignments) {
      await supabase.from('assignments').insert({
        'class_id': classId,
        'type': assignment['type'],
        'start_surah': assignment['start_surah'],
        'end_surah': assignment['end_surah'],
        'start_ayah': assignment['start_ayah'],
        'end_ayah': assignment['end_ayah'],
      });
    }

    // Link students to the class via class_students table
    if (studentIds.isNotEmpty) {
      for (final studentId in studentIds) {
        await supabase.from('class_students').insert({
          'class_id': classId,
          'student_id': studentId,
        });
      }
    }

    await loadClasses();
    return state.value!.first;
  }

  /// Update an existing assignment's surah/ayah range via Supabase.
  Future<void> updateAssignment({
    required String assignmentId,
    required Map<String, dynamic> data,
  }) async {
    final supabase = Supabase.instance.client;
    await supabase
        .from('assignments')
        .update(data)
        .eq('id', assignmentId);
    await loadClasses();
  }

  /// Add a new assignment to an existing class via Supabase.
  Future<void> addAssignment({
    required String classId,
    required String type,
    required int startSurah,
    required int endSurah,
    int? startAyah,
    int? endAyah,
  }) async {
    final supabase = Supabase.instance.client;
    await supabase.from('assignments').insert({
      'class_id': classId,
      'type': type,
      'start_surah': startSurah,
      'end_surah': endSurah,
      'start_ayah': startAyah,
      'end_ayah': endAyah,
    });
    await loadClasses();
  }

  /// Delete an assignment via Supabase (hard delete).
  Future<void> deleteAssignment(String assignmentId) async {
    final supabase = Supabase.instance.client;
    await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);
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
    if (sbId == null) return;
    await _cleanupMistakesForClass(sbId);
    final supabase = Supabase.instance.client;
    await supabase.from('classes').delete().eq('id', sbId);
    await loadClasses();
  }

  /// Delete a class by its string ID (Supabase UUID).
  Future<void> deleteClassById(String classId) async {
    await _cleanupMistakesForClass(classId);
    final supabase = Supabase.instance.client;
    await supabase.from('classes').delete().eq('id', classId);
    await loadClasses();
  }

  Future<void> updateNotes(int id, String? notes) async {
    final sbId = _findSupabaseId(id);
    if (sbId == null) return;
    final supabase = Supabase.instance.client;
    await supabase.from('classes').update({'notes': notes}).eq('id', sbId);
    await loadClasses();
  }

  Future<void> updatePerformance(int id, String? performance) async {
    final sbId = _findSupabaseId(id);
    if (sbId == null) return;
    final supabase = Supabase.instance.client;
    await supabase.from('classes').update({'performance': performance}).eq('id', sbId);
    await loadClasses();
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
  // Try local int ID first
  final intId = int.tryParse(classId);
  if (intId != null) {
    return await ref.watch(classProvider(intId).future);
  }

  // UUID — fetch from Supabase
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
    classId: 0, // Supabase class — no local int ID
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

// Mistakes provider
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

      final supabase = Supabase.instance.client;
      final response = await supabase
          .from('mistakes')
          .select()
          .eq('student_id', targetId);

      // Each row is a distinct mistake (including char-level ones)
      final mistakes = (response as List).map((row) {
        final rawId = row['id'];
        return Mistake(
          id: rawId is int ? rawId : rawId.toString().hashCode,
          supabaseId: rawId.toString(),
          surahNumber: row['surah_number'] ?? 0,
          ayahNumber: row['ayah_number'] ?? 0,
          wordIndex: row['word_index'] ?? 0,
          wordText: row['word_text'] ?? '',
          charIndex: row['char_index'] as int?,
          errorCount: row['error_count'] ?? 1,
        );
      }).toList();

      state = AsyncValue.data(mistakes);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

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

    // Use provided studentId, or fall back to current user
    final targetStudentId = studentId ?? user.id;

    final supabase = Supabase.instance.client;

    // Check for existing mistake (upsert logic matching React web app)
    var query = supabase
        .from('mistakes')
        .select('id, error_count')
        .eq('student_id', targetStudentId)
        .eq('surah_number', surahNumber)
        .eq('ayah_number', ayahNumber)
        .eq('word_index', wordIndex);

    if (charIndex != null) {
      query = query.eq('char_index', charIndex);
    } else {
      query = query.isFilter('char_index', null);
    }

    final existing = await query.maybeSingle();

    if (existing != null) {
      // Update existing — increment error_count
      final newCount = (existing['error_count'] as int? ?? 1) + 1;
      await supabase.from('mistakes').update({'error_count': newCount}).eq('id', existing['id']);

      // Add occurrence if class ID provided
      if (classIdString != null && classIdString.isNotEmpty) {
        await supabase.from('mistake_occurrences').insert({
          'mistake_id': existing['id'],
          'class_id': classIdString,
        });
      }

      await loadMistakes();
      return Mistake(
        id: existing['id'].hashCode,
        supabaseId: existing['id'].toString(),
        surahNumber: surahNumber,
        ayahNumber: ayahNumber,
        wordIndex: wordIndex,
        wordText: wordText,
        charIndex: charIndex,
        errorCount: newCount,
      );
    }

    // Create new mistake
    final response = await supabase.from('mistakes').insert({
      'student_id': targetStudentId,
      'surah_number': surahNumber,
      'ayah_number': ayahNumber,
      'word_index': wordIndex,
      'word_text': wordText,
      'char_index': charIndex,
      'error_count': 1,
    }).select().single();

    // Add occurrence if class ID provided
    if (classIdString != null && classIdString.isNotEmpty) {
      await supabase.from('mistake_occurrences').insert({
        'mistake_id': response['id'],
        'class_id': classIdString,
      });
    }

    await loadMistakes();
    return Mistake(
      id: response['id'].hashCode,
      supabaseId: response['id'].toString(),
      surahNumber: surahNumber,
      ayahNumber: ayahNumber,
      wordIndex: wordIndex,
      wordText: wordText,
      charIndex: charIndex,
      errorCount: 1,
    );
  }

  Future<void> removeMistake(int id) async {
    // Find the Supabase UUID from the loaded mistakes list
    final mistakes = state.value ?? [];
    final match = mistakes.where((m) => m.id == id).firstOrNull;
    final sbId = match?.supabaseId;
    if (sbId == null) return;
    final supabase = Supabase.instance.client;
    await supabase.from('mistakes').delete().eq('id', sbId);
    await loadMistakes();
  }

  Future<void> deleteAllMistakes() async {
    final user = _ref.read(authProvider).user;
    if (user == null) return;
    final supabase = Supabase.instance.client;
    await supabase.from('mistakes').delete().eq('student_id', user.id);
    await loadMistakes();
  }
}

// Mistakes for surah provider
final mistakesForSurahProvider = FutureProvider.family<List<Mistake>, int>((ref, surahNumber) async {
  final user = ref.read(authProvider).user;
  if (user == null) return [];

  final supabase = Supabase.instance.client;
  final response = await supabase
      .from('mistakes')
      .select()
      .eq('student_id', user.id)
      .eq('surah_number', surahNumber);

  return (response as List).map((row) => Mistake(
    id: row['id'] is String ? int.tryParse(row['id']) ?? 0 : row['id'] ?? 0,
    surahNumber: row['surah_number'] ?? 0,
    ayahNumber: row['ayah_number'] ?? 0,
    wordIndex: row['word_index'] ?? 0,
    wordText: row['word_text'] ?? '',
    errorCount: 1,
  )).toList();
});

// Stats provider
final statsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) {
    return {'totalClasses': 0, 'totalMistakes': 0, 'repeatedMistakes': 0};
  }

  final supabase = Supabase.instance.client;

  // Get total classes
  final classesResponse = await supabase
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id);
  final totalClasses = (classesResponse as List).length;

  // Get mistakes and count repeated ones
  final mistakesResponse = await supabase
      .from('mistakes')
      .select()
      .eq('student_id', user.id);

  final mistakes = mistakesResponse as List;
  final totalMistakes = mistakes.length;

  // Count repeated mistakes (same word appears more than once)
  final Map<String, int> wordCounts = {};
  for (final m in mistakes) {
    final key = '${m['surah_number']}-${m['ayah_number']}-${m['word_index']}';
    wordCounts[key] = (wordCounts[key] ?? 0) + 1;
  }
  final repeatedMistakes = wordCounts.values.where((c) => c > 1).length;

  return {
    'totalClasses': totalClasses,
    'totalMistakes': totalMistakes,
    'repeatedMistakes': repeatedMistakes,
  };
});

// Top mistakes provider
final topMistakesProvider = FutureProvider<List<Mistake>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) return [];

  final supabase = Supabase.instance.client;
  final response = await supabase
      .from('mistakes')
      .select()
      .eq('student_id', user.id);

  // Group by word and count occurrences
  final Map<String, Map<String, dynamic>> grouped = {};
  for (final row in response as List) {
    final key = '${row['surah_number']}-${row['ayah_number']}-${row['word_index']}';
    if (grouped.containsKey(key)) {
      grouped[key]!['count'] = (grouped[key]!['count'] as int) + 1;
    } else {
      grouped[key] = {...row, 'count': 1};
    }
  }

  // Sort by count descending and take top 10
  final sorted = grouped.values.toList()
    ..sort((a, b) => (b['count'] as int).compareTo(a['count'] as int));

  return sorted.take(10).map((row) => Mistake(
    id: row['id'] is String ? int.tryParse(row['id']) ?? 0 : row['id'] ?? 0,
    surahNumber: row['surah_number'] ?? 0,
    ayahNumber: row['ayah_number'] ?? 0,
    wordIndex: row['word_index'] ?? 0,
    wordText: row['word_text'] ?? '',
    errorCount: row['count'] ?? 1,
  )).toList();
});

// Mistake counts by surah provider
final mistakeCountsBySurahProvider = FutureProvider<Map<int, int>>((ref) async {
  final user = ref.read(authProvider).user;
  if (user == null) return {};

  final supabase = Supabase.instance.client;
  final response = await supabase
      .from('mistakes')
      .select('surah_number')
      .eq('student_id', user.id);

  final Map<int, int> counts = {};
  for (final row in response as List) {
    final surahNum = row['surah_number'] as int? ?? 0;
    counts[surahNum] = (counts[surahNum] ?? 0) + 1;
  }
  return counts;
});

// ============ SMART SUGGESTIONS ============

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
// Note: User data (classes, mistakes) always uses Supabase.
// Only Quran text data is static since it doesn't change per user.

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
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    'الرَّحْمَٰنِ الرَّحِيمِ',
    'مَالِكِ يَوْمِ الدِّينِ',
    'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
    'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
    'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ',
    'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا',
    'قُلْ هُوَ اللَّهُ أَحَدٌ',
  ];
  return samples[(ayah - 1) % samples.length];
}

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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
import 'auth_provider.dart';

// Core providers
final databaseHelperProvider = Provider((ref) => DatabaseHelper.instance);
final apiClientProvider = Provider((ref) => ApiClient());
final connectivityProvider = Provider((ref) => ConnectivityService());

// Repository providers
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

// Surah list provider (Quran data is static, so mock is fine for web)
final surahListProvider = FutureProvider<List<Surah>>((ref) async {
  if (kIsWeb) return _staticSurahs;
  final repo = ref.watch(quranRepositoryProvider);
  return repo.getAllSurahs();
});

// Single surah with ayahs provider
final surahWithAyahsProvider = FutureProvider.family<SurahWithAyahs?, int>((ref, surahNumber) async {
  if (kIsWeb) return _getStaticSurahWithAyahs(surahNumber);
  final repo = ref.watch(quranRepositoryProvider);
  return repo.getSurahWithAyahs(surahNumber);
});

// Teacher's students provider (web only — fetches from teacher_students)
final teacherStudentsProvider = FutureProvider<List<({String id, String name})>>((ref) async {
  if (!kIsWeb) return [];
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

// Classes provider
final classesProvider = StateNotifierProvider<ClassesNotifier, AsyncValue<List<ClassSession>>>((ref) {
  return ClassesNotifier(ref.watch(classRepositoryProvider), ref);
});

class ClassesNotifier extends StateNotifier<AsyncValue<List<ClassSession>>> {
  final ClassRepository _repository;
  final Ref _ref;

  ClassesNotifier(this._repository, this._ref) : super(const AsyncValue.loading()) {
    loadClasses();
  }

  Future<void> loadClasses() async {
    state = const AsyncValue.loading();
    try {
      if (kIsWeb) {
        // Fetch from Supabase for web
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
            .order('date', ascending: false);

        final classes = (response as List).map((row) {
          final rawId = row['id'];
          final supabaseId = rawId.toString();

          final assignmentsList = (row['assignments'] as List?)?.map((a) => Assignment(
            id: a['id'].hashCode,
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
      } else {
        final classes = await _repository.getAllClasses();
        state = AsyncValue.data(classes);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<ClassSession> createClass({
    required String date,
    required String day,
    String? notes,
    required List<Map<String, dynamic>> assignments,
  }) async {
    if (kIsWeb) {
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

      await loadClasses();
      return state.value!.first;
    }

    final newClass = await _repository.createClass(
      date: date,
      day: day,
      notes: notes,
      assignments: assignments,
    );
    await loadClasses();
    return newClass;
  }

  /// Find the Supabase UUID for a class by its int id.
  String? _findSupabaseId(int id) {
    final classes = state.value ?? [];
    return classes.where((c) => c.id == id).firstOrNull?.supabaseId;
  }

  Future<void> deleteClass(int id) async {
    if (kIsWeb) {
      final sbId = _findSupabaseId(id);
      if (sbId == null) return;
      final supabase = Supabase.instance.client;
      await supabase.from('classes').update({'is_deleted': true}).eq('id', sbId);
      await loadClasses();
      return;
    }
    await _repository.deleteClass(id);
    await loadClasses();
  }

  Future<void> updateNotes(int id, String? notes) async {
    if (kIsWeb) {
      final sbId = _findSupabaseId(id);
      if (sbId == null) return;
      final supabase = Supabase.instance.client;
      await supabase.from('classes').update({'notes': notes}).eq('id', sbId);
      await loadClasses();
      return;
    }
    await _repository.updateClassNotes(id, notes);
    await loadClasses();
  }

  Future<void> updatePerformance(int id, String? performance) async {
    if (kIsWeb) {
      final sbId = _findSupabaseId(id);
      if (sbId == null) return;
      final supabase = Supabase.instance.client;
      await supabase.from('classes').update({'performance': performance}).eq('id', sbId);
      await loadClasses();
      return;
    }
    await _repository.updateClassPerformance(id, performance);
    await loadClasses();
  }
}

// Single class provider
final classProvider = FutureProvider.family<ClassSession?, int>((ref, id) async {
  if (kIsWeb) {
    // Web: find from already-loaded classes list (avoids UUID/int mismatch)
    final classesState = ref.watch(classesProvider);
    final classes = classesState.value ?? [];
    return classes.where((c) => c.id == id).firstOrNull;
  }
  final repo = ref.watch(classRepositoryProvider);
  return repo.getClass(id);
});

// Mistakes provider
final mistakesProvider = StateNotifierProvider<MistakesNotifier, AsyncValue<List<Mistake>>>((ref) {
  return MistakesNotifier(ref.watch(mistakeRepositoryProvider), ref);
});

class MistakesNotifier extends StateNotifier<AsyncValue<List<Mistake>>> {
  final MistakeRepository _repository;
  final Ref _ref;
  String? _webStudentId; // Track which student's mistakes are loaded (web only)

  MistakesNotifier(this._repository, this._ref) : super(const AsyncValue.loading()) {
    loadMistakes();
  }

  /// Set the student ID for web mistake queries (teachers viewing student mistakes).
  Future<void> setWebStudentId(String? studentId) async {
    if (_webStudentId != studentId) {
      _webStudentId = studentId;
      await loadMistakes();
    }
  }

  Future<void> loadMistakes() async {
    state = const AsyncValue.loading();
    try {
      if (kIsWeb) {
        final user = _ref.read(authProvider).user;
        if (user == null) {
          state = const AsyncValue.data([]);
          return;
        }

        // Use explicit student ID if set (teacher viewing student), else own
        final targetId = _webStudentId ?? user.id;

        final supabase = Supabase.instance.client;
        // Get mistakes with occurrence counts using RPC or aggregation
        final response = await supabase
            .from('mistakes')
            .select()
            .eq('student_id', targetId);

        // Group by word to count occurrences
        final Map<String, Map<String, dynamic>> grouped = {};
        for (final row in response as List) {
          final key = '${row['surah_number']}-${row['ayah_number']}-${row['word_index']}';
          if (grouped.containsKey(key)) {
            grouped[key]!['count'] = (grouped[key]!['count'] as int) + 1;
          } else {
            grouped[key] = {...row, 'count': 1};
          }
        }

        final mistakes = grouped.values.map((row) {
          final rawId = row['id'];
          return Mistake(
            id: rawId is int ? rawId : rawId.toString().hashCode,
            supabaseId: rawId.toString(),
            surahNumber: row['surah_number'] ?? 0,
            ayahNumber: row['ayah_number'] ?? 0,
            wordIndex: row['word_index'] ?? 0,
            wordText: row['word_text'] ?? '',
            errorCount: row['count'] ?? 1,
          );
        }).toList();

        state = AsyncValue.data(mistakes);
      } else {
        final mistakes = await _repository.getMistakesWithOccurrences();
        state = AsyncValue.data(mistakes);
      }
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
    String? studentId, // Supabase student UUID (web only)
  }) async {
    if (kIsWeb) {
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

        // Add occurrence if class_id provided
        if (classId != null) {
          final classes = _ref.read(classesProvider).value ?? [];
          final cls = classes.where((c) => c.id == classId).firstOrNull;
          if (cls?.supabaseId != null) {
            await supabase.from('mistake_occurrences').insert({
              'mistake_id': existing['id'],
              'class_id': cls!.supabaseId,
            });
          }
        }

        await loadMistakes();
        return Mistake(
          id: existing['id'].hashCode,
          supabaseId: existing['id'].toString(),
          surahNumber: surahNumber,
          ayahNumber: ayahNumber,
          wordIndex: wordIndex,
          wordText: wordText,
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

      // Add occurrence if class_id provided
      if (classId != null) {
        final classes = _ref.read(classesProvider).value ?? [];
        final cls = classes.where((c) => c.id == classId).firstOrNull;
        if (cls?.supabaseId != null) {
          await supabase.from('mistake_occurrences').insert({
            'mistake_id': response['id'],
            'class_id': cls!.supabaseId,
          });
        }
      }

      await loadMistakes();
      return Mistake(
        id: response['id'].hashCode,
        supabaseId: response['id'].toString(),
        surahNumber: surahNumber,
        ayahNumber: ayahNumber,
        wordIndex: wordIndex,
        wordText: wordText,
        errorCount: 1,
      );
    }

    final mistake = await _repository.addMistake(
      surahNumber: surahNumber,
      ayahNumber: ayahNumber,
      wordIndex: wordIndex,
      wordText: wordText,
      charIndex: charIndex,
      classId: classId,
    );
    await loadMistakes();
    return mistake;
  }

  Future<void> removeMistake(int id) async {
    if (kIsWeb) {
      // Find the Supabase UUID from the loaded mistakes list
      final mistakes = state.value ?? [];
      final match = mistakes.where((m) => m.id == id).firstOrNull;
      final sbId = match?.supabaseId;
      if (sbId == null) return;
      final supabase = Supabase.instance.client;
      await supabase.from('mistakes').delete().eq('id', sbId);
      await loadMistakes();
      return;
    }
    await _repository.removeMistake(id);
    await loadMistakes();
  }

  Future<void> deleteAllMistakes() async {
    if (kIsWeb) {
      final user = _ref.read(authProvider).user;
      if (user == null) return;
      final supabase = Supabase.instance.client;
      await supabase.from('mistakes').delete().eq('student_id', user.id);
      await loadMistakes();
      return;
    }
    await _repository.deleteAllMistakes();
    await loadMistakes();
  }
}

// Mistakes for surah provider
final mistakesForSurahProvider = FutureProvider.family<List<Mistake>, int>((ref, surahNumber) async {
  if (kIsWeb) {
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
  }
  final repo = ref.watch(mistakeRepositoryProvider);
  return repo.getMistakesForSurah(surahNumber);
});

// Stats provider
final statsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  if (kIsWeb) {
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
  }
  final repo = ref.watch(mistakeRepositoryProvider);
  return repo.getStats();
});

// Top mistakes provider
final topMistakesProvider = FutureProvider<List<Mistake>>((ref) async {
  if (kIsWeb) {
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
  }
  final repo = ref.watch(mistakeRepositoryProvider);
  return repo.getTopRepeatedMistakes(limit: 10);
});

// Mistake counts by surah provider
final mistakeCountsBySurahProvider = FutureProvider<Map<int, int>>((ref) async {
  if (kIsWeb) {
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
  }
  final repo = ref.watch(mistakeRepositoryProvider);
  return repo.getMistakeCountsBySurah();
});

// ============ STATIC QURAN DATA FOR WEB ============
// Note: User data (classes, mistakes) is now fetched from Supabase.
// Only Quran text data is static since it doesn't change per user.

final _staticSurahs = [
  Surah(number: 1, name: 'الفاتحة', englishName: 'Al-Fatihah', englishNameTranslation: 'The Opening', numberOfAyahs: 7, revelationType: 'Meccan'),
  Surah(number: 67, name: 'الملك', englishName: 'Al-Mulk', englishNameTranslation: 'The Sovereignty', numberOfAyahs: 30, revelationType: 'Meccan'),
  Surah(number: 68, name: 'القلم', englishName: 'Al-Qalam', englishNameTranslation: 'The Pen', numberOfAyahs: 52, revelationType: 'Meccan'),
  Surah(number: 78, name: 'النبأ', englishName: 'An-Naba', englishNameTranslation: 'The Tidings', numberOfAyahs: 40, revelationType: 'Meccan'),
  Surah(number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlas', englishNameTranslation: 'Sincerity', numberOfAyahs: 4, revelationType: 'Meccan'),
  Surah(number: 113, name: 'الفلق', englishName: 'Al-Falaq', englishNameTranslation: 'The Daybreak', numberOfAyahs: 5, revelationType: 'Meccan'),
  Surah(number: 114, name: 'الناس', englishName: 'An-Nas', englishNameTranslation: 'Mankind', numberOfAyahs: 6, revelationType: 'Meccan'),
];

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

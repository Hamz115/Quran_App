import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

// Surah list provider
final surahListProvider = FutureProvider<List<Surah>>((ref) async {
  if (kIsWeb) return _mockSurahs;
  final repo = ref.watch(quranRepositoryProvider);
  return repo.getAllSurahs();
});

// Single surah with ayahs provider
final surahWithAyahsProvider = FutureProvider.family<SurahWithAyahs?, int>((ref, surahNumber) async {
  if (kIsWeb) return _getMockSurahWithAyahs(surahNumber);
  final repo = ref.watch(quranRepositoryProvider);
  return repo.getSurahWithAyahs(surahNumber);
});

// Classes provider
final classesProvider = StateNotifierProvider<ClassesNotifier, AsyncValue<List<ClassSession>>>((ref) {
  return ClassesNotifier(ref.watch(classRepositoryProvider));
});

class ClassesNotifier extends StateNotifier<AsyncValue<List<ClassSession>>> {
  final ClassRepository _repository;

  ClassesNotifier(this._repository) : super(const AsyncValue.loading()) {
    loadClasses();
  }

  Future<void> loadClasses() async {
    if (kIsWeb) {
      state = AsyncValue.data(_mockClasses);
      return;
    }
    state = const AsyncValue.loading();
    try {
      final classes = await _repository.getAllClasses();
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
  }) async {
    if (kIsWeb) return _mockClasses.first;
    final newClass = await _repository.createClass(
      date: date,
      day: day,
      notes: notes,
      assignments: assignments,
    );
    await loadClasses();
    return newClass;
  }

  Future<void> deleteClass(int id) async {
    if (kIsWeb) return;
    await _repository.deleteClass(id);
    await loadClasses();
  }

  Future<void> updateNotes(int id, String? notes) async {
    if (kIsWeb) return;
    await _repository.updateClassNotes(id, notes);
    await loadClasses();
  }

  Future<void> updatePerformance(int id, String? performance) async {
    if (kIsWeb) return;
    await _repository.updateClassPerformance(id, performance);
    await loadClasses();
  }
}

// Single class provider
final classProvider = FutureProvider.family<ClassSession?, int>((ref, id) async {
  if (kIsWeb) return _mockClasses.firstWhere((c) => c.id == id, orElse: () => _mockClasses.first);
  final repo = ref.watch(classRepositoryProvider);
  return repo.getClass(id);
});

// Mistakes provider
final mistakesProvider = StateNotifierProvider<MistakesNotifier, AsyncValue<List<Mistake>>>((ref) {
  return MistakesNotifier(ref.watch(mistakeRepositoryProvider));
});

class MistakesNotifier extends StateNotifier<AsyncValue<List<Mistake>>> {
  final MistakeRepository _repository;

  MistakesNotifier(this._repository) : super(const AsyncValue.loading()) {
    loadMistakes();
  }

  Future<void> loadMistakes() async {
    if (kIsWeb) {
      state = AsyncValue.data(_mockMistakes);
      return;
    }
    state = const AsyncValue.loading();
    try {
      final mistakes = await _repository.getMistakesWithOccurrences();
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
  }) async {
    if (kIsWeb) return _mockMistakes.first;
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
    if (kIsWeb) return;
    await _repository.removeMistake(id);
    await loadMistakes();
  }

  Future<void> deleteAllMistakes() async {
    if (kIsWeb) return;
    await _repository.deleteAllMistakes();
    await loadMistakes();
  }
}

// Mistakes for surah provider
final mistakesForSurahProvider = FutureProvider.family<List<Mistake>, int>((ref, surahNumber) async {
  if (kIsWeb) return _mockMistakes.where((m) => m.surahNumber == surahNumber).toList();
  final repo = ref.watch(mistakeRepositoryProvider);
  return repo.getMistakesForSurah(surahNumber);
});

// Stats provider
final statsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  if (kIsWeb) return _mockStats;
  final repo = ref.watch(mistakeRepositoryProvider);
  return repo.getStats();
});

// Top mistakes provider
final topMistakesProvider = FutureProvider<List<Mistake>>((ref) async {
  if (kIsWeb) return _mockMistakes.take(5).toList();
  final repo = ref.watch(mistakeRepositoryProvider);
  return repo.getTopRepeatedMistakes(limit: 10);
});

// Mistake counts by surah provider
final mistakeCountsBySurahProvider = FutureProvider<Map<int, int>>((ref) async {
  if (kIsWeb) return {67: 5, 68: 3, 78: 2, 112: 1};
  final repo = ref.watch(mistakeRepositoryProvider);
  return repo.getMistakeCountsBySurah();
});

// ============ MOCK DATA FOR WEB PREVIEW ============

final _mockSurahs = [
  Surah(number: 1, name: 'الفاتحة', englishName: 'Al-Fatihah', englishNameTranslation: 'The Opening', numberOfAyahs: 7, revelationType: 'Meccan'),
  Surah(number: 67, name: 'الملك', englishName: 'Al-Mulk', englishNameTranslation: 'The Sovereignty', numberOfAyahs: 30, revelationType: 'Meccan'),
  Surah(number: 68, name: 'القلم', englishName: 'Al-Qalam', englishNameTranslation: 'The Pen', numberOfAyahs: 52, revelationType: 'Meccan'),
  Surah(number: 78, name: 'النبأ', englishName: 'An-Naba', englishNameTranslation: 'The Tidings', numberOfAyahs: 40, revelationType: 'Meccan'),
  Surah(number: 112, name: 'الإخلاص', englishName: 'Al-Ikhlas', englishNameTranslation: 'Sincerity', numberOfAyahs: 4, revelationType: 'Meccan'),
  Surah(number: 113, name: 'الفلق', englishName: 'Al-Falaq', englishNameTranslation: 'The Daybreak', numberOfAyahs: 5, revelationType: 'Meccan'),
  Surah(number: 114, name: 'الناس', englishName: 'An-Nas', englishNameTranslation: 'Mankind', numberOfAyahs: 6, revelationType: 'Meccan'),
];

SurahWithAyahs _getMockSurahWithAyahs(int surahNumber) {
  final surah = _mockSurahs.firstWhere(
    (s) => s.number == surahNumber,
    orElse: () => _mockSurahs.first,
  );

  // Generate mock ayahs
  final ayahs = List<Ayah>.generate(
    surah.numberOfAyahs,
    (i) => Ayah(
      surahNumber: surah.number,
      ayahNumber: i + 1,
      text: _getMockAyahText(surahNumber, i + 1),
    ),
  );

  return SurahWithAyahs(surah: surah, ayahs: ayahs);
}

String _getMockAyahText(int surah, int ayah) {
  // Some sample Arabic text for preview
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

final _mockClasses = [
  ClassSession(
    id: 1,
    date: '2024-12-10',
    day: 'Tuesday',
    notes: 'Good session, need to review tajweed rules',
    performance: 'Excellent',
    createdAt: '2024-12-10T10:00:00',
    assignments: [
      Assignment(id: 1, classId: 1, type: 'hifz', startSurah: 67, endSurah: 67, startAyah: 1, endAyah: 10),
      Assignment(id: 2, classId: 1, type: 'sabqi', startSurah: 78, endSurah: 78),
      Assignment(id: 3, classId: 1, type: 'revision', startSurah: 112, endSurah: 114),
    ],
  ),
  ClassSession(
    id: 2,
    date: '2024-12-08',
    day: 'Sunday',
    performance: 'Very Good',
    createdAt: '2024-12-08T10:00:00',
    assignments: [
      Assignment(id: 4, classId: 2, type: 'hifz', startSurah: 67, endSurah: 67, startAyah: 1, endAyah: 5),
      Assignment(id: 5, classId: 2, type: 'revision', startSurah: 112, endSurah: 112),
    ],
  ),
  ClassSession(
    id: 3,
    date: '2024-12-05',
    day: 'Thursday',
    performance: 'Good',
    createdAt: '2024-12-05T10:00:00',
    assignments: [
      Assignment(id: 6, classId: 3, type: 'hifz', startSurah: 68, endSurah: 68, startAyah: 1, endAyah: 15),
    ],
  ),
];

final _mockMistakes = [
  Mistake(id: 1, surahNumber: 67, ayahNumber: 3, wordIndex: 2, wordText: 'تَفَاوُتٍ', errorCount: 4),
  Mistake(id: 2, surahNumber: 67, ayahNumber: 5, wordIndex: 1, wordText: 'بِمَصَابِيحَ', errorCount: 3),
  Mistake(id: 3, surahNumber: 67, ayahNumber: 8, wordIndex: 3, wordText: 'تَكَادُ', errorCount: 2),
  Mistake(id: 4, surahNumber: 78, ayahNumber: 1, wordIndex: 0, wordText: 'عَمَّ', errorCount: 2),
  Mistake(id: 5, surahNumber: 112, ayahNumber: 2, wordIndex: 1, wordText: 'الصَّمَدُ', errorCount: 1),
];

final _mockStats = {
  'totalClasses': 12,
  'totalMistakes': 45,
  'repeatedMistakes': 8,
  'averageMistakesPerClass': 3.75,
  'mostProblematicSurah': 67,
};

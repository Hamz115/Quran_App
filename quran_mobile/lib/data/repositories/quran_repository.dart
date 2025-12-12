import '../../core/database/database_helper.dart';
import '../models/surah.dart';

class QuranRepository {
  final DatabaseHelper _dbHelper;

  QuranRepository({DatabaseHelper? dbHelper})
      : _dbHelper = dbHelper ?? DatabaseHelper.instance;

  // Get all surahs
  Future<List<Surah>> getAllSurahs() async {
    final db = await _dbHelper.quranDatabase;
    final results = await db.query('surahs', orderBy: 'number ASC');
    return results.map((map) => Surah.fromMap(map)).toList();
  }

  // Get single surah by number
  Future<Surah?> getSurah(int number) async {
    final db = await _dbHelper.quranDatabase;
    final results = await db.query(
      'surahs',
      where: 'number = ?',
      whereArgs: [number],
    );
    if (results.isEmpty) return null;
    return Surah.fromMap(results.first);
  }

  // Get ayahs for a surah
  Future<List<Ayah>> getAyahsForSurah(int surahNumber) async {
    final db = await _dbHelper.quranDatabase;
    final results = await db.query(
      'ayahs',
      where: 'surahNumber = ?',
      whereArgs: [surahNumber],
      orderBy: 'ayahNumber ASC',
    );
    return results.map((map) => Ayah.fromMap(map)).toList();
  }

  // Get surah with all its ayahs
  Future<SurahWithAyahs?> getSurahWithAyahs(int surahNumber) async {
    final surah = await getSurah(surahNumber);
    if (surah == null) return null;

    final ayahs = await getAyahsForSurah(surahNumber);
    return SurahWithAyahs(surah: surah, ayahs: ayahs);
  }

  // Get ayahs for a range within a surah
  Future<List<Ayah>> getAyahRange(int surahNumber, int startAyah, int endAyah) async {
    final db = await _dbHelper.quranDatabase;
    final results = await db.query(
      'ayahs',
      where: 'surahNumber = ? AND ayahNumber >= ? AND ayahNumber <= ?',
      whereArgs: [surahNumber, startAyah, endAyah],
      orderBy: 'ayahNumber ASC',
    );
    return results.map((map) => Ayah.fromMap(map)).toList();
  }

  // Search ayahs by text
  Future<List<Ayah>> searchAyahs(String query) async {
    final db = await _dbHelper.quranDatabase;
    final results = await db.query(
      'ayahs',
      where: 'text LIKE ?',
      whereArgs: ['%$query%'],
      limit: 50,
    );
    return results.map((map) => Ayah.fromMap(map)).toList();
  }
}

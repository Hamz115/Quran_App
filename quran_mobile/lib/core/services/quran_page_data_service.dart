import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../database/database_helper.dart';
import '../../data/models/quran_page_word.dart';
import '../../data/models/quran_page_line.dart';
import '../../data/models/quran_page_data.dart';
import '../../data/quran_data.dart';

/// Loads Quran page data with platform-aware loading:
/// - Mobile: bundled QPC v2 SQLite databases (fully offline)
/// - Web: backend API at /api/quran/page/{pageNumber}
///
/// Caches in memory with LRU eviction (10 pages max).
class QuranPageDataService {
  final Map<int, QuranPageData> _cache = {};
  final List<int> _cacheOrder = []; // LRU order
  static const int _maxCacheSize = 10;

  static final Dio _dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:8000',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  /// Load page data — delegates to SQLite (mobile) or API (web).
  Future<QuranPageData> getPageData(int pageNumber) async {
    if (_cache.containsKey(pageNumber)) {
      // Move to end of LRU list
      _cacheOrder.remove(pageNumber);
      _cacheOrder.add(pageNumber);
      return _cache[pageNumber]!;
    }

    final pageData = kIsWeb
        ? await _loadFromApi(pageNumber)
        : await _loadFromSqlite(pageNumber);

    // Add to cache with LRU eviction
    _cache[pageNumber] = pageData;
    _cacheOrder.add(pageNumber);

    if (_cacheOrder.length > _maxCacheSize) {
      final evicted = _cacheOrder.removeAt(0);
      _cache.remove(evicted);
    }

    return pageData;
  }

  /// Web: fetch from backend API.
  Future<QuranPageData> _loadFromApi(int pageNumber) async {
    final response = await _dio.get('/api/quran/page/$pageNumber');
    final data = response.data as Map<String, dynamic>;
    final linesJson = data['lines'] as List<dynamic>;

    final lines = linesJson.map((lineJson) {
      final lineMap = lineJson as Map<String, dynamic>;
      final wordsJson = lineMap['words'] as List<dynamic>;

      final words = wordsJson.map((wJson) {
        final w = wJson as Map<String, dynamic>;
        return QuranPageWord(
          id: w['id'] as int,
          surah: w['surah'] as int,
          ayah: w['ayah'] as int,
          word: w['word'] as int,
          text: w['text'] as String,
          textUthmani: (w['text_uthmani'] as String?) ?? '',
          isEnd: w['is_end'] as bool,
        );
      }).toList();

      return QuranPageLine(
        lineNumber: lineMap['line_number'] as int,
        lineType: lineMap['line_type'] as String,
        isCentered: lineMap['is_centered'] as bool,
        surahNumber: lineMap['surah_number'] as int?,
        words: words,
      );
    }).toList();

    return QuranPageData(pageNumber: pageNumber, lines: lines);
  }

  /// Mobile: load from bundled SQLite databases.
  Future<QuranPageData> _loadFromSqlite(int pageNumber) async {
    final db = DatabaseHelper.instance;
    final layoutDb = await db.qpcLayoutDatabase;
    final wordsDb = await db.qpcWordsDatabase;

    // 1. Query layout DB for line structure
    final layoutRows = await layoutDb.rawQuery(
      'SELECT line_number, line_type, is_centered, first_word_id, last_word_id, surah_number '
      'FROM pages WHERE page_number = ? ORDER BY line_number',
      [pageNumber],
    );

    // 2. Collect global word ID range from all ayah lines
    int? globalFirst;
    int? globalLast;
    for (final row in layoutRows) {
      final firstId = row['first_word_id'] as int?;
      final lastId = row['last_word_id'] as int?;
      if (firstId != null && lastId != null) {
        globalFirst = globalFirst == null ? firstId : min(globalFirst, firstId);
        globalLast = globalLast == null ? lastId : max(globalLast, lastId);
      }
    }

    // 3. Fetch all words for the page in one query
    final Map<int, Map<String, dynamic>> wordsById = {};
    if (globalFirst != null && globalLast != null) {
      final wordRows = await wordsDb.rawQuery(
        'SELECT id, surah, ayah, word, text, text_uthmani '
        'FROM words WHERE id BETWEEN ? AND ? ORDER BY id',
        [globalFirst, globalLast],
      );
      for (final row in wordRows) {
        wordsById[row['id'] as int] = row;
      }
    }

    // 4. Pre-compute isEnd across ALL words on the page
    final maxWordPos = <String, int>{};
    for (final row in wordsById.values) {
      final key = '${row['surah']}:${row['ayah']}';
      final wordPos = row['word'] as int;
      maxWordPos[key] = max(maxWordPos[key] ?? 0, wordPos);
    }

    // 5. Build lines with words
    final lines = <QuranPageLine>[];
    for (final row in layoutRows) {
      final lineNumber = row['line_number'] as int;
      final lineType = row['line_type'] as String;
      final isCentered = (row['is_centered'] as int?) == 1;
      final surahNumber = row['surah_number'] as int?;

      List<QuranPageWord> lineWords = [];
      if (lineType == 'ayah') {
        final firstId = row['first_word_id'] as int?;
        final lastId = row['last_word_id'] as int?;
        if (firstId != null && lastId != null) {
          for (int id = firstId; id <= lastId; id++) {
            final wordRow = wordsById[id];
            if (wordRow != null) {
              final key = '${wordRow['surah']}:${wordRow['ayah']}';
              final isEnd = (wordRow['word'] as int) == maxWordPos[key];
              lineWords.add(QuranPageWord.fromDbRow(wordRow, isEnd));
            }
          }
        }
      }

      lines.add(QuranPageLine(
        lineNumber: lineNumber,
        lineType: lineType,
        isCentered: isCentered,
        surahNumber: surahNumber,
        words: lineWords,
      ));
    }

    return QuranPageData(pageNumber: pageNumber, lines: lines);
  }

  /// Get the page number where a surah starts.
  int pageForSurah(int surahNum) => getPageForSurah(surahNum);
}

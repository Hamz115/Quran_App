import 'dart:convert';
import 'package:flutter/services.dart';
import '../../data/models/quran_page_word.dart';
import '../../data/models/quran_page_data.dart';
import '../../data/quran_data.dart';

/// Loads Quran page JSON from bundled assets, parses into QuranPageData,
/// and caches in memory with LRU eviction (10 pages max).
class QuranPageDataService {
  final Map<int, QuranPageData> _cache = {};
  final List<int> _cacheOrder = []; // LRU order
  static const int _maxCacheSize = 10;

  /// Load page data from bundled assets.
  Future<QuranPageData> getPageData(int pageNumber) async {
    if (_cache.containsKey(pageNumber)) {
      // Move to end of LRU list
      _cacheOrder.remove(pageNumber);
      _cacheOrder.add(pageNumber);
      return _cache[pageNumber]!;
    }

    final padded = pageNumber.toString().padLeft(3, '0');
    final jsonStr = await rootBundle.loadString('assets/quran-pages/page_$padded.json');
    final List<dynamic> jsonList = json.decode(jsonStr);

    final words = jsonList.map((w) => QuranPageWord.fromJson(w as Map<String, dynamic>)).toList();
    final pageData = QuranPageData.fromWords(pageNumber, words);

    // Add to cache with LRU eviction
    _cache[pageNumber] = pageData;
    _cacheOrder.add(pageNumber);

    if (_cacheOrder.length > _maxCacheSize) {
      final evicted = _cacheOrder.removeAt(0);
      _cache.remove(evicted);
    }

    return pageData;
  }

  /// Get the page number where a surah starts.
  int pageForSurah(int surahNum) => getPageForSurah(surahNum);
}

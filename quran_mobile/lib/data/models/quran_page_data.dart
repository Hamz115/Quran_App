import 'quran_page_word.dart';

/// Parsed data for a single Quran page (1-604).
/// Groups words by line and detects surah starts for header rendering.
class QuranPageData {
  final int pageNumber;
  final List<QuranPageWord> words;
  final Map<int, List<QuranPageWord>> wordsByLine;
  final List<int> lineNumbers;
  final List<SurahStart> surahStarts;

  QuranPageData({
    required this.pageNumber,
    required this.words,
    required this.wordsByLine,
    required this.lineNumbers,
    required this.surahStarts,
  });

  factory QuranPageData.fromWords(int pageNumber, List<QuranPageWord> words) {
    // Group words by line number
    final Map<int, List<QuranPageWord>> byLine = {};
    for (final word in words) {
      byLine.putIfAbsent(word.lineNumber, () => []).add(word);
    }

    // Sort line numbers
    final sortedLines = byLine.keys.toList()..sort();

    // Detect surah starts: ayah 1, word position 1
    final List<SurahStart> starts = [];
    for (final word in words) {
      if (word.ayahNum == 1 && word.wordPosition == 1 && word.isWord) {
        // Check if we already recorded this surah start
        if (!starts.any((s) => s.surahNum == word.surahNum)) {
          starts.add(SurahStart(
            surahNum: word.surahNum,
            lineNumber: word.lineNumber,
          ));
        }
      }
    }

    return QuranPageData(
      pageNumber: pageNumber,
      words: words,
      wordsByLine: byLine,
      lineNumbers: sortedLines,
      surahStarts: starts,
    );
  }
}

/// Marks where a surah begins on a page.
class SurahStart {
  final int surahNum;
  final int lineNumber;

  const SurahStart({
    required this.surahNum,
    required this.lineNumber,
  });
}

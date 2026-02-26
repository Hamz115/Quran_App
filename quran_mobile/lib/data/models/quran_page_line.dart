import 'quran_page_word.dart';

/// Represents a single line on a Quran page with QPC v2 layout data.
/// Line types: 'surah_name', 'ayah', 'basmallah'.
class QuranPageLine {
  final int lineNumber;
  final String lineType;
  final bool isCentered;
  final int? surahNumber;
  final List<QuranPageWord> words;

  const QuranPageLine({
    required this.lineNumber,
    required this.lineType,
    required this.isCentered,
    this.surahNumber,
    this.words = const [],
  });
}

import 'quran_page_line.dart';

/// Parsed data for a single Quran page (1-604).
/// Uses QPC v2 line-based structure with explicit line types.
class QuranPageData {
  final int pageNumber;
  final List<QuranPageLine> lines;

  const QuranPageData({
    required this.pageNumber,
    required this.lines,
  });
}

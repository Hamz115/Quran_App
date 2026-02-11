import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../core/services/qpc_font_service.dart';
import '../../data/models/quran_page_data.dart';
import '../../data/models/quran_page_word.dart';
import '../../data/models/mistake.dart';
import 'surah_header_widget.dart';
import 'bismillah_widget.dart';

/// Renders a single Mushaf page with QPC glyphs.
/// Displays lines distributed evenly across an aspect ratio matching the printed Mushaf.
class MushafPageWidget extends StatelessWidget {
  final int pageNumber;
  final QuranPageData pageData;
  final bool isDarkMode;
  final List<Mistake> mistakes;
  final void Function(QuranPageWord word)? onWordTap;
  final void Function(QuranPageWord word)? onWordLongPress;

  const MushafPageWidget({
    super.key,
    required this.pageNumber,
    required this.pageData,
    required this.isDarkMode,
    this.mistakes = const [],
    this.onWordTap,
    this.onWordLongPress,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFFEF9E7), // Cream — always matches the printed Mushaf
        borderRadius: isDarkMode ? BorderRadius.circular(4) : null,
        boxShadow: isDarkMode
            ? [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: _buildLines(),
        ),
      ),
    );
  }

  List<Widget> _buildLines() {
    final lines = <Widget>[];

    for (final lineNum in pageData.lineNumbers) {
      final words = pageData.wordsByLine[lineNum] ?? [];
      if (words.isEmpty) continue;

      // Check if a surah starts on this line
      final surahStart = pageData.surahStarts
          .where((s) => s.lineNumber == lineNum)
          .firstOrNull;

      if (surahStart != null) {
        // Add surah header
        lines.add(SurahHeaderWidget(
          surahNum: surahStart.surahNum,
          isDarkMode: isDarkMode,
        ));

        // Add bismillah if applicable
        if (BismillahWidget.shouldShow(surahStart.surahNum)) {
          lines.add(BismillahWidget(isDarkMode: isDarkMode));
        }
      }

      // Build the line of QPC glyph words
      lines.add(_buildLine(words));
    }

    return lines;
  }

  Widget _buildLine(List<QuranPageWord> words) {
    return Expanded(
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          textDirection: TextDirection.rtl,
          children: words.map((word) => _buildWord(word)).toList(),
        ),
      ),
    );
  }

  Widget _buildWord(QuranPageWord word) {
    // Determine font family: page 586 overflow glyphs use previous page's font
    String fontFamily = QpcFontService.fontFamily(pageNumber);
    if (pageNumber == 586 && word.codeV1.isNotEmpty) {
      final codeUnit = word.codeV1.codeUnitAt(0);
      if (codeUnit >= 0xFC00) {
        fontFamily = QpcFontService.fontFamily(585);
      }
    }

    // Check for mistakes on this word
    final mistakeLevel = _getMistakeLevel(word);

    // Ayah end markers get distinct color
    // Always use light-mode colors — the page background is always cream
    final isEnd = word.isAyahEnd;
    final textColor = isEnd ? AppColors.cyan600 : AppColors.lightText;

    final textWidget = Text(
      word.codeV1,
      style: TextStyle(
        fontFamily: fontFamily,
        fontSize: 24,
        height: 1.8,
        color: textColor,
      ),
      textDirection: TextDirection.rtl,
    );

    Widget wordWidget;

    if (mistakeLevel > 0) {
      final mistakeColor = AppColors.getMistakeColor(mistakeLevel);
      wordWidget = Container(
        margin: const EdgeInsets.symmetric(horizontal: 1),
        padding: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              mistakeColor.withOpacity(0.3),
              mistakeColor.withOpacity(0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(4),
          border: Border(
            bottom: BorderSide(color: mistakeColor, width: 2),
          ),
        ),
        child: textWidget,
      );
    } else {
      wordWidget = Padding(
        padding: const EdgeInsets.symmetric(horizontal: 1),
        child: textWidget,
      );
    }

    if (onWordTap != null || onWordLongPress != null) {
      wordWidget = GestureDetector(
        onTap: onWordTap != null ? () => onWordTap!(word) : null,
        onLongPress: onWordLongPress != null ? () => onWordLongPress!(word) : null,
        child: wordWidget,
      );
    }

    return wordWidget;
  }

  /// Get mistake severity for a word (0 = no mistake).
  int _getMistakeLevel(QuranPageWord word) {
    if (mistakes.isEmpty) return 0;

    // word_index in mistakes is 0-based; wordPosition from QPC is 1-based
    final wordIndex = word.wordPosition - 1;

    for (final m in mistakes) {
      if (m.surahNumber == word.surahNum &&
          m.ayahNumber == word.ayahNum &&
          m.wordIndex == wordIndex) {
        return m.severityLevel;
      }
    }
    return 0;
  }
}

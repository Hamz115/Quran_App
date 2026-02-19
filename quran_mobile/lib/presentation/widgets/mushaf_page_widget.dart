import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_colors.dart';
import '../../core/services/qpc_font_service.dart';
import '../../core/services/arabic_text_utils.dart';
import '../../data/models/quran_page_data.dart';
import '../../data/models/quran_page_word.dart';
import '../../data/models/mistake.dart';
import 'surah_header_widget.dart';
import 'bismillah_widget.dart';

/// Renders a single Mushaf page with QPC glyphs.
/// Displays lines distributed evenly across an aspect ratio matching the printed Mushaf.
/// Supports character-level mistake rendering using textUthmani + Amiri font.
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
    final wordMistakes = _getWordMistakes(word);
    final wholeWordMistake = wordMistakes.where((m) => !m.isCharacterLevel).firstOrNull;
    final charMistakes = wordMistakes.where((m) => m.isCharacterLevel).toList();

    // If there's a whole-word mistake, use the standard QPC glyph rendering with full highlight
    // (whole-word takes precedence over character-level)
    if (wholeWordMistake != null) {
      return _buildQpcWord(word, fontFamily, wholeWordMistake.severityLevel);
    }

    // If there are ONLY character-level mistakes, render with textUthmani (Amiri font)
    // and color individual characters
    if (charMistakes.isNotEmpty) {
      return _buildCharLevelWord(word, charMistakes);
    }

    // No mistakes — standard QPC rendering
    return _buildQpcWord(word, fontFamily, 0);
  }

  /// Standard QPC glyph rendering (used for no-mistake and whole-word-mistake cases).
  Widget _buildQpcWord(QuranPageWord word, String fontFamily, int mistakeLevel) {
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

  /// Character-level mistake rendering: uses textUthmani with Amiri font,
  /// coloring only the specific mistaken character(s).
  Widget _buildCharLevelWord(QuranPageWord word, List<Mistake> charMistakes) {
    // Build a map of charIndex → mistake severity
    final charMistakeMap = <int, int>{};
    for (final m in charMistakes) {
      if (m.charIndex != null) {
        charMistakeMap[m.charIndex!] = m.severityLevel;
      }
    }

    // Group characters: each base letter with its following harakat
    final groups = groupArabicCharacters(word.textUthmani);

    final baseStyle = GoogleFonts.amiri(
      fontSize: 20, // ~0.85 * 24 (QPC size)
      height: 1.8,
      color: AppColors.lightText,
    );

    // Build TextSpan children for each group
    final spans = <InlineSpan>[];
    for (final group in groups) {
      final baseMistakeLevel = charMistakeMap[group.baseIndex];
      final harakatWithMistakes = group.harakat.where((h) => charMistakeMap.containsKey(h.index)).toList();

      if (harakatWithMistakes.isNotEmpty) {
        // Haraka has a mistake — color only the mistaken harakat with glow
        final children = <InlineSpan>[
          TextSpan(text: group.base),
        ];
        for (final h in group.harakat) {
          final level = charMistakeMap[h.index];
          if (level != null) {
            // Bright haraka color matching web's haraka-mistake-N
            final color = _getHarakaBrightColor(level);
            final darkerColor = AppColors.getMistakeColor(level);
            children.add(TextSpan(
              text: h.char,
              style: TextStyle(
                color: color,
                fontSize: 26, // 1.3em matching web
                fontWeight: FontWeight.bold,
                shadows: [
                  // 5-layer glow matching web's text-shadow
                  const Shadow(color: Colors.white, blurRadius: 3),
                  Shadow(color: color.withOpacity(0.8), blurRadius: 6),
                  Shadow(color: color.withOpacity(0.6), blurRadius: 10),
                  Shadow(color: darkerColor.withOpacity(0.5), blurRadius: 15),
                  Shadow(color: darkerColor.withOpacity(0.4), blurRadius: 20),
                ],
              ),
            ));
          } else {
            children.add(TextSpan(text: h.char));
          }
        }
        spans.add(TextSpan(children: children));
      } else if (baseMistakeLevel != null) {
        // Only the base letter has a mistake — highlight just this group
        // with gradient background + border (matching web's letter-mistake-N)
        final mistakeColor = AppColors.getMistakeColor(baseMistakeLevel);
        final groupText = group.base + group.harakat.map((h) => h.char).join();
        spans.add(WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  mistakeColor.withOpacity(0.5),
                  mistakeColor.withOpacity(0.35),
                ],
              ),
              borderRadius: BorderRadius.circular(4),
              border: Border(
                bottom: BorderSide(color: mistakeColor, width: 2),
              ),
            ),
            child: Text(
              groupText,
              style: baseStyle,
              textDirection: TextDirection.rtl,
            ),
          ),
        ));
      } else {
        // No mistake — plain text
        final groupText = group.base + group.harakat.map((h) => h.char).join();
        spans.add(TextSpan(text: groupText));
      }
    }

    // Render with Amiri font — NO background on the whole word (clean, matching web)
    Widget wordWidget = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 1),
      child: RichText(
        textDirection: TextDirection.rtl,
        text: TextSpan(
          style: baseStyle,
          children: spans,
        ),
      ),
    );

    if (onWordTap != null || onWordLongPress != null) {
      wordWidget = GestureDetector(
        onTap: onWordTap != null ? () => onWordTap!(word) : null,
        onLongPress: onWordLongPress != null ? () => onWordLongPress!(word) : null,
        child: wordWidget,
      );
    }

    return wordWidget;
  }

  /// Bright haraka colors matching web's haraka-mistake-N CSS classes.
  /// These are brighter than the standard mistake colors for visibility on the glow.
  static Color _getHarakaBrightColor(int level) {
    switch (level) {
      case 1: return const Color(0xFFFBBF24); // amber-400
      case 2: return const Color(0xFF60A5FA); // blue-400
      case 3: return const Color(0xFFFB923C); // orange-400
      case 4: return const Color(0xFFC084FC); // purple-400
      case 5: return const Color(0xFFF87171); // red-400
      default: return const Color(0xFFFBBF24);
    }
  }

  /// Get all mistakes for a specific word.
  List<Mistake> _getWordMistakes(QuranPageWord word) {
    if (mistakes.isEmpty) return [];

    // word_index in mistakes is 0-based; wordPosition from QPC is 1-based
    final wordIndex = word.wordPosition - 1;

    return mistakes.where((m) =>
        m.surahNumber == word.surahNum &&
        m.ayahNumber == word.ayahNum &&
        m.wordIndex == wordIndex).toList();
  }

}

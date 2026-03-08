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

/// Renders a single Mushaf page with QPC v2 glyphs.
/// Uses line-based structure with explicit line types (surah_name, ayah, basmallah).
/// Supports character-level mistake rendering using textUthmani + Amiri font.
class MushafPageWidget extends StatelessWidget {
  final int pageNumber;
  final QuranPageData pageData;
  final bool isDarkMode;
  final List<Mistake> mistakes;
  final void Function(QuranPageWord word)? onWordTap;
  final void Function(QuranPageWord word)? onWordLongPress;
  // Assignment range for dimming words outside the assigned portion
  final int? startSurah;
  final int? endSurah;
  final int? startAyah;
  final int? endAyah;
  // Highlight a specific word (flash animation from reader badge tap)
  final String? highlightedWordKey;

  const MushafPageWidget({
    super.key,
    required this.pageNumber,
    required this.pageData,
    required this.isDarkMode,
    this.mistakes = const [],
    this.onWordTap,
    this.onWordLongPress,
    this.startSurah,
    this.endSurah,
    this.startAyah,
    this.endAyah,
    this.highlightedWordKey,
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

    for (final line in pageData.lines) {
      if (line.lineType == 'surah_name') {
        lines.add(SurahHeaderWidget(
          surahNum: line.surahNumber!,
          isDarkMode: isDarkMode,
        ));
      } else if (line.lineType == 'basmallah') {
        lines.add(BismillahWidget(isDarkMode: isDarkMode));
      } else {
        // ayah line
        lines.add(_buildLine(line.words));
      }
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
    String fontFamily = QpcFontService.fontFamily(pageNumber);

    // If word is outside assigned portion, render dimmed with no interaction
    if (!_isWordInPortion(word)) {
      return _buildQpcWord(word, fontFamily, 0);
    }

    // Check for mistakes on this word
    final wordMistakes = _getWordMistakes(word);
    final wholeWordMistake = wordMistakes.where((m) => !m.isCharacterLevel).firstOrNull;
    final charMistakes = wordMistakes.where((m) => m.isCharacterLevel).toList();

    Widget result;

    // If there's a whole-word mistake, use the standard QPC glyph rendering with full highlight
    // (whole-word takes precedence over character-level)
    if (wholeWordMistake != null) {
      result = _buildQpcWord(word, fontFamily, wholeWordMistake.severityLevel);
    }
    // If there are ONLY character-level mistakes, render with textUthmani (Amiri font)
    // and color individual characters
    else if (charMistakes.isNotEmpty) {
      result = _buildCharLevelWord(word, charMistakes);
    }
    // No mistakes — standard QPC rendering
    else {
      result = _buildQpcWord(word, fontFamily, 0);
    }

    // Wrap with flash animation if this word is highlighted
    if (highlightedWordKey != null) {
      final wordKey = '${word.surah}-${word.ayah}-${word.word - 1}';
      if (wordKey == highlightedWordKey) {
        result = _FlashingWordWrapper(child: result);
      }
    }

    return result;
  }

  /// Check if a word falls within the assigned portion range.
  bool _isWordInPortion(QuranPageWord word) {
    if (startSurah == null || endSurah == null) return true;

    final surah = word.surah;
    final ayah = word.ayah;
    final sA = startAyah ?? 1;
    final eA = endAyah ?? 286;

    if (surah < startSurah!) return false;
    if (surah == startSurah && ayah < sA) return false;
    if (surah > endSurah!) return false;
    if (surah == endSurah && ayah > eA) return false;

    return true;
  }

  /// Standard QPC glyph rendering (used for no-mistake and whole-word-mistake cases).
  Widget _buildQpcWord(QuranPageWord word, String fontFamily, int mistakeLevel) {
    // Ayah end markers get distinct color
    // Always use light-mode colors — the page background is always cream
    final isEnd = word.isAyahEnd;
    final inPortion = _isWordInPortion(word);
    final baseColor = isEnd ? AppColors.cyan600 : AppColors.lightText;
    final textColor = inPortion ? baseColor : baseColor.withOpacity(0.2);

    final textWidget = Text(
      word.text,
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
  /// coloring the whole letter+harakat group for mistaken characters.
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
      fontSize: 23, // 0.95 * 24 (matches web's 0.95em)
      fontWeight: FontWeight.w400,
      height: 1.8,
      letterSpacing: 0.46, // matches web's 0.02em
      color: AppColors.lightText,
    );

    // Build TextSpan children for each group.
    // IMPORTANT: All groups MUST be TextSpan (not WidgetSpan) to preserve
    // Arabic letter joining (initial/medial/final contextual forms).
    final spans = <InlineSpan>[];
    for (final group in groups) {
      final baseMistakeLevel = charMistakeMap[group.baseIndex];
      final harakatWithMistakes = group.harakat.where((h) => charMistakeMap.containsKey(h.index)).toList();

      if (harakatWithMistakes.isNotEmpty) {
        // Haraka has a mistake — color the whole letter+harakat group
        // Find the highest severity level among all harakat mistakes in this group
        int highestLevel = 0;
        for (final h in harakatWithMistakes) {
          final level = charMistakeMap[h.index]!;
          if (level > highestLevel) highestLevel = level;
        }
        final color = AppColors.getMistakeColor(highestLevel);
        final groupText = group.base + group.harakat.map((h) => h.char).join();
        spans.add(TextSpan(
          text: groupText,
          style: TextStyle(color: color),
        ));
      } else if (baseMistakeLevel != null) {
        // Only the base letter has a mistake — use TextSpan with backgroundColor
        // (NOT WidgetSpan — that breaks Arabic letter joining/shaping)
        final mistakeColor = AppColors.getMistakeColor(baseMistakeLevel);
        final groupText = group.base + group.harakat.map((h) => h.char).join();
        spans.add(TextSpan(
          text: groupText,
          style: TextStyle(
            backgroundColor: mistakeColor.withOpacity(0.35),
          ),
        ));
      } else {
        // No mistake — plain text
        final groupText = group.base + group.harakat.map((h) => h.char).join();
        spans.add(TextSpan(text: groupText));
      }
    }

    // Render with Amiri font, keeping all spans in one RichText
    // so Arabic text shaping (letter joining) works correctly.
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

  /// Get all mistakes for a specific word.
  List<Mistake> _getWordMistakes(QuranPageWord word) {
    if (mistakes.isEmpty) return [];

    // word_index in mistakes is 0-based; word position from QPC is 1-based
    final wordIndex = word.word - 1;

    return mistakes.where((m) =>
        m.surahNumber == word.surah &&
        m.ayahNumber == word.ayah &&
        m.wordIndex == wordIndex).toList();
  }

}

/// Wraps a word widget with a scale + glow flash animation.
/// Auto-plays once on mount, auto-disposes.
class _FlashingWordWrapper extends StatefulWidget {
  final Widget child;
  const _FlashingWordWrapper({required this.child});

  @override
  State<_FlashingWordWrapper> createState() => _FlashingWordWrapperState();
}

class _FlashingWordWrapperState extends State<_FlashingWordWrapper>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _glow;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _scale = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.2), weight: 50),
      TweenSequenceItem(tween: Tween(begin: 1.2, end: 1.0), weight: 50),
    ]).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
    _glow = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: 0.7), weight: 50),
      TweenSequenceItem(tween: Tween(begin: 0.7, end: 0.0), weight: 50),
    ]).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.scale(
          scale: _scale.value,
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(4),
              boxShadow: [
                BoxShadow(
                  color: AppColors.cyan600.withOpacity(_glow.value),
                  blurRadius: 12,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

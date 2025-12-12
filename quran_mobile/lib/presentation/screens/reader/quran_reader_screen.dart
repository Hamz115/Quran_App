import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/theme.dart';
import '../../../data/models/mistake.dart';
import '../../providers/providers.dart';
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/section_badge.dart';
import '../classroom/word_popup.dart';

class QuranReaderScreen extends ConsumerStatefulWidget {
  const QuranReaderScreen({super.key});

  @override
  ConsumerState<QuranReaderScreen> createState() => _QuranReaderScreenState();
}

class _QuranReaderScreenState extends ConsumerState<QuranReaderScreen> {
  int _selectedSurah = 67;

  @override
  Widget build(BuildContext context) {
    final surahsAsync = ref.watch(surahListProvider);
    final surahAsync = ref.watch(surahWithAyahsProvider(_selectedSurah));
    final mistakesAsync = ref.watch(mistakesProvider);

    return Scaffold(
      backgroundColor: AppTheme.slate900,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Quran Reader',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.slate100,
                          ),
                        ),
                        Text(
                          'Click words to mark mistakes',
                          style: TextStyle(fontSize: 13, color: AppTheme.slate400),
                        ),
                      ],
                    ),
                  ),
                  // Surah selector
                  surahsAsync.when(
                    data: (surahs) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.slate800,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.slate700),
                      ),
                      child: DropdownButton<int>(
                        value: _selectedSurah,
                        dropdownColor: AppTheme.slate800,
                        underline: const SizedBox(),
                        style: const TextStyle(fontSize: 14, color: AppTheme.slate100),
                        items: surahs.map((s) => DropdownMenuItem(
                          value: s.number,
                          child: Text('${s.number}. ${s.englishName}'),
                        )).toList(),
                        onChanged: (v) => setState(() => _selectedSurah = v!),
                      ),
                    ),
                    loading: () => const SizedBox(),
                    error: (_, __) => const SizedBox(),
                  ),
                ],
              ),
            ),

            // Navigation buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: _selectedSurah > 1
                        ? () => setState(() => _selectedSurah--)
                        : null,
                    icon: const Icon(Icons.arrow_back_rounded, size: 18),
                    label: const Text('Previous'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppTheme.slate400,
                    ),
                  ),
                  surahAsync.when(
                    data: (data) => data != null
                        ? Column(
                            children: [
                              Text(
                                data.surah.name,
                                style: GoogleFonts.amiri(
                                  fontSize: 20,
                                  color: AppTheme.slate100,
                                ),
                              ),
                              Text(
                                '${data.surah.numberOfAyahs} Ayahs',
                                style: const TextStyle(fontSize: 12, color: AppTheme.slate400),
                              ),
                            ],
                          )
                        : const SizedBox(),
                    loading: () => const SizedBox(),
                    error: (_, __) => const SizedBox(),
                  ),
                  TextButton.icon(
                    onPressed: _selectedSurah < 114
                        ? () => setState(() => _selectedSurah++)
                        : null,
                    icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                    label: const Text('Next'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppTheme.slate400,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Legend
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: GlassmorphicCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Expanded(
                      child: Wrap(
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          _buildLegendItem('1x', AppTheme.mistake1),
                          _buildLegendItem('2x', AppTheme.mistake2),
                          _buildLegendItem('3x', AppTheme.mistake3),
                          _buildLegendItem('4x', AppTheme.mistake4),
                          _buildLegendItem('5+', AppTheme.mistake5),
                        ],
                      ),
                    ),
                    _buildMistakeCount(mistakesAsync),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Quran text
            Expanded(
              child: surahAsync.when(
                data: (data) {
                  if (data == null) return const Center(child: Text('Surah not found'));

                  final mistakes = mistakesAsync.value ?? [];

                  return SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: GlassmorphicCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          // Bismillah
                          if (_selectedSurah != 9 && _selectedSurah != 1)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 20),
                              child: Text(
                                'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
                                style: GoogleFonts.amiri(
                                  fontSize: 22,
                                  color: AppTheme.emerald400,
                                ),
                                textDirection: TextDirection.rtl,
                              ),
                            ),

                          // Ayahs
                          Directionality(
                            textDirection: TextDirection.rtl,
                            child: Wrap(
                              alignment: WrapAlignment.start,
                              children: data.ayahs.expand((ayah) {
                                final shouldStripBismillah = ayah.ayahNumber == 1 && _selectedSurah != 1 && _selectedSurah != 9;
                                final words = ayah.text.split(' ');
                                final displayWords = shouldStripBismillah ? words.skip(4).toList() : words;
                                final wordOffset = shouldStripBismillah ? 4 : 0;

                                return [
                                  ...displayWords.asMap().entries.map((entry) {
                                    final wordIndex = entry.key + wordOffset;
                                    final word = entry.value;

                                    // Find whole-word mistake
                                    final wordMistake = mistakes.where((m) =>
                                        m.surahNumber == _selectedSurah &&
                                        m.ayahNumber == ayah.ayahNumber &&
                                        m.wordIndex == wordIndex &&
                                        m.charIndex == null).firstOrNull;

                                    // Find character-level mistakes for this word
                                    final charMistakes = mistakes.where((m) =>
                                        m.surahNumber == _selectedSurah &&
                                        m.ayahNumber == ayah.ayahNumber &&
                                        m.wordIndex == wordIndex &&
                                        m.charIndex != null).toList();

                                    final mistakeLevel = wordMistake?.severityLevel ?? 0;
                                    final hasCharMistakes = charMistakes.isNotEmpty;

                                    return GestureDetector(
                                      onTap: () => _showWordPopup(word, ayah.ayahNumber, wordIndex),
                                      onLongPress: () {
                                        if (wordMistake != null) {
                                          ref.read(mistakesProvider.notifier).removeMistake(wordMistake.id!);
                                        }
                                      },
                                      child: Container(
                                        margin: const EdgeInsets.symmetric(horizontal: 2, vertical: 4),
                                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                        decoration: mistakeLevel > 0
                                            ? BoxDecoration(
                                                gradient: LinearGradient(
                                                  begin: Alignment.topCenter,
                                                  end: Alignment.bottomCenter,
                                                  colors: [
                                                    AppTheme.getMistakeColor(mistakeLevel).withOpacity(0.3),
                                                    AppTheme.getMistakeColor(mistakeLevel).withOpacity(0.1),
                                                  ],
                                                ),
                                                borderRadius: BorderRadius.circular(4),
                                                border: Border(
                                                  bottom: BorderSide(
                                                    color: AppTheme.getMistakeColor(mistakeLevel),
                                                    width: 2,
                                                  ),
                                                ),
                                              )
                                            : null,
                                        child: hasCharMistakes
                                            ? _buildHighlightedWord(word, charMistakes)
                                            : Text(
                                                word,
                                                style: GoogleFonts.amiri(
                                                  fontSize: 22,
                                                  height: 2.2,
                                                  color: AppTheme.slate200,
                                                ),
                                              ),
                                      ),
                                    );
                                  }),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 4),
                                    child: Text(
                                      ' ﴿${ayah.ayahNumber}﴾ ',
                                      style: GoogleFonts.amiri(
                                        fontSize: 16,
                                        color: AppTheme.emerald400,
                                      ),
                                    ),
                                  ),
                                ];
                              }).toList(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Center(child: Text('Error: $e')),
              ),
            ),

            // Mistakes summary
            _buildMistakesSummary(mistakesAsync),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color.withOpacity(0.3),
            borderRadius: BorderRadius.circular(4),
            border: Border(bottom: BorderSide(color: color, width: 2)),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.slate400)),
      ],
    );
  }

  Widget _buildMistakeCount(AsyncValue<List<Mistake>> mistakesAsync) {
    final mistakes = mistakesAsync.value ?? [];
    final surahMistakes = mistakes.where((m) => m.surahNumber == _selectedSurah).toList();
    final totalErrors = surahMistakes.fold(0, (sum, m) => sum + m.errorCount);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: totalErrors == 0
            ? AppTheme.emerald500.withOpacity(0.2)
            : AppTheme.mistake1.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: totalErrors == 0
              ? AppTheme.emerald500.withOpacity(0.3)
              : AppTheme.mistake1.withOpacity(0.3),
        ),
      ),
      child: Text(
        '$totalErrors mistakes',
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: totalErrors == 0 ? AppTheme.emerald400 : AppTheme.mistake1,
        ),
      ),
    );
  }

  Widget _buildMistakesSummary(AsyncValue<List<Mistake>> mistakesAsync) {
    final mistakes = mistakesAsync.value ?? [];
    final surahMistakes = mistakes.where((m) => m.surahNumber == _selectedSurah).toList();

    if (surahMistakes.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.slate800,
        border: Border(top: BorderSide(color: AppTheme.slate700.withOpacity(0.5))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Mistakes in this Surah (${surahMistakes.length} words)',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.slate300),
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: surahMistakes.map((m) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: MistakeBadge(
                  errorCount: m.errorCount,
                  wordText: m.wordText,
                  location: '${m.ayahNumber}:${m.wordIndex + 1}',
                ),
              )).toList(),
            ),
          ),
        ],
      ),
    );
  }

  void _showWordPopup(String word, int ayahNumber, int wordIndex) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => WordPopup(
        word: word,
        onSelectWhole: () {
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: _selectedSurah,
            ayahNumber: ayahNumber,
            wordIndex: wordIndex,
            wordText: word,
          );
          Navigator.pop(context);
        },
        onSelectChar: (charIndex, charText) {
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: _selectedSurah,
            ayahNumber: ayahNumber,
            wordIndex: wordIndex,
            wordText: charText,  // Store only the letter/harakat
            charIndex: charIndex,
          );
          Navigator.pop(context);
        },
      ),
    );
  }

  /// Builds a word with highlighted characters for character-level mistakes
  Widget _buildHighlightedWord(String word, List<Mistake> charMistakes) {
    // Build a map of charIndex -> mistake for quick lookup
    final mistakeMap = <int, Mistake>{};
    for (final m in charMistakes) {
      if (m.charIndex != null) {
        mistakeMap[m.charIndex!] = m;
      }
    }

    // Build TextSpan for each character using raw code units (same as word_popup.dart)
    final spans = <TextSpan>[];

    for (int i = 0; i < word.length; i++) {
      final char = word[i];
      final mistake = mistakeMap[i];

      if (mistake != null) {
        // This character has a mistake - highlight it
        final color = AppTheme.getMistakeColor(mistake.severityLevel);
        spans.add(TextSpan(
          text: char,
          style: GoogleFonts.amiri(
            fontSize: 22,
            height: 2.2,
            color: color,
            backgroundColor: color.withOpacity(0.3),
          ),
        ));
      } else {
        // Normal character
        spans.add(TextSpan(
          text: char,
          style: GoogleFonts.amiri(
            fontSize: 22,
            height: 2.2,
            color: AppTheme.slate200,
          ),
        ));
      }
    }

    return RichText(
      text: TextSpan(children: spans),
    );
  }
}

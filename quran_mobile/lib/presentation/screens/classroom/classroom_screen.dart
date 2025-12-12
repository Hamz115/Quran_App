import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/theme.dart';
import '../../../config/constants.dart';
import '../../../data/models/assignment.dart';
import '../../../data/models/mistake.dart';
import '../../providers/providers.dart';
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/section_badge.dart';
import 'word_popup.dart';

class ClassroomScreen extends ConsumerStatefulWidget {
  final int classId;

  const ClassroomScreen({super.key, required this.classId});

  @override
  ConsumerState<ClassroomScreen> createState() => _ClassroomScreenState();
}

class _ClassroomScreenState extends ConsumerState<ClassroomScreen> {
  String _activeSection = 'hifz';
  int _selectedPortionIndex = 0;
  int? _selectedSurahNum;

  @override
  Widget build(BuildContext context) {
    final classAsync = ref.watch(classProvider(widget.classId));
    final mistakesAsync = ref.watch(mistakesProvider);

    return Scaffold(
      backgroundColor: AppTheme.slate900,
      body: classAsync.when(
        data: (classData) {
          if (classData == null) {
            return const Center(child: Text('Class not found'));
          }

          // Get available sections
          final availableSections = <String>{};
          for (final a in classData.assignments) {
            availableSections.add(a.type);
          }

          // Set initial section if needed
          if (!availableSections.contains(_activeSection) && availableSections.isNotEmpty) {
            _activeSection = availableSections.first;
          }

          // Get assignments for current section
          final sectionAssignments = classData.assignments.where((a) => a.type == _activeSection).toList();
          final currentAssignment = sectionAssignments.isNotEmpty && _selectedPortionIndex < sectionAssignments.length
              ? sectionAssignments[_selectedPortionIndex]
              : null;

          // Set initial surah
          if (_selectedSurahNum == null && currentAssignment != null) {
            _selectedSurahNum = currentAssignment.startSurah;
          }

          return SafeArea(
            child: Column(
              children: [
                // Header
                _buildHeader(classData.day, classData.date),

                // Section tabs
                _buildSectionTabs(availableSections.toList(), classData.assignments),

                // Portion selector (if multiple)
                if (sectionAssignments.length > 1)
                  _buildPortionSelector(sectionAssignments),

                // Surah selector (if multi-surah)
                if (currentAssignment != null && currentAssignment.isMultiSurah)
                  _buildSurahSelector(currentAssignment),

                // Legend & stats
                _buildInfoBar(mistakesAsync, currentAssignment),

                // Quran text
                Expanded(
                  child: currentAssignment != null && _selectedSurahNum != null
                      ? _buildQuranText(_selectedSurahNum!, currentAssignment, mistakesAsync)
                      : const Center(child: Text('No portion selected')),
                ),

                // Mistakes summary
                _buildMistakesSummary(mistakesAsync, currentAssignment),
              ],
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildHeader(String day, String date) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_rounded),
            color: AppTheme.slate400,
          ),
          Expanded(
            child: Text(
              'Class - $day, $date',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.slate100,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTabs(List<String> sections, List<Assignment> allAssignments) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: sections.map((type) {
          final isSelected = _activeSection == type;
          final color = AppTheme.getSectionColor(type);
          final count = allAssignments.where((a) => a.type == type).length;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: SectionTab(
              type: type,
              label: AppConstants.sectionLabels[type] ?? type,
              portionCount: count,
              isSelected: isSelected,
              onTap: () {
                setState(() {
                  _activeSection = type;
                  _selectedPortionIndex = 0;
                  _selectedSurahNum = null;
                });
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPortionSelector(List<Assignment> assignments) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: assignments.asMap().entries.map((entry) {
            final index = entry.key;
            final assignment = entry.value;
            final isSelected = _selectedPortionIndex == index;
            final color = AppTheme.getSectionColor(assignment.type);

            final surahName = AppConstants.surahNames[assignment.startSurah] ?? '';
            String label = surahName;
            if (assignment.hasAyahRange) {
              label += ' (${assignment.startAyah}-${assignment.endAyah})';
            }

            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedPortionIndex = index;
                    _selectedSurahNum = assignment.startSurah;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? color.withOpacity(0.2) : AppTheme.slate800,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected ? color.withOpacity(0.5) : AppTheme.slate700,
                    ),
                  ),
                  child: Text(
                    'Portion ${index + 1}: $label',
                    style: TextStyle(
                      fontSize: 13,
                      color: isSelected ? color : AppTheme.slate400,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildSurahSelector(Assignment assignment) {
    final surahs = assignment.surahNumbers;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: surahs.map((num) {
            final isSelected = _selectedSurahNum == num;
            final name = AppConstants.surahNames[num] ?? 'Surah $num';

            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => setState(() => _selectedSurahNum = num),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.emerald500 : AppTheme.slate800,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '$num. $name',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      color: isSelected ? Colors.white : AppTheme.slate400,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildInfoBar(AsyncValue<List<Mistake>> mistakesAsync, Assignment? assignment) {
    final mistakes = mistakesAsync.value ?? [];
    final relevantMistakes = assignment == null
        ? []
        : mistakes.where((m) {
            if (m.surahNumber != _selectedSurahNum) return false;
            if (assignment.hasAyahRange) {
              return m.ayahNumber >= assignment.startAyah! && m.ayahNumber <= assignment.endAyah!;
            }
            return true;
          }).toList();

    return Padding(
      padding: const EdgeInsets.all(16),
      child: GlassmorphicCard(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // Legend
            Expanded(
              child: Wrap(
                spacing: 8,
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
            // Mistake count
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: relevantMistakes.isEmpty
                    ? AppTheme.emerald500.withOpacity(0.2)
                    : AppTheme.mistake1.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: relevantMistakes.isEmpty
                      ? AppTheme.emerald500.withOpacity(0.3)
                      : AppTheme.mistake1.withOpacity(0.3),
                ),
              ),
              child: Text(
                '${relevantMistakes.length} mistakes',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: relevantMistakes.isEmpty ? AppTheme.emerald400 : AppTheme.mistake1,
                ),
              ),
            ),
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

  Widget _buildQuranText(int surahNumber, Assignment assignment, AsyncValue<List<Mistake>> mistakesAsync) {
    final surahAsync = ref.watch(surahWithAyahsProvider(surahNumber));
    final mistakes = mistakesAsync.value ?? [];

    return surahAsync.when(
      data: (surahData) {
        if (surahData == null) return const Center(child: Text('Surah not found'));

        var ayahs = surahData.ayahs;

        // Filter ayahs if specific range
        if (assignment.startSurah == assignment.endSurah && assignment.hasAyahRange) {
          ayahs = ayahs.where((a) => a.ayahNumber >= assignment.startAyah! && a.ayahNumber <= assignment.endAyah!).toList();
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: GlassmorphicCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Surah header
                Text(
                  surahData.surah.name,
                  style: GoogleFonts.amiri(
                    fontSize: 28,
                    color: AppTheme.slate100,
                  ),
                ),
                Text(
                  '${surahData.surah.englishName} - ${surahData.surah.englishNameTranslation}',
                  style: const TextStyle(fontSize: 14, color: AppTheme.slate400),
                ),
                const SizedBox(height: 20),

                // Bismillah
                if (surahNumber != 9 && surahNumber != 1)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 20),
                    child: Text(
                      'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
                      style: GoogleFonts.amiri(
                        fontSize: 24,
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
                    children: ayahs.expand((ayah) {
                      // Strip bismillah from first ayah
                      final shouldStripBismillah = ayah.ayahNumber == 1 && surahNumber != 1 && surahNumber != 9;
                      final words = ayah.text.split(' ');
                      final displayWords = shouldStripBismillah ? words.skip(4).toList() : words;
                      final wordOffset = shouldStripBismillah ? 4 : 0;

                      return [
                        ...displayWords.asMap().entries.map((entry) {
                          final wordIndex = entry.key + wordOffset;
                          final word = entry.value;

                          // Find whole-word mistake
                          final wordMistake = mistakes.where((m) =>
                              m.surahNumber == surahNumber &&
                              m.ayahNumber == ayah.ayahNumber &&
                              m.wordIndex == wordIndex &&
                              m.charIndex == null).firstOrNull;

                          // Find character-level mistakes for this word
                          final charMistakes = mistakes.where((m) =>
                              m.surahNumber == surahNumber &&
                              m.ayahNumber == ayah.ayahNumber &&
                              m.wordIndex == wordIndex &&
                              m.charIndex != null).toList();

                          final mistakeLevel = wordMistake?.severityLevel ?? 0;
                          final hasCharMistakes = charMistakes.isNotEmpty;

                          return GestureDetector(
                            onTap: () => _showWordPopup(
                              context,
                              word,
                              surahNumber,
                              ayah.ayahNumber,
                              wordIndex,
                            ),
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
                                        fontSize: 24,
                                        height: 2.2,
                                        color: AppTheme.slate200,
                                      ),
                                    ),
                            ),
                          );
                        }),
                        // Ayah number
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Text(
                            ' ﴿${ayah.ayahNumber}﴾ ',
                            style: GoogleFonts.amiri(
                              fontSize: 18,
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
    );
  }

  Widget _buildMistakesSummary(AsyncValue<List<Mistake>> mistakesAsync, Assignment? assignment) {
    if (assignment == null) return const SizedBox.shrink();

    final mistakes = mistakesAsync.value ?? [];
    final relevantMistakes = mistakes.where((m) {
      if (m.surahNumber != _selectedSurahNum) return false;
      if (assignment.hasAyahRange) {
        return m.ayahNumber >= assignment.startAyah! && m.ayahNumber <= assignment.endAyah!;
      }
      return true;
    }).toList();

    if (relevantMistakes.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.slate800,
        border: Border(top: BorderSide(color: AppTheme.slate700.withOpacity(0.5))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Mistakes in this section:',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.slate300),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: relevantMistakes.map((m) => MistakeBadge(
              errorCount: m.errorCount,
              wordText: m.wordText,
              location: '${m.ayahNumber}:${m.wordIndex + 1}',
            )).toList(),
          ),
        ],
      ),
    );
  }

  void _showWordPopup(BuildContext context, String word, int surahNumber, int ayahNumber, int wordIndex) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => WordPopup(
        word: word,
        onSelectWhole: () {
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: surahNumber,
            ayahNumber: ayahNumber,
            wordIndex: wordIndex,
            wordText: word,
            classId: widget.classId,
          );
          Navigator.pop(context);
        },
        onSelectChar: (charIndex, charText) {
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: surahNumber,
            ayahNumber: ayahNumber,
            wordIndex: wordIndex,
            wordText: charText,  // Store only the letter/harakat
            charIndex: charIndex,
            classId: widget.classId,
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
            fontSize: 24,
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
            fontSize: 24,
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

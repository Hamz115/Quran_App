import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/app_colors.dart';
import '../../../config/constants.dart';
import '../../../data/models/assignment.dart';
import '../../../data/models/mistake.dart';
import '../../../data/models/quran_page_word.dart';
import '../../../data/quran_data.dart';
import '../../providers/providers.dart';
import '../../providers/theme_provider.dart';
import '../../providers/quran_page_provider.dart';
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/mushaf_page_widget.dart';
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
  int _currentPage = 0; // 0 = not yet initialized
  String? _selectedStudentId; // Supabase student UUID (web only)
  bool _studentInitialized = false;

  PageController? _pageController;

  @override
  void dispose() {
    _pageController?.dispose();
    super.dispose();
  }

  void _initPageController(int firstPage, int lastPage) {
    final pageIndex = _currentPage - firstPage;
    _pageController?.dispose();
    _pageController = PageController(initialPage: pageIndex);
  }

  @override
  Widget build(BuildContext context) {
    final classAsync = ref.watch(classProvider(widget.classId));
    final mistakesAsync = ref.watch(mistakesProvider);
    final isDarkMode = ref.watch(themeProvider);

    // On web, fetch teacher's students for the student selector
    final studentsAsync = kIsWeb ? ref.watch(teacherStudentsProvider) : null;

    // Auto-select first student on web if not yet initialized
    if (kIsWeb && !_studentInitialized && studentsAsync != null) {
      studentsAsync.whenData((students) {
        if (students.isNotEmpty && _selectedStudentId == null) {
          _selectedStudentId = students.first.id;
          _studentInitialized = true;
          // Load mistakes for this student
          Future.microtask(() {
            ref.read(mistakesProvider.notifier).setWebStudentId(_selectedStudentId);
          });
        }
      });
    }

    return Scaffold(
      backgroundColor: AppColors.background(isDarkMode),
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

          // Compute page range from current assignment
          int firstPage = 1;
          int lastPage = 1;
          if (currentAssignment != null) {
            final range = getPageRange(
              startSurah: currentAssignment.startSurah,
              endSurah: currentAssignment.endSurah,
              startAyah: currentAssignment.startAyah,
              endAyah: currentAssignment.endAyah,
            );
            firstPage = range.$1;
            lastPage = range.$2;
          }

          // Initialize current page if not set or out of range
          if (_currentPage < firstPage || _currentPage > lastPage) {
            _currentPage = firstPage;
            _initPageController(firstPage, lastPage);
          }

          final totalPagesInRange = lastPage - firstPage + 1;

          return SafeArea(
            child: Column(
              children: [
                // Header
                _buildHeader(classData.day, classData.date, isDarkMode),

                // Student selector (web only, for teachers)
                if (kIsWeb && studentsAsync != null)
                  _buildStudentSelector(studentsAsync, isDarkMode),

                // Section tabs
                _buildSectionTabs(availableSections.toList(), classData.assignments, isDarkMode),

                // Portion selector (if multiple)
                if (sectionAssignments.length > 1)
                  _buildPortionSelector(sectionAssignments, isDarkMode),

                // Legend & stats
                _buildInfoBar(mistakesAsync, currentAssignment, isDarkMode),

                // Page navigation
                if (currentAssignment != null)
                  _buildPageNav(_currentPage, firstPage, lastPage, isDarkMode),

                // Mushaf page with swipe (mistakes visible on scroll down)
                Expanded(
                  child: currentAssignment != null
                      ? _buildSwipeableMushafPage(firstPage, lastPage, totalPagesInRange, mistakesAsync, currentAssignment, isDarkMode)
                      : Center(
                          child: Text(
                            'No portion selected',
                            style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                          ),
                        ),
                ),
              ],
            ),
          );
        },
        loading: () => Center(
          child: CircularProgressIndicator(color: AppColors.primary(isDarkMode)),
        ),
        error: (e, _) => Center(
          child: Text('Error: $e', style: TextStyle(color: AppColors.text(isDarkMode))),
        ),
      ),
    );
  }

  Widget _buildHeader(String day, String date, bool isDarkMode) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_rounded),
            color: AppColors.textSecondary(isDarkMode),
          ),
          Expanded(
            child: Text(
              'Class - $day, $date',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.text(isDarkMode),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudentSelector(
    AsyncValue<List<({String id, String name})>> studentsAsync,
    bool isDarkMode,
  ) {
    return studentsAsync.when(
      data: (students) {
        if (students.isEmpty) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text(
              'No students assigned',
              style: TextStyle(fontSize: 13, color: AppColors.textMuted(isDarkMode)),
            ),
          );
        }

        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              Text(
                'Student: ',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary(isDarkMode)),
              ),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary(isDarkMode).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primary(isDarkMode).withOpacity(0.3)),
                  ),
                  child: DropdownButton<String>(
                    value: _selectedStudentId,
                    isExpanded: true,
                    isDense: true,
                    underline: const SizedBox.shrink(),
                    dropdownColor: AppColors.surface(isDarkMode),
                    style: TextStyle(fontSize: 13, color: AppColors.primary(isDarkMode)),
                    items: students.map((s) => DropdownMenuItem(
                      value: s.id,
                      child: Text(s.name, style: TextStyle(color: AppColors.text(isDarkMode))),
                    )).toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _selectedStudentId = value);
                        ref.read(mistakesProvider.notifier).setWebStudentId(value);
                      }
                    },
                  ),
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildSectionTabs(List<String> sections, List<Assignment> allAssignments, bool isDarkMode) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: sections.map((type) {
          final isSelected = _activeSection == type;
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
                  _currentPage = 0; // reset so it re-initializes
                });
              },
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPortionSelector(List<Assignment> assignments, bool isDarkMode) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: assignments.asMap().entries.map((entry) {
            final index = entry.key;
            final assignment = entry.value;
            final isSelected = _selectedPortionIndex == index;
            final color = AppColors.getSectionColor(assignment.type);

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
                    _currentPage = 0; // reset so it re-initializes
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? color.withOpacity(0.2) : AppColors.surface(isDarkMode),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected ? color.withOpacity(0.5) : AppColors.border(isDarkMode),
                    ),
                  ),
                  child: Text(
                    'Portion ${index + 1}: $label',
                    style: TextStyle(
                      fontSize: 13,
                      color: isSelected ? color : AppColors.textSecondary(isDarkMode),
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

  Widget _buildInfoBar(AsyncValue<List<Mistake>> mistakesAsync, Assignment? assignment, bool isDarkMode) {
    final mistakes = mistakesAsync.value ?? [];
    final relevantMistakes = _getMistakesForAssignment(mistakes, assignment);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: GlassmorphicCard(
        padding: const EdgeInsets.all(10),
        child: Row(
          children: [
            // Legend
            Expanded(
              child: Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  _buildLegendItem('1x', AppColors.mistake1, isDarkMode),
                  _buildLegendItem('2x', AppColors.mistake2, isDarkMode),
                  _buildLegendItem('3x', AppColors.mistake3, isDarkMode),
                  _buildLegendItem('4x', AppColors.mistake4, isDarkMode),
                  _buildLegendItem('5+', AppColors.mistake5, isDarkMode),
                ],
              ),
            ),
            // Mistake count
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: relevantMistakes.isEmpty
                    ? AppColors.emerald500.withOpacity(0.2)
                    : AppColors.mistake1.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: relevantMistakes.isEmpty
                      ? AppColors.emerald500.withOpacity(0.3)
                      : AppColors.mistake1.withOpacity(0.3),
                ),
              ),
              child: Text(
                '${relevantMistakes.length} mistakes',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: relevantMistakes.isEmpty ? AppColors.emerald400 : AppColors.mistake1,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color, bool isDarkMode) {
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
        Text(label, style: TextStyle(fontSize: 11, color: AppColors.textSecondary(isDarkMode))),
      ],
    );
  }

  Widget _buildPageNav(int currentPage, int firstPage, int lastPage, bool isDarkMode) {
    final totalPagesInRange = lastPage - firstPage + 1;
    final pageInRange = currentPage - firstPage + 1;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Next page (higher page number) — RTL: left arrow goes forward
          IconButton(
            icon: Icon(Icons.chevron_left, color: AppColors.textSecondary(isDarkMode)),
            onPressed: currentPage < lastPage
                ? () {
                    setState(() => _currentPage++);
                    _pageController?.animateToPage(
                      _currentPage - firstPage,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  }
                : null,
          ),
          // Page counter
          Text(
            '$pageInRange / $totalPagesInRange  (p. $currentPage)',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.text(isDarkMode),
            ),
          ),
          // Previous page (lower page number) — RTL: right arrow goes back
          IconButton(
            icon: Icon(Icons.chevron_right, color: AppColors.textSecondary(isDarkMode)),
            onPressed: currentPage > firstPage
                ? () {
                    setState(() => _currentPage--);
                    _pageController?.animateToPage(
                      _currentPage - firstPage,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    );
                  }
                : null,
          ),
        ],
      ),
    );
  }

  Widget _buildSwipeableMushafPage(
    int firstPage,
    int lastPage,
    int totalPagesInRange,
    AsyncValue<List<Mistake>> mistakesAsync,
    Assignment? assignment,
    bool isDarkMode,
  ) {
    // Ensure page controller exists
    if (_pageController == null || !_pageController!.hasClients) {
      _initPageController(firstPage, lastPage);
    }

    return PageView.builder(
      controller: _pageController,
      reverse: true, // RTL: swipe left = next page (higher number)
      itemCount: totalPagesInRange,
      onPageChanged: (index) {
        setState(() => _currentPage = firstPage + index);
      },
      itemBuilder: (context, index) {
        final pageNum = firstPage + index;
        return _buildScrollablePage(pageNum, mistakesAsync, assignment, isDarkMode);
      },
    );
  }

  /// Each page is vertically scrollable: mushaf fills the viewport,
  /// mistakes summary appears below when you scroll down.
  Widget _buildScrollablePage(
    int pageNum,
    AsyncValue<List<Mistake>> mistakesAsync,
    Assignment? assignment,
    bool isDarkMode,
  ) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          child: Column(
            children: [
              // Mushaf page takes full available height
              SizedBox(
                height: constraints.maxHeight,
                child: _buildMushafPage(pageNum, mistakesAsync, isDarkMode),
              ),
              // Mistakes summary below (scroll down to see)
              _buildMistakesSummary(mistakesAsync, assignment, isDarkMode),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMushafPage(int pageNum, AsyncValue<List<Mistake>> mistakesAsync, bool isDarkMode) {
    final pageDataAsync = ref.watch(quranPageDataProvider(pageNum));
    final fontReadyAsync = ref.watch(fontReadyProvider(pageNum));
    final mistakes = mistakesAsync.value ?? [];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: pageDataAsync.when(
        data: (pageData) => fontReadyAsync.when(
          data: (_) => MushafPageWidget(
            pageNumber: pageNum,
            pageData: pageData,
            isDarkMode: isDarkMode,
            mistakes: mistakes,
            onWordTap: (word) => _showWordPopup(context, word),
            onWordLongPress: (word) => _removeMistake(word, mistakes),
          ),
          loading: () => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary(isDarkMode),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Loading fonts...',
                  style: TextStyle(fontSize: 13, color: AppColors.textMuted(isDarkMode)),
                ),
              ],
            ),
          ),
          error: (e, _) => MushafPageWidget(
            pageNumber: pageNum,
            pageData: pageData,
            isDarkMode: isDarkMode,
            mistakes: mistakes,
            onWordTap: (word) => _showWordPopup(context, word),
            onWordLongPress: (word) => _removeMistake(word, mistakes),
          ),
        ),
        loading: () => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppColors.primary(isDarkMode),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Loading page $pageNum...',
                style: TextStyle(fontSize: 13, color: AppColors.textMuted(isDarkMode)),
              ),
            ],
          ),
        ),
        error: (e, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, color: AppColors.error, size: 32),
              const SizedBox(height: 8),
              Text(
                'Error loading page $pageNum',
                style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMistakesSummary(
    AsyncValue<List<Mistake>> mistakesAsync,
    Assignment? assignment,
    bool isDarkMode,
  ) {
    if (assignment == null) return const SizedBox.shrink();

    final mistakes = mistakesAsync.value ?? [];
    final relevantMistakes = _getMistakesForAssignment(mistakes, assignment);

    if (relevantMistakes.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface(isDarkMode),
        border: Border(top: BorderSide(color: AppColors.border(isDarkMode).withOpacity(0.5))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Mistakes in this section (${relevantMistakes.length}):',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary(isDarkMode),
            ),
          ),
          const SizedBox(height: 10),
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

  void _showWordPopup(BuildContext context, QuranPageWord word) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => WordPopup(
        word: word.textUthmani,
        onSelectWhole: () {
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: word.surahNum,
            ayahNumber: word.ayahNum,
            wordIndex: word.wordPosition - 1, // QPC is 1-based, mistakes are 0-based
            wordText: word.textUthmani,
            classId: widget.classId,
            studentId: _selectedStudentId,
          );
          Navigator.pop(ctx);
        },
        onSelectChar: (charIndex, charText) {
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: word.surahNum,
            ayahNumber: word.ayahNum,
            wordIndex: word.wordPosition - 1,
            wordText: charText,
            charIndex: charIndex,
            classId: widget.classId,
            studentId: _selectedStudentId,
          );
          Navigator.pop(ctx);
        },
      ),
    );
  }

  void _removeMistake(QuranPageWord word, List<Mistake> mistakes) {
    final wordIndex = word.wordPosition - 1;
    final match = mistakes.where((m) =>
      m.surahNumber == word.surahNum &&
      m.ayahNumber == word.ayahNum &&
      m.wordIndex == wordIndex &&
      m.charIndex == null
    ).firstOrNull;
    if (match != null) {
      ref.read(mistakesProvider.notifier).removeMistake(match.id!);
    }
  }

  /// Get all mistakes relevant to the entire assignment (across all pages).
  List<Mistake> _getMistakesForAssignment(List<Mistake> allMistakes, Assignment? assignment) {
    if (assignment == null) return [];

    return allMistakes.where((m) {
      // Check if mistake's surah is within the assignment range
      if (m.surahNumber < assignment.startSurah || m.surahNumber > assignment.endSurah) {
        return false;
      }

      // If single surah with ayah range, filter by ayah
      if (assignment.startSurah == assignment.endSurah && assignment.hasAyahRange) {
        return m.ayahNumber >= assignment.startAyah! && m.ayahNumber <= assignment.endAyah!;
      }

      // Multi-surah: filter ayahs at the boundaries
      if (m.surahNumber == assignment.startSurah && assignment.startAyah != null) {
        if (m.ayahNumber < assignment.startAyah!) return false;
      }
      if (m.surahNumber == assignment.endSurah && assignment.endAyah != null) {
        if (m.ayahNumber > assignment.endAyah!) return false;
      }

      return true;
    }).toList();
  }
}

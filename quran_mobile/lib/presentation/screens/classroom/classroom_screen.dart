import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/app_colors.dart';
import '../../../config/constants.dart';
import '../../../data/models/assignment.dart';
import '../../../data/models/class_session.dart';
import '../../../data/models/mistake.dart';
import '../../../data/models/quran_page_word.dart';
import '../../../data/quran_data.dart';
import '../../providers/providers.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/quran_page_provider.dart';
import '../../widgets/mushaf_page_widget.dart';
import '../../widgets/section_badge.dart';
import '../../../core/services/tour_service.dart';
import 'word_popup.dart';

class ClassroomScreen extends ConsumerStatefulWidget {
  final String classId;

  const ClassroomScreen({super.key, required this.classId});

  @override
  ConsumerState<ClassroomScreen> createState() => _ClassroomScreenState();
}

class _ClassroomScreenState extends ConsumerState<ClassroomScreen> {
  String _activeSection = 'hifz';
  int _selectedPortionIndex = 0;
  int _currentPage = 0; // 0 = not yet initialized
  String? _selectedStudentId; // Supabase student UUID
  bool _studentInitialized = false;
  bool _showPageOnly = true; // Toggle: true = show only this page's mistakes (default: Page)

  // Overlay state (like QuranReaderScreen)
  bool _showOverlay = false;
  Timer? _overlayTimer;
  final TextEditingController _jumpController = TextEditingController();

  // Flash highlight state for mistake badge tap
  String? _highlightedWordKey;
  Timer? _flashTimer;

  PageController? _pageController;

  @override
  void dispose() {
    _pageController?.dispose();
    _overlayTimer?.cancel();
    _flashTimer?.cancel();
    _jumpController.dispose();
    super.dispose();
  }

  void _initPageController(int firstPage, int lastPage) {
    final pageIndex = _currentPage - firstPage;
    _pageController?.dispose();
    _pageController = PageController(initialPage: pageIndex);
  }

  void _toggleOverlay() {
    setState(() => _showOverlay = !_showOverlay);
    _overlayTimer?.cancel();
    if (_showOverlay) {
      _overlayTimer = Timer(const Duration(seconds: 4), () {
        if (mounted) setState(() => _showOverlay = false);
      });
    }
  }

  void _flashWord(int surah, int ayah, int wordIndex, {int? firstPage}) {
    _flashTimer?.cancel();
    final key = '$surah-$ayah-$wordIndex';
    // Navigate to the correct page if the mistake is on a different page
    final targetPage = getPageNumber(surah, ayah);
    if (targetPage != _currentPage && firstPage != null) {
      setState(() => _currentPage = targetPage);
      _pageController?.animateToPage(
        targetPage - firstPage,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
      // Delay flash so the new page renders first
      Future.delayed(const Duration(milliseconds: 150), () {
        if (mounted) {
          setState(() => _highlightedWordKey = key);
          _flashTimer = Timer(const Duration(milliseconds: 1500), () {
            if (mounted) setState(() => _highlightedWordKey = null);
          });
        }
      });
    } else {
      setState(() => _highlightedWordKey = key);
      _flashTimer = Timer(const Duration(milliseconds: 1500), () {
        if (mounted) setState(() => _highlightedWordKey = null);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final classAsync = ref.watch(classFromStringIdProvider(widget.classId));
    final mistakesAsync = ref.watch(mistakesProvider);
    final isDarkMode = ref.watch(themeProvider);

    // Fetch teacher's students for the student selector dropdown
    final isTeacher = ref.read(authProvider).isTeacher;
    final studentsAsync = isTeacher ? ref.watch(teacherStudentsProvider) : null;

    // Fetch CLASS-SPECIFIC students to auto-select the correct one
    final classStudentsAsync = isTeacher ? ref.watch(classStudentsProvider(widget.classId)) : null;

    // Auto-select from class-enrolled students (not all teacher's students)
    if (!_studentInitialized && classStudentsAsync != null) {
      classStudentsAsync.whenData((classStudents) {
        if (classStudents.isNotEmpty && _selectedStudentId == null) {
          _selectedStudentId = classStudents.first.id;
          _studentInitialized = true;
          Future.microtask(() {
            ref.read(mistakesProvider.notifier).setStudentId(_selectedStudentId);
          });
        }
      });
    }
    // Fallback: if class has no enrolled students yet, use all teacher's students
    if (!_studentInitialized && studentsAsync != null && classStudentsAsync?.value?.isEmpty == true) {
      studentsAsync.whenData((students) {
        if (students.isNotEmpty && _selectedStudentId == null) {
          _selectedStudentId = students.first.id;
          _studentInitialized = true;
          Future.microtask(() {
            ref.read(mistakesProvider.notifier).setStudentId(_selectedStudentId);
          });
        }
      });
    }

    return Scaffold(
      backgroundColor: isDarkMode ? Colors.black : const Color(0xFFFEF9E7),
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

          // Get assignments for current section (filtered by student)
          final sectionAssignments = classData.assignments.where((a) {
            if (a.type != _activeSection) return false;
            if (a.studentId == null) return true; // Class-wide
            if (isTeacher && _selectedStudentId != null) return a.studentId == _selectedStudentId;
            return false;
          }).toList();
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
          final mistakes = mistakesAsync.value ?? [];
          final relevantMistakes = _getMistakesForAssignment(mistakes, currentAssignment);

          return SafeArea(
            child: Column(
              children: [
                // Solid top bar (NOT overlaying the Quran)
                _buildTopBar(classData, availableSections.toList(), relevantMistakes.length, isDarkMode),

                // Quran page (fills all space)
                Expanded(
                  key: TourService.quranPageKey,
                  child: currentAssignment != null
                      ? _buildSwipeableMushafPage(firstPage, lastPage, totalPagesInRange, mistakesAsync, currentAssignment, isDarkMode, ref)
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

  // ==================== TOP BAR ====================

  Widget _buildTopBar(ClassSession classData, List<String> sections, int mistakeCount, bool isDarkMode) {
    final sectionColor = AppColors.getSectionColor(_activeSection);
    final sectionLabel = AppConstants.sectionLabels[_activeSection] ?? _activeSection;

    return Container(
      key: TourService.sectionTabsKey,
      padding: const EdgeInsets.only(left: 4, right: 8, top: 4, bottom: 6),
      decoration: BoxDecoration(
        color: isDarkMode ? const Color(0xFF1A1A2E) : AppColors.surface(false),
        border: Border(
          bottom: BorderSide(
            color: isDarkMode ? Colors.white12 : AppColors.border(false),
          ),
        ),
      ),
      child: Row(
        children: [
          // Back arrow
          IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.arrow_back_rounded, size: 22),
            color: AppColors.text(isDarkMode),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
          ),

          // Date info
          Expanded(
            child: Text(
              '${classData.day}, ${classData.date}',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.text(isDarkMode),
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),

          const SizedBox(width: 6),

          // Active section pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: sectionColor.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: sectionColor.withOpacity(0.5)),
            ),
            child: Text(
              sectionLabel,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: sectionColor,
              ),
            ),
          ),

          const SizedBox(width: 6),

          // Mistake count badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: mistakeCount == 0
                  ? AppColors.emerald500.withOpacity(0.2)
                  : AppColors.mistake1.withOpacity(0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '$mistakeCount',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: mistakeCount == 0 ? AppColors.emerald400 : AppColors.mistake1,
              ),
            ),
          ),

          const SizedBox(width: 4),

          // Settings gear icon
          IconButton(
            key: TourService.classroomSettingsKey,
            onPressed: () {
              if (TourService.isTourActive) {
                TourService.completeInteraction();
              }
              _overlayTimer?.cancel();
              _showSettingsSheet(context);
            },
            icon: const Icon(Icons.settings_rounded, size: 22),
            color: AppColors.textSecondary(isDarkMode),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
          ),
        ],
      ),
    );
  }

  // ==================== BOTTOM OVERLAY ====================

  Widget _buildBottomOverlay(int firstPage, int lastPage, bool isDarkMode) {
    final totalPagesInRange = lastPage - firstPage + 1;
    final pageInRange = _currentPage - firstPage + 1;
    final surahsOnPage = getSurahsOnPage(_currentPage);

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).padding.bottom + 8,
          left: 8,
          right: 8,
          top: 16,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [
              Colors.black.withOpacity(0.7),
              Colors.black.withOpacity(0.0),
            ],
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Next page (higher page number) — RTL: left arrow goes forward
            IconButton(
              icon: const Icon(Icons.chevron_left, size: 28),
              color: Colors.white70,
              onPressed: _currentPage < lastPage
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

            // Page counter (tappable for jump dialog)
            GestureDetector(
              onTap: () {
                _overlayTimer?.cancel();
                _showJumpDialog(isDarkMode, firstPage, lastPage);
              },
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '$pageInRange / $totalPagesInRange  (p. $_currentPage)',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                  if (surahsOnPage.isNotEmpty)
                    Text(
                      surahsOnPage.map((s) => surahNamesArabic[s] ?? '').join(' - '),
                      textDirection: TextDirection.rtl,
                      style: GoogleFonts.amiri(
                        fontSize: 14,
                        color: Colors.white70,
                      ),
                    ),
                ],
              ),
            ),

            // Previous page (lower page number) — RTL: right arrow goes back
            IconButton(
              icon: const Icon(Icons.chevron_right, size: 28),
              color: Colors.white70,
              onPressed: _currentPage > firstPage
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
      ),
    );
  }

  // ==================== JUMP DIALOG ====================

  void _showJumpDialog(bool isDarkMode, int firstPage, int lastPage) {
    _jumpController.text = _currentPage.toString();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface(isDarkMode),
        title: Text(
          'Go to Page',
          style: TextStyle(color: AppColors.text(isDarkMode)),
        ),
        content: TextField(
          controller: _jumpController,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: InputDecoration(
            hintText: '$firstPage-$lastPage',
            hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          style: TextStyle(color: AppColors.text(isDarkMode)),
          onSubmitted: (value) {
            final page = int.tryParse(value);
            if (page != null && page >= firstPage && page <= lastPage) {
              setState(() => _currentPage = page);
              _pageController?.jumpToPage(page - firstPage);
            }
            Navigator.pop(context);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: TextStyle(color: AppColors.textSecondary(isDarkMode))),
          ),
          TextButton(
            onPressed: () {
              final page = int.tryParse(_jumpController.text);
              if (page != null && page >= firstPage && page <= lastPage) {
                setState(() => _currentPage = page);
                _pageController?.jumpToPage(page - firstPage);
              }
              Navigator.pop(context);
            },
            child: Text('Go', style: TextStyle(color: AppColors.primary(isDarkMode))),
          ),
        ],
      ),
    );
  }

  // ==================== SETTINGS SHEET ====================

  void _showSettingsSheet(BuildContext context) {
    final isDarkMode = ref.read(themeProvider);
    final classAsync = ref.read(classFromStringIdProvider(widget.classId));
    final classData = classAsync.value;
    if (classData == null) return;

    final isTeacher = ref.read(authProvider).isTeacher;
    final studentsAsync = isTeacher ? ref.read(teacherStudentsProvider) : null;
    final classStudentsAsync = isTeacher ? ref.watch(classStudentsProvider(widget.classId)) : null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          // Re-read class data to stay in sync
          final freshClassAsync = ref.watch(classFromStringIdProvider(widget.classId));
          final freshClassData = freshClassAsync.value ?? classData;

          final availableSections = <String>{};
          for (final a in freshClassData.assignments) {
            availableSections.add(a.type);
          }

          final sectionAssignments = freshClassData.assignments.where((a) => a.type == _activeSection).toList();

          return DraggableScrollableSheet(
            initialChildSize: 0.6,
            minChildSize: 0.3,
            maxChildSize: 0.85,
            builder: (ctx, scrollController) => Container(
              decoration: BoxDecoration(
                color: AppColors.surface(isDarkMode),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: ListView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  // Handle
                  Center(
                    child: Container(
                      margin: const EdgeInsets.only(top: 12, bottom: 16),
                      width: 40, height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.textMuted(isDarkMode),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),

                  // Title
                  Text(
                    'Classroom Settings',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text(isDarkMode),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Student selector (teacher only) — use class students if available
                  if (isTeacher && studentsAsync != null) ...[
                    _buildStudentSelectorInSheet(
                      classStudentsAsync ?? studentsAsync,
                      studentsAsync,
                      isDarkMode,
                      setSheetState,
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Section tabs
                  Text(
                    'Section',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary(isDarkMode),
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildSectionTabsInSheet(availableSections.toList(), freshClassData.assignments, isDarkMode, setSheetState),
                  const SizedBox(height: 16),

                  // Portion selector
                  Text(
                    'Portion',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary(isDarkMode),
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildPortionSelectorInSheet(sectionAssignments, isDarkMode, isTeacher, setSheetState),
                  const SizedBox(height: 16),

                  // Performance & Notes (teacher only)
                  if (isTeacher && freshClassData.id != null) ...[
                    _buildPerformanceInSheet(freshClassData, isDarkMode),
                    const SizedBox(height: 12),
                    _buildNotesButtonInSheet(freshClassData, isDarkMode),
                    const SizedBox(height: 16),
                  ],

                  // Legend
                  Text(
                    'Mistake Legend',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary(isDarkMode),
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildLegend(isDarkMode),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStudentSelectorInSheet(
    AsyncValue<List<({String id, String name})>> classStudentsAsync,
    AsyncValue<List<({String id, String name})>> allStudentsAsync,
    bool isDarkMode,
    StateSetter setSheetState,
  ) {
    return classStudentsAsync.when(
      data: (classStudents) {
        // If class has exactly 1 enrolled student, show static label (no dropdown)
        if (classStudents.length == 1) {
          return Row(
            children: [
              Text('Student: ', style: TextStyle(fontSize: 13, color: AppColors.textSecondary(isDarkMode))),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary(isDarkMode).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.primary(isDarkMode).withOpacity(0.3)),
                  ),
                  child: Text(
                    classStudents.first.name,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primary(isDarkMode)),
                  ),
                ),
              ),
            ],
          );
        }

        // Multiple enrolled students — show pill buttons
        final students = classStudents.isNotEmpty
            ? classStudents
            : (allStudentsAsync.valueOrNull ?? <({String id, String name})>[]);
        if (students.isEmpty) return const SizedBox.shrink();

        return Row(
          children: [
            Text('Student: ', style: TextStyle(fontSize: 13, color: AppColors.textSecondary(isDarkMode))),
            const SizedBox(width: 8),
            Expanded(
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: students.map((s) {
                    final isActive = _selectedStudentId == s.id;
                    final firstName = s.name.trim().split(' ').first;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _selectedStudentId = s.id);
                          setSheetState(() {});
                          ref.read(mistakesProvider.notifier).setStudentId(s.id);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: isActive
                                ? const Color(0xFF3B82F6)
                                : isDarkMode
                                    ? AppColors.slate700
                                    : AppColors.slate200,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            firstName,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: isActive
                                  ? Colors.white
                                  : isDarkMode
                                      ? AppColors.slate300
                                      : AppColors.slate700,
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildSectionTabsInSheet(List<String> sections, List<Assignment> allAssignments, bool isDarkMode, StateSetter setSheetState) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: sections.map((type) {
          final isSelected = _activeSection == type;
          final count = allAssignments.where((a) => a.type == type).length;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _activeSection = type;
                  _selectedPortionIndex = 0;
                  _currentPage = 0; // reset so it re-initializes
                });
                setSheetState(() {});
              },
              child: SectionTab(
                type: type,
                label: AppConstants.sectionLabels[type] ?? type,
                portionCount: count,
                isSelected: isSelected,
                onTap: () {
                  setState(() {
                    _activeSection = type;
                    _selectedPortionIndex = 0;
                    _currentPage = 0;
                  });
                  setSheetState(() {});
                },
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildPortionSelectorInSheet(List<Assignment> assignments, bool isDarkMode, bool isTeacher, StateSetter setSheetState) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          ...assignments.asMap().entries.map((entry) {
            final index = entry.key;
            final assignment = entry.value;
            final isSelected = _selectedPortionIndex == index;
            final color = AppColors.getSectionColor(assignment.type);

            final label = AppConstants.formatPortionLabel(
              startSurah: assignment.startSurah,
              endSurah: assignment.endSurah,
              startAyah: assignment.startAyah,
              endAyah: assignment.endAyah,
            );

            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedPortionIndex = index;
                        _currentPage = 0;
                      });
                      setSheetState(() {});
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? color.withOpacity(0.2) : AppColors.background(isDarkMode),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isSelected ? color.withOpacity(0.5) : AppColors.border(isDarkMode),
                        ),
                      ),
                      child: Text(
                        assignments.length > 1 ? 'Portion ${index + 1}: $label' : label,
                        style: TextStyle(
                          fontSize: 13,
                          color: isSelected ? color : AppColors.textSecondary(isDarkMode),
                        ),
                      ),
                    ),
                  ),
                  if (isTeacher) ...[
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: () => _showEditPortionSheet(context, assignment),
                      child: Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(
                          color: AppColors.background(isDarkMode),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.edit, size: 16, color: AppColors.textSecondary(isDarkMode)),
                      ),
                    ),
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: () => _confirmDeletePortion(context, assignment, assignments),
                      child: Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(
                          color: AppColors.background(isDarkMode),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(Icons.delete_outline, size: 16, color: Colors.red.withOpacity(0.6)),
                      ),
                    ),
                  ],
                ],
              ),
            );
          }),
          // Add portion button (teacher only)
          if (isTeacher)
            GestureDetector(
              onTap: () => _showAddPortionSheet(context),
              child: Container(
                width: 36, height: 36,
                decoration: BoxDecoration(
                  color: AppColors.cyan500.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.cyan500.withOpacity(0.3)),
                ),
                child: Icon(Icons.add, size: 20, color: AppColors.cyan500),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPerformanceInSheet(ClassSession classData, bool isDarkMode) {
    final performance = classData.performance;

    return Container(
      key: TourService.performanceDropdownKey,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: _getPerformanceColor(performance).withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _getPerformanceColor(performance).withOpacity(0.3)),
      ),
      child: DropdownButton<String?>(
        value: performance,
        isExpanded: true,
        isDense: true,
        underline: const SizedBox.shrink(),
        dropdownColor: AppColors.surface(isDarkMode),
        hint: Text(
          'Rate performance...',
          style: TextStyle(fontSize: 13, color: AppColors.textMuted(isDarkMode)),
        ),
        style: TextStyle(fontSize: 13, color: AppColors.text(isDarkMode)),
        items: [
          DropdownMenuItem<String?>(
            value: null,
            child: Text('Not rated', style: TextStyle(color: AppColors.textMuted(isDarkMode))),
          ),
          ...['Excellent', 'Very Good', 'Good', 'Needs Work'].map((p) =>
            DropdownMenuItem<String?>(
              value: p,
              child: Row(
                children: [
                  Container(
                    width: 8, height: 8,
                    decoration: BoxDecoration(color: _getPerformanceColor(p), shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 6),
                  Text(p),
                ],
              ),
            ),
          ),
        ],
        onChanged: (value) {
          final classId = classData.id;
          if (classId != null) {
            ref.read(classesProvider.notifier).updatePerformance(classId, value);
          }
          if (TourService.isTourActive) {
            TourService.completeInteraction();
          }
        },
      ),
    );
  }

  Widget _buildNotesButtonInSheet(ClassSession classData, bool isDarkMode) {
    final hasNotes = classData.notes?.isNotEmpty == true;

    return GestureDetector(
      key: TourService.notesButtonKey,
      onTap: () {
        if (TourService.isTourActive) {
          TourService.completeInteraction();
        }
        _showNotesSheet(context, classData, isDarkMode);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: hasNotes ? AppColors.cyan500.withOpacity(0.12) : AppColors.background(isDarkMode),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: hasNotes ? AppColors.cyan500.withOpacity(0.3) : AppColors.border(isDarkMode),
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.note_alt_outlined,
              size: 18,
              color: hasNotes ? AppColors.cyan500 : AppColors.textSecondary(isDarkMode),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                hasNotes ? 'View/Edit Notes' : 'Add Notes',
                style: TextStyle(
                  fontSize: 14,
                  color: hasNotes ? AppColors.cyan500 : AppColors.textSecondary(isDarkMode),
                ),
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textMuted(isDarkMode),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegend(bool isDarkMode) {
    return Row(
      children: [
        _buildLegendItem('1x', AppColors.mistake1, isDarkMode),
        const SizedBox(width: 12),
        _buildLegendItem('2x', AppColors.mistake2, isDarkMode),
        const SizedBox(width: 12),
        _buildLegendItem('3x', AppColors.mistake3, isDarkMode),
        const SizedBox(width: 12),
        _buildLegendItem('4x', AppColors.mistake4, isDarkMode),
        const SizedBox(width: 12),
        _buildLegendItem('5+', AppColors.mistake5, isDarkMode),
      ],
    );
  }

  Widget _buildLegendItem(String label, Color color, bool isDarkMode) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16, height: 16,
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

  Color _getPerformanceColor(String? performance) {
    switch (performance) {
      case 'Excellent': return AppColors.cyan500;
      case 'Very Good': return const Color(0xFF14B8A6); // teal-500
      case 'Good': return const Color(0xFFF59E0B); // amber-500
      case 'Needs Work': return const Color(0xFFEF4444); // red-500
      default: return Colors.grey;
    }
  }

  // ==================== MUSHAF / PAGE VIEW ====================

  Widget _buildSwipeableMushafPage(
    int firstPage,
    int lastPage,
    int totalPagesInRange,
    AsyncValue<List<Mistake>> mistakesAsync,
    Assignment? assignment,
    bool isDarkMode,
    WidgetRef ref,
  ) {
    return PageView.builder(
      key: ValueKey('$_activeSection-$_selectedPortionIndex'),
      controller: _pageController,
      reverse: true, // RTL: swipe left = next page (higher number)
      itemCount: totalPagesInRange,
      onPageChanged: (index) {
        setState(() => _currentPage = firstPage + index);
      },
      itemBuilder: (context, index) {
        final pageNum = firstPage + index;
        return _buildScrollablePage(pageNum, mistakesAsync, assignment, isDarkMode, ref, firstPage: firstPage);
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
    WidgetRef ref, {
    int? firstPage,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          child: Column(
            children: [
              // Mushaf page takes full available height
              SizedBox(
                height: constraints.maxHeight,
                child: _buildMushafPage(pageNum, mistakesAsync, isDarkMode, assignment),
              ),
              // Mistakes summary below (scroll down to see)
              Container(
                key: TourService.mistakesAreaKey,
                child: _buildMistakesSummary(mistakesAsync, assignment, isDarkMode, ref, _currentPage, firstPage: firstPage),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildMushafPage(int pageNum, AsyncValue<List<Mistake>> mistakesAsync, bool isDarkMode, [Assignment? assignment]) {
    final pageDataAsync = ref.watch(quranPageDataProvider(pageNum));
    final fontReadyAsync = ref.watch(fontReadyProvider(pageNum));
    final mistakes = mistakesAsync.value ?? [];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      child: pageDataAsync.when(
        data: (pageData) => fontReadyAsync.when(
          data: (_) => MushafPageWidget(
            pageNumber: pageNum,
            pageData: pageData,
            isDarkMode: isDarkMode,
            mistakes: mistakes,
            startSurah: assignment?.startSurah,
            endSurah: assignment?.endSurah,
            startAyah: assignment?.startAyah,
            endAyah: assignment?.endAyah,
            highlightedWordKey: _highlightedWordKey,
            onWordTap: (word) => _showWordPopup(context, word),
            onWordLongPress: (word) => _removeMistake(word, mistakes),
          ),
          loading: () => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 24, height: 24,
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
            startSurah: assignment?.startSurah,
            endSurah: assignment?.endSurah,
            startAyah: assignment?.startAyah,
            endAyah: assignment?.endAyah,
            highlightedWordKey: _highlightedWordKey,
            onWordTap: (word) => _showWordPopup(context, word),
            onWordLongPress: (word) => _removeMistake(word, mistakes),
          ),
        ),
        loading: () => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SizedBox(
                width: 24, height: 24,
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

  // ==================== MISTAKES SUMMARY ====================

  Widget _buildMistakesSummary(
    AsyncValue<List<Mistake>> mistakesAsync,
    Assignment? assignment,
    bool isDarkMode,
    WidgetRef ref,
    int currentPage, {
    int? firstPage,
  }) {
    if (assignment == null) return const SizedBox.shrink();

    final mistakes = mistakesAsync.value ?? [];
    final relevantMistakes = _getMistakesForAssignment(mistakes, assignment);

    // Get mistake IDs belonging to this class
    final classMistakeIdsAsync = ref.watch(classMistakeIdsProvider(widget.classId));
    final classMistakeIds = classMistakeIdsAsync.valueOrNull ?? <String>{};

    // This class mistakes
    final allThisClassMistakes = <Mistake>[];
    for (final m in relevantMistakes) {
      final mistakeKey = m.supabaseId ?? '';
      if (classMistakeIds.contains(mistakeKey)) {
        allThisClassMistakes.add(m);
      }
    }

    // Filter by current page if toggle is on
    final thisClassMistakes = _showPageOnly && currentPage > 0
        ? allThisClassMistakes.where((m) => getPageNumber(m.surahNumber, m.ayahNumber) == currentPage).toList()
        : allThisClassMistakes;

    // Previous class mistake groups
    final prevGroupsAsync = ref.watch(previousClassMistakesProvider(widget.classId));
    final allPrevGroups = prevGroupsAsync.valueOrNull ?? [];
    // Filter each group's mistakes to this assignment's range + page filter
    final prevGroups = allPrevGroups
        .map((g) {
          var filtered = g.mistakes.where((m) => _isMistakeInAssignment(m.surahNumber, m.ayahNumber, assignment));
          if (_showPageOnly && currentPage > 0) {
            filtered = filtered.where((m) => getPageNumber(m.surahNumber, m.ayahNumber) == currentPage);
          }
          return PreviousClassMistakeGroup(
            classDate: g.classDate,
            classDay: g.classDay,
            mistakes: filtered.toList(),
          );
        })
        .where((g) => g.mistakes.isNotEmpty)
        .toList();

    final hasPrevMistakes = prevGroups.any((g) => g.mistakes.isNotEmpty);

    if (allThisClassMistakes.isEmpty && !hasPrevMistakes) {
      return const SizedBox.shrink();
    }

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
          // Header row with toggle
          Row(
            children: [
              Text(
                'MISTAKES IN THIS CLASS (${thisClassMistakes.length})',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.5,
                  color: AppColors.textSecondary(isDarkMode),
                ),
              ),
              const Spacer(),
              // Page / All toggle
              Container(
                decoration: BoxDecoration(
                  color: isDarkMode ? Colors.white.withOpacity(0.06) : Colors.black.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildToggleChip('All', !_showPageOnly, isDarkMode, () {
                      setState(() => _showPageOnly = false);
                      if (TourService.isTourActive) {
                        TourService.completeInteraction();
                      }
                    }, key: TourService.pageAllToggleKey),
                    _buildToggleChip('Page', _showPageOnly, isDarkMode, () {
                      setState(() => _showPageOnly = true);
                      if (TourService.isTourActive) {
                        TourService.completeInteraction();
                      }
                    }),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (thisClassMistakes.isEmpty)
            Text(
              _showPageOnly ? 'No mistakes on this page' : 'No mistakes in this class',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted(isDarkMode)),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: thisClassMistakes.map((m) => _MistakeBadgeWidget(
                errorCount: m.errorCount,
                wordText: m.wordText,
                location: '${m.ayahNumber}:${m.wordIndex + 1}',
                onTap: () => _flashWord(m.surahNumber, m.ayahNumber, m.wordIndex, firstPage: firstPage),
              )).toList(),
            ),

          // Previous class mistakes — grouped by class
          for (final group in prevGroups) ...[
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.only(left: 10),
              decoration: BoxDecoration(
                border: Border(left: BorderSide(
                  color: isDarkMode ? const Color(0x55F59E0B) : const Color(0xFFFDE68A),
                  width: 2,
                )),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${group.classDay.toUpperCase()} — ${_formatShortDate(group.classDate)}',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.3,
                      color: isDarkMode ? const Color(0xFFFCD34D).withOpacity(0.8) : const Color(0xFFD97706),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: group.mistakes.map((m) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: isDarkMode
                            ? const Color(0x1AF59E0B)
                            : const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDarkMode
                              ? const Color(0x33F59E0B)
                              : const Color(0xFFFDE68A),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFBBF24).withOpacity(0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${m.errorCount}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFFBBF24),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            m.wordText,
                            style: TextStyle(
                              fontSize: 14,
                              fontFamily: 'Uthmanic',
                              color: isDarkMode ? const Color(0xFFFCD34D) : const Color(0xFFD97706),
                            ),
                            textDirection: TextDirection.rtl,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${m.ayahNumber}:${m.wordIndex + 1}',
                            style: TextStyle(
                              fontSize: 10,
                              color: isDarkMode
                                  ? const Color(0xFFFCD34D).withOpacity(0.7)
                                  : const Color(0xFFD97706).withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    )).toList(),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildToggleChip(String label, bool isActive, bool isDarkMode, VoidCallback onTap, {Key? key}) {
    return GestureDetector(
      key: key,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isActive
              ? (isDarkMode ? AppColors.cyan600.withOpacity(0.2) : AppColors.cyan600.withOpacity(0.1))
              : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
            color: isActive
                ? AppColors.cyan600
                : AppColors.textMuted(isDarkMode),
          ),
        ),
      ),
    );
  }

  // ==================== HELPER METHODS ====================

  bool _isMistakeInAssignment(int surahNumber, int ayahNumber, Assignment assignment) {
    if (surahNumber < assignment.startSurah || surahNumber > assignment.endSurah) {
      return false;
    }
    if (assignment.startSurah == assignment.endSurah && assignment.hasAyahRange) {
      return ayahNumber >= assignment.startAyah! && ayahNumber <= assignment.endAyah!;
    }
    if (surahNumber == assignment.startSurah && assignment.startAyah != null) {
      if (ayahNumber < assignment.startAyah!) return false;
    }
    if (surahNumber == assignment.endSurah && assignment.endAyah != null) {
      if (ayahNumber > assignment.endAyah!) return false;
    }
    return true;
  }

  String _formatShortDate(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      final month = int.parse(parts[1]);
      final day = int.parse(parts[2]);
      const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      final year = parts[0];
      return '${months[month]} $day, $year';
    } catch (_) {
      return dateStr;
    }
  }

  List<Mistake> _getMistakesForAssignment(List<Mistake> allMistakes, Assignment? assignment) {
    if (assignment == null) return [];

    return allMistakes.where((m) {
      if (m.surahNumber < assignment.startSurah || m.surahNumber > assignment.endSurah) {
        return false;
      }
      if (assignment.startSurah == assignment.endSurah && assignment.hasAyahRange) {
        return m.ayahNumber >= assignment.startAyah! && m.ayahNumber <= assignment.endAyah!;
      }
      if (m.surahNumber == assignment.startSurah && assignment.startAyah != null) {
        if (m.ayahNumber < assignment.startAyah!) return false;
      }
      if (m.surahNumber == assignment.endSurah && assignment.endAyah != null) {
        if (m.ayahNumber > assignment.endAyah!) return false;
      }
      return true;
    }).toList();
  }

  // ==================== WORD POPUP / MISTAKES ====================

  void _showWordPopup(BuildContext context, QuranPageWord word) {
    if (TourService.isTourActive) {
      TourService.completeInteraction();
    }
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => WordPopup(
        word: word.textUthmani,
        onSelectWhole: () {
          if (TourService.isTourActive) {
            TourService.completeInteraction();
          }
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: word.surah,
            ayahNumber: word.ayah,
            wordIndex: word.word - 1,
            wordText: word.textUthmani,
            classId: int.tryParse(widget.classId),
            classIdString: widget.classId,
            studentId: _selectedStudentId,
          );
          Navigator.pop(ctx);
        },
        onSelectChar: (charIndex, charText) {
          if (TourService.isTourActive) {
            TourService.completeInteraction();
          }
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: word.surah,
            ayahNumber: word.ayah,
            wordIndex: word.word - 1,
            wordText: charText,
            charIndex: charIndex,
            classId: int.tryParse(widget.classId),
            classIdString: widget.classId,
            studentId: _selectedStudentId,
          );
          Navigator.pop(ctx);
        },
      ),
    );
  }

  void _removeMistake(QuranPageWord word, List<Mistake> mistakes) {
    final wordIndex = word.word - 1;
    final wordMistakes = mistakes.where((m) =>
      m.surahNumber == word.surah &&
      m.ayahNumber == word.ayah &&
      m.wordIndex == wordIndex
    ).toList();

    if (wordMistakes.isEmpty) return;

    if (wordMistakes.length == 1) {
      ref.read(mistakesProvider.notifier).removeMistake(wordMistakes.first.id!);
      return;
    }

    final isDarkMode = ref.read(themeProvider);
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface(isDarkMode),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: AppColors.textMuted(isDarkMode),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Remove Mistake',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.text(isDarkMode),
              ),
            ),
            const SizedBox(height: 16),
            ...wordMistakes.map((m) {
              final label = m.isCharacterLevel
                  ? 'Character: "${m.wordText}" (index ${m.charIndex})'
                  : 'Whole word: "${m.wordText}"';
              return ListTile(
                leading: Icon(
                  m.isCharacterLevel ? Icons.text_fields : Icons.select_all,
                  color: AppColors.getMistakeColor(m.severityLevel),
                ),
                title: Text(label, style: TextStyle(color: AppColors.text(isDarkMode))),
                subtitle: Text(
                  '${m.errorCount}x error',
                  style: TextStyle(fontSize: 12, color: AppColors.textSecondary(isDarkMode)),
                ),
                onTap: () {
                  ref.read(mistakesProvider.notifier).removeMistake(m.id!);
                  Navigator.pop(ctx);
                },
              );
            }),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  for (final m in wordMistakes) {
                    ref.read(mistakesProvider.notifier).removeMistake(m.id!);
                  }
                  Navigator.pop(ctx);
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: BorderSide(color: AppColors.error.withOpacity(0.3)),
                ),
                child: const Text('Remove All Mistakes on This Word'),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: TextStyle(color: AppColors.textSecondary(isDarkMode))),
            ),
            SizedBox(height: MediaQuery.of(ctx).padding.bottom),
          ],
        ),
      ),
    );
  }

  // ==================== NOTES SHEET ====================

  void _showNotesSheet(BuildContext context, ClassSession classData, bool isDarkMode) {
    final controller = TextEditingController(text: classData.notes ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          left: 20, right: 20, top: 20,
        ),
        decoration: BoxDecoration(
          color: AppColors.surface(isDarkMode),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: AppColors.textMuted(isDarkMode),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Class Notes',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.text(isDarkMode),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              key: TourService.notesTextareaKey,
              controller: controller,
              maxLines: 5,
              onChanged: (_) {
                if (TourService.isTourActive) {
                  TourService.completeInteraction();
                }
              },
              style: TextStyle(fontSize: 14, color: AppColors.text(isDarkMode)),
              decoration: InputDecoration(
                hintText: 'Add notes about this class session...',
                hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
                filled: true,
                fillColor: AppColors.background(isDarkMode),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.border(isDarkMode)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide(color: AppColors.border(isDarkMode)),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: BorderSide(color: AppColors.textMuted(isDarkMode)),
                    ),
                    child: Text('Cancel', style: TextStyle(color: AppColors.text(isDarkMode))),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    key: TourService.saveNotesKey,
                    onPressed: () {
                      if (TourService.isTourActive) {
                        TourService.completeInteraction();
                      }
                      final classId = classData.id;
                      if (classId != null) {
                        final text = controller.text.trim();
                        ref.read(classesProvider.notifier).updateNotes(
                          classId,
                          text.isEmpty ? null : text,
                        );
                      }
                      Navigator.pop(ctx);
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: AppColors.cyan500,
                    ),
                    child: const Text('Save Notes'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ==================== EDIT/ADD/DELETE PORTION SHEETS ====================

  void _showAddPortionSheet(BuildContext context) {
    final isDarkMode = ref.read(themeProvider);
    final surahsAsync = ref.read(surahListProvider);
    final surahs = surahsAsync.value ?? [];

    int startSurah = 1;
    int endSurah = 1;
    int? startAyah;
    int? endAyah;
    String mode = 'surah'; // 'surah', 'page', 'juz'
    int? startPage;
    int? endPage;
    int? selectedJuz;

    _showPortionSheet(
      context: context,
      title: 'Add Portion ($_activeSection)',
      isDarkMode: isDarkMode,
      surahs: surahs,
      getStartSurah: () => startSurah,
      getEndSurah: () => endSurah,
      getStartAyah: () => startAyah,
      getEndAyah: () => endAyah,
      getMode: () => mode,
      getStartPage: () => startPage,
      getEndPage: () => endPage,
      getSelectedJuz: () => selectedJuz,
      setStartSurah: (v) => startSurah = v,
      setEndSurah: (v) => endSurah = v,
      setStartAyah: (v) => startAyah = v,
      setEndAyah: (v) => endAyah = v,
      setMode: (v) => mode = v,
      setStartPage: (v) => startPage = v,
      setEndPage: (v) => endPage = v,
      setSelectedJuz: (v) => selectedJuz = v,
      actionLabel: 'Add Portion',
      onSubmit: () async {
        await ref.read(classesProvider.notifier).addAssignment(
          classId: widget.classId,
          type: _activeSection,
          startSurah: startSurah,
          endSurah: endSurah,
          startAyah: startAyah,
          endAyah: endAyah,
        );
      },
    );
  }

  void _showEditPortionSheet(BuildContext context, Assignment assignment) {
    final isDarkMode = ref.read(themeProvider);
    final surahsAsync = ref.read(surahListProvider);
    final surahs = surahsAsync.value ?? [];

    int startSurah = assignment.startSurah;
    int endSurah = assignment.endSurah;
    int? startAyah = assignment.startAyah;
    int? endAyah = assignment.endAyah;
    String mode = 'surah';
    int? startPage;
    int? endPage;
    int? selectedJuz;

    _showPortionSheet(
      context: context,
      title: 'Edit Portion',
      isDarkMode: isDarkMode,
      surahs: surahs,
      getStartSurah: () => startSurah,
      getEndSurah: () => endSurah,
      getStartAyah: () => startAyah,
      getEndAyah: () => endAyah,
      getMode: () => mode,
      getStartPage: () => startPage,
      getEndPage: () => endPage,
      getSelectedJuz: () => selectedJuz,
      setStartSurah: (v) => startSurah = v,
      setEndSurah: (v) => endSurah = v,
      setStartAyah: (v) => startAyah = v,
      setEndAyah: (v) => endAyah = v,
      setMode: (v) => mode = v,
      setStartPage: (v) => startPage = v,
      setEndPage: (v) => endPage = v,
      setSelectedJuz: (v) => selectedJuz = v,
      actionLabel: 'Update',
      onSubmit: () async {
        final assignmentId = assignment.supabaseId ?? assignment.id.toString();
        await ref.read(classesProvider.notifier).updateAssignment(
          assignmentId: assignmentId,
          data: {
            'start_surah': startSurah,
            'end_surah': endSurah,
            'start_ayah': startAyah,
            'end_ayah': endAyah,
          },
        );
      },
    );
  }

  /// Shared bottom sheet for Add/Edit portion with By Page / By Surah / By Juz modes.
  void _showPortionSheet({
    required BuildContext context,
    required String title,
    required bool isDarkMode,
    required List surahs,
    required int Function() getStartSurah,
    required int Function() getEndSurah,
    required int? Function() getStartAyah,
    required int? Function() getEndAyah,
    required String Function() getMode,
    required int? Function() getStartPage,
    required int? Function() getEndPage,
    required int? Function() getSelectedJuz,
    required void Function(int) setStartSurah,
    required void Function(int) setEndSurah,
    required void Function(int?) setStartAyah,
    required void Function(int?) setEndAyah,
    required void Function(String) setMode,
    required void Function(int?) setStartPage,
    required void Function(int?) setEndPage,
    required void Function(int?) setSelectedJuz,
    required String actionLabel,
    required Future<void> Function() onSubmit,
  }) {
    final color = AppColors.getSectionColor(_activeSection);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          final mode = getMode();
          final isPageMode = mode == 'page';
          final isJuzMode = mode == 'juz';
          final isSurahMode = mode == 'surah';

          return Container(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              left: 20, right: 20, top: 20,
            ),
            decoration: BoxDecoration(
              color: AppColors.surface(isDarkMode),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40, height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.textMuted(isDarkMode),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text(isDarkMode),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Mode selector: By Page / By Surah / By Juz
                  Row(
                    children: [
                      _buildModeChip('By Page', isPageMode, color, isDarkMode,
                        () => setSheetState(() {
                          setMode('page');
                          setStartPage(getPageForSurah(getStartSurah()));
                          setEndPage(getLastPageForSurah(getEndSurah()));
                          setStartAyah(null);
                          setEndAyah(null);
                        }),
                      ),
                      const SizedBox(width: 8),
                      _buildModeChip('By Surah', isSurahMode, color, isDarkMode,
                        () => setSheetState(() => setMode('surah')),
                      ),
                      const SizedBox(width: 8),
                      _buildModeChip('By Juz', isJuzMode, color, isDarkMode,
                        () => setSheetState(() => setMode('juz')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Page inputs (shown when mode == 'page')
                  if (isPageMode) ...[
                    Row(
                      children: [
                        Expanded(
                          child: _buildSheetAyahInput(
                            'From Page', getStartPage(), isDarkMode,
                            (v) => setSheetState(() {
                              setStartPage(v);
                              if (v != null && v >= 1 && v <= totalPages) {
                                setStartSurah(pageStarts[v - 1][0]);
                                if (getEndPage() != null && getEndPage()! < v) {
                                  setEndPage(v);
                                  setEndSurah(pageStarts[v - 1][0]);
                                }
                              }
                            }),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildSheetAyahInput(
                            'To Page', getEndPage(), isDarkMode,
                            (v) => setSheetState(() {
                              setEndPage(v);
                              if (v != null && v >= 1 && v <= totalPages) {
                                setEndSurah(pageStarts[v - 1][0]);
                              }
                            }),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                  ],

                  // Juz dropdown (shown when mode == 'juz')
                  if (isJuzMode) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: AppColors.background(isDarkMode),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.textMuted(isDarkMode)),
                      ),
                      child: DropdownButton<int>(
                        value: getSelectedJuz(),
                        hint: Text('Select Juz', style: TextStyle(color: AppColors.textMuted(isDarkMode))),
                        isExpanded: true,
                        dropdownColor: AppColors.surface(isDarkMode),
                        underline: const SizedBox(),
                        style: TextStyle(fontSize: 13, color: AppColors.text(isDarkMode)),
                        items: List.generate(30, (i) => DropdownMenuItem(
                          value: i + 1,
                          child: Text('Juz ${i + 1}'),
                        )),
                        onChanged: (juz) {
                          if (juz == null) return;
                          final boundary = getJuzBoundary(juz);
                          if (boundary != null) {
                            setSheetState(() {
                              setSelectedJuz(juz);
                              setStartSurah(boundary.startSurah);
                              setEndSurah(boundary.endSurah);
                              setStartAyah(boundary.startAyah);
                              setEndAyah(boundary.endAyah);
                            });
                          }
                        },
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],

                  // Surah dropdowns (always visible, disabled in page/juz mode)
                  Row(
                    children: [
                      Expanded(
                        child: _buildSheetDropdown(
                          'From Surah', getStartSurah(), surahs, isDarkMode,
                          isSurahMode ? (v) => setSheetState(() {
                            setStartSurah(v);
                            if (getEndSurah() < v) setEndSurah(v);
                          }) : null,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildSheetDropdown(
                          'To Surah', getEndSurah(), surahs, isDarkMode,
                          isSurahMode ? (v) => setSheetState(() => setEndSurah(v)) : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Ayah inputs (disabled in page/juz mode)
                  Row(
                    children: [
                      Expanded(
                        child: _buildSheetAyahInput(
                          'From Ayah', getStartAyah(), isDarkMode,
                          isSurahMode ? (v) => setSheetState(() => setStartAyah(v)) : null,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _buildSheetAyahInput(
                          'To Ayah', getEndAyah(), isDarkMode,
                          isSurahMode ? (v) => setSheetState(() => setEndAyah(v)) : null,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Action buttons
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            side: BorderSide(color: AppColors.textMuted(isDarkMode)),
                          ),
                          child: Text('Cancel', style: TextStyle(color: AppColors.text(isDarkMode))),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () async {
                            // If page mode, compute surah/ayah from page range
                            if (isPageMode) {
                              final sp = getStartPage();
                              final ep = getEndPage();
                              if (sp != null && ep != null && sp >= 1 && ep >= 1 && sp <= totalPages && ep <= totalPages) {
                                setStartSurah(pageStarts[sp - 1][0]);
                                setStartAyah(pageStarts[sp - 1][1]);
                                if (ep < totalPages) {
                                  final nextSurah = pageStarts[ep][0];
                                  final nextAyah = pageStarts[ep][1];
                                  if (nextAyah > 1) {
                                    setEndSurah(nextSurah);
                                    setEndAyah(nextAyah - 1);
                                  } else {
                                    setEndSurah(pageStarts[ep - 1][0]);
                                    setEndAyah(null);
                                  }
                                } else {
                                  setEndSurah(114);
                                  setEndAyah(6);
                                }
                              }
                            }
                            await onSubmit();
                            if (ctx.mounted) Navigator.pop(ctx);
                          },
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            backgroundColor: AppColors.cyan500,
                          ),
                          child: Text(actionLabel),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildModeChip(String label, bool isActive, Color color, bool isDarkMode, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? color.withOpacity(0.2) : AppColors.background(isDarkMode),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isActive ? color.withOpacity(0.5) : AppColors.border(isDarkMode),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isActive ? color : AppColors.textSecondary(isDarkMode),
          ),
        ),
      ),
    );
  }

  Widget _buildSheetDropdown(String label, int value, List surahs, bool isDarkMode, Function(int)? onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: AppColors.textMuted(isDarkMode))),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: AppColors.background(isDarkMode),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.textMuted(isDarkMode)),
          ),
          child: DropdownButton<int>(
            value: value,
            isExpanded: true,
            dropdownColor: AppColors.surface(isDarkMode),
            underline: const SizedBox(),
            style: TextStyle(fontSize: 13, color: AppColors.text(isDarkMode)),
            items: surahs.map<DropdownMenuItem<int>>((s) {
              return DropdownMenuItem(
                value: s.number,
                child: Text('${s.number}. ${s.englishName}', overflow: TextOverflow.ellipsis),
              );
            }).toList(),
            onChanged: onChanged != null ? (v) => onChanged(v!) : null,
          ),
        ),
      ],
    );
  }

  Widget _buildSheetAyahInput(String label, int? value, bool isDarkMode, Function(int?)? onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: AppColors.textMuted(isDarkMode))),
        const SizedBox(height: 4),
        TextFormField(
          initialValue: value?.toString() ?? '',
          keyboardType: TextInputType.number,
          style: TextStyle(fontSize: 13, color: AppColors.text(isDarkMode)),
          decoration: InputDecoration(
            hintText: 'All',
            hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            filled: true,
            fillColor: AppColors.background(isDarkMode),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.textMuted(isDarkMode)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.textMuted(isDarkMode)),
            ),
          ),
          enabled: onChanged != null,
          onChanged: onChanged != null ? (v) => onChanged(int.tryParse(v)) : null,
        ),
      ],
    );
  }

  void _confirmDeletePortion(BuildContext context, Assignment assignment, List<Assignment> sectionAssignments) {
    final isDarkMode = ref.read(themeProvider);

    if (sectionAssignments.length <= 1) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot delete the last portion in a section')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface(isDarkMode),
        title: Text('Delete Portion', style: TextStyle(color: AppColors.text(isDarkMode))),
        content: Text(
          'Are you sure you want to delete this portion?',
          style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancel', style: TextStyle(color: AppColors.textSecondary(isDarkMode))),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(classesProvider.notifier).deleteAssignment(
                assignment.supabaseId ?? assignment.id.toString(),
              );
              setState(() => _selectedPortionIndex = 0);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

/// Simple mistake badge widget for the summary section.
class _MistakeBadgeWidget extends StatelessWidget {
  final int errorCount;
  final String wordText;
  final String location;
  final VoidCallback? onTap;

  const _MistakeBadgeWidget({
    required this.errorCount,
    required this.wordText,
    required this.location,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppColors.getMistakeColor(errorCount);

    return GestureDetector(
      onTap: onTap,
      child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              '$errorCount',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            wordText,
            style: TextStyle(
              fontSize: 14,
              fontFamily: 'Uthmanic',
              color: color,
            ),
            textDirection: TextDirection.rtl,
          ),
          const SizedBox(width: 6),
          Text(
            location,
            style: TextStyle(
              fontSize: 10,
              color: color.withOpacity(0.7),
            ),
          ),
        ],
      ),
    ),
    );
  }
}

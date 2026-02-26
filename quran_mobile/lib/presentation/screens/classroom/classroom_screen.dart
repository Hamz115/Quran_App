import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/mushaf_page_widget.dart';
import '../../widgets/section_badge.dart';
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
    final classAsync = ref.watch(classFromStringIdProvider(widget.classId));
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

                // Portion selector (always visible)
                _buildPortionSelector(sectionAssignments, isDarkMode),

                // Performance & Notes (teacher only)
                if (ref.watch(authProvider).isTeacher && classData.id != null)
                  _buildPerformanceAndNotes(classData, isDarkMode),

                // Legend & stats
                _buildInfoBar(mistakesAsync, currentAssignment, isDarkMode),

                // Page navigation
                if (currentAssignment != null)
                  _buildPageNav(_currentPage, firstPage, lastPage, isDarkMode),

                // Mushaf page with swipe (mistakes visible on scroll down)
                Expanded(
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
    final isTeacher = ref.watch(authProvider).isTeacher;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SingleChildScrollView(
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
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: AppColors.surface(isDarkMode).withOpacity(0.5),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(Icons.edit, size: 16, color: AppColors.textSecondary(isDarkMode)),
                        ),
                      ),
                      const SizedBox(width: 4),
                      GestureDetector(
                        onTap: () => _confirmDeletePortion(context, assignment, assignments),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: AppColors.surface(isDarkMode).withOpacity(0.5),
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
                  width: 36,
                  height: 36,
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
      ),
    );
  }

  Widget _buildPerformanceAndNotes(ClassSession classData, bool isDarkMode) {
    final performance = classData.performance;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Row(
        children: [
          // Performance dropdown
          Expanded(
            child: Container(
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
                  style: TextStyle(fontSize: 12, color: AppColors.textMuted(isDarkMode)),
                ),
                style: TextStyle(fontSize: 12, color: AppColors.text(isDarkMode)),
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
                            decoration: BoxDecoration(
                              color: _getPerformanceColor(p),
                              shape: BoxShape.circle,
                            ),
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
                },
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Notes button
          GestureDetector(
            onTap: () => _showNotesSheet(context, classData, isDarkMode),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: (classData.notes?.isNotEmpty == true)
                    ? AppColors.cyan500.withOpacity(0.12)
                    : AppColors.surface(isDarkMode),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: (classData.notes?.isNotEmpty == true)
                      ? AppColors.cyan500.withOpacity(0.3)
                      : AppColors.border(isDarkMode),
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.note_alt_outlined,
                    size: 16,
                    color: (classData.notes?.isNotEmpty == true)
                        ? AppColors.cyan500
                        : AppColors.textSecondary(isDarkMode),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    (classData.notes?.isNotEmpty == true) ? 'Notes' : 'Add Notes',
                    style: TextStyle(
                      fontSize: 12,
                      color: (classData.notes?.isNotEmpty == true)
                          ? AppColors.cyan500
                          : AppColors.textSecondary(isDarkMode),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
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
              controller: controller,
              maxLines: 5,
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
                    onPressed: () {
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

  void _showAddPortionSheet(BuildContext context) {
    final isDarkMode = ref.read(themeProvider);
    final surahsAsync = ref.read(surahListProvider);
    final surahs = surahsAsync.value ?? [];

    int startSurah = 1;
    int endSurah = 1;
    int? startAyah;
    int? endAyah;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          return Container(
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
                  'Add Portion ($_activeSection)',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.text(isDarkMode),
                  ),
                ),
                const SizedBox(height: 16),
                // From Surah / To Surah
                Row(
                  children: [
                    Expanded(
                      child: _buildSheetDropdown(
                        'From Surah', startSurah, surahs, isDarkMode,
                        (v) => setSheetState(() {
                          startSurah = v;
                          if (endSurah < v) endSurah = v;
                        }),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildSheetDropdown(
                        'To Surah', endSurah, surahs, isDarkMode,
                        (v) => setSheetState(() => endSurah = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // From Ayah / To Ayah
                Row(
                  children: [
                    Expanded(
                      child: _buildSheetAyahInput(
                        'From Ayah', startAyah, isDarkMode,
                        (v) => setSheetState(() => startAyah = v),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildSheetAyahInput(
                        'To Ayah', endAyah, isDarkMode,
                        (v) => setSheetState(() => endAyah = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
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
                          await ref.read(classesProvider.notifier).addAssignment(
                            classId: widget.classId,
                            type: _activeSection,
                            startSurah: startSurah,
                            endSurah: endSurah,
                            startAyah: startAyah,
                            endAyah: endAyah,
                          );
                          if (ctx.mounted) Navigator.pop(ctx);
                        },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: AppColors.cyan500,
                        ),
                        child: const Text('Add Portion'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
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
        return _buildScrollablePage(pageNum, mistakesAsync, assignment, isDarkMode, ref);
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
    WidgetRef ref,
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
              _buildMistakesSummary(mistakesAsync, assignment, isDarkMode, ref),
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
    WidgetRef ref,
  ) {
    if (assignment == null) return const SizedBox.shrink();

    final mistakes = mistakesAsync.value ?? [];
    final relevantMistakes = _getMistakesForAssignment(mistakes, assignment);

    // Get mistake IDs belonging to this class
    final classMistakeIdsAsync = ref.watch(classMistakeIdsProvider(widget.classId));
    final classMistakeIds = classMistakeIdsAsync.valueOrNull ?? <String>{};

    // This class mistakes
    final thisClassMistakes = <Mistake>[];
    for (final m in relevantMistakes) {
      final mistakeKey = kIsWeb
          ? (m.supabaseId ?? '')
          : (m.id?.toString() ?? '');
      if (classMistakeIds.contains(mistakeKey)) {
        thisClassMistakes.add(m);
      }
    }

    // Previous class mistakes (only from classes dated BEFORE this one)
    final prevMistakesAsync = ref.watch(previousClassMistakesProvider(widget.classId));
    final allPrevMistakes = prevMistakesAsync.valueOrNull ?? [];
    // Filter to only those within the current assignment's surah/ayah range
    final prevMistakes = allPrevMistakes.where((m) {
      return _isMistakeInAssignment(m.surahNumber, m.ayahNumber, assignment);
    }).toList();

    // Nothing to show at all
    if (thisClassMistakes.isEmpty && prevMistakes.isEmpty) {
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
          // Mistakes in this class (red)
          Text(
            'MISTAKES IN THIS CLASS (${thisClassMistakes.length})',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: AppColors.textSecondary(isDarkMode),
            ),
          ),
          const SizedBox(height: 10),
          if (thisClassMistakes.isEmpty)
            Text(
              'No mistakes in this class',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textMuted(isDarkMode),
              ),
            )
          else
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: thisClassMistakes.map((m) => MistakeBadge(
                errorCount: m.errorCount,
                wordText: m.wordText,
                location: '${m.ayahNumber}:${m.wordIndex + 1}',
              )).toList(),
            ),

          // Mistakes from previous classes (amber, with class date)
          if (prevMistakes.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              'MISTAKES FROM PREVIOUS CLASSES (${prevMistakes.length})',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
                color: AppColors.textSecondary(isDarkMode),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: prevMistakes.map((m) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: isDarkMode
                      ? const Color(0x1AF59E0B) // amber-500/10
                      : const Color(0xFFFFFBEB), // amber-50
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isDarkMode
                        ? const Color(0x33F59E0B) // amber-500/20
                        : const Color(0xFFFDE68A), // amber-200
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
                        color: isDarkMode
                            ? const Color(0xFFFCD34D)
                            : const Color(0xFFD97706),
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
                    const SizedBox(width: 6),
                    // Class date label
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: isDarkMode
                            ? const Color(0x1AF59E0B)
                            : const Color(0xFFFEF3C7), // amber-100
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _formatShortDate(m.classDate),
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w500,
                          color: isDarkMode
                              ? const Color(0xFFFCD34D).withOpacity(0.6)
                              : const Color(0xFFB45309), // amber-700
                        ),
                      ),
                    ),
                  ],
                ),
              )).toList(),
            ),
          ],
        ],
      ),
    );
  }

  /// Check if a mistake (surah/ayah) falls within an assignment's range.
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

  /// Format "2026-02-15" → "Feb 15"
  String _formatShortDate(String dateStr) {
    if (dateStr.isEmpty) return '';
    try {
      final parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      final month = int.parse(parts[1]);
      final day = int.parse(parts[2]);
      const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${months[month]} $day';
    } catch (_) {
      return dateStr;
    }
  }

  void _showWordPopup(BuildContext context, QuranPageWord word) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => WordPopup(
        word: word.textUthmani,
        onSelectWhole: () {
          ref.read(mistakesProvider.notifier).addMistake(
            surahNumber: word.surah,
            ayahNumber: word.ayah,
            wordIndex: word.word - 1, // QPC is 1-based, mistakes are 0-based
            wordText: word.textUthmani,
            classId: int.tryParse(widget.classId),
            classIdString: widget.classId,
            studentId: _selectedStudentId,
          );
          Navigator.pop(ctx);
        },
        onSelectChar: (charIndex, charText) {
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

    // If only one mistake (whole-word or single char), remove it directly
    if (wordMistakes.length == 1) {
      ref.read(mistakesProvider.notifier).removeMistake(wordMistakes.first.id!);
      return;
    }

    // Multiple mistakes on this word — show a picker dialog
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
              width: 40,
              height: 4,
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
            // List each mistake for removal
            ...wordMistakes.map((m) {
              final label = m.isCharacterLevel
                  ? 'Character: "${m.wordText}" (index ${m.charIndex})'
                  : 'Whole word: "${m.wordText}"';
              return ListTile(
                leading: Icon(
                  m.isCharacterLevel ? Icons.text_fields : Icons.select_all,
                  color: AppColors.getMistakeColor(m.severityLevel),
                ),
                title: Text(
                  label,
                  style: TextStyle(color: AppColors.text(isDarkMode)),
                ),
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
            // Remove all option
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

  void _showEditPortionSheet(BuildContext context, Assignment assignment) {
    final isDarkMode = ref.read(themeProvider);
    final surahsAsync = ref.read(surahListProvider);
    final surahs = surahsAsync.value ?? [];

    int startSurah = assignment.startSurah;
    int endSurah = assignment.endSurah;
    int? startAyah = assignment.startAyah;
    int? endAyah = assignment.endAyah;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          return Container(
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
                  'Edit Portion',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.text(isDarkMode),
                  ),
                ),
                const SizedBox(height: 16),
                // From Surah / To Surah
                Row(
                  children: [
                    Expanded(
                      child: _buildSheetDropdown(
                        'From Surah', startSurah, surahs, isDarkMode,
                        (v) => setSheetState(() {
                          startSurah = v;
                          if (endSurah < v) endSurah = v;
                        }),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildSheetDropdown(
                        'To Surah', endSurah, surahs, isDarkMode,
                        (v) => setSheetState(() => endSurah = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // From Ayah / To Ayah
                Row(
                  children: [
                    Expanded(
                      child: _buildSheetAyahInput(
                        'From Ayah', startAyah, isDarkMode,
                        (v) => setSheetState(() => startAyah = v),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildSheetAyahInput(
                        'To Ayah', endAyah, isDarkMode,
                        (v) => setSheetState(() => endAyah = v),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
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
                          final assignmentId = kIsWeb
                              ? assignment.id.toString()
                              : assignment.id.toString();
                          await ref.read(classesProvider.notifier).updateAssignment(
                            assignmentId: assignmentId,
                            data: {
                              'start_surah': startSurah,
                              'end_surah': endSurah,
                              'start_ayah': startAyah,
                              'end_ayah': endAyah,
                            },
                          );
                          if (ctx.mounted) Navigator.pop(ctx);
                        },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          backgroundColor: AppColors.cyan500,
                        ),
                        child: const Text('Update'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSheetDropdown(String label, int value, List surahs, bool isDarkMode, Function(int) onChanged) {
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
            onChanged: (v) => onChanged(v!),
          ),
        ),
      ],
    );
  }

  Widget _buildSheetAyahInput(String label, int? value, bool isDarkMode, Function(int?) onChanged) {
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
          onChanged: (v) => onChanged(int.tryParse(v)),
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
                assignment.id.toString(),
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

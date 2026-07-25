import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_colors.dart';
import '../../providers/providers.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/report_provider.dart';
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/premium_scaffold.dart';
import '../classroom/classroom_screen.dart';
import 'create_class_screen.dart';
import 'report/report_panel.dart';

/// Classes screen — teacher sees student pills + report panel, student sees own report.
/// Mirrors web's TeacherClasses.tsx (Phase 16.2).
class ClassesScreen extends ConsumerStatefulWidget {
  const ClassesScreen({super.key});

  @override
  ConsumerState<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends ConsumerState<ClassesScreen> {
  String? _selectedStudentId;
  int _activeTab = 0; // 0 = Listening, 1 = Reciting

  @override
  Widget build(BuildContext context) {
    final isDarkMode = ref.watch(themeProvider);

    return Scaffold(
      backgroundColor: AppColors.background(isDarkMode),
      body: PremiumScaffoldBackground(
        useSafeArea: false,
        child: Column(
          children: [
            SafeArea(
              bottom: false,
              child: PremiumPageHeader(
                icon: Icons.school_rounded,
                title: 'Sessions',
                subtitle: 'Listening (مستمع) and reciting (قارئ)',
                trailing: _activeTab == 0
                    ? Container(
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.cyan600.withOpacity(
                                isDarkMode ? 0.30 : 0.22,
                              ),
                              blurRadius: 16,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: IconButton(
                          onPressed: () => _showCreateClassSheet(context),
                          icon: const Icon(
                            Icons.add_rounded,
                            color: Colors.white,
                          ),
                          tooltip: 'New Session',
                        ),
                      )
                    : null,
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: AppColors.surface(
                    isDarkMode,
                  ).withOpacity(isDarkMode ? 0.82 : 0.96),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: AppColors.border(isDarkMode).withOpacity(0.75),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _activeTab = 0),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            gradient: _activeTab == 0
                                ? AppColors.primaryGradient
                                : null,
                            color: _activeTab == 0 ? null : Colors.transparent,
                            borderRadius: BorderRadius.circular(15),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Listening (مستمع)',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: _activeTab == 0
                                  ? Colors.white
                                  : isDarkMode
                                  ? AppColors.slate300
                                  : AppColors.slate600,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _activeTab = 1),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            gradient: _activeTab == 1
                                ? const LinearGradient(
                                    colors: [
                                      AppColors.gold,
                                      AppColors.amber500,
                                    ],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  )
                                : null,
                            color: _activeTab == 1 ? null : Colors.transparent,
                            borderRadius: BorderRadius.circular(15),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Reciting (قارئ)',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: _activeTab == 1
                                  ? Colors.white
                                  : isDarkMode
                                  ? AppColors.slate300
                                  : AppColors.slate600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),

            // Tab content
            Expanded(
              child: _activeTab == 0
                  ? _buildListeningContent(isDarkMode)
                  : _buildRecitingContent(isDarkMode),
            ),
          ],
        ),
      ),
    );
  }

  // ============ LISTENING TAB ============

  Widget _buildListeningContent(bool isDarkMode) {
    final studentsAsync = ref.watch(teacherStudentsProvider);

    return studentsAsync.when(
      loading: () =>
          Center(child: CircularProgressIndicator(color: AppColors.cyan500)),
      error: (e, _) => Center(
        child: Text(
          'Error: $e',
          style: const TextStyle(color: AppColors.error),
        ),
      ),
      data: (students) {
        // Auto-select first student if none selected
        if (_selectedStudentId == null && students.isNotEmpty) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted && _selectedStudentId == null) {
              setState(() => _selectedStudentId = students.first.id);
            }
          });
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Student pills
            _buildStudentPills(students, isDarkMode),
            const SizedBox(height: 8),

            // Report panel for selected student
            Expanded(
              child: _selectedStudentId != null
                  ? RefreshIndicator(
                      onRefresh: _onRefresh,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.only(bottom: 24),
                        child: ReportPanel(
                          key: ValueKey(_selectedStudentId),
                          studentId: _selectedStudentId!,
                          onTapClass: (classId) =>
                              _navigateToClass(context, classId),
                          onDeleteClass: (classId) =>
                              _confirmDeleteClass(context, ref, classId),
                        ),
                      ),
                    )
                  : students.isEmpty
                  ? _buildNoStudentsState(isDarkMode)
                  : const SizedBox.shrink(),
            ),
          ],
        );
      },
    );
  }

  // ============ RECITING TAB ============

  Widget _buildRecitingContent(bool isDarkMode) {
    final userId = ref.watch(authProvider).user?.id;
    if (userId == null) {
      return Center(
        child: Text(
          'Not authenticated',
          style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _onRefresh,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        child: ReportPanel(
          key: ValueKey('reciter-$userId'),
          studentId: userId,
          onTapClass: (classId) => _navigateToClass(context, classId),
        ),
      ),
    );
  }

  Widget _buildStudentPills(
    List<({String id, String name})> students,
    bool isDarkMode,
  ) {
    if (students.isEmpty) {
      return _buildNoStudentsState(isDarkMode);
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface(
          isDarkMode,
        ).withOpacity(isDarkMode ? 0.76 : 0.98),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppColors.border(isDarkMode).withOpacity(0.72),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDarkMode ? 0.18 : 0.06),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          Text(
            'Contact',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: isDarkMode ? AppColors.slate400 : AppColors.slate500,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: students.map((s) {
                  final isActive = _selectedStudentId == s.id;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: PremiumPill(
                      label: _getFirstName(s.name),
                      color: AppColors.cyan600,
                      selected: isActive,
                      icon: isActive ? Icons.person_rounded : null,
                      onTap: () => setState(() => _selectedStudentId = s.id),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============ EMPTY STATES ============

  Widget _buildNoStudentsState(bool isDarkMode) {
    return const Center(
      child: PremiumEmptyState(
        icon: Icons.people_outline_rounded,
        title: 'No reciters added yet',
        body:
            'Reciters will appear here after they are added as contacts. Share your user code to get started.',
        color: AppColors.cyan500,
      ),
    );
  }

  // ============ REFRESH ============

  Future<void> _onRefresh() async {
    final user = ref.read(authProvider).user;
    if (user != null) {
      final syncHelper = ref.read(supabaseSyncHelperProvider);
      await syncHelper.pullAll(user.id);
    }
    ref.read(classesProvider.notifier).loadClasses();
    ref.invalidate(teacherStudentsProvider);
    ref.invalidate(enrolledClassesProvider);
    ref.invalidate(studentReportProvider);
  }

  // ============ HELPERS ============

  String _getFirstName(String fullName) {
    final parts = fullName.trim().split(' ');
    return parts.isNotEmpty ? parts.first : fullName;
  }

  void _navigateToClass(BuildContext context, String classId) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ClassroomScreen(classId: classId)),
    );
  }

  void _showCreateClassSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CreateClassScreen(studentId: _selectedStudentId),
    );
  }

  void _confirmDeleteClass(
    BuildContext context,
    WidgetRef ref,
    String classId,
  ) {
    final isDarkMode = ref.read(themeProvider);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface(isDarkMode),
        title: Text(
          'Delete Session',
          style: TextStyle(color: AppColors.text(isDarkMode)),
        ),
        content: Text(
          'Are you sure you want to delete this session? This action cannot be undone.',
          style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text(
              'Cancel',
              style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
            ),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(classesProvider.notifier).deleteClassById(classId);
              // Refresh the report data
              ref.invalidate(studentReportProvider);
            },
            child: const Text(
              'Delete',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );
  }
}

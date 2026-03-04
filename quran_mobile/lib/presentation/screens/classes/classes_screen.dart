import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_colors.dart';
import '../../providers/providers.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../../../data/models/app_user.dart';
import '../../providers/report_provider.dart';
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

  @override
  Widget build(BuildContext context) {
    final isDarkMode = ref.watch(themeProvider);
    final authState = ref.watch(authProvider);
    final viewMode = ref.watch(viewModeProvider);
    final isTeacher = viewMode == UserRole.teacher;

    return Scaffold(
      backgroundColor: AppColors.background(isDarkMode),
      body: SafeArea(
        child: isTeacher
            ? _buildTeacherView(isDarkMode)
            : _buildStudentView(isDarkMode, authState),
      ),
    );
  }

  // ============ TEACHER VIEW ============

  Widget _buildTeacherView(bool isDarkMode) {
    final studentsAsync = ref.watch(teacherStudentsProvider);

    return studentsAsync.when(
      loading: () => Center(
        child: CircularProgressIndicator(color: AppColors.cyan500),
      ),
      error: (e, _) => Center(
        child: Text('Error: $e', style: const TextStyle(color: AppColors.error)),
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
            // Header + New Class button
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Classes',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text(isDarkMode),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () => _showCreateClassSheet(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.cyan500,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.add_rounded, size: 18, color: Colors.white),
                          SizedBox(width: 6),
                          Text(
                            'New Class',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Student pills
            _buildStudentPills(students, isDarkMode),
            const SizedBox(height: 8),

            // Report panel for selected student
            Expanded(
              child: _selectedStudentId != null
                  ? SingleChildScrollView(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: ReportPanel(
                        key: ValueKey(_selectedStudentId),
                        studentId: _selectedStudentId!,
                        onTapClass: (classId) => _navigateToClass(context, classId),
                        onDeleteClass: (classId) => _confirmDeleteClass(context, ref, classId),
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
        color: isDarkMode
            ? AppColors.slate800.withOpacity(0.5)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: isDarkMode
            ? null
            : Border.all(color: AppColors.slate200),
      ),
      child: Row(
        children: [
          Text(
            'Student',
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
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedStudentId = s.id),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: isActive
                              ? const Color(0xFF2563EB) // blue-600
                              : isDarkMode
                                  ? AppColors.slate700
                                  : AppColors.slate200,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: isActive
                              ? [
                                  BoxShadow(
                                    color: const Color(0xFF2563EB).withOpacity(0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                        ),
                        child: Text(
                          _getFirstName(s.name),
                          style: TextStyle(
                            fontSize: 14,
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
      ),
    );
  }

  // ============ STUDENT VIEW ============

  Widget _buildStudentView(bool isDarkMode, AppAuthState authState) {
    final userId = authState.user?.id;
    if (userId == null) {
      return Center(
        child: Text(
          'Not authenticated',
          style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
          child: Text(
            'My Classes',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppColors.text(isDarkMode),
            ),
          ),
        ),
        // Report panel for current student
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(bottom: 24),
            child: ReportPanel(
              studentId: userId,
              onTapClass: (classId) => _navigateToClass(context, classId),
              onDeleteClass: (classId) => _confirmDeleteClass(context, ref, classId),
            ),
          ),
        ),
      ],
    );
  }

  // ============ EMPTY STATES ============

  Widget _buildNoStudentsState(bool isDarkMode) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.surface(isDarkMode),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Icons.people_outline_rounded,
                size: 40,
                color: AppColors.textMuted(isDarkMode),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No students added yet',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: AppColors.text(isDarkMode),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Students will appear here once they join your class.\nShare your teacher ID to get started.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary(isDarkMode),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============ HELPERS ============

  String _getFirstName(String fullName) {
    final parts = fullName.trim().split(' ');
    return parts.isNotEmpty ? parts.first : fullName;
  }

  void _navigateToClass(BuildContext context, String classId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ClassroomScreen(classId: classId),
      ),
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

  void _confirmDeleteClass(BuildContext context, WidgetRef ref, String classId) {
    final isDarkMode = ref.read(themeProvider);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface(isDarkMode),
        title: Text(
          'Delete Class',
          style: TextStyle(color: AppColors.text(isDarkMode)),
        ),
        content: Text(
          'Are you sure you want to delete this class? This action cannot be undone.',
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

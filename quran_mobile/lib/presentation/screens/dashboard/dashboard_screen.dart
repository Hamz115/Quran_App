import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../config/app_colors.dart';
import '../../../config/constants.dart';
import '../../../core/sync/sync_service.dart';
import '../../providers/providers.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/section_badge.dart';
import '../classes/report/report_panel.dart';
import '../classes/create_class_screen.dart';
import '../../../core/services/tour_service.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(statsProvider);
    final topMistakesAsync = ref.watch(topMistakesProvider);
    final mistakeCountsAsync = ref.watch(mistakeCountsBySurahProvider);
    final classesAsync = ref.watch(classesProvider);
    final enrolledAsync = ref.watch(enrolledClassesProvider);
    final isDarkMode = ref.watch(themeProvider);
    final authState = ref.watch(authProvider);
    final teacherStudentsAsync = ref.watch(teacherStudentsProvider);
    final teacherClassDatesAsync = ref.watch(teacherClassDatesProvider);
    final classStudentNamesAsync = ref.watch(classStudentNamesProvider);

    // Unified view — no role branching
    final user = authState.user;
    final displayClassesAsync = classesAsync;
    final userName = user?.firstName ?? 'User';
    final userInitials = '${user?.firstName?.isNotEmpty == true ? user!.firstName[0] : ''}${user?.lastName?.isNotEmpty == true ? user!.lastName[0] : ''}'.toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.background(isDarkMode),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            // Pull fresh data from Supabase first
            final user = ref.read(authProvider).user;
            if (user != null) {
              final syncHelper = ref.read(supabaseSyncHelperProvider);
              await syncHelper.pullAll(user.id);
            }
            // Then reload providers from fresh local data
            ref.invalidate(statsProvider);
            ref.invalidate(topMistakesProvider);
            ref.invalidate(mistakeCountsBySurahProvider);
            ref.read(classesProvider.notifier).loadClasses();
            ref.invalidate(enrolledClassesProvider);
            ref.invalidate(teacherStudentsProvider);
            ref.invalidate(teacherClassDatesProvider);
            ref.invalidate(classStudentNamesProvider);
          },
          child: CustomScrollView(
            slivers: [
              // Header with title and action buttons
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Dashboard',
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.text(isDarkMode),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Welcome back, $userName!',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: AppColors.textSecondary(isDarkMode),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          // Add Contact button
                          OutlinedButton.icon(
                            key: TourService.addContactKey,
                            onPressed: () => _showAddStudentSheet(context, ref, isDarkMode),
                            icon: const Icon(Icons.person_add_outlined, size: 18),
                            label: const Text('Add Contact'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.text(isDarkMode),
                              side: BorderSide(color: AppColors.border(isDarkMode)),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Start New Session button
                          ElevatedButton.icon(
                            key: TourService.startSessionKey,
                            onPressed: () {
                              if (TourService.isTourActive) {
                                TourService.completeInteraction();
                              }
                              showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => const CreateClassScreen(),
                              );
                            },
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('New Session'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.emerald400,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Stats Cards
              SliverToBoxAdapter(
                child: statsAsync.when(
                  data: (stats) {
                    final classes = displayClassesAsync.value ?? [];

                    final now = DateTime.now();
                    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
                    final endOfWeek = startOfWeek.add(const Duration(days: 6));

                    // Teacher stats from Supabase-direct provider (instant)
                    final classDates = teacherClassDatesAsync.valueOrNull ?? [];
                    final teacherTotalClasses = classDates.length;
                    final teacherClassesThisWeek = classDates.where((dateStr) {
                      try {
                        final date = DateTime.parse(dateStr);
                        return date.isAfter(startOfWeek.subtract(const Duration(days: 1))) &&
                               date.isBefore(endOfWeek.add(const Duration(days: 1)));
                      } catch (_) {
                        return false;
                      }
                    }).length;

                    // Format today's date
                    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    final days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    final todayStr = '${days[now.weekday - 1]}, ${months[now.month - 1]} ${now.day}';

                    // Unified stats: Contacts, Sessions This Week, Total Sessions, Today's Date
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: StatCard(
                                  label: 'Contacts',
                                  value: '${teacherStudentsAsync.valueOrNull?.length ?? 0}',
                                  icon: Icons.people_rounded,
                                  color: AppColors.cyan500,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: StatCard(
                                  label: 'This Week',
                                  value: '$teacherClassesThisWeek',
                                  icon: Icons.check_circle_outline,
                                  color: AppTheme.emerald400,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: StatCard(
                                  label: 'Listening (مستمع)',
                                  value: '$teacherTotalClasses',
                                  icon: Icons.hearing_rounded,
                                  color: const Color(0xFF8B5CF6),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: StatCard(
                                  label: 'Reciting (قارئ)',
                                  value: '${enrolledAsync.valueOrNull?.length ?? 0}',
                                  icon: Icons.menu_book_rounded,
                                  color: AppColors.amber500,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                  loading: () => const Padding(
                    padding: EdgeInsets.all(20),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (e, _) => Padding(
                    padding: const EdgeInsets.all(20),
                    child: Text('Error: $e', style: const TextStyle(color: AppColors.error)),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 20)),

              // Teacher: Show student management placeholder
              // Student: Show surahs needing attention
              ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: SectionCard(
                      title: 'My Contacts',
                      subtitle: 'Manage your contacts',
                      child: teacherStudentsAsync.when(
                        loading: () => const Padding(
                          padding: EdgeInsets.all(32),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                        error: (e, _) => Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text('Error loading contacts: $e',
                            style: const TextStyle(color: AppColors.error)),
                        ),
                        data: (students) {
                          if (students.isEmpty) {
                            return Center(
                              child: Padding(
                                padding: const EdgeInsets.all(32),
                                child: Column(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(16),
                                      decoration: BoxDecoration(
                                        color: AppColors.cyan500.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(16),
                                      ),
                                      child: Icon(
                                        Icons.people_rounded,
                                        size: 48,
                                        color: AppColors.cyan500,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'No contacts yet',
                                      style: TextStyle(
                                        fontSize: 16,
                                        color: AppColors.textSecondary(isDarkMode),
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'Add contacts to your halaqah to start tracking recitation progress.',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: AppColors.textMuted(isDarkMode),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }

                          return Column(
                            children: students.map((student) {
                              final initials = student.name.isNotEmpty
                                  ? student.name.split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase()
                                  : '?';

                              return InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (_) => _StudentReportPage(
                                        studentId: student.id,
                                        studentName: student.name,
                                      ),
                                    ),
                                  );
                                },
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                  decoration: BoxDecoration(
                                    color: AppColors.surface(isDarkMode).withOpacity(isDarkMode ? 0.5 : 1.0),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: AppColors.border(isDarkMode).withOpacity(0.5)),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: AppColors.cyan500.withOpacity(0.15),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        alignment: Alignment.center,
                                        child: Text(
                                          initials,
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.cyan500,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          student.name,
                                          style: TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w500,
                                            color: AppColors.text(isDarkMode),
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
                            }).toList(),
                          );
                        },
                      ),
                    ),
                  ),
                ),
              ],

              const SliverToBoxAdapter(child: SizedBox(height: 20)),

              // Recent Classes (uses enrolled classes in Student View)
              SliverToBoxAdapter(
                child: displayClassesAsync.when(
                  data: (classes) {
                    final recentClasses = classes.take(3).toList();
                    final studentNamesMap = classStudentNamesAsync.valueOrNull ?? {};
                    if (recentClasses.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: SectionCard(
                          title: 'Recent Listening Sessions (مستمع)',
                          child: Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.calendar_today_outlined,
                                    size: 48,
                                    color: AppColors.textMuted(isDarkMode),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'No sessions yet',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: AppColors.textSecondary(isDarkMode),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: SectionCard(
                        title: 'Recent Listening Sessions (مستمع)',
                        child: Column(
                          children: recentClasses.map((classItem) {
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.surface(isDarkMode).withOpacity(isDarkMode ? 0.5 : 1.0),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.border(isDarkMode).withOpacity(0.5)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: AppColors.border(isDarkMode).withOpacity(0.5),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          classItem.date.contains('-') ? classItem.date.split('-').last : '?',
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.text(isDarkMode),
                                          ),
                                        ),
                                        Text(
                                          _getMonthAbbr(classItem.date),
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: AppColors.textSecondary(isDarkMode),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              classItem.day,
                                              style: TextStyle(
                                                fontSize: 15,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.text(isDarkMode),
                                              ),
                                            ),
                                            if (studentNamesMap[classItem.supabaseId] != null) ...[
                                              const SizedBox(width: 8),
                                              Flexible(
                                                child: Text(
                                                  studentNamesMap[classItem.supabaseId]!.join(', '),
                                                  style: TextStyle(
                                                    fontSize: 13,
                                                    color: AppColors.textSecondary(isDarkMode),
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 4,
                                          children: classItem.assignments.map((a) {
                                            final portionLabel = AppConstants.formatPortionLabel(
                                              startSurah: a.startSurah,
                                              endSurah: a.endSurah,
                                              startAyah: a.startAyah,
                                              endAyah: a.endAyah,
                                            );
                                            return SectionBadge(
                                              type: a.type,
                                              text: portionLabel,
                                              compact: true,
                                            );
                                          }).toList(),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    Icons.chevron_right_rounded,
                                    color: AppColors.textMuted(isDarkMode),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (e, _) => Text('Error: $e'),
                ),
              ),

              // Recent Reciting Sessions (where user is the reciter)
              const SliverToBoxAdapter(child: SizedBox(height: 20)),
              SliverToBoxAdapter(
                child: enrolledAsync.when(
                  data: (enrolledClasses) {
                    if (enrolledClasses.isEmpty) return const SizedBox.shrink();
                    final recentEnrolled = enrolledClasses.take(3).toList();

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: SectionCard(
                        title: 'Recent Reciting Sessions (قارئ)',
                        subtitle: 'Sessions where you are the reciter',
                        child: Column(
                          children: recentEnrolled.map((classItem) {
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.surface(isDarkMode).withOpacity(isDarkMode ? 0.5 : 1.0),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.amber500.withOpacity(0.3)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: AppColors.amber500.withOpacity(0.15),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          classItem.date.contains('-') ? classItem.date.split('-').last : '?',
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.amber500,
                                          ),
                                        ),
                                        Text(
                                          _getMonthAbbr(classItem.date),
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: AppColors.amber500.withOpacity(0.8),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          classItem.day,
                                          style: TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.text(isDarkMode),
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 4,
                                          children: classItem.assignments.map((a) {
                                            final portionLabel = AppConstants.formatPortionLabel(
                                              startSurah: a.startSurah,
                                              endSurah: a.endSurah,
                                              startAyah: a.startAyah,
                                              endAyah: a.endAyah,
                                            );
                                            return SectionBadge(
                                              type: a.type,
                                              text: portionLabel,
                                              compact: true,
                                            );
                                          }).toList(),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Icon(
                                    Icons.chevron_right_rounded,
                                    color: AppColors.textMuted(isDarkMode),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (e, _) => const SizedBox.shrink(),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSyncButton(WidgetRef ref, SyncState state, bool isDarkMode) {
    IconData icon;
    Color color;
    bool isLoading = false;

    switch (state) {
      case SyncState.syncing:
        icon = Icons.sync;
        color = AppColors.emerald400;
        isLoading = true;
        break;
      case SyncState.success:
        icon = Icons.cloud_done_rounded;
        color = AppColors.emerald400;
        break;
      case SyncState.error:
        icon = Icons.cloud_off_rounded;
        color = AppColors.error;
        break;
      case SyncState.idle:
      default:
        icon = Icons.cloud_sync_rounded;
        color = AppColors.textSecondary(isDarkMode);
    }

    return GestureDetector(
      onTap: isLoading ? null : () => ref.read(syncServiceProvider).sync(),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.surface(isDarkMode),
          borderRadius: BorderRadius.circular(10),
        ),
        child: isLoading
            ? SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(color),
                ),
              )
            : Icon(icon, color: color, size: 24),
      ),
    );
  }

  String _getMonthAbbr(String date) {
    final months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    final parts = date.split('-');
    if (parts.length < 2) return '';
    final month = (int.tryParse(parts[1]) ?? 1).clamp(0, 12);
    return months[month];
  }

  void _showAddStudentSheet(BuildContext context, WidgetRef ref, bool isDarkMode) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddStudentSheet(isDarkMode: isDarkMode),
    );
  }
}

/// Full-screen page showing a student's report (navigated from dashboard).
class _StudentReportPage extends ConsumerWidget {
  final String studentId;
  final String studentName;

  const _StudentReportPage({
    required this.studentId,
    required this.studentName,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeProvider);

    return Scaffold(
      backgroundColor: AppColors.background(isDark),
      appBar: AppBar(
        title: Text(studentName),
        backgroundColor: AppColors.card(isDark),
        foregroundColor: AppColors.text(isDark),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: ReportPanel(studentId: studentId),
      ),
    );
  }
}

class _AddStudentSheet extends ConsumerStatefulWidget {
  final bool isDarkMode;

  const _AddStudentSheet({required this.isDarkMode});

  @override
  ConsumerState<_AddStudentSheet> createState() => _AddStudentSheetState();
}

class _AddStudentSheetState extends ConsumerState<_AddStudentSheet> {
  final _emailController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _addStudent() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() => _error = 'Please enter an email address');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final name = await addStudentByEmail(ref, email);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$name added successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _error = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDarkMode;

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        left: 20, right: 20, top: 20,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface(isDark),
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
                color: AppColors.textMuted(isDark),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Add Contact',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.text(isDark),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Enter an email address to search and add a user to your halaqah.',
            style: TextStyle(fontSize: 14, color: AppColors.textSecondary(isDark)),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            autofocus: true,
            style: TextStyle(fontSize: 15, color: AppColors.text(isDark)),
            decoration: InputDecoration(
              hintText: 'reciter@example.com',
              hintStyle: TextStyle(color: AppColors.textMuted(isDark)),
              prefixIcon: Icon(Icons.email_outlined, color: AppColors.textSecondary(isDark)),
              filled: true,
              fillColor: AppColors.background(isDark),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.border(isDark)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.border(isDark)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.cyan500, width: 2),
              ),
            ),
            onSubmitted: (_) => _addStudent(),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: const TextStyle(fontSize: 13, color: AppColors.error),
            ),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(context),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: BorderSide(color: AppColors.textMuted(isDark)),
                  ),
                  child: Text('Cancel', style: TextStyle(color: AppColors.text(isDark))),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _addStudent,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    backgroundColor: AppColors.cyan500,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Add Contact'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

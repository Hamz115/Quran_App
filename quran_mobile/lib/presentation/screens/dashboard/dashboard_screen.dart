import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../config/constants.dart';
import '../../../core/sync/sync_service.dart';
import '../../providers/providers.dart';
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/section_badge.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(statsProvider);
    final topMistakesAsync = ref.watch(topMistakesProvider);
    final mistakeCountsAsync = ref.watch(mistakeCountsBySurahProvider);
    final classesAsync = ref.watch(classesProvider);

    return Scaffold(
      backgroundColor: AppTheme.slate900,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(statsProvider);
            ref.invalidate(topMistakesProvider);
            ref.invalidate(mistakeCountsBySurahProvider);
            ref.read(classesProvider.notifier).loadClasses();
          },
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.emerald500, AppTheme.teal600],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.emerald500.withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.menu_book_rounded,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Quran Logbook',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.slate100,
                              ),
                            ),
                            Text(
                              'Track your teaching progress',
                              style: TextStyle(
                                fontSize: 14,
                                color: AppTheme.slate400,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Sync indicator
                      Consumer(
                        builder: (context, ref, child) {
                          final syncState = ref.watch(syncStateProvider);
                          return syncState.when(
                            data: (state) => _buildSyncButton(ref, state),
                            loading: () => _buildSyncButton(ref, SyncState.idle),
                            error: (_, __) => _buildSyncButton(ref, SyncState.error),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),

              // Stats Cards
              SliverToBoxAdapter(
                child: statsAsync.when(
                  data: (stats) {
                    // Get current progress from last hifz class (use startSurah - where they're currently at)
                    final classes = classesAsync.value ?? [];
                    String currentProgress = '-';
                    for (final cls in classes) {
                      final hifzAssignment = cls.assignments.where((a) => a.type == 'hifz').firstOrNull;
                      if (hifzAssignment != null && hifzAssignment.startSurah > 0 && hifzAssignment.startSurah <= 114) {
                        currentProgress = AppConstants.surahNames[hifzAssignment.startSurah - 1] ?? '-';
                        break;
                      }
                    }

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        children: [
                          Expanded(
                            child: StatCard(
                              label: 'Current Progress',
                              value: currentProgress,
                              icon: Icons.menu_book_rounded,
                              color: AppTheme.hifzColor,
                              smallText: true,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: StatCard(
                              label: 'Total Classes',
                              value: '${stats['totalClasses']}',
                              icon: Icons.calendar_today_rounded,
                              color: AppTheme.emerald400,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: StatCard(
                              label: 'Repeated',
                              value: '${stats['repeatedMistakes']}',
                              icon: Icons.repeat_rounded,
                              color: AppTheme.mistake5,
                            ),
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
                    child: Text('Error: $e', style: const TextStyle(color: AppTheme.error)),
                  ),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 20)),

              // Weak Surahs
              SliverToBoxAdapter(
                child: mistakeCountsAsync.when(
                  data: (counts) {
                    if (counts.isEmpty) return const SizedBox.shrink();

                    final sortedSurahs = counts.entries.toList()
                      ..sort((a, b) => b.value.compareTo(a.value));
                    final topSurahs = sortedSurahs.take(5).toList();
                    final maxCount = topSurahs.isNotEmpty ? topSurahs.first.value : 1;

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: SectionCard(
                        title: 'Surahs Needing Attention',
                        subtitle: 'Based on mistake frequency',
                        child: Column(
                          children: topSurahs.map((entry) {
                            final surahName = AppConstants.surahNames[entry.key] ?? 'Surah ${entry.key}';
                            final progress = entry.value / maxCount;

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: Row(
                                children: [
                                  SizedBox(
                                    width: 24,
                                    child: Text(
                                      '${entry.key}.',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.slate500,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    flex: 2,
                                    child: Text(
                                      surahName,
                                      style: const TextStyle(
                                        fontSize: 14,
                                        color: AppTheme.slate200,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    flex: 3,
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(4),
                                      child: LinearProgressIndicator(
                                        value: progress,
                                        backgroundColor: AppTheme.slate700,
                                        valueColor: AlwaysStoppedAnimation(
                                          AppTheme.getMistakeColor(entry.value),
                                        ),
                                        minHeight: 8,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  SizedBox(
                                    width: 32,
                                    child: Text(
                                      '${entry.value}',
                                      textAlign: TextAlign.end,
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.getMistakeColor(entry.value),
                                      ),
                                    ),
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
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 20)),

              // Top Repeated Mistakes
              SliverToBoxAdapter(
                child: topMistakesAsync.when(
                  data: (mistakes) {
                    if (mistakes.isEmpty) return const SizedBox.shrink();

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: SectionCard(
                        title: 'Top Repeated Mistakes',
                        subtitle: 'Words to review',
                        child: Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: mistakes.map((m) => MistakeBadge(
                            errorCount: m.errorCount,
                            wordText: m.wordText,
                            location: '${m.ayahNumber}:${m.wordIndex + 1}',
                          )).toList(),
                        ),
                      ),
                    );
                  },
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 20)),

              // Recent Classes
              SliverToBoxAdapter(
                child: classesAsync.when(
                  data: (classes) {
                    final recentClasses = classes.take(5).toList();
                    if (recentClasses.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: SectionCard(
                          title: 'Recent Classes',
                          child: Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                children: [
                                  Icon(
                                    Icons.calendar_today_outlined,
                                    size: 48,
                                    color: AppTheme.slate600,
                                  ),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'No classes yet',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: AppTheme.slate400,
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
                        title: 'Recent Classes',
                        child: Column(
                          children: recentClasses.map((classItem) {
                            return Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppTheme.slate800.withOpacity(0.5),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppTheme.slate700.withOpacity(0.5)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: AppTheme.slate700.withOpacity(0.5),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          classItem.date.split('-').last,
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.slate100,
                                          ),
                                        ),
                                        Text(
                                          _getMonthAbbr(classItem.date),
                                          style: const TextStyle(
                                            fontSize: 10,
                                            color: AppTheme.slate400,
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
                                          style: const TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w600,
                                            color: AppTheme.slate100,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 4,
                                          children: classItem.assignments.map((a) {
                                            final surahName = AppConstants.surahNames[a.startSurah] ?? '';
                                            return SectionBadge(
                                              type: a.type,
                                              text: surahName,
                                              compact: true,
                                            );
                                          }).toList(),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Icon(
                                    Icons.chevron_right_rounded,
                                    color: AppTheme.slate500,
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

              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSyncButton(WidgetRef ref, SyncState state) {
    IconData icon;
    Color color;
    bool isLoading = false;

    switch (state) {
      case SyncState.syncing:
        icon = Icons.sync;
        color = AppTheme.emerald400;
        isLoading = true;
        break;
      case SyncState.success:
        icon = Icons.cloud_done_rounded;
        color = AppTheme.emerald400;
        break;
      case SyncState.error:
        icon = Icons.cloud_off_rounded;
        color = AppTheme.error;
        break;
      case SyncState.idle:
      default:
        icon = Icons.cloud_sync_rounded;
        color = AppTheme.slate400;
    }

    return GestureDetector(
      onTap: isLoading ? null : () => ref.read(syncServiceProvider).sync(),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppTheme.slate800,
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
    final month = int.tryParse(date.split('-')[1]) ?? 1;
    return months[month];
  }
}

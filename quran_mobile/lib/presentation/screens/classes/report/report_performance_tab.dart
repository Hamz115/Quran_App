import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../config/app_colors.dart';
import '../../../../data/models/report_filters.dart';
import '../../../../data/models/student_report.dart';
import '../../../../core/services/report_helpers.dart';
import '../../../providers/theme_provider.dart';

/// Performance tab with bar chart (over time) and stats sidebar.
/// Mirrors web's ReportPerformanceTab.tsx.
class ReportPerformanceTab extends ConsumerWidget {
  final List<PerformanceDataPoint> performanceTrend;
  final PerformanceStats performanceStats;

  const ReportPerformanceTab({
    super.key,
    required this.performanceTrend,
    required this.performanceStats,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeProvider);

    return Column(
      children: [
        _PerformanceChart(
          performanceTrend: performanceTrend,
          isDark: isDark,
        ),
        const SizedBox(height: 12),
        _StatsCards(
          stats: performanceStats,
          isDark: isDark,
        ),
      ],
    );
  }
}

// ============ PERFORMANCE CHART ============

class _PerformanceChart extends StatelessWidget {
  final List<PerformanceDataPoint> performanceTrend;
  final bool isDark;

  const _PerformanceChart({
    required this.performanceTrend,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
        color: AppColors.card(isDark),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Performance Over Time',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.text(isDark),
            ),
          ),
          const SizedBox(height: 16),
          if (performanceTrend.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 20),
              child: Text(
                'No performance data for selected filters',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary(isDark),
                ),
              ),
            )
          else ...[
            // Chart area
            SizedBox(
              height: 220,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Y-axis labels
                  SizedBox(
                    width: 80,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: ['Excellent', 'Very Good', 'Good', 'Needs Work'].map((label) {
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Text(
                            label,
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textMuted(isDark),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                  // Plot area
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border(
                          left: BorderSide(
                            color: isDark ? AppColors.slate600 : AppColors.slate300,
                          ),
                          bottom: BorderSide(
                            color: isDark ? AppColors.slate600 : AppColors.slate300,
                          ),
                        ),
                      ),
                      child: LayoutBuilder(
                        builder: (context, constraints) {
                          return Stack(
                            children: [
                              // Grid lines
                              ...List.generate(4, (i) {
                                final y = constraints.maxHeight * (i / 3);
                                return Positioned(
                                  top: y,
                                  left: 0,
                                  right: 0,
                                  child: Container(
                                    height: 1,
                                    color: (isDark ? AppColors.slate700 : AppColors.slate200).withOpacity(0.5),
                                  ),
                                );
                              }),
                              // Bars
                              Positioned.fill(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 8),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                    children: performanceTrend.map((entry) {
                                      final score = perfMap[entry.performance] ?? 0;
                                      final heights = {4: 0.85, 3: 0.6, 2: 0.35, 1: 0.15};
                                      final heightFraction = heights[score] ?? 0.05;
                                      final gradients = {
                                        4: [const Color(0xFF4ADE80), const Color(0xFF22C55E)],
                                        3: [AppColors.cyan400, AppColors.cyan500],
                                        2: [const Color(0xFFFBBF24), const Color(0xFFF59E0B)],
                                        1: [const Color(0xFFF87171), const Color(0xFFEF4444)],
                                      };
                                      final colors = gradients[score] ?? [AppColors.slate400, AppColors.slate500];

                                      return SizedBox(
                                        width: math.min(36, constraints.maxWidth / performanceTrend.length - 4),
                                        child: FractionallySizedBox(
                                          heightFactor: heightFraction,
                                          alignment: Alignment.bottomCenter,
                                          child: Container(
                                            decoration: BoxDecoration(
                                              borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                              gradient: LinearGradient(
                                                begin: Alignment.topCenter,
                                                end: Alignment.bottomCenter,
                                                colors: colors,
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
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // X-axis labels
            Padding(
              padding: const EdgeInsets.only(left: 80, top: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: performanceTrend.map((entry) {
                  return Text(
                    _formatXAxisDate(entry.date),
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.textMuted(isDark),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),
            // Legend
            Container(
              padding: const EdgeInsets.only(top: 14),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(color: AppColors.border(isDark)),
                ),
              ),
              child: Row(
                children: [
                  _LegendItem('Excellent', const Color(0xFF22C55E), isDark),
                  const SizedBox(width: 14),
                  _LegendItem('Very Good', AppColors.cyan500, isDark),
                  const SizedBox(width: 14),
                  _LegendItem('Good', const Color(0xFFF59E0B), isDark),
                  const SizedBox(width: 14),
                  _LegendItem('Needs Work', const Color(0xFFEF4444), isDark),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatXAxisDate(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return '${date.day} ${months[date.month - 1]}';
    } catch (_) {
      return dateStr;
    }
  }
}

class _LegendItem extends StatelessWidget {
  final String label;
  final Color color;
  final bool isDark;

  const _LegendItem(this.label, this.color, this.isDark);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: AppColors.textSecondary(isDark),
          ),
        ),
      ],
    );
  }
}

// ============ STATS CARDS ============

class _StatsCards extends StatelessWidget {
  final PerformanceStats stats;
  final bool isDark;

  const _StatsCards({
    required this.stats,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _StatCard(
                label: 'Current Streak',
                value: '${stats.currentStreak} classes',
                subtitle: 'Very Good or above',
                valueColor: const Color(0xFF4ADE80), // green-400
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _StatCard(
                label: 'Best Streak',
                value: '${stats.bestStreak} classes',
                subtitle: stats.bestStreakRange.isNotEmpty ? stats.bestStreakRange : 'N/A',
                valueColor: AppColors.cyan400,
                isDark: isDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _MistakesPerClassCard(
                mistakesPerClass: stats.mistakesPerClass,
                sparkline: stats.mistakeSparkline,
                isDark: isDark,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _TrendCard(
                trend: stats.trend,
                isDark: isDark,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final String subtitle;
  final Color valueColor;
  final bool isDark;

  const _StatCard({
    required this.label,
    required this.value,
    required this.subtitle,
    required this.valueColor,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
        color: AppColors.card(isDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.5,
              color: AppColors.textMuted(isDark),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: valueColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 11,
              color: AppColors.textMuted(isDark),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _MistakesPerClassCard extends StatelessWidget {
  final double mistakesPerClass;
  final List<double> sparkline;
  final bool isDark;

  const _MistakesPerClassCard({
    required this.mistakesPerClass,
    required this.sparkline,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
        color: AppColors.card(isDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'MISTAKES / CLASS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.5,
              color: AppColors.textMuted(isDark),
            ),
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$mistakesPerClass',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text(isDark),
                ),
              ),
              const SizedBox(width: 4),
              Text(
                'avg',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted(isDark),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Sparkline
          SizedBox(
            height: 40,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: sparkline.map((pct) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 1),
                    child: FractionallySizedBox(
                      heightFactor: math.max(pct / 100, 0.05),
                      alignment: Alignment.bottomCenter,
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.cyan600,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(2)),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _TrendCard extends StatelessWidget {
  final String trend;
  final bool isDark;

  const _TrendCard({
    required this.trend,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final trendColor = trend == 'improving'
        ? const Color(0xFF4ADE80)
        : trend == 'declining'
            ? const Color(0xFFF87171)
            : AppColors.slate400;

    final trendIcon = trend == 'improving'
        ? '\u2197'
        : trend == 'declining'
            ? '\u2198'
            : '\u2192';

    final trendLabel = trend == 'improving'
        ? 'Improving'
        : trend == 'declining'
            ? 'Declining'
            : 'Stable';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
        color: AppColors.card(isDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'TREND',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.5,
              color: AppColors.textMuted(isDark),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '$trendIcon $trendLabel',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: trendColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Last 4 vs previous 4',
            style: TextStyle(
              fontSize: 11,
              color: AppColors.textMuted(isDark),
            ),
          ),
        ],
      ),
    );
  }
}

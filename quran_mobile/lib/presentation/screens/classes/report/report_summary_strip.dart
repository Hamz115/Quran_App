import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../config/app_colors.dart';
import '../../../../data/models/student_report.dart';
import '../../../providers/theme_provider.dart';

/// Horizontal strip of 5 stat cards showing report summary.
/// Mirrors web's ReportSummaryStrip.tsx.
class ReportSummaryStrip extends ConsumerWidget {
  final ReportSummary summary;

  const ReportSummaryStrip({super.key, required this.summary});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeProvider);

    final stats = [
      _Stat('Sessions', summary.totalClasses.toString(), AppColors.cyan400),
      _Stat('Mistakes', summary.totalMistakes.toString(), null),
      _Stat('Unique', summary.uniqueMistakes.toString(), null),
      _Stat(
        'Repeated',
        summary.repeatedMistakes.toString(),
        const Color(0xFFF87171),
      ),
      _Stat('Avg Perf', summary.avgPerformance, const Color(0xFF4ADE80)),
    ];

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      decoration: BoxDecoration(
        color: AppColors.surface(isDark).withOpacity(isDark ? 0.78 : 0.98),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border(isDark).withOpacity(0.72)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.18 : 0.06),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          children: stats.asMap().entries.map((entry) {
            final i = entry.key;
            final stat = entry.value;
            return Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.transparent,
                  border: i < stats.length - 1
                      ? Border(
                          right: BorderSide(
                            color: AppColors.border(isDark),
                            width: 1,
                          ),
                        )
                      : null,
                ),
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 14,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        stat.value,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: stat.color ?? AppColors.text(isDark),
                        ),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      stat.label.toUpperCase(),
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 0,
                        color: AppColors.textMuted(isDark),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _Stat {
  final String label;
  final String value;
  final Color? color;
  const _Stat(this.label, this.value, this.color);
}

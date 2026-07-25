import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../config/app_colors.dart';
import '../../../../data/models/student_report.dart';
import '../../../../data/models/report_filters.dart';
import '../../../../core/services/report_helpers.dart';
import '../../../providers/theme_provider.dart';
import '../../../providers/report_provider.dart';
import 'report_filter_bar.dart';
import 'report_summary_strip.dart';
import 'report_classes_tab.dart';
import 'report_mistakes_tab.dart';
import 'report_performance_tab.dart';

/// Report panel orchestrator — assembles filter bar, summary strip, tabs, and tab content.
/// Mirrors web's ReportPanel.tsx.
class ReportPanel extends ConsumerStatefulWidget {
  final String studentId;
  final ValueChanged<String>? onTapClass;
  final ValueChanged<String>? onDeleteClass;

  const ReportPanel({
    super.key,
    required this.studentId,
    this.onTapClass,
    this.onDeleteClass,
  });

  @override
  ConsumerState<ReportPanel> createState() => _ReportPanelState();
}

enum _ReportTab { classes, mistakes, performance }

class _ReportPanelState extends ConsumerState<ReportPanel> {
  _ReportTab _activeTab = _ReportTab.classes;
  ReportFilters _filters = const ReportFilters();
  String? _expandedClassId;

  @override
  void didUpdateWidget(covariant ReportPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.studentId != widget.studentId) {
      // Reset state when student changes
      setState(() {
        _activeTab = _ReportTab.classes;
        _filters = const ReportFilters();
        _expandedClassId = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = ref.watch(themeProvider);
    final reportAsync = ref.watch(studentReportProvider(widget.studentId));

    return reportAsync.when(
      loading: () => Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: Center(
          child: CircularProgressIndicator(color: AppColors.cyan500),
        ),
      ),
      error: (error, _) => Padding(
        padding: const EdgeInsets.all(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0x33EF4444), // red-500/20
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x4DEF4444)), // red-500/30
          ),
          child: Text(
            error.toString(),
            style: const TextStyle(color: Color(0xFFEF4444)),
          ),
        ),
      ),
      data: (report) {
        // Apply filters
        final filteredReport = _filters.isActive
            ? applyReportFilters(report, _filters)
            : report;
        final perfStats = computePerformanceStats(filteredReport.classes);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Student info + Export placeholder
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      '${report.student.name} \u00B7 Reciter since ${formatReportDate(report.student.addedAt)}',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textMuted(isDark),
                      ),
                    ),
                  ),
                  // Export button placeholder
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isDark ? AppColors.slate600 : AppColors.slate300,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.file_download_outlined,
                          size: 14,
                          color: isDark
                              ? AppColors.slate300
                              : AppColors.slate600,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Export',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: isDark
                                ? AppColors.slate300
                                : AppColors.slate600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // Filter bar
            ReportFilterBar(
              filters: _filters,
              onFiltersChange: (f) => setState(() => _filters = f),
            ),

            // Summary strip
            ReportSummaryStrip(summary: filteredReport.summary),

            // Tab navigation
            Container(
              margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                color: AppColors.surface(
                  isDark,
                ).withOpacity(isDark ? 0.78 : 0.98),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: AppColors.border(isDark).withOpacity(0.72),
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _TabButton(
                      label: 'Sessions',
                      count: filteredReport.summary.totalClasses,
                      countColor: AppColors.cyan400,
                      countBgColor: const Color(0x33069291), // cyan-600/20
                      isActive: _activeTab == _ReportTab.classes,
                      isDark: isDark,
                      onTap: () =>
                          setState(() => _activeTab = _ReportTab.classes),
                    ),
                  ),
                  Expanded(
                    child: _TabButton(
                      label: 'Mistakes',
                      count: filteredReport.summary.totalMistakes,
                      countColor: const Color(0xFFF87171), // red-400
                      countBgColor: const Color(0x33EF4444), // red-500/20
                      isActive: _activeTab == _ReportTab.mistakes,
                      isDark: isDark,
                      onTap: () =>
                          setState(() => _activeTab = _ReportTab.mistakes),
                    ),
                  ),
                  Expanded(
                    child: _TabButton(
                      label: 'Performance',
                      count: null,
                      countColor: null,
                      countBgColor: null,
                      isActive: _activeTab == _ReportTab.performance,
                      isDark: isDark,
                      onTap: () =>
                          setState(() => _activeTab = _ReportTab.performance),
                    ),
                  ),
                ],
              ),
            ),

            // Tab content
            Padding(
              padding: const EdgeInsets.all(16),
              child: _buildTabContent(filteredReport, perfStats),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTabContent(
    StudentReport filteredReport,
    PerformanceStats perfStats,
  ) {
    switch (_activeTab) {
      case _ReportTab.classes:
        return ReportClassesTab(
          classes: filteredReport.classes,
          expandedClassId: _expandedClassId,
          onToggleExpand: (id) => setState(() {
            _expandedClassId = _expandedClassId == id ? null : id;
          }),
          onTapClass: widget.onTapClass,
          onDeleteClass: widget.onDeleteClass,
        );
      case _ReportTab.mistakes:
        return ReportMistakesTab(
          mistakesBySurah: filteredReport.mistakesBySurah,
          repeatedMistakes: filteredReport.repeatedMistakes,
        );
      case _ReportTab.performance:
        return ReportPerformanceTab(
          performanceTrend: filteredReport.performanceTrend,
          performanceStats: perfStats,
        );
    }
  }
}

// ============ TAB BUTTON ============

class _TabButton extends StatelessWidget {
  final String label;
  final int? count;
  final Color? countColor;
  final Color? countBgColor;
  final bool isActive;
  final bool isDark;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.count,
    required this.countColor,
    required this.countBgColor,
    required this.isActive,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
        decoration: BoxDecoration(
          gradient: isActive ? AppColors.primaryGradient : null,
          color: isActive ? null : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: isActive ? Colors.white : AppColors.textMuted(isDark),
                ),
              ),
              if (count != null) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 1,
                  ),
                  decoration: BoxDecoration(
                    color: isActive
                        ? Colors.white.withOpacity(0.18)
                        : countBgColor,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    count.toString(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isActive ? Colors.white : countColor,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

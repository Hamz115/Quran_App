import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../config/app_colors.dart';
import '../../../../config/constants.dart';
import '../../../../data/models/report_filters.dart';
import '../../../../core/services/report_helpers.dart';
import '../../../providers/theme_provider.dart';

/// Filter bar with month pills (row 1) and surah/juz selectors (row 2).
/// Mirrors web's ReportFilterBar.tsx.
class ReportFilterBar extends ConsumerWidget {
  final ReportFilters filters;
  final ValueChanged<ReportFilters> onFiltersChange;

  const ReportFilterBar({
    super.key,
    required this.filters,
    required this.onFiltersChange,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeProvider);

    final monthList = _getMonthList();
    final recentMonths = monthList.take(3).toList();
    final olderMonths = monthList.skip(3).toList();
    final selectedMonthKey = _getSelectedMonthKey(filters);
    final isAllSelected = filters.datePreset == DatePreset.all &&
        filters.dateFrom.isEmpty &&
        filters.dateTo.isEmpty;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.card(isDark),
        border: Border(
          bottom: BorderSide(color: AppColors.border(isDark)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row 1: Month pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                Text(
                  'MONTH',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                    color: AppColors.textMuted(isDark),
                  ),
                ),
                const SizedBox(width: 12),
                _MonthPill(
                  label: 'All',
                  isActive: isAllSelected,
                  isDark: isDark,
                  onTap: () => onFiltersChange(const ReportFilters()),
                ),
                const SizedBox(width: 8),
                ...recentMonths.map((m) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _MonthPill(
                    label: m.label,
                    isActive: selectedMonthKey == m.key,
                    isDark: isDark,
                    onTap: () => _handleMonthClick(m),
                  ),
                )),
                if (olderMonths.isNotEmpty)
                  _OlderMonthsDropdown(
                    months: olderMonths,
                    selectedKey: olderMonths.any((m) => m.key == selectedMonthKey)
                        ? selectedMonthKey
                        : null,
                    isDark: isDark,
                    onSelected: (month) => _handleMonthClick(month),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Row 2: Surah + Juz + Clear all
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                Text(
                  'SURAH',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                    color: AppColors.textMuted(isDark),
                  ),
                ),
                const SizedBox(width: 12),
                _SurahDropdown(
                  value: filters.surahFrom,
                  hint: 'From (any)',
                  isDark: isDark,
                  onChanged: (v) => onFiltersChange(
                    filters.copyWith(surahFrom: v, clearSurahFrom: v == null, clearJuz: true),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    '\u2013',
                    style: TextStyle(color: AppColors.textMuted(isDark)),
                  ),
                ),
                _SurahDropdown(
                  value: filters.surahTo,
                  hint: 'To (any)',
                  isDark: isDark,
                  onChanged: (v) => onFiltersChange(
                    filters.copyWith(surahTo: v, clearSurahTo: v == null, clearJuz: true),
                  ),
                ),
                const SizedBox(width: 16),
                Container(
                  width: 1,
                  height: 20,
                  color: AppColors.border(isDark),
                ),
                const SizedBox(width: 16),
                Text(
                  'JUZ',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.5,
                    color: AppColors.textMuted(isDark),
                  ),
                ),
                const SizedBox(width: 8),
                _JuzDropdown(
                  value: filters.juz,
                  isDark: isDark,
                  onChanged: (juz) {
                    if (juz != null) {
                      final range = getSurahRangeForJuz(juz);
                      onFiltersChange(filters.copyWith(
                        juz: juz,
                        surahFrom: range?.startSurah,
                        surahTo: range?.endSurah,
                      ));
                    } else {
                      onFiltersChange(filters.copyWith(
                        clearJuz: true,
                        clearSurahFrom: true,
                        clearSurahTo: true,
                      ));
                    }
                  },
                ),
                const SizedBox(width: 16),
                GestureDetector(
                  onTap: () => onFiltersChange(const ReportFilters()),
                  child: Text(
                    'Clear all',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted(isDark),
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _handleMonthClick(_MonthData month) {
    onFiltersChange(ReportFilters(
      dateFrom: month.from,
      dateTo: month.to,
      surahFrom: filters.surahFrom,
      surahTo: filters.surahTo,
      juz: filters.juz,
    ));
  }

  static List<_MonthData> _getMonthList() {
    final months = <_MonthData>[];
    final now = DateTime.now();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    for (int i = 0; i < 12; i++) {
      final d = DateTime(now.year, now.month - i, 1);
      final year = d.year;
      final month = d.month;
      final key = '$year-${month.toString().padLeft(2, '0')}';
      final lastDay = DateTime(year, month + 1, 0).day;
      months.add(_MonthData(
        key: key,
        label: '${monthNames[month - 1]} $year',
        from: '$year-${month.toString().padLeft(2, '0')}-01',
        to: '$year-${month.toString().padLeft(2, '0')}-${lastDay.toString().padLeft(2, '0')}',
      ));
    }
    return months;
  }

  static String? _getSelectedMonthKey(ReportFilters filters) {
    if (filters.dateFrom.isEmpty || filters.dateTo.isEmpty) return null;
    final fromParts = filters.dateFrom.split('-');
    final toParts = filters.dateTo.split('-');
    if (fromParts.length < 3 || toParts.length < 3) return null;
    if (fromParts[0] == toParts[0] &&
        fromParts[1] == toParts[1] &&
        fromParts[2] == '01') {
      return '${fromParts[0]}-${fromParts[1]}';
    }
    return null;
  }
}

// ============ MONTH PILL ============

class _MonthPill extends StatelessWidget {
  final String label;
  final bool isActive;
  final bool isDark;
  final VoidCallback onTap;

  const _MonthPill({
    required this.label,
    required this.isActive,
    required this.isDark,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isActive
              ? AppColors.cyan600
              : isDark
                  ? AppColors.slate700.withOpacity(0.5)
                  : AppColors.slate100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: isActive
                ? Colors.white
                : isDark
                    ? AppColors.slate400
                    : AppColors.slate500,
          ),
        ),
      ),
    );
  }
}

// ============ OLDER MONTHS DROPDOWN ============

class _OlderMonthsDropdown extends StatelessWidget {
  final List<_MonthData> months;
  final String? selectedKey;
  final bool isDark;
  final ValueChanged<_MonthData> onSelected;

  const _OlderMonthsDropdown({
    required this.months,
    required this.selectedKey,
    required this.isDark,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isActive = selectedKey != null;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isActive
            ? AppColors.cyan600
            : isDark
                ? AppColors.slate700.withOpacity(0.5)
                : AppColors.slate100,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isActive
              ? AppColors.cyan600
              : isDark
                  ? AppColors.slate600
                  : AppColors.slate300,
        ),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: selectedKey,
          hint: Text(
            'Older months...',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.slate400 : AppColors.slate500,
            ),
          ),
          isDense: true,
          icon: Icon(
            Icons.arrow_drop_down,
            size: 16,
            color: isActive
                ? Colors.white
                : isDark
                    ? AppColors.slate400
                    : AppColors.slate500,
          ),
          dropdownColor: AppColors.surface(isDark),
          style: TextStyle(
            fontSize: 12,
            color: isActive ? Colors.white : AppColors.text(isDark),
          ),
          items: months.map((m) => DropdownMenuItem(
            value: m.key,
            child: Text(
              m.label,
              style: TextStyle(
                fontSize: 12,
                color: AppColors.text(isDark),
              ),
            ),
          )).toList(),
          onChanged: (key) {
            if (key == null) return;
            final month = months.firstWhere((m) => m.key == key);
            onSelected(month);
          },
        ),
      ),
    );
  }
}

// ============ SURAH DROPDOWN ============

class _SurahDropdown extends StatelessWidget {
  final int? value;
  final String hint;
  final bool isDark;
  final ValueChanged<int?> onChanged;

  const _SurahDropdown({
    required this.value,
    required this.hint,
    required this.isDark,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: isDark ? AppColors.slate900 : Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isDark ? AppColors.slate600 : AppColors.slate300,
        ),
      ),
      constraints: const BoxConstraints(minWidth: 120),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int?>(
          value: value,
          hint: Text(
            hint,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.slate400 : AppColors.slate500,
            ),
          ),
          isDense: true,
          icon: Icon(
            Icons.arrow_drop_down,
            size: 16,
            color: AppColors.textMuted(isDark),
          ),
          dropdownColor: AppColors.surface(isDark),
          menuMaxHeight: 300,
          items: [
            DropdownMenuItem<int?>(
              value: null,
              child: Text(
                hint,
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted(isDark),
                ),
              ),
            ),
            ...List.generate(114, (i) => i + 1).map((n) => DropdownMenuItem(
              value: n,
              child: Text(
                '$n \u00B7 ${AppConstants.surahNames[n] ?? ''}',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.text(isDark),
                ),
              ),
            )),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }
}

// ============ JUZ DROPDOWN ============

class _JuzDropdown extends StatelessWidget {
  final int? value;
  final bool isDark;
  final ValueChanged<int?> onChanged;

  const _JuzDropdown({
    required this.value,
    required this.isDark,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: isDark ? AppColors.slate900 : Colors.white,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isDark ? AppColors.slate600 : AppColors.slate300,
        ),
      ),
      constraints: const BoxConstraints(minWidth: 80),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int?>(
          value: value,
          hint: Text(
            'All',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.slate400 : AppColors.slate500,
            ),
          ),
          isDense: true,
          icon: Icon(
            Icons.arrow_drop_down,
            size: 16,
            color: AppColors.textMuted(isDark),
          ),
          dropdownColor: AppColors.surface(isDark),
          menuMaxHeight: 300,
          items: [
            DropdownMenuItem<int?>(
              value: null,
              child: Text(
                'All',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted(isDark),
                ),
              ),
            ),
            ...List.generate(30, (i) => i + 1).map((n) => DropdownMenuItem(
              value: n,
              child: Text(
                'Juz $n',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.text(isDark),
                ),
              ),
            )),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }
}

// ============ DATA CLASS ============

class _MonthData {
  final String key;
  final String label;
  final String from;
  final String to;
  const _MonthData({
    required this.key,
    required this.label,
    required this.from,
    required this.to,
  });
}

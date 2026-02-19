import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../config/app_colors.dart';
import '../../../../config/constants.dart';
import '../../../../data/models/student_report.dart';
import '../../../../core/services/report_helpers.dart';
import '../../../providers/theme_provider.dart';

/// Classes table with expandable rows showing date, portions, mistakes, performance, notes.
/// Mirrors web's ReportClassesTab.tsx.
class ReportClassesTab extends ConsumerWidget {
  final List<StudentClass> classes;
  final String? expandedClassId;
  final ValueChanged<String> onToggleExpand;
  final ValueChanged<String>? onTapClass;
  final ValueChanged<String>? onDeleteClass;

  const ReportClassesTab({
    super.key,
    required this.classes,
    required this.expandedClassId,
    required this.onToggleExpand,
    this.onTapClass,
    this.onDeleteClass,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeProvider);

    if (classes.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 48),
        alignment: Alignment.center,
        child: Text(
          'No classes found for the selected filters',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary(isDark),
          ),
        ),
      );
    }

    final sorted = [...classes]
      ..sort((a, b) => b.date.compareTo(a.date));

    // Compute previous mistakes map (accumulated from earlier classes)
    final chronological = [...classes]
      ..sort((a, b) => a.date.compareTo(b.date));
    final Map<String, List<ClassMistake>> previousMistakesMap = {};
    final Map<String, ClassMistake> accumulated = {};
    for (final cls in chronological) {
      // Store accumulated so far (before this class) for this class
      previousMistakesMap[cls.id] = accumulated.values.toList()
        ..sort((a, b) => b.errorCount.compareTo(a.errorCount));
      // Add this class's mistakes into the accumulator
      for (final m in cls.mistakes) {
        final key = '${m.surahNumber}-${m.ayahNumber}-${m.wordText}';
        final existing = accumulated[key];
        if (existing == null || m.errorCount > existing.errorCount) {
          accumulated[key] = m;
        }
      }
    }

    final screenWidth = MediaQuery.of(context).size.width;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minWidth: 640,
          maxWidth: math.max(640, screenWidth - 32),
        ),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border(isDark)),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Table header
                Container(
                  color: isDark ? AppColors.slate900 : AppColors.slate50,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  child: Row(
                    children: [
                      const SizedBox(width: 28), // chevron column
                      Expanded(
                        flex: 2,
                        child: _HeaderText('DATE', isDark),
                      ),
                      Expanded(
                        flex: 3,
                        child: _HeaderText('PORTIONS', isDark),
                      ),
                      SizedBox(
                        width: 50,
                        child: _HeaderText('MIST.', isDark, center: true),
                      ),
                      Expanded(
                        flex: 2,
                        child: _HeaderText('PERFORMANCE', isDark),
                      ),
                      Expanded(
                        flex: 2,
                        child: _HeaderText('NOTES', isDark),
                      ),
                    ],
                  ),
                ),
                // Rows
                ...sorted.map((cls) => _ClassRow(
                  cls: cls,
                  isExpanded: expandedClassId == cls.id,
                  isDark: isDark,
                  onToggle: () => onToggleExpand(cls.id),
                  onTap: onTapClass != null ? () => onTapClass!(cls.id) : null,
                  onDelete: onDeleteClass != null ? () => onDeleteClass!(cls.id) : null,
                  previousMistakes: previousMistakesMap[cls.id] ?? [],
                )),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _HeaderText extends StatelessWidget {
  final String text;
  final bool isDark;
  final bool center;

  const _HeaderText(this.text, this.isDark, {this.center = false});

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      textAlign: center ? TextAlign.center : TextAlign.left,
      style: TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
        color: AppColors.textMuted(isDark),
      ),
    );
  }
}

// ============ CLASS ROW ============

class _ClassRow extends StatelessWidget {
  final StudentClass cls;
  final bool isExpanded;
  final bool isDark;
  final VoidCallback onToggle;
  final VoidCallback? onTap;
  final VoidCallback? onDelete;
  final List<ClassMistake> previousMistakes;

  const _ClassRow({
    required this.cls,
    required this.isExpanded,
    required this.isDark,
    required this.onToggle,
    this.onTap,
    this.onDelete,
    this.previousMistakes = const [],
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Main row
        Container(
          color: AppColors.card(isDark),
          child: InkWell(
            onTap: onTap ?? onToggle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              child: Row(
                children: [
                  // Chevron — only this toggles expand
                  GestureDetector(
                    onTap: () {
                      // Stop the InkWell from also firing
                      onToggle();
                    },
                    behavior: HitTestBehavior.opaque,
                    child: SizedBox(
                      width: 28,
                      height: 40,
                      child: Icon(
                        isExpanded ? Icons.expand_more : Icons.chevron_right,
                        size: 18,
                        color: AppColors.textMuted(isDark),
                      ),
                    ),
                  ),
                  // Date + Day
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          formatReportDate(cls.date),
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.text(isDark),
                          ),
                        ),
                        Text(
                          cls.day,
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted(isDark),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Portions
                  Expanded(
                    flex: 3,
                    child: _buildPortions(),
                  ),
                  // Mistakes count badge
                  SizedBox(
                    width: 50,
                    child: Center(
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: mistakeCountColor(cls.mistakeCount),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          cls.mistakeCount.toString(),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: mistakeCountTextColor(cls.mistakeCount),
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Performance badge
                  Expanded(
                    flex: 2,
                    child: _buildPerformanceBadge(),
                  ),
                  // Notes (truncated)
                  Expanded(
                    flex: 2,
                    child: Text(
                      cls.notes ?? '-',
                      style: TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: AppColors.textMuted(isDark),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        // Divider
        Divider(height: 1, color: AppColors.border(isDark)),
        // Expanded detail
        if (isExpanded) _buildExpandedDetail(),
      ],
    );
  }

  Widget _buildPortions() {
    if (cls.assignments.isEmpty) {
      return Text(
        'No portions',
        style: TextStyle(
          fontSize: 12,
          color: AppColors.textMuted(isDark),
        ),
      );
    }

    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: cls.assignments.map((a) {
        final surahName = AppConstants.surahNames[a.startSurah] ?? 'Surah ${a.startSurah}';
        final ayahRange = a.startAyah != null
            ? ' ${a.startAyah}${a.endAyah != null && a.endAyah != a.startAyah ? '-${a.endAyah}' : ''}'
            : '';

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: portionTagColor(a.type),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: portionTagBorderColor(a.type)),
          ),
          child: Text(
            '${a.type.toUpperCase()} $surahName$ayahRange',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: portionTagTextColor(a.type),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPerformanceBadge() {
    if (cls.performance == null || cls.performance!.isEmpty) {
      return Text(
        '-',
        style: TextStyle(
          fontSize: 12,
          color: AppColors.textMuted(isDark),
        ),
      );
    }

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        decoration: BoxDecoration(
          color: perfBadgeColor(cls.performance!),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          cls.performance!,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: perfBadgeTextColor(cls.performance!),
          ),
        ),
      ),
    );
  }

  Widget _buildExpandedDetail() {
    return Container(
      color: isDark ? AppColors.slate900 : AppColors.slate50,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Mistakes in this class
          Text(
            'MISTAKES IN THIS CLASS',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: AppColors.textMuted(isDark),
            ),
          ),
          const SizedBox(height: 8),
          if (cls.mistakes.isEmpty)
            Text(
              'No mistakes recorded for this class',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary(isDark),
              ),
            )
          else
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: cls.mistakes.map((m) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0x1AEF4444) // red-500/10
                      : const Color(0x0DEF4444), // red-50
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark
                        ? const Color(0x33EF4444) // red-500/20
                        : const Color(0xFFfecaca), // red-200
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      m.wordText,
                      style: TextStyle(
                        fontSize: 13,
                        fontFamily: AppConstants.arabicFontFamily,
                        color: isDark
                            ? const Color(0xFFFCA5A5) // red-300
                            : const Color(0xFFDC2626), // red-600
                      ),
                      textDirection: TextDirection.rtl,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${m.surahName}:${m.ayahNumber}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark
                            ? const Color(0xFFFCA5A5)
                            : const Color(0xFFDC2626),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${m.errorCount}x',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFF87171), // red-400
                      ),
                    ),
                  ],
                ),
              )).toList(),
            ),
          // Previous mistakes (amber scheme)
          if (previousMistakes.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'MISTAKES FROM PREVIOUS CLASSES',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
                color: AppColors.textMuted(isDark),
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: previousMistakes.map((m) => Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDark
                      ? const Color(0x1AF59E0B) // amber-500/10
                      : const Color(0xFFFFFBEB), // amber-50
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark
                        ? const Color(0x33F59E0B) // amber-500/20
                        : const Color(0xFFFDE68A), // amber-200
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      m.wordText,
                      style: TextStyle(
                        fontSize: 13,
                        fontFamily: AppConstants.arabicFontFamily,
                        color: isDark
                            ? const Color(0xFFFCD34D) // amber-300
                            : const Color(0xFFD97706), // amber-600
                      ),
                      textDirection: TextDirection.rtl,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${m.surahName}:${m.ayahNumber}',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark
                            ? const Color(0xFFFCD34D)
                            : const Color(0xFFD97706),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${m.errorCount}x',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFFBBF24), // amber-400
                      ),
                    ),
                  ],
                ),
              )).toList(),
            ),
          ],
          const SizedBox(height: 16),
          // Teacher Notes
          Text(
            'TEACHER NOTES',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
              color: AppColors.textMuted(isDark),
            ),
          ),
          const SizedBox(height: 8),
          if (cls.notes == null || cls.notes!.isEmpty)
            Text(
              'No notes',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary(isDark),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.slate800 : Colors.white,
                borderRadius: BorderRadius.circular(6),
                border: Border(
                  left: BorderSide(
                    width: 3,
                    color: isDark ? AppColors.slate600 : AppColors.slate300,
                  ),
                ),
              ),
              child: Text(
                '"${cls.notes}"',
                style: TextStyle(
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                  height: 1.5,
                  color: isDark ? AppColors.slate400 : AppColors.slate500,
                ),
              ),
            ),
          // Delete button
          if (onDelete != null) ...[
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () => _confirmDelete(isDark),
                icon: const Icon(Icons.delete_outline, size: 16),
                label: const Text('Delete Class'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.error,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _confirmDelete(bool isDark) {
    // Find the nearest context via the Builder pattern
    // Since _ClassRow is a StatelessWidget, we use the onDelete callback
    // which will be called after confirmation in the parent
    onDelete!();
  }
}

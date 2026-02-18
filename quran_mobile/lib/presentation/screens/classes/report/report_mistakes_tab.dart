import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../config/app_colors.dart';
import '../../../../config/constants.dart';
import '../../../../data/models/student_report.dart';
import '../../../providers/theme_provider.dart';

/// Mistakes tab with two sections: Mistakes by Surah (bar chart) and Repeated Mistakes (list).
/// Mirrors web's ReportMistakesTab.tsx.
class ReportMistakesTab extends ConsumerWidget {
  final List<MistakeBySurah> mistakesBySurah;
  final List<RepeatedMistake> repeatedMistakes;

  const ReportMistakesTab({
    super.key,
    required this.mistakesBySurah,
    required this.repeatedMistakes,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = ref.watch(themeProvider);

    return Column(
      children: [
        _MistakesBySurahSection(
          mistakesBySurah: mistakesBySurah,
          isDark: isDark,
        ),
        const SizedBox(height: 20),
        _RepeatedMistakesSection(
          repeatedMistakes: repeatedMistakes,
          isDark: isDark,
        ),
      ],
    );
  }
}

// ============ MISTAKES BY SURAH ============

class _MistakesBySurahSection extends StatelessWidget {
  final List<MistakeBySurah> mistakesBySurah;
  final bool isDark;

  const _MistakesBySurahSection({
    required this.mistakesBySurah,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.card(isDark),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              border: Border(
                bottom: BorderSide(color: AppColors.border(isDark)),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Mistakes by Surah',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text(isDark),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0x33069291), // cyan-600/20
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${mistakesBySurah.length} surahs',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.cyan400,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Content
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card(isDark),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
            ),
            child: mistakesBySurah.isEmpty
                ? Text(
                    'No mistakes recorded',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary(isDark),
                    ),
                  )
                : _buildBarChart(),
          ),
        ],
      ),
    );
  }

  Widget _buildBarChart() {
    final sorted = [...mistakesBySurah]
      ..sort((a, b) => b.totalMistakes.compareTo(a.totalMistakes));
    final maxVal = sorted.first.totalMistakes;

    return Column(
      children: sorted.map((item) {
        final pct = maxVal > 0 ? (item.totalMistakes / maxVal) : 0.0;

        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Row(
            children: [
              // Surah name (right-aligned)
              SizedBox(
                width: 100,
                child: Text(
                  item.surahName,
                  textAlign: TextAlign.right,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.slate300 : AppColors.slate600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 10),
              // Bar
              Expanded(
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    return Container(
                      height: 22,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.slate700 : AppColors.slate200,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          widthFactor: math.max(pct, 0.02),
                          child: Container(
                            height: 22,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(4),
                              gradient: const LinearGradient(
                                colors: [AppColors.cyan600, AppColors.teal500],
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 10),
              // Count
              SizedBox(
                width: 90,
                child: RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: '${item.totalMistakes}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text(isDark),
                        ),
                      ),
                      TextSpan(
                        text: ' (${item.uniqueMistakes} unique)',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textMuted(isDark),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

// ============ REPEATED MISTAKES ============

class _RepeatedMistakesSection extends StatelessWidget {
  final List<RepeatedMistake> repeatedMistakes;
  final bool isDark;

  const _RepeatedMistakesSection({
    required this.repeatedMistakes,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(isDark)),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: AppColors.card(isDark),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              border: Border(
                bottom: BorderSide(color: AppColors.border(isDark)),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Repeated Mistakes',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text(isDark),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0x33EF4444), // red-500/20
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${repeatedMistakes.length} words',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFFF87171), // red-400
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Content
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card(isDark),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(12)),
            ),
            child: repeatedMistakes.isEmpty
                ? Text(
                    'No repeated mistakes - great progress!',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary(isDark),
                    ),
                  )
                : _buildList(),
          ),
        ],
      ),
    );
  }

  Widget _buildList() {
    return Column(
      children: repeatedMistakes.asMap().entries.map((entry) {
        final i = entry.key;
        final m = entry.value;
        final isLast = i == repeatedMistakes.length - 1;

        return Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            border: isLast
                ? null
                : Border(
                    bottom: BorderSide(
                      color: isDark
                          ? AppColors.slate700.withOpacity(0.5)
                          : AppColors.slate100,
                    ),
                  ),
          ),
          child: Row(
            children: [
              // Rank circle
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: const Color(0x26EF4444), // red-500/15
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  '${i + 1}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFF87171), // red-400
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Arabic word
              Expanded(
                child: Text(
                  m.wordText,
                  style: TextStyle(
                    fontSize: 18,
                    fontFamily: AppConstants.arabicFontFamily,
                    color: isDark ? AppColors.slate200 : AppColors.slate800,
                  ),
                  textDirection: TextDirection.rtl,
                ),
              ),
              // Surah:ayah
              SizedBox(
                width: 110,
                child: Text(
                  '${m.surahName} : ${m.ayahNumber}',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.textMuted(isDark),
                  ),
                ),
              ),
              // Error count
              SizedBox(
                width: 36,
                child: Text(
                  '${m.errorCount}x',
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFF87171), // red-400
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

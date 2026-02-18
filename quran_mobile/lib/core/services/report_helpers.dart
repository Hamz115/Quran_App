/// Pure helper functions for student report components.
/// Ported from web's report-helpers.ts. Only imports Flutter's Color class.

import 'dart:math' as math;
import 'package:flutter/material.dart' show Color;

import '../../data/models/student_report.dart';
import '../../data/models/report_filters.dart';

// ============ CONSTANTS ============

const Map<String, int> perfMap = {
  'excellent': 4, 'Excellent': 4,
  'very good': 3, 'Very Good': 3,
  'good': 2, 'Good': 2,
  'needs improvement': 1, 'Needs Improvement': 1,
  'needs work': 1, 'Needs Work': 1,
};

const List<String> perfLabels = ['', 'Needs Work', 'Good', 'Very Good', 'Excellent'];

// ============ JUZ BOUNDARIES ============

class _JuzBoundary {
  final int juz;
  final int startSurah;
  final int endSurah;
  const _JuzBoundary(this.juz, this.startSurah, this.endSurah);
}

const List<_JuzBoundary> _juzBoundaries = [
  _JuzBoundary(1, 1, 2),
  _JuzBoundary(2, 2, 2),
  _JuzBoundary(3, 2, 3),
  _JuzBoundary(4, 3, 4),
  _JuzBoundary(5, 4, 4),
  _JuzBoundary(6, 4, 5),
  _JuzBoundary(7, 5, 6),
  _JuzBoundary(8, 6, 7),
  _JuzBoundary(9, 7, 8),
  _JuzBoundary(10, 8, 9),
  _JuzBoundary(11, 9, 11),
  _JuzBoundary(12, 11, 12),
  _JuzBoundary(13, 12, 14),
  _JuzBoundary(14, 15, 16),
  _JuzBoundary(15, 17, 18),
  _JuzBoundary(16, 18, 20),
  _JuzBoundary(17, 21, 22),
  _JuzBoundary(18, 23, 25),
  _JuzBoundary(19, 25, 27),
  _JuzBoundary(20, 27, 29),
  _JuzBoundary(21, 29, 33),
  _JuzBoundary(22, 33, 36),
  _JuzBoundary(23, 36, 39),
  _JuzBoundary(24, 39, 41),
  _JuzBoundary(25, 41, 45),
  _JuzBoundary(26, 46, 51),
  _JuzBoundary(27, 51, 57),
  _JuzBoundary(28, 58, 66),
  _JuzBoundary(29, 67, 77),
  _JuzBoundary(30, 78, 114),
];

/// Get surah range for a given Juz number (1-30).
/// Returns null if juz is out of range.
({int startSurah, int endSurah})? getSurahRangeForJuz(int juz) {
  for (final b in _juzBoundaries) {
    if (b.juz == juz) {
      return (startSurah: b.startSurah, endSurah: b.endSurah);
    }
  }
  return null;
}

// ============ BADGE COLORS ============

/// Performance badge background color (with opacity).
Color perfBadgeColor(String perf) {
  final p = perf.toLowerCase();
  if (p == 'excellent') return const Color(0x3322C55E); // green-500/20
  if (p == 'very good') return const Color(0x3306B6D4); // cyan-500/20
  if (p == 'good') return const Color(0x33F59E0B); // amber-500/20
  return const Color(0x33EF4444); // red-500/20
}

/// Performance badge text color.
Color perfBadgeTextColor(String perf) {
  final p = perf.toLowerCase();
  if (p == 'excellent') return const Color(0xFF4ADE80); // green-400
  if (p == 'very good') return const Color(0xFF22D3EE); // cyan-400
  if (p == 'good') return const Color(0xFFFBBF24); // amber-400
  return const Color(0xFFF87171); // red-400
}

/// Mistake count badge background color (with opacity).
Color mistakeCountColor(int count) {
  if (count <= 2) return const Color(0x2622C55E); // green-500/15
  if (count <= 5) return const Color(0x26F59E0B); // amber-500/15
  return const Color(0x26EF4444); // red-500/15
}

/// Mistake count badge text color.
Color mistakeCountTextColor(int count) {
  if (count <= 2) return const Color(0xFF4ADE80); // green-400
  if (count <= 5) return const Color(0xFFFBBF24); // amber-400
  return const Color(0xFFF87171); // red-400
}

/// Portion tag background color.
Color portionTagColor(String type) {
  final t = type.toLowerCase();
  if (t == 'hifz') return const Color(0x1A3B82F6); // blue-500/10
  if (t == 'sabqi') return const Color(0x1A06B6D4); // cyan-500/10
  return const Color(0x1A64748B); // slate-500/10
}

/// Portion tag text color.
Color portionTagTextColor(String type) {
  final t = type.toLowerCase();
  if (t == 'hifz') return const Color(0xFF60A5FA); // blue-400
  if (t == 'sabqi') return const Color(0xFF22D3EE); // cyan-400
  return const Color(0xFF94A3B8); // slate-400
}

/// Portion tag border color.
Color portionTagBorderColor(String type) {
  final t = type.toLowerCase();
  if (t == 'hifz') return const Color(0x333B82F6); // blue-500/20
  if (t == 'sabqi') return const Color(0x3306B6D4); // cyan-500/20
  return const Color(0x3364748B); // slate-500/20
}

// ============ FORMATTERS ============

/// Format ISO date string to "15 Feb 2026" style.
String formatReportDate(String dateStr) {
  try {
    final date = DateTime.parse(dateStr);
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${date.day} ${months[date.month - 1]} ${date.year}';
  } catch (_) {
    return dateStr;
  }
}

/// Get date range for a preset period.
({String from, String to}) getDatePresetRange(DatePreset preset) {
  final now = DateTime.now();
  final to = now.toIso8601String().substring(0, 10);
  if (preset == DatePreset.all) return (from: '', to: '');
  final months = switch (preset) {
    DatePreset.oneMonth => 1,
    DatePreset.twoMonths => 2,
    DatePreset.sixMonths => 6,
    DatePreset.all => 0,
  };
  final from = DateTime(now.year, now.month - months, now.day);
  return (from: from.toIso8601String().substring(0, 10), to: to);
}

// ============ STATISTICS ============

/// Compute performance stats from a list of classes.
PerformanceStats computePerformanceStats(List<StudentClass> classes) {
  final sorted = classes
      .where((c) => c.performance != null && c.performance!.isNotEmpty && c.date.isNotEmpty)
      .toList()
    ..sort((a, b) => a.date.compareTo(b.date));

  // Current streak (Very Good or above from most recent)
  int currentStreak = 0;
  for (int i = sorted.length - 1; i >= 0; i--) {
    final score = perfMap[sorted[i].performance ?? ''] ?? 0;
    if (score >= 3) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Best streak
  int bestStreak = 0;
  int bestStart = 0;
  int bestEnd = 0;
  int streak = 0;
  int streakStart = 0;
  for (int i = 0; i < sorted.length; i++) {
    final score = perfMap[sorted[i].performance ?? ''] ?? 0;
    if (score >= 3) {
      if (streak == 0) streakStart = i;
      streak++;
      if (streak > bestStreak) {
        bestStreak = streak;
        bestStart = streakStart;
        bestEnd = i;
      }
    } else {
      streak = 0;
    }
  }
  final bestStreakRange = bestStreak > 0 && bestStart < sorted.length && bestEnd < sorted.length
      ? '${formatReportDate(sorted[bestStart].date)} - ${formatReportDate(sorted[bestEnd].date)}'
      : '';

  // Mistakes per class
  final totalMistakes = sorted.fold<int>(0, (sum, c) => sum + c.mistakeCount);
  final mistakesPerClass = sorted.isNotEmpty
      ? (totalMistakes / sorted.length * 10).roundToDouble() / 10
      : 0.0;

  // Sparkline data (last 12 classes)
  final recent = sorted.length > 12 ? sorted.sublist(sorted.length - 12) : sorted;
  final maxMistakes = recent.fold<int>(1, (m, c) => math.max(m, c.mistakeCount));
  final mistakeSparkline = recent.map((c) => (c.mistakeCount / maxMistakes) * 100).toList();

  // Trend: compare last 4 vs previous 4
  String trend = 'stable';
  if (sorted.length >= 4) {
    final last4 = sorted.sublist(sorted.length - 4);
    final prev4Start = math.max(0, sorted.length - 8);
    final prev4 = sorted.sublist(prev4Start, sorted.length - 4);
    if (prev4.length >= 2) {
      final avgLast = last4.fold<int>(0, (s, c) => s + (perfMap[c.performance ?? ''] ?? 0)) / last4.length;
      final avgPrev = prev4.fold<int>(0, (s, c) => s + (perfMap[c.performance ?? ''] ?? 0)) / prev4.length;
      if (avgLast > avgPrev + 0.3) {
        trend = 'improving';
      } else if (avgLast < avgPrev - 0.3) {
        trend = 'declining';
      }
    }
  }

  return PerformanceStats(
    currentStreak: currentStreak,
    bestStreak: bestStreak,
    bestStreakRange: bestStreakRange,
    mistakesPerClass: mistakesPerClass,
    mistakeSparkline: mistakeSparkline,
    trend: trend,
  );
}

// ============ FILTERING ============

/// Apply report filters to a StudentReport, returning a filtered copy.
StudentReport applyReportFilters(StudentReport report, ReportFilters filters) {
  int? effectiveSurahFrom = filters.surahFrom;
  int? effectiveSurahTo = filters.surahTo;

  // Juz overrides surah filter
  if (filters.juz != null) {
    final range = getSurahRangeForJuz(filters.juz!);
    if (range != null) {
      effectiveSurahFrom = range.startSurah;
      effectiveSurahTo = range.endSurah;
    }
  }

  // Filter classes by date
  var filteredClasses = List<StudentClass>.from(report.classes);
  if (filters.dateFrom.isNotEmpty) {
    filteredClasses = filteredClasses.where((c) => c.date.compareTo(filters.dateFrom) >= 0).toList();
  }
  if (filters.dateTo.isNotEmpty) {
    filteredClasses = filteredClasses.where((c) => c.date.compareTo(filters.dateTo) <= 0).toList();
  }

  // Filter classes by surah range (check if any assignment overlaps)
  if (effectiveSurahFrom != null || effectiveSurahTo != null) {
    final from = effectiveSurahFrom ?? 1;
    final to = effectiveSurahTo ?? 114;
    filteredClasses = filteredClasses.where((c) =>
        c.assignments.isEmpty ||
        c.assignments.any((a) => a.startSurah <= to && a.endSurah >= from)).toList();
  }

  // Filter mistakes by surah range
  var filteredMistakesBySurah = List<MistakeBySurah>.from(report.mistakesBySurah);
  var filteredRepeated = List<RepeatedMistake>.from(report.repeatedMistakes);
  if (effectiveSurahFrom != null || effectiveSurahTo != null) {
    final from = effectiveSurahFrom ?? 1;
    final to = effectiveSurahTo ?? 114;
    filteredMistakesBySurah = filteredMistakesBySurah
        .where((m) => m.surahNumber >= from && m.surahNumber <= to)
        .toList();
    filteredRepeated = filteredRepeated
        .where((m) => m.surahNumber >= from && m.surahNumber <= to)
        .toList();
  }

  // Filter performance trend by date
  var filteredPerf = List<PerformanceDataPoint>.from(report.performanceTrend);
  if (filters.dateFrom.isNotEmpty) {
    filteredPerf = filteredPerf.where((p) => p.date.compareTo(filters.dateFrom) >= 0).toList();
  }
  if (filters.dateTo.isNotEmpty) {
    filteredPerf = filteredPerf.where((p) => p.date.compareTo(filters.dateTo) <= 0).toList();
  }

  // Also filter per-class mistakes by surah range
  if (effectiveSurahFrom != null || effectiveSurahTo != null) {
    final from = effectiveSurahFrom ?? 1;
    final to = effectiveSurahTo ?? 114;
    filteredClasses = filteredClasses.map((c) {
      final filtered = c.mistakes.where((m) => m.surahNumber >= from && m.surahNumber <= to).toList();
      return c.copyWith(mistakes: filtered, mistakeCount: filtered.length);
    }).toList();
  }

  // Recompute summary from filtered data
  final totalMistakes = filteredMistakesBySurah.fold<int>(0, (s, m) => s + m.totalMistakes);
  final uniqueMistakes = filteredMistakesBySurah.fold<int>(0, (s, m) => s + m.uniqueMistakes);

  final perfScores = filteredClasses
      .map((c) => perfMap[c.performance ?? ''] ?? 0)
      .where((s) => s > 0)
      .toList();
  final avgPerfScore = perfScores.isNotEmpty
      ? (perfScores.reduce((a, b) => a + b) / perfScores.length).round()
      : 0;

  return report.copyWith(
    classes: filteredClasses,
    mistakesBySurah: filteredMistakesBySurah,
    repeatedMistakes: filteredRepeated,
    performanceTrend: filteredPerf,
    summary: ReportSummary(
      totalClasses: filteredClasses.length,
      totalMistakes: totalMistakes,
      uniqueMistakes: uniqueMistakes,
      repeatedMistakes: filteredRepeated.length,
      avgPerformance: (avgPerfScore >= 0 && avgPerfScore < perfLabels.length)
          ? perfLabels[avgPerfScore]
          : 'N/A',
    ),
  );
}

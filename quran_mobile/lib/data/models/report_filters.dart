/// Report filter and performance stats models.
/// Mirrors web's report-types.ts: ReportFilters, DatePreset, PerformanceStats.

enum DatePreset { oneMonth, twoMonths, sixMonths, all }

class ReportFilters {
  final String dateFrom;
  final String dateTo;
  final DatePreset datePreset;
  final int? surahFrom;
  final int? surahTo;
  final int? juz;

  const ReportFilters({
    this.dateFrom = '',
    this.dateTo = '',
    this.datePreset = DatePreset.all,
    this.surahFrom,
    this.surahTo,
    this.juz,
  });

  ReportFilters copyWith({
    String? dateFrom,
    String? dateTo,
    DatePreset? datePreset,
    int? surahFrom,
    int? surahTo,
    int? juz,
    bool clearSurahFrom = false,
    bool clearSurahTo = false,
    bool clearJuz = false,
  }) {
    return ReportFilters(
      dateFrom: dateFrom ?? this.dateFrom,
      dateTo: dateTo ?? this.dateTo,
      datePreset: datePreset ?? this.datePreset,
      surahFrom: clearSurahFrom ? null : (surahFrom ?? this.surahFrom),
      surahTo: clearSurahTo ? null : (surahTo ?? this.surahTo),
      juz: clearJuz ? null : (juz ?? this.juz),
    );
  }

  /// Whether any filter is active (not the default "all" state).
  bool get isActive =>
      dateFrom.isNotEmpty ||
      dateTo.isNotEmpty ||
      datePreset != DatePreset.all ||
      surahFrom != null ||
      surahTo != null ||
      juz != null;
}

class PerformanceStats {
  final int currentStreak;
  final int bestStreak;
  final String bestStreakRange;
  final double mistakesPerClass;
  final List<double> mistakeSparkline;
  final String trend; // 'improving', 'declining', 'stable'

  const PerformanceStats({
    required this.currentStreak,
    required this.bestStreak,
    required this.bestStreakRange,
    required this.mistakesPerClass,
    required this.mistakeSparkline,
    required this.trend,
  });

  PerformanceStats copyWith({
    int? currentStreak,
    int? bestStreak,
    String? bestStreakRange,
    double? mistakesPerClass,
    List<double>? mistakeSparkline,
    String? trend,
  }) {
    return PerformanceStats(
      currentStreak: currentStreak ?? this.currentStreak,
      bestStreak: bestStreak ?? this.bestStreak,
      bestStreakRange: bestStreakRange ?? this.bestStreakRange,
      mistakesPerClass: mistakesPerClass ?? this.mistakesPerClass,
      mistakeSparkline: mistakeSparkline ?? this.mistakeSparkline,
      trend: trend ?? this.trend,
    );
  }
}

// Pure helper functions and constants for student report components
// ZERO React imports — pure TypeScript only

import type {
  StudentReport, StudentClass, ReportFilters,
  PerformanceStats, DatePreset
} from '../../lib/report-types';
import { getSurahRangeForJuz } from '../../lib/quran-utils';

// ============ CONSTANTS ============

export const PERF_MAP: Record<string, number> = {
  'excellent': 4, 'Excellent': 4,
  'very good': 3, 'Very Good': 3,
  'good': 2, 'Good': 2,
  'needs improvement': 1, 'Needs Improvement': 1,
  'needs work': 1, 'Needs Work': 1
};

export const PERF_LABELS = ['', 'Needs Work', 'Good', 'Very Good', 'Excellent'];

// ============ BADGE CLASS GENERATORS ============

export function perfBadgeClasses(perf: string): string {
  const p = perf.toLowerCase();
  if (p === 'excellent') return 'bg-green-500/20 text-green-400';
  if (p === 'very good') return 'bg-cyan-500/20 text-cyan-400';
  if (p === 'good') return 'bg-amber-500/20 text-amber-400';
  return 'bg-red-500/20 text-red-400';
}

export function mistakeCountClasses(count: number): string {
  if (count <= 10) return 'bg-green-500/15 text-green-400';
  if (count <= 20) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

export function portionTagClasses(type: string): string {
  const t = type.toLowerCase();
  if (t === 'hifz') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (t === 'sabqi') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

// ============ FORMATTERS ============

export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

export function getDatePresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (preset === 'all') return { from: '', to: '' };
  const months = preset === '1m' ? 1 : preset === '2m' ? 2 : 6;
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  return { from: from.toISOString().slice(0, 10), to };
}

// ============ STATISTICS ============

export function computePerformanceStats(classes: StudentClass[]): PerformanceStats {
  const sorted = [...classes]
    .filter(c => c.performance && c.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Current streak (Very Good or above from most recent)
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const score = PERF_MAP[sorted[i].performance || ''] || 0;
    if (score >= 3) currentStreak++;
    else break;
  }

  // Best streak
  let bestStreak = 0;
  let bestStart = 0;
  let bestEnd = 0;
  let streak = 0;
  let streakStart = 0;
  for (let i = 0; i < sorted.length; i++) {
    const score = PERF_MAP[sorted[i].performance || ''] || 0;
    if (score >= 3) {
      if (streak === 0) streakStart = i;
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
  const bestStreakRange = bestStreak > 0 && sorted[bestStart] && sorted[bestEnd]
    ? `${formatDate(sorted[bestStart].date)} - ${formatDate(sorted[bestEnd].date)}`
    : '';

  // Mistakes per class
  const totalMistakes = sorted.reduce((sum, c) => sum + c.mistake_count, 0);
  const mistakesPerClass = sorted.length > 0
    ? Math.round((totalMistakes / sorted.length) * 10) / 10
    : 0;

  // Sparkline data (last 12 classes)
  const recent = sorted.slice(-12);
  const maxMistakes = Math.max(...recent.map(c => c.mistake_count), 1);
  const mistakeSparkline = recent.map(c => (c.mistake_count / maxMistakes) * 100);

  // Trend: compare last 4 vs previous 4
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (sorted.length >= 4) {
    const last4 = sorted.slice(-4);
    const prev4 = sorted.slice(-8, -4);
    if (prev4.length >= 2) {
      const avgLast = last4.reduce((s, c) => s + (PERF_MAP[c.performance || ''] || 0), 0) / last4.length;
      const avgPrev = prev4.reduce((s, c) => s + (PERF_MAP[c.performance || ''] || 0), 0) / prev4.length;
      if (avgLast > avgPrev + 0.3) trend = 'improving';
      else if (avgLast < avgPrev - 0.3) trend = 'declining';
    }
  }

  return { currentStreak, bestStreak, bestStreakRange, mistakesPerClass, mistakeSparkline, trend };
}

// ============ FILTERING ============

export function applyReportFilters(report: StudentReport, filters: ReportFilters): StudentReport {
  let effectiveSurahFrom = filters.surahFrom;
  let effectiveSurahTo = filters.surahTo;

  // Juz overrides surah filter
  if (filters.juz) {
    const range = getSurahRangeForJuz(filters.juz);
    if (range) {
      effectiveSurahFrom = range.startSurah;
      effectiveSurahTo = range.endSurah;
    }
  }

  // Filter classes by date
  let filteredClasses = [...report.classes];
  if (filters.dateFrom) {
    filteredClasses = filteredClasses.filter(c => c.date >= filters.dateFrom);
  }
  if (filters.dateTo) {
    filteredClasses = filteredClasses.filter(c => c.date <= filters.dateTo);
  }

  // Filter classes by surah range (check if any assignment overlaps)
  if (effectiveSurahFrom !== null || effectiveSurahTo !== null) {
    const from = effectiveSurahFrom ?? 1;
    const to = effectiveSurahTo ?? 114;
    filteredClasses = filteredClasses.filter(c =>
      c.assignments.length === 0 || c.assignments.some(a =>
        a.start_surah <= to && a.end_surah >= from
      )
    );
  }

  // Filter mistakes by surah range
  let filteredMistakesBySurah = [...report.mistakes_by_surah];
  let filteredRepeated = [...report.repeated_mistakes];
  if (effectiveSurahFrom !== null || effectiveSurahTo !== null) {
    const from = effectiveSurahFrom ?? 1;
    const to = effectiveSurahTo ?? 114;
    filteredMistakesBySurah = filteredMistakesBySurah.filter(
      m => m.surah_number >= from && m.surah_number <= to
    );
    filteredRepeated = filteredRepeated.filter(
      m => m.surah_number >= from && m.surah_number <= to
    );
  }

  // Filter performance trend by date
  let filteredPerf = [...report.performance_trend];
  if (filters.dateFrom) {
    filteredPerf = filteredPerf.filter(p => p.date >= filters.dateFrom);
  }
  if (filters.dateTo) {
    filteredPerf = filteredPerf.filter(p => p.date <= filters.dateTo);
  }

  // Also filter per-class mistakes by surah range
  if (effectiveSurahFrom !== null || effectiveSurahTo !== null) {
    const from = effectiveSurahFrom ?? 1;
    const to = effectiveSurahTo ?? 114;
    filteredClasses = filteredClasses.map(c => ({
      ...c,
      mistakes: c.mistakes.filter(m => m.surah_number >= from && m.surah_number <= to),
      mistake_count: c.mistakes.filter(m => m.surah_number >= from && m.surah_number <= to).length
    }));
  }

  // Recompute summary from filtered data
  const totalMistakes = filteredMistakesBySurah.reduce((s, m) => s + m.total_mistakes, 0);
  const uniqueMistakes = filteredMistakesBySurah.reduce((s, m) => s + m.unique_mistakes, 0);

  const perfScores = filteredClasses
    .map(c => PERF_MAP[c.performance || ''] || 0)
    .filter(s => s > 0);
  const avgPerfScore = perfScores.length > 0
    ? Math.round(perfScores.reduce((a, b) => a + b, 0) / perfScores.length)
    : 0;

  return {
    ...report,
    classes: filteredClasses,
    mistakes_by_surah: filteredMistakesBySurah,
    repeated_mistakes: filteredRepeated,
    performance_trend: filteredPerf,
    summary: {
      total_classes: filteredClasses.length,
      total_mistakes: totalMistakes,
      unique_mistakes: uniqueMistakes,
      repeated_mistakes: filteredRepeated.length,
      avg_performance: PERF_LABELS[avgPerfScore] || 'N/A'
    }
  };
}

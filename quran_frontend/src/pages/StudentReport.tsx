import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getStudentReport } from '../lib/supabase-api';
import { surahNames, getSurahRangeForJuz } from '../lib/quran-utils';
import type {
  StudentReport, StudentClass, ReportFilters, ExportConfig,
  PerformanceStats, DatePreset
} from '../lib/report-types';
import { exportToPDF, exportToCSV, exportToWord } from '../lib/report-export';

// ============ HELPERS ============

const PERF_MAP: Record<string, number> = {
  'excellent': 4, 'Excellent': 4,
  'very good': 3, 'Very Good': 3,
  'good': 2, 'Good': 2,
  'needs improvement': 1, 'Needs Improvement': 1,
  'needs work': 1, 'Needs Work': 1
};

const PERF_LABELS = ['', 'Needs Work', 'Good', 'Very Good', 'Excellent'];

function perfBadgeClasses(perf: string): string {
  const p = perf.toLowerCase();
  if (p === 'excellent') return 'bg-green-500/20 text-green-400';
  if (p === 'very good') return 'bg-cyan-500/20 text-cyan-400';
  if (p === 'good') return 'bg-amber-500/20 text-amber-400';
  return 'bg-red-500/20 text-red-400';
}

function mistakeCountClasses(count: number): string {
  if (count <= 2) return 'bg-green-500/15 text-green-400';
  if (count <= 5) return 'bg-amber-500/15 text-amber-400';
  return 'bg-red-500/15 text-red-400';
}

function portionTagClasses(type: string): string {
  const t = type.toLowerCase();
  if (t === 'hifz') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (t === 'sabqi') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
}

function getDatePresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (preset === 'all') return { from: '', to: '' };
  const months = preset === '1m' ? 1 : preset === '2m' ? 2 : 6;
  const from = new Date(now);
  from.setMonth(from.getMonth() - months);
  return { from: from.toISOString().slice(0, 10), to };
}

function computePerformanceStats(classes: StudentClass[]): PerformanceStats {
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

// ============ MAIN COMPONENT ============

export default function StudentReportPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'classes' | 'mistakes' | 'performance'>('classes');
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '', dateTo: '', datePreset: 'all',
    surahFrom: null, surahTo: null, juz: null
  });
  const [showExportModal, setShowExportModal] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    let isMounted = true;
    async function loadReport() {
      try {
        const data = await getStudentReport(studentId!);
        if (isMounted) setReport(data);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReport();
    return () => { isMounted = false; };
  }, [studentId]);

  // Client-side filtering
  const filteredReport = useMemo(() => {
    if (!report) return null;

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
  }, [report, filters]);

  const performanceStats = useMemo(() => {
    if (!filteredReport) return null;
    return computePerformanceStats(filteredReport.classes);
  }, [filteredReport]);

  // Filter handlers
  function handlePreset(preset: DatePreset) {
    const range = getDatePresetRange(preset);
    setFilters(f => ({ ...f, datePreset: preset, dateFrom: range.from, dateTo: range.to }));
  }

  function handleJuzChange(juz: number | null) {
    if (juz) {
      const range = getSurahRangeForJuz(juz);
      setFilters(f => ({
        ...f, juz,
        surahFrom: range?.startSurah ?? null,
        surahTo: range?.endSurah ?? null
      }));
    } else {
      setFilters(f => ({ ...f, juz: null, surahFrom: null, surahTo: null }));
    }
  }

  function clearAllFilters() {
    setFilters({ dateFrom: '', dateTo: '', datePreset: 'all', surahFrom: null, surahTo: null, juz: null });
  }

  // ============ LOADING / ERROR STATES ============

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`text-lg ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Loading report...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-xl text-red-500">
          {error}
        </div>
      </div>
    );
  }

  if (!report || !filteredReport) {
    return (
      <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-xl text-red-500">
        Report not found
      </div>
    );
  }

  const bg = darkMode ? 'bg-slate-900' : 'bg-slate-50';
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';
  const inputBg = darkMode ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800';

  return (
    <div className={`-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 min-h-screen ${bg}`}>

      {/* ══ TOP BAR ══ */}
      <div className={`px-4 sm:px-8 py-3.5 ${cardBg} border-b ${borderColor} flex items-center justify-between`}>
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate(-1)}
            className={`w-8.5 h-8.5 rounded-lg border ${borderColor} flex items-center justify-center ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className={`text-lg font-bold ${textPrimary}`}>Student Report</h1>
            <p className={`text-[13px] ${textMuted}`}>
              {report.student.name} &middot; {report.student.email} &middot; Student since {formatDate(report.student.added_at)}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="px-4.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold text-[13px] flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>

      {/* ══ FILTER BAR ══ */}
      <div className={`px-4 sm:px-8 py-3.5 ${cardBg} border-b ${borderColor} flex items-center gap-4 flex-wrap`}>
        {/* Date */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${textMuted}`}>Date</span>
          <div className="flex gap-1">
            {(['1m', '2m', '6m', 'all'] as DatePreset[]).map(p => (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
                  filters.datePreset === p
                    ? 'bg-cyan-600 border-cyan-600 text-white'
                    : darkMode
                      ? 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                      : 'border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600'
                }`}
              >
                {p === '1m' ? '1 Month' : p === '2m' ? '2 Months' : p === '6m' ? '6 Months' : 'All Time'}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value, datePreset: 'all' as DatePreset }))}
            className={`px-2 py-1 rounded-md border text-xs w-[130px] ${inputBg}`}
          />
          <span className={textMuted}>&ndash;</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value, datePreset: 'all' as DatePreset }))}
            className={`px-2 py-1 rounded-md border text-xs w-[130px] ${inputBg}`}
          />
        </div>

        {/* Separator */}
        <div className={`w-px h-7 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

        {/* Surah */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${textMuted}`}>Surah</span>
          <select
            value={filters.surahFrom ?? ''}
            onChange={e => {
              const v = e.target.value ? Number(e.target.value) : null;
              setFilters(f => ({ ...f, surahFrom: v, juz: null }));
            }}
            className={`px-2.5 py-1 rounded-md border text-xs min-w-[120px] ${inputBg}`}
          >
            <option value="">From (any)</option>
            {Array.from({ length: 114 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n} &middot; {surahNames[n]}</option>
            ))}
          </select>
          <span className={textMuted}>&ndash;</span>
          <select
            value={filters.surahTo ?? ''}
            onChange={e => {
              const v = e.target.value ? Number(e.target.value) : null;
              setFilters(f => ({ ...f, surahTo: v, juz: null }));
            }}
            className={`px-2.5 py-1 rounded-md border text-xs min-w-[120px] ${inputBg}`}
          >
            <option value="">To (any)</option>
            {Array.from({ length: 114 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>{n} &middot; {surahNames[n]}</option>
            ))}
          </select>
        </div>

        {/* Separator */}
        <div className={`w-px h-7 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

        {/* Juz */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${textMuted}`}>Juz</span>
          <select
            value={filters.juz ?? ''}
            onChange={e => handleJuzChange(e.target.value ? Number(e.target.value) : null)}
            className={`px-2.5 py-1 rounded-md border text-xs min-w-[100px] ${inputBg}`}
          >
            <option value="">All Juz</option>
            {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Juz {n}</option>
            ))}
          </select>
        </div>

        <button
          onClick={clearAllFilters}
          className={`text-xs ml-auto ${textMuted} hover:underline`}
        >
          Clear all filters
        </button>
      </div>

      {/* ══ SUMMARY STRIP ══ */}
      <div className={`flex border-b ${borderColor}`} style={{ gap: '1px', background: darkMode ? '#334155' : '#e2e8f0' }}>
        {[
          { label: 'Classes', value: filteredReport.summary.total_classes, color: 'text-cyan-400' },
          { label: 'Total Mistakes', value: filteredReport.summary.total_mistakes, color: '' },
          { label: 'Unique', value: filteredReport.summary.unique_mistakes, color: '' },
          { label: 'Repeated', value: filteredReport.summary.repeated_mistakes, color: 'text-red-400' },
          { label: 'Avg Performance', value: filteredReport.summary.avg_performance, color: 'text-green-400' },
        ].map((stat, i) => (
          <div key={i} className={`flex-1 px-5 py-3.5 text-center ${cardBg}`}>
            <div className={`text-[22px] font-bold ${stat.color || textPrimary}`}>
              {stat.value}
            </div>
            <div className={`text-[11px] uppercase tracking-wide mt-0.5 ${textMuted}`}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ══ TAB NAV ══ */}
      <div className={`flex ${cardBg} border-b ${borderColor} px-4 sm:px-8`}>
        {[
          { id: 'classes' as const, label: 'Classes', count: filteredReport.summary.total_classes, countColor: 'bg-cyan-600/20 text-cyan-400' },
          { id: 'mistakes' as const, label: 'Mistakes', count: filteredReport.summary.total_mistakes, countColor: 'bg-red-500/20 text-red-400' },
          { id: 'performance' as const, label: 'Performance', count: null, countColor: '' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-[13px] font-medium relative transition-colors ${
              activeTab === tab.id
                ? 'text-cyan-400'
                : `${textMuted} hover:${darkMode ? 'text-slate-300' : 'text-slate-600'}`
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-bold ${tab.countColor}`}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute left-0 bottom-0 w-full h-0.5 bg-cyan-600 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* ══ TAB CONTENT ══ */}
      <div className="px-4 sm:px-8 py-6">

        {/* ════════════ TAB 1: CLASSES ════════════ */}
        {activeTab === 'classes' && (
          <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
            <table className="w-full border-collapse">
              <thead>
                <tr className={darkMode ? 'bg-slate-900' : 'bg-slate-50'}>
                  <th className={`w-7 py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`} />
                  <th className={`py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Date</th>
                  <th className={`py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Portions</th>
                  <th className={`py-2.5 px-3.5 text-center text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Mistakes</th>
                  <th className={`py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Performance</th>
                  <th className={`py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredReport.classes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`py-12 text-center ${textSecondary}`}>
                      No classes found for the selected filters
                    </td>
                  </tr>
                ) : (
                  [...filteredReport.classes]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(cls => {
                      const isExpanded = expandedClassId === cls.id;
                      return (
                        <ClassRow
                          key={cls.id}
                          cls={cls}
                          isExpanded={isExpanded}
                          onToggle={() => setExpandedClassId(isExpanded ? null : cls.id)}
                          darkMode={darkMode}
                          borderColor={borderColor}
                          textPrimary={textPrimary}
                          textSecondary={textSecondary}
                          textMuted={textMuted}
                        />
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ════════════ TAB 2: MISTAKES ════════════ */}
        {activeTab === 'mistakes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Mistakes by Surah */}
            <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
              <div className={`px-4.5 py-3.5 border-b ${borderColor} ${cardBg} flex items-center justify-between`}>
                <span className={`text-sm font-semibold ${textPrimary}`}>Mistakes by Surah</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-600/20 text-cyan-400">
                  {filteredReport.mistakes_by_surah.length} surahs
                </span>
              </div>
              <div className={`p-4.5 ${cardBg}`}>
                {filteredReport.mistakes_by_surah.length === 0 ? (
                  <p className={textSecondary}>No mistakes recorded</p>
                ) : (
                  <div className="space-y-2.5">
                    {filteredReport.mistakes_by_surah
                      .sort((a, b) => b.total_mistakes - a.total_mistakes)
                      .map(item => {
                        const maxVal = filteredReport.mistakes_by_surah[0]?.total_mistakes || 1;
                        const pct = (item.total_mistakes / maxVal) * 100;
                        return (
                          <div key={item.surah_number} className="flex items-center gap-2.5">
                            <div className={`w-[100px] text-xs text-right flex-shrink-0 font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                              {item.surah_name}
                            </div>
                            <div className={`flex-1 h-[22px] rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-200'} overflow-hidden`}>
                              <div
                                className="h-full rounded bg-gradient-to-r from-cyan-600 to-teal-500 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className={`w-[90px] text-[11px] ${textMuted} whitespace-nowrap`}>
                              <strong className={textPrimary}>{item.total_mistakes}</strong> ({item.unique_mistakes} unique)
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Repeated Mistakes */}
            <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
              <div className={`px-4.5 py-3.5 border-b ${borderColor} ${cardBg} flex items-center justify-between`}>
                <span className={`text-sm font-semibold ${textPrimary}`}>Repeated Mistakes</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400">
                  {filteredReport.repeated_mistakes.length} words
                </span>
              </div>
              <div className={`p-4.5 ${cardBg}`}>
                {filteredReport.repeated_mistakes.length === 0 ? (
                  <p className={textSecondary}>No repeated mistakes - great progress!</p>
                ) : (
                  <ul className="space-y-0">
                    {filteredReport.repeated_mistakes.map((m, i) => (
                      <li key={m.id} className={`flex items-center gap-3 py-2.5 ${i < filteredReport.repeated_mistakes.length - 1 ? `border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}` : ''}`}>
                        <span className="w-[26px] h-[26px] rounded-full bg-red-500/15 text-red-400 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-lg flex-1 font-['Amiri'] rtl" dir="rtl" style={{ color: darkMode ? '#e2e8f0' : '#1e293b' }}>
                          {m.word_text}
                        </span>
                        <span className={`text-[11px] w-[110px] ${textMuted}`}>
                          {m.surah_name} : {m.ayah_number}
                        </span>
                        <span className="text-[13px] font-bold text-red-400 w-9 text-right">
                          {m.error_count}x
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ TAB 3: PERFORMANCE ════════════ */}
        {activeTab === 'performance' && performanceStats && (
          <div className="grid grid-cols-1 lg:grid-cols-[5fr_2fr] gap-5">
            {/* Chart */}
            <div className={`rounded-xl border ${borderColor} ${cardBg} p-5`}>
              <h3 className={`text-sm font-semibold mb-4 ${textPrimary}`}>Performance Over Time</h3>
              {filteredReport.performance_trend.length === 0 ? (
                <p className={textSecondary}>No performance data for selected filters</p>
              ) : (
                <>
                  <div className="relative" style={{ paddingLeft: '90px' }}>
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 w-[84px] flex flex-col justify-between" style={{ height: '200px' }}>
                      {['Excellent', 'Very Good', 'Good', 'Needs Work'].map(label => (
                        <div key={label} className={`text-[11px] text-right pr-2.5 ${textMuted}`}>{label}</div>
                      ))}
                    </div>
                    {/* Plot area */}
                    <div className={`relative border-l border-b ${darkMode ? 'border-slate-600' : 'border-slate-300'}`} style={{ height: '200px' }}>
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className={`w-full border-b border-dashed ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`} />
                        ))}
                      </div>
                      {/* Bars */}
                      <div className="absolute left-0 right-0 bottom-0 flex items-end justify-around px-5" style={{ height: '200px' }}>
                        {filteredReport.performance_trend.map((entry, i) => {
                          const score = PERF_MAP[entry.performance] || 0;
                          const heights: Record<number, number> = { 4: 170, 3: 120, 2: 70, 1: 30 };
                          const gradients: Record<number, string> = {
                            4: 'from-green-400 to-green-500',
                            3: 'from-cyan-400 to-cyan-500',
                            2: 'from-amber-400 to-amber-500',
                            1: 'from-red-400 to-red-500'
                          };
                          return (
                            <div key={i} className="flex flex-col items-center" style={{ width: '40px' }}>
                              <div
                                className={`w-9 rounded-t bg-gradient-to-b ${gradients[score] || 'from-slate-400 to-slate-500'}`}
                                style={{ height: `${heights[score] || 10}px` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* X-axis labels */}
                  <div className="flex justify-around mt-2" style={{ paddingLeft: '90px' }}>
                    {filteredReport.performance_trend.map((entry, i) => (
                      <div key={i} className={`text-[10px] text-center ${textMuted}`} style={{ width: '40px' }}>
                        {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    ))}
                  </div>
                  {/* Legend */}
                  <div className={`flex gap-3.5 mt-4 pt-3.5 border-t ${borderColor}`}>
                    {[
                      { label: 'Excellent', color: 'bg-green-500' },
                      { label: 'Very Good', color: 'bg-cyan-500' },
                      { label: 'Good', color: 'bg-amber-500' },
                      { label: 'Needs Work', color: 'bg-red-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                        <span className={`text-[11px] ${textSecondary}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Stats sidebar */}
            <div className="flex flex-col gap-3">
              <div className={`rounded-xl border ${borderColor} ${cardBg} p-4`}>
                <div className={`text-[11px] uppercase tracking-wide mb-1.5 ${textMuted}`}>Current Streak</div>
                <div className="text-2xl font-bold text-green-400">{performanceStats.currentStreak} classes</div>
                <div className={`text-[11px] mt-0.5 ${textMuted}`}>Very Good or above</div>
              </div>
              <div className={`rounded-xl border ${borderColor} ${cardBg} p-4`}>
                <div className={`text-[11px] uppercase tracking-wide mb-1.5 ${textMuted}`}>Best Streak</div>
                <div className="text-2xl font-bold text-cyan-400">{performanceStats.bestStreak} classes</div>
                <div className={`text-[11px] mt-0.5 ${textMuted}`}>{performanceStats.bestStreakRange || 'N/A'}</div>
              </div>
              <div className={`rounded-xl border ${borderColor} ${cardBg} p-4`}>
                <div className={`text-[11px] uppercase tracking-wide mb-1.5 ${textMuted}`}>Mistakes / Class</div>
                <div className={`text-2xl font-bold ${textPrimary}`}>
                  {performanceStats.mistakesPerClass}
                  <span className={`text-sm font-normal ml-1 ${textMuted}`}>avg</span>
                </div>
                {/* Sparkline */}
                <div className="flex items-end gap-0.5 h-10 mt-2.5">
                  {performanceStats.mistakeSparkline.map((pct, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t bg-cyan-600"
                      style={{ height: `${Math.max(pct, 5)}%`, minHeight: '2px' }}
                    />
                  ))}
                </div>
              </div>
              <div className={`rounded-xl border ${borderColor} ${cardBg} p-4`}>
                <div className={`text-[11px] uppercase tracking-wide mb-1.5 ${textMuted}`}>Trend</div>
                <div className={`text-2xl font-bold ${
                  performanceStats.trend === 'improving' ? 'text-green-400' :
                  performanceStats.trend === 'declining' ? 'text-red-400' :
                  'text-slate-400'
                }`}>
                  {performanceStats.trend === 'improving' ? '\u2197 Improving' :
                   performanceStats.trend === 'declining' ? '\u2198 Declining' :
                   '\u2192 Stable'}
                </div>
                <div className={`text-[11px] mt-0.5 ${textMuted}`}>Last 4 vs previous 4</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ EXPORT MODAL ══ */}
      {showExportModal && (
        <ExportModal
          report={filteredReport}
          filters={filters}
          darkMode={darkMode}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

// ============ CLASS ROW SUB-COMPONENT ============

function ClassRow({
  cls, isExpanded, onToggle, darkMode, borderColor, textPrimary, textSecondary, textMuted
}: {
  cls: StudentClass;
  isExpanded: boolean;
  onToggle: () => void;
  darkMode: boolean;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}) {
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';

  return (
    <>
      <tr className={`${cardBg} transition-colors ${darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          <button
            onClick={onToggle}
            className={`p-1 rounded text-sm transition-colors ${darkMode ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-400' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
          >
            {isExpanded ? '\u25BC' : '\u25B6'}
          </button>
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          <div className={`font-semibold text-[13px] whitespace-nowrap ${textPrimary}`}>
            {formatDate(cls.date)}
            <span className={`text-[11px] font-normal ml-1.5 ${textMuted}`}>{cls.day}</span>
          </div>
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {cls.assignments.map((a, i) => (
              <span key={i}>
                {i > 0 && <span className={`text-[10px] mx-0.5 ${textMuted}`}>|</span>}
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${portionTagClasses(a.type)}`}>
                  <span className="font-bold text-[9px] tracking-wide">{a.type.toUpperCase()}</span>
                  {surahNames[a.start_surah] || `Surah ${a.start_surah}`}
                  {a.start_ayah ? ` ${a.start_ayah}` : ''}
                  {a.end_ayah && a.end_ayah !== a.start_ayah ? `-${a.end_ayah}` : ''}
                </span>
              </span>
            ))}
            {cls.assignments.length === 0 && <span className={`text-xs ${textMuted}`}>No portions</span>}
          </div>
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor} text-center`}>
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${mistakeCountClasses(cls.mistake_count)}`}>
            {cls.mistake_count}
          </span>
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          {cls.performance ? (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${perfBadgeClasses(cls.performance)}`}>
              {cls.performance}
            </span>
          ) : (
            <span className={`text-xs ${textMuted}`}>-</span>
          )}
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          <div className={`text-xs italic max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap ${textMuted}`}>
            {cls.notes || '-'}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className={`px-3.5 pb-3.5 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex gap-6 p-3.5 rounded-lg">
              <div className="flex-[2]">
                <div className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>
                  Mistakes in this class
                </div>
                {cls.mistakes.length === 0 ? (
                  <p className={`text-xs ${textSecondary}`}>No mistakes recorded for this class</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {cls.mistakes.map((m, i) => (
                      <span
                        key={`${m.id}-${i}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border ${
                          darkMode
                            ? 'bg-red-500/10 border-red-500/20 text-red-300'
                            : 'bg-red-50 border-red-200 text-red-600'
                        }`}
                      >
                        <span className="font-['Amiri'] text-[13px]" dir="rtl">{m.word_text}</span>
                        {m.surah_name}:{m.ayah_number}
                        <span className="font-bold text-[10px] text-red-400">{m.error_count}x</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>
                  Teacher Notes
                </div>
                {cls.notes ? (
                  <div className={`text-xs italic leading-relaxed p-3 rounded-md border-l-[3px] ${
                    darkMode
                      ? 'text-slate-400 bg-slate-800 border-slate-600'
                      : 'text-slate-500 bg-white border-slate-300'
                  }`}>
                    "{cls.notes}"
                  </div>
                ) : (
                  <p className={`text-xs ${textSecondary}`}>No notes</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ============ EXPORT MODAL SUB-COMPONENT ============

function ExportModal({
  report, filters, darkMode, onClose
}: {
  report: StudentReport;
  filters: ReportFilters;
  darkMode: boolean;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'word'>('pdf');
  const [sections, setSections] = useState({
    summary: true,
    classDetails: true,
    mistakesBySurah: true,
    repeatedMistakes: true,
    performanceChart: false,
    teacherNotes: false,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(s => ({ ...s, [key]: !s[key] }));
  };

  const handleExport = () => {
    const config: ExportConfig = {
      format,
      sections,
      filters,
      filteredReport: report,
    };
    if (format === 'pdf') exportToPDF(config);
    else if (format === 'csv') exportToCSV(config);
    else exportToWord(config);
    onClose();
  };

  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';

  // Filter summary text
  const filterParts: string[] = [];
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? formatDate(filters.dateFrom) : 'Start';
    const to = filters.dateTo ? formatDate(filters.dateTo) : 'Now';
    filterParts.push(`${from} - ${to}`);
  }
  if (filters.surahFrom || filters.surahTo) {
    const from = filters.surahFrom ? `${surahNames[filters.surahFrom]} (${filters.surahFrom})` : '1';
    const to = filters.surahTo ? `${surahNames[filters.surahTo]} (${filters.surahTo})` : '114';
    filterParts.push(`Surah ${from} - ${to}`);
  }
  if (filters.juz) {
    filterParts.push(`Juz ${filters.juz}`);
  }

  const sectionToggles: { key: keyof typeof sections; label: string; desc: string }[] = [
    { key: 'summary', label: 'Summary Statistics', desc: 'Classes, total/unique/repeated mistakes, avg performance' },
    { key: 'classDetails', label: 'Class-by-Class Details', desc: 'Date, portions (Hifz/Sabqi/Manzil), mistakes per class' },
    { key: 'mistakesBySurah', label: 'Mistakes by Surah', desc: 'Mistake distribution across surahs' },
    { key: 'repeatedMistakes', label: 'Repeated Mistakes', desc: 'Words missed multiple times - focus areas' },
    { key: 'performanceChart', label: 'Performance Chart', desc: 'Performance trend over time' },
    { key: 'teacherNotes', label: 'Teacher Notes', desc: 'Session notes from each class' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className={`${cardBg} rounded-xl border ${borderColor} w-full max-w-[480px] max-h-[85vh] overflow-y-auto`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b ${borderColor} flex items-center justify-between`}>
          <h2 className={`text-base font-semibold ${textPrimary}`}>Export Report</h2>
          <button onClick={onClose} className={`text-xl ${textMuted} hover:${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Filter summary */}
          {filterParts.length > 0 && (
            <div className="px-3.5 py-2.5 rounded-lg bg-cyan-600/10 border border-cyan-600/20 text-xs text-cyan-400 mb-3.5">
              Filters active: <strong>{filterParts.join(' \u00B7 ')}</strong><br />
              <span className="opacity-70">{report.summary.total_classes} classes, {report.summary.total_mistakes} mistakes in this range</span>
            </div>
          )}

          {/* Format selector */}
          <div className="flex gap-2 mb-4.5">
            {([
              { id: 'pdf' as const, label: 'PDF', icon: '\uD83D\uDCC4' },
              { id: 'csv' as const, label: 'CSV', icon: '\uD83D\uDCCA' },
              { id: 'word' as const, label: 'Word', icon: '\uD83D\uDCD1' },
            ]).map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`flex-1 py-3 rounded-lg border-2 text-center text-[13px] font-semibold transition-colors ${
                  format === f.id
                    ? 'border-cyan-600 text-cyan-400 bg-cyan-600/10'
                    : `${borderColor} ${darkMode ? 'text-slate-400 hover:border-slate-500' : 'text-slate-500 hover:border-slate-400'}`
                }`}
              >
                <span className="text-lg block mb-0.5">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Section toggles */}
          <div>
            <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Include in Report
            </h3>
            {sectionToggles.map(({ key, label, desc }) => (
              <div
                key={key}
                className={`flex items-center justify-between py-2.5 ${key !== 'teacherNotes' ? `border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}` : ''}`}
              >
                <div>
                  <div className={`text-[13px] ${textPrimary}`}>{label}</div>
                  <div className={`text-[11px] ${textMuted}`}>{desc}</div>
                </div>
                <button
                  onClick={() => toggleSection(key)}
                  className={`w-[38px] h-5 rounded-full relative transition-colors flex-shrink-0 ${
                    sections[key] ? 'bg-cyan-600' : darkMode ? 'bg-slate-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    sections[key] ? 'translate-x-[19px]' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3.5 border-t ${borderColor} flex justify-end gap-2`}>
          <button
            onClick={onClose}
            className={`px-4.5 py-2 rounded-lg font-semibold text-[13px] ${
              darkMode ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-500'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4.5 py-2 rounded-lg font-semibold text-[13px] bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
          >
            Export {format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

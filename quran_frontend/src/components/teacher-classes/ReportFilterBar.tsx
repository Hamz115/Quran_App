import type { ReportFilters, DatePreset } from '../../lib/report-types';
import { getDatePresetRange } from './report-helpers';
import { surahNames, getSurahRangeForJuz } from '../../lib/quran-utils';

interface ReportFilterBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  darkMode: boolean;
}

export default function ReportFilterBar({ filters, onFiltersChange, darkMode }: ReportFilterBarProps) {
  const inputBg = darkMode ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';

  function handlePreset(preset: DatePreset) {
    const range = getDatePresetRange(preset);
    onFiltersChange({ ...filters, datePreset: preset, dateFrom: range.from, dateTo: range.to });
  }

  function handleJuzChange(juz: number | null) {
    if (juz) {
      const range = getSurahRangeForJuz(juz);
      onFiltersChange({
        ...filters, juz,
        surahFrom: range?.startSurah ?? null,
        surahTo: range?.endSurah ?? null
      });
    } else {
      onFiltersChange({ ...filters, juz: null, surahFrom: null, surahTo: null });
    }
  }

  function clearAllFilters() {
    onFiltersChange({ dateFrom: '', dateTo: '', datePreset: 'all', surahFrom: null, surahTo: null, juz: null });
  }

  return (
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
          onChange={e => onFiltersChange({ ...filters, dateFrom: e.target.value, datePreset: 'all' as DatePreset })}
          className={`px-2 py-1 rounded-md border text-xs w-[130px] ${inputBg}`}
        />
        <span className={textMuted}>&ndash;</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => onFiltersChange({ ...filters, dateTo: e.target.value, datePreset: 'all' as DatePreset })}
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
            onFiltersChange({ ...filters, surahFrom: v, juz: null });
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
            onFiltersChange({ ...filters, surahTo: v, juz: null });
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
  );
}

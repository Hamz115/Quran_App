import type { ReportFilters, DatePreset } from '../../lib/report-types';
import { surahNames, getSurahRangeForJuz } from '../../lib/quran-utils';

interface ReportFilterBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  darkMode: boolean;
}

// Generate list of months going back ~1 year from today
function getMonthList(): { key: string; label: string; from: string; to: string }[] {
  const months: { key: string; label: string; from: string; to: string }[] = [];
  const now = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, '0')}`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    months.push({
      key,
      label: `${monthNames[month]} ${year}`,
      from: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      to: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    });
  }
  return months;
}

// Detect which month is selected based on dateFrom/dateTo
function getSelectedMonthKey(filters: ReportFilters): string | null {
  if (!filters.dateFrom || !filters.dateTo) return null;
  const fromParts = filters.dateFrom.split('-');
  const toParts = filters.dateTo.split('-');
  if (fromParts.length < 3 || toParts.length < 3) return null;
  // Check if from is 1st of month and to is last of same month
  if (fromParts[0] === toParts[0] && fromParts[1] === toParts[1] && fromParts[2] === '01') {
    return `${fromParts[0]}-${fromParts[1]}`;
  }
  return null;
}

export default function ReportFilterBar({ filters, onFiltersChange, darkMode }: ReportFilterBarProps) {
  const inputBg = darkMode ? 'bg-slate-900 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-800';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';

  const monthList = getMonthList();
  const recentMonths = monthList.slice(0, 3); // Last 3 months
  const olderMonths = monthList.slice(3); // Remaining 9
  const selectedMonthKey = getSelectedMonthKey(filters);
  const isAllSelected = filters.datePreset === 'all' && !filters.dateFrom && !filters.dateTo;

  function handleMonthClick(month: { from: string; to: string }) {
    onFiltersChange({ ...filters, dateFrom: month.from, dateTo: month.to, datePreset: 'all' as DatePreset });
  }

  function handleAllClick() {
    onFiltersChange({ ...filters, dateFrom: '', dateTo: '', datePreset: 'all' });
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

  const pillBase = `px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors`;
  const pillActive = 'bg-cyan-600 text-white';
  const pillInactive = darkMode
    ? 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-600';

  return (
    <div className={`${cardBg} border-b ${borderColor} px-4 sm:px-6 py-3.5 space-y-3`}>
      {/* Row 1: Month pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-semibold uppercase tracking-wide w-12 ${textMuted}`}>Month</span>
        <button
          onClick={handleAllClick}
          className={`${pillBase} ${isAllSelected ? pillActive : pillInactive}`}
        >
          All
        </button>
        {recentMonths.map(m => (
          <button
            key={m.key}
            onClick={() => handleMonthClick(m)}
            className={`${pillBase} ${selectedMonthKey === m.key ? pillActive : pillInactive}`}
          >
            {m.label}
          </button>
        ))}
        {olderMonths.length > 0 && (
          <select
            value={olderMonths.some(m => m.key === selectedMonthKey) ? selectedMonthKey || '' : ''}
            onChange={e => {
              const month = olderMonths.find(m => m.key === e.target.value);
              if (month) handleMonthClick(month);
            }}
            className={`${pillBase} ${
              olderMonths.some(m => m.key === selectedMonthKey)
                ? 'bg-cyan-600 text-white border-cyan-600'
                : darkMode ? 'bg-slate-700/50 text-slate-400 border-slate-600' : 'bg-slate-100 text-slate-500 border-slate-300'
            } border cursor-pointer`}
          >
            <option value="">Older months...</option>
            {olderMonths.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Row 2: Surah + Juz + Clear */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`text-[11px] font-semibold uppercase tracking-wide w-12 ${textMuted}`}>Surah</span>
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

        <div className={`w-px h-5 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

        <span className={`text-[11px] font-semibold uppercase tracking-wide ${textMuted}`}>Juz</span>
        <select
          value={filters.juz ?? ''}
          onChange={e => handleJuzChange(e.target.value ? Number(e.target.value) : null)}
          className={`px-2.5 py-1 rounded-md border text-xs min-w-[80px] ${inputBg}`}
        >
          <option value="">All</option>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Juz {n}</option>
          ))}
        </select>

        <button
          onClick={clearAllFilters}
          className={`text-xs ml-auto ${textMuted} hover:underline`}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

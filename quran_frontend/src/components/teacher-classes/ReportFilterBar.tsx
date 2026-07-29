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

export default function ReportFilterBar({ filters, onFiltersChange }: ReportFilterBarProps) {
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

  return (
    <section className="report-filter-panel">
      <div className="report-filter-heading">
        <div><span>Filter the record</span><strong>Choose a period or Quran range</strong></div>
        <button onClick={clearAllFilters}>Reset filters</button>
      </div>

      <div className="report-month-filter">
        <span>Period</span>
        <button onClick={handleAllClick} className={isAllSelected ? 'active' : ''}>All history</button>
        {recentMonths.map(m => (
          <button key={m.key} onClick={() => handleMonthClick(m)} className={selectedMonthKey === m.key ? 'active' : ''}>
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
          >
            <option value="">Earlier period</option>
            {olderMonths.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        )}
      </div>

      <div className="report-range-filter">
        <label>
          <span>From Surah</span>
          <select value={filters.surahFrom ?? ''} onChange={e => {
            const v = e.target.value ? Number(e.target.value) : null;
            onFiltersChange({ ...filters, surahFrom: v, juz: null });
          }}>
            <option value="">Any beginning</option>
            {Array.from({ length: 114 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} · {surahNames[n]}</option>)}
          </select>
        </label>
        <label>
          <span>To Surah</span>
          <select value={filters.surahTo ?? ''} onChange={e => {
            const v = e.target.value ? Number(e.target.value) : null;
            onFiltersChange({ ...filters, surahTo: v, juz: null });
          }}>
            <option value="">Any ending</option>
            {Array.from({ length: 114 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} · {surahNames[n]}</option>)}
          </select>
        </label>
        <label>
          <span>Juz</span>
          <select value={filters.juz ?? ''} onChange={e => handleJuzChange(e.target.value ? Number(e.target.value) : null)}>
            <option value="">All Juz</option>
            {Array.from({ length: 30 }, (_, i) => i + 1).map(n => <option key={n} value={n}>Juz {n}</option>)}
          </select>
        </label>
      </div>
    </section>
  );
}

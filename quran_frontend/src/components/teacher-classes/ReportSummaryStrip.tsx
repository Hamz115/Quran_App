import type { StudentReport } from '../../lib/report-types';

interface ReportSummaryStripProps {
  summary: StudentReport['summary'];
  darkMode: boolean;
}

export default function ReportSummaryStrip({ summary, darkMode }: ReportSummaryStripProps) {
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';

  const stats = [
    { label: 'Sessions', value: summary.total_classes, color: 'text-cyan-400' },
    { label: 'Total Mistakes', value: summary.total_mistakes, color: '' },
    { label: 'Unique', value: summary.unique_mistakes, color: '' },
    { label: 'Repeated', value: summary.repeated_mistakes, color: 'text-red-400' },
    { label: 'Avg Performance', value: summary.avg_performance, color: 'text-green-400' },
  ];

  return (
    <div className={`flex overflow-x-auto border-b ${borderColor}`} style={{ gap: '1px', background: darkMode ? '#334155' : '#e2e8f0' }}>
      {stats.map((stat, i) => (
        <div key={i} className={`flex-1 min-w-[80px] px-3 sm:px-5 py-3.5 text-center ${cardBg}`}>
          <div className={`text-lg sm:text-[22px] font-bold ${stat.color || textPrimary}`}>
            {stat.value}
          </div>
          <div className={`text-[10px] sm:text-[11px] uppercase tracking-wide mt-0.5 ${textMuted}`}>
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

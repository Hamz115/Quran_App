import type { StudentReport } from '../../lib/report-types';

interface ReportSummaryStripProps {
  summary: StudentReport['summary'];
  darkMode: boolean;
}

export default function ReportSummaryStrip({ summary }: ReportSummaryStripProps) {
  const stats = [
    { label: 'Sessions held', value: summary.total_classes, tone: 'emerald' },
    { label: 'Mistakes marked', value: summary.total_mistakes, tone: 'ink' },
    { label: 'Unique words', value: summary.unique_mistakes, tone: 'gold' },
    { label: 'Repeated words', value: summary.repeated_mistakes, tone: 'rose' },
    { label: 'Average performance', value: summary.avg_performance, tone: 'emerald' },
  ];

  return (
    <section className="report-metric-grid" aria-label="Report summary">
      {stats.map((stat) => (
        <article key={stat.label} className={`report-metric-card ${stat.tone}`}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
        </article>
      ))}
    </section>
  );
}

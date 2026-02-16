import { useState } from 'react';
import type { StudentReport, ReportFilters, ExportConfig } from '../../lib/report-types';
import { formatDate } from './report-helpers';
import { exportToPDF, exportToCSV, exportToWord } from '../../lib/report-export';
import { surahNames } from '../../lib/quran-utils';

interface ExportModalProps {
  report: StudentReport;
  filters: ReportFilters;
  darkMode: boolean;
  onClose: () => void;
}

export default function ExportModal({ report, filters, darkMode, onClose }: ExportModalProps) {
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

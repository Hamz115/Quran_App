import { useState } from 'react';
import { saveAs } from 'file-saver';
import type { StudentReport, ReportFilters, ExportConfig } from '../../lib/report-types';
import { formatDate } from './report-helpers';
import { exportToPDFBackend, exportToCSV, exportToWord } from '../../lib/report-export';
import { surahNames } from '../../lib/quran-utils';

interface ExportModalProps {
  report: StudentReport;
  filters: ReportFilters;
  darkMode: boolean;
  onClose: () => void;
}

type ExportState = 'idle' | 'loading' | 'error';

export default function ExportModal({ report, filters, darkMode, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'word'>('pdf');
  const [exportState, setExportState] = useState<ExportState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [sections, setSections] = useState({
    summary: true,
    classDetails: true,
    mistakesBySurah: true,
    repeatedMistakes: true,
    performanceChart: true,
    teacherNotes: true,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections(s => ({ ...s, [key]: !s[key] }));
  };

  const handleExport = async () => {
    const config: ExportConfig = {
      format,
      sections,
      filters,
      filteredReport: report,
    };

    if (format === 'csv') {
      exportToCSV(config);
      onClose();
      return;
    }
    if (format === 'word') {
      await exportToWord(config);
      onClose();
      return;
    }

    // PDF: use backend Playwright
    setExportState('loading');
    setErrorMessage('');

    try {
      const { blob, filename } = await exportToPDFBackend(config);
      saveAs(blob, filename);
      onClose();
    } catch (err) {
      const message = err instanceof DOMException && err.name === 'AbortError'
        ? 'Request timed out. The server may be busy — please try again.'
        : err instanceof Error
          ? err.message
          : 'An unexpected error occurred';
      setErrorMessage(message);
      setExportState('error');
    }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={exportState !== 'loading' ? onClose : undefined}
    >
      <div
        className={`${cardBg} rounded-2xl border ${borderColor} w-full max-w-[540px] max-h-[85vh] flex flex-col shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b ${borderColor} flex items-center justify-between flex-shrink-0`}>
          <h2 className={`text-lg font-bold ${textPrimary}`}>Export Report</h2>
          <button
            onClick={onClose}
            disabled={exportState === 'loading'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${
              exportState === 'loading'
                ? 'opacity-30 cursor-not-allowed'
                : darkMode ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
          >
            &times;
          </button>
        </div>

        {/* Body — Loading state */}
        {exportState === 'loading' && (
          <div className="px-6 py-16 flex flex-col items-center justify-center flex-1 min-h-[300px]">
            <div className="w-10 h-10 border-[3px] border-cyan-600/30 border-t-cyan-600 rounded-full animate-spin mb-5" />
            <div className={`text-base font-semibold ${textPrimary}`}>Generating your report...</div>
            <div className={`text-xs mt-2 ${textMuted}`}>This may take a few seconds</div>
          </div>
        )}

        {/* Body — Error state */}
        {exportState === 'error' && (
          <div className="px-6 py-16 flex flex-col items-center justify-center flex-1 min-h-[300px]">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className={`text-base font-semibold ${textPrimary} mb-1`}>Export Failed</div>
            <div className={`text-xs text-center max-w-[360px] ${textMuted} mb-5`}>{errorMessage}</div>
            <button
              onClick={() => { setExportState('idle'); setErrorMessage(''); }}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-cyan-600 hover:bg-cyan-700 text-white transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Body — Idle state (normal form) */}
        {exportState === 'idle' && (
          <>
            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
              {/* Filter summary */}
              {filterParts.length > 0 && (
                <div className="px-4 py-3 rounded-xl bg-cyan-600/10 border border-cyan-600/20 text-xs text-cyan-400">
                  Filters active: <strong>{filterParts.join(' \u00B7 ')}</strong><br />
                  <span className="opacity-70">{report.summary.total_classes} classes, {report.summary.total_mistakes} mistakes in this range</span>
                </div>
              )}

              {/* Format selector */}
              <div>
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Format
                </h3>
                <div className="flex gap-3">
                  {([
                    { id: 'pdf' as const, label: 'PDF', icon: '\uD83D\uDCC4' },
                    { id: 'csv' as const, label: 'CSV', icon: '\uD83D\uDCCA' },
                    { id: 'word' as const, label: 'Word', icon: '\uD83D\uDCD1' },
                  ]).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className={`flex-1 py-4 rounded-xl border-2 text-center font-semibold transition-all ${
                        format === f.id
                          ? 'border-cyan-600 text-cyan-400 bg-cyan-600/10 scale-[1.02]'
                          : `${borderColor} ${darkMode ? 'text-slate-400 hover:border-slate-500 hover:bg-slate-700/50' : 'text-slate-500 hover:border-slate-400 hover:bg-slate-50'}`
                      }`}
                    >
                      <span className="text-2xl block mb-1">{f.icon}</span>
                      <span className="text-sm">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section toggles */}
              <div>
                <h3 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Include in Report
                </h3>
                <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
                  {sectionToggles.map(({ key, label, desc }, i) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-4 py-3.5 ${i < sectionToggles.length - 1 ? `border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-100'}` : ''}`}
                    >
                      <div className="pr-4">
                        <div className={`text-sm font-medium ${textPrimary}`}>{label}</div>
                        <div className={`text-xs mt-0.5 ${textMuted}`}>{desc}</div>
                      </div>
                      <button
                        onClick={() => toggleSection(key)}
                        className={`w-10 h-[22px] rounded-full relative transition-colors flex-shrink-0 ${
                          sections[key] ? 'bg-cyan-600' : darkMode ? 'bg-slate-600' : 'bg-slate-300'
                        }`}
                      >
                        <div className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                          sections[key] ? 'translate-x-[21px]' : 'translate-x-[3px]'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-6 py-4 border-t ${borderColor} flex justify-end gap-3 flex-shrink-0`}>
              <button
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-cyan-600 hover:bg-cyan-700 text-white transition-colors shadow-sm"
              >
                Export {format.toUpperCase()}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getStudentReport } from '../../lib/supabase-api';
import { applyReportFilters, computePerformanceStats } from './report-helpers';
import ReportFilterBar from './ReportFilterBar';
import ReportSummaryStrip from './ReportSummaryStrip';
import ReportClassesTab from './ReportClassesTab';
import ReportMistakesTab from './ReportMistakesTab';
import ReportPerformanceTab from './ReportPerformanceTab';
import ExportModal from './ExportModal';
import type { StudentReport, ReportFilters, PerformanceStats } from '../../lib/report-types';

interface ReportPanelProps {
  studentId: string;
  onClose?: () => void;
}

export default function ReportPanel({ studentId }: ReportPanelProps) {
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

  // Fetch report data
  useEffect(() => {
    if (!studentId) return;
    let isMounted = true;
    async function loadReport() {
      try {
        const data = await getStudentReport(studentId);
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

  // Computed: filtered report
  const filteredReport = useMemo(() => {
    if (!report) return null;
    return applyReportFilters(report, filters);
  }, [report, filters]);

  // Computed: performance stats
  const performanceStats = useMemo<PerformanceStats | null>(() => {
    if (!filteredReport) return null;
    return computePerformanceStats(filteredReport.classes);
  }, [filteredReport]);

  // Theme variables
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
    } catch { return dateStr; }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center py-20 text-lg ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        Loading...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-xl text-red-500">
        {error}
      </div>
    );
  }

  // Empty state
  if (!report || !filteredReport) {
    return (
      <div className="p-6 bg-red-500/20 border border-red-500/30 rounded-xl text-red-500">
        Report not found
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Student info + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <p className={`text-sm ${textMuted}`}>
            {report.student.name} &middot; Student since {formatDate(report.student.added_at)}
          </p>
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className={`px-3.5 py-1.5 rounded-lg border text-[13px] font-medium flex items-center gap-1.5 transition-colors ${
            darkMode
              ? 'border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>

      {/* Filter bar */}
      <ReportFilterBar filters={filters} onFiltersChange={setFilters} darkMode={darkMode} />

      {/* Summary strip */}
      <ReportSummaryStrip summary={filteredReport.summary} darkMode={darkMode} />

      {/* Tab navigation */}
      <div className={`flex ${cardBg} border-b ${borderColor} rounded-t-xl px-4 sm:px-6`}>
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

      {/* Tab content */}
      <div className="px-4 sm:px-6 py-6">
        {activeTab === 'classes' && (
          <ReportClassesTab
            classes={filteredReport.classes}
            expandedClassId={expandedClassId}
            onToggleExpand={(id) => setExpandedClassId(expandedClassId === id ? null : id)}
            darkMode={darkMode}
          />
        )}
        {activeTab === 'mistakes' && (
          <ReportMistakesTab
            mistakesBySurah={filteredReport.mistakes_by_surah}
            repeatedMistakes={filteredReport.repeated_mistakes}
            darkMode={darkMode}
          />
        )}
        {activeTab === 'performance' && performanceStats && (
          <ReportPerformanceTab
            performanceTrend={filteredReport.performance_trend}
            performanceStats={performanceStats}
            darkMode={darkMode}
          />
        )}
      </div>

      {/* Export modal */}
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

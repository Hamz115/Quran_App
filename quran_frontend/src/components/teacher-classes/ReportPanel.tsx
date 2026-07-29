import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { getStudentReport, deleteClass } from '../../lib/supabase-api';
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
  basePath?: string;
  hideExport?: boolean;
}

export default function ReportPanel({ studentId, basePath, hideExport }: ReportPanelProps) {
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

  // Delete a class — optimistic UI update, Supabase cleanup in background
  const handleDeleteClass = useCallback((classId: string) => {
    // Optimistically remove from UI (instant)
    setExpandedClassId(null);
    if (report) {
      setReport({
        ...report,
        classes: report.classes.filter((c: any) => c.id !== classId),
      });
    }
    // Fire Supabase delete in background (non-blocking)
    deleteClass(classId).catch(err => console.error('Failed to delete class:', err));
  }, [report]);

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
    <div className="report-editorial-panel">
      <div className="report-record-heading">
        <div>
          <span>Recitation record</span>
          <h2>{report.student.name}</h2>
          <p>Tracking since {formatDate(report.student.added_at)}</p>
        </div>
        {!hideExport && (
          <button onClick={() => setShowExportModal(true)} className="report-export-button">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export report
          </button>
        )}
      </div>

      <ReportFilterBar filters={filters} onFiltersChange={setFilters} darkMode={false} />
      <ReportSummaryStrip summary={filteredReport.summary} darkMode={false} />

      <nav className="report-section-tabs" aria-label="Report sections">
        {[
          { id: 'classes' as const, label: 'Sessions', arabic: 'جلسات', count: filteredReport.summary.total_classes },
          { id: 'mistakes' as const, label: 'Mistakes', arabic: 'أخطاء', count: filteredReport.summary.total_mistakes },
          { id: 'performance' as const, label: 'Performance', arabic: 'أداء', count: null },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={activeTab === tab.id ? 'active' : ''}>
            <span>{tab.label}<small>{tab.arabic}</small></span>
            {tab.count !== null && <strong>{tab.count}</strong>}
          </button>
        ))}
      </nav>

      <div className="report-tab-content">
        {activeTab === 'classes' && (
          <ReportClassesTab
            classes={filteredReport.classes}
            expandedClassId={expandedClassId}
            onToggleExpand={(id) => setExpandedClassId(expandedClassId === id ? null : id)}
            onDeleteClass={handleDeleteClass}
            darkMode={darkMode}
            basePath={basePath}
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

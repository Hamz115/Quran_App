import { PERF_MAP } from './report-helpers';
import type { PerformanceDataPoint, PerformanceStats } from '../../lib/report-types';

interface ReportPerformanceTabProps {
  performanceTrend: PerformanceDataPoint[];
  performanceStats: PerformanceStats;
  darkMode: boolean;
}

export default function ReportPerformanceTab({ performanceTrend, performanceStats, darkMode }: ReportPerformanceTabProps) {
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[5fr_2fr] gap-5">
      {/* Chart */}
      <div className={`rounded-xl border ${borderColor} ${cardBg} p-5`}>
        <h3 className={`text-sm font-semibold mb-4 ${textPrimary}`}>Performance Over Time</h3>
        {performanceTrend.length === 0 ? (
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
                  {performanceTrend.map((entry, i) => {
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
              {performanceTrend.map((entry, i) => (
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
  );
}

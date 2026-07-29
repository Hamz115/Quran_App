import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, perfBadgeClasses, mistakeCountClasses, portionTagClasses } from './report-helpers';
import { formatPortionLabel } from '../../lib/quran-utils';
import type { StudentClass } from '../../lib/report-types';

interface ReportClassesTabProps {
  classes: StudentClass[];
  expandedClassId: string | null;
  onToggleExpand: (classId: string) => void;
  onDeleteClass?: (classId: string) => void;
  darkMode: boolean;
  basePath?: string;
}

export default function ReportClassesTab({ classes, expandedClassId, onToggleExpand, onDeleteClass, darkMode, basePath = '/teacher/classes' }: ReportClassesTabProps) {
  const navigate = useNavigate();
  const borderColor = darkMode ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-800';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-500';
  const textMuted = darkMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className="report-session-ledger">
      <table className="w-full border-collapse min-w-[760px]">
        <thead>
          <tr className={darkMode ? 'bg-slate-900' : 'bg-slate-50'}>
            <th className={`w-7 py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`} />
            <th className={`py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Date</th>
            <th className={`py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Portions</th>
            <th className={`py-2.5 px-3.5 text-center text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Mistakes</th>
            <th className={`py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Performance</th>
            <th className={`py-2.5 px-3.5 text-left text-[11px] font-semibold uppercase tracking-wide ${textMuted} border-b ${borderColor}`}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {classes.length === 0 ? (
            <tr>
              <td colSpan={6} className={`py-12 text-center ${textSecondary}`}>
                No classes found for the selected filters
              </td>
            </tr>
          ) : (
            [...classes]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map(cls => {
                const isExpanded = expandedClassId === cls.id;
                return (
                  <ClassRow
                    key={cls.id}
                    cls={cls}
                    isExpanded={isExpanded}
                    onToggle={() => onToggleExpand(cls.id)}
                    onOpen={() => navigate(`${basePath}/${cls.id}`)}
                    onDelete={onDeleteClass ? () => onDeleteClass(cls.id) : undefined}
                    darkMode={darkMode}
                    borderColor={borderColor}
                    textPrimary={textPrimary}
                    textSecondary={textSecondary}
                    textMuted={textMuted}
                  />
                );
              })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============ CLASS ROW SUB-COMPONENT ============

function ClassRow({
  cls, isExpanded, onToggle, onOpen, onDelete, darkMode, borderColor, textPrimary, textSecondary, textMuted
}: {
  cls: StudentClass;
  isExpanded: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onDelete?: () => void;
  darkMode: boolean;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';

  return (
    <>
      <tr
        onClick={onOpen}
        className={`${cardBg} transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-750' : 'hover:bg-slate-50'}`}
      >
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            className={`p-1 rounded text-sm transition-colors ${darkMode ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-400' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
          >
            {isExpanded ? '\u25BC' : '\u25B6'}
          </button>
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          <div className={`font-semibold text-[13px] whitespace-nowrap ${textPrimary}`}>
            {formatDate(cls.date)}
            <span className={`text-[11px] font-normal ml-1.5 ${textMuted}`}>{cls.day}</span>
          </div>
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {cls.assignments.map((a, i) => (
              <span key={i}>
                {i > 0 && <span className={`text-[10px] mx-0.5 ${textMuted}`}>|</span>}
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border ${portionTagClasses(a.type)}`}>
                  <span className="font-bold text-[9px] tracking-wide">{a.type.toUpperCase()}</span>
                  {formatPortionLabel(a)}
                </span>
              </span>
            ))}
            {cls.assignments.length === 0 && <span className={`text-xs ${textMuted}`}>No portions</span>}
          </div>
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor} text-center`}>
          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${mistakeCountClasses(cls.mistake_count)}`}>
            {cls.mistake_count}
          </span>
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          {cls.performance ? (
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${perfBadgeClasses(cls.performance)}`}>
              {cls.performance}
            </span>
          ) : (
            <span className={`text-xs ${textMuted}`}>-</span>
          )}
        </td>
        <td className={`py-3 px-3.5 border-b ${borderColor}`}>
          <div className={`text-xs italic max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap ${textMuted}`}>
            {cls.notes || '-'}
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className={`px-3.5 pb-3.5 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex gap-6 p-3.5 rounded-lg">
              <div className="flex-[2]">
                <div className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>
                  Mistakes in this session
                </div>
                {cls.mistakes.length === 0 ? (
                  <p className={`text-xs ${textSecondary}`}>No mistakes recorded for this session</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {cls.mistakes.map((m, i) => (
                      <span
                        key={`${m.id}-${i}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border ${
                          darkMode
                            ? 'bg-red-500/10 border-red-500/20 text-red-300'
                            : 'bg-red-50 border-red-200 text-red-600'
                        }`}
                      >
                        <span className="font-['Amiri'] text-[13px]" dir="rtl">{m.word_text}</span>
                        {m.surah_name}:{m.ayah_number}
                        <span className="font-bold text-[10px] text-red-400">{m.error_count}x</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>
                  Listener Notes
                </div>
                {cls.notes ? (
                  <div className={`text-xs italic leading-relaxed p-3 rounded-md border-l-[3px] ${
                    darkMode
                      ? 'text-slate-400 bg-slate-800 border-slate-600'
                      : 'text-slate-500 bg-white border-slate-300'
                  }`}>
                    "{cls.notes}"
                  </div>
                ) : (
                  <p className={`text-xs ${textSecondary}`}>No notes</p>
                )}
              </div>
              {onDelete && (
                <div className="flex items-end">
                  {!confirmDelete ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                        darkMode
                          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                          : 'border-red-200 text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); setConfirmDelete(false); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          darkMode
                            ? 'border-slate-600 text-slate-400 hover:bg-slate-700'
                            : 'border-slate-300 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

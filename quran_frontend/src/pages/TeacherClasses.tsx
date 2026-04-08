import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getClasses, getMyStudents, createClass, getSurahs, updateClassNotes, getSuggestedPortions } from '../api';
import type { StudentListItem, ClassData, SuggestedPortions, SuggestedPortion, ContactListItem } from '../api';
import { getPageRange, TOTAL_PAGES } from '../data/quranPages';
import { JUZ_BOUNDARIES, formatPortionLabel } from '../lib/quran-utils';
import { ReportPanel } from '../components/teacher-classes';

interface SurahInfo {
  number: number;
  englishName: string;
  name: string;
  numberOfAyahs: number;
}

interface SinglePortion {
  id: string;
  mode: 'page' | 'surah' | 'juz';  // Default to page
  startPage: number;
  endPage: number;
  startSurah: number;
  endSurah: number;
  startAyah: string;
  endAyah: string;
  juz: number;
}

interface PortionConfig {
  enabled: boolean;
  portions: SinglePortion[];
}

// Toggle Switch - extracted to avoid focus loss from re-renders
function ToggleSwitch({ enabled, onChange, color, darkMode }: { enabled: boolean; onChange: (v: boolean) => void; color: string; darkMode: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        enabled ? color : (darkMode ? 'bg-slate-600' : 'bg-slate-300')
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// PortionSelector - extracted to avoid focus loss from re-renders
function PortionSelector({
  label,
  description,
  borderColor,
  toggleColor,
  config,
  setConfig,
  darkMode,
  surahList,
  modalBodyRef
}: {
  label: string;
  description: string;
  borderColor: string;
  toggleColor: string;
  config: PortionConfig;
  setConfig: (c: PortionConfig) => void;
  darkMode: boolean;
  surahList: SurahInfo[];
  modalBodyRef: React.RefObject<HTMLDivElement | null>;
}) {
  const updatePortion = (portionId: string, updates: Partial<SinglePortion>) => {
    const scrollTop = modalBodyRef.current?.scrollTop || 0;
    setConfig({
      ...config,
      portions: config.portions.map(p => p.id === portionId ? { ...p, ...updates } : p)
    });
    requestAnimationFrame(() => {
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = scrollTop;
      }
    });
  };

  const createDefaultPortion = (): SinglePortion => ({
    id: Math.random().toString(36).substr(2, 9),
    mode: 'page',
    startPage: 1,
    endPage: 1,
    startSurah: 1,
    endSurah: 1,
    startAyah: '',
    endAyah: '',
    juz: 1,
  });

  const addPortion = () => {
    setConfig({
      ...config,
      portions: [...config.portions, createDefaultPortion()]
    });
  };

  const removePortion = (portionId: string) => {
    if (config.portions.length > 1) {
      setConfig({
        ...config,
        portions: config.portions.filter(p => p.id !== portionId)
      });
    }
  };

  const handlePageChange = (portionId: string, startPage: number, endPage: number) => {
    const startRange = getPageRange(startPage);
    const endRange = getPageRange(endPage);
    updatePortion(portionId, {
      startPage,
      endPage,
      startSurah: startRange.startSurah,
      endSurah: endRange.endSurah,
      startAyah: String(startRange.startAyah),
      endAyah: endRange.endAyah === 999 ? '' : String(endRange.endAyah)
    });
  };

  // Determine data-tour attribute based on label
  const tourAttr = label.startsWith('Hifz') ? 'hifz-section'
    : label.startsWith('Sabqi') ? 'sabqi-toggle'
    : label.startsWith('Revision') ? 'manzil-toggle'
    : undefined;

  return (
    <div data-tour={tourAttr} className={`p-4 rounded-xl border-2 transition-all ${
      config.enabled ? borderColor : (darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50')
    }`}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className={`font-semibold ${config.enabled ? (darkMode ? 'text-slate-100' : 'text-slate-800') : 'text-slate-400'}`}>
            {label}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{description}</p>
        </div>
        <ToggleSwitch enabled={config.enabled} onChange={(v) => setConfig({ ...config, enabled: v })} color={toggleColor} darkMode={darkMode} />
      </div>

      {config.enabled && (
        <div className="mt-4 space-y-4">
          {config.portions.map((portion, index) => {
            const startSurahInfo = surahList.find(s => s.number === portion.startSurah);
            const endSurahInfo = surahList.find(s => s.number === portion.endSurah);
            const isSameSurah = portion.startSurah === portion.endSurah;
            const maxStartAyahs = startSurahInfo?.numberOfAyahs || 286;
            const maxEndAyahs = endSurahInfo?.numberOfAyahs || 286;

            return (
              <div key={portion.id} className="space-y-3">
                {index > 0 && <div className={`border-t pt-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`} />}

                {config.portions.length > 1 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Portion {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removePortion(portion.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Mode Toggle */}
                <div data-tour="portion-mode" className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => updatePortion(portion.id, { mode: 'page' })}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      portion.mode === 'page'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : (darkMode ? 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200')
                    }`}
                  >
                    By Page
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePortion(portion.id, { mode: 'surah' })}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      portion.mode === 'surah'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : (darkMode ? 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200')
                    }`}
                  >
                    By Surah
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const boundary = JUZ_BOUNDARIES.find(b => b.juz === portion.juz);
                      updatePortion(portion.id, {
                        mode: 'juz',
                        ...(boundary && {
                          startSurah: boundary.startSurah,
                          endSurah: boundary.endSurah,
                          startAyah: String(boundary.startAyah),
                          endAyah: String(boundary.endAyah),
                        }),
                      });
                    }}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      portion.mode === 'juz'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                        : (darkMode ? 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200')
                    }`}
                  >
                    By Juz
                  </button>
                </div>

                {portion.mode === 'page' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>From Page</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={portion.startPage || ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          updatePortion(portion.id, { startPage: raw === '' ? 0 : parseInt(raw) });
                        }}
                        onBlur={() => {
                          const clamped = Math.min(Math.max(1, portion.startPage || 1), TOTAL_PAGES);
                          handlePageChange(portion.id, clamped, Math.max(clamped, portion.endPage || clamped));
                        }}
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>To Page</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={portion.endPage || ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          updatePortion(portion.id, { endPage: raw === '' ? 0 : parseInt(raw) });
                        }}
                        onBlur={() => {
                          const start = portion.startPage || 1;
                          const clamped = Math.min(Math.max(start, portion.endPage || start), TOTAL_PAGES);
                          handlePageChange(portion.id, Math.min(Math.max(1, start), TOTAL_PAGES), clamped);
                        }}
                        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                      />
                    </div>
                  </div>
                )}

                {portion.mode === 'surah' && (
                  <>
                    <div data-tour="surah-selector" className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>From Surah</label>
                        <select
                          value={portion.startSurah}
                          onChange={(e) => {
                            const newStart = parseInt(e.target.value);
                            updatePortion(portion.id, {
                              startSurah: newStart,
                              endSurah: newStart > portion.endSurah ? newStart : portion.endSurah,
                              startAyah: '',
                              endAyah: ''
                            });
                          }}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                        >
                          {surahList.map((surah) => (
                            <option key={surah.number} value={surah.number}>
                              {surah.number}. {surah.englishName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>To Surah</label>
                        <select
                          value={portion.endSurah}
                          onChange={(e) => updatePortion(portion.id, { endSurah: parseInt(e.target.value), startAyah: '', endAyah: '' })}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                        >
                          {surahList.filter(s => s.number >= portion.startSurah).map((surah) => (
                            <option key={surah.number} value={surah.number}>
                              {surah.number}. {surah.englishName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div data-tour="ayah-range" className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>From Ayah (optional)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="All"
                          value={portion.startAyah}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            updatePortion(portion.id, { startAyah: raw });
                          }}
                          onBlur={() => {
                            if (portion.startAyah) {
                              const val = Math.min(Math.max(1, parseInt(portion.startAyah) || 1), maxStartAyahs);
                              updatePortion(portion.id, { startAyah: String(val) });
                            }
                          }}
                          disabled={!isSameSurah}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>To Ayah (optional)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="All"
                          value={portion.endAyah}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            updatePortion(portion.id, { endAyah: raw });
                          }}
                          onBlur={() => {
                            if (portion.endAyah) {
                              const val = Math.min(Math.max(1, parseInt(portion.endAyah) || 1), maxEndAyahs);
                              updatePortion(portion.id, { endAyah: String(val) });
                            }
                          }}
                          disabled={!isSameSurah}
                          className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}`}
                        />
                      </div>
                    </div>

                    {!isSameSurah && (
                      <p className="text-xs text-slate-500 italic">
                        Note: Ayah range only applies when start and end surah are the same
                      </p>
                    )}
                  </>
                )}

                {portion.mode === 'juz' && (
                  <div>
                    <label className={`block text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Juz</label>
                    <select
                      value={portion.juz}
                      onChange={(e) => {
                        const juzNum = parseInt(e.target.value);
                        const boundary = JUZ_BOUNDARIES.find(b => b.juz === juzNum);
                        updatePortion(portion.id, {
                          juz: juzNum,
                          ...(boundary && {
                            startSurah: boundary.startSurah,
                            endSurah: boundary.endSurah,
                            startAyah: String(boundary.startAyah),
                            endAyah: String(boundary.endAyah),
                          }),
                        });
                      }}
                      className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-900'}`}
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                        <option key={j} value={j}>Juz {j}</option>
                      ))}
                    </select>
                    {(() => {
                      const b = JUZ_BOUNDARIES.find(x => x.juz === portion.juz);
                      if (!b) return null;
                      return (
                        <p className="text-xs text-slate-500 mt-1">
                          Surah {b.startSurah}:{b.startAyah} — Surah {b.endSurah}:{b.endAyah}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addPortion}
            className={`w-full py-2 border border-dashed rounded-lg text-sm transition-colors ${darkMode ? 'border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500' : 'border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400'}`}
          >
            + Add Another Portion
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeacherClasses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [, setClasses] = useState<ClassData[]>([]);
  const [recitingClasses, setRecitingClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [surahList, setSurahList] = useState<SurahInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listening' | 'reciting'>('listening');

  // Modal state
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [classDate, setClassDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [creating, setCreating] = useState(false);

  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesClassId, setNotesClassId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Selected student for report view
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);

  // Auto-select student if ?report=ID, or open modal if ?new=1
  useEffect(() => {
    const reportStudentId = searchParams.get('report');
    if (reportStudentId) {
      setSelectedStudentFilter(reportStudentId);
      setSearchParams({});
    }

    if (searchParams.get('new') === '1') {
      setShowNewClassModal(true);

      // Pre-select students if provided in URL and skip to step 2
      const studentIds = searchParams.getAll('student');
      if (studentIds.length > 0) {
        setSelectedStudents(studentIds);
        setModalStep(2); // Skip to portion selection since students are already selected
      }

      // Remove the query params from URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Portion configuration mode: 'same' for all students, 'per-student' for individual
  const [portionMode, setPortionMode] = useState<'same' | 'per-student'>('same');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  // Cache of previously fetched portions per student (for auto pre-fill)
  const previousPortionsCache = useRef<Record<string, SuggestedPortions>>({});

  // Portion configuration - shared (for 'same' mode) or per-student (for 'per-student' mode)
  // Default to page mode with page 560 (Surah Al-Mulk starts on page 560)
  const createDefaultPortion = (): SinglePortion => ({
    id: String(Date.now()),
    mode: 'page',
    startPage: 560,
    endPage: 560,
    startSurah: 67,
    endSurah: 67,
    startAyah: '',
    endAyah: '',
    juz: 1,
  });

  // Convert a suggestion into a PortionConfig with a single portion
  const suggestionToPortionConfig = (s: SuggestedPortion | null): PortionConfig | null => {
    if (!s) return null;
    return {
      enabled: true,
      portions: [{
        id: String(Date.now() + Math.random()),
        mode: 'surah',
        startPage: 1,
        endPage: 1,
        startSurah: s.start_surah,
        endSurah: s.end_surah,
        startAyah: s.start_ayah?.toString() || '',
        endAyah: s.end_ayah?.toString() || '',
        juz: 1,
      }],
    };
  };

  // Default configs (used when mode is 'same' or as fallback)
  const [hifzConfig, setHifzConfig] = useState<PortionConfig>({ enabled: true, portions: [createDefaultPortion()] });
  const [sabqiConfig, setSabqiConfig] = useState<PortionConfig>({ enabled: true, portions: [createDefaultPortion()] });
  const [revisionConfig, setRevisionConfig] = useState<PortionConfig>({ enabled: true, portions: [createDefaultPortion()] });

  // Per-student configs: Map of student_id -> { hifz, sabqi, revision }
  const [perStudentConfigs, setPerStudentConfigs] = useState<Record<string, {
    hifz: PortionConfig;
    sabqi: PortionConfig;
    revision: PortionConfig;
  }>>({});

  // Ref for modal scroll preservation
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const [refreshing, setRefreshing] = useState(false);

  async function refreshData() {
    // Load each independently so one failure doesn't break everything
    const [classesResult, reciterResult, studentsResult, surahsResult] = await Promise.allSettled([
      getClasses('listener'),
      getClasses('reciter'),
      getMyStudents(),
      getSurahs()
    ]);

    if (classesResult.status === 'fulfilled') setClasses(classesResult.value);
    else console.error('Failed to load listener classes:', classesResult.reason);

    if (reciterResult.status === 'fulfilled') setRecitingClasses(reciterResult.value);
    else console.error('Failed to load reciter classes:', reciterResult.reason);

    if (studentsResult.status === 'fulfilled') setStudents(studentsResult.value);
    else console.error('Failed to load students:', studentsResult.reason);

    if (surahsResult.status === 'fulfilled') setSurahList(surahsResult.value);
    else console.error('Failed to load surahs:', surahsResult.reason);
  }

  useEffect(() => {
    refreshData().finally(() => setLoading(false));
  }, [user?.id]);

  // Auto-select first student when students load (if none selected)
  useEffect(() => {
    if (students.length > 0 && !selectedStudentFilter) {
      setSelectedStudentFilter(students[0].id);
    }
  }, [students]);

  const toggleStudent = (id: string) => {
    // Regular classes allow multiple students
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const resetModal = () => {
    setShowNewClassModal(false);
    setModalStep(1);
    setSelectedStudents([]);
    setPortionMode('same');
    setActiveStudentId(null);
    setHifzConfig({ enabled: true, portions: [createDefaultPortion()] });
    setSabqiConfig({ enabled: true, portions: [createDefaultPortion()] });
    setRevisionConfig({ enabled: true, portions: [createDefaultPortion()] });
    setPerStudentConfigs({});
    // Reset date to today (local time)
    const now = new Date();
    setClassDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
    // Clear cache so next modal open re-fetches fresh data
    previousPortionsCache.current = {};
  };

  // Initialize per-student configs when switching to per-student mode
  const initPerStudentConfigs = () => {
    const configs: Record<string, { hifz: PortionConfig; sabqi: PortionConfig; revision: PortionConfig }> = {};
    selectedStudents.forEach(studentId => {
      const cached = previousPortionsCache.current[studentId];
      if (cached) {
        configs[studentId] = {
          hifz: suggestionToPortionConfig(cached.hifz) || { enabled: true, portions: [createDefaultPortion()] },
          sabqi: suggestionToPortionConfig(cached.sabqi) || { enabled: true, portions: [createDefaultPortion()] },
          revision: suggestionToPortionConfig(cached.manzil) || { enabled: true, portions: [createDefaultPortion()] },
        };
      } else {
        configs[studentId] = {
          hifz: { enabled: true, portions: [createDefaultPortion()] },
          sabqi: { enabled: true, portions: [createDefaultPortion()] },
          revision: { enabled: true, portions: [createDefaultPortion()] },
        };
      }
    });
    setPerStudentConfigs(configs);
    if (selectedStudents.length > 0) {
      setActiveStudentId(selectedStudents[0]);
    }
  };

  // Get the current student's config (for per-student mode)
  const getActiveStudentConfig = () => {
    if (!activeStudentId || !perStudentConfigs[activeStudentId]) {
      return {
        hifz: { enabled: true, portions: [createDefaultPortion()] },
        sabqi: { enabled: true, portions: [createDefaultPortion()] },
        revision: { enabled: true, portions: [createDefaultPortion()] },
      };
    }
    return perStudentConfigs[activeStudentId];
  };

  // Update the active student's config
  const updateActiveStudentConfig = (type: 'hifz' | 'sabqi' | 'revision', config: PortionConfig) => {
    if (!activeStudentId) return;
    setPerStudentConfigs(prev => ({
      ...prev,
      [activeStudentId]: {
        ...prev[activeStudentId],
        [type]: config,
      },
    }));
  };

  // Auto pre-fill portions from previous class when entering step 2
  useEffect(() => {
    if (modalStep !== 2 || selectedStudents.length === 0) return;

    let cancelled = false;

    const prefill = async () => {
      // Fetch previous portions for each student (skip cached)
      const fetchPromises = selectedStudents.map(async (studentId) => {
        if (previousPortionsCache.current[studentId]) return;
        try {
          const data = await getSuggestedPortions(studentId);
          previousPortionsCache.current[studentId] = data;
        } catch (err) {
          console.error('Failed to fetch previous portions for', studentId, err);
        }
      });

      await Promise.all(fetchPromises);
      if (cancelled) return;

      // Pre-fill shared config from the first selected student's data
      const firstStudentData = previousPortionsCache.current[selectedStudents[0]];
      if (firstStudentData) {
        const h = suggestionToPortionConfig(firstStudentData.hifz);
        const s = suggestionToPortionConfig(firstStudentData.sabqi);
        const r = suggestionToPortionConfig(firstStudentData.manzil);
        if (h) setHifzConfig(h);
        if (s) setSabqiConfig(s);
        if (r) setRevisionConfig(r);
      }
    };

    prefill();
    return () => { cancelled = true; };
  }, [modalStep, selectedStudents.join(',')]);

  const handleCreateClass = async () => {
    setCreating(true);
    try {
      // Use the selected date (local time) for both date and day
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      // Parse classDate as local (not UTC) by splitting YYYY-MM-DD
      const [y, m, d] = classDate.split('-').map(Number);
      const selectedDate = new Date(y, m - 1, d);

      // Build assignments array from enabled portions
      const assignments: Array<{
        type: string;
        start_surah: number;
        end_surah: number;
        start_ayah?: number;
        end_ayah?: number;
        student_id?: string;
      }> = [];

      const addPortions = (config: PortionConfig, type: string, studentId?: string) => {
        if (config.enabled) {
          config.portions.forEach(p => {
            assignments.push({
              type,
              start_surah: p.startSurah,
              end_surah: p.endSurah,
              start_ayah: p.startAyah ? parseInt(p.startAyah) : undefined,
              end_ayah: p.endAyah ? parseInt(p.endAyah) : undefined,
              student_id: studentId,
            });
          });
        }
      };

      if (portionMode === 'same') {
        // Same portions for all students (student_id = undefined means all)
        addPortions(hifzConfig, 'hifz');
        addPortions(sabqiConfig, 'sabqi');
        addPortions(revisionConfig, 'revision');
      } else {
        // Per-student portions - add assignments for each student
        Object.entries(perStudentConfigs).forEach(([studentId, config]) => {
          addPortions(config.hifz, 'hifz', studentId);
          addPortions(config.sabqi, 'sabqi', studentId);
          addPortions(config.revision, 'revision', studentId);
        });
      }

      const result = await createClass({
        date: classDate,
        day: days[selectedDate.getDay()],
        student_ids: selectedStudents,
        assignments
      });

      if (result.id) {
        resetModal();
        navigate(`/sessions/${result.id}`);
      } else if ('detail' in result) {
        alert('Error: ' + (result as { detail: string }).detail);
      }
    } catch (err) {
      console.error('Error creating class:', err);
      alert('Error creating class: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setCreating(false);
    }
  };

  const selectedStudentNames = selectedStudents
    .map(id => students.find(s => s.id === id))
    .filter(Boolean)
    .map(s => `${s!.first_name} ${s!.last_name}`)
    .join(', ');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Sessions</h1>
          <p className={`mt-1 text-sm sm:text-base ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Manage your listening and reciting sessions</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={async () => {
              setRefreshing(true);
              await refreshData();
              setRefreshing(false);
            }}
            disabled={refreshing}
            className={`p-2.5 rounded-xl font-medium transition-colors ${
              darkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            } ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh data"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {activeTab === 'listening' && (
            <button
              onClick={() => setShowNewClassModal(true)}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Session
            </button>
          )}
        </div>
      </div>

      {/* Listening / Reciting Tabs */}
      <div className={`flex gap-2 p-1 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <button
          onClick={() => setActiveTab('listening')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'listening'
              ? 'bg-cyan-600 text-white shadow-md'
              : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Listening (مستمع)
        </button>
        <button
          onClick={() => setActiveTab('reciting')}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'reciting'
              ? 'bg-amber-500 text-white shadow-md'
              : darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          Reciting (قارئ)
        </button>
      </div>

      {/* Listening Tab: Student selector + Report */}
      {activeTab === 'listening' && (
        <>
          {/* Student Selector */}
          <div className={`rounded-xl p-4 ${darkMode ? 'bg-slate-800/50' : 'bg-white border border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium w-16 ${darkMode ? 'text-slate-300' : 'text-slate-500'}`}>Contact</span>
              <div className="flex gap-2 overflow-x-auto flex-1 pb-1">
                {students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentFilter(s.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      selectedStudentFilter === s.id
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {s.first_name}
                  </button>
                ))}
                {students.length === 0 && (
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>No contacts added yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Report content for selected student */}
          {selectedStudentFilter && (
            <ReportPanel
              key={selectedStudentFilter}
              studentId={selectedStudentFilter}
            />
          )}
        </>
      )}

      {/* Reciting Tab: Full report for the current user (they are the reciter) */}
      {activeTab === 'reciting' && user?.id && (
        <ReportPanel
          key={`reciter-${user.id}`}
          studentId={user.id}
        />
      )}

      {/* New Class Modal */}
      {showNewClassModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <div>
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                  {modalStep === 1 ? 'Select Students' : 'Configure Portions'}
                </h2>
                <p className={`text-sm mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Step {modalStep} of 2
                </p>
              </div>
              <button onClick={resetModal} className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div ref={modalBodyRef} className="p-6 overflow-y-auto flex-1">
              {modalStep === 1 ? (
                /* Step 1: Select Students */
                <div className="space-y-4">
                  {/* Date Picker */}
                  <div data-tour="class-date">
                    <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Class Date
                    </label>
                    <input
                      type="date"
                      value={classDate}
                      onChange={(e) => setClassDate(e.target.value)}
                      className={`w-full px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${darkMode ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-300 bg-white text-slate-700'}`}
                    />
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {(() => {
                        const [y, m, d] = classDate.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        return dayNames[dateObj.getDay()];
                      })()}
                    </p>
                  </div>

                  {/* Student Selection */}
                  <div data-tour="student-selector">
                  <label className={`block text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Select students for this class
                  </label>
                  {students.length === 0 ? (
                    <div className={`p-6 rounded-xl text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>No students added yet</p>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Add students from the Dashboard first</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {students.map((student) => {
                        const isSelected = selectedStudents.includes(student.id);
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => toggleStudent(student.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                              isSelected
                                ? (darkMode ? 'bg-blue-500/20 border-2 border-blue-500' : 'bg-blue-50 border-2 border-blue-500')
                                : (darkMode ? 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100')
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : (darkMode ? 'border-slate-500' : 'border-slate-300')
                            }`}>
                              {isSelected && (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">
                              {student.first_name[0]}{student.last_name[0]}
                            </div>
                            <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{student.first_name} {student.last_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              ) : (
                /* Step 2: Configure Portions */
                <div className="space-y-4">
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {'Class'} with: <span className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{selectedStudentNames}</span>
                    </p>
                  </div>

                  {/* Portion Mode Toggle - only show if multiple students selected */}
                  {selectedStudents.length > 1 && (
                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        How do you want to assign portions?
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPortionMode('same')}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                            portionMode === 'same'
                              ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500'
                              : (darkMode ? 'bg-slate-700/50 text-slate-400 border-2 border-transparent hover:bg-slate-700' : 'bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-100')
                          }`}
                        >
                          Same for all students
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPortionMode('per-student');
                            initPerStudentConfigs();
                          }}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                            portionMode === 'per-student'
                              ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500'
                              : (darkMode ? 'bg-slate-700/50 text-slate-400 border-2 border-transparent hover:bg-slate-700' : 'bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-100')
                          }`}
                        >
                          Different per student
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Per-student tabs - show when in per-student mode (not for tests) */}
                  {portionMode === 'per-student' && selectedStudents.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {selectedStudents.map(studentId => {
                        const student = students.find(s => s.id === studentId);
                        if (!student) return null;
                        const isActive = activeStudentId === studentId;
                        const studentConfig = perStudentConfigs[studentId];
                        const hasPortions = studentConfig && (studentConfig.hifz.enabled || studentConfig.sabqi.enabled || studentConfig.revision.enabled);

                        return (
                          <button
                            key={studentId}
                            type="button"
                            onClick={() => setActiveStudentId(studentId)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500'
                                : (darkMode ? 'bg-slate-700/50 text-slate-400 border-2 border-transparent hover:bg-slate-700' : 'bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-100')
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center text-xs font-bold text-white">
                              {student.first_name[0]}
                            </div>
                            {student.first_name}
                            {hasPortions && (
                              <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {portionMode === 'per-student' && selectedStudents.length > 1
                      ? `Configure portions for ${students.find(s => s.id === activeStudentId)?.first_name || 'student'}:`
                      : 'Select the Quran portions for this class (you can also add/edit later):'}
                  </p>

                  <div className="space-y-3">
                    {portionMode === 'same' ? (
                      <>
                        <PortionSelector
                          label="Hifz (New Memorization)"
                          description="New verses to memorize"
                          borderColor="border-blue-500 bg-blue-500/5"
                          toggleColor="bg-blue-500"
                          config={hifzConfig}
                          setConfig={setHifzConfig}
                          darkMode={darkMode}
                          surahList={surahList}
                          modalBodyRef={modalBodyRef}
                        />
                        <PortionSelector
                          label="Sabqi (Recent)"
                          description="Recently memorized, needs reinforcement"
                          borderColor="border-blue-500 bg-blue-500/5"
                          toggleColor="bg-blue-500"
                          config={sabqiConfig}
                          setConfig={setSabqiConfig}
                          darkMode={darkMode}
                          surahList={surahList}
                          modalBodyRef={modalBodyRef}
                        />
                        <PortionSelector
                          label="Revision (Manzil)"
                          description="Long-term revision"
                          borderColor="border-purple-500 bg-purple-500/5"
                          toggleColor="bg-purple-500"
                          config={revisionConfig}
                          setConfig={setRevisionConfig}
                          darkMode={darkMode}
                          surahList={surahList}
                          modalBodyRef={modalBodyRef}
                        />
                      </>
                    ) : (
                      <>
                        <PortionSelector
                          label="Hifz (New Memorization)"
                          description="New verses to memorize"
                          borderColor="border-blue-500 bg-blue-500/5"
                          toggleColor="bg-blue-500"
                          config={getActiveStudentConfig().hifz}
                          setConfig={(c) => updateActiveStudentConfig('hifz', c)}
                          darkMode={darkMode}
                          surahList={surahList}
                          modalBodyRef={modalBodyRef}
                        />
                        <PortionSelector
                          label="Sabqi (Recent)"
                          description="Recently memorized, needs reinforcement"
                          borderColor="border-blue-500 bg-blue-500/5"
                          toggleColor="bg-blue-500"
                          config={getActiveStudentConfig().sabqi}
                          setConfig={(c) => updateActiveStudentConfig('sabqi', c)}
                          darkMode={darkMode}
                          surahList={surahList}
                          modalBodyRef={modalBodyRef}
                        />
                        <PortionSelector
                          label="Revision (Manzil)"
                          description="Long-term revision"
                          borderColor="border-purple-500 bg-purple-500/5"
                          toggleColor="bg-purple-500"
                          config={getActiveStudentConfig().revision}
                          setConfig={(c) => updateActiveStudentConfig('revision', c)}
                          darkMode={darkMode}
                          surahList={surahList}
                          modalBodyRef={modalBodyRef}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t flex gap-3 flex-shrink-0 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              {modalStep === 1 ? (
                <>
                  <button
                    onClick={resetModal}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                  >
                    Cancel
                  </button>
                  <button
                    data-tour="next-portions-btn"
                    disabled={selectedStudents.length === 0}
                    onClick={() => setModalStep(2)}
                    className={`flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors`}
                  >
                    {'Next: Choose Portions'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModalStep(1)}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                  >
                    Back
                  </button>
                  <button
                    data-tour="create-class-btn"
                    onClick={handleCreateClass}
                    disabled={creating}
                    className={`flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2`}
                  >
                    {creating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Start Class'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl border w-full max-w-lg ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <h2 className={`text-xl font-semibold flex items-center gap-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Class Notes
              </h2>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesClassId(null);
                }}
                className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Add observations, feedback, or reminders for this class..."
                rows={5}
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-shadow ${darkMode ? 'border-slate-600 bg-slate-700/50 text-slate-100 placeholder-slate-500' : 'border-slate-300 bg-white text-slate-900 placeholder-slate-400'}`}
              />
            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-4 border-t flex gap-3 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesClassId(null);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!notesClassId) return;
                  setNotesSaving(true);
                  try {
                    await updateClassNotes(notesClassId, notesText || null);
                    const updated = await getClasses();
                    setClasses(updated);
                    setShowNotesModal(false);
                    setNotesClassId(null);
                  } catch (err) {
                    console.error('Failed to save notes:', err);
                  } finally {
                    setNotesSaving(false);
                  }
                }}
                disabled={notesSaving}
                className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {notesSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Notes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useTour } from '../contexts/TourContext';
import { getClasses, getMyStudents, createClass, getSurahs, updateClassNotes, getSuggestedPortions } from '../api';
import type { StudentListItem, ClassData, SuggestedPortions, SuggestedPortion } from '../api';
import { getPageRange, TOTAL_PAGES } from '../data/quranPages';
import { formatPortionLabel, JUZ_BOUNDARIES } from '../lib/quran-utils';
import { invalidateCache } from '../lib/cache';
import ConfirmDialog from '../components/ConfirmDialog';

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
function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void; color: string; darkMode: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`new-session-include-toggle ${enabled ? 'enabled' : ''}`}
      aria-pressed={enabled}
    >
      <span className="new-session-include-indicator" aria-hidden="true">{enabled ? '✓' : '+'}</span>
      <span>{enabled ? 'Included' : 'Add section'}</span>
    </button>
  );
}

// PortionSelector - extracted to avoid focus loss from re-renders
function PortionSelector({
  label,
  description,
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

  const sectionKey = label.startsWith('Hifz') ? 'HIFZ' : label.startsWith('Sabqi') ? 'SABQI' : 'MANZIL';

  return (
    <section data-tour={tourAttr} className={`new-session-portion-section ${config.enabled ? 'enabled' : ''}`}>
      <header className="new-session-portion-section-header">
        <div className="new-session-section-identity">
          <span className="new-session-section-key">{sectionKey}</span>
          <div>
            <h3>{label}</h3>
            <p>{description}</p>
          </div>
        </div>
        <ToggleSwitch enabled={config.enabled} onChange={(v) => setConfig({ ...config, enabled: v })} color={toggleColor} darkMode={darkMode} />
      </header>

      {config.enabled && (
        <div className="new-session-portion-section-body">
          {config.portions.map((portion, index) => {
            const startSurahInfo = surahList.find(s => s.number === portion.startSurah);
            const endSurahInfo = surahList.find(s => s.number === portion.endSurah);
            const isSameSurah = portion.startSurah === portion.endSurah;
            const maxStartAyahs = startSurahInfo?.numberOfAyahs || 286;
            const maxEndAyahs = endSurahInfo?.numberOfAyahs || 286;

            return (
              <div key={portion.id} className="new-session-portion-editor">
                <div className="new-session-portion-editor-head">
                  <span>{config.portions.length > 1 ? `Portion ${index + 1}` : 'Portion range'}</span>
                  {config.portions.length > 1 && (
                    <button type="button" onClick={() => removePortion(portion.id)}>Remove</button>
                  )}
                </div>

                {/* Mode Toggle */}
                <div data-tour="portion-mode" className="new-session-mode-segment">
                  <button
                    type="button"
                    onClick={() => updatePortion(portion.id, { mode: 'page' })}
                    className={portion.mode === 'page' ? 'active' : ''}
                  >
                    By Page
                  </button>
                  <button
                    type="button"
                    data-tour="mode-by-surah"
                    onClick={() => updatePortion(portion.id, { mode: 'surah' })}
                    className={portion.mode === 'surah' ? 'active' : ''}
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
                    className={portion.mode === 'juz' ? 'active' : ''}
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
                          data-tour="from-surah-selector"
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
            className="new-session-add-portion"
          >
            <span aria-hidden="true">+</span> Add another range
          </button>
        </div>
      )}
    </section>
  );
}

export default function TeacherClasses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const { isActive: isTourActive } = useTour();
  const [classes, setClasses] = useState<ClassData[]>([]);
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
  const [createError, setCreateError] = useState<string | null>(null);

  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesClassId, setNotesClassId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Auto-select student if ?report=ID, or open modal if ?new=1
  useEffect(() => {
    if (searchParams.get('view') === 'reciting') setActiveTab('reciting');

    const reportStudentId = searchParams.get('report');
    if (reportStudentId) {
      navigate(`/reports?contact=${reportStudentId}`, { replace: true });
      return;
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
  }, [navigate, searchParams, setSearchParams]);

  // Portion configuration mode: 'same' for all students, 'per-student' for individual
  const [portionMode, setPortionMode] = useState<'same' | 'per-student'>('same');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  // Cache of previously fetched portions per student (for auto pre-fill)
  const previousPortionsCache = useRef<Record<string, SuggestedPortions>>({});
  const suggestedPortionsAppliedFor = useRef<string | null>(null);

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
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [studentFilter, setStudentFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'hifz' | 'sabqi' | 'revision'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => setStudentFilter('all'), [activeTab]);

  const refreshData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    refreshData().finally(() => setLoading(false));
  }, [refreshData, user?.id]);

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
    suggestedPortionsAppliedFor.current = null;
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

  const selectedStudentsKey = useMemo(
    () => [...selectedStudents].sort().join(','),
    [selectedStudents],
  );

  // Auto pre-fill portions from previous class when entering step 2
  useEffect(() => {
    if (modalStep !== 2 || selectedStudents.length === 0) return;

    if (suggestedPortionsAppliedFor.current === selectedStudentsKey) return;
    suggestedPortionsAppliedFor.current = selectedStudentsKey;

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
  }, [modalStep, selectedStudents, selectedStudentsKey]);

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
        setCreateError((result as { detail: string }).detail);
      }
    } catch (err) {
      console.error('Error creating class:', err);
      setCreateError(err instanceof Error ? err.message : 'The session could not be created.');
    } finally {
      setCreating(false);
    }
  };

  const selectedStudentNames = selectedStudents
    .map(id => students.find(s => s.id === id))
    .filter(Boolean)
    .map(s => `${s!.first_name} ${s!.last_name}`)
    .join(', ');

  const activeSessions = activeTab === 'listening' ? classes : recitingClasses;
  const sessionPeople = useMemo(() => {
    const people = new Map<string, string>();
    activeSessions.forEach((session) => {
      if (activeTab === 'listening') {
        session.students?.forEach((student) => people.set(student.id, `${student.first_name} ${student.last_name}`));
      } else if (session.listener_name) {
        people.set(session.listener_name, session.listener_name);
      }
    });
    return Array.from(people, ([id, name]) => ({ id, name }));
  }, [activeSessions, activeTab]);

  const getSessionMistakeCount = (session: ClassData) => {
    if (typeof session.mistake_count === 'number') return session.mistake_count;
    const counts = session.mistake_counts;
    return counts ? counts.hifz + counts.sabqi + counts.revision : 0;
  };

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activeSessions.filter((session) => {
      if (dateFrom && session.date < dateFrom) return false;
      if (dateTo && session.date > dateTo) return false;
      if (studentFilter !== 'all') {
        const matchesPerson = activeTab === 'listening'
          ? session.students?.some((student) => student.id === studentFilter)
          : session.listener_name === studentFilter;
        if (!matchesPerson) return false;
      }
      if (sectionFilter !== 'all' && !session.assignments.some((assignment) => assignment.type === sectionFilter)) return false;
      if (statusFilter === 'published' && !session.is_published) return false;
      if (statusFilter === 'draft' && session.is_published) return false;
      if (!query) return true;

      const contactNames = session.students?.map((student) => `${student.first_name} ${student.last_name}`).join(' ')
        || session.listener_name
        || '';
      const portions = session.assignments.map(formatPortionLabel).join(' ');
      return `${contactNames} ${portions} ${session.notes || ''} ${session.performance || ''}`
        .toLowerCase()
        .includes(query);
    });
  }, [activeSessions, activeTab, dateFrom, dateTo, searchQuery, sectionFilter, statusFilter, studentFilter]);

  const sessionMetrics = useMemo(() => {
    const mistakeTotal = activeSessions.reduce((sum, session) => sum + getSessionMistakeCount(session), 0);
    const contacts = new Set<string>();
    const performanceScores: number[] = [];
    const performanceMap: Record<string, number> = {
      'Needs Work': 1,
      Good: 2,
      'Very Good': 3,
      Excellent: 4,
    };

    activeSessions.forEach((session) => {
      session.students?.forEach((student) => {
        contacts.add(student.id);
        if (student.performance && performanceMap[student.performance]) {
          performanceScores.push(performanceMap[student.performance]);
        }
      });
      if (!session.students?.length && session.listener_name) contacts.add(session.listener_name);
      if (session.performance && performanceMap[session.performance]) {
        performanceScores.push(performanceMap[session.performance]);
      }
    });

    const average = performanceScores.length
      ? performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length
      : 0;
    const averageLabel = average >= 3.5
      ? 'Excellent'
      : average >= 2.5
        ? 'Very Good'
        : average >= 1.5
          ? 'Good'
          : average > 0
            ? 'Needs Work'
            : 'Not rated';

    return {
      sessions: activeSessions.length,
      mistakes: mistakeTotal,
      contacts: contacts.size,
      averageLabel,
    };
  }, [activeSessions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading sessions...</div>
      </div>
    );
  }

  return (
    <div className="approved-page approved-sessions-page">
      <header className="approved-page-header">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="approved-page-title">Sessions</h1>
            <span className="approved-sync">
              <span className="desktop-status-dot" />
              {refreshing ? 'Refreshing data' : 'Session data loaded'}
            </span>
            <span className="approved-eyebrow">Windows app</span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Listening and reciting history with Quran portions and review notes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              invalidateCache('classes');
              invalidateCache('contacts');
              await refreshData();
              setRefreshing(false);
            }}
            disabled={refreshing}
            className="desktop-icon-button"
            title="Refresh data"
            aria-label="Refresh session data"
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {activeTab === 'listening' && (
            <button
              type="button"
              data-tour="start-class-btn"
              onClick={() => setShowNewClassModal(true)}
              className="approved-primary-button"
            >
              <span className="text-lg leading-none">+</span>
              New Session
            </button>
          )}
        </div>
      </header>

      <div className="approved-session-mode" role="tablist" aria-label="Session role">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'listening'}
          onClick={() => setActiveTab('listening')}
          className={activeTab === 'listening' ? 'active' : ''}
        >
          Listening (مستمع)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reciting'}
          onClick={() => setActiveTab('reciting')}
          className={activeTab === 'reciting' ? 'active' : ''}
        >
          Reciting (قارئ)
        </button>
      </div>

      <section className="approved-card approved-session-metrics">
        <div>
          <span className="approved-session-metric-icon">▣</span>
          <strong>{sessionMetrics.sessions}</strong>
          <small>Sessions</small>
        </div>
        <div>
          <span className="approved-session-metric-icon">◎</span>
          <strong>{sessionMetrics.mistakes}</strong>
          <small>Mistakes</small>
        </div>
        <div>
          <span className="approved-session-metric-icon">♙</span>
          <strong>{sessionMetrics.contacts}</strong>
          <small>{activeTab === 'listening' ? 'Reciters' : 'Listeners'}</small>
        </div>
        <div>
          <span className="approved-session-metric-icon">⌁</span>
          <strong className="!text-lg">{sessionMetrics.averageLabel}</strong>
          <small>Average performance</small>
        </div>
      </section>

      <section className="approved-card approved-session-table">
        <div className="approved-session-filters">
          <label className="approved-session-search">
            <span className="sr-only">Search sessions</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search contact, portion, or note" />
          </label>
          <label>
            <span className="sr-only">{activeTab === 'listening' ? 'Reciter' : 'Listener'}</span>
            <select className="approved-input" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
              <option value="all">All {activeTab === 'listening' ? 'reciters' : 'listeners'}</option>
              {sessionPeople.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">From date</span>
            <input className="approved-input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} title="From date" />
          </label>
          <label>
            <span className="sr-only">To date</span>
            <input className="approved-input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} title="To date" />
          </label>
          <label>
            <span className="sr-only">Section</span>
            <select className="approved-input" value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value as typeof sectionFilter)}>
              <option value="all">All sections</option>
              <option value="hifz">Hifz</option>
              <option value="sabqi">Sabqi</option>
              <option value="revision">Manzil</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Status</span>
            <select className="approved-input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <button
            type="button"
            className="approved-filter-clear"
            onClick={() => {
              setSearchQuery('');
              setDateFrom('');
              setDateTo('');
              setStudentFilter('all');
              setSectionFilter('all');
              setStatusFilter('all');
            }}
            disabled={!searchQuery && !dateFrom && !dateTo && studentFilter === 'all' && sectionFilter === 'all' && statusFilter === 'all'}
          >
            Clear
          </button>
        </div>

        <div className="approved-session-table-head">
          <span>Date &amp; time</span>
          <span>{activeTab === 'listening' ? 'Contact' : 'Listener'}</span>
          <span>Portion</span>
          <span>Section</span>
          <span>Performance</span>
          <span>Mistakes</span>
          <span>Note</span>
          <span>Status</span>
          <span aria-hidden="true" />
        </div>

        <div className="approved-session-table-body">
          {filteredSessions.length > 0 ? filteredSessions.map((session) => {
            const contactNames = session.students?.map((student) => `${student.first_name} ${student.last_name}`).join(', ')
              || session.listener_name
              || 'Contact unavailable';
            const initials = session.students?.length
              ? session.students.map((student) => `${student.first_name[0] || ''}${student.last_name[0] || ''}`).join('')
              : contactNames.split(/\s+/).map((part) => part[0]).slice(0, 2).join('');
            const primaryAssignment = session.assignments[0];
            const additionalAssignments = Math.max(0, session.assignments.length - 1);
            const sections = [...new Set(session.assignments.map((assignment) => assignment.type))];
            const performance = session.students?.find((student) => student.performance)?.performance || session.performance || 'Not rated';
            const mistakeCount = getSessionMistakeCount(session);

            return (
              <div
                className="approved-session-row"
                key={session.id}
                role="link"
                tabIndex={0}
                aria-label={`Open ${contactNames} session from ${session.date}`}
                onClick={() => navigate(`/sessions/${session.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/sessions/${session.id}`);
                  }
                }}
              >
                <span>
                  <strong>{new Date(`${session.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                  <small>{session.day} · Time not recorded</small>
                </span>
                <span className="approved-session-contact">
                  <span className="approved-avatar !h-8 !w-8 !text-[10px]">{initials || 'QT'}</span>
                  <strong title={contactNames}>{contactNames}</strong>
                </span>
                <span>
                  <strong>{primaryAssignment ? formatPortionLabel(primaryAssignment) : 'No portion'}</strong>
                  {additionalAssignments > 0 && <small>+{additionalAssignments} more</small>}
                </span>
                <span className="approved-session-sections">
                  {sections.length > 0 ? sections.map((section) => (
                    <span key={section} className={`section-${section}`}>{section === 'revision' ? 'Manzil' : section}</span>
                  )) : <small>None</small>}
                </span>
                <span><span className="approved-performance-badge">{performance}</span></span>
                <span><strong>{mistakeCount}</strong></span>
                <span>
                  {activeTab === 'listening' ? (
                    <button
                      type="button"
                      className="approved-note-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setNotesClassId(session.id);
                        setNotesText(session.notes || '');
                        setShowNotesModal(true);
                      }}
                      title={session.notes || 'Add session note'}
                    >
                      {session.notes || 'Add note'}
                    </button>
                  ) : (
                    <span className="approved-note-button" title={session.notes || 'No note'}>
                      {session.notes || 'No note'}
                    </span>
                  )}
                </span>
                <span><span className={`approved-status-badge ${session.is_published ? 'published' : 'draft'}`}>{session.is_published ? 'Published' : 'Draft'}</span></span>
                <span>
                  <span className="approved-row-open" aria-hidden="true">›</span>
                </span>
              </div>
            );
          }) : (
            <div className="approved-empty-state">
              <strong className="text-[var(--text-primary)]">No sessions match these filters.</strong>
              <span className="mt-1">{activeTab === 'listening' ? 'Adjust the filters or create a listening session.' : 'Adjust the filters; sessions where you recite will appear here.'}</span>
            </div>
          )}
        </div>

        <footer className="approved-session-table-footer">
          <span>Showing {filteredSessions.length} of {activeSessions.length} sessions</span>
          <span>{activeTab === 'listening' ? 'Sessions where you listen' : 'Sessions where you recite'}</span>
        </footer>
      </section>

      {/* New session modal */}
      {showNewClassModal && (
        <div className="new-session-backdrop">
          <div className="new-session-dialog">
            {/* Modal Header */}
            <div className="new-session-dialog-header">
              <div>
                <span className="new-session-dialog-eyebrow">CREATE LISTENING SESSION</span>
                <h2>{modalStep === 1 ? 'Choose your reciters' : 'Build the recitation plan'}</h2>
                <p>{modalStep === 1 ? 'Select who will recite and set the session date.' : 'Choose only the Hifz, Sabqi, and Manzil ranges needed today.'}</p>
              </div>
              <div className="new-session-dialog-header-actions">
                <div className="new-session-step-track" aria-label={`Step ${modalStep} of 2`}>
                  <span className="complete">1</span><i /><span className={modalStep === 2 ? 'complete' : ''}>2</span>
                </div>
                <button onClick={resetModal} className="new-session-close" aria-label="Close new session dialog">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div ref={modalBodyRef} className="new-session-dialog-body">
              {modalStep === 1 ? (
                /* Step 1: Select reciters */
                <div className="new-session-reciter-step">
                  {/* Date Picker */}
                  <div data-tour="class-date" className="new-session-date-card">
                    <label className={`block text-sm font-medium mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Session Date
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
                  <div data-tour="student-selector" className="new-session-reciter-picker">
                  <div className="new-session-reciter-picker-title">
                    <span>RECITERS</span>
                    <strong>Select one or more people</strong>
                  </div>
                  {students.length === 0 ? (
                    <div className={`p-6 rounded-xl text-center ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                      <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>No reciters added yet</p>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Add contacts from the Dashboard first</p>
                    </div>
                  ) : (
                    <div className="new-session-reciter-grid">
                      {students.map((student) => {
                        const isSelected = selectedStudents.includes(student.id);
                        return (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => toggleStudent(student.id)}
                            className={`new-session-reciter-card ${isSelected ? 'selected' : ''}`}
                          >
                            <div className="new-session-reciter-check">
                              {isSelected && (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="new-session-reciter-avatar">
                              {student.first_name[0]}{student.last_name[0]}
                            </div>
                            <span>{student.first_name} {student.last_name}</span>
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
                  <div className="new-session-plan-summary">
                    <span>RECITATION PLAN FOR</span>
                    <strong>{selectedStudentNames}</strong>
                    <small>{new Date(`${classDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</small>
                  </div>

                  {/* Portion Mode Toggle - only show if multiple students selected */}
                  {selectedStudents.length > 1 && (
                    <div className="new-session-assignment-mode">
                      <div><span>ASSIGNMENT METHOD</span><strong>How should portions be shared?</strong></div>
                      <div className="new-session-mode-segment">
                        <button
                          type="button"
                          onClick={() => setPortionMode('same')}
                          className={portionMode === 'same' ? 'active' : ''}
                        >
                          Same for all reciters
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPortionMode('per-student');
                            initPerStudentConfigs();
                          }}
                          className={portionMode === 'per-student' ? 'active' : ''}
                        >
                          Different per reciter
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Per-student tabs - show when in per-student mode (not for tests) */}
                  {portionMode === 'per-student' && selectedStudents.length > 1 && (
                    <div className="new-session-student-tabs">
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
                            className={isActive ? 'active' : ''}
                          >
                            <div className="new-session-student-tab-avatar">
                              {student.first_name[0]}
                            </div>
                            {student.first_name}
                            {hasPortions && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="new-session-plan-instruction">
                    <span>PORTION ASSIGNMENTS</span>
                    <strong>{portionMode === 'per-student' && selectedStudents.length > 1
                      ? `Configure ${students.find(s => s.id === activeStudentId)?.first_name || 'reciter'}’s ranges`
                      : 'Use the existing plan or adjust today’s ranges'}</strong>
                    <small>Sections may be left completely empty.</small>
                  </div>

                  <div className="new-session-portion-stack">
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
            <div className="new-session-dialog-footer">
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
                    disabled={selectedStudents.length === 0 && !isTourActive}
                    onClick={() => setModalStep(2)}
                    className="new-session-primary-action"
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
                    className="new-session-primary-action"
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
                      'Start Session'
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
        <div className="new-session-backdrop">
          <div className="session-notes-dialog">
            <header>
              <div><span className="approved-eyebrow">SESSION FOLLOW-UP</span><h2>Listener notes</h2><p>Keep observations and review instructions attached to this session.</p></div>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesClassId(null);
                }}
                aria-label="Close notes"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="session-notes-body">
              <label htmlFor="session-notes-text">Notes</label>
              <textarea id="session-notes-text" value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Add observations, feedback, or reminders for this session…" rows={6} />
              <small>These notes appear in Sessions and the teaching Overview.</small>
            </div>

            <footer>
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesClassId(null);
                }}
                className="approved-secondary-button"
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
                className="approved-primary-button"
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
            </footer>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(createError)}
        eyebrow="Session not created"
        title="Check the session details"
        message={createError || ''}
        confirmLabel="Close"
        showCancel={false}
        tone="primary"
        onCancel={() => setCreateError(null)}
        onConfirm={() => setCreateError(null)}
      />

    </div>
  );
}

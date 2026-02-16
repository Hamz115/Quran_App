import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { getClasses, getMyStudents, createClass, deleteClass, getSurahs, updateClassNotes, updateStudentPerformance, getSuggestedPortions } from '../api';
import type { StudentListItem, ClassData, SuggestedPortions } from '../api';
import { getPageRange, TOTAL_PAGES } from '../data/quranPages';
import { surahNames } from '../lib/quran-utils';
import { ReportPanel } from '../components/teacher-classes';

interface SurahInfo {
  number: number;
  englishName: string;
  name: string;
  numberOfAyahs: number;
}

interface SinglePortion {
  id: string;
  mode: 'page' | 'surah';  // Default to page
  startPage: number;
  endPage: number;
  startSurah: number;
  endSurah: number;
  startAyah: string;
  endAyah: string;
}

interface PortionConfig {
  enabled: boolean;
  portions: SinglePortion[];
}

// Group classes by month
const groupByMonth = (classes: ClassData[]) => {
  const grouped: Record<string, ClassData[]> = {};
  classes.forEach(cls => {
    const date = new Date(cls.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!grouped[monthKey]) grouped[monthKey] = [];
    grouped[monthKey].push(cls);
  });
  return grouped;
};

const getMonthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-');
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(month)]} ${year}`;
};

export default function TeacherClasses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [surahList, setSurahList] = useState<SurahInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesClassId, setNotesClassId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  // Filter state - current month selected by default
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<string | null>(null);

  // Auto-open report panel if ?report=ID, or modal if ?new=1
  useEffect(() => {
    const reportStudentId = searchParams.get('report');
    if (reportStudentId) {
      setSelectedReportStudentId(reportStudentId);
      setSearchParams({});
    }

    if (searchParams.get('new') === '1') {
      setShowNewClassModal(true);

      // Pre-select student if provided in URL and skip to step 2
      const studentId = searchParams.get('student');
      if (studentId) {
        setSelectedStudents([studentId]);
        setModalStep(2); // Skip to portion selection since student is already selected
      }

      // Remove the query params from URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Portion configuration mode: 'same' for all students, 'per-student' for individual
  const [portionMode, setPortionMode] = useState<'same' | 'per-student'>('same');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  // Suggestions state - keyed by student ID
  const [suggestions, setSuggestions] = useState<Record<string, SuggestedPortions>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({});

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
    endAyah: ''
  });

  // Default configs (used when mode is 'same' or as fallback)
  const [hifzConfig, setHifzConfig] = useState<PortionConfig>({ enabled: true, portions: [createDefaultPortion()] });
  const [sabqiConfig, setSabqiConfig] = useState<PortionConfig>({ enabled: false, portions: [createDefaultPortion()] });
  const [revisionConfig, setRevisionConfig] = useState<PortionConfig>({ enabled: false, portions: [createDefaultPortion()] });

  // Per-student configs: Map of student_id -> { hifz, sabqi, revision }
  const [perStudentConfigs, setPerStudentConfigs] = useState<Record<string, {
    hifz: PortionConfig;
    sabqi: PortionConfig;
    revision: PortionConfig;
  }>>({});

  // Ref for modal scroll preservation
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [classesData, studentsData, surahsData] = await Promise.all([
          getClasses(),
          getMyStudents(),
          getSurahs()
        ]);
        if (isMounted) {
          setClasses(classesData);
          setStudents(studentsData);
          setSurahList(surahsData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

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
    setSabqiConfig({ enabled: false, portions: [createDefaultPortion()] });
    setRevisionConfig({ enabled: false, portions: [createDefaultPortion()] });
    setPerStudentConfigs({});
  };

  // Initialize per-student configs when switching to per-student mode
  const initPerStudentConfigs = () => {
    const configs: Record<string, { hifz: PortionConfig; sabqi: PortionConfig; revision: PortionConfig }> = {};
    selectedStudents.forEach(studentId => {
      configs[studentId] = {
        hifz: { enabled: true, portions: [createDefaultPortion()] },
        sabqi: { enabled: false, portions: [createDefaultPortion()] },
        revision: { enabled: false, portions: [createDefaultPortion()] },
      };
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
        sabqi: { enabled: false, portions: [createDefaultPortion()] },
        revision: { enabled: false, portions: [createDefaultPortion()] },
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

  // Fetch suggestions for a student
  const fetchSuggestionsForStudent = async (studentId: string) => {
    if (suggestions[studentId] || loadingSuggestions[studentId]) return;

    setLoadingSuggestions(prev => ({ ...prev, [studentId]: true }));
    try {
      const data = await getSuggestedPortions(studentId);
      setSuggestions(prev => ({ ...prev, [studentId]: data }));
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [studentId]: false }));
    }
  };

  // Apply suggestion to portion config
  const applySuggestion = (
    type: 'hifz' | 'sabqi' | 'manzil',
    studentId?: string
  ) => {
    const studentSuggestions = studentId ? suggestions[studentId] : suggestions[selectedStudents[0]];
    if (!studentSuggestions) return;

    const suggestion = type === 'manzil' ? studentSuggestions.manzil : studentSuggestions[type];
    if (!suggestion) return;

    const newPortion: SinglePortion = {
      id: String(Date.now()),
      mode: 'surah',
      startPage: 1,
      endPage: 1,
      startSurah: suggestion.start_surah,
      endSurah: suggestion.end_surah,
      startAyah: suggestion.start_ayah?.toString() || '',
      endAyah: suggestion.end_ayah?.toString() || '',
    };

    const portionType = type === 'manzil' ? 'revision' : type;

    if (portionMode === 'per-student' && studentId) {
      // Update per-student config
      setPerStudentConfigs(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [portionType]: { enabled: true, portions: [newPortion] },
        },
      }));
    } else {
      // Update shared config
      if (portionType === 'hifz') {
        setHifzConfig({ enabled: true, portions: [newPortion] });
      } else if (portionType === 'sabqi') {
        setSabqiConfig({ enabled: true, portions: [newPortion] });
      } else {
        setRevisionConfig({ enabled: true, portions: [newPortion] });
      }
    }
  };

  // Auto-fetch suggestions when students are selected
  useEffect(() => {
    if (modalStep === 2 && selectedStudents.length > 0) {
      selectedStudents.forEach(studentId => {
        fetchSuggestionsForStudent(studentId);
      });
    }
  }, [modalStep, selectedStudents]);

  const handleCreateClass = async () => {
    setCreating(true);
    try {
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
        date: today.toISOString().split('T')[0],
        day: days[today.getDay()],
        student_ids: selectedStudents,
        assignments
      });

      if (result.id) {
        resetModal();
        window.location.href = `/teacher/classes/${result.id}`;
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

  // Get all unique months from classes (for tabs)
  const allMonths = useMemo(() => {
    const months = new Set<string>();
    classes.forEach(cls => {
      const date = new Date(cls.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a)); // Newest first
  }, [classes]);

  // Get recent months for tabs (last 4 months that have classes, or current month)
  const recentMonths = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Always include current month even if no classes
    const months = new Set([currentMonth]);
    allMonths.slice(0, 4).forEach(m => months.add(m));

    return Array.from(months).sort((a, b) => b.localeCompare(a)).slice(0, 4);
  }, [allMonths]);

  // Filter classes by selected month and student
  const filteredClasses = useMemo(() => {
    let result = classes;

    // Filter by student if selected
    if (selectedStudentFilter) {
      result = result.filter(c =>
        c.students?.some(s => s.id === selectedStudentFilter)
      );
    }

    // Filter by month
    if (selectedMonth) {
      result = result.filter(c => c.date.startsWith(selectedMonth));
    }

    return result;
  }, [classes, selectedStudentFilter, selectedMonth]);

  // Count classes per month (for badges)
  const classCountByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    let classesToCount = classes;

    // If student filter is active, count only that student's classes
    if (selectedStudentFilter) {
      classesToCount = classes.filter(c =>
        c.students?.some(s => s.id === selectedStudentFilter)
      );
    }

    classesToCount.forEach(cls => {
      const date = new Date(cls.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts[monthKey] = (counts[monthKey] || 0) + 1;
    });
    return counts;
  }, [classes, selectedStudentFilter]);

  const groupedClasses = groupByMonth(filteredClasses);
  const sortedMonths = Object.keys(groupedClasses).sort((a, b) => b.localeCompare(a));

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

  // Toggle Switch Component
  const ToggleSwitch = ({ enabled, onChange, color }: { enabled: boolean; onChange: (v: boolean) => void; color: string }) => (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
        enabled ? color : 'bg-slate-600'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const PortionSelector = ({
    label,
    description,
    borderColor,
    toggleColor,
    config,
    setConfig
  }: {
    label: string;
    description: string;
    borderColor: string;
    toggleColor: string;
    config: PortionConfig;
    setConfig: (c: PortionConfig) => void;
  }) => {
    const updatePortion = (portionId: string, updates: Partial<SinglePortion>) => {
      // Save scroll position before state update
      const scrollTop = modalBodyRef.current?.scrollTop || 0;
      setConfig({
        ...config,
        portions: config.portions.map(p => p.id === portionId ? { ...p, ...updates } : p)
      });
      // Restore scroll position after state update
      requestAnimationFrame(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTop = scrollTop;
        }
      });
    };

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

    // Convert page to surah/ayah when page changes
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

    return (
      <div className={`p-4 rounded-xl border-2 transition-all ${
        config.enabled ? borderColor : 'border-slate-700 bg-slate-800/30'
      }`}>
        {/* Header with toggle */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className={`font-semibold ${config.enabled ? 'text-slate-100' : 'text-slate-400'}`}>
              {label}
            </h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <ToggleSwitch enabled={config.enabled} onChange={(v) => setConfig({ ...config, enabled: v })} color={toggleColor} />
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
                  {index > 0 && <div className="border-t border-slate-700 pt-3" />}

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

                  {/* Mode Toggle - Page (default) or Surah */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => updatePortion(portion.id, { mode: 'page' })}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        portion.mode === 'page'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700'
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
                          : 'bg-slate-700/50 text-slate-400 border border-transparent hover:bg-slate-700'
                      }`}
                    >
                      By Surah
                    </button>
                  </div>

                  {portion.mode === 'page' ? (
                    /* Page-based selection */
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">From Page</label>
                        <input
                          type="number"
                          min="1"
                          max={TOTAL_PAGES}
                          value={portion.startPage}
                          onChange={(e) => {
                            const newStart = Math.min(Math.max(1, parseInt(e.target.value) || 1), TOTAL_PAGES);
                            handlePageChange(
                              portion.id,
                              newStart,
                              Math.max(newStart, portion.endPage)
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">To Page</label>
                        <input
                          type="number"
                          min={portion.startPage}
                          max={TOTAL_PAGES}
                          value={portion.endPage}
                          onChange={(e) => {
                            const newEnd = Math.min(Math.max(portion.startPage, parseInt(e.target.value) || portion.startPage), TOTAL_PAGES);
                            handlePageChange(portion.id, portion.startPage, newEnd);
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Surah-based selection */
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">From Surah</label>
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
                            className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {surahList.map((surah) => (
                              <option key={surah.number} value={surah.number}>
                                {surah.number}. {surah.englishName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">To Surah</label>
                          <select
                            value={portion.endSurah}
                            onChange={(e) => updatePortion(portion.id, { endSurah: parseInt(e.target.value), startAyah: '', endAyah: '' })}
                            className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {surahList.filter(s => s.number >= portion.startSurah).map((surah) => (
                              <option key={surah.number} value={surah.number}>
                                {surah.number}. {surah.englishName}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">From Ayah (optional)</label>
                          <input
                            type="number"
                            min="1"
                            max={maxStartAyahs}
                            placeholder="All"
                            value={portion.startAyah}
                            onChange={(e) => updatePortion(portion.id, { startAyah: e.target.value })}
                            disabled={!isSameSurah}
                            className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">To Ayah (optional)</label>
                          <input
                            type="number"
                            min="1"
                            max={maxEndAyahs}
                            placeholder="All"
                            value={portion.endAyah}
                            onChange={(e) => updatePortion(portion.id, { endAyah: e.target.value })}
                            disabled={!isSameSurah}
                            className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                </div>
              );
            })}

            <button
              type="button"
              onClick={addPortion}
              className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-500 text-sm transition-colors"
            >
              + Add Another Portion
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Classes</h1>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage all your teaching sessions</p>
        </div>
        <button
          onClick={() => setShowNewClassModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Class
        </button>
      </div>

      {/* Filter Bar */}
      <div className={`rounded-xl p-4 space-y-3 ${darkMode ? 'bg-slate-800/50' : 'bg-white border border-slate-200'}`}>
        {/* Row 1: Students */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium w-16 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Student</span>
          <div className="flex gap-2 overflow-x-auto flex-1 pb-1">
            <button
              onClick={() => setSelectedStudentFilter(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedStudentFilter === null
                  ? 'bg-blue-600 text-white shadow-lg'
                  : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              All
            </button>
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentFilter(s.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedStudentFilter === s.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {s.first_name}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Months */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium w-16 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Month</span>
          <div className="flex gap-2 overflow-x-auto flex-1 pb-1">
            {recentMonths.map(month => {
              const count = classCountByMonth[month] || 0;
              const isSelected = selectedMonth === month;
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg'
                      : darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {getMonthLabel(month)}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                    isSelected ? 'bg-blue-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Older months dropdown if there are more */}
            {allMonths.length > 4 && (
              <select
                value={!recentMonths.includes(selectedMonth) ? selectedMonth : ''}
                onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                className={`rounded-full px-4 py-2 text-sm border-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
              >
                <option value="">Older...</option>
                {allMonths.filter(m => !recentMonths.includes(m)).map(month => (
                  <option key={month} value={month}>
                    {getMonthLabel(month)} ({classCountByMonth[month] || 0})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Classes grouped by month */}
      {sortedMonths.length > 0 ? (
        sortedMonths.map(monthKey => {
          const monthClasses = groupedClasses[monthKey];

          // Helper to get week number within month
          const getWeekOfMonth = (dateStr: string) => {
            const date = new Date(dateStr);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const dayOfMonth = date.getDate();
            const firstDayOfWeek = firstDay.getDay();
            return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
          };

          // Helper to format portion display nicely - now filters by student
          const getPortionDisplay = (cls: ClassData, type: string, studentId?: string) => {
            // Filter portions: show shared (no student_id) + student-specific
            const portions = cls.assignments.filter(a =>
              a.type === type && (!a.student_id || a.student_id === studentId)
            );
            if (portions.length === 0) return <span className="text-slate-600">—</span>;

            return portions.map((p, i) => {
              const startName = surahNames[p.start_surah] || `Surah ${p.start_surah}`;
              const endName = surahNames[p.end_surah] || `Surah ${p.end_surah}`;

              let display = '';
              if (p.start_surah === p.end_surah) {
                // Same surah - show ayah range if available
                display = startName;
                if (p.start_ayah && p.end_ayah) {
                  display += ` (${p.start_ayah}-${p.end_ayah})`;
                }
              } else {
                // Different surahs - show range
                display = `${startName} to ${endName}`;
              }

              return <div key={i} className="text-sm">{display}{i < portions.length - 1 ? ', ' : ''}</div>;
            });
          };

          // Expand classes: one row per student (or one row if no students)
          type ExpandedRow = {
            cls: ClassData;
            student: { id: string; first_name: string; last_name: string; performance?: string } | null;
            isFirstOfClass: boolean;
            isLastOfClass: boolean;
            studentCount: number;
          };

          const expandedRows: ExpandedRow[] = [];
          monthClasses.forEach(cls => {
            if (cls.students && cls.students.length > 0) {
              cls.students.forEach((student, idx) => {
                expandedRows.push({
                  cls,
                  student,
                  isFirstOfClass: idx === 0,
                  isLastOfClass: idx === cls.students!.length - 1,
                  studentCount: cls.students!.length,
                });
              });
            } else {
              // No students - show single row
              expandedRows.push({
                cls,
                student: null,
                isFirstOfClass: true,
                isLastOfClass: true,
                studentCount: 0,
              });
            }
          });

          return (
            <div key={monthKey} className={`card overflow-hidden ${darkMode ? '' : 'bg-white border-slate-200'}`}>
              {/* Month Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <h2 className={`text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{getMonthLabel(monthKey)}</h2>
                  <span className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>({monthClasses.length} {monthClasses.length === 1 ? 'class' : 'classes'})</span>
                </div>
              </div>

              {/* Class Cards */}
              <div className="space-y-4 p-4">
                {monthClasses.map((cls) => {
                  const classDate = new Date(cls.date);
                  const weekNum = getWeekOfMonth(cls.date);
                  const students = cls.students || [];

                  return (
                    <div
                      key={cls.id}
                      onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                      className={`rounded-xl border overflow-hidden transition-colors cursor-pointer ${darkMode ? 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                    >
                      {/* Class Header */}
                      <div className={`flex items-center justify-between px-5 py-3 border-b ${darkMode ? 'bg-slate-800/80 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`}>
                        <div className="flex items-center gap-4">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold ${darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                            W{weekNum}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                {cls.day}, {`${String(classDate.getDate()).padStart(2, '0')}/${String(classDate.getMonth() + 1).padStart(2, '0')}/${classDate.getFullYear()}`}
                              </span>
                            </div>
                            <div className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {students.length} student{students.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Notes Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotesClassId(cls.id);
                              setNotesText(cls.notes || '');
                              setShowNotesModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
                            title="Edit notes"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this class?')) {
                                await deleteClass(cls.id);
                                const updated = await getClasses();
                                setClasses(updated);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete class"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Portions Section */}
                      <div className="p-4">
                        {students.length === 0 ? (
                          <div className={`text-center py-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No students assigned</div>
                        ) : (
                          <div className="space-y-4">
                            {students.map((student) => (
                              <div
                                key={student.id}
                                onClick={() => {
                                  window.location.href = `/teacher/classes/${cls.id}?student=${student.id}`;
                                }}
                                className={`rounded-lg p-4 cursor-pointer transition-colors ${darkMode ? 'bg-slate-900/50 hover:bg-slate-900/80' : 'bg-slate-50 hover:bg-slate-100'}`}
                              >
                                {/* Student Header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">
                                      {student.first_name[0]}
                                    </span>
                                    <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{student.first_name} {student.last_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                  {/* Report Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReportStudentId(student.id);
                                    }}
                                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                                      darkMode
                                        ? 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20'
                                        : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200'
                                    }`}
                                    title="View student report"
                                  >
                                    Report
                                  </button>
                                  {/* Performance Dropdown */}
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <select
                                      value={student.performance || ''}
                                      onChange={async (e) => {
                                        const newPerf = e.target.value;
                                        // Optimistic update so the dropdown shows the selection immediately
                                        setClasses(prev => prev.map(c =>
                                          c.id === cls.id ? {
                                            ...c,
                                            students: c.students?.map(s =>
                                              s.id === student.id ? { ...s, performance: newPerf || undefined } : s
                                            )
                                          } : c
                                        ));
                                        try {
                                          await updateStudentPerformance(cls.id, student.id, newPerf);
                                        } catch (err) {
                                          console.error('Failed to save performance:', err);
                                        }
                                      }}
                                      className={`appearance-none text-xs font-medium px-3 py-1.5 pr-7 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                                        student.performance === 'Excellent'
                                          ? darkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-300'
                                          : student.performance === 'Very Good'
                                          ? darkMode ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-teal-100 text-teal-700 border border-teal-300'
                                          : student.performance === 'Good'
                                          ? darkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-300'
                                          : student.performance === 'Needs Work'
                                          ? darkMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'
                                          : darkMode ? 'bg-slate-700/50 text-slate-400 border border-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-300'
                                      }`}
                                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${darkMode ? '%2394a3b8' : '%2364748b'}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1rem' }}
                                    >
                                      <option value="" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Select...</option>
                                      <option value="Excellent" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Excellent</option>
                                      <option value="Very Good" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Very Good</option>
                                      <option value="Good" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Good</option>
                                      <option value="Needs Work" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Needs Work</option>
                                    </select>
                                  </div>
                                  </div>
                                </div>

                                {/* Portions Grid - Each type on its own row */}
                                <div className="space-y-2">
                                  {/* Hifz Row */}
                                  <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${darkMode ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-blue-50 border border-blue-200/50'}`}>
                                    <span className={`text-xs font-semibold w-16 flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>HIFZ</span>
                                    <span className={`text-sm flex-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>{getPortionDisplay(cls, 'hifz', student.id)}</span>
                                    {(student.mistake_counts?.hifz ?? 0) > 0 && (
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        (student.mistake_counts?.hifz ?? 0) >= 5 ? 'bg-red-500/20 text-red-400'
                                        : (student.mistake_counts?.hifz ?? 0) >= 3 ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-blue-500/20 text-blue-400'
                                      }`}>
                                        {student.mistake_counts?.hifz} {student.mistake_counts?.hifz === 1 ? 'mistake' : 'mistakes'}
                                      </span>
                                    )}
                                  </div>
                                  {/* Sabqi Row */}
                                  <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${darkMode ? 'bg-cyan-500/5 border border-cyan-500/10' : 'bg-cyan-50 border border-cyan-200/50'}`}>
                                    <span className={`text-xs font-semibold w-16 flex-shrink-0 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>SABQI</span>
                                    <span className={`text-sm flex-1 ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>{getPortionDisplay(cls, 'sabqi', student.id)}</span>
                                    {(student.mistake_counts?.sabqi ?? 0) > 0 && (
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        (student.mistake_counts?.sabqi ?? 0) >= 5 ? 'bg-red-500/20 text-red-400'
                                        : (student.mistake_counts?.sabqi ?? 0) >= 3 ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-cyan-500/20 text-cyan-400'
                                      }`}>
                                        {student.mistake_counts?.sabqi} {student.mistake_counts?.sabqi === 1 ? 'mistake' : 'mistakes'}
                                      </span>
                                    )}
                                  </div>
                                  {/* Manzil Row */}
                                  <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${darkMode ? 'bg-slate-500/5 border border-slate-500/10' : 'bg-slate-50 border border-slate-200/50'}`}>
                                    <span className={`text-xs font-semibold w-16 flex-shrink-0 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>MANZIL</span>
                                    <span className={`text-sm flex-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{getPortionDisplay(cls, 'revision', student.id)}</span>
                                    {(student.mistake_counts?.revision ?? 0) > 0 && (
                                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                        (student.mistake_counts?.revision ?? 0) >= 5 ? 'bg-red-500/20 text-red-400'
                                        : (student.mistake_counts?.revision ?? 0) >= 3 ? 'bg-amber-500/20 text-amber-400'
                                        : 'bg-slate-500/20 text-slate-400'
                                      }`}>
                                        {student.mistake_counts?.revision} {student.mistake_counts?.revision === 1 ? 'mistake' : 'mistakes'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Notes Section (if has notes) */}
                      {cls.notes && (
                        <div className={`px-5 py-3 border-t ${darkMode ? 'border-slate-700/50 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            <span className={`font-medium ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>Notes:</span> {cls.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        /* Empty State */
        <div className={`card p-12 text-center ${darkMode ? '' : 'bg-white border-slate-200'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <svg className={`w-8 h-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          {classes.length === 0 ? (
            <>
              <p className={`text-lg font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>No classes yet</p>
              <p className={`mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Start your first class to begin tracking</p>
            </>
          ) : (
            <>
              <p className={`text-lg font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>No classes found</p>
              <p className={`mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                No classes in {getMonthLabel(selectedMonth)}
                {selectedStudentFilter && ` for ${students.find(s => s.id === selectedStudentFilter)?.first_name || 'this student'}`}
              </p>
              <button
                onClick={() => {
                  setSelectedStudentFilter(null);
                  const now = new Date();
                  setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                }}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
              >
                Clear filters
              </button>
            </>
          )}
        </div>
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
                  {/* Class Type Toggle */}
                  <label className="block text-sm font-medium text-slate-300">
                    Select students for this class
                  </label>
                  {students.length === 0 ? (
                    <div className="p-6 bg-slate-700/30 rounded-xl text-center">
                      <p className="text-slate-400">No students added yet</p>
                      <p className="text-sm text-slate-500 mt-1">Add students from the Dashboard first</p>
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
                                ? 'bg-blue-500/20 border-2 border-blue-500'
                                : 'bg-slate-700/50 border-2 border-transparent hover:bg-slate-700'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-slate-500'
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
                            <span className="text-slate-200 font-medium">{student.first_name} {student.last_name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Configure Portions */
                <div className="space-y-4">
                  <div className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-2">
                    <p className="text-sm text-slate-400">
                      {'Class'} with: <span className={`font-medium text-blue-400`}>{selectedStudentNames}</span>
                    </p>
                  </div>

                  {/* Portion Mode Toggle - only show if multiple students selected */}
                  {selectedStudents.length > 1 && (
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        How do you want to assign portions?
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPortionMode('same')}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                            portionMode === 'same'
                              ? 'bg-blue-500/20 text-blue-400 border-2 border-blue-500'
                              : 'bg-slate-700/50 text-slate-400 border-2 border-transparent hover:bg-slate-700'
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
                              : 'bg-slate-700/50 text-slate-400 border-2 border-transparent hover:bg-slate-700'
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
                                : 'bg-slate-700/50 text-slate-400 border-2 border-transparent hover:bg-slate-700'
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

                  <p className="text-sm text-slate-300">
                    {portionMode === 'per-student' && selectedStudents.length > 1
                      ? `Configure portions for ${students.find(s => s.id === activeStudentId)?.first_name || 'student'}:`
                      : 'Select the Quran portions for this class (you can also add/edit later):'}
                  </p>

                  {/* Smart Suggestions Panel */}
                  {(() => {
                    const targetStudentId = portionMode === 'per-student' ? activeStudentId : selectedStudents[0];
                    const studentSuggestions = targetStudentId ? suggestions[targetStudentId] : null;
                    const isLoading = targetStudentId ? loadingSuggestions[targetStudentId] : false;

                    if (!targetStudentId) return null;

                    return (
                      <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span className="text-sm font-medium text-purple-300">Smart Suggestions</span>
                          {studentSuggestions?.last_class && (
                            <span className="text-xs text-slate-500">
                              (based on {studentSuggestions.last_class.day}, {studentSuggestions.last_class.date})
                            </span>
                          )}
                        </div>

                        {isLoading ? (
                          <div className="text-sm text-slate-400 flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Loading suggestions...
                          </div>
                        ) : studentSuggestions ? (
                          <div className="grid grid-cols-3 gap-2">
                            {/* Hifz Suggestion */}
                            {studentSuggestions.hifz && (
                              <button
                                type="button"
                                onClick={() => applySuggestion('hifz', portionMode === 'per-student' ? activeStudentId || undefined : undefined)}
                                className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors text-left"
                              >
                                <div className="text-xs font-medium text-blue-400 mb-1">HIFZ</div>
                                <div className="text-sm text-blue-300">{studentSuggestions.hifz.surah_name || `Surah ${studentSuggestions.hifz.start_surah}`}</div>
                                {studentSuggestions.hifz.start_ayah && (
                                  <div className="text-xs text-blue-400/70">
                                    Ayah {studentSuggestions.hifz.start_ayah}-{studentSuggestions.hifz.end_ayah}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-500 mt-1">{studentSuggestions.hifz.note}</div>
                              </button>
                            )}

                            {/* Sabqi Suggestion */}
                            {studentSuggestions.sabqi && (
                              <button
                                type="button"
                                onClick={() => applySuggestion('sabqi', portionMode === 'per-student' ? activeStudentId || undefined : undefined)}
                                className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors text-left"
                              >
                                <div className="text-xs font-medium text-cyan-400 mb-1">SABQI</div>
                                <div className="text-sm text-cyan-300">{studentSuggestions.sabqi.surah_name || `Surah ${studentSuggestions.sabqi.start_surah}`}</div>
                                {studentSuggestions.sabqi.start_ayah && (
                                  <div className="text-xs text-cyan-400/70">
                                    Ayah {studentSuggestions.sabqi.start_ayah}-{studentSuggestions.sabqi.end_ayah}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-500 mt-1">{studentSuggestions.sabqi.note}</div>
                              </button>
                            )}

                            {/* Manzil Suggestion */}
                            {studentSuggestions.manzil && (
                              <button
                                type="button"
                                onClick={() => applySuggestion('manzil', portionMode === 'per-student' ? activeStudentId || undefined : undefined)}
                                className="p-2 rounded-lg bg-slate-500/10 border border-slate-500/30 hover:bg-slate-500/20 transition-colors text-left"
                              >
                                <div className="text-xs font-medium text-slate-400 mb-1">MANZIL</div>
                                <div className="text-sm text-slate-300">{studentSuggestions.manzil.surah_name || `Surah ${studentSuggestions.manzil.start_surah}`}</div>
                                {studentSuggestions.manzil.start_ayah && (
                                  <div className="text-xs text-slate-400/70">
                                    Ayah {studentSuggestions.manzil.start_ayah}-{studentSuggestions.manzil.end_ayah}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-500 mt-1">{studentSuggestions.manzil.note}</div>
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400">
                            No previous classes found for this student. Start with default portions.
                          </div>
                        )}

                        <p className="text-[10px] text-slate-500 mt-2">
                          Click a suggestion to auto-fill the portion. You can modify it afterward.
                        </p>
                      </div>
                    );
                  })()}

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
                        />
                        <PortionSelector
                          label="Sabqi (Recent)"
                          description="Recently memorized, needs reinforcement"
                          borderColor="border-blue-500 bg-blue-500/5"
                          toggleColor="bg-blue-500"
                          config={sabqiConfig}
                          setConfig={setSabqiConfig}
                        />
                        <PortionSelector
                          label="Revision (Manzil)"
                          description="Long-term revision"
                          borderColor="border-purple-500 bg-purple-500/5"
                          toggleColor="bg-purple-500"
                          config={revisionConfig}
                          setConfig={setRevisionConfig}
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
                        />
                        <PortionSelector
                          label="Sabqi (Recent)"
                          description="Recently memorized, needs reinforcement"
                          borderColor="border-blue-500 bg-blue-500/5"
                          toggleColor="bg-blue-500"
                          config={getActiveStudentConfig().sabqi}
                          setConfig={(c) => updateActiveStudentConfig('sabqi', c)}
                        />
                        <PortionSelector
                          label="Revision (Manzil)"
                          description="Long-term revision"
                          borderColor="border-purple-500 bg-purple-500/5"
                          toggleColor="bg-purple-500"
                          config={getActiveStudentConfig().revision}
                          setConfig={(c) => updateActiveStudentConfig('revision', c)}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-700 flex gap-3 flex-shrink-0">
              {modalStep === 1 ? (
                <>
                  <button
                    onClick={resetModal}
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
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
                    className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
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
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
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
                className="text-slate-400 hover:text-slate-200"
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
                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-shadow"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setNotesClassId(null);
                }}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
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

      {selectedReportStudentId && (
        <ReportPanel
          key={selectedReportStudentId}
          studentId={selectedReportStudentId}
          onClose={() => setSelectedReportStudentId(null)}
        />
      )}
    </div>
  );
}

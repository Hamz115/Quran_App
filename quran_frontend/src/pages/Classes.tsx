import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSurahs, getClasses, createClass, deleteClass, createBackup, listBackups, restoreBackup, updateClassPerformance, updateClassNotes } from '../api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface SurahInfo {
  number: number;
  englishName: string;
  name: string;
  numberOfAyahs: number;
}

interface Assignment {
  id: number;
  type: 'hifz' | 'sabqi' | 'revision';
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
}

interface ClassData {
  id: number;
  date: string;
  day: string;
  notes?: string;
  performance?: string;
  assignments: Assignment[];
}

interface PortionInput {
  id: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
}

interface SectionInput {
  type: 'hifz' | 'sabqi' | 'revision';
  enabled: boolean;
  portions: PortionInput[];
}

const createPortion = (start_surah = 67, end_surah = 67): PortionInput => ({
  id: Math.random().toString(36).substr(2, 9),
  start_surah,
  end_surah,
});

const DEFAULT_SECTIONS: SectionInput[] = [
  { type: 'hifz', enabled: true, portions: [{ id: '1', start_surah: 67, end_surah: 67, start_ayah: 1, end_ayah: 10 }] },
  { type: 'sabqi', enabled: true, portions: [{ id: '2', start_surah: 93, end_surah: 96 }] },
  { type: 'revision', enabled: true, portions: [{ id: '3', start_surah: 97, end_surah: 114 }] },
];

const SECTION_CONFIG = {
  hifz: { label: 'Hifz (New Memorization)', color: 'emerald', description: 'New verses to memorize' },
  sabqi: { label: 'Sabqi (Recent)', color: 'blue', description: 'Recently memorized, needs reinforcement' },
  revision: { label: 'Revision (Manzil)', color: 'purple', description: 'Long-term revision' },
};

export default function Classes() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sections, setSections] = useState<SectionInput[]>(DEFAULT_SECTIONS);
  const [surahList, setSurahList] = useState<SurahInfo[]>([]);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [selectedNote, setSelectedNote] = useState<{ classId: number; note: string; isEditing: boolean } | null>(null);
  const [performanceDropdown, setPerformanceDropdown] = useState<number | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupList, setBackupList] = useState<{ filename: string; size: number; created: string }[]>([]);

  const handleCreateBackup = async () => {
    try {
      setBackupStatus('Creating backup...');
      const result = await createBackup();
      setBackupStatus(`Backup saved: ${result.filename}`);
      setTimeout(() => setBackupStatus(''), 5000);
    } catch (err) {
      setBackupStatus('Failed to create backup');
      setTimeout(() => setBackupStatus(''), 3000);
    }
  };

  const loadBackupList = async () => {
    try {
      const result = await listBackups();
      setBackupList(result.backups);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!confirm(`This will replace all your current data with ${filename}. Are you sure?`)) {
      return;
    }

    try {
      setBackupStatus('Restoring...');
      await restoreBackup(filename);
      setBackupStatus('Backup restored! Reloading...');
      setShowBackupModal(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setBackupStatus('Failed to restore backup');
      setTimeout(() => setBackupStatus(''), 3000);
    }
  };

  const openBackupModal = async () => {
    setShowBackupModal(true);
    await loadBackupList();
  };

  // Load surah list
  useEffect(() => {
    getSurahs().then(setSurahList).catch(console.error);
  }, []);

  // Load classes
  useEffect(() => {
    setLoading(true);
    getClasses()
      .then(setClasses)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getDayFromDate = (dateStr: string) => {
    return DAYS[new Date(dateStr).getDay()];
  };

  const handleToggleSection = (type: 'hifz' | 'sabqi' | 'revision') => {
    setSections(sections.map(s =>
      s.type === type ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleAddPortion = (type: 'hifz' | 'sabqi' | 'revision') => {
    setSections(sections.map(s =>
      s.type === type ? { ...s, portions: [...s.portions, createPortion()] } : s
    ));
  };

  const handleRemovePortion = (type: 'hifz' | 'sabqi' | 'revision', portionId: string) => {
    setSections(sections.map(s =>
      s.type === type ? { ...s, portions: s.portions.filter(p => p.id !== portionId) } : s
    ));
  };

  const handlePortionChange = (type: 'hifz' | 'sabqi' | 'revision', portionId: string, field: string, value: number | undefined) => {
    setSections(sections.map(s =>
      s.type === type ? {
        ...s,
        portions: s.portions.map(p => {
          if (p.id !== portionId) return p;

          const updated = { ...p, [field]: value };

          // Auto-match end_surah to start_surah when start_surah changes
          if (field === 'start_surah') {
            updated.end_surah = value as number;
          }

          // If adding ayah numbers, ensure end_surah matches start_surah
          if ((field === 'start_ayah' || field === 'end_ayah') && value !== undefined) {
            updated.end_surah = p.start_surah;
          }

          return updated;
        })
      } : s
    ));
  };

  const handleSubmit = async () => {
    try {
      const allAssignments: { type: string; start_surah: number; end_surah: number; start_ayah?: number; end_ayah?: number }[] = [];

      sections.forEach(section => {
        if (section.enabled && section.portions.length > 0) {
          section.portions.forEach(portion => {
            allAssignments.push({
              type: section.type,
              start_surah: portion.start_surah,
              end_surah: portion.end_surah,
              start_ayah: portion.start_ayah,
              end_ayah: portion.end_ayah,
            });
          });
        }
      });

      if (allAssignments.length === 0) {
        alert('Please add at least one portion');
        return;
      }

      await createClass({
        date,
        day: getDayFromDate(date),
        assignments: allAssignments,
      });

      // Reload classes
      const updatedClasses = await getClasses();
      setClasses(updatedClasses);

      setShowModal(false);
      setSections(DEFAULT_SECTIONS);
    } catch (err) {
      console.error('Failed to create class:', err);
    }
  };

  const handleDeleteClass = async (e: React.MouseEvent, classId: number) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      await deleteClass(classId);
      setClasses(classes.filter(c => c.id !== classId));
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  const handlePerformanceUpdate = async (classId: number, performance: string) => {
    try {
      await updateClassPerformance(classId, performance);
      setClasses(classes.map(c => c.id === classId ? { ...c, performance } : c));
      setPerformanceDropdown(null);
    } catch (err) {
      console.error('Failed to update performance:', err);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedNote) return;
    try {
      await updateClassNotes(selectedNote.classId, selectedNote.note || null);
      setClasses(classes.map(c => c.id === selectedNote.classId ? { ...c, notes: selectedNote.note || undefined } : c));
      setSelectedNote(null);
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const getPerformanceStyle = (perf?: string) => {
    switch (perf) {
      case 'Excellent':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'Very Good':
        return 'bg-teal-500/20 text-teal-400';
      case 'Good':
        return 'bg-amber-500/20 text-amber-400';
      case 'Needs Work':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-600/50 text-slate-400';
    }
  };

  const getSurahName = (num: number) => {
    const surah = surahList.find(s => s.number === num);
    return surah?.englishName || `Surah ${num}`;
  };

  const formatAssignment = (a: Assignment) => {
    const startName = getSurahName(a.start_surah);
    const endName = getSurahName(a.end_surah);

    if (a.start_surah === a.end_surah) {
      if (a.start_ayah && a.end_ayah) {
        return `${startName} (${a.start_ayah}-${a.end_ayah})`;
      }
      return startName;
    } else {
      return `${startName} to ${endName}`;
    }
  };

  // Group assignments by type for display
  const groupAssignmentsByType = (assignments: Assignment[]) => {
    const grouped: Record<string, Assignment[]> = {};
    assignments.forEach(a => {
      if (!grouped[a.type]) grouped[a.type] = [];
      grouped[a.type].push(a);
    });
    return grouped;
  };

  // Group classes by month for table view
  const groupClassesByMonth = () => {
    const grouped: Record<string, ClassData[]> = {};

    // Sort classes by date (newest first)
    const sortedClasses = [...classes].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    sortedClasses.forEach(cls => {
      const date = new Date(cls.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(cls);
    });

    return grouped;
  };

  // Get week number within the teaching period (from first class)
  const getWeekNumber = (dateStr: string) => {
    if (classes.length === 0) return 1;

    // Find the earliest class date
    const sortedDates = classes.map(c => new Date(c.date).getTime()).sort((a, b) => a - b);
    const firstClassDate = new Date(sortedDates[0]);
    const currentDate = new Date(dateStr);

    // Calculate weeks since first class
    const diffTime = currentDate.getTime() - firstClassDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

    return diffWeeks + 1;
  };

  const formatMonthHeader = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner mb-4"></div>
        <p className="text-slate-400">Loading classes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Classes</h1>
          <p className="text-slate-400 mt-1">Manage your teaching sessions</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Backup Status */}
          {backupStatus && (
            <span className={`text-sm px-3 py-1.5 rounded-lg ${
              backupStatus.includes('Failed') ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {backupStatus}
            </span>
          )}

          {/* Backup Buttons */}
          <button
            onClick={handleCreateBackup}
            className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="Create Backup"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={openBackupModal}
            className="p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="Restore Backup"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Class
          </button>
        </div>
      </div>

      {/* Classes List */}
      {classes.length === 0 ? (
        <div className="card p-20 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-100 mb-2">No classes yet</h3>
          <p className="text-slate-400 mb-8">Start your first class to begin tracking progress</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            Create First Class
          </button>
        </div>
      ) : (
        /* TABLE VIEW - Grouped by Month */
        <div className="space-y-6">
          {Object.entries(groupClassesByMonth()).map(([monthKey, monthClasses]) => (
            <div key={monthKey} className="card overflow-visible">
              {/* Month Header */}
              <div className="bg-slate-700/70 px-4 py-3 border-b border-slate-600">
                <h3 className="text-sm font-semibold text-slate-200">
                  {formatMonthHeader(monthKey)}
                  <span className="ml-2 text-slate-400 font-normal">({monthClasses.length} {monthClasses.length === 1 ? 'class' : 'classes'})</span>
                </h3>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/30 border-b border-slate-700">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-14">Week</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-20">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">Day</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-emerald-400 uppercase tracking-wider">Hifz</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-blue-400 uppercase tracking-wider">Sabqi</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-purple-400 uppercase tracking-wider">Manzil</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-amber-400 uppercase tracking-wider w-20">Perf.</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-10">Notes</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {monthClasses.map((classItem) => {
                    const hifzList = classItem.assignments.filter(a => a.type === 'hifz');
                    const sabqiList = classItem.assignments.filter(a => a.type === 'sabqi');
                    const revisionList = classItem.assignments.filter(a => a.type === 'revision');
                    const weekNum = getWeekNumber(classItem.date);

                    return (
                      <tr
                        key={classItem.id}
                        onClick={() => navigate(`/classes/${classItem.id}`)}
                        className="hover:bg-slate-700/30 cursor-pointer transition-colors group"
                      >
                        <td className="px-3 py-2 text-sm whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-600/50 text-slate-300 text-xs font-medium">
                            W{weekNum}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-300 whitespace-nowrap">
                          {new Date(classItem.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-400 whitespace-nowrap">
                          {classItem.day.substring(0, 3)}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {hifzList.length > 0 ? (
                            <span className="text-emerald-400 font-medium">
                              {hifzList.map((a, i) => (
                                <span key={a.id}>{i > 0 && ', '}{formatAssignment(a)}</span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {sabqiList.length > 0 ? (
                            <span className="text-blue-400 font-medium">
                              {sabqiList.map((a, i) => (
                                <span key={a.id}>{i > 0 && ', '}{formatAssignment(a)}</span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {revisionList.length > 0 ? (
                            <span className="text-purple-400 font-medium">
                              {revisionList.map((a, i) => (
                                <span key={a.id}>{i > 0 && ', '}{formatAssignment(a)}</span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm text-center">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setPerformanceDropdown(performanceDropdown === classItem.id ? null : classItem.id);
                              }}
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium cursor-pointer ${getPerformanceStyle(classItem.performance)} hover:opacity-80 transition-opacity`}
                            >
                              {classItem.performance || 'Set'}
                            </button>
                            {performanceDropdown === classItem.id && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl py-1 min-w-[110px]" style={{ zIndex: 9999 }}>
                                {['Excellent', 'Very Good', 'Good', 'Needs Work'].map((perf) => (
                                  <button
                                    key={perf}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handlePerformanceUpdate(classItem.id, perf);
                                    }}
                                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 transition-colors ${
                                      classItem.performance === perf ? 'text-emerald-400' : 'text-slate-300'
                                    }`}
                                  >
                                    {perf}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNote({ classId: classItem.id, note: classItem.notes || '', isEditing: true });
                            }}
                            className={`p-1 rounded transition-colors ${classItem.notes ? 'hover:bg-amber-500/20 text-amber-400' : 'hover:bg-slate-600 text-slate-500'}`}
                            title={classItem.notes ? "Edit note" : "Add note"}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={(e) => handleDeleteClass(e, classItem.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                            title="Delete class"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Note Edit Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedNote(null)}>
          <div className="bg-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-100">Class Note</h3>
              <button
                onClick={() => setSelectedNote(null)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={selectedNote.note}
              onChange={(e) => setSelectedNote({ ...selectedNote, note: e.target.value })}
              placeholder="Add a note for this class..."
              className="w-full h-32 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setSelectedNote(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Class Modal - BIGGER */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">New Class</h2>
                  <p className="text-slate-400 mt-1">Configure today's teaching session</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[65vh]">
              {/* Date */}
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Day</label>
                  <div className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-600 text-slate-300 font-medium">
                    {getDayFromDate(date)}
                  </div>
                </div>
              </div>

              {/* Three Sections with Multiple Portions */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-300">Portions</label>

                {sections.map((section) => {
                  const config = SECTION_CONFIG[section.type];
                  const colorClasses = {
                    emerald: {
                      bg: 'bg-emerald-500/20',
                      border: 'border-emerald-500/30',
                      text: 'text-emerald-400',
                      toggle: 'bg-emerald-500',
                      addBtn: 'text-emerald-400 hover:bg-emerald-500/20',
                    },
                    blue: {
                      bg: 'bg-blue-500/20',
                      border: 'border-blue-500/30',
                      text: 'text-blue-400',
                      toggle: 'bg-blue-500',
                      addBtn: 'text-blue-400 hover:bg-blue-500/20',
                    },
                    purple: {
                      bg: 'bg-purple-500/20',
                      border: 'border-purple-500/30',
                      text: 'text-purple-400',
                      toggle: 'bg-purple-500',
                      addBtn: 'text-purple-400 hover:bg-purple-500/20',
                    },
                  }[config.color];

                  return (
                    <div
                      key={section.type}
                      className={`rounded-xl border-2 overflow-hidden transition-all ${
                        section.enabled
                          ? `${colorClasses.border} ${colorClasses.bg}`
                          : 'border-slate-700 bg-slate-800/50 opacity-60'
                      }`}
                    >
                      {/* Section Header */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer"
                        onClick={() => handleToggleSection(section.type)}
                      >
                        <div>
                          <h3 className={`font-semibold ${section.enabled ? colorClasses.text : 'text-slate-400'}`}>
                            {config.label}
                          </h3>
                          <p className="text-sm text-slate-400 mt-0.5">{config.description}</p>
                        </div>
                        <button
                          className={`w-12 h-7 rounded-full transition-colors relative ${
                            section.enabled ? colorClasses.toggle : 'bg-slate-600'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              section.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Section Content - Multiple Portions */}
                      {section.enabled && (
                        <div className="px-4 pb-4 space-y-3">
                          {section.portions.map((portion, index) => (
                            <div key={portion.id} className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/30">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-400">Portion {index + 1}</span>
                                {section.portions.length > 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemovePortion(section.type, portion.id);
                                    }}
                                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-4 gap-3">
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">From Surah</label>
                                  <select
                                    value={portion.start_surah}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handlePortionChange(section.type, portion.id, 'start_surah', Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  >
                                    {surahList.map((surah) => (
                                      <option key={surah.number} value={surah.number}>
                                        {surah.number}. {surah.englishName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">To Surah</label>
                                  <select
                                    value={portion.end_surah}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handlePortionChange(section.type, portion.id, 'end_surah', Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  >
                                    {surahList.map((surah) => (
                                      <option key={surah.number} value={surah.number}>
                                        {surah.number}. {surah.englishName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">From Ayah</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={portion.start_ayah || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handlePortionChange(section.type, portion.id, 'start_ayah', e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="All"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">To Ayah</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={portion.end_ayah || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handlePortionChange(section.type, portion.id, 'end_ayah', e.target.value ? Number(e.target.value) : undefined)}
                                    placeholder="All"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Add Portion Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddPortion(section.type);
                            }}
                            className={`w-full py-2 rounded-lg border border-dashed border-slate-600 ${colorClasses.addBtn} text-sm font-medium flex items-center justify-center gap-2 transition-colors`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Another Portion
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-800/50 border-t border-slate-700/30 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!sections.some(s => s.enabled && s.portions.length > 0)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Class
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup/Restore Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Restore Backup</h2>
                  <p className="text-slate-400 mt-1">Select a backup to restore</p>
                </div>
                <button
                  onClick={() => setShowBackupModal(false)}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh]">
              {backupList.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">No backups found</h3>
                  <p className="text-slate-400">Create a backup first using the download button</p>
                </div>
              ) : (
                backupList.map((backup) => (
                  <div
                    key={backup.filename}
                    className="p-4 bg-slate-700/30 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-100">{backup.filename}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-400">
                            {new Date(backup.created).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-400">
                            {(backup.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreBackup(backup.filename)}
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-800/50 border-t border-slate-700/30 flex justify-end">
              <button
                onClick={() => setShowBackupModal(false)}
                className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/30 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

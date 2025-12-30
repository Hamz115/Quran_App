import { useState, useEffect, useMemo } from 'react';
import { getClasses, getMyTeachers } from '../api';
import type { ClassData } from '../api';

const surahNames: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Aal-Imran', 4: 'An-Nisa', 5: 'Al-Maidah',
  6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shuara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqiah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumuah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qariah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas'
};

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  added_at: string;
}

const getPerformanceStyle = (perf: string | null) => {
  switch (perf) {
    case 'Excellent': return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'Very Good': return 'bg-teal-500/20 text-teal-400 border border-teal-500/30';
    case 'Good': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'Needs Work': return 'bg-red-500/20 text-red-400 border border-red-500/30';
    default: return 'bg-slate-600/50 text-slate-400 border border-slate-600';
  }
};

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

export default function StudentClasses() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Month filter state - default to current month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [notesDate, setNotesDate] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [classesData, teachersData] = await Promise.all([
          getClasses('student'),
          getMyTeachers()
        ]);
        setClasses(classesData);
        setTeachers(teachersData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

  // Filter classes by selected month
  const filteredClasses = useMemo(() => {
    if (!selectedMonth) return classes;
    return classes.filter(c => c.date.startsWith(selectedMonth));
  }, [classes, selectedMonth]);

  // Count classes per month (for badges)
  const classCountByMonth = useMemo(() => {
    const counts: Record<string, number> = {};
    classes.forEach(cls => {
      const date = new Date(cls.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      counts[monthKey] = (counts[monthKey] || 0) + 1;
    });
    return counts;
  }, [classes]);

  const groupedClasses = groupByMonth(filteredClasses);
  const sortedMonths = Object.keys(groupedClasses).sort((a, b) => b.localeCompare(a));

  const teacherName = teachers.length > 0 ? `${teachers[0].first_name} ${teachers[0].last_name}` : 'No teacher yet';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading classes...</div>
      </div>
    );
  }

  // Helper to get week number within month
  const getWeekOfMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const firstDayOfWeek = firstDay.getDay();
    return Math.ceil((dayOfMonth + firstDayOfWeek) / 7);
  };

  // Helper to format portion display nicely
  const getPortionDisplay = (cls: ClassData, type: string) => {
    const portions = cls.assignments.filter(a => a.type === type);
    if (portions.length === 0) return <span className="text-slate-600">—</span>;

    return portions.map((p, i) => {
      const startName = surahNames[p.start_surah] || `Surah ${p.start_surah}`;
      const endName = surahNames[p.end_surah] || `Surah ${p.end_surah}`;

      let display = '';
      if (p.start_surah === p.end_surah) {
        display = startName;
        if (p.start_ayah && p.end_ayah) {
          display += ` (${p.start_ayah}-${p.end_ayah})`;
        }
      } else {
        display = `${startName} to ${endName}`;
      }

      return <span key={i}>{display}{i < portions.length - 1 ? ', ' : ''}</span>;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">My Classes</h1>
          <p className="text-slate-400 mt-1">Your learning journey with {teacherName}</p>
        </div>
      </div>

      {/* Month Filter Tabs */}
      {classes.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm font-medium">Month</span>
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
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {getMonthLabel(month)}
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                    isSelected ? 'bg-emerald-500' : 'bg-slate-600'
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
                className="bg-slate-700 text-slate-300 rounded-full px-4 py-2 text-sm border-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
      )}

      {/* Classes grouped by month */}
      {sortedMonths.length > 0 ? (
        sortedMonths.map(monthKey => {
          const monthClasses = groupedClasses[monthKey];

          return (
            <div key={monthKey} className="card overflow-hidden">
              {/* Month Header */}
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-100">{getMonthLabel(monthKey)}</h2>
                  <span className="text-sm text-slate-500">({monthClasses.length} {monthClasses.length === 1 ? 'class' : 'classes'})</span>
                </div>
              </div>

              {/* Class Cards */}
              <div className="space-y-4 p-4">
                {monthClasses.map(cls => {
                  const classDate = new Date(cls.date);
                  const weekNum = getWeekOfMonth(cls.date);

                  return (
                    <div
                      key={cls.id}
                      onClick={() => window.location.href = `/student/classes/${cls.id}`}
                      className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden hover:border-emerald-500/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-500/5"
                    >
                      {/* Class Header */}
                      <div className="flex items-center justify-between px-5 py-3 bg-slate-800/80 border-b border-slate-700/50">
                        <div className="flex items-center gap-4">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700/50 text-slate-300 text-sm font-bold">
                            W{weekNum}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-200 font-medium">
                                {cls.day}, {`${String(classDate.getDate()).padStart(2, '0')}/${String(classDate.getMonth() + 1).padStart(2, '0')}/${classDate.getFullYear()}`}
                              </span>
                              {cls.class_type === 'test' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase">
                                  Test
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              with {teacherName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Performance Badge */}
                          {cls.performance && (
                            <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${getPerformanceStyle(cls.performance)}`}>
                              {cls.performance}
                            </span>
                          )}
                          {/* Notes Button */}
                          {cls.notes && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotesText(cls.notes || '');
                                setNotesDate(cls.date);
                                setShowNotesModal(true);
                              }}
                              className="p-2 rounded-lg hover:bg-amber-500/20 text-amber-400 transition-colors"
                              title="View notes"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Portions Section */}
                      <div className="p-4">
                        <div className="space-y-2">
                          {/* Hifz Row */}
                          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <span className="text-xs font-semibold text-emerald-400 w-16 flex-shrink-0">HIFZ</span>
                            <span className="text-sm text-emerald-300 flex-1">{getPortionDisplay(cls, 'hifz')}</span>
                            {(cls.mistake_counts?.hifz ?? 0) > 0 && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                (cls.mistake_counts?.hifz ?? 0) >= 5 ? 'bg-red-500/20 text-red-400'
                                : (cls.mistake_counts?.hifz ?? 0) >= 3 ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                              }`}>
                                {cls.mistake_counts?.hifz} {cls.mistake_counts?.hifz === 1 ? 'mistake' : 'mistakes'}
                              </span>
                            )}
                          </div>
                          {/* Sabqi Row */}
                          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                            <span className="text-xs font-semibold text-cyan-400 w-16 flex-shrink-0">SABQI</span>
                            <span className="text-sm text-cyan-300 flex-1">{getPortionDisplay(cls, 'sabqi')}</span>
                            {(cls.mistake_counts?.sabqi ?? 0) > 0 && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                (cls.mistake_counts?.sabqi ?? 0) >= 5 ? 'bg-red-500/20 text-red-400'
                                : (cls.mistake_counts?.sabqi ?? 0) >= 3 ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-cyan-500/20 text-cyan-400'
                              }`}>
                                {cls.mistake_counts?.sabqi} {cls.mistake_counts?.sabqi === 1 ? 'mistake' : 'mistakes'}
                              </span>
                            )}
                          </div>
                          {/* Manzil Row */}
                          <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-500/5 border border-slate-500/10">
                            <span className="text-xs font-semibold text-slate-400 w-16 flex-shrink-0">MANZIL</span>
                            <span className="text-sm text-slate-300 flex-1">{getPortionDisplay(cls, 'revision')}</span>
                            {(cls.mistake_counts?.revision ?? 0) > 0 && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                (cls.mistake_counts?.revision ?? 0) >= 5 ? 'bg-red-500/20 text-red-400'
                                : (cls.mistake_counts?.revision ?? 0) >= 3 ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-400'
                              }`}>
                                {cls.mistake_counts?.revision} {cls.mistake_counts?.revision === 1 ? 'mistake' : 'mistakes'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notes Preview (if has notes) */}
                      {cls.notes && (
                        <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-800/30">
                          <p className="text-xs text-slate-400 truncate">
                            <span className="font-medium text-amber-400/80">📝 Note:</span> {cls.notes}
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
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          {classes.length === 0 ? (
            <>
              <p className="text-lg text-slate-300 font-medium">No classes yet</p>
              <p className="text-slate-500 mt-1">Your teacher will add classes soon!</p>
            </>
          ) : (
            <>
              <p className="text-lg text-slate-300 font-medium">No classes in {getMonthLabel(selectedMonth)}</p>
              <p className="text-slate-500 mt-1">Try selecting a different month</p>
            </>
          )}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Notes from {teacherName}
              </h2>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-xs text-slate-500 mb-2">Class on {notesDate}</p>
              <div className="px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-slate-200">
                {notesText}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setShowNotesModal(false)}
                className="w-full px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
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

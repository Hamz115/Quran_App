import { useState, useEffect } from 'react';
import { getClasses, getMyTeachers } from '../api';
import type { ClassData } from '../api';

const surahNames: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali Imran', 67: 'Al-Mulk', 68: 'Al-Qalam',
  69: 'Al-Haqqah', 70: 'Al-Maarij', 71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil',
  74: 'Al-Muddaththir', 75: 'Al-Qiyamah', 76: 'Al-Insan', 77: 'Al-Mursalat',
  78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa', 81: 'At-Takwir', 82: 'Al-Infitar',
  83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj', 86: 'At-Tariq', 87: 'Al-Ala',
  88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad', 91: 'Ash-Shams', 92: 'Al-Layl',
  93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin', 96: 'Al-Alaq', 97: 'Al-Qadr',
  98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat', 101: 'Al-Qariah',
  102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil', 106: 'Quraysh',
  107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr', 111: 'Al-Masad',
  112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas'
};

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  added_at: string;
}

const getPerformanceStyle = (perf: string | null) => {
  switch (perf) {
    case 'Excellent': return 'bg-emerald-500/20 text-emerald-400';
    case 'Very Good': return 'bg-teal-500/20 text-teal-400';
    case 'Good': return 'bg-amber-500/20 text-amber-400';
    case 'Needs Work': return 'bg-red-500/20 text-red-400';
    default: return 'bg-slate-600/50 text-slate-400';
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

  const groupedClasses = groupByMonth(classes);
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

      return <div key={i} className="text-sm">{display}{i < portions.length - 1 ? ', ' : ''}</div>;
    });
  };

  // Get short day name
  const getShortDay = (day: string) => {
    const dayMap: Record<string, string> = {
      'Sunday': 'Sun', 'Monday': 'Mon', 'Tuesday': 'Tue',
      'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat'
    };
    return dayMap[day] || day.slice(0, 3);
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

              {/* Table Header */}
              <div className="grid grid-cols-[60px_70px_60px_1fr_1fr_1fr_80px_50px] gap-3 px-6 py-3 border-b border-slate-700/50 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div>Week</div>
                <div>Date</div>
                <div>Day</div>
                <div className="text-emerald-400">Hifz</div>
                <div className="text-cyan-400">Sabqi</div>
                <div className="text-slate-300">Manzil</div>
                <div>Perf.</div>
                <div>Notes</div>
              </div>

              {/* Class Rows */}
              <div className="divide-y divide-slate-700/30">
                {monthClasses.map(cls => {
                  const classDate = new Date(cls.date);
                  const weekNum = getWeekOfMonth(cls.date);

                  return (
                    <div
                      key={cls.id}
                      onClick={() => window.location.href = `/student/classes/${cls.id}`}
                      className="grid grid-cols-[60px_70px_60px_1fr_1fr_1fr_80px_50px] gap-3 px-6 py-4 hover:bg-slate-800/50 cursor-pointer transition-colors items-center"
                    >
                      {/* Week */}
                      <div>
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700/50 text-slate-300 text-sm font-medium">
                          W{weekNum}
                        </span>
                      </div>

                      {/* Date */}
                      <div className="text-slate-200 text-sm">
                        {String(classDate.getDate()).padStart(2, '0')}/{String(classDate.getMonth() + 1).padStart(2, '0')}
                      </div>

                      {/* Day */}
                      <div className="text-slate-400 text-sm">
                        {getShortDay(cls.day)}
                      </div>

                      {/* Hifz */}
                      <div className="text-emerald-400 min-w-0">
                        {getPortionDisplay(cls, 'hifz')}
                      </div>

                      {/* Sabqi */}
                      <div className="text-cyan-400 min-w-0">
                        {getPortionDisplay(cls, 'sabqi')}
                      </div>

                      {/* Manzil (Revision) */}
                      <div className="text-slate-300 min-w-0">
                        {getPortionDisplay(cls, 'revision')}
                      </div>

                      {/* Performance */}
                      <div>
                        {cls.performance ? (
                          <span className={`text-xs font-medium px-2.5 py-1 rounded ${getPerformanceStyle(cls.performance)}`}>
                            {cls.performance === 'Very Good' ? 'V.Good' : cls.performance}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                        {cls.notes ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotesText(cls.notes || '');
                              setNotesDate(cls.date);
                              setShowNotesModal(true);
                            }}
                            className="p-1.5 rounded text-amber-400 hover:bg-amber-500/20 transition-colors"
                            title="View notes"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
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
          <p className="text-lg text-slate-300 font-medium">No classes yet</p>
          <p className="text-slate-500 mt-1">Your teacher will add classes soon!</p>
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

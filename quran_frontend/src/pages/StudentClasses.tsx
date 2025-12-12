import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getClasses, getMyTeachers } from '../api';

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

interface ClassData {
  id: number;
  date: string;
  day: string;
  notes: string | null;
  performance?: string;
  assignments: {
    id: number;
    type: string;
    start_surah: number;
    end_surah: number;
    start_ayah: number | null;
    end_ayah: number | null;
  }[];
}

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  added_at: string;
}

const getPerformanceStyle = (perf: string) => {
  switch (perf) {
    case 'Excellent': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Very Good': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    case 'Good': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'Needs Work': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-600/50 text-slate-400 border-slate-500/30';
  }
};

const getTypeStyle = (type: string) => {
  switch (type) {
    case 'hifz': return 'bg-emerald-500/20 text-emerald-400';
    case 'sabqi': return 'bg-blue-500/20 text-blue-400';
    case 'revision': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-slate-600/50 text-slate-400';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'hifz': return 'Hifz';
    case 'sabqi': return 'Sabqi';
    case 'revision': return 'Revision';
    default: return type;
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
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [classesData, teachersData] = await Promise.all([
          getClasses(),
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

  // Calculate stats
  const totalClasses = classes.length;
  const excellentCount = classes.filter(c => c.performance === 'Excellent').length;
  const teacherName = teachers.length > 0 ? `${teachers[0].first_name} ${teachers[0].last_name}` : 'No teacher yet';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="card p-6 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">My Classes</h1>
            <p className="text-slate-400 mt-1">Your learning journey with {teacherName}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400">{totalClasses}</p>
              <p className="text-xs text-slate-500">Total Classes</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-400">{excellentCount}</p>
              <p className="text-xs text-slate-500">Excellent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-4">
        <a
          href="/student/practice"
          className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Start Practice
        </a>
      </div>

      {/* Classes by Month */}
      {sortedMonths.length > 0 ? (
        sortedMonths.map(monthKey => {
          const monthClasses = groupedClasses[monthKey];
          return (
            <div key={monthKey} className="card overflow-hidden">
              {/* Month Header */}
              <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-emerald-400">{getMonthLabel(monthKey)}</h2>
                <span className="text-sm text-slate-400">
                  {monthClasses.length} {monthClasses.length === 1 ? 'class' : 'classes'}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Portion</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Performance</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Notes</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {monthClasses.map(cls => (
                      <tr key={cls.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-200">{cls.date}</p>
                            <p className="text-xs text-slate-500">{cls.day}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {cls.assignments.length > 0 ? (
                            cls.assignments.map((a, i) => (
                              <span key={a.id} className={`text-xs font-medium px-2 py-1 rounded-full ${getTypeStyle(a.type)}`}>
                                {i > 0 && ' '}
                                {getTypeLabel(a.type)}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {cls.assignments.length > 0 ? (
                            cls.assignments.map((a, i) => (
                              <div key={a.id} className="text-sm text-slate-200">
                                {i > 0 && ', '}
                                {surahNames[a.start_surah] || `Surah ${a.start_surah}`}
                                {a.start_ayah && (
                                  <span className="text-xs text-slate-500 ml-1">
                                    ({a.start_ayah}-{a.end_ayah})
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getPerformanceStyle(cls.performance || '')}`}>
                            {cls.performance || 'Not rated'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {cls.notes ? (
                            <button
                              onClick={() => setExpandedNote(expandedNote === cls.id ? null : cls.id)}
                              className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View
                            </button>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/student/classes/${cls.id}`}
                            className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Expanded Notes */}
              {monthClasses.some(cls => expandedNote === cls.id) && (
                <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700/50">
                  {monthClasses.filter(cls => expandedNote === cls.id).map(cls => (
                    <div key={cls.id} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="text-sm text-slate-300">{cls.notes}</p>
                        <p className="text-xs text-slate-500 mt-1">From {teacherName} on {cls.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
    </div>
  );
}

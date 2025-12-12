import { useState, useEffect } from 'react';
import { getClasses, getMyStudents } from '../api';
import type { StudentListItem } from '../api';

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

export default function TeacherClasses() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [classesData, studentsData] = await Promise.all([
          getClasses(),
          getMyStudents()
        ]);
        setClasses(classesData);
        setStudents(studentsData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const groupedClasses = groupByMonth(classes);
  const sortedMonths = Object.keys(groupedClasses).sort((a, b) => b.localeCompare(a));

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Classes</h1>
          <p className="text-slate-400 mt-1">Manage all your teaching sessions</p>
        </div>
        <button
          onClick={() => setShowNewClassModal(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Class
        </button>
      </div>

      {/* Classes grouped by month */}
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
                    <tr className="border-b border-slate-700/50">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Portion</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Performance</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Notes</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {monthClasses.map(cls => (
                      <tr key={cls.id} className="hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-200">{cls.date}</p>
                            <p className="text-sm text-slate-500">{cls.day}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {cls.assignments.length > 0 ? (
                            cls.assignments.map((a, i) => (
                              <div key={a.id} className="text-sm text-slate-300">
                                {i > 0 && <span className="text-slate-500">, </span>}
                                {surahNames[a.start_surah] || `Surah ${a.start_surah}`}
                                {a.start_ayah && ` (${a.start_ayah}-${a.end_ayah})`}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-500">No assignments</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getPerformanceStyle(cls.performance || null)}`}>
                            {cls.performance || 'Not rated'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-400 truncate max-w-xs">{cls.notes || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`/teacher/classes/${cls.id}`}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <p className="text-slate-500 mt-1">Start your first class to begin tracking</p>
        </div>
      )}

      {/* New Class Modal */}
      {showNewClassModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-100">Start New Class</h2>
              <button onClick={() => setShowNewClassModal(false)} className="text-slate-400 hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Students for this Class</label>
                {students.length === 0 ? (
                  <div className="p-4 bg-slate-700/30 rounded-lg text-center">
                    <p className="text-slate-400">No students added yet</p>
                    <p className="text-sm text-slate-500 mt-1">Add students from the Dashboard first</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {students.map((student) => (
                      <label key={student.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                        />
                        <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">
                          {student.first_name[0]}{student.last_name[0]}
                        </div>
                        <span className="text-slate-200">{student.first_name} {student.last_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudents.length > 0 && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-400">
                    Starting class with {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewClassModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={selectedStudents.length === 0}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                >
                  Start Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

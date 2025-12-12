import { useState } from 'react';

const surahNames: Record<number, string> = {
  67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij', 71: 'Nuh', 72: 'Al-Jinn',
  73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah', 76: 'Al-Insan', 77: 'Al-Mursalat',
  78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa', 81: 'At-Takwir', 82: 'Al-Infitar',
  83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj', 86: 'At-Tariq', 87: 'Al-Ala',
  88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad', 91: 'Ash-Shams', 92: 'Al-Layl',
};

// Mock data - classes with multiple student entries
const mockClasses = [
  {
    id: 1,
    date: '2024-12-10',
    day: 'Tuesday',
    status: 'published',
    entries: [
      { studentId: 1, studentName: 'Ahmed Hassan', surah: 67, ayahStart: 1, ayahEnd: 10, performance: 'Excellent', mistakes: 2 },
      { studentId: 3, studentName: 'Zaid Ibrahim', surah: 78, ayahStart: 1, ayahEnd: 15, performance: 'Good', mistakes: 5 },
      { studentId: 5, studentName: 'Hamza Khan', surah: 89, ayahStart: 1, ayahEnd: 10, performance: 'Excellent', mistakes: 0 },
    ]
  },
  {
    id: 2,
    date: '2024-12-09',
    day: 'Monday',
    status: 'published',
    entries: [
      { studentId: 2, studentName: 'Bilal Omar', surah: 72, ayahStart: 1, ayahEnd: 15, performance: 'Very Good', mistakes: 3 },
    ]
  },
  {
    id: 3,
    date: '2024-12-08',
    day: 'Sunday',
    status: 'draft',
    entries: [
      { studentId: 4, studentName: 'Yusuf Ali', surah: 84, ayahStart: 1, ayahEnd: 10, performance: 'Needs Work', mistakes: 8 },
      { studentId: 1, studentName: 'Ahmed Hassan', surah: 67, ayahStart: 11, ayahEnd: 20, performance: null, mistakes: 0 },
    ]
  },
  {
    id: 4,
    date: '2024-12-07',
    day: 'Saturday',
    status: 'published',
    entries: [
      { studentId: 1, studentName: 'Ahmed Hassan', surah: 67, ayahStart: 1, ayahEnd: 5, performance: 'Very Good', mistakes: 1 },
      { studentId: 2, studentName: 'Bilal Omar', surah: 72, ayahStart: 1, ayahEnd: 10, performance: 'Excellent', mistakes: 0 },
      { studentId: 3, studentName: 'Zaid Ibrahim', surah: 78, ayahStart: 1, ayahEnd: 10, performance: 'Good', mistakes: 4 },
      { studentId: 4, studentName: 'Yusuf Ali', surah: 84, ayahStart: 1, ayahEnd: 5, performance: 'Needs Work', mistakes: 6 },
    ]
  },
];

const mockStudents = [
  { id: 1, name: 'Ahmed Hassan' },
  { id: 2, name: 'Bilal Omar' },
  { id: 3, name: 'Zaid Ibrahim' },
  { id: 4, name: 'Yusuf Ali' },
  { id: 5, name: 'Hamza Khan' },
];

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
const groupByMonth = (classes: typeof mockClasses) => {
  const grouped: Record<string, typeof mockClasses> = {};
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
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [filterStudent, setFilterStudent] = useState<number | 'all'>('all');

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Filter classes by student if selected
  const filteredClasses = filterStudent === 'all'
    ? mockClasses
    : mockClasses.filter(cls => cls.entries.some(e => e.studentId === filterStudent));

  const groupedClasses = groupByMonth(filteredClasses);
  const sortedMonths = Object.keys(groupedClasses).sort((a, b) => b.localeCompare(a));

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

      {/* Filters */}
      <div className="card p-4 flex items-center gap-4">
        <span className="text-sm text-slate-400">Filter by student:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStudent('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStudent === 'all'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            All Students
          </button>
          {mockStudents.map(student => (
            <button
              key={student.id}
              onClick={() => setFilterStudent(student.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStudent === student.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {student.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Classes grouped by month */}
      {sortedMonths.map(monthKey => {
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
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
                        <div className="space-y-2">
                          {cls.entries.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                                {entry.studentName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-200">{entry.studentName}</p>
                                <p className="text-xs text-slate-500">
                                  {surahNames[entry.surah] || `Surah ${entry.surah}`} ({entry.ayahStart}-{entry.ayahEnd})
                                  {entry.mistakes > 0 && (
                                    <span className="text-red-400 ml-2">• {entry.mistakes} mistakes</span>
                                  )}
                                </p>
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPerformanceStyle(entry.performance)}`}>
                                {entry.performance || 'Not rated'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          cls.status === 'published'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {cls.status === 'published' ? (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Published
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              Draft
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`/teacher/classes/${cls.id}`}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            Open
                          </a>
                          {cls.status === 'draft' && (
                            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
                              Publish
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {filteredClasses.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-lg text-slate-300 font-medium">No classes found</p>
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
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mockStudents.map((student) => (
                    <label key={student.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-slate-200">{student.name}</span>
                    </label>
                  ))}
                </div>
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

import { useState } from 'react';

const surahNames: Record<number, string> = {
  67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij', 71: 'Nuh', 72: 'Al-Jinn',
  73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah', 76: 'Al-Insan', 77: 'Al-Mursalat',
  78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa', 81: 'At-Takwir', 82: 'Al-Infitar',
  83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj', 86: 'At-Tariq', 87: 'Al-Ala',
  88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad', 91: 'Ash-Shams', 92: 'Al-Layl',
};

// Mock student info
const mockStudent = {
  id: 1,
  name: 'Ahmed Hassan',
};

// Mock data - only this student's published classes
const mockMyClasses = [
  {
    id: 1,
    date: '2024-12-10',
    day: 'Tuesday',
    type: 'hifz',
    surah: 67,
    ayahStart: 1,
    ayahEnd: 10,
    performance: 'Excellent',
    mistakes: 2,
    notes: 'Great recitation today. Minor tajweed corrections needed.',
    teacherName: 'Ustadh Ibrahim',
  },
  {
    id: 2,
    date: '2024-12-07',
    day: 'Saturday',
    type: 'hifz',
    surah: 67,
    ayahStart: 1,
    ayahEnd: 5,
    performance: 'Very Good',
    mistakes: 1,
    notes: 'Good progress. Keep practicing the first few ayahs.',
    teacherName: 'Ustadh Ibrahim',
  },
  {
    id: 3,
    date: '2024-12-05',
    day: 'Thursday',
    type: 'sabqi',
    surah: 78,
    ayahStart: 1,
    ayahEnd: 20,
    performance: 'Good',
    mistakes: 4,
    notes: 'Review Surah An-Naba again before next class.',
    teacherName: 'Ustadh Ibrahim',
  },
  {
    id: 4,
    date: '2024-12-03',
    day: 'Tuesday',
    type: 'manzil',
    surah: 112,
    ayahStart: null,
    ayahEnd: null,
    endSurah: 114,
    performance: 'Excellent',
    mistakes: 0,
    notes: 'Mashallah, perfect recitation of the last 3 surahs.',
    teacherName: 'Ustadh Ibrahim',
  },
  {
    id: 5,
    date: '2024-11-28',
    day: 'Thursday',
    type: 'hifz',
    surah: 67,
    ayahStart: 1,
    ayahEnd: 3,
    performance: 'Needs Work',
    mistakes: 6,
    notes: 'Need more practice. Review with family before next class.',
    teacherName: 'Ustadh Ibrahim',
  },
];

// Practice sessions (done at home with family)
const mockPracticeSessions = [
  {
    id: 101,
    date: '2024-12-09',
    day: 'Monday',
    type: 'practice',
    surah: 67,
    ayahStart: 1,
    ayahEnd: 10,
    mistakes: 1,
    helperName: 'Mom',
  },
  {
    id: 102,
    date: '2024-12-06',
    day: 'Friday',
    type: 'practice',
    surah: 78,
    ayahStart: 1,
    ayahEnd: 15,
    mistakes: 3,
    helperName: 'Dad',
  },
];

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
    case 'manzil': return 'bg-purple-500/20 text-purple-400';
    case 'practice': return 'bg-amber-500/20 text-amber-400';
    default: return 'bg-slate-600/50 text-slate-400';
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'hifz': return 'Hifz';
    case 'sabqi': return 'Sabqi';
    case 'manzil': return 'Manzil';
    case 'practice': return 'Practice';
    default: return type;
  }
};

// Group classes by month
const groupByMonth = (classes: typeof mockMyClasses) => {
  const grouped: Record<string, typeof mockMyClasses> = {};
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

// Calculate week number from first class
const getWeekNumber = (dateStr: string, allClasses: typeof mockMyClasses) => {
  if (allClasses.length === 0) return 1;
  const sortedDates = allClasses.map(c => new Date(c.date).getTime()).sort((a, b) => a - b);
  const firstDate = new Date(sortedDates[0]);
  const currentDate = new Date(dateStr);
  const diffDays = Math.floor((currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
};

export default function StudentClasses() {
  const [viewMode, setViewMode] = useState<'classes' | 'practice'>('classes');
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  const groupedClasses = groupByMonth(mockMyClasses);
  const sortedMonths = Object.keys(groupedClasses).sort((a, b) => b.localeCompare(a));

  // Calculate stats
  const totalClasses = mockMyClasses.length;
  const excellentCount = mockMyClasses.filter(c => c.performance === 'Excellent').length;
  const totalMistakes = mockMyClasses.reduce((sum, c) => sum + c.mistakes, 0);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="card p-6 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">My Classes</h1>
            <p className="text-slate-400 mt-1">Your learning journey with {mockMyClasses[0]?.teacherName}</p>
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
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">{totalMistakes}</p>
              <p className="text-xs text-slate-500">Mistakes</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-4">
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setViewMode('classes')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'classes'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Teacher Classes
          </button>
          <button
            onClick={() => setViewMode('practice')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'practice'
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Practice Sessions
          </button>
        </div>
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

      {viewMode === 'classes' ? (
        /* Teacher Classes View */
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
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Wk</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Portion</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Performance</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Mistakes</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400">Notes</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-400"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {monthClasses.map(cls => (
                      <tr key={cls.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 font-medium">
                            W{getWeekNumber(cls.date, mockMyClasses)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-slate-200">{cls.date.split('-').slice(1).join('/')}</p>
                            <p className="text-xs text-slate-500">{cls.day}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTypeStyle(cls.type)}`}>
                            {getTypeLabel(cls.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-200">
                            {surahNames[cls.surah] || `Surah ${cls.surah}`}
                          </p>
                          {cls.ayahStart && (
                            <p className="text-xs text-slate-500">
                              Ayah {cls.ayahStart}-{cls.ayahEnd}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getPerformanceStyle(cls.performance)}`}>
                            {cls.performance}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${cls.mistakes > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {cls.mistakes}
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
                        <p className="text-xs text-slate-500 mt-1">From {cls.teacherName} on {cls.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      ) : (
        /* Practice Sessions View */
        <div className="card overflow-hidden">
          <div className="px-6 py-4 bg-amber-500/10 border-b border-amber-500/20">
            <h2 className="text-lg font-semibold text-amber-400">Practice Sessions</h2>
            <p className="text-sm text-slate-400 mt-1">Sessions done at home with family</p>
          </div>

          {mockPracticeSessions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400">No practice sessions yet</p>
              <p className="text-sm text-slate-500 mt-1">Start practicing with your family!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/30">
              {mockPracticeSessions.map(session => (
                <div key={session.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{session.date} ({session.day})</p>
                      <p className="text-sm text-slate-400">
                        {surahNames[session.surah]} ({session.ayahStart}-{session.ayahEnd}) with {session.helperName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${session.mistakes > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {session.mistakes} mistakes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State for classes */}
      {viewMode === 'classes' && mockMyClasses.length === 0 && (
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

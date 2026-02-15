import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getStats, getClasses, getMyTeachers } from '../api';
import type { ClassData } from '../api';
import { surahNames } from '../lib/quran-utils';

interface Stats {
  total_classes: number;
  total_mistakes?: number;
  total_unique_mistakes?: number;
  repeated_mistakes?: number;
  total_occurrences?: number;
  mistakes_by_surah?: { surah_number: number; count: number }[];
  latest_class?: { id: string; date: string; day: string; notes: string | null } | null;
  top_repeated_mistakes?: { id: string; surah_number: number; ayah_number: number; word_text: string; error_count: number }[];
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  added_at: string;
}

const getPerformanceStyle = (perf?: string) => {
  switch (perf) {
    case 'Excellent': return 'bg-cyan-500/20 text-cyan-400';
    case 'Very Good': return 'bg-teal-500/20 text-teal-400';
    case 'Good': return 'bg-amber-500/20 text-amber-400';
    case 'Needs Work': return 'bg-red-500/20 text-red-400';
    default: return 'bg-slate-600/50 text-slate-400';
  }
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Track if component is still mounted to prevent state updates after unmount
    let isMounted = true;

    // Always get student-specific data (classes attended, own mistakes)
    // This works for both regular students AND teachers who are also students
    async function loadData() {
      try {
        const [statsData, classesData, teachersData] = await Promise.all([
          getStats('student'),    // Get stats as a student (own mistakes, classes attended)
          getClasses('student'),  // Get classes where enrolled as student
          getMyTeachers()
        ]);

        // Only update state if component is still mounted
        if (isMounted) {
          setStats(statsData);
          setClasses(classesData);
          setTeachers(teachersData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();

    // Cleanup function - runs when component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  const totalClasses = stats?.total_classes || 0;
  const repeatedMistakes = stats?.repeated_mistakes || 0;
  const mistakesBySurah = stats?.mistakes_by_surah || [];
  const topRepeatedMistakes = stats?.top_repeated_mistakes || [];
  const latestClass = classes[0];
  const currentSurah = latestClass?.assignments[0]?.start_surah || 67;
  const teacherName = teachers.length > 0 ? `${teachers[0].first_name} ${teachers[0].last_name}` : 'No teacher yet';


  return (
    <div className="space-y-8">
      {/* Student Header - Personal Welcome */}
      <div className={`card p-6 ${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-cyan-500/20">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Assalamu Alaikum,</p>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{user?.first_name} {user?.last_name}</h1>
              <p className={`mt-1 flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Teacher: {teacherName}
              </p>
              <div className={`text-sm mt-1 flex items-center gap-2 ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                Your Email:
                <button
                  onClick={() => navigator.clipboard.writeText(user?.email || '')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-colors ${darkMode ? 'bg-slate-700 hover:bg-slate-600 text-cyan-400' : 'bg-slate-200 hover:bg-slate-300 text-cyan-600'}`}
                  title="Click to copy"
                >
                  {user?.email}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Today</p>
            <p className={`text-lg font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className={`card p-6 ${darkMode ? 'bg-gradient-to-br from-cyan-500 to-teal-500 text-white border-0' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${darkMode ? 'bg-white/20' : 'bg-cyan-500/20 text-cyan-500'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${darkMode ? 'bg-white/20' : 'bg-cyan-500/20 text-cyan-600'}`}>Current</span>
          </div>
          <p className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{currentSurah}</p>
          <p className={`mt-1 ${darkMode ? 'text-cyan-100' : 'text-slate-500'}`}>{surahNames[currentSurah] || `Surah ${currentSurah}`}</p>
        </div>

        <div className={`card p-6 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className={`text-4xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{totalClasses}</p>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Classes Attended</p>
        </div>

        <div className={`card p-6 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            {repeatedMistakes > 0 && (
              <span className="text-xs font-medium bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full">Review</span>
            )}
          </div>
          <p className={`text-4xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{repeatedMistakes}</p>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mistakes to Fix</p>
        </div>

        <a href="/student/practice" className={`card p-6 transition-colors cursor-pointer ${darkMode ? 'hover:bg-slate-700/50' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Practice Mode</p>
          <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Start a revision session</p>
        </a>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* My Weak Areas - Takes 2 columns */}
        <div className={`col-span-2 card p-6 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>My Focus Areas</h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Surahs where I need more practice</p>
            </div>
            <a href="/reader" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
              Practice Now
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          {mistakesBySurah.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className={`text-lg font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>MashaAllah! No mistakes recorded</p>
              <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Keep up the great work!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {mistakesBySurah.map((item, index) => {
                const maxCount = mistakesBySurah[0].count;
                const percentage = (item.count / maxCount) * 100;
                return (
                  <div key={item.surah_number}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-red-500/20 text-red-400' :
                          index === 1 ? 'bg-orange-500/20 text-orange-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <span className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{surahNames[item.surah_number] || `Surah ${item.surah_number}`}</span>
                          <span className={`text-sm ml-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>#{item.surah_number}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${
                        index === 0 ? 'text-red-400' : index === 1 ? 'text-orange-400' : 'text-amber-400'
                      }`}>
                        {item.count} mistakes
                      </span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden ${darkMode ? 'bg-slate-700/50' : 'bg-slate-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          index === 0 ? 'bg-gradient-to-r from-red-500 to-red-400' :
                          index === 1 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                          'bg-gradient-to-r from-amber-500 to-amber-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Top Mistakes */}
          <div className={`card p-6 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Words to Review</h3>
              {topRepeatedMistakes.length > 0 && (
                <span className="text-xs font-medium bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                  Focus
                </span>
              )}
            </div>
            {topRepeatedMistakes.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">No repeated mistakes!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topRepeatedMistakes.slice(0, 4).map((mistake) => (
                  <div key={mistake.id} className={`flex items-center justify-between p-3 rounded-xl border ${darkMode ? 'bg-slate-700/30 border-slate-600/30' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        mistake.error_count >= 3 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {mistake.error_count}x
                      </span>
                      <div>
                        <p className={`arabic text-lg ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{mistake.word_text}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {surahNames[mistake.surah_number] || `Surah ${mistake.surah_number}`} : {mistake.ayah_number}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className={`card p-6 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
            <h3 className={`font-semibold mb-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Quick Actions</h3>
            <div className="space-y-2">
              <a href="/student/practice" className="flex items-center gap-3 p-3 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl transition-colors">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Start Practice</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Revise with family</p>
                </div>
              </a>
              <a href="/reader" className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${darkMode ? 'bg-slate-700/30 hover:bg-slate-700/50' : 'bg-slate-100 hover:bg-slate-200'}`}>
                <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Open Quran</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Read and review</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Classes */}
      <div className={`card p-6 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>My Recent Classes</h2>
          <a href="/classes" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1">
            View All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12">
            <p className={darkMode ? 'text-slate-500' : 'text-slate-400'}>No classes yet. Your teacher will add classes soon!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`text-left border-b ${darkMode ? 'border-slate-700/50' : 'border-slate-200'}`}>
                  <th className={`pb-3 text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Date</th>
                  <th className={`pb-3 text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Portion</th>
                  <th className={`pb-3 text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Performance</th>
                  <th className={`pb-3 text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Notes</th>
                  <th className={`pb-3 text-sm font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}></th>
                </tr>
              </thead>
              <tbody>
                {classes.slice(0, 5).map((classItem) => (
                  <tr key={classItem.id} className={`border-b last:border-0 ${darkMode ? 'border-slate-700/30 hover:bg-slate-700/20' : 'border-slate-100 hover:bg-slate-50'}`}>
                    <td className="py-4">
                      <div>
                        <p className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{classItem.date}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{classItem.day}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      {classItem.assignments.map((a, i) => (
                        <span key={a.id} className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {i > 0 && ', '}
                          {surahNames[a.start_surah] || `Surah ${a.start_surah}`}
                          {a.start_ayah ? ` (${a.start_ayah}-${a.end_ayah})` : ''}
                        </span>
                      ))}
                    </td>
                    <td className="py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getPerformanceStyle(classItem.performance)}`}>
                        {classItem.performance || 'Not rated'}
                      </span>
                    </td>
                    <td className="py-4">
                      <p className={`text-sm truncate max-w-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{classItem.notes || '-'}</p>
                    </td>
                    <td className="py-4">
                      <a
                        href={`/classes/${classItem.id}`}
                        className="text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
                      >
                        View
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getStats, getClasses } from '../api';

const surahNames: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Ali Imran', 67: 'Al-Mulk', 68: 'Al-Qalam',
  69: 'Al-Haqqah', 70: 'Al-Maarij', 71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil',
  74: 'Al-Muddaththir', 75: 'Al-Qiyamah', 76: 'Al-Insan', 77: 'Al-Mursalat',
  78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa', 81: 'At-Takwir', 82: 'Al-Infitar',
  83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj', 86: 'At-Tariq',
  87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad', 91: 'Ash-Shams',
  92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin', 96: 'Al-Alaq',
  97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qariah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah',
  105: 'Al-Fil', 106: 'Quraysh', 107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun',
  110: 'An-Nasr', 111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas'
};

interface ClassData {
  id: number;
  date: string;
  day: string;
  notes: string | null;
  assignments: {
    id: number;
    type: string;
    start_surah: number;
    end_surah: number;
    start_ayah: number | null;
    end_ayah: number | null;
  }[];
}

interface Stats {
  total_classes: number;
  total_unique_mistakes: number;
  repeated_mistakes: number;
  total_occurrences: number;
  mistakes_by_surah: { surah_number: number; count: number }[];
  latest_class: { id: number; date: string; day: string; notes: string | null } | null;
  top_repeated_mistakes: { id: number; surah_number: number; ayah_number: number; word_text: string; error_count: number }[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, classesData] = await Promise.all([
          getStats(),
          getClasses()
        ]);
        setStats(statsData);
        setClasses(classesData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-slate-400 mt-1">Track your teaching progress and student mistakes</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Today</p>
          <p className="text-lg font-semibold text-slate-200">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Grid - Full Width */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">Current</span>
          </div>
          <p className="text-4xl font-bold">{currentSurah}</p>
          <p className="text-emerald-100 mt-1">{surahNames[currentSurah] || `Surah ${currentSurah}`}</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-100">{totalClasses}</p>
          <p className="text-slate-400 mt-1">Total Classes</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            {repeatedMistakes > 0 && (
              <span className="text-xs font-medium bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full">Needs Focus</span>
            )}
          </div>
          <p className="text-4xl font-bold text-slate-100">{repeatedMistakes}</p>
          <p className="text-slate-400 mt-1">Repeated Mistakes</p>
        </div>

        {latestClass ? (
          <a href={`/classes/${latestClass.id}`} className="card p-6 hover:bg-slate-700/50 transition-colors cursor-pointer block">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="text-lg font-bold text-slate-100">{latestClass.date}</p>
            <p className="text-slate-400 mt-1">Last Class ({latestClass.day})</p>
          </a>
        ) : (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-lg font-bold text-slate-100">No classes</p>
            <p className="text-slate-400 mt-1">Start your first class!</p>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Weak Surahs - Takes 2 columns */}
        <div className="col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Surahs Needing Attention</h2>
              <p className="text-sm text-slate-400 mt-1">Most mistakes recorded</p>
            </div>
            <span className="text-xs font-medium bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full border border-red-500/30">
              Focus Areas
            </span>
          </div>

          {mistakesBySurah.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg text-slate-200 font-medium">No mistakes recorded yet</p>
              <p className="text-slate-400 mt-1">Start a class to begin tracking</p>
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
                          <span className="font-semibold text-slate-200">{surahNames[item.surah_number] || `Surah ${item.surah_number}`}</span>
                          <span className="text-slate-500 text-sm ml-2">#{item.surah_number}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${
                        index === 0 ? 'text-red-400' : index === 1 ? 'text-orange-400' : 'text-amber-400'
                      }`}>
                        {item.count} mistakes
                      </span>
                    </div>
                    <div className="h-3 bg-slate-700/50 rounded-full overflow-hidden">
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

        {/* Right Column */}
        <div className="space-y-6">
          {/* Top Repeated Mistakes */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-200">Top Repeated Mistakes</h3>
              {topRepeatedMistakes.length > 0 && (
                <span className="text-xs font-medium bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                  Focus Here
                </span>
              )}
            </div>
            {topRepeatedMistakes.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm">No repeated mistakes yet!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topRepeatedMistakes.map((mistake) => (
                  <div key={mistake.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl border border-slate-600/30">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        mistake.error_count >= 3 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {mistake.error_count}x
                      </span>
                      <div>
                        <p className="arabic text-lg text-slate-200">{mistake.word_text}</p>
                        <p className="text-xs text-slate-500">
                          {surahNames[mistake.surah_number] || `Surah ${mistake.surah_number}`} : {mistake.ayah_number}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notes */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-200 mb-4">Recent Class Notes</h3>
            {classes.length === 0 ? (
              <p className="text-slate-500">No class notes yet</p>
            ) : (
              <div className="space-y-3">
                {classes.slice(0, 2).map((classItem) => (
                  <div key={classItem.id} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-slate-400">{classItem.date}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-500">{classItem.day}</span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {classItem.notes || 'No notes for this session'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Classes Table */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-100">Recent Classes</h2>
          <a href="/classes" className="text-sm text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
            View All
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        {classes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No classes yet. Start your first class!</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-700/50">
                <th className="pb-3 text-sm font-semibold text-slate-400">Date</th>
                <th className="pb-3 text-sm font-semibold text-slate-400">Portion</th>
                <th className="pb-3 text-sm font-semibold text-slate-400">Notes</th>
                <th className="pb-3 text-sm font-semibold text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {classes.slice(0, 5).map((classItem) => (
                <tr key={classItem.id} className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20">
                  <td className="py-4">
                    <div>
                      <p className="font-medium text-slate-200">{classItem.date}</p>
                      <p className="text-xs text-slate-500">{classItem.day}</p>
                    </div>
                  </td>
                  <td className="py-4">
                    {classItem.assignments.map((a, i) => (
                      <span key={a.id} className="text-sm text-slate-300">
                        {i > 0 && ', '}
                        Surah {a.start_surah}{a.end_surah !== a.start_surah ? `-${a.end_surah}` : ''}
                        {a.start_ayah ? ` (${a.start_ayah}-${a.end_ayah})` : ''}
                      </span>
                    ))}
                  </td>
                  <td className="py-4">
                    <p className="text-sm text-slate-400 truncate max-w-xs">{classItem.notes || '-'}</p>
                  </td>
                  <td className="py-4">
                    <a
                      href={`/classes/${classItem.id}`}
                      className="text-sm text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      Open
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

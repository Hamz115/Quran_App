import { useState } from 'react';

// Mock data for now - will connect to backend later
const mockStudents = [
  { id: 1, name: 'Ahmed Hassan', currentSurah: 67, totalClasses: 24, lastClass: '2024-12-10', performance: 'Excellent', mistakes: 12 },
  { id: 2, name: 'Bilal Omar', currentSurah: 72, totalClasses: 18, lastClass: '2024-12-09', performance: 'Very Good', mistakes: 8 },
  { id: 3, name: 'Zaid Ibrahim', currentSurah: 78, totalClasses: 31, lastClass: '2024-12-10', performance: 'Good', mistakes: 15 },
  { id: 4, name: 'Yusuf Ali', currentSurah: 84, totalClasses: 12, lastClass: '2024-12-08', performance: 'Needs Work', mistakes: 22 },
  { id: 5, name: 'Hamza Khan', currentSurah: 89, totalClasses: 45, lastClass: '2024-12-10', performance: 'Excellent', mistakes: 5 },
];

const surahNames: Record<number, string> = {
  67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij', 71: 'Nuh', 72: 'Al-Jinn',
  73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah', 76: 'Al-Insan', 77: 'Al-Mursalat',
  78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa', 81: 'At-Takwir', 82: 'Al-Infitar',
  83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj', 86: 'At-Tariq',
  87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad', 91: 'Ash-Shams',
  92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin', 96: 'Al-Alaq',
};

const getPerformanceStyle = (perf: string) => {
  switch (perf) {
    case 'Excellent': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Very Good': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    case 'Good': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'Needs Work': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

export default function TeacherDashboard() {
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const toggleStudentSelection = (id: number) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const totalStudents = mockStudents.length;
  const totalClasses = mockStudents.reduce((sum, s) => sum + s.totalClasses, 0);
  const avgPerformance = mockStudents.filter(s => s.performance === 'Excellent' || s.performance === 'Very Good').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Teacher Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage your Halaqah and track student progress</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddStudentModal(true)}
            className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Student
          </button>
          <button
            onClick={() => setShowNewClassModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start New Class
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">Active</span>
          </div>
          <p className="text-4xl font-bold">{totalStudents}</p>
          <p className="text-blue-100 mt-1">Total Students</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-100">{avgPerformance}/{totalStudents}</p>
          <p className="text-slate-400 mt-1">Performing Well</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
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
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-lg font-bold text-slate-100">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className="text-slate-400 mt-1">Today's Date</p>
        </div>
      </div>

      {/* Students Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">My Students</h2>
            <p className="text-sm text-slate-400 mt-1">Select students to start a group class</p>
          </div>
          {selectedStudents.length > 0 && (
            <button
              onClick={() => setShowNewClassModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start Class with {selectedStudents.length} Student{selectedStudents.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => toggleStudentSelection(student.id)}
              className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedStudents.includes(student.id)
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }`}
            >
              {/* Selection Checkbox */}
              <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedStudents.includes(student.id)
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-slate-600'
              }`}>
                {selectedStudents.includes(student.id) && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Student Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-lg font-bold text-slate-300">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-100 truncate">{student.name}</h3>
                  <p className="text-sm text-slate-400">
                    Currently: {surahNames[student.currentSurah] || `Surah ${student.currentSurah}`}
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-400">
                    <span className="font-medium text-slate-300">{student.totalClasses}</span> classes
                  </span>
                  <span className="text-slate-400">
                    <span className="font-medium text-red-400">{student.mistakes}</span> mistakes
                  </span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getPerformanceStyle(student.performance)}`}>
                  {student.performance}
                </span>
              </div>

              {/* Last Class */}
              <div className="mt-3 text-xs text-slate-500">
                Last class: {student.lastClass}
              </div>
            </div>
          ))}

          {/* Add Student Card */}
          <div
            onClick={() => setShowAddStudentModal(true)}
            className="p-5 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-600 cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[180px] bg-slate-800/30 hover:bg-slate-800/50"
          >
            <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="font-medium text-slate-400">Add New Student</p>
            <p className="text-sm text-slate-500 mt-1">Invite to your Halaqah</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Classes */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">Recent Classes</h3>
            <a href="/classes" className="text-sm text-emerald-400 hover:text-emerald-300">View All</a>
          </div>
          <div className="space-y-3">
            {[
              { date: '2024-12-10', students: ['Ahmed', 'Zaid', 'Hamza'], status: 'published' },
              { date: '2024-12-09', students: ['Bilal'], status: 'published' },
              { date: '2024-12-08', students: ['Yusuf', 'Ahmed'], status: 'draft' },
            ].map((cls, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                <div>
                  <p className="font-medium text-slate-200">{cls.date}</p>
                  <p className="text-sm text-slate-400">{cls.students.join(', ')}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  cls.status === 'published'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {cls.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Students Needing Attention */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-200">Needs Attention</h3>
            <span className="text-xs font-medium bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full">
              Focus Here
            </span>
          </div>
          <div className="space-y-3">
            {mockStudents
              .filter(s => s.performance === 'Needs Work' || s.mistakes > 15)
              .map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{student.name}</p>
                      <p className="text-sm text-red-400">{student.mistakes} repeated mistakes</p>
                    </div>
                  </div>
                  <button className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">
                    Review
                  </button>
                </div>
              ))}
            {mockStudents.filter(s => s.performance === 'Needs Work' || s.mistakes > 15).length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-400">All students are doing well!</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Students</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {mockStudents.map((student) => (
                    <label key={student.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-slate-200">{student.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewClassModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Navigate to classroom with selected students
                    alert(`Starting class with: ${selectedStudents.map(id => mockStudents.find(s => s.id === id)?.name).join(', ')}`);
                    setShowNewClassModal(false);
                  }}
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

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-100">Add New Student</h2>
              <button onClick={() => setShowAddStudentModal(false)} className="text-slate-400 hover:text-slate-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Student Name</label>
                <input
                  type="text"
                  placeholder="Enter student's full name"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email (Optional)</label>
                <input
                  type="email"
                  placeholder="student@email.com"
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-slate-500 mt-1">They'll receive an invite to join your Halaqah</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Starting Surah</label>
                <select className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500">
                  <option value="67">67 - Al-Mulk</option>
                  <option value="78">78 - An-Naba</option>
                  <option value="1">1 - Al-Fatihah</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddStudentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // TODO: Add student to backend
                    alert('Student added! (mock)');
                    setShowAddStudentModal(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                >
                  Add Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

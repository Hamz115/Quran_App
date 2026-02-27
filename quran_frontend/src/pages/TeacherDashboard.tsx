import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getMyStudents, lookupStudent, addStudent, removeStudent, getClasses, type StudentListItem, type ClassData } from '../api';
import { formatPortionLabel } from '../lib/quran-utils';

interface StudentLookup {
  student_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add student modal state
  const [emailInput, setEmailInput] = useState('');
  const [lookupResult, setLookupResult] = useState<StudentLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [studentsData, classesData] = await Promise.all([
          getMyStudents(),
          getClasses()
        ]);
        if (isMounted) {
          setStudents(studentsData);
          setClasses(classesData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  async function loadStudents() {
    try {
      const data = await getMyStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  }

  const toggleStudentSelection = (id: string) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleLookupStudent = async () => {
    if (!emailInput.trim()) return;

    setIsLookingUp(true);
    setLookupError('');
    setLookupResult(null);

    try {
      const result = await lookupStudent(emailInput.trim().toLowerCase());
      setLookupResult(result);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'No user found with that email');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAddStudent = async () => {
    if (!lookupResult) return;

    setIsAdding(true);
    try {
      await addStudent(lookupResult.email);
      await loadStudents();
      setShowAddStudentModal(false);
      setEmailInput('');
      setLookupResult(null);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student from your roster?')) return;

    try {
      await removeStudent(studentId);
      await loadStudents();
    } catch (err) {
      console.error('Failed to remove student:', err);
    }
  };

  const totalStudents = students.length;
  const totalClasses = classes.length;

  // Calculate classes this week
  const getClassesThisWeek = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    return classes.filter(cls => {
      const classDate = new Date(cls.date);
      return classDate >= startOfWeek && classDate <= endOfWeek;
    }).length;
  };

  const classesThisWeek = getClassesThisWeek();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Teacher Dashboard</h1>
          <p className={`mt-1 text-sm sm:text-base ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Welcome back, {user?.first_name}! Manage your Halaqah and track student progress.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setShowAddStudentModal(true)}
            className={`px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 ${
              darkMode
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Student
          </button>
          <button
            onClick={() => navigate('/teacher/classes?new=1')}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/25"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Start New Class
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium bg-white/20 px-2.5 py-1 rounded-full">Active</span>
          </div>
          <p className="text-4xl font-bold">{totalStudents}</p>
          <p className="text-cyan-100 mt-1">Total Students</p>
        </div>

        <div className={`p-6 rounded-2xl border transition-colors ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 text-green-500 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className={`text-4xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{classesThisWeek}</p>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Classes This Week</p>
        </div>

        <div className={`p-6 rounded-2xl border transition-colors ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className={`text-4xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{totalClasses}</p>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Total Classes</p>
        </div>

        <div className={`p-6 rounded-2xl border transition-colors ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className={`text-lg font-bold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Today's Date</p>
        </div>
      </div>

      {/* Students Section */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>My Students</h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {students.length === 0
                ? 'Add students using their email to get started'
                : 'Select students to start a group class'
              }
            </p>
          </div>
          {selectedStudents.length > 0 && (
            <button
              onClick={() => navigate('/teacher/classes?new=1')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start Class with {selectedStudents.length} Student{selectedStudents.length > 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              onClick={() => toggleStudentSelection(student.id)}
              className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedStudents.includes(student.id)
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : darkMode
                    ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
            >
              {/* Selection Checkbox */}
              <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selectedStudents.includes(student.id)
                  ? 'border-cyan-500 bg-cyan-500'
                  : darkMode ? 'border-slate-600' : 'border-slate-300'
              }`}>
                {selectedStudents.includes(student.id) && (
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Student Info */}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center text-lg font-bold ${
                  darkMode
                    ? 'from-slate-600 to-slate-700 text-slate-300'
                    : 'from-slate-300 to-slate-400 text-white'
                }`}>
                  {student.first_name[0]}{student.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold truncate ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{student.first_name} {student.last_name}</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    ID: {student.student_id}
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className={`mt-4 pt-4 border-t flex items-center justify-between ${
                darkMode ? 'border-slate-700/50' : 'border-slate-200'
              }`}>
                <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Added: {new Date(student.added_at).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveStudent(student.student_id);
                    }}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Add Student Card */}
          <div
            onClick={() => setShowAddStudentModal(true)}
            className={`p-5 rounded-xl border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[180px] ${
              darkMode
                ? 'border-slate-700 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              darkMode ? 'bg-slate-700' : 'bg-slate-200'
            }`}>
              <svg className={`w-6 h-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Add New Student</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Enter their email address</p>
          </div>
        </div>
      </div>

      {/* Recent Classes */}
      {classes.length > 0 && (
        <div className={`p-6 rounded-2xl border transition-colors ${
          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Recent Classes</h2>
              <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Your latest teaching sessions
              </p>
            </div>
            <button
              onClick={() => navigate('/teacher/classes')}
              className={`text-sm font-medium transition-colors ${
                darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-500'
              }`}
            >
              View All →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...classes]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 4)
              .map((cls) => {
                const dateObj = new Date(cls.date + 'T00:00:00');
                const dayNum = dateObj.getDate();
                const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });

                const hifz = cls.assignments.filter(a => a.type === 'hifz');
                const sabqi = cls.assignments.filter(a => a.type === 'sabqi');
                const revision = cls.assignments.filter(a => a.type === 'revision');

                const studentNames = cls.students?.map(s => `${s.first_name} ${s.last_name}`).join(', ');

                return (
                  <div
                    key={cls.id}
                    onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                      darkMode
                        ? 'border-slate-600 bg-slate-700/60 hover:border-cyan-500/50 hover:shadow-cyan-500/10'
                        : 'border-slate-300 bg-white hover:border-cyan-400 hover:shadow-cyan-100 shadow-sm'
                    }`}
                  >
                    {/* Date badge + day */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`text-center px-3 py-1.5 rounded-lg ${
                        darkMode ? 'bg-cyan-500/15' : 'bg-cyan-50'
                      }`}>
                        <div className="text-2xl font-bold text-cyan-500">{dayNum}</div>
                        <div className={`text-xs font-medium ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{monthStr}</div>
                      </div>
                      <div>
                        <div className={`text-sm font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{cls.day}</div>
                        {studentNames && (
                          <div className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{studentNames}</div>
                        )}
                      </div>
                    </div>

                    {/* Portions */}
                    <div className={`space-y-1.5 pt-3 border-t ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                      {hifz.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-400">Hifz:</span>
                          <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {hifz.map(a => formatPortionLabel(a)).join(', ')}
                          </span>
                        </div>
                      )}
                      {sabqi.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-cyan-400">Sabqi:</span>
                          <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {sabqi.map(a => formatPortionLabel(a)).join(', ')}
                          </span>
                        </div>
                      )}
                      {revision.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Revision:</span>
                          <span className={`text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            {revision.map(a => formatPortionLabel(a)).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`rounded-2xl border p-6 w-full max-w-lg mx-4 ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>Add New Student</h2>
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setEmailInput('');
                  setLookupResult(null);
                  setLookupError('');
                }}
                className={darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Student Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setLookupResult(null);
                      setLookupError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLookupStudent();
                    }}
                    placeholder="student@example.com"
                    className={`flex-1 px-4 py-2.5 border rounded-xl focus:outline-none focus:border-cyan-500 ${
                      darkMode
                        ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-400'
                        : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                  />
                  <button
                    onClick={handleLookupStudent}
                    disabled={!emailInput.trim() || isLookingUp}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-colors disabled:cursor-not-allowed ${
                      darkMode
                        ? 'bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 text-slate-200'
                        : 'bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isLookingUp ? 'Looking...' : 'Lookup'}
                  </button>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Enter the student's email address to find them</p>
              </div>

              {lookupError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-500 text-sm">
                  {lookupError}
                </div>
              )}

              {lookupResult && (
                <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                  <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Found student:</p>
                  <p className={`text-lg font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{lookupResult.first_name} {lookupResult.last_name}</p>
                  <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{lookupResult.email}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setEmailInput('');
                    setLookupResult(null);
                    setLookupError('');
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                    darkMode
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={!lookupResult || isAdding}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
                >
                  {isAdding ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getMyStudents, lookupStudent, addStudent, removeStudent, type StudentListItem } from '../api';

interface StudentLookup {
  student_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Add student modal state
  const [emailInput, setEmailInput] = useState('');
  const [lookupResult, setLookupResult] = useState<StudentLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const data = await getMyStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleStudentSelection = (id: number) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Teacher Dashboard</h1>
          <p className="text-slate-400 mt-1">Welcome back, {user?.first_name}! Manage your Halaqah and track student progress.</p>
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
          <p className="text-4xl font-bold text-slate-100">-</p>
          <p className="text-slate-400 mt-1">Classes This Week</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-4xl font-bold text-slate-100">-</p>
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
            <p className="text-sm text-slate-400 mt-1">
              {students.length === 0
                ? 'Add students using their email to get started'
                : 'Select students to start a group class'
              }
            </p>
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
          {students.map((student) => (
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
                  {student.first_name[0]}{student.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-100 truncate">{student.first_name} {student.last_name}</h3>
                  <p className="text-sm text-slate-400">
                    ID: {student.student_id}
                  </p>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Added: {new Date(student.added_at).toLocaleDateString()}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveStudent(student.student_id);
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
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
            <p className="text-sm text-slate-500 mt-1">Enter their email address</p>
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
                {students.length === 0 ? (
                  <p className="text-slate-400 text-sm">No students added yet. Add students first!</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {students.map((student) => (
                      <label key={student.id} className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => toggleStudentSelection(student.id)}
                          className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-slate-200">{student.first_name} {student.last_name}</span>
                      </label>
                    ))}
                  </div>
                )}
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
                    alert(`Starting class with: ${selectedStudents.map(id => {
                      const s = students.find(st => st.id === id);
                      return s ? `${s.first_name} ${s.last_name}` : '';
                    }).join(', ')}`);
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
              <button
                onClick={() => {
                  setShowAddStudentModal(false);
                  setEmailInput('');
                  setLookupResult(null);
                  setLookupError('');
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Student Email</label>
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
                    className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleLookupStudent}
                    disabled={!emailInput.trim() || isLookingUp}
                    className="px-4 py-2.5 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-200 rounded-xl font-medium transition-colors"
                  >
                    {isLookingUp ? 'Looking...' : 'Lookup'}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Enter the student's email address to find them</p>
              </div>

              {lookupError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {lookupError}
                </div>
              )}

              {lookupResult && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <p className="text-sm text-slate-400 mb-1">Found student:</p>
                  <p className="text-lg font-semibold text-slate-100">{lookupResult.first_name} {lookupResult.last_name}</p>
                  <p className="text-sm text-slate-400">{lookupResult.email}</p>
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
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={!lookupResult || isAdding}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
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

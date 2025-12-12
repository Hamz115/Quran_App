import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

type UserRole = 'teacher' | 'student';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('teacher');

  // Determine role from URL
  useEffect(() => {
    if (location.pathname.startsWith('/student')) {
      setRole('student');
    } else if (location.pathname.startsWith('/teacher')) {
      setRole('teacher');
    }
  }, [location]);

  const handleRoleSwitch = (newRole: UserRole) => {
    setRole(newRole);
    navigate(newRole === 'teacher' ? '/teacher' : '/student');
  };

  // Dynamic tabs based on role
  const teacherTabs = [
    { path: '/teacher', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/teacher/classes', label: 'Classes', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { path: '/reader', label: 'Quran Reader', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  ];

  const studentTabs = [
    { path: '/student', label: 'My Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/student/classes', label: 'My Classes', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { path: '/reader', label: 'Quran Reader', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  ];

  const tabs = role === 'teacher' ? teacherTabs : studentTabs;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="bg-slate-800/80 border-b border-slate-700/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center justify-between h-16 px-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-100">QuranTrack</span>
              <span className="text-xs text-slate-500 ml-2">Academy</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-700/50">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/teacher' || tab.path === '/student'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                {tab.label}
              </NavLink>
            ))}
          </nav>

          {/* Role Switcher - For Development/Demo */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">View as:</span>
            <div className="flex items-center bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
              <button
                onClick={() => handleRoleSwitch('teacher')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  role === 'teacher'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Teacher
                </span>
              </button>
              <button
                onClick={() => handleRoleSwitch('student')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  role === 'student'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Student
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Role Banner */}
      <div className={`px-12 py-2 text-center text-sm font-medium ${
        role === 'teacher'
          ? 'bg-blue-500/10 text-blue-400 border-b border-blue-500/20'
          : 'bg-purple-500/10 text-purple-400 border-b border-purple-500/20'
      }`}>
        {role === 'teacher' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Teacher View - Manage your Halaqah and students
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Student View - Track your personal progress
          </span>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 px-12 py-10 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}

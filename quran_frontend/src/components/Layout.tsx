import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

type UserRole = 'teacher' | 'student';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isVerified, logout } = useAuth();
  const [role, setRole] = useState<UserRole>('student');
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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

          {/* User Menu & Role Switcher */}
          <div className="flex items-center gap-4">
            {/* Role Switcher - only show if verified */}
            {isVerified && (
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
            )}

            {/* User Profile Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold text-white">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-slate-200">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-slate-500">{user?.student_id}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="p-4 border-b border-slate-700">
                      <p className="font-medium text-slate-100">{user?.first_name} {user?.last_name}</p>
                      <p className="text-sm text-slate-400">{user?.email}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500">ID:</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(user?.student_id || '');
                            // Could add a toast notification here
                          }}
                          className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-emerald-400 font-mono flex items-center gap-1 transition-colors"
                          title="Click to copy"
                        >
                          {user?.student_id}
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-400">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified Teacher
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-purple-400">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified Student
                        </span>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      {!isVerified && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            // TODO: Show upgrade modal / payment flow
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                          <span className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Upgrade to Teacher
                          </span>
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">
                            Pro
                          </span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
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

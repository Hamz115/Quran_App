import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type UserRole = 'teacher' | 'student';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
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
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      {/* Navbar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-300 ${
        darkMode
          ? 'bg-[rgb(26,31,46)]/90 border-cyan-900/30'
          : 'bg-white/80 border-cyan-200/50'
      }`}>
        <div className="flex items-center justify-between h-16 px-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="QuranTrack" className="w-10 h-10" />
            <span className={`text-xl font-bold transition-colors duration-300 ${
              darkMode ? 'text-slate-100' : 'text-slate-800'
            }`}>QuranTrack</span>
          </div>

          {/* Tab Navigation */}
          <nav className={`flex items-center gap-2 p-1.5 rounded-xl border transition-colors duration-300 ${
            darkMode
              ? 'bg-[rgb(30,41,59)]/50 border-cyan-900/30'
              : 'bg-white/50 border-cyan-200/50'
          }`}>
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.path === '/teacher' || tab.path === '/student'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-500 shadow-sm border border-cyan-500/30'
                      : darkMode
                        ? 'text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                        : 'text-slate-600 hover:text-cyan-600 hover:bg-cyan-50'
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
            {/* Theme Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2.5 rounded-lg transition-all duration-300 ${
                darkMode
                  ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
                  : 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border border-cyan-200'
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Role Switcher - only show for teachers (they can view as student too) */}
            {user?.role === 'teacher' && (
              <div className={`flex items-center p-1 rounded-lg border transition-colors duration-300 ${
                darkMode
                  ? 'bg-[rgb(30,41,59)]/50 border-cyan-900/30'
                  : 'bg-white/50 border-cyan-200/50'
              }`}>
                <button
                  onClick={() => handleRoleSwitch('teacher')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    role === 'teacher'
                      ? 'bg-cyan-500/20 text-cyan-500 border border-cyan-500/30'
                      : darkMode ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-600 hover:text-cyan-600'
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
                      ? 'bg-teal-500/20 text-teal-500 border border-teal-500/30'
                      : darkMode ? 'text-slate-400 hover:text-teal-400' : 'text-slate-600 hover:text-teal-600'
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
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  darkMode
                    ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20'
                    : 'bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/50'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-sm font-bold text-white">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div className="text-left hidden sm:block">
                  <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{user?.first_name} {user?.last_name}</p>
                </div>
                <svg className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className={`absolute right-0 mt-2 w-64 rounded-xl shadow-xl z-50 overflow-hidden border transition-colors duration-300 ${
                    darkMode
                      ? 'bg-[rgb(30,41,59)] border-cyan-900/30'
                      : 'bg-white border-cyan-200'
                  }`}>
                    {/* User Info */}
                    <div className={`p-4 border-b ${darkMode ? 'border-cyan-900/30' : 'border-cyan-200'}`}>
                      <p className={`font-medium ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{user?.first_name} {user?.last_name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(user?.email || '');
                          }}
                          className={`text-sm flex items-center gap-1.5 transition-colors ${
                            darkMode ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-500 hover:text-cyan-600'
                          }`}
                          title="Click to copy email"
                        >
                          {user?.email}
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      {user?.role === 'teacher' ? (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-500">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Teacher Account
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs text-teal-500">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Student Account
                        </span>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      {user?.role === 'student' && (
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                            darkMode
                              ? 'text-slate-300 hover:bg-cyan-500/10'
                              : 'text-slate-600 hover:bg-cyan-50'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            Upgrade to Teacher
                          </span>
                          <span className="text-xs bg-cyan-500/20 text-cyan-500 px-2 py-0.5 rounded-full font-medium">
                            Pro
                          </span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
      <div className={`px-12 py-2 text-center text-sm font-medium border-b transition-colors duration-300 ${
        role === 'teacher'
          ? darkMode
            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
            : 'bg-cyan-50 text-cyan-600 border-cyan-200'
          : darkMode
            ? 'bg-teal-500/10 text-teal-400 border-teal-500/20'
            : 'bg-teal-50 text-teal-600 border-teal-200'
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

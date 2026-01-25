import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type Role = 'teacher' | 'student';

export default function Signup() {
  const [role, setRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!role) {
      setError('Please select Teacher or Student');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setIsLoading(true);

    try {
      await signup({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: role,
      });
      navigate(role === 'teacher' ? '/teacher' : '/student');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(/background.jpg)',
      }}
    >
      {/* Overlay for readability */}
      <div className={`fixed inset-0 transition-colors duration-300 ${
        darkMode
          ? 'bg-[rgb(26,31,46)]/80'
          : 'bg-sky-100/70'
      }`} />

      {/* Theme Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className={`fixed top-4 right-4 z-20 p-3 rounded-full transition-all duration-300 ${
          darkMode
            ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
            : 'bg-white text-cyan-600 hover:bg-cyan-50 shadow-lg border border-cyan-200'
        }`}
        aria-label="Toggle dark mode"
      >
        {darkMode ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Quran Verse - Surah Al-Isra 17:9 */}
      <div className="relative z-10 w-full max-w-4xl text-center mb-6">
        <p className={`text-xl md:text-2xl font-arabic leading-relaxed transition-colors duration-300 ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`} dir="rtl">
          إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا
        </p>
        <p className={`text-sm mt-2 transition-colors duration-300 ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          "Indeed, this Quran guides to that which is most suitable and gives good tidings to the believers who do righteous deeds that they will have a great reward." - Al-Isra 17:9
        </p>
      </div>

      {/* Main Card */}
      <div className={`relative z-10 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row lg:min-h-[600px] transition-colors duration-300 ${
        darkMode ? 'bg-[rgb(30,41,59)]/95 border border-cyan-900/30 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm border border-cyan-200/50'
      }`}>
          {/* Left Side - Decorative (shows on top on mobile) */}
          <div className="flex w-full lg:w-1/2 relative bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-500 items-center justify-center py-8 lg:py-0 rounded-t-3xl lg:rounded-t-none lg:rounded-l-3xl">
            {/* Smooth Wave Divider - desktop only */}
            <svg
              className="hidden lg:block absolute -right-4 -top-4 w-24"
              style={{ height: 'calc(100% + 32px)' }}
              viewBox="0 0 100 800"
              preserveAspectRatio="none"
              fill={darkMode ? 'rgb(30,41,59)' : 'rgba(255,255,255,0.9)'}
            >
              <path d="M0 -20H120V820H0C0 820 80 700 60 600C40 500 100 450 80 350C60 250 100 150 60 50C40 -20 0 -20 0 -20Z" />
            </svg>

            {/* Decorative Elements */}
            <div className="absolute top-10 left-10 lg:top-20 lg:left-20 w-20 lg:w-32 h-20 lg:h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-10 left-20 lg:bottom-32 lg:left-32 w-16 lg:w-24 h-16 lg:h-24 bg-white/10 rounded-full blur-2xl"></div>

            {/* Content */}
            <div className="relative z-10 text-center px-8 lg:px-12">
              <img src="/logo.png" alt="QuranTrack" className="w-16 h-16 lg:w-28 lg:h-28 mx-auto mb-4 lg:mb-8 drop-shadow-2xl" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 lg:mb-4">Join Us!</h2>
              <p className="text-white/90 text-sm lg:text-lg leading-relaxed max-w-xs mx-auto">
                Start your Quran memorization journey today
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="w-full lg:w-1/2 p-6 lg:p-10 flex flex-col justify-center overflow-y-auto">
            <div className="max-w-sm mx-auto w-full">
              {/* Logo - shows on all screens now since decorative has it */}
              <div className="flex items-center gap-3 mb-6 lg:hidden">
                <img src="/logo.png" alt="QuranTrack" className="w-10 h-10" />
                <span className={`text-xl font-bold transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-slate-800'
                }`}>QuranTrack</span>
              </div>

              <h1 className={`text-2xl font-bold mb-1 transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>Create Account</h1>
            <p className={`mb-6 transition-colors duration-300 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Join QuranTrack today</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                  darkMode
                    ? 'bg-red-900/30 border border-red-800 text-red-400'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                      role === 'teacher'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : darkMode
                          ? 'border-cyan-900/50 bg-[rgb(37,45,61)] text-slate-400 hover:border-cyan-700'
                          : 'border-cyan-200 bg-cyan-50/50 text-slate-500 hover:border-cyan-300'
                    }`}
                  >
                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                    </svg>
                    <span className="font-medium text-sm">Teacher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center ${
                      role === 'student'
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : darkMode
                          ? 'border-cyan-900/50 bg-[rgb(37,45,61)] text-slate-400 hover:border-cyan-700'
                          : 'border-cyan-200 bg-cyan-50/50 text-slate-500 hover:border-cyan-300'
                    }`}
                  >
                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    <span className="font-medium text-sm">Student</span>
                  </button>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl transition-all focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm ${
                      darkMode
                        ? 'bg-slate-700 border border-slate-600 text-white placeholder-slate-400'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                    placeholder="Ahmed"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl transition-all focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm ${
                      darkMode
                        ? 'bg-slate-700 border border-slate-600 text-white placeholder-slate-400'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                    placeholder="Hassan"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl transition-all focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm ${
                    darkMode
                      ? 'bg-slate-700 border border-slate-600 text-white placeholder-slate-400'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  darkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl transition-all focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm ${
                    darkMode
                      ? 'bg-slate-700 border border-slate-600 text-white placeholder-slate-400'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                  placeholder="ahmed_hassan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl transition-all focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm ${
                      darkMode
                        ? 'bg-slate-700 border border-slate-600 text-white placeholder-slate-400'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                    placeholder="8+ characters"
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}>Confirm</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 rounded-xl transition-all focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-sm ${
                      darkMode
                        ? 'bg-slate-700 border border-slate-600 text-white placeholder-slate-400'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400'
                    }`}
                    placeholder="Confirm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !role}
                className={`w-full py-3 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                  role === 'teacher'
                    ? 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-cyan-500/30'
                    : role === 'student'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-teal-500/30'
                    : 'bg-gradient-to-r from-slate-400 to-slate-500 text-white shadow-slate-400/30'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'CREATE ACCOUNT'
                )}
              </button>
            </form>

            <p className={`text-center mt-4 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Already have an account?{' '}
              <Link to="/login" className={`font-semibold ${
                darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'
              }`}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

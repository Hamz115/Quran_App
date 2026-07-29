import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('invalid login credentials') || msg.toLowerCase().includes('invalid_credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('timed out')) {
        setError('Login is taking too long. Please check your internet and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="approved-auth-page min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-300 bg-cover bg-center bg-no-repeat"
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
      {/* Quran Verse - Surah Al-Isra 17:9 */}
      <div className="auth-verse relative z-10 w-full max-w-4xl text-center mb-6">
        <p className={`auth-verse-arabic text-xl md:text-2xl font-arabic leading-loose transition-colors duration-300 ${
          darkMode ? 'text-slate-300' : 'text-slate-600'
        }`} dir="rtl">
          إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا
        </p>
        <p className={`auth-verse-translation text-sm mt-2 transition-colors duration-300 ${
          darkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          "Indeed, this Quran guides to that which is most suitable and gives good tidings to the believers who do righteous deeds that they will have a great reward." - Al-Isra 17:9
        </p>
      </div>

      {/* Main Card */}
      <div className={`approved-auth-card relative z-10 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col-reverse lg:flex-row lg:min-h-[520px] transition-colors duration-300 ${
        darkMode ? 'bg-[rgb(30,41,59)]/95 border border-cyan-900/30 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm border border-cyan-200/50'
      }`}>
        {/* Left Side - Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <img src="/qurantrack-icon.png" alt="QuranTrack logo" className="auth-brand-logo w-12 h-12" />
              <span className={`text-2xl font-bold transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>QuranTrack</span>
            </div>

            <h1 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-slate-800'
            }`}>Assalamu Alaikum!</h1>
            <p className={`mb-8 transition-colors duration-300 ${
              darkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>Sign in to your account</p>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-[rgb(37,45,61)] border border-cyan-900/50 text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                      : 'bg-cyan-50/50 border border-cyan-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                  }`}
                  placeholder="E-mail"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-[rgb(37,45,61)] border border-cyan-900/50 text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                      : 'bg-cyan-50/50 border border-cyan-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                  }`}
                  placeholder="Password"
                  required
                />
              </div>

              {/* Forgot Password */}
              <div className="flex items-center justify-end text-sm">
                <Link
                  to="/forgot-password"
                  className={`font-medium ${
                    darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'
                  }`}
                >
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Signing in...
                  </span>
                ) : 'SIGN IN'}
              </button>
            </form>

            <p className={`text-center mt-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Don't have an account?{' '}
              <Link to="/signup" className={`font-semibold ${
                darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'
              }`}>
                Create
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side - Decorative (shows below on mobile, right on desktop) */}
        <div className="flex w-full lg:w-1/2 relative bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-500 items-center justify-center py-8 lg:py-0 rounded-t-3xl lg:rounded-t-none lg:rounded-r-3xl">
          {/* Smooth Wave Divider - desktop only */}
          <svg
            className="hidden lg:block absolute -left-4 -top-4 w-24"
            style={{ height: 'calc(100% + 32px)' }}
            viewBox="0 0 100 800"
            preserveAspectRatio="none"
            fill={darkMode ? 'rgb(30,41,59)' : 'rgba(255,255,255,0.9)'}
          >
            <path d="M100 -20H-20V820H100C100 820 20 700 40 600C60 500 0 450 20 350C40 250 0 150 40 50C60 -20 100 -20 100 -20Z" />
          </svg>

          {/* Decorative Elements */}
          <div className="absolute top-10 right-10 lg:top-20 lg:right-20 w-20 lg:w-32 h-20 lg:h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 right-20 lg:bottom-32 lg:right-32 w-16 lg:w-24 h-16 lg:h-24 bg-white/10 rounded-full blur-2xl"></div>

          {/* Content */}
          <div className="relative z-10 text-center px-8 lg:px-12">
            <img src="/qurantrack-icon.png" alt="QuranTrack logo" className="auth-hero-logo w-20 h-20 lg:w-32 lg:h-32 mx-auto mb-4 lg:mb-7 drop-shadow-2xl" />
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 lg:mb-4">Welcome Back!</h2>
            <p className="text-white/90 text-sm lg:text-lg leading-relaxed max-w-xs mx-auto">
              Track your Quran memorization journey with ease
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

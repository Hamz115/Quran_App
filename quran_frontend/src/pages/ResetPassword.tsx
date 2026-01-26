import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidLink, setIsValidLink] = useState(true);

  const { updatePassword } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  // Check if we have a valid reset token in the URL
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
      setIsValidLink(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await updatePassword(password);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
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

      {/* Main Card */}
      <div className={`relative z-10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-[rgb(30,41,59)]/95 border border-cyan-900/30 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm border border-cyan-200/50'
      }`}>
        <div className="p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src="/logo.png" alt="QuranTrack" className="w-12 h-12" />
            <span className={`text-2xl font-bold transition-colors duration-300 ${
              darkMode ? 'text-white' : 'text-slate-800'
            }`}>QuranTrack</span>
          </div>

          {!isValidLink ? (
            // Invalid Link State
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>Invalid Reset Link</h1>
              <p className={`mb-6 transition-colors duration-300 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-teal-600 transition-all"
              >
                Request New Link
              </Link>
            </div>
          ) : success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>Password Reset!</h1>
              <p className={`mb-6 transition-colors duration-300 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Your password has been successfully reset. Redirecting to login...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-400 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Go to Login
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <h1 className={`text-2xl font-bold mb-2 text-center transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>Reset Password</h1>
              <p className={`mb-8 text-center transition-colors duration-300 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>Enter your new password below</p>

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

                {/* New Password Input */}
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
                    placeholder="New password (8+ characters)"
                    required
                    minLength={8}
                  />
                </div>

                {/* Confirm Password Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3.5 rounded-xl transition-all focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-[rgb(37,45,61)] border border-cyan-900/50 text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                        : 'bg-cyan-50/50 border border-cyan-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                    }`}
                    placeholder="Confirm new password"
                    required
                  />
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
                      Resetting...
                    </span>
                  ) : 'Reset Password'}
                </button>
              </form>

              <p className={`text-center mt-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Remember your password?{' '}
                <Link to="/login" className={`font-semibold ${
                  darkMode ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'
                }`}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { resetPassword } = useAuth();
  const { darkMode } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
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

      {/* Main Card */}
      <div className={`approved-auth-card relative z-10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transition-colors duration-300 ${
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

          {success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className={`text-2xl font-bold mb-2 transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>Check Your Email</h1>
              <p className={`mb-6 transition-colors duration-300 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                We've sent a password reset link to <strong>{email}</strong>.
                Please check your inbox and follow the instructions.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-400 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Login
              </Link>
            </div>
          ) : (
            // Form State
            <>
              <h1 className={`text-2xl font-bold mb-2 text-center transition-colors duration-300 ${
                darkMode ? 'text-white' : 'text-slate-800'
              }`}>Forgot Password?</h1>
              <p className={`mb-8 text-center transition-colors duration-300 ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>Enter your email and we'll send you a reset link</p>

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
                    placeholder="Enter your email"
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
                      Sending...
                    </span>
                  ) : 'Send Reset Link'}
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

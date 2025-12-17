import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">QT</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Welcome Back</h1>
          <p className="text-slate-400 mt-1">Sign in to QuranTrack</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
              placeholder="Enter email or username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Sign up link */}
        <p className="text-center text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-emerald-400 hover:text-emerald-300">
            Sign up
          </Link>
        </p>

        {/* Demo Users */}
        <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          <p className="text-sm text-slate-400 mb-3 text-center">Demo Accounts (click to auto-fill)</p>
          <p className="text-xs text-slate-500 mb-3 text-center">Password: Test123!</p>
          <div className="space-y-2">
            {/* Personal Accounts */}
            <p className="text-xs text-purple-400 font-medium">Personal:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setIdentifier('hamzaferoze115@gmail.com'); setPassword('password12345'); }}
                className="px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm hover:bg-purple-500/30 transition-colors"
              >
                Hamza Feroze (T)
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('hamzaferoze115+114@gmail.com'); setPassword('password12345'); }}
                className="px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 text-sm hover:bg-purple-500/30 transition-colors"
              >
                Hamza Reyal (S)
              </button>
            </div>

            {/* Teachers */}
            <p className="text-xs text-emerald-400 font-medium mt-3">Teachers:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setIdentifier('abdullah.q@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
              >
                Abdullah Q
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('tariq.jameel@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
              >
                Tariq Jameel
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('usman.farooq@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
              >
                Usman Farooq
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('maryam.s@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
              >
                Maryam S
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('khadijah.noor@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors"
              >
                Khadijah Noor
              </button>
            </div>

            {/* Students */}
            <p className="text-xs text-blue-400 font-medium mt-3">Students:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setIdentifier('ahmed.khan@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Ahmed Khan
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('yusuf.ali@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Yusuf Ali
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('omar.hassan@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Omar Hassan
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('ibrahim.m@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Ibrahim M
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('bilal.ahmad@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Bilal Ahmad
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('khalid.r@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Khalid R
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('zayd.malik@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Zayd Malik
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('mustafa.h@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Mustafa H
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('fatima.zahra@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Fatima Zahra
              </button>
              <button
                type="button"
                onClick={() => { setIdentifier('aisha.begum@test.com'); setPassword('Test123!'); }}
                className="px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
              >
                Aisha Begum
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

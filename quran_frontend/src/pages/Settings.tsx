import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { checkForAppUpdates, type UpdateStatus } from '../lib/updater';

export default function Settings() {
  const { user, updateProfile, updatePassword, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  // Profile form state
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Tauri detection
  const isTauri = !!(window as any).__TAURI_INTERNALS__;

  // Update state (Tauri only)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);

  const handleCheckForUpdates = useCallback(() => {
    checkForAppUpdates((status) => setUpdateStatus(status));
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);
    setProfileLoading(true);

    try {
      await updateProfile(firstName, lastName);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await updatePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 mb-4 text-sm font-medium transition-colors ${
            darkMode
              ? 'text-slate-400 hover:text-cyan-400'
              : 'text-slate-500 hover:text-cyan-600'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          Settings
        </h1>
        <p className={`mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Manage your profile and account settings
        </p>
      </div>

      {/* 1. App Info Section — only visible in Tauri desktop app */}
      {isTauri && (
        <div className={`card p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
              <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                App Info
              </h2>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Version and updates
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className={`text-sm font-medium w-32 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Version
              </span>
              <span className={`font-mono font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                v1.6.2
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className={`text-sm font-medium w-32 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Updates
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCheckForUpdates}
                  disabled={updateStatus?.stage === 'checking' || updateStatus?.stage === 'downloading' || updateStatus?.stage === 'installing'}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
                >
                  {updateStatus?.stage === 'checking' ? 'Checking...'
                    : updateStatus?.stage === 'downloading' ? `Downloading (${(updateStatus as any).progress}%)...`
                    : updateStatus?.stage === 'installing' ? 'Installing...'
                    : updateStatus?.stage === 'restarting' ? 'Restarting...'
                    : 'Check for Updates'}
                </button>

                {updateStatus?.stage === 'upToDate' && (
                  <span className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    Up to date!
                  </span>
                )}
                {updateStatus?.stage === 'error' && (
                  <span className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                    Update check failed
                  </span>
                )}
                {updateStatus?.stage === 'dismissed' && (
                  <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Update skipped
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Profile Section */}
      <div className={`card p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-cyan-500/20' : 'bg-cyan-100'}`}>
            <svg className="w-6 h-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Profile Information
            </h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Update your personal details
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          {profileError && (
            <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
              darkMode
                ? 'bg-red-900/30 border border-red-800 text-red-400'
                : 'bg-red-50 border border-red-200 text-red-600'
            }`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {profileError}
            </div>
          )}

          {profileSuccess && (
            <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
              darkMode
                ? 'bg-green-900/30 border border-green-800 text-green-400'
                : 'bg-green-50 border border-green-200 text-green-600'
            }`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Profile updated successfully!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 ${
                  darkMode
                    ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                }`}
                placeholder="Enter first name"
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 ${
                  darkMode
                    ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20'
                }`}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30"
            >
              {profileLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Account & Security Section (merged Account Info + Change Password) */}
      <div className={`card p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Account & Security
            </h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Your account details and security settings
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className={`text-sm font-medium w-32 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Email
            </span>
            <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {user?.email}
            </span>
          </div>

          {/* Role */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className={`text-sm font-medium w-32 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Role
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              user?.role === 'teacher'
                ? darkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                : darkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
            }`}>
              {user?.role === 'teacher' ? 'Teacher' : 'Student'}
            </span>
          </div>

          {/* Student ID */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className={`text-sm font-medium w-32 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Student ID
            </span>
            <span className={`${user?.student_id ? (darkMode ? 'text-white' : 'text-slate-800') : (darkMode ? 'text-slate-500' : 'text-slate-400')} ${user?.student_id ? 'font-mono' : 'italic'}`}>
              {user?.student_id || 'Not assigned'}
            </span>
          </div>

          {/* Member Since */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <span className={`text-sm font-medium w-32 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Member Since
            </span>
            <span className={`${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {formatDate(user?.created_at)}
            </span>
          </div>

          {/* Divider */}
          <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'} my-2`} />

          {/* Change Password Toggle */}
          <button
            type="button"
            onClick={() => {
              setShowPasswordForm(!showPasswordForm);
              if (showPasswordForm) {
                setNewPassword('');
                setConfirmPassword('');
                setPasswordError('');
                setPasswordSuccess(false);
              }
            }}
            className={`w-full flex items-center justify-between py-2 px-1 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className={`w-5 h-5 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Change Password
              </span>
            </div>
            <svg
              className={`w-5 h-5 transition-transform ${showPasswordForm ? 'rotate-180' : ''} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Collapsible Password Form */}
          {showPasswordForm && (
            <form onSubmit={handlePasswordChange} className={`space-y-4 p-4 rounded-xl ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
              {passwordError && (
                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                  darkMode
                    ? 'bg-red-900/30 border border-red-800 text-red-400'
                    : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
                  darkMode
                    ? 'bg-green-900/30 border border-green-800 text-green-400'
                    : 'bg-green-50 border border-green-200 text-green-600'
                }`}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Password changed successfully!
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20'
                      : 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20'
                  }`}
                  placeholder="Enter new password (8+ characters)"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl transition-all focus:outline-none focus:ring-2 ${
                    darkMode
                      ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20'
                      : 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:ring-purple-500/20'
                  }`}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                >
                  {passwordLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Changing...
                    </span>
                  ) : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                    setPasswordSuccess(false);
                  }}
                  className={`px-6 py-3 font-semibold rounded-xl transition-all ${
                    darkMode
                      ? 'bg-slate-600 hover:bg-slate-500 text-slate-200'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 4. Appearance Section */}
      <div className={`card p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
            <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Appearance
            </h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Customize how the app looks
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? (
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
            <div>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              darkMode ? 'bg-indigo-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 5. Sign Out Section */}
      <div className={`card p-6 rounded-2xl ${darkMode ? 'bg-slate-800/50 border border-red-900/30' : 'bg-white border border-red-200/50'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Sign Out
            </h2>
          </div>
        </div>

        <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Signing out will end your session. Your data is saved in the cloud.
        </p>

        <button
          onClick={handleSignOut}
          className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-red-500/30"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

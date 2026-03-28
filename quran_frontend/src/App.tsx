import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { checkForAppUpdates, onUpdateStatus, cancelUpdate, type UpdateStatus } from './lib/updater';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Classes from './pages/Classes';
import TeacherClasses from './pages/TeacherClasses';
import StudentClasses from './pages/StudentClasses';
import Classroom from './pages/Classroom';
import QuranReader from './pages/QuranReader';
import { TourProvider } from './contexts/TourContext';

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Fullscreen overlay shown during update download/install */
function UpdateOverlay() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    return onUpdateStatus(setStatus);
  }, []);

  // Only show overlay during active download/install/restart/error
  if (!status) return null;
  const showStages = ['downloading', 'installing', 'restarting', 'error'];
  if (!showStages.includes(status.stage)) return null;

  // Error state
  if (status.stage === 'error') {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-6 px-8">
          <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          <p className="text-xl font-semibold text-white">Update Failed</p>
          <p className="text-sm text-slate-400 text-center max-w-xs">{status.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-lg bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isDownloading = status.stage === 'downloading';
  const isIndeterminate = isDownloading && status.progress < 0;
  const progress = isDownloading ? (isIndeterminate ? 0 : status.progress) : 100;
  const downloadedBytes = isDownloading ? status.downloadedBytes : 0;

  const label =
    status.stage === 'downloading' ? 'Downloading update...' :
    status.stage === 'installing' ? 'Installing update — do not close the app' :
    'Restarting...';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 px-8">
        {/* Spinning icon */}
        <div className="relative">
          <svg className="w-16 h-16 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>

        {/* Label */}
        <p className="text-xl font-semibold text-white">{label}</p>

        {/* Progress bar */}
        <div className="w-72 sm:w-96">
          <div className="h-3 rounded-full bg-slate-700 overflow-hidden">
            {isIndeterminate ? (
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 animate-[indeterminate_1.5s_ease-in-out_infinite]" />
            ) : (
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            )}
          </div>
          <p className="mt-2 text-center text-sm font-mono text-slate-400">
            {isIndeterminate
              ? `${formatBytes(downloadedBytes)} downloaded`
              : `${progress}%`}
          </p>
        </div>

        {/* Helper text */}
        <p className="text-sm text-slate-500 text-center max-w-xs">
          {status.stage === 'restarting'
            ? 'The app will restart momentarily.'
            : status.stage === 'installing'
            ? 'Please wait — do not close the app.'
            : 'Please wait — the app will restart automatically.'}
        </p>

        {/* Cancel button — only during download */}
        {isDownloading && (
          <button
            onClick={cancelUpdate}
            className="mt-2 px-5 py-2 rounded-lg border border-slate-600 text-slate-400 text-sm font-medium hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            Cancel Update
          </button>
        )}
      </div>
    </div>
  );
}

function App() {
  // Auto-check for updates on launch (Tauri desktop only, no-op in browser)
  useEffect(() => {
    checkForAppUpdates();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <TourProvider>
        <UpdateOverlay />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Default dashboard */}
            <Route index element={<Dashboard />} />

            {/* Teacher Routes */}
            <Route path="teacher" element={<TeacherDashboard />} />
            <Route path="teacher/classes" element={<TeacherClasses />} />
            <Route path="teacher/classes/:id" element={<Classroom />} />


            {/* Student Routes */}
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/classes" element={<StudentClasses />} />
            <Route path="student/classes/:id" element={<Classroom />} />

            {/* Shared/Legacy Routes */}
            <Route path="classes" element={<Classes />} />
            <Route path="classes/:id" element={<Classroom />} />
            <Route path="reader" element={<QuranReader />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        </TourProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

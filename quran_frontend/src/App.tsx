import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { checkForAppUpdates, onUpdateStatus, type UpdateStatus } from './lib/updater';
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

/** Fullscreen overlay shown during update download/install */
function UpdateOverlay() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    return onUpdateStatus(setStatus);
  }, []);

  // Only show overlay during active download/install/restart
  if (!status) return null;
  if (status.stage !== 'downloading' && status.stage !== 'installing' && status.stage !== 'restarting') return null;

  const progress = status.stage === 'downloading' ? status.progress : 100;
  const label =
    status.stage === 'downloading' ? 'Downloading update...' :
    status.stage === 'installing' ? 'Installing update...' :
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
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm font-mono text-slate-400">
            {progress}%
          </p>
        </div>

        {/* Helper text */}
        <p className="text-sm text-slate-500 text-center max-w-xs">
          {status.stage === 'restarting'
            ? 'The app will restart momentarily.'
            : 'Please wait — the app will restart automatically.'}
        </p>
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
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

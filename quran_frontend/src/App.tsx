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
import TeacherClasses from './pages/TeacherClasses';
import Classroom from './pages/Classroom';
import QuranReader from './pages/QuranReader';
import Reports from './pages/Reports';
import Contacts from './pages/Contacts';
import Mistakes from './pages/Mistakes';
import { TourProvider } from './contexts/TourContext';
import { Navigate } from 'react-router-dom';

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Fullscreen overlay shown during update download/install */
function UpdateOverlay() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => onUpdateStatus(setStatus), []);

  if (!status || !['downloading', 'installing', 'restarting', 'error'].includes(status.stage)) return null;

  if (status.stage === 'error') {
    return (
      <div className="update-overlay">
        <section className="update-dialog error">
          <span className="update-dialog-kicker">QURANTRACK UPDATE</span>
          <h2>Update could not be completed</h2>
          <p>{status.error}</p>
          <button onClick={() => window.location.reload()} className="approved-primary-button">Return to QuranTrack</button>
        </section>
      </div>
    );
  }

  const isDownloading = status.stage === 'downloading';
  const isIndeterminate = isDownloading && status.progress < 0;
  const progress = isDownloading ? (isIndeterminate ? 0 : status.progress) : 100;
  const downloadedBytes = isDownloading ? status.downloadedBytes : 0;
  const label = status.stage === 'downloading' ? 'Downloading update' : status.stage === 'installing' ? 'Installing update' : 'Restarting QuranTrack';

  return (
    <div className="update-overlay">
      <section className="update-dialog">
        <span className="update-dialog-kicker">QURANTRACK DESKTOP</span>
        <div className="update-spinner"><span /></div>
        <h2>{label}</h2>
        <p>{status.stage === 'restarting' ? 'The application will reopen momentarily.' : status.stage === 'installing' ? 'Please keep QuranTrack open while the update is installed.' : 'A newer version is being prepared for you.'}</p>
        <div className="update-progress"><div className={isIndeterminate ? 'indeterminate' : ''} style={{ width: isIndeterminate ? '35%' : `${progress}%` }} /></div>
        <small>{isIndeterminate ? `${formatBytes(downloadedBytes)} downloaded` : `${progress}% complete`}</small>
        {isDownloading && <button onClick={cancelUpdate} className="approved-secondary-button">Cancel download</button>}
      </section>
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
            {/* Unified dashboard */}
            <Route index element={<Dashboard />} />

            {/* Sessions (was Classes) */}
            <Route path="sessions" element={<TeacherClasses />} />
            <Route path="sessions/:id" element={<Classroom />} />

            {/* Quran Reader */}
            <Route path="reader" element={<QuranReader />} />
            <Route path="reports" element={<Reports />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="mistakes" element={<Mistakes />} />

            {/* Settings */}
            <Route path="settings" element={<Settings />} />

            {/* Legacy redirects */}
            <Route path="dashboard" element={<Navigate to="/" replace />} />
            <Route path="teacher" element={<Navigate to="/" replace />} />
            <Route path="teacher/classes" element={<Navigate to="/sessions" replace />} />
            <Route path="teacher/classes/:id" element={<Classroom />} />
            <Route path="student" element={<Navigate to="/" replace />} />
            <Route path="student/classes" element={<Navigate to="/sessions" replace />} />
            <Route path="student/classes/:id" element={<Classroom />} />
            <Route path="classes" element={<Navigate to="/sessions" replace />} />
            <Route path="classes/:id" element={<Classroom />} />
          </Route>
        </Routes>
        </TourProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

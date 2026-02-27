import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { checkForAppUpdates } from './lib/updater';
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


function App() {
  // Auto-check for updates on launch (Tauri desktop only, no-op in browser)
  useEffect(() => {
    checkForAppUpdates();
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
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

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Classes from './pages/Classes';
import TeacherClasses from './pages/TeacherClasses';
import StudentClasses from './pages/StudentClasses';
import Classroom from './pages/Classroom';
import QuranReader from './pages/QuranReader';
import QuranPageTest from './pages/QuranPageTest';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

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

            {/* Teacher Routes (require verification) */}
            <Route
              path="teacher"
              element={
                <ProtectedRoute requireVerified>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="teacher/classes"
              element={
                <ProtectedRoute requireVerified>
                  <TeacherClasses />
                </ProtectedRoute>
              }
            />
            <Route
              path="teacher/classes/:id"
              element={
                <ProtectedRoute requireVerified>
                  <Classroom />
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/classes" element={<StudentClasses />} />
            <Route path="student/classes/:id" element={<Classroom />} />

            {/* Shared/Legacy Routes */}
            <Route path="classes" element={<Classes />} />
            <Route path="classes/:id" element={<Classroom />} />
            <Route path="reader" element={<QuranReader />} />
            <Route path="quran-test" element={<QuranPageTest />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

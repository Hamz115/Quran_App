import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import Classes from './pages/Classes';
import TeacherClasses from './pages/TeacherClasses';
import StudentClasses from './pages/StudentClasses';
import Classroom from './pages/Classroom';
import TeacherClassroom from './pages/TeacherClassroom';
import StudentClassroom from './pages/StudentClassroom';
import QuranReader from './pages/QuranReader';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Default dashboard - will be role-based later */}
          <Route index element={<Dashboard />} />

          {/* Teacher Routes */}
          <Route path="teacher" element={<TeacherDashboard />} />
          <Route path="teacher/classes" element={<TeacherClasses />} />
          <Route path="teacher/classes/:id" element={<TeacherClassroom />} />

          {/* Student Routes */}
          <Route path="student" element={<StudentDashboard />} />
          <Route path="student/classes" element={<StudentClasses />} />
          <Route path="student/classes/:id" element={<StudentClassroom />} />

          {/* Shared/Legacy Routes */}
          <Route path="classes" element={<Classes />} />
          <Route path="classes/:id" element={<Classroom />} />
          <Route path="reader" element={<QuranReader />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

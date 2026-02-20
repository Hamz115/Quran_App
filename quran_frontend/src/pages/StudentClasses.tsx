import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getMyTeachers } from '../api';
import { ReportPanel } from '../components/teacher-classes';

export default function StudentClasses() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadTeacher() {
      try {
        const teachers = await getMyTeachers();
        if (isMounted && teachers.length > 0) {
          setTeacherName(`${teachers[0].first_name} ${teachers[0].last_name}`);
        }
      } catch (err) {
        console.error('Failed to load teacher:', err);
      }
    }
    loadTeacher();
    return () => { isMounted = false; };
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>My Classes</h1>
        <p className={`mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {teacherName ? `Your learning journey with ${teacherName}` : 'Your learning journey'}
        </p>
      </div>

      {/* Report Panel — same as teacher view but for own data */}
      <ReportPanel
        studentId={user.id}
        basePath="/student/classes"
        hideExport
      />
    </div>
  );
}

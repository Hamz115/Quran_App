import type { AuthResponse, TokenResponse, User, StudentListItem, TeacherListItem, StudentLookup } from './types';

// Re-export types for convenience
export type { StudentListItem, TeacherListItem, StudentLookup } from './types';

const API_BASE = 'http://localhost:8000/api';

// Token management
let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

export function getAccessToken() {
  return accessToken;
}

// Helper for authenticated requests
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, { ...options, headers });

  // If 401, try to refresh token
  if (res.status === 401 && refreshToken) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
}

// ============ AUTH ============

export async function signup(data: {
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  password: string;
  role: 'teacher' | 'student';
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Signup failed');
  }

  const authData: AuthResponse = await res.json();
  setTokens(authData.access_token, authData.refresh_token);
  return authData;
}

export async function login(identifier: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Login failed');
  }

  const authData: AuthResponse = await res.json();
  setTokens(authData.access_token, authData.refresh_token);
  return authData;
}

export async function refreshTokens(): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data: TokenResponse = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function logout(): Promise<void> {
  if (refreshToken) {
    try {
      await authFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Ignore errors during logout
    }
  }
  clearTokens();
}

export async function getCurrentUser(): Promise<User> {
  const res = await authFetch(`${API_BASE}/auth/me`);
  if (!res.ok) {
    throw new Error('Not authenticated');
  }
  return res.json();
}

export async function requestVerification(): Promise<{ message: string }> {
  const res = await authFetch(`${API_BASE}/auth/request-verification`, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to request verification');
  }
  return res.json();
}

export async function verifyEmail(token: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Verification failed');
  }
  return res.json();
}

// ============ STUDENTS (Teacher only) ============

export async function lookupStudent(email: string): Promise<StudentLookup> {
  const res = await authFetch(`${API_BASE}/students/lookup?email=${encodeURIComponent(email)}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'No user found with that email');
  }
  return res.json();
}

export async function addStudent(email: string): Promise<{ message: string }> {
  const res = await authFetch(`${API_BASE}/students/add`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to add student');
  }
  return res.json();
}

export async function getMyStudents(): Promise<StudentListItem[]> {
  const res = await authFetch(`${API_BASE}/students`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch students');
  }
  return res.json();
}

export async function removeStudent(studentId: string): Promise<{ message: string }> {
  const res = await authFetch(`${API_BASE}/students/remove/${studentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to remove student');
  }
  return res.json();
}

// ============ PORTION SUGGESTIONS ============

export interface PortionSuggestion {
  start_surah: number;
  end_surah: number;
  start_ayah: number | null;
  end_ayah: number | null;
  surah_name: string | null;
  note: string;
}

export interface SuggestedPortions {
  hifz: PortionSuggestion | null;
  sabqi: PortionSuggestion | null;
  manzil: PortionSuggestion | null;
  last_class: {
    id: number;
    date: string;
    day: string;
  } | null;
}

export async function getSuggestedPortions(studentId: number): Promise<SuggestedPortions> {
  const res = await authFetch(`${API_BASE}/students/${studentId}/suggested-portions`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get suggestions');
  }
  return res.json();
}

// ============ TEACHERS (for students) ============

export async function getMyTeachers(): Promise<TeacherListItem[]> {
  const res = await authFetch(`${API_BASE}/teachers`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to fetch teachers');
  }
  return res.json();
}

// ============ QURAN ============

export async function getSurahs() {
  const res = await fetch(`${API_BASE}/surahs`);
  const data = await res.json();
  return data.data;
}

export async function getSurah(surahNumber: number) {
  const res = await fetch(`${API_BASE}/surahs/${surahNumber}`);
  const data = await res.json();
  return data.data;
}

// QPC word data for a page (code_v1, line_number, etc.)
export interface QuranPageWord {
  id: number;
  s: number;    // surah
  a: number;    // ayah
  p: number;    // position in ayah
  t: string;    // text_uthmani
  c1: string;   // code_v1 (QPC glyph)
  c2: string;   // code_v2
  l: number;    // line_number (1-15)
  ct: string;   // char_type ('word' | 'end')
}

export async function getQuranPageWords(pageNumber: number): Promise<QuranPageWord[]> {
  const res = await fetch(`${API_BASE}/quran/page/${pageNumber}`);
  const data = await res.json();
  return data.data;
}

// ============ CLASSES ============

export interface ClassStudent {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  performance?: string;  // Per-student performance for this class
}

export interface ClassAssignment {
  id: number;
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  student_id?: number;  // Which student this assignment is for (null = all students)
}

export interface ClassData {
  id: number;
  date: string;
  day: string;
  notes?: string;
  performance?: string;
  teacher_id: number;
  is_published: boolean;
  class_type: 'regular' | 'test';  // Class type
  assignments: ClassAssignment[];
  students?: ClassStudent[];  // Only included for teachers
}

export async function getClasses(role?: 'teacher' | 'student'): Promise<ClassData[]> {
  const url = role ? `${API_BASE}/classes?role=${role}` : `${API_BASE}/classes`;
  const res = await authFetch(url);
  const data = await res.json();
  return data.data;
}

export async function getClass(classId: number): Promise<ClassData> {
  const res = await authFetch(`${API_BASE}/classes/${classId}`);
  const data = await res.json();
  return data.data;
}

export async function createClass(classData: {
  date: string;
  day: string;
  notes?: string;
  student_ids: number[];  // List of student user IDs
  class_type?: 'regular' | 'test';  // Class type (defaults to 'regular')
  assignments: {
    type: string;
    start_surah: number;
    end_surah: number;
    start_ayah?: number;
    end_ayah?: number;
    student_id?: number;  // Which student this assignment is for (null = all students)
  }[];
}): Promise<{ id: number; message: string; test_id?: number }> {
  const res = await authFetch(`${API_BASE}/classes`, {
    method: 'POST',
    body: JSON.stringify(classData),
  });
  return res.json();
}

export async function deleteClass(classId: number) {
  const res = await authFetch(`${API_BASE}/classes/${classId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updateClassNotes(classId: number, notes: string | null) {
  const res = await authFetch(`${API_BASE}/classes/${classId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function updateClassPerformance(classId: number, performance: string) {
  const res = await authFetch(`${API_BASE}/classes/${classId}/performance`, {
    method: 'PATCH',
    body: JSON.stringify({ performance }),
  });
  return res.json();
}

export async function updateStudentPerformance(classId: number, studentId: number, performance: string) {
  const res = await authFetch(`${API_BASE}/classes/${classId}/student-performance`, {
    method: 'PATCH',
    body: JSON.stringify({ student_id: studentId, performance }),
  });
  return res.json();
}

export async function updateClassPublish(classId: number, isPublished: boolean) {
  const res = await authFetch(`${API_BASE}/classes/${classId}/publish`, {
    method: 'PATCH',
    body: JSON.stringify({ is_published: isPublished }),
  });
  return res.json();
}

export async function addClassStudents(classId: number, studentIds: number[]) {
  const res = await authFetch(`${API_BASE}/classes/${classId}/students`, {
    method: 'POST',
    body: JSON.stringify(studentIds),
  });
  return res.json();
}

export async function removeClassStudent(classId: number, studentId: number) {
  const res = await authFetch(`${API_BASE}/classes/${classId}/students/${studentId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function addClassAssignments(classId: number, assignments: Array<{
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  student_id?: number;  // Which student this assignment is for (null = all students)
}>) {
  const res = await authFetch(`${API_BASE}/classes/${classId}/assignments`, {
    method: 'POST',
    body: JSON.stringify(assignments),
  });
  return res.json();
}

export async function updateAssignment(assignmentId: number, assignment: {
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
}) {
  const res = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignment),
  });
  return res.json();
}

// ============ MISTAKES ============

export interface MistakeData {
  id: number;
  student_id: number;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  error_count: number;
}

// For teachers: pass studentId to view a specific student's mistakes
// For students: studentId is ignored, they see their own mistakes
export async function getMistakes(surahNumber?: number, studentId?: number): Promise<MistakeData[]> {
  const params = new URLSearchParams();
  if (surahNumber) params.append('surah', surahNumber.toString());
  if (studentId) params.append('student_id', studentId.toString());

  const url = params.toString()
    ? `${API_BASE}/mistakes?${params.toString()}`
    : `${API_BASE}/mistakes`;
  const res = await authFetch(url);
  const data = await res.json();
  return data.data;
}

export async function getMistakesWithOccurrences(surahNumber?: number, studentId?: number) {
  const params = new URLSearchParams();
  if (surahNumber) params.append('surah', surahNumber.toString());
  if (studentId) params.append('student_id', studentId.toString());

  const url = params.toString()
    ? `${API_BASE}/mistakes/with-occurrences?${params.toString()}`
    : `${API_BASE}/mistakes/with-occurrences`;
  const res = await authFetch(url);
  const data = await res.json();
  return data.data;
}

// Record a mistake - teachers must specify student_id, students can omit (uses self)
export async function addMistake(mistake: {
  student_id?: number;  // Required for teachers, optional for students (uses self)
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  class_id?: number;
}) {
  const res = await authFetch(`${API_BASE}/mistakes`, {
    method: 'POST',
    body: JSON.stringify(mistake),
  });
  return res.json();
}

export async function removeMistake(mistakeId: number) {
  const res = await authFetch(`${API_BASE}/mistakes/${mistakeId}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ============ STATS ============

export async function getStats(role?: 'teacher' | 'student') {
  const url = role ? `${API_BASE}/stats?role=${role}` : `${API_BASE}/stats`;
  const res = await authFetch(url);
  return res.json();
}

// ============ BACKUP ============

export async function createBackup() {
  const res = await fetch(`${API_BASE}/backup/create`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to create backup');
  return res.json();
}

export async function listBackups() {
  const res = await fetch(`${API_BASE}/backup/list`);
  if (!res.ok) throw new Error('Failed to list backups');
  return res.json();
}

export async function restoreBackup(filename: string) {
  const res = await fetch(`${API_BASE}/backup/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to restore backup');
  }

  return res.json();
}

// ============ TESTS ============

export interface TestQuestion {
  id: number;
  test_id: number;
  question_number: number;
  start_surah?: number;
  start_ayah?: number;
  end_surah?: number;
  end_ayah?: number;
  points_earned?: number;
  points_possible?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  mistakes?: TestMistake[];
}

export interface TestMistake {
  id: number;
  test_id: number;
  question_id: number;
  mistake_id?: number;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  is_tanbeeh: number;  // 0 or 1 from SQLite
  is_repeated: number;  // 0 or 1 from SQLite
  previous_error_count: number;
  points_deducted: number;
  created_at: string;
  question_number?: number;
}

export interface TestData {
  id: number;
  class_id: number;
  student_id: number;
  total_score?: number;
  max_score: number;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
  questions: TestQuestion[];
  student?: {
    id: number;
    student_id: string;
    first_name: string;
    last_name: string;
  };
  date?: string;
  day?: string;
}

export async function getTest(testId: number): Promise<TestData> {
  const res = await authFetch(`${API_BASE}/tests/${testId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get test');
  }
  const data = await res.json();
  return data.data;
}

export async function getTestByClass(classId: number): Promise<TestData> {
  const res = await authFetch(`${API_BASE}/classes/${classId}/test`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get test for class');
  }
  const data = await res.json();
  return data.data;
}

export async function startTest(testId: number): Promise<{ message: string; started_at: string }> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/start`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to start test');
  }
  return res.json();
}

export async function completeTest(testId: number): Promise<{
  message: string;
  total_score: number;
  max_score: number;
  completed_at: string;
}> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/complete`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to complete test');
  }
  return res.json();
}

export async function startQuestion(testId: number, startSurah: number, startAyah: number): Promise<TestQuestion> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/questions/start`, {
    method: 'POST',
    body: JSON.stringify({ start_surah: startSurah, start_ayah: startAyah }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to start question');
  }
  return res.json();
}

export async function endQuestion(
  testId: number,
  questionId: number,
  endSurah: number,
  endAyah: number
): Promise<{
  id: number;
  status: string;
  end_surah: number;
  end_ayah: number;
  points_earned: number;
  points_possible: number;
  total_deducted: number;
  completed_at: string;
}> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/questions/${questionId}/end`, {
    method: 'PATCH',
    body: JSON.stringify({ end_surah: endSurah, end_ayah: endAyah }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to end question');
  }
  return res.json();
}

export async function cancelQuestion(testId: number, questionId: number): Promise<{ message: string; id: number }> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/questions/${questionId}/cancel`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to cancel question');
  }
  return res.json();
}

export async function addTestMistake(testId: number, mistake: {
  question_id: number;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  is_tanbeeh?: boolean;  // True = warning (0.5 pts), False = full mistake (1+ pts)
}): Promise<{
  id: number;
  mistake_id: number;
  is_tanbeeh: boolean;
  is_repeated: boolean;
  previous_error_count: number;
  points_deducted: number;
}> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/mistakes`, {
    method: 'POST',
    body: JSON.stringify(mistake),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to add test mistake');
  }
  return res.json();
}

export async function removeTestMistake(testId: number, testMistakeId: number): Promise<{ message: string }> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/mistakes/${testMistakeId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to remove test mistake');
  }
  return res.json();
}

export async function getTestResults(testId: number): Promise<TestData> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/results`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get test results');
  }
  const data = await res.json();
  return data.data;
}

export async function getTestMistakes(testId: number): Promise<TestMistake[]> {
  const res = await authFetch(`${API_BASE}/tests/${testId}/mistakes`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get test mistakes');
  }
  const data = await res.json();
  return data.data;
}

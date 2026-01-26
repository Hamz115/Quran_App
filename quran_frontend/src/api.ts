// API Facade for QuranTrack
// Re-exports from Supabase and local Quran API modules
// Some functions still use FastAPI (tests, backup) until migrated

// Re-export types
export type { StudentListItem, TeacherListItem, StudentLookup, User } from './types';

// Re-export Supabase API functions
export {
  getMyStudents,
  lookupStudent,
  addStudent,
  removeStudent,
  getMyTeachers,
  getClasses,
  getClass,
  createClass,
  deleteClass,
  updateClassNotes,
  updateClassPerformance,
  updateClassPublish,
  updateStudentPerformance,
  addClassStudents,
  removeClassStudent,
  getMistakes,
  getMistakesWithOccurrences,
  addMistake,
  removeMistake,
  getStats,
  getSuggestedPortions,
} from './lib/supabase-api';

export type {
  ClassData,
  ClassStudent,
  ClassAssignment,
  MistakeData,
  SuggestedPortions,
  SuggestedPortion,
} from './lib/supabase-api';

// Re-export Quran API functions (local FastAPI)
export {
  getSurahs,
  getSurah,
  getQuranPageWords,
} from './lib/quran-api';

export type { QuranPageWord, Surah } from './lib/quran-api';

// ============ LEGACY FastAPI functions (to be migrated) ============

const API_BASE = 'http://localhost:8000/api';

// Token management is no longer needed (Supabase handles it)
// These are kept for backward compatibility but are no-ops
export function setTokens(_access: string, _refresh: string) {
  console.warn('setTokens is deprecated - Supabase handles token management');
}

export function clearTokens() {
  console.warn('clearTokens is deprecated - Supabase handles token management');
}

export function getAccessToken() {
  console.warn('getAccessToken is deprecated - Supabase handles token management');
  return null;
}

// Auth functions are now in AuthContext using Supabase
// These are kept for backward compatibility
export async function signup(_data: any) {
  throw new Error('Use AuthContext.signup() instead');
}

export async function login(_identifier: string, _password: string) {
  throw new Error('Use AuthContext.login() instead');
}

export async function refreshTokens() {
  console.warn('refreshTokens is deprecated - Supabase handles token refresh');
  return false;
}

export async function logout() {
  throw new Error('Use AuthContext.logout() instead');
}

export async function getCurrentUser() {
  throw new Error('Use AuthContext.user instead');
}

export async function requestVerification() {
  console.warn('requestVerification not yet implemented with Supabase');
  return { message: 'Not implemented' };
}

export async function verifyEmail(_token: string) {
  console.warn('verifyEmail not yet implemented with Supabase');
  return { message: 'Not implemented' };
}

// ============ ASSIGNMENTS (update) ============

export async function updateAssignment(assignmentId: string, assignment: {
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

export async function addClassAssignments(classId: string, assignments: Array<{
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  student_id?: string;
}>) {
  const res = await fetch(`${API_BASE}/classes/${classId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignments),
  });
  return res.json();
}


// ============ BACKUP (still FastAPI) ============

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

// ============ TESTS (still FastAPI - complex logic) ============

export interface TestQuestion {
  id: string;
  test_id: string;
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
  id: string;
  test_id: string;
  question_id: string;
  mistake_id?: string;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  is_tanbeeh: number;
  is_repeated: number;
  previous_error_count: number;
  points_deducted: number;
  created_at: string;
  question_number?: number;
}

export interface TestData {
  id: string;
  class_id: string;
  student_id: string;
  total_score?: number;
  max_score: number;
  status: 'not_started' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
  questions: TestQuestion[];
  student?: {
    id: string;
    student_id: string;
    first_name: string;
    last_name: string;
  };
  date?: string;
  day?: string;
}

export async function getTest(testId: string): Promise<TestData> {
  const res = await fetch(`${API_BASE}/tests/${testId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get test');
  }
  const data = await res.json();
  return data.data;
}

export async function getTestByClass(classId: string): Promise<TestData> {
  const res = await fetch(`${API_BASE}/classes/${classId}/test`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get test for class');
  }
  const data = await res.json();
  return data.data;
}

export async function startTest(testId: string): Promise<{ message: string; started_at: string }> {
  const res = await fetch(`${API_BASE}/tests/${testId}/start`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to start test');
  }
  return res.json();
}

export async function completeTest(testId: string): Promise<{
  message: string;
  total_score: number;
  max_score: number;
  completed_at: string;
}> {
  const res = await fetch(`${API_BASE}/tests/${testId}/complete`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to complete test');
  }
  return res.json();
}

export async function startQuestion(testId: string, startSurah: number, startAyah: number): Promise<TestQuestion> {
  const res = await fetch(`${API_BASE}/tests/${testId}/questions/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ start_surah: startSurah, start_ayah: startAyah }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to start question');
  }
  return res.json();
}

export async function endQuestion(
  testId: string,
  questionId: string,
  endSurah: number,
  endAyah: number
): Promise<{
  id: string;
  status: string;
  end_surah: number;
  end_ayah: number;
  points_earned: number;
  points_possible: number;
  total_deducted: number;
  completed_at: string;
}> {
  const res = await fetch(`${API_BASE}/tests/${testId}/questions/${questionId}/end`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ end_surah: endSurah, end_ayah: endAyah }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to end question');
  }
  return res.json();
}

export async function cancelQuestion(testId: string, questionId: string): Promise<{ message: string; id: string }> {
  const res = await fetch(`${API_BASE}/tests/${testId}/questions/${questionId}/cancel`, {
    method: 'PATCH',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to cancel question');
  }
  return res.json();
}

export async function addTestMistake(testId: string, mistake: {
  question_id: string;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  is_tanbeeh?: boolean;
}): Promise<{
  id: string;
  mistake_id: string;
  is_tanbeeh: boolean;
  is_repeated: boolean;
  previous_error_count: number;
  points_deducted: number;
}> {
  const res = await fetch(`${API_BASE}/tests/${testId}/mistakes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mistake),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to add test mistake');
  }
  return res.json();
}

export async function removeTestMistake(testId: string, testMistakeId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/tests/${testId}/mistakes/${testMistakeId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to remove test mistake');
  }
  return res.json();
}

export async function getTestResults(testId: string): Promise<TestData> {
  const res = await fetch(`${API_BASE}/tests/${testId}/results`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get test results');
  }
  const data = await res.json();
  return data.data;
}

export async function getTestMistakes(testId: string): Promise<TestMistake[]> {
  const res = await fetch(`${API_BASE}/tests/${testId}/mistakes`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to get test mistakes');
  }
  const data = await res.json();
  return data.data;
}

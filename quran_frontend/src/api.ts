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

// Export placeholder (test feature removed)
export {};

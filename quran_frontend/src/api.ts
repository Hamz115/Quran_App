/**
 * API Facade for QuranTrack — Local-First Architecture
 *
 * Routes data operations through local FastAPI sidecar when available (Tauri desktop),
 * falls back to Supabase for pure web (no sidecar).
 *
 * Local path:  Frontend -> FastAPI -> app.db (instant) -> Supabase (background sync)
 * Web path:    Frontend -> Supabase (direct, 200-400ms)
 *
 * Cross-device operations (students, auth) always go through Supabase.
 */

// Re-export types (new names + legacy aliases)
export type { ContactListItem, ContactLookup, User } from './types';
export type { StudentListItem, TeacherListItem, StudentLookup } from './types';

// Re-export types from supabase-api (needed by consumers)
export type {
  ClassData,
  ClassStudent,
  ClassAssignment,
  MistakeData,
  MistakeWithOccurrences,
  SuggestedPortions,
  SuggestedPortion,
} from './lib/supabase-api';

// Import Supabase functions (used as fallback and for cross-device ops)
import {
  getClasses as getSupabaseClasses,
  getClass as getSupabaseClass,
  createClass as createSupabaseClass,
  deleteClass as deleteSupabaseClass,
  updateClassNotes as updateSupabaseClassNotes,
  updateClassPerformance as updateSupabaseClassPerformance,
  updateClassPublish as updateSupabaseClassPublish,
  updateStudentPerformance as updateSupabaseStudentPerformance,
  addClassStudents as addSupabaseClassStudents,
  removeClassStudent as removeSupabaseClassStudent,
  getMistakes as getSupabaseMistakes,
  getMistakesWithOccurrences as getSupabaseMistakesWithOccurrences,
  addMistake as addSupabaseMistake,
  removeMistake as removeSupabaseMistake,
} from './lib/supabase-api';

// Import local API functions
import {
  isLocalApiAvailable,
  createLocalClass,
  getLocalClasses,
  getLocalClass,
  deleteLocalClass,
  updateLocalClassNotes,
  updateLocalClassPerformance,
  addLocalMistake,
  getLocalMistakes,
  getLocalMistakesWithOccurrences,
  removeLocalMistake,
} from './lib/local-api';

// Re-export local API utilities for direct access
export { isLocalApiAvailable, triggerSync } from './lib/local-api';
export type { SyncStatus } from './lib/local-api';

// ============ CROSS-DEVICE OPS (always Supabase) ============

export {
  // New names
  getMyContacts,
  lookupContact,
  addContact,
  removeContact,
  getMyListeners,
  // Legacy aliases
  getMyStudents,
  lookupStudent,
  addStudent,
  removeStudent,
  getMyTeachers,
  // Unchanged
  getStats,
  getSuggestedPortions,
  getStudentReport,
} from './lib/supabase-api';

// ============ ROUTED OPERATIONS (local-first when sidecar available) ============

/**
 * Get classes — local sidecar first, Supabase fallback.
 * Falls back to Supabase if local returns empty (DB may not be synced yet).
 */
export async function getClasses(view?: 'listener' | 'reciter' | 'teacher' | 'student') {
  // Map legacy role to view
  const mappedView = view === 'teacher' ? 'listener' : view === 'student' ? 'reciter' : view;
  if (await isLocalApiAvailable()) {
    try {
      const localResult = await getLocalClasses(mappedView as 'listener' | 'reciter' | 'all' | undefined);
      if (Array.isArray(localResult) && localResult.length > 0) {
        return localResult;
      }
      console.log('[local-first] getClasses local returned empty, trying Supabase');
    } catch (err) {
      console.warn('[local-first] getClasses local failed, falling back to Supabase:', err);
    }
  }
  return getSupabaseClasses(view);
}

/**
 * Get single class — local sidecar first, Supabase fallback
 */
export async function getClass(classId: string) {
  if (await isLocalApiAvailable()) {
    try {
      return await getLocalClass(classId);
    } catch (err) {
      console.warn('[local-first] getClass local failed, falling back to Supabase:', err);
    }
  }
  return getSupabaseClass(classId);
}

/**
 * Create class — local sidecar first, Supabase fallback
 */
export async function createClass(classData: {
  date: string;
  day: string;
  notes?: string;
  student_ids: string[];
  assignments: {
    type: string;
    start_surah: number;
    end_surah: number;
    start_ayah?: number;
    end_ayah?: number;
    student_id?: string;
  }[];
}) {
  if (await isLocalApiAvailable()) {
    try {
      return await createLocalClass(classData);
    } catch (err) {
      console.warn('[local-first] createClass local failed, falling back to Supabase:', err);
    }
  }
  return createSupabaseClass(classData);
}

/**
 * Delete class — local sidecar first (instant), Supabase fallback
 */
export async function deleteClass(classId: string) {
  if (await isLocalApiAvailable()) {
    try {
      return await deleteLocalClass(classId);
    } catch (err) {
      console.warn('[local-first] deleteClass local failed, falling back to Supabase:', err);
    }
  }
  return deleteSupabaseClass(classId);
}

/**
 * Update class notes — local sidecar first, Supabase fallback
 */
export async function updateClassNotes(classId: string, notes: string | null) {
  if (await isLocalApiAvailable()) {
    try {
      return await updateLocalClassNotes(classId, notes);
    } catch (err) {
      console.warn('[local-first] updateClassNotes local failed, falling back to Supabase:', err);
    }
  }
  return updateSupabaseClassNotes(classId, notes);
}

/**
 * Update class performance — local sidecar first, Supabase fallback
 */
export async function updateClassPerformance(classId: string, performance: string) {
  if (await isLocalApiAvailable()) {
    try {
      return await updateLocalClassPerformance(classId, performance);
    } catch (err) {
      console.warn('[local-first] updateClassPerformance local failed, falling back to Supabase:', err);
    }
  }
  return updateSupabaseClassPerformance(classId, performance);
}

/**
 * Update class publish status — always Supabase (affects student visibility cross-device)
 */
export async function updateClassPublish(classId: string, isPublished: boolean) {
  return updateSupabaseClassPublish(classId, isPublished);
}

/**
 * Update student performance — always Supabase
 */
export async function updateStudentPerformance(classId: string, studentId: string, performance: string) {
  return updateSupabaseStudentPerformance(classId, studentId, performance);
}

/**
 * Add students to class — always Supabase (cross-device)
 */
export async function addClassStudents(classId: string, studentIds: string[]) {
  return addSupabaseClassStudents(classId, studentIds);
}

/**
 * Remove student from class — always Supabase (cross-device)
 */
export async function removeClassStudent(classId: string, studentId: string) {
  return removeSupabaseClassStudent(classId, studentId);
}

/**
 * Get mistakes — local sidecar first, Supabase fallback.
 * Falls back to Supabase if local returns empty (DB may not be synced yet).
 */
export async function getMistakes(surahNumber?: number, studentId?: string) {
  if (await isLocalApiAvailable()) {
    try {
      const localResult = await getLocalMistakes(surahNumber, studentId);
      if (Array.isArray(localResult) && localResult.length > 0) {
        return localResult;
      }
      console.log('[local-first] getMistakes local returned empty, trying Supabase');
    } catch (err) {
      console.warn('[local-first] getMistakes local failed, falling back to Supabase:', err);
    }
  }
  return getSupabaseMistakes(surahNumber, studentId);
}

/**
 * Get mistakes with occurrences — local sidecar first, Supabase fallback.
 * Falls back to Supabase if local returns empty (DB may not be synced yet).
 */
export async function getMistakesWithOccurrences(surahNumber?: number, studentId?: string) {
  if (await isLocalApiAvailable()) {
    try {
      const localResult = await getLocalMistakesWithOccurrences(surahNumber, studentId);
      if (Array.isArray(localResult) && localResult.length > 0) {
        return localResult;
      }
      console.log('[local-first] getMistakesWithOccurrences local returned empty, trying Supabase');
    } catch (err) {
      console.warn('[local-first] getMistakesWithOccurrences local failed, falling back to Supabase:', err);
    }
  }
  return getSupabaseMistakesWithOccurrences(surahNumber, studentId);
}

/**
 * Add mistake — local sidecar first (INSTANT), Supabase fallback
 * This is the most critical operation for latency — marking mistakes during live recitation.
 */
export async function addMistake(mistake: {
  student_id?: string;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  class_id?: string;
}) {
  if (await isLocalApiAvailable()) {
    try {
      return await addLocalMistake(mistake);
    } catch (err) {
      console.warn('[local-first] addMistake local failed, falling back to Supabase:', err);
    }
  }
  return addSupabaseMistake(mistake);
}

/**
 * Remove mistake — local sidecar first, Supabase fallback
 */
export async function removeMistake(mistakeId: string) {
  if (await isLocalApiAvailable()) {
    try {
      return await removeLocalMistake(mistakeId);
    } catch (err) {
      console.warn('[local-first] removeMistake local failed, falling back to Supabase:', err);
    }
  }
  return removeSupabaseMistake(mistakeId);
}

// ============ ASSIGNMENTS (always Supabase for now) ============
export { updateAssignment, addClassAssignments, deleteAssignment } from './lib/supabase-api';

// Re-export Quran API functions (local FastAPI for Quran data)
export {
  getSurahs,
  getSurah,
  getQuranPage,
} from './lib/quran-api';

export type { QuranPageWord, QuranPageLine, QuranPageData, Surah } from './lib/quran-api';

// ============ LEGACY FastAPI functions (backward compatibility) ============

const API_BASE = 'http://localhost:8000/api';

// Token management is no longer needed (Supabase handles it)
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

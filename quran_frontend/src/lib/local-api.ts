/**
 * Local-First API for QuranTrack
 *
 * Calls FastAPI backend which writes to local app.db first (instant),
 * then syncs to Supabase in background.
 *
 * All functions return data in the SAME SHAPE as supabase-api.ts,
 * so the UI can't tell which source is being used.
 *
 * Flow:
 * 1. Frontend -> FastAPI -> app.db (instant response)
 * 2. FastAPI -> Supabase (background sync)
 */

import { supabase } from './supabase';
import type { ClassData, MistakeData, MistakeWithOccurrences } from './supabase-api';

// FastAPI backend URL
const API_BASE = 'http://localhost:8000';

// ============ HEALTH CHECK (with caching) ============

let _localApiAvailable: boolean | null = null;
let _lastCheck = 0;
const CHECK_INTERVAL_MS = 30_000; // Re-check every 30 seconds

/**
 * Check if local FastAPI sidecar is available.
 * Result is cached for 30 seconds to avoid checking on every call.
 */
export async function isLocalApiAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_localApiAvailable !== null && now - _lastCheck < CHECK_INTERVAL_MS) {
    return _localApiAvailable;
  }

  try {
    const response = await fetch(`${API_BASE}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(1000),
    });
    _localApiAvailable = response.ok;
  } catch {
    _localApiAvailable = false;
  }

  _lastCheck = now;
  return _localApiAvailable;
}

/** Force re-check on next call (e.g., after an error) */
export function invalidateLocalApiCheck(): void {
  _localApiAvailable = null;
  _lastCheck = 0;
}

// ============ INTERNAL HELPERS ============

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  return response.json();
}

// ============ SYNC ============

export interface SyncStatus {
  pending: { classes: number; mistakes: number };
  errors: { classes: number; mistakes: number };
  synced: boolean;
}

export async function triggerSync(): Promise<{ message: string; user_id: string; role: string }> {
  return apiCall('/api/sync', { method: 'POST' });
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return apiCall('/api/sync/status');
}

// ============ CLASSES (Local-First) ============

/**
 * Create class via local FastAPI sidecar.
 * Returns same shape as Supabase createClass: { id: string; message: string }
 */
export async function createLocalClass(classData: {
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
}): Promise<{ id: string; message: string }> {
  return apiCall('/api/local/classes', {
    method: 'POST',
    body: JSON.stringify(classData),
  });
}

/**
 * Get classes from local FastAPI sidecar.
 * Returns same shape as Supabase getClasses: ClassData[]
 */
export async function getLocalClasses(view?: 'listener' | 'reciter' | 'all'): Promise<ClassData[]> {
  const params = view ? `?view=${view}` : '';
  return apiCall(`/api/local/classes${params}`);
}

/**
 * Get single class from local FastAPI sidecar.
 * Returns same shape as Supabase getClass: ClassData with students + assignments.
 */
export async function getLocalClass(classId: string): Promise<ClassData> {
  return apiCall(`/api/local/classes/${classId}`);
}

/**
 * Update class notes via local FastAPI sidecar.
 * Returns same shape as Supabase updateClassNotes.
 */
export async function updateLocalClassNotes(classId: string, notes: string | null): Promise<{ message: string }> {
  return apiCall(`/api/local/classes/${classId}/notes`, {
    method: 'PUT',
    body: JSON.stringify({ notes }),
  });
}

/**
 * Update class performance via local FastAPI sidecar.
 * Returns same shape as Supabase updateClassPerformance.
 */
export async function updateLocalClassPerformance(classId: string, performance: string): Promise<{ message: string }> {
  return apiCall(`/api/local/classes/${classId}/performance`, {
    method: 'PUT',
    body: JSON.stringify({ performance }),
  });
}

/**
 * Mirror a canonical per-reciter performance update into local app.db.
 */
export async function updateLocalStudentPerformance(
  classId: string,
  studentId: string,
  performance: string,
): Promise<{ message: string }> {
  return apiCall(`/api/local/classes/${classId}/student-performance`, {
    method: 'PUT',
    body: JSON.stringify({ student_id: studentId, performance }),
  });
}

/**
 * Delete class via local FastAPI sidecar.
 * Returns same shape as Supabase deleteClass: { message: string }
 */
export async function deleteLocalClass(classId: string): Promise<{ message: string }> {
  return apiCall(`/api/local/classes/${classId}`, {
    method: 'DELETE',
  });
}

// ============ MISTAKES (Local-First) ============

/**
 * Add mistake via local FastAPI sidecar.
 * Returns same shape as Supabase addMistake: { id: string; error_count: number }
 */
export async function addLocalMistake(mistake: {
  student_id?: string;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  class_id?: string;
}): Promise<{ id: string; error_count: number }> {
  return apiCall('/api/local/mistakes', {
    method: 'POST',
    body: JSON.stringify(mistake),
  });
}

/**
 * Get mistakes from local FastAPI sidecar.
 * Returns same shape as Supabase getMistakes: MistakeData[]
 */
export async function getLocalMistakes(surahNumber?: number, studentId?: string): Promise<MistakeData[]> {
  const params = new URLSearchParams();
  if (surahNumber) params.set('surah_number', String(surahNumber));
  if (studentId) params.set('student_id', studentId);
  const qs = params.toString();
  return apiCall(`/api/local/mistakes${qs ? '?' + qs : ''}`);
}

/**
 * Get mistakes with occurrences from local FastAPI sidecar.
 * Returns same shape as Supabase getMistakesWithOccurrences: MistakeWithOccurrences[]
 */
export async function getLocalMistakesWithOccurrences(surahNumber?: number, studentId?: string): Promise<MistakeWithOccurrences[]> {
  const params = new URLSearchParams();
  if (surahNumber) params.set('surah_number', String(surahNumber));
  if (studentId) params.set('student_id', studentId);
  const qs = params.toString();
  return apiCall(`/api/local/mistakes/with-occurrences${qs ? '?' + qs : ''}`);
}

/**
 * Remove mistake via local FastAPI sidecar.
 * Returns same shape as Supabase removeMistake: { message: string }
 */
export async function removeLocalMistake(mistakeId: string): Promise<{ message: string }> {
  return apiCall(`/api/local/mistakes/${mistakeId}`, {
    method: 'DELETE',
  });
}

/**
 * Local-First API for QuranTrack
 *
 * Calls FastAPI backend which writes to local app.db first (instant),
 * then syncs to Supabase in background.
 *
 * Flow:
 * 1. Frontend → FastAPI → app.db (instant response)
 * 2. FastAPI → Supabase (background sync)
 */

import { supabase } from './supabase';

// FastAPI backend URL
const API_BASE = 'http://localhost:8000';

// Get Supabase JWT token for auth
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

// Helper for API calls
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

export async function triggerSync(role?: 'teacher' | 'student'): Promise<{ message: string; user_id: string; role: string }> {
  const params = role ? `?role=${role}` : '';
  return apiCall(`/api/sync${params}`, { method: 'POST' });
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return apiCall('/api/sync/status');
}

export async function pushToCloud(): Promise<{ message: string; results: unknown }> {
  return apiCall('/api/sync/push', { method: 'POST' });
}

export async function pullFromCloud(since?: string): Promise<{ message: string; results: unknown }> {
  const params = since ? `?since=${encodeURIComponent(since)}` : '';
  return apiCall(`/api/sync/pull${params}`, { method: 'POST' });
}

// ============ CLASSES (Local-First) ============

export interface LocalClassCreate {
  date: string;
  day: string;
  notes?: string;
  student_ids?: string[];
  assignments: {
    type: string;
    start_surah: number;
    end_surah: number;
    start_ayah?: number;
    end_ayah?: number;
    student_id?: string;
  }[];
}

export interface LocalClass {
  id: number;
  date: string;
  day: string;
  notes?: string;
  performance?: string;
  is_published: boolean;
  supabase_id?: string;
  sync_status: 'pending' | 'synced' | 'error';
  assignments: {
    id: number;
    type: string;
    start_surah: number;
    end_surah: number;
    start_ayah?: number;
    end_ayah?: number;
    student_id?: number;
    sync_status: string;
  }[];
}

export async function createLocalClass(
  classData: LocalClassCreate
): Promise<{ id: number; message: string; sync_status: string }> {
  return apiCall('/api/local/classes', {
    method: 'POST',
    body: JSON.stringify(classData),
  });
}

export async function getLocalClasses(role?: 'teacher' | 'student'): Promise<{ data: LocalClass[] }> {
  const params = role ? `?role=${role}` : '';
  return apiCall(`/api/local/classes${params}`);
}

// ============ MISTAKES (Local-First) ============

export interface LocalMistakeCreate {
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  class_id?: number;
}

export interface LocalMistake {
  id: number;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  error_count: number;
  supabase_id?: string;
  sync_status: 'pending' | 'synced' | 'error';
}

export async function addLocalMistake(
  mistake: LocalMistakeCreate
): Promise<{ id: number; error_count: number; sync_status: string }> {
  return apiCall('/api/local/mistakes', {
    method: 'POST',
    body: JSON.stringify(mistake),
  });
}

export async function getLocalMistakes(surahNumber?: number): Promise<{ data: LocalMistake[] }> {
  const params = surahNumber ? `?surah_number=${surahNumber}` : '';
  return apiCall(`/api/local/mistakes${params}`);
}

// ============ HYBRID API ============

/**
 * Get classes - tries local first, falls back to Supabase
 */
export async function getClassesHybrid(role?: 'teacher' | 'student'): Promise<LocalClass[]> {
  try {
    // Try local API first (instant)
    const local = await getLocalClasses(role);
    return local.data;
  } catch (err) {
    console.warn('Local API failed, falling back to Supabase cache:', err);
    // Fall back to Supabase via cached API
    const { getClasses } = await import('./supabase-api');
    const supabaseClasses = await getClasses(role);
    // Map to local format
    return supabaseClasses.map(c => ({
      id: parseInt(c.id) || 0,
      date: c.date,
      day: c.day,
      notes: c.notes,
      performance: c.performance,
      is_published: c.is_published,
      supabase_id: c.id,
      sync_status: 'synced' as const,
      assignments: c.assignments.map(a => ({
        id: parseInt(a.id) || 0,
        type: a.type,
        start_surah: a.start_surah,
        end_surah: a.end_surah,
        start_ayah: a.start_ayah,
        end_ayah: a.end_ayah,
        sync_status: 'synced',
      })),
    }));
  }
}

/**
 * Check if local API is available
 */
export async function isLocalApiAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/surahs`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

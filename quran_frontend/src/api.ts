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

// ============ CLASSES ============

export async function getClasses() {
  const res = await fetch(`${API_BASE}/classes`);
  const data = await res.json();
  return data.data;
}

export async function getClass(classId: number) {
  const res = await fetch(`${API_BASE}/classes/${classId}`);
  const data = await res.json();
  return data.data;
}

export async function createClass(classData: {
  date: string;
  day: string;
  notes?: string;
  assignments: {
    type: string;
    start_surah: number;
    end_surah: number;
    start_ayah?: number;
    end_ayah?: number;
  }[];
}) {
  const res = await fetch(`${API_BASE}/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(classData),
  });
  return res.json();
}

export async function deleteClass(classId: number) {
  const res = await fetch(`${API_BASE}/classes/${classId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function updateClassNotes(classId: number, notes: string | null) {
  const res = await fetch(`${API_BASE}/classes/${classId}/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return res.json();
}

export async function updateClassPerformance(classId: number, performance: string) {
  const res = await fetch(`${API_BASE}/classes/${classId}/performance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ performance }),
  });
  return res.json();
}

export async function addClassAssignments(classId: number, assignments: Array<{
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
}>) {
  const res = await fetch(`${API_BASE}/classes/${classId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

export async function getMistakes(surahNumber?: number) {
  const url = surahNumber
    ? `${API_BASE}/mistakes?surah=${surahNumber}`
    : `${API_BASE}/mistakes`;
  const res = await fetch(url);
  const data = await res.json();
  return data.data;
}

export async function getMistakesWithOccurrences(surahNumber?: number) {
  const url = surahNumber
    ? `${API_BASE}/mistakes/with-occurrences?surah=${surahNumber}`
    : `${API_BASE}/mistakes/with-occurrences`;
  const res = await fetch(url);
  const data = await res.json();
  return data.data;
}

export async function addMistake(mistake: {
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  class_id?: number;
}) {
  const res = await fetch(`${API_BASE}/mistakes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mistake),
  });
  return res.json();
}

export async function removeMistake(mistakeId: number) {
  const res = await fetch(`${API_BASE}/mistakes/${mistakeId}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ============ STATS ============

export async function getStats() {
  const res = await fetch(`${API_BASE}/stats`);
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

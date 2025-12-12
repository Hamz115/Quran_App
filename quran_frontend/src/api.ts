const API_BASE = 'http://localhost:8000/api';

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

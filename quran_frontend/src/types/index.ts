// Type definitions for QuranTrack
// IDs are strings (UUIDs) for Supabase entities, numbers for local Quran data

export interface Student {
  id: string;  // UUID
  name: string;
  createdAt: string;
}

export interface Assignment {
  id: string;  // UUID
  sessionId: string;
  type: 'hifz' | 'sabqi' | 'revision';
  startSurah: number;
  endSurah: number;
  startAyah?: number;
  endAyah?: number;
}

export interface Session {
  id: string;  // UUID
  studentId: string;
  date: string;
  day: string;
  notes: string;
  assignments: Assignment[];
}

export interface Mistake {
  id: string;  // UUID
  studentId: string;
  surahNumber: number;
  ayahNumber: number;
  wordIndex: number;
  wordText: string;
  errorCount: number;
  lastError: string;
}

// Quran data types (local - still use numbers)
export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  surahNumber: number;
}

// Auth types
export interface User {
  id: string;  // UUID from Supabase
  student_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: 'teacher' | 'student' | null;  // Legacy, no longer used for access control
  is_verified: boolean;  // Legacy, always true now
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ContactListItem {
  id: string;  // UUID
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  added_at: string;
}

// Legacy aliases
export type StudentListItem = ContactListItem;
export type TeacherListItem = ContactListItem;

export interface ContactLookup {
  student_id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

// Legacy alias
export type StudentLookup = ContactLookup;

export interface Student {
  id: number;
  name: string;
  createdAt: string;
}

export interface Assignment {
  id: number;
  sessionId: number;
  type: 'hifz' | 'sabqi' | 'revision';
  startSurah: number;
  endSurah: number;
  startAyah?: number;
  endAyah?: number;
}

export interface Session {
  id: number;
  studentId: number;
  date: string;
  day: string;
  notes: string;
  assignments: Assignment[];
}

export interface Mistake {
  id: number;
  studentId: number;
  surahNumber: number;
  ayahNumber: number;
  wordIndex: number;
  wordText: string;
  errorCount: number;
  lastError: string;
}

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
  id: number;
  student_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_verified: boolean;
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

export interface StudentListItem {
  id: number;
  student_id: string;
  first_name: string;
  last_name: string;
  added_at: string;
}

export interface TeacherListItem {
  id: number;
  first_name: string;
  last_name: string;
  added_at: string;
}

export interface StudentLookup {
  student_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
}

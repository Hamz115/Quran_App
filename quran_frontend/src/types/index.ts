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

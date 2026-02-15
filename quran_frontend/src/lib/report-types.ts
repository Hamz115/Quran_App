// Student Report Types

export interface StudentReport {
  student: {
    id: string;
    name: string;
    email: string;
    student_id: string;
    added_at: string;
  };
  summary: {
    total_classes: number;
    total_mistakes: number;
    unique_mistakes: number;
    repeated_mistakes: number;
    avg_performance: string;
  };
  classes: StudentClass[];
  mistakes_by_surah: MistakeBySurah[];
  repeated_mistakes: RepeatedMistake[];
  performance_trend: PerformanceDataPoint[];
}

export interface StudentClass {
  id: string;
  date: string;
  day: string;
  notes?: string;
  performance?: string;
  assignments: ClassAssignment[];
  mistakes: ClassMistake[];
  mistake_count: number;
}

export interface ClassAssignment {
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
}

export interface ClassMistake {
  id: string;
  surah_number: number;
  surah_name: string;
  ayah_number: number;
  word_text: string;
  error_count: number;
}

export interface MistakeBySurah {
  surah_number: number;
  surah_name: string;
  total_mistakes: number;
  unique_mistakes: number;
}

export interface RepeatedMistake {
  id: string;
  surah_number: number;
  surah_name: string;
  ayah_number: number;
  word_text: string;
  error_count: number;
}

export interface PerformanceDataPoint {
  date: string;
  performance: string;
}

// ============ NEW TYPES FOR TAB-BASED DASHBOARD ============

export type DatePreset = '1m' | '2m' | '6m' | 'all';

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  datePreset: DatePreset;
  surahFrom: number | null;
  surahTo: number | null;
  juz: number | null;
}

export interface ExportConfig {
  format: 'pdf' | 'csv' | 'word';
  sections: {
    summary: boolean;
    classDetails: boolean;
    mistakesBySurah: boolean;
    repeatedMistakes: boolean;
    performanceChart: boolean;
    teacherNotes: boolean;
  };
  filters: ReportFilters;
  filteredReport: StudentReport;
}

export interface PerformanceStats {
  currentStreak: number;
  bestStreak: number;
  bestStreakRange: string;
  mistakesPerClass: number;
  mistakeSparkline: number[];
  trend: 'improving' | 'declining' | 'stable';
}

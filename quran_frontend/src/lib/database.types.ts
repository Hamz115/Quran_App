// TypeScript types for Supabase database tables
// Generated based on QuranTrack Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'teacher' | 'student';
export type AssignmentType = 'hifz' | 'sabqi' | 'revision';
export type PerformanceRating = 'Excellent' | 'Very Good' | 'Good' | 'Needs Work';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          role?: UserRole | null;
          user_code: string | null;
          student_id?: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: UserRole | null;
          user_code?: string | null;
          student_id?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          name?: string;
          role?: UserRole | null;
          user_code?: string | null;
          student_id?: string | null;
          is_verified?: boolean;
          updated_at?: string;
        };
      };
      listener_reciters: {
        Row: {
          id: string;
          listener_id: string;
          reciter_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          listener_id: string;
          reciter_id: string;
          created_at?: string;
        };
        Update: {
          listener_id?: string;
          reciter_id?: string;
        };
      };
      classes: {
        Row: {
          id: string;
          listener_id: string;
          teacher_id?: string | null;
          date: string;
          day: string | null;
          notes: string | null;
          performance: PerformanceRating | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listener_id: string;
          teacher_id?: string | null;
          date: string;
          day?: string | null;
          notes?: string | null;
          performance?: PerformanceRating | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          listener_id?: string;
          teacher_id?: string | null;
          date?: string;
          day?: string | null;
          notes?: string | null;
          performance?: PerformanceRating | null;
          is_published?: boolean;
          updated_at?: string;
        };
      };
      class_reciters: {
        Row: {
          id: string;
          class_id: string;
          reciter_id: string;
          performance: PerformanceRating | null;
        };
        Insert: {
          id?: string;
          class_id: string;
          reciter_id: string;
          performance?: PerformanceRating | null;
        };
        Update: {
          class_id?: string;
          reciter_id?: string;
          performance?: PerformanceRating | null;
        };
      };
      assignments: {
        Row: {
          id: string;
          class_id: string;
          type: AssignmentType;
          start_surah: number;
          end_surah: number;
          start_ayah: number | null;
          end_ayah: number | null;
          reciter_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          type: AssignmentType;
          start_surah: number;
          end_surah: number;
          start_ayah?: number | null;
          end_ayah?: number | null;
          reciter_id?: string | null;
          created_at?: string;
        };
        Update: {
          class_id?: string;
          type?: AssignmentType;
          start_surah?: number;
          end_surah?: number;
          start_ayah?: number | null;
          end_ayah?: number | null;
          reciter_id?: string | null;
        };
      };
      mistakes: {
        Row: {
          id: string;
          reciter_id: string;
          surah_number: number;
          ayah_number: number;
          word_index: number;
          word_text: string;
          char_index: number | null;
          error_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reciter_id: string;
          surah_number: number;
          ayah_number: number;
          word_index: number;
          word_text: string;
          char_index?: number | null;
          error_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reciter_id?: string;
          surah_number?: number;
          ayah_number?: number;
          word_index?: number;
          word_text?: string;
          char_index?: number | null;
          error_count?: number;
          updated_at?: string;
        };
      };
      mistake_occurrences: {
        Row: {
          id: string;
          mistake_id: string;
          class_id: string;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          mistake_id: string;
          class_id: string;
          occurred_at?: string;
        };
        Update: {
          mistake_id?: string;
          class_id?: string;
          occurred_at?: string;
        };
      };
    };
    Views: {
      teacher_students: {
        Row: {
          id: string;
          teacher_id: string;
          student_id: string;
          created_at: string;
        };
      };
      class_students: {
        Row: {
          id: string;
          class_id: string;
          student_id: string;
          performance: PerformanceRating | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      assignment_type: AssignmentType;
      performance_rating: PerformanceRating;
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ListenerReciter = Database['public']['Tables']['listener_reciters']['Row'];
export type Class = Database['public']['Tables']['classes']['Row'];
export type ClassReciter = Database['public']['Tables']['class_reciters']['Row'];
export type Assignment = Database['public']['Tables']['assignments']['Row'];
export type Mistake = Database['public']['Tables']['mistakes']['Row'];
export type MistakeOccurrence = Database['public']['Tables']['mistake_occurrences']['Row'];
export type TeacherStudent = Database['public']['Views']['teacher_students']['Row'];
export type ClassStudent = Database['public']['Views']['class_students']['Row'];

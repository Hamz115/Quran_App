// Supabase API functions for QuranTrack
// Handles: Students, Classes, Mistakes
// Uses Supabase client with RLS for security
// Uses local-first caching for instant loading

import { supabase } from './supabase';
import { cacheFirst, invalidateCache, saveToCache, getFromCache } from './cache';
import type { StudentListItem, StudentLookup, TeacherListItem } from '../types';

// Cache keys
const CACHE_KEYS = {
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  CLASSES_TEACHER: 'classes:teacher',
  CLASSES_STUDENT: 'classes:student',
} as const;

// ============ STUDENTS (Teacher functions) ============

// Internal fetcher (no cache)
async function fetchStudentsFromSupabase(): Promise<StudentListItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('teacher_students')
    .select(`
      id,
      created_at,
      student:profiles!student_id (
        id,
        student_id,
        name,
        email
      )
    `)
    .eq('teacher_id', user.id) as { data: Array<{ id: string; created_at: string; student: { id: string; student_id: string; name: string; email: string } }> | null; error: any };

  if (error) throw new Error(error.message);

  return (data ?? []).map(row => {
    const student = row.student as { id: string; student_id: string; name: string; email: string };
    const nameParts = student.name.split(' ');
    return {
      id: student.id,
      student_id: student.student_id || '',
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      added_at: row.created_at,
    };
  });
}

// Cached version - returns instantly if cached, refreshes in background
export async function getMyStudents(): Promise<StudentListItem[]> {
  return cacheFirst(CACHE_KEYS.STUDENTS, fetchStudentsFromSupabase);
}

export async function lookupStudent(email: string): Promise<StudentLookup> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, student_id, name, email')
    .eq('email', email)
    .single() as { data: { id: string; student_id: string | null; name: string; email: string } | null; error: any };

  if (error || !data) {
    throw new Error('No user found with that email');
  }

  const nameParts = data.name.split(' ');
  return {
    student_id: data.student_id || '',
    email: data.email,
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    display_name: data.name,
  };
}

export async function addStudent(email: string): Promise<{ message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find student by email
  const { data: student, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single() as { data: { id: string } | null; error: any };

  if (lookupError || !student) {
    throw new Error('No user found with that email');
  }

  // Check if already added
  const { data: existing } = await supabase
    .from('teacher_students')
    .select('id')
    .eq('teacher_id', user.id)
    .eq('student_id', student.id)
    .single() as { data: { id: string } | null; error: any };

  if (existing) {
    throw new Error('Student already added to your list');
  }

  // Add relationship
  const { error } = await supabase
    .from('teacher_students' as any)
    .insert({ teacher_id: user.id, student_id: student.id } as any);

  if (error) {
    throw new Error(error.message);
  }

  // Invalidate cache so next fetch gets fresh data
  invalidateCache(CACHE_KEYS.STUDENTS);

  return { message: 'Student added successfully' };
}

export async function removeStudent(studentId: string): Promise<{ message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('teacher_students')
    .delete()
    .eq('teacher_id', user.id)
    .eq('student_id', studentId);

  if (error) {
    throw new Error(error.message);
  }

  // Invalidate cache
  invalidateCache(CACHE_KEYS.STUDENTS);

  return { message: 'Student removed successfully' };
}

// ============ TEACHERS (Student functions) ============

// Internal fetcher (no cache)
async function fetchTeachersFromSupabase(): Promise<TeacherListItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('teacher_students')
    .select(`
      id,
      created_at,
      teacher:profiles!teacher_id (
        id,
        name
      )
    `)
    .eq('student_id', user.id) as { data: Array<{ id: string; created_at: string; teacher: { id: string; name: string } }> | null; error: any };

  if (error) throw new Error(error.message);

  return (data ?? []).map(row => {
    const teacher = row.teacher as { id: string; name: string };
    const nameParts = teacher.name.split(' ');
    return {
      id: teacher.id,
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      added_at: row.created_at,
    };
  });
}

// Cached version
export async function getMyTeachers(): Promise<TeacherListItem[]> {
  return cacheFirst(CACHE_KEYS.TEACHERS, fetchTeachersFromSupabase);
}

// ============ CLASSES ============

export interface ClassStudent {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  performance?: string;
  mistake_counts?: {
    hifz: number;
    sabqi: number;
    revision: number;
  };
}

export interface ClassAssignment {
  id: string;
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  student_id?: string;
}

export interface ClassData {
  id: string;
  date: string;
  day: string;
  notes?: string;
  performance?: string;
  teacher_id: string;
  is_published: boolean;
  class_type: 'regular' | 'test';
  assignments: ClassAssignment[];
  students?: ClassStudent[];
  mistake_counts?: {
    hifz: number;
    sabqi: number;
    revision: number;
  };
}

// Internal fetcher for classes (no cache)
async function fetchClassesFromSupabase(role: 'teacher' | 'student'): Promise<ClassData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (role === 'teacher') {
    // Teachers see their own classes
    const { data, error } = await supabase
      .from('classes' as any)
      .select(`
        *,
        assignments (*),
        class_students (
          student_id,
          student:profiles!student_id (id, student_id, name)
        )
      `)
      .eq('teacher_id', user.id)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return mapClassData(data ?? [], true);
  } else {
    // Students see published classes they're enrolled in
    const { data, error } = await supabase
      .from('classes' as any)
      .select(`
        *,
        assignments (*),
        class_students!inner (student_id)
      `)
      .eq('class_students.student_id', user.id)
      .eq('is_published', true)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return mapClassData(data ?? [], false);
  }
}

// Cached version - instant loading from cache, background refresh
export async function getClasses(role?: 'teacher' | 'student'): Promise<ClassData[]> {
  // Get role from cache or profile if not specified
  let userRole = role;
  if (!userRole) {
    // Try to get from cached profile first
    const cachedProfile = getFromCache<{ role: string }>('profile');
    if (cachedProfile) {
      userRole = cachedProfile.role as 'teacher' | 'student';
    } else {
      // Fallback to fetching from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single() as { data: { role: string } | null; error: any };
      userRole = profile?.role as 'teacher' | 'student';

      // Cache the profile role
      if (profile) {
        saveToCache('profile', { role: profile.role });
      }
    }
  }

  const cacheKey = userRole === 'teacher' ? CACHE_KEYS.CLASSES_TEACHER : CACHE_KEYS.CLASSES_STUDENT;
  return cacheFirst(cacheKey, () => fetchClassesFromSupabase(userRole!));
}

export async function getClass(classId: string): Promise<ClassData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('classes' as any)
    .select(`
      *,
      assignments (*),
      class_students (
        student_id,
        student:profiles!student_id (id, student_id, name)
      )
    `)
    .eq('id', classId)
    .single();

  if (error) throw new Error(error.message);

  const mapped = mapClassData([data], true);
  return mapped[0];
}

function mapClassData(rows: any[], includeStudents: boolean): ClassData[] {
  return rows.map(row => {
    const classData: ClassData = {
      id: row.id,
      date: row.date,
      day: row.day || '',
      notes: row.notes,
      performance: row.performance,
      teacher_id: row.teacher_id,
      is_published: row.is_published,
      class_type: row.class_type || 'regular',
      assignments: (row.assignments ?? []).map((a: any) => ({
        id: a.id,
        type: a.type,
        start_surah: a.start_surah,
        end_surah: a.end_surah,
        start_ayah: a.start_ayah,
        end_ayah: a.end_ayah,
      })),
    };

    if (includeStudents && row.class_students) {
      classData.students = row.class_students.map((cs: any) => {
        const student = cs.student as { id: string; student_id: string; name: string };
        const nameParts = student.name.split(' ');
        return {
          id: student.id,
          student_id: student.student_id || '',
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
        };
      });
    }

    return classData;
  });
}

export async function createClass(classData: {
  date: string;
  day: string;
  notes?: string;
  student_ids: string[];
  class_type?: 'regular' | 'test';
  assignments: {
    type: string;
    start_surah: number;
    end_surah: number;
    start_ayah?: number;
    end_ayah?: number;
    student_id?: string;
  }[];
}): Promise<{ id: string; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create the class
  const { data: newClass, error: classError } = await supabase
    .from('classes' as any)
    .insert({ teacher_id: user.id, date: classData.date, day: classData.day, notes: classData.notes, class_type: classData.class_type || 'regular' } as any).select().single() as { data: { id: string } | null; error: any };

  if (classError || !newClass) throw new Error(classError?.message || "Failed to create class");

  // Add students to class
  if (classData.student_ids.length > 0) {
    const classStudents = classData.student_ids.map(studentId => ({
      class_id: newClass.id,
      student_id: studentId,
    }));

    const { error: studentsError } = await supabase
      .from('class_students' as any)
      .insert(classStudents as any);

    if (studentsError) throw new Error(studentsError.message);
  }

  // Add assignments
  if (classData.assignments.length > 0) {
    const assignments = classData.assignments.map(a => ({
      class_id: newClass.id,
      type: a.type,
      start_surah: a.start_surah,
      end_surah: a.end_surah,
      start_ayah: a.start_ayah,
      end_ayah: a.end_ayah,
    }));

    const { error: assignmentsError } = await supabase
      .from('assignments' as any)
      .insert(assignments as any);

    if (assignmentsError) throw new Error(assignmentsError.message);
  }

  // Invalidate classes cache
  invalidateCache('classes');

  return { id: newClass.id, message: 'Class created successfully' };
}

export async function deleteClass(classId: string): Promise<{ message: string }> {
  const { error } = await supabase
    .from('classes' as any)
    .delete()
    .eq('id', classId);

  if (error) throw new Error(error.message);

  // Invalidate classes cache
  invalidateCache('classes');

  return { message: 'Class deleted successfully' };
}

export async function updateClassNotes(classId: string, notes: string | null): Promise<{ message: string }> {
  const { error } = await (supabase as any).from('classes').update({ notes }).eq('id', classId);
  if (error) throw new Error(error.message);
  return { message: 'Notes updated successfully' };
}

export async function updateClassPerformance(classId: string, performance: string): Promise<{ message: string }> {
  const { error } = await (supabase as any).from('classes').update({ performance }).eq('id', classId);
  if (error) throw new Error(error.message);
  return { message: 'Performance updated successfully' };
}

export async function updateClassPublish(classId: string, isPublished: boolean): Promise<{ message: string }> {
  const { error } = await (supabase as any).from('classes').update({ is_published: isPublished }).eq('id', classId);
  if (error) throw new Error(error.message);
  return { message: isPublished ? 'Class published' : 'Class unpublished' };
}

export async function addClassStudents(classId: string, studentIds: string[]): Promise<{ message: string }> {
  const classStudents = studentIds.map(studentId => ({
    class_id: classId,
    student_id: studentId,
  }));

  const { error } = await supabase
    .from('class_students')
    .insert(classStudents as any);

  if (error) throw new Error(error.message);
  return { message: 'Students added successfully' };
}

export async function removeClassStudent(classId: string, studentId: string): Promise<{ message: string }> {
  const { error } = await supabase
    .from('class_students')
    .delete()
    .eq('class_id', classId)
    .eq('student_id', studentId);

  if (error) throw new Error(error.message);
  return { message: 'Student removed from class' };
}

// ============ MISTAKES ============

export interface MistakeData {
  id: string;
  student_id: string;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  error_count: number;
}

export async function getMistakes(surahNumber?: number, studentId?: string): Promise<MistakeData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let query = supabase.from('mistakes').select('*');

  // If studentId is provided, filter by it (teacher viewing student's mistakes)
  // Otherwise, the RLS policy will restrict to user's own mistakes
  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  if (surahNumber) {
    query = query.eq('surah_number', surahNumber);
  }

  const { data, error } = await query.order('error_count', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addMistake(mistake: {
  student_id?: string;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  char_index?: number;
  class_id?: string;
}): Promise<{ id: string; error_count: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const studentId = mistake.student_id || user.id;

  // Try to find existing mistake
  let query = supabase
    .from('mistakes' as any)
    .select('id, error_count')
    .eq('student_id', studentId)
    .eq('surah_number', mistake.surah_number)
    .eq('ayah_number', mistake.ayah_number)
    .eq('word_index', mistake.word_index);

  if (mistake.char_index !== undefined) {
    query = query.eq('char_index', mistake.char_index);
  } else {
    query = query.is('char_index', null);
  }

  const { data: existing } = await query.single() as { data: { id: string; error_count: number } | null };

  if (existing) {
    // Update existing mistake - increment error count
    const newCount = existing.error_count + 1;
    const { error } = await (supabase as any).from('mistakes').update({ error_count: newCount }).eq('id', existing.id);

    if (error) throw new Error(error.message);

    // Add occurrence if class_id provided
    if (mistake.class_id) {
      await supabase.from('mistake_occurrences' as any).insert({ mistake_id: existing.id, class_id: mistake.class_id } as any);
    }

    return { id: existing.id, error_count: newCount };
  } else {
    // Create new mistake
    const { data: newMistake, error } = await supabase
      .from('mistakes' as any)
      .insert({ student_id: studentId, surah_number: mistake.surah_number, ayah_number: mistake.ayah_number, word_index: mistake.word_index, word_text: mistake.word_text, char_index: mistake.char_index, error_count: 1 } as any).select().single() as { data: { id: string } | null; error: any };

    if (error || !newMistake) throw new Error(error?.message || "Failed to create mistake");

    // Add occurrence if class_id provided
    if (mistake.class_id) {
      await supabase.from('mistake_occurrences' as any).insert({ mistake_id: newMistake.id, class_id: mistake.class_id } as any);
    }

    return { id: newMistake.id, error_count: 1 };
  }
}

export async function removeMistake(mistakeId: string): Promise<{ message: string }> {
  const { error } = await supabase
    .from('mistakes' as any)
    .delete()
    .eq('id', mistakeId);

  if (error) throw new Error(error.message);
  return { message: 'Mistake removed successfully' };
}

// ============ STATS ============

export async function getStats(role?: 'teacher' | 'student') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (role === 'teacher') {
    // Get teacher stats
    const [studentsResult, classesResult] = await Promise.all([
      supabase.from('teacher_students').select('id', { count: 'exact' }).eq('teacher_id', user.id),
      supabase.from('classes').select('id', { count: 'exact' }).eq('teacher_id', user.id),
    ]);

    return {
      total_students: studentsResult.count ?? 0,
      total_classes: classesResult.count ?? 0,
    };
  } else {
    // Get student stats
    const [classesResult, mistakesResult] = await Promise.all([
      supabase.from('class_students').select('id', { count: 'exact' }).eq('student_id', user.id),
      supabase.from('mistakes').select('id', { count: 'exact' }).eq('student_id', user.id),
    ]);

    return {
      total_classes: classesResult.count ?? 0,
      total_mistakes: mistakesResult.count ?? 0,
    };
  }
}

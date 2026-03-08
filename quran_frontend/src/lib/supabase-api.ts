// Supabase API functions for QuranTrack
// Handles: Students, Classes, Mistakes
// Uses Supabase client with RLS for security
// Uses local-first caching for instant loading

import { supabase } from './supabase';
import { cacheFirst, invalidateCache, saveToCache, getFromCache } from './cache';
import { surahNames } from './quran-utils';
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
      email: student.email || '',
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
    .maybeSingle() as { data: { id: string } | null; error: any };

  if (existing) {
    throw new Error('This user is already in your list');
  }

  // Add relationship
  const { error } = await supabase
    .from('teacher_students' as any)
    .insert({ teacher_id: user.id, student_id: student.id } as any);

  if (error) {
    if (error.code === '23505') {
      throw new Error('This user is already in your list');
    }
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
          performance,
          student:profiles!student_id (id, student_id, name)
        )
      `)
      .eq('teacher_id', user.id)
      .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    // One-time fix: publish any unpublished classes (background, non-blocking)
    supabase.from('classes').update({ is_published: true } as any)
      .eq('teacher_id', user.id)
      .or('is_published.is.null,is_published.eq.false')
      .then(() => {});

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
    // For students, use class-level performance
    return ((data ?? []) as any[]).map(row => {
      return {
        id: row.id,
        date: row.date,
        day: row.day || '',
        notes: row.notes,
        performance: row.performance,
        teacher_id: row.teacher_id,
        is_published: row.is_published,
        assignments: (row.assignments ?? []).map((a: any) => ({
          id: a.id,
          type: a.type,
          start_surah: a.start_surah,
          end_surah: a.end_surah,
          start_ayah: a.start_ayah,
          end_ayah: a.end_ayah,
        })),
      };
    });
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
        performance,
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
      assignments: (row.assignments ?? []).map((a: any) => ({
        id: a.id,
        type: a.type,
        start_surah: a.start_surah,
        end_surah: a.end_surah,
        start_ayah: a.start_ayah,
        end_ayah: a.end_ayah,
        student_id: a.student_id || null,
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
          performance: cs.performance || row.performance,
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

  // Create the class (auto-publish so students can see it immediately)
  const { data: newClass, error: classError } = await supabase
    .from('classes' as any)
    .insert({ teacher_id: user.id, date: classData.date, day: classData.day, notes: classData.notes, is_published: true } as any).select().single() as { data: { id: string } | null; error: any };

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
      student_id: a.student_id || null,
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
  // 1. Find all mistakes linked to this class via mistake_occurrences
  const { data: occurrences } = await supabase
    .from('mistake_occurrences')
    .select('id, mistake_id')
    .eq('class_id', classId);

  if (occurrences && occurrences.length > 0) {
    const mistakeIds = [...new Set(occurrences.map((o: any) => o.mistake_id))];

    // 2. Delete the occurrences for this class
    await supabase
      .from('mistake_occurrences')
      .delete()
      .eq('class_id', classId);

    // 3. For each affected mistake, check if it has remaining occurrences
    for (const mistakeId of mistakeIds) {
      const { count } = await supabase
        .from('mistake_occurrences')
        .select('id', { count: 'exact', head: true })
        .eq('mistake_id', mistakeId);

      if (count === 0) {
        // No more occurrences — delete the mistake entirely
        await supabase.from('mistakes').delete().eq('id', mistakeId);
      } else {
        // Update error_count to match remaining occurrences
        await (supabase.from('mistakes') as any).update({ error_count: count }).eq('id', mistakeId);
      }
    }
  }

  // 4. Delete the class (cascades to assignments, class_students)
  const { error } = await supabase
    .from('classes' as any)
    .delete()
    .eq('id', classId);

  if (error) throw new Error(error.message);

  // Invalidate classes cache
  invalidateCache('classes');

  return { message: 'Class deleted successfully' };
}

export async function updateAssignment(assignmentId: string, data: {
  type?: string;
  start_surah?: number;
  end_surah?: number;
  start_ayah?: number | null;
  end_ayah?: number | null;
}): Promise<{ message: string }> {
  const { error } = await (supabase
    .from('assignments' as any) as any)
    .update(data)
    .eq('id', assignmentId);

  if (error) throw new Error(error.message);

  invalidateCache('classes');

  return { message: 'Assignment updated successfully' };
}

export async function addClassAssignments(classId: string, assignments: Array<{
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number | null;
  end_ayah?: number | null;
  student_id?: string | null;
}>): Promise<{ message: string }> {
  const rows = assignments.map(a => ({
    class_id: classId,
    type: a.type,
    start_surah: a.start_surah,
    end_surah: a.end_surah,
    start_ayah: a.start_ayah,
    end_ayah: a.end_ayah,
    student_id: a.student_id || null,
  }));

  const { error } = await supabase
    .from('assignments' as any)
    .insert(rows as any);

  if (error) throw new Error(error.message);

  invalidateCache('classes');

  return { message: 'Assignments added successfully' };
}

export async function deleteAssignment(assignmentId: string): Promise<{ message: string }> {
  const { error } = await supabase
    .from('assignments' as any)
    .delete()
    .eq('id', assignmentId);

  if (error) throw new Error(error.message);

  invalidateCache('classes');

  return { message: 'Assignment deleted successfully' };
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

export async function updateStudentPerformance(classId: string, studentId: string, performance: string): Promise<{ message: string }> {
  // Update per-student performance on class_students
  const { error } = await (supabase as any)
    .from('class_students')
    .update({ performance })
    .eq('class_id', classId)
    .eq('student_id', studentId);
  if (error) throw new Error(error.message);

  // Also update class-level performance for backward compatibility
  await (supabase as any).from('classes').update({ performance }).eq('id', classId);

  return { message: 'Student performance updated' };
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

export interface MistakeWithOccurrences extends MistakeData {
  occurrences?: {
    class_id: string;
    class_date: string;
    class_day: string;
  }[];
}

export async function getMistakesWithOccurrences(surahNumber?: number, studentId?: string): Promise<MistakeWithOccurrences[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Build query with occurrences join
  let query = supabase
    .from('mistakes')
    .select(`
      *,
      mistake_occurrences (
        class_id,
        classes (date, day)
      )
    `);

  // If studentId is provided, filter by it (teacher viewing student's mistakes)
  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  if (surahNumber) {
    query = query.eq('surah_number', surahNumber);
  }

  const { data, error } = await query.order('error_count', { ascending: false });

  if (error) {
    console.error('getMistakesWithOccurrences error:', error);
    throw new Error(error.message);
  }

  // Transform the data to match expected format
  return (data ?? []).map((mistake: any) => ({
    id: mistake.id,
    student_id: mistake.student_id,
    surah_number: mistake.surah_number,
    ayah_number: mistake.ayah_number,
    word_index: mistake.word_index,
    word_text: mistake.word_text,
    char_index: mistake.char_index,
    error_count: mistake.error_count,
    occurrences: (mistake.mistake_occurrences ?? []).map((occ: any) => ({
      class_id: occ.class_id,
      class_date: occ.classes?.date || '',
      class_day: occ.classes?.day || '',
    })),
  }));
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
      const { error: occError } = await supabase.from('mistake_occurrences' as any).insert({ mistake_id: existing.id, class_id: mistake.class_id } as any);
      if (occError) console.error('Failed to create mistake occurrence:', occError);
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
      const { error: occError } = await supabase.from('mistake_occurrences' as any).insert({ mistake_id: newMistake.id, class_id: mistake.class_id } as any);
      if (occError) console.error('Failed to create mistake occurrence:', occError);
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
    const [classesResult, mistakesResult, repeatedResult, allMistakesResult, topRepeatedResult] = await Promise.all([
      supabase.from('class_students').select('id', { count: 'exact' }).eq('student_id', user.id),
      supabase.from('mistakes').select('id', { count: 'exact' }).eq('student_id', user.id),
      supabase.from('mistakes').select('id', { count: 'exact' }).eq('student_id', user.id).gt('error_count', 1),
      supabase.from('mistakes').select('surah_number').eq('student_id', user.id),
      supabase.from('mistakes').select('id, surah_number, ayah_number, word_text, error_count').eq('student_id', user.id).gt('error_count', 1).order('error_count', { ascending: false }).limit(5),
    ]);

    // Group mistakes by surah in JS (Supabase doesn't support GROUP BY)
    const surahCounts = new Map<number, number>();
    for (const row of (allMistakesResult.data ?? []) as { surah_number: number }[]) {
      surahCounts.set(row.surah_number, (surahCounts.get(row.surah_number) || 0) + 1);
    }
    const mistakes_by_surah = Array.from(surahCounts.entries())
      .map(([surah_number, count]) => ({ surah_number, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_classes: classesResult.count ?? 0,
      total_mistakes: mistakesResult.count ?? 0,
      repeated_mistakes: repeatedResult.count ?? 0,
      mistakes_by_surah,
      top_repeated_mistakes: (topRepeatedResult.data ?? []) as { id: string; surah_number: number; ayah_number: number; word_text: string; error_count: number }[],
    };
  }
}

// ============ SUGGESTED PORTIONS ============

export interface SuggestedPortion {
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  surah_name?: string;
  note?: string;
}

export interface SuggestedPortions {
  hifz: SuggestedPortion | null;
  sabqi: SuggestedPortion | null;
  manzil: SuggestedPortion | null;
  last_class: {
    id: string;
    date: string;
    day: string;
  } | null;
}

export async function getSuggestedPortions(studentId: string): Promise<SuggestedPortions> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Default response
  const suggestions: SuggestedPortions = {
    hifz: null,
    sabqi: null,
    manzil: null,
    last_class: null,
  };

  // Find student's classes with assignments
  const { data: classStudentsData, error: csError } = await supabase
    .from('class_students' as any)
    .select(`
      class_id,
      classes (
        id,
        date,
        day,
        assignments (
          type,
          start_surah,
          end_surah,
          start_ayah,
          end_ayah
        )
      )
    `)
    .eq('student_id', studentId)
    .limit(20);

  if (csError) {
    console.error('getSuggestedPortions error:', csError);
    throw new Error(csError.message);
  }

  const classStudents = (classStudentsData as any[]) || [];

  // Sort by class date descending to find the most recent class
  // (can't order by UUID class_id — UUIDs are random, not chronological)
  classStudents.sort((a, b) => {
    const dateA = a.classes?.date || '';
    const dateB = b.classes?.date || '';
    return dateB.localeCompare(dateA);
  });

  const lastClassEntry = classStudents[0];

  if (!lastClassEntry || !lastClassEntry.classes) {
    // No previous class - return default starting point (Al-Mulk)
    suggestions.hifz = {
      start_surah: 67,
      end_surah: 67,
      start_ayah: 1,
      end_ayah: 30,
      surah_name: 'Al-Mulk',
      note: 'No previous classes found - starting from Al-Mulk',
    };
    return suggestions;
  }

  const lastClass = lastClassEntry.classes as any;
  suggestions.last_class = {
    id: lastClass.id,
    date: lastClass.date,
    day: lastClass.day,
  };

  // Get assignments from last class
  const assignments = lastClass.assignments || [];

  // Parse assignments by type
  let lastHifz: any = null;
  let lastSabqi: any = null;
  let lastManzil: any = null;

  for (const a of assignments) {
    if (a.type === 'hifz') lastHifz = a;
    else if (a.type === 'sabqi') lastSabqi = a;
    else if (a.type === 'revision' || a.type === 'manzil') lastManzil = a;
  }

  // Suggest same portions as last class (teacher can adjust)
  if (lastHifz) {
    suggestions.hifz = {
      start_surah: lastHifz.start_surah,
      end_surah: lastHifz.end_surah,
      start_ayah: lastHifz.start_ayah,
      end_ayah: lastHifz.end_ayah,
      surah_name: surahNames[lastHifz.start_surah] || `Surah ${lastHifz.start_surah}`,
      note: 'Same as last class - adjust as needed',
    };
  }

  if (lastSabqi) {
    suggestions.sabqi = {
      start_surah: lastSabqi.start_surah,
      end_surah: lastSabqi.end_surah,
      start_ayah: lastSabqi.start_ayah,
      end_ayah: lastSabqi.end_ayah,
      surah_name: surahNames[lastSabqi.start_surah] || `Surah ${lastSabqi.start_surah}`,
      note: 'Same as last class - adjust as needed',
    };
  }

  if (lastManzil) {
    suggestions.manzil = {
      start_surah: lastManzil.start_surah,
      end_surah: lastManzil.end_surah,
      start_ayah: lastManzil.start_ayah,
      end_ayah: lastManzil.end_ayah,
      surah_name: surahNames[lastManzil.start_surah] || `Surah ${lastManzil.start_surah}`,
      note: 'Same as last class - adjust as needed',
    };
  }

  return suggestions;
}

// ============ STUDENT REPORT ============

export async function getStudentReport(studentId: string): Promise<any> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch student profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles' as any)
    .select('*')
    .eq('id', studentId)
    .single();

  if (profileError || !profile) {
    throw new Error('Student not found');
  }
  const profileData = profile as any;

  // Get student's classes (as teacher)
  const { data: classStudentsRaw, error: csError } = await supabase
    .from('class_students' as any)
    .select(`
      class_id,
      classes (
        id,
        date,
        day,
        notes,
        performance,
        teacher_id,
        is_published,
        assignments (*)
      )
    `)
    .eq('student_id', studentId);

  if (csError) {
    console.error('Error fetching classes:', csError);
  }
  const classStudents = (classStudentsRaw ?? []) as any[];

  // Get student's mistakes WITH occurrences (links mistakes to classes)
  const { data: mistakesRaw, error: mistakesError } = await supabase
    .from('mistakes' as any)
    .select('*, mistake_occurrences(id, class_id, occurred_at)')
    .eq('student_id', studentId);

  if (mistakesError) {
    console.error('Error fetching mistakes:', mistakesError);
  }
  const mistakes = (mistakesRaw ?? []) as any[];

  // Build per-class mistake mapping
  const classMistakeMap = new Map<string, any[]>();
  for (const m of mistakes) {
    const occurrences = m.mistake_occurrences ?? [];
    for (const occ of occurrences) {
      if (!occ.class_id) continue;
      const existing = classMistakeMap.get(occ.class_id) || [];
      existing.push({
        id: m.id,
        surah_number: m.surah_number,
        surah_name: surahNames[m.surah_number] || `Surah ${m.surah_number}`,
        ayah_number: m.ayah_number,
        word_text: m.word_text,
        error_count: m.error_count
      });
      classMistakeMap.set(occ.class_id, existing);
    }
  }

  // Build student info
  const student = {
    id: profileData.id,
    name: profileData.name,
    email: profileData.email,
    student_id: profileData.student_id || '',
    added_at: profileData.created_at
  };

  // Build classes list with per-class mistakes
  const classes = (classStudents || []).map((cs: any) => {
    const classId = cs.classes?.id || '';
    const classMistakes = classMistakeMap.get(classId) || [];
    return {
      id: classId,
      date: cs.classes?.date || '',
      day: cs.classes?.day || '',
      notes: cs.classes?.notes || '',
      performance: cs.classes?.performance || '',
      assignments: (cs.classes?.assignments || [])
        .filter((a: any) => !a.student_id || a.student_id === studentId)
        .map((a: any) => ({
          type: a.type,
          start_surah: a.start_surah,
          end_surah: a.end_surah,
          start_ayah: a.start_ayah,
          end_ayah: a.end_ayah,
          student_id: a.student_id || null,
        })),
      mistakes: classMistakes,
      mistake_count: classMistakes.length
    };
  });

  // Calculate summary stats
  const totalMistakes = mistakes.length;
  const uniqueMistakes = new Set(mistakes.map(m => `${m.surah_number}-${m.ayah_number}-${m.word_index}`)).size;
  const repeatedMistakes = mistakes.filter(m => m.error_count > 1).length;
  const totalClasses = classStudents.length;

  // Compute avg performance
  const perfMap: Record<string, number> = {
    'excellent': 4, 'Excellent': 4,
    'very good': 3, 'Very Good': 3,
    'good': 2, 'Good': 2,
    'needs improvement': 1, 'Needs Improvement': 1,
    'needs work': 1, 'Needs Work': 1
  };
  const perfLabels = ['', 'Needs Work', 'Good', 'Very Good', 'Excellent'];
  const perfScores = classes
    .map(c => perfMap[c.performance] || 0)
    .filter(s => s > 0);
  const avgPerfScore = perfScores.length > 0
    ? Math.round(perfScores.reduce((a, b) => a + b, 0) / perfScores.length)
    : 0;
  const avgPerformance = perfLabels[avgPerfScore] || 'N/A';

  const summary = {
    total_classes: totalClasses,
    total_mistakes: totalMistakes,
    unique_mistakes: uniqueMistakes,
    repeated_mistakes: repeatedMistakes,
    avg_performance: avgPerformance
  };

  // Group mistakes by surah
  const mistakesBySurahMap = new Map<number, { total: number; unique: Set<string> }>();
  for (const m of mistakes) {
    const existing = mistakesBySurahMap.get(m.surah_number) || { total: 0, unique: new Set<string>() };
    existing.total += 1;
    existing.unique.add(`${m.ayah_number}-${m.word_index}`);
    mistakesBySurahMap.set(m.surah_number, existing);
  }

  const mistakes_by_surah = Array.from(mistakesBySurahMap.entries()).map(([surahNum, data]) => ({
    surah_number: surahNum,
    surah_name: surahNames[surahNum] || `Surah ${surahNum}`,
    total_mistakes: data.total,
    unique_mistakes: data.unique.size
  })).sort((a, b) => a.surah_number - b.surah_number);

  // Get repeated mistakes
  const repeated_mistakes = mistakes
    .filter(m => m.error_count > 1)
    .map(m => ({
      id: m.id,
      surah_number: m.surah_number,
      surah_name: surahNames[m.surah_number] || `Surah ${m.surah_number}`,
      ayah_number: m.ayah_number,
      word_text: m.word_text,
      error_count: m.error_count
    }))
    .sort((a, b) => b.error_count - a.error_count);

  // Get performance trend from classes
  const performance_trend = classes
    .filter(c => c.performance)
    .map(c => ({
      date: c.date,
      performance: c.performance
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    student,
    summary,
    classes,
    mistakes_by_surah,
    repeated_mistakes,
    performance_trend
  };
}

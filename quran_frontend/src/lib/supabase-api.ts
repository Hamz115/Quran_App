// Supabase API functions for QuranTrack
// Handles: Contacts, Sessions, Mistakes
// Uses Supabase client with RLS for security
// Uses local-first caching for instant loading

import { supabase } from './supabase';
import { cacheFirst, invalidateCache } from './cache';
import { surahNames } from './quran-utils';
import type { ContactListItem, ContactLookup } from '../types';

type SupabaseResult<T> = { data: T | null; error: any };

function isSchemaCompatibilityError(error: any): boolean {
  const code = error?.code || '';
  const message = `${error?.message || ''} ${error?.details || ''}`;
  return ['42P01', '42703', 'PGRST200', 'PGRST204'].includes(code)
    || /listener_reciters|class_reciters|reciter_id|user_code|listener_id|relationship/i.test(message);
}

async function runWithLegacyFallback<T>(
  primary: () => Promise<SupabaseResult<T>>,
  legacy: () => Promise<SupabaseResult<T>>,
): Promise<T> {
  const result = await primary();
  if (!result.error) return result.data as T;
  if (!isSchemaCompatibilityError(result.error)) {
    throw new Error(result.error.message);
  }

  const legacyResult = await legacy();
  if (legacyResult.error) throw new Error(legacyResult.error.message);
  return legacyResult.data as T;
}

// Cache keys
const CACHE_KEYS = {
  CONTACTS: 'contacts',
  LISTENERS: 'listeners',
  CLASSES_LISTENER: 'classes:listener',
  CLASSES_RECITER: 'classes:reciter',
  // Legacy aliases
  STUDENTS: 'contacts',
  TEACHERS: 'listeners',
  CLASSES_TEACHER: 'classes:listener',
  CLASSES_STUDENT: 'classes:reciter',
} as const;

// ============ CONTACTS (was Students) ============

// Internal fetcher (no cache)
async function fetchContactsFromSupabase(): Promise<ContactListItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const data = await runWithLegacyFallback<any[]>(
    () => (supabase as any)
      .from('listener_reciters')
      .select(`
        id,
        created_at,
        reciter:profiles!reciter_id (
          id,
          user_code,
          name,
          email
        )
      `)
      .eq('listener_id', user.id),
    () => (supabase as any)
      .from('teacher_students')
      .select(`
        id,
        created_at,
        reciter:profiles!student_id (
          id,
          student_id,
          name,
          email
        )
      `)
      .eq('teacher_id', user.id),
  );

  return (data ?? []).map(row => {
    const reciter = row.reciter as { id: string; user_code?: string; student_id?: string; name: string; email: string };
    const nameParts = reciter.name.split(' ');
    return {
      id: reciter.id,
      student_id: userCode(reciter),
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      email: reciter.email || '',
      added_at: row.created_at,
    };
  });
}

// Cached version - returns instantly if cached, refreshes in background
export async function getMyContacts(): Promise<ContactListItem[]> {
  return cacheFirst(CACHE_KEYS.CONTACTS, fetchContactsFromSupabase);
}

// Legacy alias
export const getMyStudents = getMyContacts;

type ContactLookupRow = {
  id: string;
  user_code?: string | null;
  student_id?: string | null;
  name: string;
  email: string;
};

function userCode(row: { user_code?: string | null; student_id?: string | null }): string {
  return row.user_code || row.student_id || '';
}

async function lookupContactRow(email: string): Promise<ContactLookupRow> {
  // Direct profile queries cannot discover a new contact because profiles RLS
  // only exposes the current user and existing relationships. Use the narrow,
  // authenticated SECURITY DEFINER RPC from supabase_contact_lookup_fix.sql.
  const { data, error } = await (supabase as any).rpc(
    'lookup_profile_by_email',
    { p_email: email.trim().toLowerCase() },
  ) as { data: ContactLookupRow[] | null; error: any };

  const row = data?.[0];
  if (error || !row) {
    throw new Error('No user found with that email');
  }
  return row;
}

export async function lookupContact(email: string): Promise<ContactLookup> {
  const data = await lookupContactRow(email);
  const nameParts = data.name.split(' ');
  return {
    student_id: userCode(data),
    email: data.email,
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    display_name: data.name,
  };
}

// Legacy alias
export const lookupStudent = lookupContact;

export async function addContact(email: string): Promise<{ message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Resolve the new contact through the RLS-safe lookup RPC.
  const reciter = await lookupContactRow(email);

  // Check if already added
  const existing = await runWithLegacyFallback<{ id: string } | null>(
    () => (supabase as any)
      .from('listener_reciters')
      .select('id')
      .eq('listener_id', user.id)
      .eq('reciter_id', reciter.id)
      .maybeSingle(),
    () => (supabase as any)
      .from('teacher_students')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('student_id', reciter.id)
      .maybeSingle(),
  );

  if (existing) {
    throw new Error('This user is already in your list');
  }

  // Add relationship
  try {
    await runWithLegacyFallback<unknown>(
      () => (supabase as any)
        .from('listener_reciters')
        .insert({ listener_id: user.id, reciter_id: reciter.id } as any),
      () => (supabase as any)
        .from('teacher_students')
        .insert({ teacher_id: user.id, student_id: reciter.id } as any),
    );
  } catch (error: any) {
    if (error?.code === '23505' || /duplicate key/i.test(error?.message || '')) {
      throw new Error('This user is already in your list');
    }
    throw error;
  }

  // Invalidate cache so next fetch gets fresh data
  invalidateCache(CACHE_KEYS.CONTACTS);

  return { message: 'Contact added successfully' };
}

// Legacy alias
export const addStudent = addContact;

export async function removeContact(contactId: string): Promise<{ message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await runWithLegacyFallback<unknown>(
    () => (supabase as any)
      .from('listener_reciters')
      .delete()
      .eq('listener_id', user.id)
      .eq('reciter_id', contactId),
    () => (supabase as any)
      .from('teacher_students')
      .delete()
      .eq('teacher_id', user.id)
      .eq('student_id', contactId),
  );

  // Invalidate cache
  invalidateCache(CACHE_KEYS.CONTACTS);

  return { message: 'Contact removed successfully' };
}

// Legacy alias
export const removeStudent = removeContact;

// ============ LISTENERS (was Teachers) ============

// Internal fetcher (no cache)
async function fetchListenersFromSupabase(): Promise<ContactListItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const data = await runWithLegacyFallback<any[]>(
    () => (supabase as any)
      .from('listener_reciters')
      .select(`
        id,
        created_at,
        listener:profiles!listener_id (
          id,
          name
        )
      `)
      .eq('reciter_id', user.id),
    () => (supabase as any)
      .from('teacher_students')
      .select(`
        id,
        created_at,
        listener:profiles!teacher_id (
          id,
          name
        )
      `)
      .eq('student_id', user.id),
  );

  return (data ?? []).map(row => {
    const listener = row.listener as { id: string; name: string };
    const nameParts = listener.name.split(' ');
    return {
      id: listener.id,
      student_id: listener.id,
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      email: '',
      added_at: row.created_at,
    };
  });
}

// Cached version
export async function getMyListeners(): Promise<ContactListItem[]> {
  return cacheFirst(CACHE_KEYS.LISTENERS, fetchListenersFromSupabase);
}

// Legacy alias
export const getMyTeachers = getMyListeners;

// ============ CLASSES ============

export interface ClassStudent {
  id: string;
  student_id: string;
  reciter_id?: string;
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
  reciter_id?: string;
}

export interface ClassData {
  id: string;
  date: string;
  day: string;
  notes?: string;
  performance?: string;
  teacher_id: string;
  listener_id?: string;
  listener_name?: string;
  is_published: boolean;
  assignments: ClassAssignment[];
  students?: ClassStudent[];
  mistake_count?: number;
  mistake_counts?: {
    hifz: number;
    sabqi: number;
    revision: number;
  };
}

// Internal fetcher for classes (no cache)
// view: 'listener' = sessions I created (I'm listening), 'reciter' = sessions I'm enrolled in (I'm reciting)
async function fetchClassesFromSupabase(view: 'listener' | 'reciter'): Promise<ClassData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (view === 'listener') {
    // Listener view: sessions I created.
    const data = await runWithLegacyFallback<any[]>(
      () => (supabase as any)
        .from('classes')
        .select(`
          *,
          assignments (*),
          mistake_occurrences (id),
          class_reciters (
            reciter_id,
            performance,
            reciter:profiles!reciter_id (id, user_code, name)
          )
        `)
        .eq('listener_id', user.id)
        .order('date', { ascending: false }),
      () => (supabase as any)
        .from('classes')
        .select(`
          *,
          assignments (*),
          mistake_occurrences (id),
          class_reciters:class_students (
            reciter_id:student_id,
            performance,
            reciter:profiles!student_id (id, student_id, name)
          )
        `)
        .or(`listener_id.eq.${user.id},teacher_id.eq.${user.id}`)
        .order('date', { ascending: false }),
    );

    // One-time fix: publish any unpublished classes (background, non-blocking)
    // @ts-ignore - Supabase type mismatch for dynamic table update
    supabase.from('classes').update({ is_published: true }).eq('listener_id', user.id).or('is_published.is.null,is_published.eq.false').then(() => {});

    return mapClassData(data ?? [], true);
  } else {
    // Reciter view: sessions I'm enrolled in as a reciter
    const data = await runWithLegacyFallback<any[]>(
      () => (supabase as any)
        .from('classes')
        .select(`
          *,
          assignments (*),
          mistake_occurrences (id),
          class_reciters!inner (reciter_id),
          listener:profiles!listener_id (name)
        `)
        .eq('class_reciters.reciter_id', user.id)
        .eq('is_published', true)
        .order('date', { ascending: false }),
      () => (supabase as any)
        .from('classes')
        .select(`
          *,
          assignments (*),
          mistake_occurrences (id),
          class_reciters:class_students!inner (reciter_id:student_id),
          listener:profiles!teacher_id (name)
        `)
        .eq('class_students.student_id', user.id)
        .eq('is_published', true)
        .order('date', { ascending: false }),
    );
    return ((data ?? []) as any[]).map(row => {
      return {
        id: row.id,
        date: row.date,
        day: row.day || '',
        notes: row.notes,
        performance: row.performance,
        teacher_id: row.listener_id || row.teacher_id,
        listener_id: row.listener_id,
        listener_name: row.listener?.name,
        is_published: row.is_published,
        mistake_count: Array.isArray(row.mistake_occurrences) ? row.mistake_occurrences.length : 0,
        assignments: (row.assignments ?? []).map((a: any) => ({
          id: a.id,
          type: a.type,
          start_surah: a.start_surah,
          end_surah: a.end_surah,
          start_ayah: a.start_ayah,
          end_ayah: a.end_ayah,
          student_id: a.reciter_id ?? a.student_id ?? null,
          reciter_id: a.reciter_id ?? a.student_id ?? null,
        })),
      };
    });
  }
}

// Cached version - instant loading from cache, background refresh
// view: 'listener' (sessions I created), 'reciter' (sessions I'm enrolled in), defaults to 'listener'
export async function getClasses(view?: 'listener' | 'reciter' | 'teacher' | 'student'): Promise<ClassData[]> {
  // Map legacy role params to new view params
  let resolvedView: 'listener' | 'reciter' = 'listener';
  if (view === 'reciter' || view === 'student') {
    resolvedView = 'reciter';
  } else if (view === 'listener' || view === 'teacher') {
    resolvedView = 'listener';
  }

  const cacheKey = resolvedView === 'listener' ? CACHE_KEYS.CLASSES_LISTENER : CACHE_KEYS.CLASSES_RECITER;
  return cacheFirst(cacheKey, () => fetchClassesFromSupabase(resolvedView));
}

export async function getClass(classId: string): Promise<ClassData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const data = await runWithLegacyFallback<any>(
    () => (supabase as any)
      .from('classes')
      .select(`
        *,
        assignments (*),
        class_reciters (
          reciter_id,
          performance,
          reciter:profiles!reciter_id (id, user_code, name)
        )
      `)
      .eq('id', classId)
      .single(),
    () => (supabase as any)
      .from('classes')
      .select(`
        *,
        assignments (*),
        class_reciters:class_students (
          reciter_id:student_id,
          performance,
          reciter:profiles!student_id (id, student_id, name)
        )
      `)
      .eq('id', classId)
      .single(),
  );

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
      listener_id: row.listener_id || row.teacher_id,
      is_published: row.is_published,
      mistake_count: Array.isArray(row.mistake_occurrences) ? row.mistake_occurrences.length : 0,
      assignments: (row.assignments ?? []).map((a: any) => ({
        id: a.id,
        type: a.type,
        start_surah: a.start_surah,
        end_surah: a.end_surah,
        start_ayah: a.start_ayah,
        end_ayah: a.end_ayah,
        student_id: a.reciter_id ?? a.student_id ?? null,
        reciter_id: a.reciter_id ?? a.student_id ?? null,
      })),
    };

    if (includeStudents && row.class_reciters) {
      classData.students = row.class_reciters.map((cs: any) => {
        const reciter = cs.reciter as { id: string; user_code?: string; student_id?: string; name: string };
        const nameParts = reciter.name.split(' ');
        return {
          id: reciter.id,
          student_id: userCode(reciter),
          reciter_id: reciter.id,
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
    reciter_id?: string;
  }[];
}): Promise<{ id: string; message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Create the session. Keep teacher_id dual-write while v2/v3 clients overlap.
  const newClass = await runWithLegacyFallback<{ id: string }>(
    () => (supabase as any)
      .from('classes')
      .insert({ listener_id: user.id, teacher_id: user.id, date: classData.date, day: classData.day, notes: classData.notes, is_published: true } as any)
      .select()
      .single(),
    () => (supabase as any)
      .from('classes')
      .insert({ teacher_id: user.id, listener_id: user.id, date: classData.date, day: classData.day, notes: classData.notes, is_published: true } as any)
      .select()
      .single(),
  );
  if (!newClass) throw new Error("Failed to create class");

  // Add reciters to class
  if (classData.student_ids.length > 0) {
    const classReciters = classData.student_ids.map(studentId => ({
      class_id: newClass.id,
      reciter_id: studentId,
    }));

    await runWithLegacyFallback<unknown>(
      () => (supabase as any).from('class_reciters').insert(classReciters as any),
      () => (supabase as any).from('class_students').insert(classReciters.map(row => ({
        class_id: row.class_id,
        student_id: row.reciter_id,
      })) as any),
    );
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
      reciter_id: a.reciter_id || a.student_id || null,
    }));

    await runWithLegacyFallback<unknown>(
      () => (supabase as any).from('assignments').insert(assignments as any),
      () => (supabase as any).from('assignments').insert(assignments.map(({ reciter_id, ...assignment }) => ({
        ...assignment,
        student_id: reciter_id,
      })) as any),
    );
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
  reciter_id?: string | null;
}>): Promise<{ message: string }> {
  const rows = assignments.map(a => ({
    class_id: classId,
    type: a.type,
    start_surah: a.start_surah,
    end_surah: a.end_surah,
    start_ayah: a.start_ayah,
    end_ayah: a.end_ayah,
    reciter_id: a.reciter_id || a.student_id || null,
  }));

  await runWithLegacyFallback<unknown>(
    () => (supabase as any).from('assignments').insert(rows as any),
    () => (supabase as any).from('assignments').insert(rows.map(({ reciter_id, ...row }) => ({
      ...row,
      student_id: reciter_id,
    })) as any),
  );

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
  // Update per-reciter performance on class_reciters.
  await runWithLegacyFallback<unknown>(
    () => (supabase as any)
      .from('class_reciters')
      .update({ performance })
      .eq('class_id', classId)
      .eq('reciter_id', studentId),
    () => (supabase as any)
      .from('class_students')
      .update({ performance })
      .eq('class_id', classId)
      .eq('student_id', studentId),
  );

  // Also update class-level performance for backward compatibility
  await (supabase as any).from('classes').update({ performance }).eq('id', classId);

  return { message: 'Reciter performance updated' };
}

export async function addClassStudents(classId: string, studentIds: string[]): Promise<{ message: string }> {
  const classReciters = studentIds.map(studentId => ({
    class_id: classId,
    reciter_id: studentId,
  }));

  await runWithLegacyFallback<unknown>(
    () => (supabase as any).from('class_reciters').insert(classReciters as any),
    () => (supabase as any).from('class_students').insert(classReciters.map(row => ({
      class_id: row.class_id,
      student_id: row.reciter_id,
    })) as any),
  );
  return { message: 'Reciters added successfully' };
}

export async function removeClassStudent(classId: string, studentId: string): Promise<{ message: string }> {
  await runWithLegacyFallback<unknown>(
    () => (supabase as any)
      .from('class_reciters')
      .delete()
      .eq('class_id', classId)
      .eq('reciter_id', studentId),
    () => (supabase as any)
      .from('class_students')
      .delete()
      .eq('class_id', classId)
      .eq('student_id', studentId),
  );
  return { message: 'Reciter removed from session' };
}

// ============ MISTAKES ============

export interface MistakeData {
  id: string;
  student_id: string;
  reciter_id?: string;
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

  // A missing reciter argument means "my mistakes", never "every mistake RLS
  // lets me read". Listeners can read their reciters' rows, so an unfiltered
  // query would leak those rows into the listener's personal reader/review UI.
  const targetReciterId = studentId ?? user.id;

  const data = await runWithLegacyFallback<any[]>(
    () => {
      let query = (supabase as any).from('mistakes').select('*').eq('reciter_id', targetReciterId);
      if (surahNumber) query = query.eq('surah_number', surahNumber);
      return query.order('error_count', { ascending: false });
    },
    () => {
      let query = (supabase as any).from('mistakes').select('*').eq('student_id', targetReciterId);
      if (surahNumber) query = query.eq('surah_number', surahNumber);
      return query.order('error_count', { ascending: false });
    },
  );

  return (data ?? []).map((m: any) => ({
    ...m,
    student_id: m.reciter_id ?? m.student_id,
    reciter_id: m.reciter_id ?? m.student_id,
  }));
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

  const targetReciterId = studentId ?? user.id;

  const data = await runWithLegacyFallback<any[]>(
    () => {
      let query = (supabase as any)
        .from('mistakes')
        .select(`
          *,
          mistake_occurrences (
            class_id,
            classes (date, day)
          )
        `)
        .eq('reciter_id', targetReciterId);
      if (surahNumber) query = query.eq('surah_number', surahNumber);
      return query.order('error_count', { ascending: false });
    },
    () => {
      let query = (supabase as any)
        .from('mistakes')
        .select(`
          *,
          mistake_occurrences (
            class_id,
            classes (date, day)
          )
        `)
        .eq('student_id', targetReciterId);
      if (surahNumber) query = query.eq('surah_number', surahNumber);
      return query.order('error_count', { ascending: false });
    },
  );

  // Transform the data to match expected format
  return (data ?? []).map((mistake: any) => ({
    id: mistake.id,
    student_id: mistake.reciter_id ?? mistake.student_id,
    reciter_id: mistake.reciter_id ?? mistake.student_id,
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
    .eq('reciter_id', studentId)
    .eq('surah_number', mistake.surah_number)
    .eq('ayah_number', mistake.ayah_number)
    .eq('word_index', mistake.word_index);

  if (mistake.char_index !== undefined) {
    query = query.eq('char_index', mistake.char_index);
  } else {
    query = query.is('char_index', null);
  }

  let existingResult = await query.maybeSingle() as { data: { id: string; error_count: number } | null; error: any };
  if (existingResult.error && isSchemaCompatibilityError(existingResult.error)) {
    query = (supabase as any)
      .from('mistakes')
      .select('id, error_count')
      .eq('student_id', studentId)
      .eq('surah_number', mistake.surah_number)
      .eq('ayah_number', mistake.ayah_number)
      .eq('word_index', mistake.word_index);
    query = mistake.char_index !== undefined
      ? query.eq('char_index', mistake.char_index)
      : query.is('char_index', null);
    existingResult = await query.maybeSingle() as { data: { id: string; error_count: number } | null; error: any };
  }
  const existing = existingResult.data;

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
    const newMistake = await runWithLegacyFallback<{ id: string }>(
      () => (supabase as any)
        .from('mistakes')
        .insert({ reciter_id: studentId, surah_number: mistake.surah_number, ayah_number: mistake.ayah_number, word_index: mistake.word_index, word_text: mistake.word_text, char_index: mistake.char_index, error_count: 1 } as any)
        .select()
        .single(),
      () => (supabase as any)
        .from('mistakes')
        .insert({ student_id: studentId, surah_number: mistake.surah_number, ayah_number: mistake.ayah_number, word_index: mistake.word_index, word_text: mistake.word_text, char_index: mistake.char_index, error_count: 1 } as any)
        .select()
        .single(),
    );
    if (!newMistake) throw new Error("Failed to create mistake");

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

// Unified stats — returns both listener and reciter stats for the current user
export async function getStats(view?: 'listener' | 'reciter' | 'teacher' | 'student') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Map legacy params
  const resolvedView = (view === 'teacher') ? 'listener' : (view === 'student') ? 'reciter' : (view || 'listener');

  if (resolvedView === 'listener') {
    // Listener stats: contacts + sessions I created
    const [contactsCount, classesResult] = await Promise.all([
      runWithLegacyFallback<number>(
        async () => {
          const result = await (supabase as any).from('listener_reciters').select('id', { count: 'exact', head: true }).eq('listener_id', user.id);
          return { data: result.count ?? 0, error: result.error };
        },
        async () => {
          const result = await (supabase as any).from('teacher_students').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id);
          return { data: result.count ?? 0, error: result.error };
        },
      ),
      (supabase as any).from('classes').select('id', { count: 'exact' }).eq('listener_id', user.id),
    ]);

    return {
      total_students: contactsCount ?? 0,
      total_classes: classesResult.count ?? 0,
    };
  } else {
    // Reciter stats: sessions I'm enrolled in + my mistakes
    const [classesCount, mistakes, repeatedMistakes, allMistakes, topRepeatedMistakes] = await Promise.all([
      runWithLegacyFallback<number>(
        async () => {
          const result = await (supabase as any).from('class_reciters').select('id', { count: 'exact', head: true }).eq('reciter_id', user.id);
          return { data: result.count ?? 0, error: result.error };
        },
        async () => {
          const result = await (supabase as any).from('class_students').select('id', { count: 'exact', head: true }).eq('student_id', user.id);
          return { data: result.count ?? 0, error: result.error };
        },
      ),
      getMistakes(undefined, user.id),
      runWithLegacyFallback<number>(
        async () => {
          const result = await (supabase as any).from('mistakes').select('id', { count: 'exact', head: true }).eq('reciter_id', user.id).gt('error_count', 1);
          return { data: result.count ?? 0, error: result.error };
        },
        async () => {
          const result = await (supabase as any).from('mistakes').select('id', { count: 'exact', head: true }).eq('student_id', user.id).gt('error_count', 1);
          return { data: result.count ?? 0, error: result.error };
        },
      ),
      getMistakes(undefined, user.id),
      runWithLegacyFallback<any[]>(
        () => (supabase as any).from('mistakes').select('id, surah_number, ayah_number, word_text, error_count').eq('reciter_id', user.id).gt('error_count', 1).order('error_count', { ascending: false }).limit(5),
        () => (supabase as any).from('mistakes').select('id, surah_number, ayah_number, word_text, error_count').eq('student_id', user.id).gt('error_count', 1).order('error_count', { ascending: false }).limit(5),
      ),
    ]);

    const surahCounts = new Map<number, number>();
    for (const row of (allMistakes ?? []) as { surah_number: number }[]) {
      surahCounts.set(row.surah_number, (surahCounts.get(row.surah_number) || 0) + 1);
    }
    const mistakes_by_surah = Array.from(surahCounts.entries())
      .map(([surah_number, count]) => ({ surah_number, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total_classes: classesCount ?? 0,
      total_mistakes: mistakes.length,
      repeated_mistakes: repeatedMistakes ?? 0,
      mistakes_by_surah,
      top_repeated_mistakes: (topRepeatedMistakes ?? []) as { id: string; surah_number: number; ayah_number: number; word_text: string; error_count: number }[],
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
  const classStudentsData = await runWithLegacyFallback<any[]>(
    () => (supabase as any)
      .from('class_reciters')
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
            end_ayah,
            reciter_id
          )
        )
      `)
      .eq('reciter_id', studentId)
      .limit(20),
    () => (supabase as any)
      .from('class_students')
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
            end_ayah,
            student_id
          )
        )
      `)
      .eq('student_id', studentId)
      .limit(20),
  );

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
    throw new Error('Reciter not found');
  }
  const profileData = profile as any;

  // Get student's classes (as teacher)
  const classStudentsRaw = await runWithLegacyFallback<any[]>(
    () => (supabase as any)
      .from('class_reciters')
      .select(`
        class_id,
        classes (
          id,
          date,
          day,
          notes,
          performance,
          listener_id,
          teacher_id,
          is_published,
          assignments (*)
        )
      `)
      .eq('reciter_id', studentId),
    () => (supabase as any)
      .from('class_students')
      .select(`
        class_id,
        classes (
          id,
          date,
          day,
          notes,
          performance,
          listener_id,
          teacher_id,
          is_published,
          assignments (*)
        )
      `)
      .eq('student_id', studentId),
  );
  const classStudents = (classStudentsRaw ?? []) as any[];

  // Get student's mistakes WITH occurrences (links mistakes to classes)
  const mistakesRaw = await runWithLegacyFallback<any[]>(
    () => (supabase as any)
      .from('mistakes')
      .select('*, mistake_occurrences(id, class_id, occurred_at)')
      .eq('reciter_id', studentId),
    () => (supabase as any)
      .from('mistakes')
      .select('*, mistake_occurrences(id, class_id, occurred_at)')
      .eq('student_id', studentId),
  );
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
    student_id: profileData.user_code || profileData.student_id || '',
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
        .filter((a: any) => !(a.reciter_id ?? a.student_id) || (a.reciter_id ?? a.student_id) === studentId)
        .map((a: any) => ({
          type: a.type,
          start_surah: a.start_surah,
          end_surah: a.end_surah,
          start_ayah: a.start_ayah,
          end_ayah: a.end_ayah,
          student_id: a.reciter_id ?? a.student_id ?? null,
          reciter_id: a.reciter_id ?? a.student_id ?? null,
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

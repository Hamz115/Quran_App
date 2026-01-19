# Supabase Frontend Integration Reference

Complete technical reference for the React frontend Supabase integration.

---

## Table of Contents

1. [Configuration](#1-configuration)
2. [Supabase Client](#2-supabase-client)
3. [Database Types](#3-database-types)
4. [AuthContext Implementation](#4-authcontext-implementation)
5. [API Functions](#5-api-functions)
6. [Type Changes](#6-type-changes)
7. [File Structure](#7-file-structure)

---

## 1. Configuration

### Environment Variables

**File: `.env.local` (DO NOT COMMIT)**
```env
VITE_SUPABASE_URL=https://qwfnbkkegbhwxxjvyhzl.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

**File: `.env.example` (template)**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Package Dependencies

Added to `package.json`:
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

Install command:
```bash
npm install @supabase/supabase-js
```

---

## 2. Supabase Client

**File: `src/lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env.local file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage,
  },
});

// Helper to get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}
```

**Key Features:**
- `autoRefreshToken: true` - Automatically refreshes tokens before expiry
- `persistSession: true` - Stores session in localStorage
- `detectSessionInUrl: true` - Handles OAuth redirects
- Typed with `Database` interface for autocomplete

---

## 3. Database Types

**File: `src/lib/database.types.ts`**

```typescript
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
export type ClassType = 'regular' | 'test';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: UserRole;
          student_id: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      teacher_students: { /* ... */ };
      classes: { /* ... */ };
      class_students: { /* ... */ };
      assignments: { /* ... */ };
      mistakes: { /* ... */ };
      mistake_occurrences: { /* ... */ };
    };
  };
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Class = Database['public']['Tables']['classes']['Row'];
export type Mistake = Database['public']['Tables']['mistakes']['Row'];
// ... etc
```

---

## 4. AuthContext Implementation

**File: `src/contexts/AuthContext.tsx`**

### Key Changes from Custom JWT to Supabase Auth

**Before (Custom JWT):**
```typescript
// Token stored manually in localStorage
const token = api.getAccessToken();
const userData = await api.getCurrentUser();
```

**After (Supabase Auth):**
```typescript
// Session managed automatically by Supabase
const { data: { session } } = await supabase.auth.getSession();
const profile = await fetchUserProfile(session.user.id);
```

### Full Implementation

```typescript
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

// Fetch profile from profiles table
async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  // Map Supabase profile to User type
  const nameParts = data.name.split(' ');
  return {
    id: data.id,
    student_id: data.student_id || '',
    username: data.email.split('@')[0],
    email: data.email,
    first_name: nameParts[0] || '',
    last_name: nameParts.slice(1).join(' ') || '',
    role: data.role,
    is_verified: data.is_verified,
    created_at: data.created_at,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setUser(profile);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signup = async (data) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: `${data.first_name} ${data.last_name}`,
          role: data.role,
        },
      },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // ... rest of provider
}
```

---

## 5. API Functions

### Supabase API Module

**File: `src/lib/supabase-api.ts`**

#### Students

```typescript
// Get teacher's students
export async function getMyStudents(): Promise<StudentListItem[]> {
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
    .eq('teacher_id', user.id);

  if (error) throw new Error(error.message);
  return mapStudentData(data);
}

// Add student by email
export async function addStudent(email: string): Promise<{ message: string }> {
  const { data: { user } } = await supabase.auth.getUser();

  // Find student
  const { data: student } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!student) throw new Error('No user found with that email');

  // Add relationship
  await supabase.from('teacher_students').insert({
    teacher_id: user.id,
    student_id: student.id,
  });

  return { message: 'Student added successfully' };
}
```

#### Classes

```typescript
// Get classes with role-based filtering
export async function getClasses(role?: 'teacher' | 'student'): Promise<ClassData[]> {
  const { data: { user } } = await supabase.auth.getUser();

  if (role === 'teacher') {
    const { data } = await supabase
      .from('classes')
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

    return mapClassData(data);
  } else {
    // Students see only published classes they're enrolled in
    const { data } = await supabase
      .from('classes')
      .select(`*, assignments (*), class_students!inner (student_id)`)
      .eq('class_students.student_id', user.id)
      .eq('is_published', true)
      .order('date', { ascending: false });

    return mapClassData(data);
  }
}

// Create class with students and assignments
export async function createClass(classData): Promise<{ id: string }> {
  // 1. Create class
  const { data: newClass } = await supabase
    .from('classes')
    .insert({ teacher_id, date, day, notes, class_type })
    .select()
    .single();

  // 2. Add students
  await supabase.from('class_students').insert(
    classData.student_ids.map(id => ({ class_id: newClass.id, student_id: id }))
  );

  // 3. Add assignments
  await supabase.from('assignments').insert(
    classData.assignments.map(a => ({ class_id: newClass.id, ...a }))
  );

  return { id: newClass.id };
}
```

#### Mistakes

```typescript
// Get mistakes (RLS handles authorization)
export async function getMistakes(surahNumber?: number, studentId?: string): Promise<MistakeData[]> {
  let query = supabase.from('mistakes').select('*');

  if (studentId) query = query.eq('student_id', studentId);
  if (surahNumber) query = query.eq('surah_number', surahNumber);

  const { data, error } = await query.order('error_count', { ascending: false });
  return data ?? [];
}

// Add mistake (upsert logic)
export async function addMistake(mistake): Promise<{ id: string; error_count: number }> {
  // Check for existing mistake
  const { data: existing } = await supabase
    .from('mistakes')
    .select('id, error_count')
    .eq('student_id', mistake.student_id)
    .eq('surah_number', mistake.surah_number)
    .eq('ayah_number', mistake.ayah_number)
    .eq('word_index', mistake.word_index)
    .single();

  if (existing) {
    // Increment error count
    await supabase
      .from('mistakes')
      .update({ error_count: existing.error_count + 1 })
      .eq('id', existing.id);
    return { id: existing.id, error_count: existing.error_count + 1 };
  } else {
    // Create new mistake
    const { data } = await supabase
      .from('mistakes')
      .insert({ ...mistake, error_count: 1 })
      .select()
      .single();
    return { id: data.id, error_count: 1 };
  }
}
```

### Quran API Module (Local FastAPI)

**File: `src/lib/quran-api.ts`**

```typescript
const QURAN_API_BASE = 'http://localhost:8000/api';

export async function getSurahs(): Promise<Surah[]> {
  const res = await fetch(`${QURAN_API_BASE}/surahs`);
  const data = await res.json();
  return data.data;
}

export async function getQuranPageWords(pageNumber: number): Promise<QuranPageWord[]> {
  const res = await fetch(`${QURAN_API_BASE}/quran/page/${pageNumber}`);
  const data = await res.json();
  return data.data;
}
```

---

## 6. Type Changes

### Before (SQLite Integer IDs)

```typescript
export interface User {
  id: number;  // SQLite auto-increment
  // ...
}

export interface StudentListItem {
  id: number;
  // ...
}
```

### After (Supabase UUID Strings)

```typescript
export interface User {
  id: string;  // UUID: "550e8400-e29b-41d4-a716-446655440000"
  // ...
}

export interface StudentListItem {
  id: string;
  // ...
}
```

**Note:** Quran data types remain unchanged (still use numbers from local quran.db).

---

## 7. File Structure

```
quran_frontend/src/
├── lib/                          # NEW: Library modules
│   ├── supabase.ts               # Supabase client
│   ├── database.types.ts         # TypeScript types for Supabase
│   ├── supabase-api.ts           # Supabase data functions
│   └── quran-api.ts              # Local Quran data functions
│
├── contexts/
│   └── AuthContext.tsx           # MODIFIED: Now uses Supabase Auth
│
├── pages/
│   └── Login.tsx                 # MODIFIED: Email-only login
│
├── types/
│   └── index.ts                  # MODIFIED: IDs changed to strings
│
└── api.ts                        # MODIFIED: Facade re-exporting new modules
```

---

## References

- Implementation Journey: [Implementation_Journey.md](./Implementation_Journey.md)
- Supabase Reference: [Supabase_Reference.md](./Supabase_Reference.md)
- Supabase JS Client Docs: https://supabase.com/docs/reference/javascript/introduction

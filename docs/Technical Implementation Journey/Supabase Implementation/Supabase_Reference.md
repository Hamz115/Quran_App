# Supabase Reference

Complete reference for all Supabase database objects in QuranTrack.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Tables](#tables)
3. [Row Level Security Policies](#row-level-security-policies)
4. [Database Functions](#database-functions)
5. [Database Triggers](#database-triggers)
6. [Full SQL Code](#full-sql-code)

---

## Quick Reference

### Tables Summary

| Table | Purpose | RLS | Rows (est.) |
|-------|---------|-----|-------------|
| `profiles` | User profiles (extends auth.users) | Yes | Per user |
| `teacher_students` | Teacher-student relationships | Yes | Per relationship |
| `classes` | Class sessions | Yes | ~672 |
| `class_students` | Students in each class | Yes | ~900 |
| `assignments` | Hifz, Sabqi, Revision portions | Yes | ~2,700 |
| `mistakes` | Global mistakes per student | Yes | ~5,000-8,000 |
| `mistake_occurrences` | When mistakes occurred | Yes | ~12,000-18,000 |

### Policies Summary

| Table | Policy Count | Access Pattern |
|-------|--------------|----------------|
| `profiles` | 4 | Users see own + connected users |
| `teacher_students` | 2 | Teachers manage, students view |
| `classes` | 2 | Teachers manage, students view published |
| `class_students` | 2 | Teachers manage, students view own |
| `assignments` | 2 | Teachers manage, students view |
| `mistakes` | 2 | Teachers manage for students, students view own |
| `mistake_occurrences` | 2 | Teachers manage, students view own |

### Functions Summary

| Function | Purpose | Trigger |
|----------|---------|---------|
| `handle_new_user()` | Create profile on signup | `on_auth_user_created` |
| `update_updated_at()` | Auto-update timestamp | Multiple tables |

### Triggers Summary

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` |
| `update_profiles_updated_at` | `profiles` | BEFORE UPDATE | `update_updated_at()` |
| `update_classes_updated_at` | `classes` | BEFORE UPDATE | `update_updated_at()` |
| `update_mistakes_updated_at` | `mistakes` | BEFORE UPDATE | `update_updated_at()` |

---

## Tables

### 1. profiles

Extends Supabase `auth.users` with application-specific data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | - | Primary key, references `auth.users(id)` |
| `email` | TEXT | No | - | User's email address |
| `name` | TEXT | No | - | Display name |
| `role` | TEXT | No | - | Either `'teacher'` or `'student'` |
| `student_id` | TEXT | Yes | - | Unique student ID (`STU-XXXXXX` format) |
| `is_verified` | BOOLEAN | No | `false` | Whether account is verified |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | When profile was created |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | When profile was last updated |

**Constraints:**
- Primary key on `id`
- Foreign key to `auth.users(id)` with CASCADE delete
- Check constraint: `role IN ('teacher', 'student')`
- Unique constraint on `student_id`

---

### 2. teacher_students

Junction table for teacher-student relationships.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `teacher_id` | UUID | No | - | References `profiles(id)` |
| `student_id` | UUID | No | - | References `profiles(id)` |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | When relationship was created |

**Constraints:**
- Primary key on `id`
- Foreign key to `profiles(id)` for both teacher and student (CASCADE delete)
- Unique constraint on `(teacher_id, student_id)` - prevents duplicates

---

### 3. classes

Class/halaqah sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `teacher_id` | UUID | No | - | References `profiles(id)` |
| `date` | DATE | No | - | Date of the class |
| `day` | TEXT | Yes | - | Day name (Saturday, Wednesday, etc.) |
| `notes` | TEXT | Yes | - | Teacher's notes |
| `performance` | TEXT | Yes | - | Overall performance rating |
| `is_published` | BOOLEAN | No | `false` | Whether visible to students |
| `class_type` | TEXT | No | `'regular'` | Either `'regular'` or `'test'` |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | When class was created |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | When class was last updated |

**Constraints:**
- Primary key on `id`
- Foreign key to `profiles(id)` (CASCADE delete)
- Check constraint: `performance IN ('Excellent', 'Very Good', 'Good', 'Needs Work')`
- Check constraint: `class_type IN ('regular', 'test')`

---

### 4. class_students

Junction table for students in each class.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `class_id` | UUID | No | - | References `classes(id)` |
| `student_id` | UUID | No | - | References `profiles(id)` |

**Constraints:**
- Primary key on `id`
- Foreign key to `classes(id)` (CASCADE delete)
- Foreign key to `profiles(id)` (CASCADE delete)
- Unique constraint on `(class_id, student_id)`

---

### 5. assignments

Portion assignments within a class (Hifz, Sabqi, Revision/Manzil).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `class_id` | UUID | No | - | References `classes(id)` |
| `type` | TEXT | No | - | Assignment type |
| `start_surah` | INTEGER | No | - | Starting surah number (1-114) |
| `end_surah` | INTEGER | No | - | Ending surah number (1-114) |
| `start_ayah` | INTEGER | Yes | - | Starting ayah number |
| `end_ayah` | INTEGER | Yes | - | Ending ayah number |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | When assignment was created |

**Constraints:**
- Primary key on `id`
- Foreign key to `classes(id)` (CASCADE delete)
- Check constraint: `type IN ('hifz', 'sabqi', 'revision')`

---

### 6. mistakes

Global mistake records per student (aggregated across all classes).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `student_id` | UUID | No | - | References `profiles(id)` |
| `surah_number` | INTEGER | No | - | Surah where mistake occurred (1-114) |
| `ayah_number` | INTEGER | No | - | Ayah where mistake occurred |
| `word_index` | INTEGER | No | - | Word position in ayah (0-based) |
| `word_text` | TEXT | No | - | The Arabic word text |
| `char_index` | INTEGER | Yes | - | Character index (null = whole word) |
| `error_count` | INTEGER | No | `1` | Total times this mistake was made |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | When first recorded |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | When last updated |

**Constraints:**
- Primary key on `id`
- Foreign key to `profiles(id)` (CASCADE delete)
- Unique index on `(student_id, surah_number, ayah_number, word_index, COALESCE(char_index, -1))`

**Note:** The unique index uses `COALESCE(char_index, -1)` because PostgreSQL treats NULL as distinct, but we want `(student_id, surah, ayah, word, NULL)` to be unique.

---

### 7. mistake_occurrences

Records when each mistake occurred (links mistakes to classes).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `mistake_id` | UUID | No | - | References `mistakes(id)` |
| `class_id` | UUID | No | - | References `classes(id)` |
| `occurred_at` | TIMESTAMPTZ | No | `NOW()` | When mistake was recorded |

**Constraints:**
- Primary key on `id`
- Foreign key to `mistakes(id)` (CASCADE delete)
- Foreign key to `classes(id)` (CASCADE delete)

---

## Row Level Security Policies

### profiles Policies

#### 1. "Users can view own profile"
```sql
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```
**Effect:** Users can only SELECT their own profile row.

#### 2. "Users can update own profile"
```sql
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```
**Effect:** Users can only UPDATE their own profile row.

#### 3. "Teachers can view their students profiles"
```sql
CREATE POLICY "Teachers can view their students profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.student_id = profiles.id
    )
);
```
**Effect:** Teachers can SELECT profiles of students they teach.

#### 4. "Students can view their teachers profiles"
```sql
CREATE POLICY "Students can view their teachers profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.student_id = auth.uid()
        AND ts.teacher_id = profiles.id
    )
);
```
**Effect:** Students can SELECT profiles of teachers who teach them.

---

### teacher_students Policies

#### 1. "Teachers can manage their students"
```sql
CREATE POLICY "Teachers can manage their students"
ON teacher_students FOR ALL
USING (teacher_id = auth.uid());
```
**Effect:** Teachers can SELECT, INSERT, UPDATE, DELETE their own student relationships.

#### 2. "Students can view their teachers"
```sql
CREATE POLICY "Students can view their teachers"
ON teacher_students FOR SELECT
USING (student_id = auth.uid());
```
**Effect:** Students can SELECT relationships where they are the student.

---

### classes Policies

#### 1. "Teachers can manage own classes"
```sql
CREATE POLICY "Teachers can manage own classes"
ON classes FOR ALL
USING (teacher_id = auth.uid());
```
**Effect:** Teachers can SELECT, INSERT, UPDATE, DELETE their own classes.

#### 2. "Students can view their classes"
```sql
CREATE POLICY "Students can view their classes"
ON classes FOR SELECT
USING (
    is_published = true
    AND EXISTS (
        SELECT 1 FROM class_students cs
        WHERE cs.class_id = classes.id
        AND cs.student_id = auth.uid()
    )
);
```
**Effect:** Students can SELECT only published classes where they are a participant.

---

### class_students Policies

#### 1. "Teachers can manage class students"
```sql
CREATE POLICY "Teachers can manage class students"
ON class_students FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = class_students.class_id
        AND c.teacher_id = auth.uid()
    )
);
```
**Effect:** Teachers can manage student assignments for their own classes.

#### 2. "Students can view own class associations"
```sql
CREATE POLICY "Students can view own class associations"
ON class_students FOR SELECT
USING (student_id = auth.uid());
```
**Effect:** Students can SELECT their own class associations.

---

### assignments Policies

#### 1. "Teachers can manage assignments"
```sql
CREATE POLICY "Teachers can manage assignments"
ON assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = assignments.class_id
        AND c.teacher_id = auth.uid()
    )
);
```
**Effect:** Teachers can manage assignments for their own classes.

#### 2. "Students can view their assignments"
```sql
CREATE POLICY "Students can view their assignments"
ON assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM classes c
        JOIN class_students cs ON cs.class_id = c.id
        WHERE c.id = assignments.class_id
        AND cs.student_id = auth.uid()
        AND c.is_published = true
    )
);
```
**Effect:** Students can SELECT assignments for published classes they participate in.

---

### mistakes Policies

#### 1. "Teachers can manage student mistakes"
```sql
CREATE POLICY "Teachers can manage student mistakes"
ON mistakes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.student_id = mistakes.student_id
    )
);
```
**Effect:** Teachers can manage mistakes for students they teach.

#### 2. "Students can view own mistakes"
```sql
CREATE POLICY "Students can view own mistakes"
ON mistakes FOR SELECT
USING (student_id = auth.uid());
```
**Effect:** Students can SELECT their own mistakes.

---

### mistake_occurrences Policies

#### 1. "Teachers can manage mistake occurrences"
```sql
CREATE POLICY "Teachers can manage mistake occurrences"
ON mistake_occurrences FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM mistakes m
        JOIN teacher_students ts ON ts.student_id = m.student_id
        WHERE m.id = mistake_occurrences.mistake_id
        AND ts.teacher_id = auth.uid()
    )
);
```
**Effect:** Teachers can manage occurrences for mistakes of students they teach.

#### 2. "Students can view own mistake occurrences"
```sql
CREATE POLICY "Students can view own mistake occurrences"
ON mistake_occurrences FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM mistakes m
        WHERE m.id = mistake_occurrences.mistake_id
        AND m.student_id = auth.uid()
    )
);
```
**Effect:** Students can SELECT occurrences of their own mistakes.

---

## Database Functions

### handle_new_user()

Auto-creates a profile when a new user signs up via Supabase Auth.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, is_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Behavior:**
- Extracts `name` from user metadata, or uses email prefix (before @)
- Extracts `role` from user metadata, or defaults to `'student'`
- Sets `is_verified` to `false` (admin must verify)

**SECURITY DEFINER:** Runs with the privileges of the function owner (bypasses RLS).

---

### update_updated_at()

Auto-updates the `updated_at` timestamp when a row is modified.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Behavior:**
- Sets `updated_at` to current timestamp
- Returns the modified row

---

## Database Triggers

### on_auth_user_created

Fires after a new user is inserted into `auth.users`.

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

**Effect:** Automatically creates a profile entry for every new user.

---

### update_profiles_updated_at

Fires before a profile is updated.

```sql
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
```

---

### update_classes_updated_at

Fires before a class is updated.

```sql
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
```

---

### update_mistakes_updated_at

Fires before a mistake is updated.

```sql
CREATE TRIGGER update_mistakes_updated_at
    BEFORE UPDATE ON mistakes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
```

---

## Full SQL Code

### Complete Schema Creation Script

```sql
-- QuranTrack Database Schema for Supabase
-- Run this in the SQL Editor to create all tables

-- 1. PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    student_id TEXT UNIQUE,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TEACHER-STUDENT RELATIONSHIPS
CREATE TABLE IF NOT EXISTS teacher_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, student_id)
);

-- 3. CLASSES
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    day TEXT,
    notes TEXT,
    performance TEXT CHECK (performance IN ('Excellent', 'Very Good', 'Good', 'Needs Work')),
    is_published BOOLEAN DEFAULT false,
    class_type TEXT DEFAULT 'regular' CHECK (class_type IN ('regular', 'test')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLASS-STUDENT JUNCTION
CREATE TABLE IF NOT EXISTS class_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE(class_id, student_id)
);

-- 5. ASSIGNMENTS
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('hifz', 'sabqi', 'revision')),
    start_surah INTEGER NOT NULL,
    end_surah INTEGER NOT NULL,
    start_ayah INTEGER,
    end_ayah INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MISTAKES (Global per student)
CREATE TABLE IF NOT EXISTS mistakes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    surah_number INTEGER NOT NULL,
    ayah_number INTEGER NOT NULL,
    word_index INTEGER NOT NULL,
    word_text TEXT NOT NULL,
    char_index INTEGER,
    error_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MISTAKE OCCURRENCES
CREATE TABLE IF NOT EXISTS mistake_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mistake_id UUID NOT NULL REFERENCES mistakes(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint for mistakes
CREATE UNIQUE INDEX IF NOT EXISTS mistakes_unique_idx
ON mistakes(student_id, surah_number, ayah_number, word_index, COALESCE(char_index, -1));
```

---

### Complete RLS Policies Script

```sql
-- QuranTrack Row Level Security (RLS) Policies
-- Run this after creating the tables

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistake_occurrences ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================

CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Teachers can view their students profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.student_id = profiles.id
    )
);

CREATE POLICY "Students can view their teachers profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.student_id = auth.uid()
        AND ts.teacher_id = profiles.id
    )
);

-- =====================================================
-- TEACHER_STUDENTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Teachers can manage their students"
ON teacher_students FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their teachers"
ON teacher_students FOR SELECT
USING (student_id = auth.uid());

-- =====================================================
-- CLASSES TABLE POLICIES
-- =====================================================

CREATE POLICY "Teachers can manage own classes"
ON classes FOR ALL
USING (teacher_id = auth.uid());

CREATE POLICY "Students can view their classes"
ON classes FOR SELECT
USING (
    is_published = true
    AND EXISTS (
        SELECT 1 FROM class_students cs
        WHERE cs.class_id = classes.id
        AND cs.student_id = auth.uid()
    )
);

-- =====================================================
-- CLASS_STUDENTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Teachers can manage class students"
ON class_students FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = class_students.class_id
        AND c.teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view own class associations"
ON class_students FOR SELECT
USING (student_id = auth.uid());

-- =====================================================
-- ASSIGNMENTS TABLE POLICIES
-- =====================================================

CREATE POLICY "Teachers can manage assignments"
ON assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = assignments.class_id
        AND c.teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view their assignments"
ON assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM classes c
        JOIN class_students cs ON cs.class_id = c.id
        WHERE c.id = assignments.class_id
        AND cs.student_id = auth.uid()
        AND c.is_published = true
    )
);

-- =====================================================
-- MISTAKES TABLE POLICIES
-- =====================================================

CREATE POLICY "Teachers can manage student mistakes"
ON mistakes FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.student_id = mistakes.student_id
    )
);

CREATE POLICY "Students can view own mistakes"
ON mistakes FOR SELECT
USING (student_id = auth.uid());

-- =====================================================
-- MISTAKE_OCCURRENCES TABLE POLICIES
-- =====================================================

CREATE POLICY "Teachers can manage mistake occurrences"
ON mistake_occurrences FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM mistakes m
        JOIN teacher_students ts ON ts.student_id = m.student_id
        WHERE m.id = mistake_occurrences.mistake_id
        AND ts.teacher_id = auth.uid()
    )
);

CREATE POLICY "Students can view own mistake occurrences"
ON mistake_occurrences FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM mistakes m
        WHERE m.id = mistake_occurrences.mistake_id
        AND m.student_id = auth.uid()
    )
);
```

---

### Complete Triggers Script

```sql
-- QuranTrack Profile Auto-Creation Trigger
-- Creates a profile automatically when a user signs up through Supabase Auth

-- =====================================================
-- FUNCTION: Create profile on signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, is_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
        false
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Run after new user created in auth.users
-- =====================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCTION: Update profile timestamp on changes
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_mistakes_updated_at ON mistakes;
CREATE TRIGGER update_mistakes_updated_at
    BEFORE UPDATE ON mistakes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
```

---

## References

- Implementation Journey: [Implementation_Journey.md](./Implementation_Journey.md)
- Architecture Doc: [Supabase_Migration_Architecture.md](../../Architecture/Supabase_Migration_Architecture.md)
- Supabase Dashboard: https://supabase.com/dashboard/project/qwfnbkkegbhwxxjvyhzl
- Supabase Docs: https://supabase.com/docs

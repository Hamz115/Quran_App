-- ============================================================
-- QuranTrack v2.0.0 — Supabase Migration
-- Remove teacher/student roles → unified listener/reciter model
--
-- RUN THIS IN SUPABASE SQL EDITOR
-- Order matters! Execute top-to-bottom.
-- ============================================================

-- ============================================================
-- STEP 1: Update handle_new_user() trigger function
-- Must be first so new signups work without role
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role, student_id, is_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NULL,  -- role no longer required
        'USR-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
        true   -- everyone is verified now
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 2: Add listener_id to classes table
-- ============================================================
ALTER TABLE classes ADD COLUMN IF NOT EXISTS listener_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Backfill from teacher_id
UPDATE classes SET listener_id = teacher_id WHERE listener_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE classes ALTER COLUMN listener_id SET NOT NULL;

-- ============================================================
-- STEP 3: Remove role CHECK constraint + make nullable
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ALTER COLUMN role DROP NOT NULL;

-- ============================================================
-- STEP 4: Set all existing classes to published
-- (No more role-gated visibility)
-- ============================================================
UPDATE classes SET is_published = true WHERE is_published = false;

-- ============================================================
-- STEP 5: Update is_class_teacher() to support both columns
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_class_teacher(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_class_id
    AND (teacher_id = auth.uid() OR listener_id = auth.uid())
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_class_teacher(uuid) TO authenticated;

-- ============================================================
-- STEP 6: Update profiles RLS policies
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "Teachers can view their students profiles" ON profiles;
DROP POLICY IF EXISTS "Students can view their teachers profiles" ON profiles;

-- New: Users can view profiles of their contacts
CREATE POLICY "Users can view their contacts profiles"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.teacher_id = auth.uid() AND ts.student_id = profiles.id
    )
);

-- New: Users can view profiles of people who added them
CREATE POLICY "Users can view who added them"
ON profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.student_id = auth.uid() AND ts.teacher_id = profiles.id
    )
);

-- ============================================================
-- STEP 7: Update teacher_students RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Teachers can manage their students" ON teacher_students;
CREATE POLICY "Users can manage their contacts"
ON teacher_students FOR ALL
USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view their teachers" ON teacher_students;
CREATE POLICY "Users can view who added them"
ON teacher_students FOR SELECT
USING (student_id = auth.uid());

-- ============================================================
-- STEP 8: Update classes RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Teachers can manage own classes" ON classes;
CREATE POLICY "Listeners can manage own sessions"
ON classes FOR ALL
USING (listener_id = auth.uid());

DROP POLICY IF EXISTS "Students can view their classes" ON classes;
CREATE POLICY "Participants can view their sessions"
ON classes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM class_students cs
        WHERE cs.class_id = classes.id
        AND cs.student_id = auth.uid()
    )
);

-- ============================================================
-- STEP 9: Update assignments RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Teachers can manage assignments" ON assignments;
CREATE POLICY "Session owners can manage assignments"
ON assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM classes c
        WHERE c.id = assignments.class_id
        AND c.listener_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Students can view their assignments" ON assignments;
CREATE POLICY "Participants can view their assignments"
ON assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM classes c
        JOIN class_students cs ON cs.class_id = c.id
        WHERE c.id = assignments.class_id
        AND cs.student_id = auth.uid()
    )
);

-- ============================================================
-- STEP 10: Update mistakes RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Teachers can manage student mistakes" ON mistakes;
CREATE POLICY "Contacts can manage reciter mistakes"
ON mistakes FOR ALL
USING (
    student_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM teacher_students ts
        WHERE ts.teacher_id = auth.uid()
        AND ts.student_id = mistakes.student_id
    )
);

-- Keep "Students can view own mistakes" — already correct, just rename
DROP POLICY IF EXISTS "Students can view own mistakes" ON mistakes;
CREATE POLICY "Users can view own mistakes"
ON mistakes FOR SELECT
USING (student_id = auth.uid());

-- ============================================================
-- STEP 11: Update mistake_occurrences RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Teachers can manage mistake occurrences" ON mistake_occurrences;
CREATE POLICY "Contacts can manage mistake occurrences"
ON mistake_occurrences FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM mistakes m
        JOIN teacher_students ts ON ts.student_id = m.student_id
        WHERE m.id = mistake_occurrences.mistake_id
        AND ts.teacher_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM mistakes m
        WHERE m.id = mistake_occurrences.mistake_id
        AND m.student_id = auth.uid()
    )
);

-- "Students can view own mistake occurrences" already correct, just rename
DROP POLICY IF EXISTS "Students can view own mistake occurrences" ON mistake_occurrences;
CREATE POLICY "Users can view own mistake occurrences"
ON mistake_occurrences FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM mistakes m
        WHERE m.id = mistake_occurrences.mistake_id
        AND m.student_id = auth.uid()
    )
);

-- ============================================================
-- DONE! Verify with:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================================

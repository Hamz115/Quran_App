-- QuranTrack v3 schema terminology migration
-- teacher/student legacy model -> listener/reciter unified model
--
-- IMPORTANT: Apply only after the React and Flutter clients have been updated
-- and tested against these names. This migration is transactional and preserves
-- all existing UUIDs, rows, relationships, sessions, assignments, and mistakes.

BEGIN;

-- Prevent concurrent API writes while metadata is being renamed.
LOCK TABLE public.profiles, public.teacher_students, public.classes,
  public.class_students, public.assignments, public.mistakes,
  public.mistake_occurrences IN ACCESS EXCLUSIVE MODE;

-- Preconditions: v2 dual-write must be complete before making listener_id canonical.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.classes
    WHERE teacher_id IS DISTINCT FROM listener_id
  ) THEN
    RAISE EXCEPTION 'Cannot migrate: classes.teacher_id and listener_id differ';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.teacher_students WHERE teacher_id = student_id
  ) THEN
    RAISE EXCEPTION 'Cannot migrate: self-contact relationship exists';
  END IF;
END $$;

-- Drop functions whose SQL bodies use legacy names. They are recreated below.
DROP FUNCTION IF EXISTS public.lookup_profile_by_email(text);
DROP FUNCTION IF EXISTS public.is_class_teacher(uuid);
DROP FUNCTION IF EXISTS public.is_session_listener(uuid);

-- Rename the relationship tables and role-bearing columns.
ALTER TABLE public.teacher_students RENAME TO listener_reciters;
ALTER TABLE public.listener_reciters RENAME COLUMN teacher_id TO listener_id;
ALTER TABLE public.listener_reciters RENAME COLUMN student_id TO reciter_id;

ALTER TABLE public.class_students RENAME TO class_reciters;
ALTER TABLE public.class_reciters RENAME COLUMN student_id TO reciter_id;

ALTER TABLE public.assignments RENAME COLUMN student_id TO reciter_id;
ALTER TABLE public.mistakes RENAME COLUMN student_id TO reciter_id;

-- profiles.student_id is a public generated user code, not a role identifier.
ALTER TABLE public.profiles RENAME COLUMN student_id TO user_code;
ALTER TABLE public.profiles DROP COLUMN role;

-- listener_id is authoritative. Keep teacher_id during rollout for dual-write
-- compatibility with older clients/sidecars, but keep it synchronized.
UPDATE public.classes SET listener_id = teacher_id WHERE listener_id IS NULL AND teacher_id IS NOT NULL;
ALTER TABLE public.classes ALTER COLUMN listener_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_classes_listener_teacher_ids()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.listener_id IS NULL AND NEW.teacher_id IS NOT NULL THEN
    NEW.listener_id := NEW.teacher_id;
  ELSIF NEW.teacher_id IS NULL AND NEW.listener_id IS NOT NULL THEN
    NEW.teacher_id := NEW.listener_id;
  ELSIF NEW.teacher_id IS DISTINCT FROM NEW.listener_id THEN
    RAISE EXCEPTION 'classes.teacher_id must match listener_id during compatibility rollout';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_classes_sync_listener_teacher_ids ON public.classes;
CREATE TRIGGER trg_classes_sync_listener_teacher_ids
  BEFORE INSERT OR UPDATE OF listener_id, teacher_id ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_classes_listener_teacher_ids();

-- Rename constraints/indexes where PostgreSQL retained legacy generated names.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname,
      replace(replace(replace(conname,
        'teacher_students', 'listener_reciters'),
        'class_students', 'class_reciters'),
        'student_id', 'reciter_id') AS new_name
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname <> replace(replace(replace(conname,
        'teacher_students', 'listener_reciters'),
        'class_students', 'class_reciters'),
        'student_id', 'reciter_id')
  LOOP
    EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I',
      r.tbl, r.conname, r.new_name);
  END LOOP;
END $$;

ALTER INDEX IF EXISTS public.mistakes_unique_idx
  RENAME TO mistakes_unique_reciter_location_idx;
ALTER INDEX IF EXISTS public.idx_mistakes_student_id
  RENAME TO idx_mistakes_reciter_id;
CREATE INDEX IF NOT EXISTS idx_classes_listener_id ON public.classes(listener_id);

-- Enforce direction and prevent a user from adding themselves as a contact.
ALTER TABLE public.listener_reciters
  ADD CONSTRAINT listener_reciters_distinct_users_check
  CHECK (listener_id <> reciter_id);

-- Replace stale policy names and definitions with listener/reciter terminology.
DROP POLICY IF EXISTS "Users can view their contacts profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view who added them" ON public.profiles;
CREATE POLICY "Users can view their contact profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.listener_reciters lr
    WHERE (lr.listener_id = auth.uid() AND lr.reciter_id = profiles.id)
       OR (lr.reciter_id = auth.uid() AND lr.listener_id = profiles.id)
  ));

DROP POLICY IF EXISTS "Users can manage their contacts" ON public.listener_reciters;
DROP POLICY IF EXISTS "Users can view who added them" ON public.listener_reciters;
CREATE POLICY "Listeners can manage their contacts"
  ON public.listener_reciters FOR ALL
  USING (listener_id = auth.uid())
  WITH CHECK (listener_id = auth.uid());
CREATE POLICY "Reciters can view their listeners"
  ON public.listener_reciters FOR SELECT
  USING (reciter_id = auth.uid());

DROP POLICY IF EXISTS "Listeners can manage own sessions" ON public.classes;
DROP POLICY IF EXISTS "Participants can view their sessions" ON public.classes;
CREATE POLICY "Listeners can manage own sessions"
  ON public.classes FOR ALL
  USING (listener_id = auth.uid())
  WITH CHECK (listener_id = auth.uid() AND (teacher_id IS NULL OR teacher_id = listener_id));
CREATE POLICY "Reciters can view their sessions"
  ON public.classes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.class_reciters cr
    WHERE cr.class_id = classes.id AND cr.reciter_id = auth.uid()
  ));

CREATE FUNCTION public.is_session_listener(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = p_session_id AND listener_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.is_session_listener(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_session_listener(uuid) TO authenticated;

DROP POLICY IF EXISTS "Students can view own class associations" ON public.class_reciters;
DROP POLICY IF EXISTS "Teachers can manage class students" ON public.class_reciters;
CREATE POLICY "Reciters can view own session associations"
  ON public.class_reciters FOR SELECT
  USING (reciter_id = auth.uid());
CREATE POLICY "Listeners can manage session reciters"
  ON public.class_reciters FOR ALL
  USING (public.is_session_listener(class_id))
  WITH CHECK (public.is_session_listener(class_id));

DROP POLICY IF EXISTS "Participants can view their assignments" ON public.assignments;
DROP POLICY IF EXISTS "Session owners can manage assignments" ON public.assignments;
CREATE POLICY "Reciters can view their assignments"
  ON public.assignments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.class_reciters cr
    WHERE cr.class_id = assignments.class_id
      AND cr.reciter_id = auth.uid()
      AND (assignments.reciter_id IS NULL OR assignments.reciter_id = auth.uid())
  ));
CREATE POLICY "Listeners can manage assignments"
  ON public.assignments FOR ALL
  USING (public.is_session_listener(class_id))
  WITH CHECK (public.is_session_listener(class_id));

DROP POLICY IF EXISTS "Contacts can manage reciter mistakes" ON public.mistakes;
DROP POLICY IF EXISTS "Users can view own mistakes" ON public.mistakes;
CREATE POLICY "Reciters can view own mistakes"
  ON public.mistakes FOR SELECT
  USING (reciter_id = auth.uid());
CREATE POLICY "Listeners can manage contact mistakes"
  ON public.mistakes FOR ALL
  USING (
    reciter_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.listener_reciters lr
      WHERE lr.listener_id = auth.uid() AND lr.reciter_id = mistakes.reciter_id
    )
  )
  WITH CHECK (
    reciter_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.listener_reciters lr
      WHERE lr.listener_id = auth.uid() AND lr.reciter_id = mistakes.reciter_id
    )
  );

DROP POLICY IF EXISTS "Contacts can manage mistake occurrences" ON public.mistake_occurrences;
DROP POLICY IF EXISTS "Users can view own mistake occurrences" ON public.mistake_occurrences;
CREATE POLICY "Reciters can view own mistake occurrences"
  ON public.mistake_occurrences FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.mistakes m
    WHERE m.id = mistake_occurrences.mistake_id
      AND m.reciter_id = auth.uid()
  ));
CREATE POLICY "Listeners can manage contact mistake occurrences"
  ON public.mistake_occurrences FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.mistakes m
    LEFT JOIN public.listener_reciters lr
      ON lr.reciter_id = m.reciter_id AND lr.listener_id = auth.uid()
    WHERE m.id = mistake_occurrences.mistake_id
      AND (m.reciter_id = auth.uid() OR lr.id IS NOT NULL)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mistakes m
    LEFT JOIN public.listener_reciters lr
      ON lr.reciter_id = m.reciter_id AND lr.listener_id = auth.uid()
    WHERE m.id = mistake_occurrences.mistake_id
      AND (m.reciter_id = auth.uid() OR lr.id IS NOT NULL)
  ));

-- New signups use role-free terminology.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, user_code, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'USR-' || LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0'),
    true
  );
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.sync_profile_user_code_legacy_student_id();
DROP VIEW IF EXISTS public.teacher_students;
DROP VIEW IF EXISTS public.class_students;

-- Read-only compatibility views for older diagnostics and staged clients.
-- New clients must use listener_reciters/class_reciters and user_code/reciter_id.
-- security_invoker is essential: without it, owner-created compatibility
-- views can bypass the underlying tables' RLS policies in PostgreSQL 15+.
CREATE VIEW public.teacher_students
WITH (security_invoker = true) AS
SELECT id, listener_id AS teacher_id, reciter_id AS student_id, created_at
FROM public.listener_reciters;

CREATE VIEW public.class_students
WITH (security_invoker = true) AS
SELECT id, class_id, reciter_id AS student_id, performance
FROM public.class_reciters;

GRANT SELECT ON public.teacher_students TO authenticated;
GRANT SELECT ON public.class_students TO authenticated;

-- Secure exact-email contact discovery, now returning user_code.
CREATE FUNCTION public.lookup_profile_by_email(p_email text)
RETURNS TABLE (id uuid, user_code text, name text, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.user_code, p.name, p.email
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND lower(p.email) = lower(trim(p_email))
    AND p.id <> auth.uid()
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.lookup_profile_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_email(text) TO authenticated;

-- Refresh PostgREST's schema cache immediately after commit.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Post-migration verification (read-only):
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema='public' ORDER BY table_name;
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE table_schema='public' ORDER BY table_name, ordinal_position;
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname='public' ORDER BY tablename, policyname;

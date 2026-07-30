-- QuranTrack cross-listener mistake history
-- Applied to production on 2026-07-30.
--
-- A listener who is connected to a reciter may already read/manage that
-- reciter's mistakes and mistake_occurrences. These SELECT-only policies expose
-- the minimum related session/listener metadata needed to identify when and by
-- whom a previous mistake was recorded. They do not grant update/delete rights
-- over another listener's sessions or profile.

BEGIN;

-- SECURITY DEFINER helpers are required because direct policy joins would be
-- constrained by RLS on class_reciters/listener_reciters and could not see the
-- co-listener's relationship rows.
CREATE OR REPLACE FUNCTION public.is_contact_reciter_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_reciters cr
    JOIN public.listener_reciters mine ON mine.reciter_id = cr.reciter_id
    WHERE cr.class_id = p_session_id
      AND mine.listener_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_contact_reciter_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_contact_reciter_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_co_listener(p_listener_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listener_reciters mine
    JOIN public.listener_reciters theirs ON theirs.reciter_id = mine.reciter_id
    WHERE mine.listener_id = auth.uid()
      AND theirs.listener_id = p_listener_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_co_listener(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_co_listener(uuid) TO authenticated;

DROP POLICY IF EXISTS "Contact listeners can view reciter sessions" ON public.classes;
CREATE POLICY "Contact listeners can view reciter sessions"
  ON public.classes FOR SELECT
  USING (public.is_contact_reciter_session(id));

DROP POLICY IF EXISTS "Listeners can view co-listener profiles" ON public.profiles;
CREATE POLICY "Listeners can view co-listener profiles"
  ON public.profiles FOR SELECT
  USING (public.is_co_listener(id));

COMMIT;

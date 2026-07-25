-- QuranTrack v2.1.0 — safe contact lookup by email
--
-- The normal profiles RLS policies should expose only the current user and
-- existing contacts. The live audit found a stale v1 policy named
-- "Teachers can lookup any profile"; it both fails for role-less v2 users and
-- lets legacy teacher accounts enumerate every profile. Remove that policy and
-- its obsolete helper before installing the narrowly-scoped lookup RPC.

DROP POLICY IF EXISTS "Teachers can lookup any profile" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_teacher();

-- Prevent case-insensitive duplicate lookup identities. The live audit found
-- no existing duplicates, so this is safe to create.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_key
    ON public.profiles (lower(email));

CREATE OR REPLACE FUNCTION public.lookup_profile_by_email(p_email text)
RETURNS TABLE (
    id uuid,
    student_id text,
    name text,
    email text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT p.id, p.student_id, p.name, p.email
    FROM public.profiles p
    WHERE auth.uid() IS NOT NULL
      AND lower(p.email) = lower(trim(p_email))
      AND p.id <> auth.uid()
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_profile_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_email(text) TO authenticated;

-- The clients only allow users to edit their display name. Do not leave role,
-- email, verification state, or generated student ID writable through the
-- generic authenticated table grant.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (name) ON public.profiles TO authenticated;

-- Verification after applying:
-- SELECT * FROM public.lookup_profile_by_email('existing-user@example.com');

-- QuranTrack hosted web/PWA security hardening
-- Applied to Supabase project qwfnbkkegbhwxxjvyhzl on 2026-07-29.
--
-- Purpose:
-- 1. Pin SECURITY DEFINER/helper function search paths.
-- 2. Remove anonymous/public execution from sensitive functions.
-- 3. Preserve only the authenticated grants required by RLS and exact-email
--    contact discovery.

BEGIN;

ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_classes_listener_teacher_ids() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_session_listener(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_listener(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.lookup_profile_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_profile_by_email(text) TO authenticated;

COMMIT;

-- Verification
SELECT routine_name, grantee, privilege_type
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
  AND routine_name IN (
    'handle_new_user',
    'is_session_listener',
    'lookup_profile_by_email'
  )
ORDER BY routine_name, grantee;

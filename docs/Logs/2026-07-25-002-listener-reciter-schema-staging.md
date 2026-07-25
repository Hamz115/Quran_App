# Session Log: Listener/Reciter Schema Staging and Security Completion

**Date:** 2026-07-25
**Session:** 002
**Version:** v2.1.0 stabilization / staged schema v3
**Status:** Code complete and locally validated; live v3 migration intentionally pending
**Author:** Kyle with Codex implementation assistance

## Objective

Finish the urgent live Add Contact security repair, stage the database and application terminology migration from teacher/student to listener/reciter without losing existing data, preserve the April Flutter tutorial work, and validate React, Flutter, backend, synchronization, reporting, and migration safety before changing the live Supabase schema.

## Work Completed

### Live Contact Security

- Applied `docs/supabase_contact_lookup_fix.sql` to Supabase project `qwfnbkkegbhwxxjvyhzl`.
- Removed the obsolete `Teachers can lookup any profile` policy and `is_teacher()` helper.
- Installed authenticated `lookup_profile_by_email(text)`.
- Added a case-insensitive unique profile-email index.
- Restricted authenticated profile updates to `profiles.name`; role updates are denied.
- Browser-tested lookup and relationship insertion with two isolated audit accounts.
- Confirmed Kyle Audit found and added Test Student; Contacts changed from 0 to 1.

### Listener/Reciter Migration Staging

- Created and audited `docs/supabase_listener_reciter_schema_v3.sql`.
- Canonical schema names become:
  - `teacher_students` → `listener_reciters`
  - `class_students` → `class_reciters`
  - relationship `teacher_id` → `listener_id`
  - relationship/mistake/assignment `student_id` → `reciter_id`
  - `profiles.student_id` → `user_code`
  - `is_class_teacher(uuid)` → `is_session_listener(uuid)`
- Preserved `classes.teacher_id` temporarily for rollout compatibility and added a trigger requiring it to match `listener_id`.
- Added read-only legacy relationship views and hardened both with `security_invoker = true` so they cannot bypass underlying RLS.
- Added preflight checks, transactional locking, renamed constraints/indexes, updated RLS policies, role-free signup trigger, secure lookup function, and PostgREST schema reload.
- Did not apply the v3 migration live.

### React/Tauri

- Updated Supabase access to prefer canonical listener/reciter names with narrowly-scoped fallback to the current v2 schema.
- Updated generated database types and profile `user_code` normalization.
- Preserved existing UI aliases where needed so this database pass does not force the planned visual redesign.

### Flutter

- Added shared Supabase compatibility helpers.
- Updated providers, reports, cloud synchronization, contact/session/mistake paths, and profile-code normalization.
- Added SQLite database version 6 with additive `reciter_id` columns/backfill, preserving current offline rows and legacy aliases.
- Preserved all April tutorial changes.
- Independent analysis found two invalid `await` expressions inside synchronous fallback callbacks; fixed by resolving class IDs before the callbacks.

### FastAPI / Backend

- Added local compatibility schema fields/tables without altering Quran/QPC databases.
- Updated Supabase synchronization to prefer listener/reciter names and fall back only for missing v3 schema objects.
- Added static migration-contract tests, including enforcement that compatibility views use invoker RLS.

### Quran Integrity and Existing Stabilization Included

- Preserved the 25 corrected Quran page starts in React and Flutter.
- Preserved the page-590 Al-Inshiqaq 84:25 correction and page-range regression tests.
- Preserved Flutter UUID-safe class creation and Navigator-context fixes.
- Did not modify `quran.db`, `qpc-v2.db`, `qpc-v2-15-lines.db`, or QPC page/font data.

## Validation

| Validation | Result |
|---|---|
| React `npm run build` | Pass |
| Backend unit tests | Pass — 4/4 |
| Backend targeted `py_compile` | Pass |
| Flutter targeted analyzer on Hamza laptop | Pass — no issues in six migration files |
| Flutter full tests on Hamza laptop | Pass — 8/8 |
| Static Quran page map vs QPC database | Pass — 604/604, zero differences |
| Live contact RPC/database grants verification | Pass |
| Browser Add Contact end-to-end | Pass |
| Live v3 schema application | Not performed intentionally |
| Android emulator/physical runtime workflow | Pending |
| Full post-v3 BrowserOps workflow | Pending until live migration |

## Evidence

- Supabase audit and contact migration:
  `20260725-045908-qurantrack-supabase-readiness-fixes`
- Live Add Contact verification:
  `20260725-053320-qurantrack-contact-fix-live-test-corrected`
- Main detailed audit:
  `docs/Logs/2026-07-25-001-production-readiness-audit-v2.1.0.md`

## Risks and Rollout Rules

- Do not apply `docs/supabase_listener_reciter_schema_v3.sql` until updated Windows and Android clients are available. Legacy compatibility views are intentionally read-only.
- Before live migration, repeat row-count and teacher/listener equality preflight checks.
- Apply the migration transactionally, immediately verify tables/columns/functions/RLS/grants, then run the complete BrowserOps workflow.
- Keep `classes.teacher_id` only during the compatibility window; remove it in a later cleanup after all active clients use `listener_id` exclusively.
- Flutter visual redesign remains a separate phase after functional and schema stabilization.

## Next Session

1. Start and test the updated Flutter application on Pixel 7 emulator or a physical Android device.
2. Complete pre-migration BrowserOps session workflow on the compatibility code.
3. Apply the staged v3 migration live only after those checks pass.
4. Verify live schema, RLS, row counts, contact/session creation, page 590/84:25, mistakes, notes, performance, reports, and cross-account visibility.
5. Update/build the Windows and Android deliverables before removing compatibility aliases.
6. Continue the Flutter visual redesign only after the functional release candidate passes.

## Commit

Planned commit message: `feat: stabilize QuranTrack and stage listener-reciter schema`

# Session Log: Live v3 Rollout and Android Validation

**Date:** 2026-07-25  
**Session:** 004  
**Version:** v2.1.0 stabilization / live schema v3  
**Status:** Live v3 migration applied and verified; web and Android canonical workflows passed  
**Author:** Kyle

## Objective

Remove the final live-rollout gate by repairing the Pixel 7 emulator, validating the updated Flutter client end to end against live v2, applying the transactional listener/reciter schema v3 migration, and repeating web and Android read/write workflows against the canonical v3 schema.

## Android Emulator Recovery

The Pixel 7 emulator exited with Windows status `3221225477` because QEMU loaded incompatible ANGLE DLLs from `C:\Windows\System32`. Android Emulator's SwiftShader `libEGL.dll`, `libGLESv2.dll`, and `libGLES_CM.dll` were placed beside the QEMU executable. The emulator then booted Android 16/API 36 successfully and remained available as `emulator-5554` through scheduled task `\QuranTrack-Pixel7-Test-Interactive`.

The latest debug APK was built, installed, and launched as `com.quranlogbook.quran_mobile/.MainActivity`.

## Pre-v3 Android Workflow

Created isolated Android account `Android Audit` and connected it to the existing `Workflow Audit` account through the secure exact-email lookup RPC.

Validated on the real Flutter runtime:

- signup, login persistence, and contact insertion;
- cloud UUID-backed session creation and classroom navigation;
- QPC page 590 rendering with Al-Inshiqaq `84:25` followed by Al-Buruj;
- whole-word mistake capture for `84:25`, word 1, `إِلَّا`;
- listener note save;
- `Good` performance save;
- Sessions, Mistakes, and Performance reports;
- force-stop/relaunch persistence;
- cross-client synchronization to the React web reciter view.

BrowserOps task `20260725-215928-qurantrack-android-cross-client-sync-recovery` confirmed the web client received the Android-created session, one mistake, `Good` rating, and note.

## Final Live Preflight

Immediately before migration, live row counts were:

| Object | Rows |
|---|---:|
| profiles | 11 |
| teacher_students | 7 |
| classes | 59 |
| class_students | 56 |
| assignments | 116 |
| mistakes | 285 |
| mistake_occurrences | 276 |

Integrity checks all returned zero:

- `classes.teacher_id IS DISTINCT FROM classes.listener_id`;
- self-contact relationships;
- duplicate contact relationships;
- orphan class participants;
- orphan assignments;
- orphan mistakes.

## Migration Application

The first migration attempt was safely rolled back by PostgreSQL because policy `Teachers can manage class students` depended on `is_class_teacher(uuid)`. No schema or data changes were committed.

Updated `docs/supabase_listener_reciter_schema_v3.sql` to drop that dependent legacy policy before dropping the helper function. The five migration regression tests passed after the repair.

The corrected migration was then applied transactionally through Supabase SQL Editor. Supabase returned `Success. No rows returned`.

## Post-migration Verification

Verified:

- canonical base tables `listener_reciters` and `class_reciters` exist;
- `teacher_students` and `class_students` are read-only compatibility views;
- both views use `security_invoker=true` and grant authenticated SELECT only;
- `profiles.user_code` exists, while legacy `profiles.student_id` and `profiles.role` are absent;
- `reciter_id` exists on all four canonical relationship/data tables;
- `is_session_listener(uuid)` and `lookup_profile_by_email(text)` exist;
- obsolete `is_class_teacher(uuid)` is absent;
- synchronization trigger and distinct-user check constraint exist;
- RLS remains enabled on all seven canonical data tables;
- canonical listener/reciter policies exist and legacy table policies do not;
- all preflight row counts were preserved exactly;
- compatibility view counts match canonical table counts;
- no participant or mistake orphans were introduced.

BrowserOps evidence task: `20260725-220057-qurantrack-v3-live-rollout`.

## Post-v3 Runtime Regression

### React/Web

- Refreshed the existing reciter reports from live v3 with no schema errors.
- Existing Android-created data remained visible.
- Created a new session through the canonical v3 write path.
- Navigation used a real Supabase UUID: `7cc5a2aa-384e-4b0d-9943-8fb21f483629`.
- Session assignments loaded correctly. The temporary local Quran sidecar was offline during this final web creation, so the UI correctly displayed the explicit page-load error added during stabilization; this was not a Supabase/schema failure.

### Flutter/Android

After force-stop/relaunch against v3:

- contact and prior session data loaded through canonical names;
- created a second session using page 590;
- page 590 rendered correctly;
- recorded the `84:25` whole-word mistake occurrence;
- saved note `Post-v3 Android canonical workflow verified.`;
- saved `Very Good` performance;
- restarted the app;
- reports showed two sessions, one canonical mistake row used across occurrences, the correct per-session mistake counts, notes, and ratings.

The web reciter report then refreshed from live v3 and showed both Android sessions, including the new note and `Very Good` rating.

## Additional Stabilization

The Android run exposed two stale-cache paths:

- dashboard pull-to-refresh did not invalidate `teacherStudentsProvider`;
- Supabase-backed reports remained cached after class, note, performance, or mistake writes until app restart.

Updated Flutter providers to invalidate contact and report caches after successful remote mutations. Targeted Windows Flutter analysis completed with no new compile errors (existing warnings remain), and the complete Flutter test suite passed.

No Quran database, QPC database, QPC font, glyph, word, or page data was modified.

## Remaining Release Work

- build the final release APK;
- build and test the updated Windows installer;
- update remaining legacy teacher/student UI copy in a separate terminology polish pass;
- commit the migration-order and cache-invalidation follow-up;
- push local commits only when approved.

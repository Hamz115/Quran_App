# Session Log: Pre-v3 Runtime Regression and Assignment Fallback Repair

**Date:** 2026-07-25  
**Session:** 003  
**Version:** v2.1.0 stabilization / staged schema v3  
**Status:** Browser workflow passed after repair; Android runtime and live v3 migration remain pending  
**Author:** Kyle

## Objective

Continue the listener/reciter rollout by running the current v2-compatible client against live Supabase before applying schema v3. Validate contact lookup, session creation, Quran page 590, mistake capture, notes, performance, and reports without changing Quran/QPC data.

## Android Runtime Attempt

- Tried to launch the Pixel 7 emulator from Hamza's Windows laptop through Flutter, direct emulator commands, and a scheduled task.
- The emulator repeatedly exited with Windows result `3221225477` and never appeared in ADB.
- Android runtime validation is still blocked. The live v3 migration was therefore not applied.

## Isolated Browser Workflow

Created an isolated live Supabase test account and used the existing Test Student account as its contact.

Validated:

- authenticated signup and profile creation;
- exact-email contact lookup through `lookup_profile_by_email`;
- contact relationship insertion;
- session/class creation and reciter enrollment;
- page 590 QPC rendering;
- page 590 starts with Al-Inshiqaq `84:25`, followed by the Al-Buruj heading and content;
- whole-word mistake capture for Al-Inshiqaq `84:25`, word 1 (`إِلَّا`);
- listener notes save;
- performance rating save (`Good`);
- Sessions report shows the Hifz portion, one mistake, rating, and note;
- Mistakes report groups the mistake under Al-Inshiqaq;
- Performance report shows the saved rating and one mistake per class.

The retained isolated test class is `1c81815f-6cb2-436e-802e-4f0ee11eac4c`. A temporary second class and a full create/read/delete verification class were deleted after testing.

## Defect Found and Repaired

The first live session attempt created the class and `class_students` row but failed before inserting assignments. The v2 fallback payload used:

```ts
{ ...row, student_id: row.reciter_id, reciter_id: undefined }
```

Although `JSON.stringify` normally omits `undefined`, Supabase/PostgREST inferred the request columns before serialization and still requested `reciter_id`. Live v2 then returned `PGRST204` because that column does not exist yet.

Fixed both assignment-write fallbacks in `quran_frontend/src/lib/supabase-api.ts` by destructuring `reciter_id` out of the object before insertion. This makes the v2 payload contain only `student_id`.

Post-fix verification used the real frontend Supabase module against live v2:

- `addClassAssignments()` succeeded through the fallback;
- full `createClass()` succeeded;
- the created class loaded with one Hifz assignment at `84:25` and one reciter;
- the temporary verification class deleted successfully.

Added a static regression test that rejects `reciter_id: undefined` and requires both legacy assignment fallbacks to remove the canonical field.

## Additional Runtime Hardening

- Added optional `VITE_QURAN_API_BASE` support so development/runtime testing can point to the Quran sidecar when port 8000 is occupied.
- Added the variable to `.env.example`.
- Replaced the permanent `Loading page...` state with an explicit Quran page load error message when the local API cannot provide the page.
- Made the Sessions refresh button invalidate class/contact caches before fetching, so it performs an actual network refresh instead of returning stale cache data.

No Quran database, QPC database, font, glyph, or page data was changed.

## Validation

| Validation | Result |
|---|---|
| React production build | Pass |
| Backend/migration tests | Pass — 5/5 |
| Live secure contact lookup | Pass |
| Live v2 assignment fallback | Pass after repair |
| Full frontend `createClass` create/read/delete check | Pass |
| Page 590 / Al-Inshiqaq `84:25` rendering | Pass |
| Mistake, note, and performance writes | Pass |
| Sessions, Mistakes, and Performance reports | Pass |
| Android emulator runtime | Blocked — emulator exit `3221225477` |
| Live schema v3 application | Not performed intentionally |

## BrowserOps Evidence

- Initial isolated account/contact/session workflow: `20260725-194902-qurantrack-pre-v3-isolated-workflow`
- Recovery and report state: `20260725-195800-qurantrack-pre-v3-isolated-recovery`
- Page 590, mistake, notes, performance, and reports: `20260725-200630-qurantrack-page590-runtime-after-api-config`

Key evidence frames include:

- `003-page590-rendered-after-session-restore.png`
- `009-whole-word-mistake-saved.png`
- `023-notes-performance-saved.png`
- `025-reports-before-explicit-refresh.png`
- `027-mistakes-report-84-25.png`
- `029-performance-report-good.png`

## Remaining Gate

Do not apply `docs/supabase_listener_reciter_schema_v3.sql` yet. Resolve Android emulator access or use a physical Android device, run the updated Flutter client end to end, and then repeat schema preflight checks before the transactional live migration.

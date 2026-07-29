# Session Log: Windows Tutorial Persistence and Alignment

**Date:** 2026-07-26
**Session:** 006
**Start:** 2026-07-26 19:33 AST
**Duration:** 1h 25m
**Author:** Codex

## Objective

Reproduce and repair the Windows packaged tutorial behavior so completion survives sign-out/sign-in and each tutorial step clearly corresponds to the current interface action, then rebuild, reinstall, and rerun the complete tutorial in the actual Tauri application.

## Summary

Completed. The published/previously installed v2.0.0 baseline reproduced the forced-repeat defect, a stale interactive-step implementation, a non-functional Surah action, multiple popover-positioning problems, and packaged backend failures encountered by the tutorial workflow.

The final candidate was rebuilt as the actual React/Tauri application plus packaged FastAPI sidecar, bundled into NSIS, installed over the real Windows installation, and exercised through all 32 tutorial steps. Tutorial completion survives interrupted replay, native process restart, and a real sign-out/sign-in. Every interactive target is visible and usable in settled screenshots. The temporary tutorial session was deleted, tutorial mistake demonstrations made no real mistake API mutations, and runtime diagnostics contained no console errors or failed responses.

**Tutorial verdict: SAFE FOR THE NEXT WINDOWS BUILD.** This candidate was not pushed, published, or substituted for the tracked final release artifact.

## Work Completed

### Session Initialization

- Read `docs/Logs/TEMPLATE.md`.
- Reviewed the completed Windows validation and final v2.0.0 GitHub release state.
- Preserved existing Syncthing temporary files and made no push or release mutation.

### Installed-Package Reproduction

- Attached Playwright to the installed Tauri WebView2 instance at `http://tauri.localhost` while the native `quran-track.exe` process and packaged FastAPI sidecar were running.
- Confirmed the signed-in user's tutorial completion value was initially `true` and no tutorial was visible after launch.
- Clicked **Show Tutorial** in the packaged Settings screen and proved that this immediately removed `qurantrack:tour_completed:<user-id>`.
- Terminated and relaunched the installed native executable with that replay interrupted at step 1.
- Confirmed the tutorial automatically appeared at step 1 again after relaunch; using **Skip Tour** restored the completion value.
- Reached packaged step 9, **Choose a Surah**, and confirmed:
  - changing the **From Surah** value did not advance the tutorial;
  - the highlighted parent grid caused the tutorial popover to cover the actual selectors;
  - the implementation listens for a `click` on the wrapping `<div>` instead of the selectors' `change` event.

Baseline evidence:

- `screenshots/2026-07-26-windows-tutorial-persistence-alignment/001-replay-clears-completion.png`
- `screenshots/2026-07-26-windows-tutorial-persistence-alignment/002-interrupted-tour-repeats-on-reopen.png`
- `screenshots/2026-07-26-windows-tutorial-persistence-alignment/003-surah-change-does-not-advance.png`

### Root-Cause Review

- `Settings.tsx` resets completion before every manual replay.
- Auto-start is controlled only by completion, so any interrupted first run or replay is offered again on later launches.
- Step 9 targets a wrapping `<div>`, so event inference chooses `click` and the popover overlaps the controls.
- The interactive-listener callback is permanently bound to its first-render closure and leaves delayed retry/advance timers incompletely cancelled, creating a credible source of stale step state and “one step behind” behavior.
- The delete step advances on the Delete button click before it knows whether the native confirmation was accepted.
- **Skip Tour** was appended after Driver.js measured the popover. The added height made settled popovers grow back over controls.
- Opening Notes inserts the editor above the current WebView2 scroll anchor. Without a post-layout recenter/refresh, step 25 described a textarea that was off screen.
- Packaged session creation could fail with `database is locked` because the background pull kept a SQLite write transaction open during Supabase network calls.
- The legacy local `mistakes` uniqueness constraint treated Quran position as globally unique instead of reciter-scoped.
- Tutorial word/letter/haraka practice attempted to write real recitation history and reached an occurrence RLS failure. Tutorial practice must remain disposable.
- Expected “no existing mistake” lookups used `.single()`, producing avoidable 406 responses.

### Implementation

- Kept the completion value intact when **Show Tutorial** is used manually.
- Added a per-user, per-install “auto shown” marker. The marker is written when a tutorial starts, so an interrupted tutorial is not forced again after relaunch or repeat login; manual replay remains available in Settings.
- Reworked interactive-step binding so each step:
  - binds immediately to the current target;
  - uses the latest route/session state instead of a first-render closure;
  - cancels all retry and delayed-advance timers when the step changes;
  - waits for the promised DOM or navigation result before advancing;
  - remains on the same step when an action is cancelled.
- Changed the Surah step to highlight and listen to the actual **From Surah** `<select>` and clarified that the value must change.
- Made Sabqi and Manzil copy explicitly optional instead of instructing the user to toggle controls on an informational step.
- Made session creation wait for the actual dynamic `/sessions/<id>` route before the classroom step appears.
- Split deletion into a warning step and a confirmation-required action step; it now waits for `/sessions` after confirmed deletion before showing the farewell.
- Cleared both scoped and legacy tutorial session IDs on start/finish.
- Rendered **Skip Tour** before Driver.js positioning, then centered each target before display.
- Recentered and refreshed the Driver stage after conditional layout shifts, fixing the off-screen Notes textarea.
- Kept tutorial word/letter/haraka examples as optimistic UI-only demonstrations; no real local or cloud mistake mutation is attempted while the tour is active.
- Changed expected optional Supabase mistake lookups from `.single()` to `.maybeSingle()`.
- Released class and assignment SQLite writes before child-record network calls and added a 15-second SQLite busy timeout.
- Added a startup migration for legacy local `mistakes` tables:
  - preserves mistake IDs and occurrence references;
  - removes the global Quran-position constraint;
  - adds `idx_mistakes_reciter_location` scoped by reciter identity.
- Added regression tests for tutorial isolation, the reciter-scoped local identity, and network-free SQLite write transactions.

### Actual Packaged Rebuild and Install

- Rebuilt `QuranTrackBackend.exe` with PyInstaller and copied it to Tauri's real `externalBin` path.
- Rebuilt the React production bundle and native Rust/Tauri executable.
- Produced `quran_frontend/src-tauri/target/release/bundle/nsis/QuranTrack_2.0.0_x64-setup.exe`.
- Installed that exact NSIS candidate over `C:\Users\hamza\AppData\Local\QuranTrack` with installer exit code `0`.
- Launched and controlled the installed `quran-track.exe` plus installed `quran-backend.exe`; testing was not performed in Vite or ordinary Chrome.
- Final hashes:

| Artifact | SHA-256 |
|----------|---------|
| Final NSIS candidate | `DA5B82ED405792113FB106F32DEF141163B4BB36B8AC00B5728197E22B8F2FE0` |
| Source Tauri sidecar | `59156C297C12085D8A790579F6C35A631DCBDD70325B2CA06073DDB03F159387` |
| Installed sidecar | `59156C297C12085D8A790579F6C35A631DCBDD70325B2CA06073DDB03F159387` |
| Installed Tauri executable | `B13A99F06F84204A9C9B55012006AD01E5E926784092EB7966D7F33F867F9263` |

The Tauri command produced the complete NSIS bundle, then returned the expected local updater-signing error because the public key is configured and `TAURI_SIGNING_PRIVATE_KEY` is deliberately unavailable. No updater key was changed or supplied.

### Final 32-Step Tutorial Audit

- Observed exactly 32 sequential steps with `Step N of 32` correct at every step.
- Selected an actual roster contact.
- Changed **From Surah** from 76 to 84; the native `<select>` `change` advanced directly to step 10.
- Created a canonical `/sessions/<uuid>` tutorial session.
- Exercised whole-word, letter, and haraka tutorial examples.
- Exercised Page/All, Notes entry/save, performance rating, Reader, Settings, delete warning, native confirmation, and farewell.
- Confirmed the tutorial session was deleted and could no longer be opened.
- Confirmed zero console errors and zero failed HTTP responses during the tutorial.
- Captured every non-read request and confirmed `tutorialMistakeMutations: []`.
- Settled-state screenshots confirmed interactive controls were visible and usable. The only geometric overlap left was on large informational regions (whole Hifz/Sabqi cards and the full Reader page), not an actionable control.
- Full machine-readable evidence:
  - `screenshots/2026-07-26-windows-tutorial-persistence-alignment/tutorial-full-audit.json`
  - `screenshots/2026-07-26-windows-tutorial-persistence-alignment/tour-step-01.png` through `tour-step-32.png`
  - `screenshots/2026-07-26-windows-tutorial-persistence-alignment/tour-complete-dashboard.png`
  - `screenshots/2026-07-26-windows-tutorial-persistence-alignment/tutorial-session-deleted.png`

### Persistence Validation

- Manual **Show Tutorial** replay preserved `qurantrack:tour_completed:<user-id> = true`.
- Terminated the installed native app at step 1, relaunched it, and confirmed no popover appeared.
- Used the packaged Settings **Sign Out**, verified the auth token was removed, then signed the documented Hamza Feroze account back in through the packaged login screen.
- After sign-in, completion and auto-shown values were still `true`; no tutorial appeared.
- Evidence:
  - `030-manual-replay-preserves-completion.png`
  - `031-current-packaged-state.png`
  - `032-actual-signout-login-screen.png`
  - `033-signin-does-not-repeat-tutorial.png`
  - `replay-start.json`, `state.json`, `signout.json`, `post-login-state.json`

### Database Migration Probe

- Ran the newly packaged sidecar against a copy of the real installed legacy `app.db`.
- Preserved 289 mistake rows, 283 occurrence rows, every mistake ID, and every occurrence-to-mistake reference.
- Preserved the exact set of 81 pre-existing unrelated foreign-key violations; the migration introduced none.
- Removed the legacy global constraint and created the reciter-scoped unique index.
- Successfully inserted the same Quran position for two different reciters inside a rolled-back probe transaction.
- Evidence: `screenshots/2026-07-26-windows-tutorial-persistence-alignment/migration-probe.json`.

## Issues Encountered

- The existing step-9 test used a programmatic click after selecting a Surah, masking the fact that a normal selection change does not advance the packaged tutorial.
- The first complete candidate audit exposed `database is locked` during tutorial session creation. The lock was traced to network calls inside a SQLite write transaction, fixed, rebuilt, and rerun.
- The next audit exposed the legacy globally unique mistake location and tutorial occurrence RLS side effect. The local schema was migrated and tutorial practice was isolated from persistence.
- An initially successful functional run still showed popovers overlapping targets because screenshots were taken before/after the dynamic **Skip Tour** layout shift. Rendering the control during `onPopoverRender` corrected the real layout.
- Settled screenshots then exposed the Notes textarea above the viewport due WebView2 scroll anchoring. A post-layout recenter and Driver refresh fixed it; the final screenshot shows the actual textarea.
- Repository-wide lint still contains the pre-existing legacy backlog (including `any`, old hook dependency warnings, and `_setPerformanceSaving`). Focused tutorial lint and the production TypeScript build pass.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `docs/Logs/2026-07-26-006-windows-tutorial-persistence-alignment.md` | Created | Live tutorial validation and repair record |
| `screenshots/2026-07-26-windows-tutorial-persistence-alignment/tutorial_probe.py` | Created | Focused installed-package persistence and alignment probe (gitignored evidence directory) |
| `quran_frontend/src/contexts/TourContext.tsx` | Modified | Durable auto-show state, current-state interactive listeners, result-gated navigation, timer cleanup |
| `quran_frontend/src/lib/tour.ts` | Modified | Tutorial copy/targets, route gates, deletion sequence, auto-show persistence |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Modified | Direct tutorial target on From Surah selector |
| `quran_frontend/src/pages/Settings.tsx` | Modified | Manual replay no longer clears completion |
| `quran_frontend/src/pages/Classroom.tsx` | Modified | Disposable tutorial mistake demonstrations |
| `quran_frontend/src/lib/supabase-api.ts` | Modified | Optional no-row mistake lookup |
| `quran_backend/main.py` | Modified | SQLite busy timeout and reciter-scoped legacy mistake migration |
| `quran_backend/sync_service.py` | Modified | Commit local writes before child network requests |
| `quran_backend/tests/test_listener_reciter_schema_sql.py` | Modified | Tutorial, lock, and schema regression coverage |
| `screenshots/2026-07-26-windows-tutorial-persistence-alignment/tutorial_full_audit.py` | Created | Installed-app 32-step audit and request diagnostics (gitignored evidence directory) |
| `screenshots/2026-07-26-windows-tutorial-persistence-alignment/migration_probe.py` | Created | Isolated packaged-sidecar migration proof (gitignored evidence directory) |

## Tests Run

| Test | Result |
|------|--------|
| Final exact NSIS silent install | **PASS** — exit `0` |
| Complete installed Tauri tutorial | **PASS** — 32/32 sequential |
| Installed tutorial runtime diagnostics | **PASS** — 0 console errors, 0 failed responses |
| Tutorial practice isolation | **PASS** — 0 mistake mutations |
| Tutorial temporary-session deletion | **PASS** |
| Packaged tutorial completion across sign-out/sign-in | **PASS** |
| Interrupted manual replay across native relaunch | **PASS** |
| Manual replay keeps completion | **PASS** |
| Step 9 advances on actual Surah value change | **PASS** |
| Interactive target settled-state visual audit | **PASS** |
| Packaged legacy DB migration probe | **PASS** |
| `python -m unittest discover -s quran_backend\tests -p test_listener_reciter_schema_sql.py -v` | **PASS** — 22/22 |
| `python -m py_compile quran_backend/main.py quran_backend/sync_service.py` | **PASS** |
| `npx eslint src/contexts/TourContext.tsx src/lib/tour.ts` | **PASS** |
| `npm run build` | **PASS** |
| Native Rust/Tauri release compile | **PASS** |
| NSIS bundle creation | **PASS** |
| Local updater artifact signing | **EXPECTED NOT RUN** — private key unavailable and unchanged |
| Manual replay preserves completion | **FAIL (published v2.0.0 baseline)** |
| Interrupted replay stays dismissed after native relaunch | **FAIL (published v2.0.0 baseline)** |
| Step 9 advances on actual Surah value change | **FAIL (published v2.0.0 baseline)** |

## Next Steps

- [x] Reproduce tutorial auto-start after repeat login.
- [x] Audit every tutorial step against visible UI state and required action.
- [x] Apply minimal fixes and regression coverage.
- [x] Rebuild/reinstall the packaged Windows application.
- [x] Rerun affected packaged coverage and record evidence.
- [ ] Commit/push only when explicitly requested.
- [ ] Let the authorized signing/release workflow create signed updater artifacts; do not reuse this unsigned local updater output.

## Notes

- The published v2.0.0 release already exists. This session will not push or replace release assets unless explicitly requested.
- No production Supabase schema, RLS policy, updater key, GitHub release, or tracked final release artifact was changed.
- Unrelated logs `007`–`009` and Syncthing temporary files were preserved.

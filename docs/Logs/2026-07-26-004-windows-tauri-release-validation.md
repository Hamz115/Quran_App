# Session Log: Windows Tauri Release Validation

**Date:** 2026-07-26
**Session:** 004
**Start:** 2026-07-26 04:56 AST
**Duration:** 3 hours 10 minutes (completed 08:06 AST)
**Author:** Codex

## Objective

Own and execute the complete Windows release validation defined by `2026-07-26-003-codex-desktop-windows-tauri-validation-handoff.md` against the actual packaged Tauri/React application and NSIS installer, preserving the tracked final release artifact, production schema, updater keys, and remote repository.

## Summary

Complete packaged-Windows validation was executed through repeated real NSIS maintenance installs of the `2.0.0` Tauri application. Installer, native lifecycle, sidecar, window/theme/resizing, canonical synchronization, session creation, page-590 classroom, mistake/note/performance persistence, reports, PDF/CSV/Word exports, all 31 tutorial steps, Reader, Settings/updater, contacts, signed-out auth, normal persistence, offline behavior, invalid routes, missing-sidecar recovery, port collision, and final diagnostics were exercised. Verified runtime defects were repaired minimally and rerun. Runtime behavior is release-quality, but the final combined verdict is **NOT SAFE TO BUILD/PUBLISH FINAL WINDOWS RELEASE** because neither the installer nor executable is Authenticode signed and the configured updater public key has no available private key, so signed updater artifacts cannot be produced.

## Work Completed

### Session Initialization

- Opened the required validation log before development work.
- Read the Windows handoff, `AGENTS.md`, all eight prerequisite session logs, and the Android handoff's referenced Flutter-overhaul overview completely.
- Confirmed the Windows handoff requires independent packaged-app testing and does not permit substituting Vite/Chrome evidence.

### Repository Preservation Baseline

- Branch: `main`.
- HEAD: `890e24f260ef5c89ceb5f7c40db2610603a65b31` (`fix: resolve Android release validation defects`).
- Remote relationship: seven commits ahead of `origin/main`, zero behind.
- `git diff --check`: pass.
- Existing untracked Windows handoff and Syncthing temporary files are preserved and excluded from build inputs.
- No reset, rebase, commit, push, migration, updater-key change, or release-artifact replacement was performed.

### Windows and Toolchain Preflight

- Host: Windows x64 build `26200`; Windows reports the Home edition, so Windows Sandbox is not available and the optional-feature query requires elevation.
- Clean-environment status: no existing disposable VM or usable Windows Sandbox was found. Validation therefore uses a truthfully labeled in-place clean-install simulation.
- Preserved the existing QuranTrack `1.6.7` install and complete WebView profile before installer mutation:
  - `screenshots/2026-07-26-codex-desktop-windows-tauri-validation/pre-validation-state/installed-QuranTrack-1.6.7`
  - `screenshots/2026-07-26-codex-desktop-windows-tauri-validation/pre-validation-state/webview-profile`
- Node `v22.22.3`; npm `10.9.8`; Rust/Cargo `1.93.1`; Tauri CLI `2.10.0`; Python `3.11.6`; PyInstaller `6.19.0`; uv `0.7.6`.
- WebView2 Runtime `150.0.4078.99` is installed.
- Architecture: x64. Free space at preflight: 263.97 GB.
- No stale QuranTrack, sidecar, Vite, Cargo, PyInstaller, or Python project process owned ports 8000/5173.
- Installed `pywinauto 0.6.9` as a test-machine automation dependency; it is not a product dependency or repository change.

### Automated Source Checks

- React/TypeScript production build passed: 131 modules, completed in 17.30 seconds. Existing warnings are the stale Browserslist database and a 2.03 MB JavaScript chunk.
- Backend listener/reciter schema/copy regression suite passed: 6/6.
- `main.py`, `sync_service.py`, and `pyinstaller_entry.py` compile checks passed.
- `cargo check` passed for `quran-track`.
- Frontend lint remains non-zero with the documented repository backlog: 167 findings (156 errors, 11 warnings), including generated `src-tauri/target` assets because `eslint .` does not exclude the Rust target tree. The build itself passes; no unrelated lint rewrite was attempted.

### Baseline Sidecar Rebuild and Standalone Check

- Rebuilt with `pyinstaller --noconfirm QuranTrackBackend.spec` in 188.59 seconds.
- SHA-256: `8782BBE50365C26A65238F018EF250FA957E49FBC0E1749D5704DE1356BD654C`.
- Copied the byte-identical binary to `src-tauri/quran-backend-x86_64-pc-windows-msvc.exe`.
- A standalone isolated copy created its writable `app.db` and `backend.log` beside the executable.
- `/api/health`: healthy, 114 surahs, 6,236 ayahs, zero isolated classes/mistakes.
- The standalone PyInstaller parent/child processes and port 8000 were explicitly cleared before Tauri packaging.
- PyInstaller archive inventory confirms `.env`, `quran.db`, `qpc-v2.db`, and `qpc-v2-15-lines.db` are embedded.

### Baseline Tauri and NSIS Build

- `npm run tauri:build` built the release executable and NSIS installer from exact HEAD in 177.05 seconds.
- Functional application/NSIS compilation succeeded; final command exit was `1` only because updater artifact signing found the public key but no `TAURI_SIGNING_PRIVATE_KEY`.
- Baseline release executable: SHA-256 `5DE70651A352D4922E2731C4E15F21445A941B8E5E73AD87429F836E9FF266C3`, 118,141,440 bytes.
- Baseline NSIS installer: SHA-256 `FC6EBF02B7DB54C2A2972BC520F1A615A7978F5452468FE252F4DF5DDEBF3DFF`, 204,715,991 bytes.
- The tracked installer was not modified and remains SHA-256 `8F076FE346D277F48A231C25DBD6D54CBE891E84E5B463D69EE08ADD3F52DCC2`.
- Neither the executable nor installer has an Authenticode signature.

### Baseline Installer and First Packaged Launch

- Windows Sandbox/VM was unavailable, so this is an in-place clean-install simulation after preserving the previous state.
- Walked through the real NSIS UI with native UI Automation and screenshots.
- Detected existing `1.6.7`; selected the offered uninstall-before-install path.
- Uninstaller clearly offered `Delete the application data`; it remained unchecked. Uninstall completed successfully.
- Installer displayed the destination/space page, installed successfully, and offered checked-by-default `Run QuranTrack` and `Create desktop shortcut` options.
- Verified current-user registration at `C:\Users\hamza\AppData\Local\QuranTrack`, Installed Apps version `2.0.0`, publisher `qurantrack`, Start menu shortcut, and desktop shortcut.
- Launched from the actual desktop shortcut. The installed app launched its own bundled sidecar without Node, npm, Rust, Python, Vite, or the source tree.
- Installed sidecar SHA-256 matches the freshly built binary.
- Installed app SHA-256 is `C2209295502AD04BCC07A5C78C195565F69DE829BD5655509DB60FF3F77DF9AB`; it differs from the post-bundle target executable because the installer captured the pre-updater-artifact executable.
- Default native window is 1280×800 logical pixels at 150% Windows scaling, centered and rendered inside a normal resizable title bar.
- Process evidence: `quran-track.exe` launched one WebView2 browser process and one expected PyInstaller bootloader/child pair for `quran-backend.exe`; the child owned `127.0.0.1:8000`.
- Packaged `/api/health`: healthy, 114 surahs, 6,236 ayahs.
- The previous authenticated WebView session was not present. Both obsolete overview demo credentials failed safely; a documented non-primary demo account authenticated successfully without exposing credentials.

### Verified Defects Captured Before Repair

1. **Release executable version mismatch:** WebView2 and Windows executable metadata report `1.0.0` because `src-tauri/Cargo.toml` is `1.0.0`, while the application/installer release is `2.0.0`.
2. **Embedded privileged secrets:** the frozen sidecar embeds `quran_backend/.env`, which contains a Supabase service-role key and JWT secret. This is not safe to distribute.
3. **Unverified-token/service-role combination:** the sidecar decodes Supabase JWTs without signature verification and then runs synchronization through the embedded service-role client.
4. **Broken packaged local-first database migration:** authenticated packaged calls to `/api/local/classes` and the background sync fail with `sqlite3.OperationalError: no such column: supabase_id`. SQLite rejects `ALTER TABLE ... ADD COLUMN ... UNIQUE`; the exception is silently swallowed, so the column is never created. The frontend falls back to direct Supabase, masking the packaged defect.
5. **Misleading frontend CORS error:** the WebView reports the backend 500 response as CORS/no-access-control, while `backend.log` contains the actual missing-column exception.

### Minimal Repairs Applied

- Aligned the Rust package/executable version with the Tauri/NSIS release at `2.0.0`.
- Removed `quran_backend/.env` from the frozen sidecar and replaced it with the frontend public Supabase URL/anonymous key only.
- Removed the packaged service-role client and unsigned JWT decoding. The sidecar now verifies the access token with Supabase Auth and binds every database client to that user's token so RLS remains authoritative.
- Reworked the four invalid SQLite `ALTER TABLE ... ADD COLUMN ... UNIQUE` migrations into nullable columns plus partial unique indexes.
- Threaded the verified user access token through all local sync/background operations.
- Added regression coverage for packaged-secret exclusion, verified/RLS-bound authentication, valid SQLite sync migrations, and release-version alignment.
- Post-repair source validation passes: backend tests 9/9, Python compile checks, `cargo check`, and the React/TypeScript production build.
- During frozen-sidecar verification, corrected the missing-Authorization behavior from framework-level 422 to the intended explicit 401.

### Repaired Frozen Sidecar Validation

- Final repaired sidecar SHA-256: `3092216CD848632B2E98D21049CAC2E368FE9B1048A8869BA2FA8BCABBED152A`; 97,468,981 bytes.
- The copied Tauri external binary is byte-identical.
- PyInstaller archive inventory contains `.env.public\.env.local`, `quran.db`, `qpc-v2.db`, and `qpc-v2-15-lines.db`; it does not contain the privileged backend `.env`.
- Extracted the bundled public environment file and inspected key names without recording values. It contains only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_QURAN_API_BASE`; no service key, JWT secret, private key, or other secret-named entry is present.
- Launched the repaired frozen binary beside a copied legacy installed `app.db`. Health passed at 114 surahs/6,236 ayahs/6 classes/0 mistakes.
- Verified the real legacy database gained `classes.supabase_id` and all four partial unique sync indexes.
- Missing Authorization and an invalid bearer token both return HTTP 401 with the generic `Invalid or missing Supabase token` response.
- Explicitly stopped the standalone PyInstaller parent/child processes and confirmed port 8000 was clear before packaging.

### Repaired Tauri/NSIS Build and Installation

- Functional Tauri/NSIS build completed from the repaired source. As expected, the command's final updater-artifact signing step exited non-zero because the configured public key has no local private key; no production signing material was added or changed.
- Repaired release executable: SHA-256 `A55E40AA7D7765C603DFEFDFED5E5BD7573F0E63B39181007C3D3EE69D60DA12`, 118,141,440 bytes, Windows file/product version `2.0.0`.
- Repaired NSIS installer: SHA-256 `80C12E78248888C3643554082D1A657E0487F5571BCC021C68B21D8F39EB7745`, 204,721,610 bytes, version `2.0.0`.
- Both remain Authenticode `NotSigned`.
- Preserved copies under `screenshots/2026-07-26-codex-desktop-windows-tauri-validation/packages/patched-current-source`; did not replace the tracked release installer.
- Ran the real NSIS maintenance/reinstall path: welcome, existing `2.0.0` detection, `Add/Reinstall components`, destination/space page, progress, successful completion, and finish options.
- Confirmed the finish page again defaults both `Run QuranTrack` and `Create desktop shortcut` on. Disabled auto-run only to relaunch through the actual desktop shortcut with controlled WebView diagnostics.
- Installed app and sidecar exist under current-user Local AppData; desktop and Start-menu shortcuts exist.
- Installed executable metadata is now file/product version `2.0.0`.
- Installed sidecar is byte-identical to the repaired frozen binary.
- Launched the real installed shortcut at 150% scale. Preserved authenticated session loaded; health is green and the sidecar reports the preserved database.

### Window, Theme, and Local-Sync Checks

- Default content viewport: 1280×800 logical pixels at device-pixel ratio 1.5.
- User-style Windows system resize clamps at the configured 900×600 logical minimum; dashboard remains usable with its bottom navigation and scrollable content.
- Intermediate 1100×700 and maximized 1707×996 logical viewports render without overflow failure.
- Dark and light themes both render; theme switch updates the root class and persistent `theme` key.
- Repaired packaged local API probe passes:
  - health HTTP 200;
  - listening classes HTTP 200, 7 records;
  - reciting classes HTTP 200, 1 record;
  - full sync trigger HTTP 200;
  - post-sync counts remain 7/1.
- The packaged sync repopulated the local database from cloud-authorized data (11 total local classes, 8 mistakes), demonstrating the previously masked migration/sync path is now active.

### Additional Canonical-Sync Defects and Repairs

6. **Non-canonical session navigation:** local session creation returned the SQLite integer immediately and only later pushed to Supabase, so the packaged UI navigated to `/sessions/<integer>` instead of the required live-v3 UUID.
7. **Incomplete class pull:** the sidecar pulled only classes owned by the current listener, not reciting sessions, assignments, or class enrollments. A successful HTTP 200 therefore masked incomplete/stale packaged data.
8. **Incomplete mistake pull:** the sidecar pulled only the current user's mistake rows, not an authorized listener's contacts or occurrence rows. Once any local contact mistake existed, the frontend could treat the incomplete local list as authoritative.
9. **Repeated local mistake crash:** the duplicate-mistake branch called `.get()` on `sqlite3.Row`, which has no `.get()` method.
10. **Canonical mistake removal drift:** local removal/decrement did not delete or update an already-synced canonical mistake.
11. **Session-wizard Back overwrites teacher input:** after configuring Hifz by page, Sabqi by surah, and Revision by juz, returning to reciter selection and then continuing caused the cached suggestion effect to reapply. Hifz/Sabqi happened to retain matching modes in the evidence run, but Revision visibly reverted from the teacher-selected Juz mode to the prior Surah suggestion.

Minimal repairs:

- Initial online session creation now performs the first user-token/RLS sync synchronously and returns its canonical UUID; offline failure retains the existing local-ID fallback and queues a retry.
- Class pull now combines owned and enrolled RLS-visible sessions and snapshots assignments plus class reciters into the local database.
- Mistake pull now covers the current user plus RLS-visible contacts and snapshots occurrence links.
- Replaced invalid `sqlite3.Row.get` access with indexed access.
- Canonical mistake delete/decrement now completes first; a remote failure returns 503 without mutating local state.
- Portion suggestions are now applied once per selected-reciter set during an open modal. Returning with Back preserves the teacher's edits; changing the selected-reciter set still permits a new suggestion application, and closing the modal resets the guard.
- Regression suite expanded to 13 tests; Python compile checks pass.
- Exercised the repaired sync code against a deliberately emptied disposable copy of `app.db` using the authenticated test user's RLS token:
  - 2 profiles and 1 relationship;
  - 11 UUID classes;
  - 12 UUID assignments;
  - 9 class enrollments;
  - 28 UUID mistakes and 28 UUID occurrences;
  - zero pending/error class, assignment, or mistake rows.
- This isolated smoke test confirms the earlier packaged 8-mistake snapshot was incomplete and the repaired pull restores the full authorized set.
- The actual installed WebView session wizard reproduced the Back overwrite. Native and WebView evidence was captured as `040-session-back-overwrite-*` before applying the minimal guard.
- Closed the installed app normally after the checks; app, WebView, both PyInstaller processes, and ports 8000/9222 all cleared.

### Current Packaged Candidate and Workflow Validation

- Rebuilt/reinstalled repeatedly through the actual NSIS maintenance UI after the sync and wizard repairs; the tracked release artifact remains untouched.
- Current candidate package hashes before the tutorial-target repair:
  - release executable: `7149B837633168CF6C620F9BB7FE8552CE8F013F75C3EFC2A92DBDB12E1D3F7C`, 118,141,440 bytes;
  - NSIS installer: `C60A573FD892E824E93E9752FA491EBE31C0C9DA4E8FCA6E089678E6B61E1EB6`, 204,715,049 bytes;
  - sidecar: `3BE502FADCAC2054A93DB477175055375F29A0C2E759FEF03CE0638282C423BA`, 97,471,998 bytes.
- The package remains Authenticode `NotSigned`; the configured updater public key is preserved and the absent local private key still prevents signed updater artifact generation after a valid NSIS installer has been emitted.
- Fixed packaged frontend API routing: `.env.production` now explicitly targets the packaged sidecar at port 8000 instead of inheriting the development port 8010.
- Fixed tutorial navigation from the obsolete `/dashboard` path to the canonical `/` route.
- Serialized mistake push operations, enabled a 15-second SQLite busy timeout, and committed mistake-row status before occurrence network calls so rapid whole-word/character/haraka writes do not contend on a long SQLite write lock.
- Mirrored canonical per-reciter performance back into the local class-reciter snapshot and preserved it during class-enrollment pulls.
- Reconciled local occurrence IDs with their canonical UUIDs and removed only null-ID non-canonical duplicates. The current installed readback contains exactly three synced occurrence rows for the three validation mistakes.
- Final regression suite before the tutorial repair passed 16/16.
- Created canonical validation session `90672024-a873-4dae-aca4-e54daaa71f86` through the packaged wizard. The immediate route is a live-v3 UUID, and Hifz page 590, Sabqi Surah 93-96, and Revision Juz 30 remain intact after Back/Next.
- Validated packaged page 590 with the page-specific `QPC-Page-590` font loaded, 15 structured lines, and the Surah 84:25 boundary visible. Recorded one whole-word mistake with count 2, one character mistake, and one haraka mistake.
- Saved exact listener notes and `Excellent` performance; reload retained the UUID route, three highlighted words, notes, local class performance, local enrollment performance, and canonical mistake UUIDs.
- Reports render the new listening session and reciting session, expandable detail, July/Juz 30/Surah 84-85 filters, mistake/repeated-mistake views, and performance view. Inline Delete then Cancel was safe.
- Exported from the packaged UI:
  - PDF: 107,699 bytes, valid `%PDF-`, generated by the packaged backend/Playwright path;
  - CSV: 1,175 bytes, valid UTF-8 tabular content;
  - DOCX: 8,440 bytes, valid ZIP package containing `word/document.xml`.
- Automatic launch-time update-check failure previously produced a full-screen blocking error. Automatic failures now log a warning and leave the application usable; manual Settings checks still report errors to the user.
- The first 31-step tutorial run exposed another packaged defect: after starting the tutorial from Settings, the Dashboard could still be in its asynchronous loading state at steps 2-3, leaving Driver.js focused on a stale center point and blocking the highlighted Start Session button. Dashboard target steps now wait for their real DOM targets.
- Steps 8 and 13 also exposed default-viewport popover geometry defects: the Driver.js popover covered the required Hifz `By Surah` control and `Start Session` button. The highlighted elements and lateral popover positions were corrected.
- The final installed package completed all 31 tutorial steps with normal clicks and no forced interaction. Evidence records every title, counter, route, canonical tutorial class UUID, completion key, safe delete cancellation, representative screenshots, and final Dashboard return in `071-guided-tour-evidence.json`.
- One disposable session created solely during validation was unintentionally deleted while exercising the browser-confirm path; no pre-existing or production data was deleted. A replacement canonical validation session was created and retained. Further destructive coverage uses cancellation only.

### Reader, Settings, Contacts, and Authentication

- Standalone Reader:
  - rendered page 590 with `QPC-Page-590`, 141 titled spans, the Surah 84:25 boundary, and three persisted mistake highlights;
  - passed next/previous navigation, Surah 1 navigation, invalid page 605 rejection, and valid jump back to page 590;
  - rendered without horizontal overflow at maximized `1707x996`, default `1280x800`, and true minimum `900x600` logical viewports.
- Settings detected the real Tauri runtime and displayed `v2.0.0`. Profile fields/account metadata were present. Password mismatch validation was exercised without changing the password.
- Manual updater check reached `Up to date`; automatic launch checks remained non-blocking. The updater download/install path could not be exercised because no newer signed release was available.
- Contact modal kept Search disabled for empty input, handled a guaranteed nonexistent email safely, and closed without creating or removing a relationship.
- Signed-out authentication:
  - removed auth storage and redirected `/settings` to `/login`;
  - handled invalid credentials safely;
  - validated signup username rules without creating an account;
  - validated malformed reset-email input without sending mail;
  - reauthenticated through the packaged Login screen.
- A verified post-sign-out defect allowed a stale asynchronous profile result to repopulate `user` after the token/session was cleared. Authentication now requires both current `user` and `session`, and stale results are generation-guarded.
- A recurring `fetchProfile-onChange` timeout was traced to awaiting another Supabase request while inside `onAuthStateChange`. Profile I/O is now deferred until the auth callback releases Supabase's internal lock.
- The first deferred implementation briefly marked auth loading complete before the profile arrived, allowing ProtectedRoute to redirect a valid full reload to Login. Loading completion now occurs in the deferred profile request's `finally`. Final full reload remains on `/settings`, keeps the auth token, loads the profile, triggers local sync, and emits no error/warning.

### Persistence, Synchronization, and Recovery

- Normal close removed the app, WebView, PyInstaller parent/child, and ports 8000/9222. Shortcut relaunch restored authenticated Dashboard state and a healthy sidecar.
- Read-only local/RLS cloud comparison for `90672024-a873-4dae-aca4-e54daaa71f86` confirmed:
  - one canonical listener-owned cloud session;
  - exact validation notes;
  - three assignments;
  - one reciter with `Excellent` performance;
  - exactly three canonical mistake occurrences;
  - matching synced local class, assignments, enrollment performance, canonical mistakes, and occurrences.
- Four local pending classes/eight assignments remain, but all belong to other identities preserved in the shared pre-validation database; none belong to the current authenticated identity and none has a canonical ID. Current-user canonical evidence is fully synced.
- Offline WebView emulation kept the Sessions shell visible and interactive while network/local HTTP requests failed with expected `ERR_INTERNET_DISCONNECTED`; restoring connectivity and reloading recovered the packaged UI and data.
- `/sessions/not-a-uuid` renders `Session not found`, and `Back to Sessions` recovers.
- Missing installed sidecar:
  - native launch exits `101` with the explicit `failed to spawn sidecar`/file-not-found panic;
  - no app/WebView/backend orphan or port remains;
  - restoring the exact backed-up sidecar restores normal launch and health.
- Port 8000 preoccupied by the exact installed sidecar:
  - Tauri still opened and rendered authenticated Dashboard against the existing healthy sidecar;
  - no duplicate backend remained after application close.
- Windows Application error events and the installed backend log contain no unexpected QuranTrack application crash, traceback, SQLite lock, unique-constraint, or address-in-use entry after final recovery.

### Exact Final Validation Candidate

- Evidence copy: `screenshots/2026-07-26-codex-desktop-windows-tauri-validation/packages/final-validation-candidate`.
- Release executable: 118,141,440 bytes, SHA-256 `AEDCE063B5F0BF5A1925406FEDF10F08AB63CF9312C2CDD4A95E946522E5D6F8`, version `2.0.0`, Authenticode `NotSigned`.
- NSIS installer: 204,719,139 bytes, SHA-256 `016AAEAC1C3AA0CBD930FE206825D4CBCFFDE38080E7F5017C7E4F97AB2BCA92`, version `2.0.0`, Authenticode `NotSigned`.
- Frozen sidecar: 97,471,998 bytes, SHA-256 `3BE502FADCAC2054A93DB477175055375F29A0C2E759FEF03CE0638282C423BA`, Authenticode `NotSigned`.
- Installed application: 118,141,440 bytes, SHA-256 `7EE8E9CF9CB13267F2D38CC3708C58049D1B85253E0DDDC06A07763C0CC0944F`, version `2.0.0`, Authenticode `NotSigned`. The installed executable differs from the post-bundle target because of Tauri's updater-artifact transform; the installed JS asset and behavior match the final NSIS candidate.
- Installed sidecar is byte-identical to the tested frozen sidecar.
- PyInstaller inventory contains only `.env.public\.env.local`; final key-name inspection contains the public Supabase URL/anon key and local API base only. No service-role key, JWT secret, updater private key, or signing private key is bundled.
- Preserved release artifact `releases/QuranTrack-Windows-2.0.0-x64-setup.exe` remains byte-identical at SHA-256 `8F076FE346D277F48A231C25DBD6D54CBE891E84E5B463D69EE08ADD3F52DCC2`.

## Issues Encountered

- Windows Sandbox/VM is unavailable on this Home-edition host, so clean-install coverage is explicitly an in-place clean-install simulation with the prior installation/profile preserved first.
- The repository-wide lint backlog remains pre-existing and non-zero; production builds pass.
- GitHub updater connectivity can fail with `ConnectError` on this host. Automatic failure no longer blocks application startup.
- Repeated AuthContext profile-fetch timeouts and protected-route races were repaired and rerun; clean full-reload evidence now contains no error or warning.
- The packaged binaries and NSIS installer are not Authenticode signed, and updater signing material is intentionally unavailable on this validation machine.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `docs/Logs/2026-07-26-004-windows-tauri-release-validation.md` | Created/updated | Live Windows packaged-release validation record |
| `quran_frontend/src-tauri/Cargo.toml` / `Cargo.lock` | Updated | Align native executable version to 2.0.0 |
| `quran_backend/QuranTrackBackend.spec` | Updated | Exclude privileged backend environment; bundle public frontend configuration |
| `quran_backend/main.py` | Updated | Verified user-token auth, valid migrations, canonical session/mistake handling, local performance mirror |
| `quran_backend/sync_service.py` | Updated | RLS-bound complete pull/push, SQLite contention control, canonical occurrence reconciliation |
| `quran_backend/tests/test_listener_reciter_schema_sql.py` | Updated | Release regression coverage |
| `quran_frontend/.env.production` | Updated | Package local API base at port 8000 |
| `quran_frontend/src/contexts/TourContext.tsx` | Updated | Canonical Dashboard tour routing |
| `quran_frontend/src/contexts/AuthContext.tsx` | Updated | Session-bound route protection, stale-result guard, deferred lock-safe profile load |
| `quran_frontend/src/lib/tour.ts` | Updated | Async target readiness and unobstructed interactive popover geometry |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Updated | Preserve edited portions across Back/Next |
| `quran_frontend/src/lib/local-api.ts` / `src/api.ts` | Updated | Mirror canonical per-reciter performance locally |
| `quran_frontend/src/lib/updater.ts` | Updated | Keep automatic updater connectivity failure non-blocking |

## Tests Run

| Test | Result |
|------|--------|
| Prerequisite document audit | Pass |
| `git status --short --branch` | Pass — expected `main`, seven commits ahead, only preserved untracked logs/temp files |
| `git log --oneline -10` | Pass — HEAD is required `890e24f` |
| `git diff --check` | Pass |
| `npm run build` | Pass — 131 modules, 17.30 seconds |
| `npm run lint` | Existing backlog — 167 findings; non-release build remains green |
| `python -m unittest discover -s tests` | Pass — 6/6 |
| Backend targeted `py_compile` | Pass |
| `cargo check` | Pass |
| Post-repair backend regression suite | Pass — 9/9 |
| Post-repair `python -m py_compile main.py sync_service.py` | Pass |
| Post-repair `cargo check` | Pass |
| Post-repair `npm run build` | Pass — 131 modules, 17.63 seconds |
| Repaired frozen sidecar against copied legacy `app.db` | Pass — migration and health |
| Repaired sidecar archive secret inventory | Pass — public keys only |
| Repaired sidecar missing/invalid auth | Pass — 401/401 |
| Repaired Tauri/NSIS build | Functional bundle emitted; updater signing exit 1 due intentionally absent private key |
| Repaired NSIS maintenance/reinstall walkthrough | Pass |
| Installed version/shortcut/sidecar integrity | Pass |
| Default/minimum/intermediate/maximized viewport matrix | Pass |
| Installed dark/light theme rendering | Pass |
| Installed local-first read/full-sync probe | Pass — HTTP 200 throughout |
| Final repair regression suite | Pass — 18/18 |
| Isolated empty-DB live-v3/RLS sync smoke | Pass — complete UUID child snapshots, zero pending/errors |
| Canonical packaged session wizard | Pass — UUID route and Back/Next portion preservation |
| Packaged page-590 classroom/mistake workflow | Pass — QPC font, 84:25, whole/character/haraka, notes/performance persistence |
| Packaged report/filter workflow | Pass |
| Packaged PDF/CSV/DOCX exports | Pass — valid non-empty formats |
| Packaged 31-step tutorial first run | Fail at step 3 — Dashboard target rendered asynchronously; repaired |
| Packaged tutorial geometry diagnostics | Fail at steps 8 and 13 — required buttons obstructed; repaired |
| Final packaged 31-step tutorial | Pass — all steps, counters, routes, normal clicks, UUID session, completion |
| Standalone Reader page/navigation/highlight matrix | Pass |
| Reader minimum/default/maximized resize matrix | Pass |
| Settings/version/password/manual updater | Pass — manual updater reports Up to date |
| Contact empty/not-found/cancel workflow | Pass |
| Signed-out auth/protected-route/signup/reset validation | Pass after repair |
| Full protected-route reload/profile lock probe | Pass — token/profile retained, no error/warning |
| Normal close/reopen/auth persistence | Pass |
| Read-only local/RLS cloud canonical comparison | Pass |
| Offline UI and online recovery | Pass |
| Invalid session UUID recovery | Pass |
| Missing sidecar launch/restore | Pass — explicit exit 101, exact restore recovers |
| Port 8000 collision/recovery | Pass |
| Windows Application/backend log diagnostic scan | Pass — no unexpected final error |
| Final `npm run build` | Pass — 131 modules |
| Final `cargo check` | Pass |
| Final backend `py_compile` | Pass |
| Final `git diff --check` | Pass — line-ending warnings only |
| Normal close after repaired-package checks | Pass — no orphan process/listener |
| Sidecar PyInstaller build | Pass — 188.59 seconds |
| Standalone sidecar health | Pass — 114 surahs, 6,236 ayahs |
| Baseline `npm run tauri:build` | Functional bundle emitted; updater signing exit 1 due missing private key |
| Baseline NSIS uninstall/install walkthrough | Pass |
| First packaged shortcut launch | Pass |
| Baseline packaged local-first reads/sync | Fail — missing `supabase_id` migration |

## Next Steps

- [x] Complete all required prerequisite reading.
- [x] Inventory build/release state and desktop automation options.
- [x] Build, install, and validate the packaged Windows application and NSIS installer.
- [x] Execute the complete runtime matrix and capture evidence.
- [x] Fix verified defects minimally and rerun affected coverage.
- [x] Record the final release verdict.

## Final Verdict

**NOT SAFE TO BUILD/PUBLISH FINAL WINDOWS RELEASE.**

The exact candidate is functionally safe in the tested runtime matrix: all verified application defects were repaired, affected coverage passed, canonical local/cloud persistence matches, and final source checks are green. Distribution is still blocked because:

1. the release executable, installed executable, sidecar, and NSIS installer are all Authenticode `NotSigned`;
2. Tauri updater signing is configured with a public key but the required private key is unavailable, so every build exits non-zero after emitting the valid NSIS installer and cannot emit signed updater artifacts.

No updater keys were added, changed, weakened, or exposed. The tracked final installer was not replaced. A release owner with authorized signing material must produce and sign a new candidate, then rerun signature verification, updater-manifest/artifact validation, and a focused install/update smoke before publication.

## Notes

- Do not push.
- Do not alter production schema or updater signing keys.
- Do not replace the tracked final release artifact during validation.

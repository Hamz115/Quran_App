# QuranTrack Codex Desktop Windows/Tauri Release Validation Handoff

**Date:** 2026-07-26
**Session:** 003
**Purpose:** Give a fresh Codex Desktop session the full context, safety boundaries, build sequence, computer-use workflow, and acceptance criteria for independently validating the packaged QuranTrack Windows application.
**Repository:** `C:\Users\hamza\Documents\Quran_App` on Hamza's personal Windows laptop
**Primary product under test:** Packaged Tauri/React Windows application with bundled Python Quran backend sidecar
**Do not push.**

## 1. What Hamza Wants

Hamza wants Codex Desktop to perform the same unusually rigorous, self-directed computer-use validation on the real Windows application that the prior Codex Desktop session performed on the Flutter Android app.

Hamza does **not** want a checklist handed back to him. Codex must operate the Windows application itself: build it, install it, launch it, visually inspect it, click through it, enter safe test data, collect screenshots/logs, reproduce problems, apply only verified fixes, rebuild, reinstall, and rerun failed and affected workflows.

The normal desktop product is not merely the React app in Chrome. The release product is:

- React/TypeScript UI;
- hosted inside the Tauri WebView2 shell;
- bundled with a PyInstaller/FastAPI Quran backend sidecar;
- distributed as an NSIS Windows installer.

Existing BrowserOps/Chrome validation is useful but does not prove installer behavior, WebView rendering, native window behavior, sidecar lifecycle, packaged data paths, or clean installation. This session must test the **packaged Windows application** as the primary target.

## 2. Required Reading Before Acting

Read these completely:

- `AGENTS.md`
- `docs/Logs/2026-07-25-001-production-readiness-audit-v2.1.0.md`
- `docs/Logs/2026-07-25-002-listener-reciter-schema-staging.md`
- `docs/Logs/2026-07-25-003-pre-v3-runtime-regression.md`
- `docs/Logs/2026-07-25-004-live-v3-rollout-and-android-validation.md`
- `docs/Logs/2026-07-25-005-listener-reciter-ui-terminology-polish.md`
- `docs/Logs/2026-07-25-006-flutter-visual-redesign.md`
- `docs/Logs/2026-07-26-001-codex-desktop-android-emulator-validation-handoff.md`
- `docs/Logs/2026-07-26-002-android-emulator-release-validation.md`
- This handoff file

Also inspect completely or sufficiently to understand runtime/build behavior:

- `quran_frontend/package.json`
- `quran_frontend/src-tauri/tauri.conf.json`
- `quran_frontend/src-tauri/Cargo.toml`
- `quran_frontend/src-tauri/src/lib.rs`
- `quran_frontend/src-tauri/src/main.rs`
- `quran_frontend/src-tauri/nsis/hooks.nsh`
- `quran_backend/QuranTrackBackend.spec`
- `quran_backend/main.py`, especially startup and `/api/health`
- React router, authentication, contacts, dashboard, sessions, classroom, Quran reader, reports, settings, tutorial, updater, synchronization, and report-export code

Do not begin build/install work until the context and architecture are understood.

## 3. Repository Baseline and Preservation

The Android computer-use validation completed successfully and its verified fixes were committed as:

- `890e24f fix: resolve Android release validation defects`

Expected baseline after synchronization:

- Branch: `main`
- HEAD: `890e24f`
- Ahead of `origin/main`: seven commits
- Existing redesign commit: `d23e574`
- No push has occurred

At the beginning, run:

- `git status --short --branch`
- `git log --oneline -10`
- `git diff --check`

If HEAD is not yet `890e24f`, wait for project synchronization or inspect carefully before changing anything. Do not reset, rebase, discard, overwrite, or recreate the prior Android fixes. Do not edit Flutter code during this Windows/Tauri session unless a shared cross-client defect genuinely requires it and the evidence proves that requirement.

Preserve required compatibility identifiers and all seven local commits. Never push.

Ignore but preserve any `~syncthing~*.tmp` files if they temporarily appear. Do not stage or commit synchronization artifacts.

## 4. Current Windows/Tauri Configuration

Known values at handoff creation:

- Product name: `QuranTrack`
- Tauri identifier: `com.qurantrack.desktop`
- Tauri/application version: `2.0.0`
- Initial window: `1280 x 800`
- Minimum window: `900 x 600`
- Bundle target: NSIS
- External binary: `quran-backend`
- Backend health endpoint: `http://localhost:8000/api/health`
- Expected Quran health counts: 114 surahs and 6,236 ayahs
- Updater endpoint: GitHub `latest.json`
- Existing release filename: `releases/QuranTrack-Windows-2.0.0-x64-setup.exe`
- Previous installer checksum, before the final terminology work: `8F076FE346D277F48A231C25DBD6D54CBE891E84E5B463D69EE08ADD3F52DCC2`

The previous installer predates the final React terminology commit and must **not** be treated as the final current build. Build a fresh validation installer from the exact current source.

Updater signing is configured, but previous Tauri packaging returned a non-zero final status after producing the installer because `TAURI_SIGNING_PRIVATE_KEY` was unavailable. Do not invent, expose, replace, or weaken signing keys. Distinguish:

- a valid NSIS installer being emitted;
- optional/updater signing artifact failure;
- actual application build failure.

## 5. Protected Functionality

Do not break or casually rewrite:

- Live-v3 listener/reciter/session schema compatibility.
- Required legacy internal fields/routes/views used for compatibility.
- Secure Add Contact behavior and anti-enumeration constraints.
- Supabase RLS and production security behavior.
- UUID-based session navigation.
- Quran/QPC fonts, page mappings, glyphs, words, and databases.
- All 604 page mappings.
- Page 590 and Al-Inshiqaq `84:25` boundary behavior.
- Whole-word and character mistake semantics.
- Notes, performance, reports, exports, persistence, and synchronization.
- React/Tauri tutorial targets and flow.
- Android validation fixes and evidence.
- Existing logs and local commits.

Visible UI must consistently use listener/reciter/session terminology. Required internal compatibility names may remain.

Do not apply database migrations, alter RLS, modify production functions, or delete production/test data. Use isolated existing test identities and clearly named test records. If credentials or a destructive action are required and unavailable, mark only that test blocked and continue safe coverage.

## 6. Mandatory Testing Philosophy

This must be a real packaged-app validation, not merely:

- `npm run build` passing;
- opening Vite in Chrome;
- launching `tauri dev`;
- seeing the login/dashboard once;
- calling `/api/health` once.

Use Codex Desktop computer control to operate the real installed application. Terminal commands, PowerShell, process inspection, HTTP checks, logs, file hashes, and source inspection supplement computer use; they do not replace visual inspection.

For each meaningful state:

- capture a real screenshot;
- record the current build/hash;
- note window size and theme;
- inspect visual quality and behavior;
- monitor frontend, Tauri, sidecar, and Windows errors;
- retain reproducible evidence.

Do not mark a test PASS unless it was actually executed against the packaged app.

## 7. Evidence and Result Locations

Create runtime evidence under:

- `screenshots/2026-07-26-codex-desktop-windows-tauri-validation/`

Create the final detailed result log as:

- `docs/Logs/2026-07-26-004-windows-tauri-release-validation.md`

Use truthful real screenshots only. Do not substitute generated/mock images.

Record all commands, build hashes, installer hashes, package version, installation path, process IDs, sidecar health, runtime logs, failures, fixes, reruns, and final verdict.

## 8. Phase A — Preflight and Exact-Source Build

### 8.1 Repository and toolchain

Verify:

- correct repository and branch;
- HEAD `890e24f` or explicitly document a later legitimate commit;
- no unrelated editor/session is modifying the same files;
- Node/npm versions;
- Rust/Cargo/Tauri versions;
- Python/uv/PyInstaller environment;
- WebView2 runtime availability;
- Windows architecture;
- available disk space;
- no stale Vite/Tauri/backend process that could create a false pass.

Do not terminate unrelated processes without identifying them. Prefer graceful application closure.

### 8.2 Automated source checks

Run and record:

- React/TypeScript production build;
- applicable frontend lint/tests;
- backend listener/reciter migration/copy tests;
- any existing Tauri/Rust checks;
- `git diff --check`;
- terminology regression tests.

Distinguish pre-existing warning backlog from new errors. Do not rewrite unrelated files simply to silence old warnings.

### 8.3 Rebuild the sidecar

Rebuild the PyInstaller backend from the current exact source. Verify:

- expected executable is produced;
- it is copied to the Tauri external-binary path expected by the target triple;
- executable timestamps and SHA-256 correspond to this run;
- bundled Quran and app databases resolve from packaged paths, not accidentally from the source checkout;
- standalone sidecar `/api/health` returns healthy with 114 surahs and 6,236 ayahs;
- no credentials are printed.

Gracefully stop the standalone health-check instance before packaged-app testing so the Tauri app must launch its own sidecar.

### 8.4 Build the packaged application

Build Tauri/NSIS from the exact current source. Record:

- exact command;
- build duration;
- release executable path/hash;
- NSIS installer path/hash;
- whether updater signing artifacts succeeded or failed;
- any warnings/errors;
- proof that the installer contains the fresh sidecar.

Do not overwrite `releases/QuranTrack-Windows-2.0.0-x64-setup.exe` during initial validation. Keep the validation installer in the normal Tauri bundle output or a clearly named evidence path. Replacement of final release artifacts occurs only after a SAFE verdict and Hamza's next instruction.

## 9. Phase B — Installer and Clean-Install Validation

The ideal environment is Windows Sandbox or another clean disposable Windows environment. Determine what is available without enabling operating-system features or changing security configuration.

### 9.1 Clean environment preference

Use, in order of preference:

1. Existing Windows Sandbox, if already enabled and computer-control interaction works.
2. Existing disposable Windows VM, if already available.
3. A carefully documented clean-install simulation on the laptop using the actual NSIS installer after preserving current state.

Do not claim a clean-machine test if only an in-place reinstall was performed. Label the environment truthfully.

### 9.2 Installer walkthrough

With computer control, inspect and test:

- installer branding, icon, title, publisher text, version, and language;
- install path and permissions;
- UAC behavior if applicable;
- progress and completion states;
- Start menu/desktop entries actually created;
- installed executable metadata and icon;
- first launch from installed shortcut, not from source or `target` directory;
- no requirement for Node, npm, Rust, Python, Vite, or the source repository at runtime;
- no SmartScreen/signing problem falsely ignored;
- app appears in installed-apps/uninstall registration;
- reinstall/repair behavior where safe;
- clean uninstall and reinstall if an isolated environment is available.

Do not delete personal application data without first identifying it and ensuring it belongs only to isolated test identities. Record whether uninstall intentionally preserves or removes user data.

## 10. Phase C — Packaged Runtime and Sidecar Lifecycle

This is release-critical.

### 10.1 First packaged launch

Confirm:

- the installed `QuranTrack` executable launches normally;
- no console or source dev server is required;
- only the intended main window appears;
- title, icon, initial size, centering, and minimum dimensions match configuration;
- no blank screen, white flash loop, CSP failure, missing asset, or WebView error;
- authentication or restored authenticated state loads correctly.

### 10.2 Sidecar startup

Prove that the packaged Tauri application launches the bundled backend itself:

- identify the sidecar process path and parent/lifecycle relationship;
- verify only the expected number of sidecar instances;
- call `/api/health` and confirm 114 surahs/6,236 ayahs;
- inspect backend logs;
- verify database paths are packaged/user-data paths rather than accidental source-tree dependencies;
- verify Quran page API calls work from the installed app;
- verify app-data DB creation/migration on first run where safely possible.

### 10.3 Sidecar shutdown and restart

- Close QuranTrack normally and verify the child sidecar exits.
- Relaunch and verify one fresh healthy sidecar starts.
- Repeat after deliberate app restart.
- Check for orphaned processes and port 8000 conflicts.
- If a port-collision path is tested, do it safely, restore the state, and distinguish expected error handling from a product defect.

Do not mark sidecar lifecycle PASS if a separately launched backend remained on port 8000.

## 11. Phase D — Visual and Native Window Matrix

Inspect the installed app at:

- default 1280x800;
- minimum 900x600;
- maximized;
- at least one intermediate resized state;
- Windows display scaling currently in use;
- both light and dark themes.

Across every screen check:

- no clipping, overlap, horizontal scroll, hidden controls, or unreadable contrast;
- typography hierarchy;
- Arabic/QPC rendering;
- cards, spacing, borders, shadows, and dialogs;
- mouse hover, keyboard focus, tab order, Enter/Escape behavior;
- native title bar/window controls;
- scrollbars;
- dropdowns, popovers, modals, and toasts;
- long names and empty states;
- loading/error/disabled/success states;
- content not hidden at minimum window size;
- no old teacher/student/class visible wording unless quoting historical data.

Capture representative screenshots at each size/theme.

## 12. Phase E — Authentication and Security Surfaces

Using the packaged app:

- inspect Login, Sign Up, Forgot Password, validation, focus, keyboard, password visibility, loading, and errors;
- verify light/dark theme behavior before login;
- verify sign-out confirmation and return to Login;
- verify restored authenticated startup if a safe cached test session exists;
- verify protected routes cannot be opened unauthenticated;
- verify invalid credentials produce safe generic feedback;
- do not guess or expose passwords;
- do not create an account or send reset email unless an isolated address and explicit safety are established.

If no valid credentials are available, document the blocker, test safe auth validation thoroughly, and use an existing cached isolated session for authenticated coverage if present. Never ask Hamza to paste passwords or OTPs into chat.

## 13. Phase F — Complete Listener/Reciter/Session Workflow

Use distinctive isolated evidence names and preserve identifiers in the log without exposing secrets.

### 13.1 Dashboard

- Verify correct role-specific dashboard.
- Inspect counters, quick actions, recent sessions, empty/populated states, refresh, and terminology.
- Check theme and all window sizes.

### 13.2 Contacts

- Open contacts from every intended navigation path.
- Test empty/not-found lookup, secure Add Contact, success, duplicate, and refresh behavior.
- Confirm no unrestricted profile enumeration or sensitive details.
- Use an existing isolated counterpart where possible.

### 13.3 Session creation

- Create a new session through canonical live-v3 fields.
- Select the intended listener/reciter.
- Exercise Hifz, Sabqi, and Manzil/Revision assignment modes as supported by the Windows UI.
- Include page 590 / Surah 84 boundary in at least one assignment.
- Verify validation, selectors, keyboard behavior, scrolling, cancel/back, and UUID navigation.

### 13.4 Classroom

- Verify participant identity and assignment sections.
- Exercise Hifz/Sabqi/Revision tabs and controls.
- Confirm state transitions and dialogs.
- Confirm no stale class/session terminology.

### 13.5 Quran/QPC reader

This is release-critical:

- Verify page 590 begins at Al-Inshiqaq `84:25`.
- Verify the Al-Buruj transition and bismillah/header behavior.
- Verify page and Surah navigation.
- Verify exact QPC font/glyph rendering, RTL order, word positioning, and no generic-font substitution.
- Ensure overlays and controls do not obscure Quran text.
- Capture high-quality real screenshots.

### 13.6 Mistakes

- Create whole-word and character-level mistake evidence using the supported desktop interaction.
- Verify selection corresponds to the intended Quran word/character.
- Verify occurrence counts, highlights, undo/delete behavior where safe, and report aggregation.
- Confirm no duplicate canonical mistakes or schema errors.

### 13.7 Notes and performance

- Save a distinctive note and performance value.
- Reopen and confirm persistence.
- Test editing/canceling if supported.
- Verify keyboard, dialog, success, and error states.

### 13.8 Reports

- Exercise listening and reciting report modes.
- Verify filters, aggregates, session rows, detail views, empty states, and role terminology.
- Confirm the new evidence appears with correct assignments, mistakes, note, and performance.
- Compare against canonical Supabase state safely.

### 13.9 Exports

Exercise supported desktop exports, including PDF/DOCX where available:

- native save dialog;
- default filename;
- cancellation;
- successful save to an isolated evidence folder;
- exported file exists, has nonzero size, and opens;
- listener/reciter/session terminology in export content;
- Arabic/Quran text and report layout where applicable;
- no source path or secret leakage.

## 14. Phase G — Tutorial, Settings, and Updater

### 14.1 Desktop tutorial

Run the complete React/Tauri guided tutorial using the installed app:

- every target exists and is visible;
- interactive targets perform real actions;
- overlay positioning survives 1280x800, 900x600, and maximized states where practical;
- scrolling reveals off-screen targets;
- Next/Back/Skip/Finish behave correctly;
- terminology is listener/reciter/session;
- Finish lands on the intended dashboard and does not leave stale overlays/routes.

Do not assume the Android tutorial fixes apply to React/Tauri; validate the desktop implementation independently.

### 14.2 Settings

Test:

- theme persistence;
- profile/account display;
- password validation surfaces without unsafe mutations;
- update control;
- sign-out confirmation;
- application/version information;
- any data/storage controls using isolated data only.

### 14.3 Updater

- Trigger the packaged update check.
- Record network request/result and user-visible state.
- Verify absence of a release/signing artifact is handled safely.
- Do not weaken updater verification, alter the public key, publish GitHub assets, or expose a signing private key.
- Distinguish `Up to date`, unavailable manifest, unsigned artifact, and application crash.

## 15. Phase H — Persistence, Synchronization, and Recovery

### 15.1 Restart persistence

- Close and reopen the installed app.
- Confirm auth state, theme, contacts, sessions, assignments, mistakes, notes, performance, reports, and window behavior persist as designed.
- Repeat after sidecar restart.

### 15.2 Cross-client/live-v3 synchronization

- Verify Windows-created evidence reaches canonical Supabase tables/views.
- Verify it is visible from the existing Android/test side where practical or through a safe authenticated canonical readback.
- Verify an existing Android-created session remains visible in Windows.
- Confirm no duplicates, orphan rows, stale teacher/student assumptions, or RLS failures.

Do not apply migrations or change policies/functions.

### 15.3 Safe recovery/error paths

Where practical without changing operating-system security or production data, exercise:

- temporary sidecar unavailable/startup delay;
- API/page-load failure messaging;
- offline/network error UI using a reversible method;
- app relaunch after failure;
- invalid/stale navigation route;
- empty databases only in an isolated disposable installation if available.

Restore normal operation and rerun the affected workflow.

## 16. Runtime Diagnostics

Collect and inspect:

- Tauri/Rust stdout/stderr where available;
- sidecar backend log;
- Windows Application event entries for QuranTrack/sidecar;
- WebView/frontend console errors where accessible;
- network failures relevant to Supabase/updater/fonts;
- process tree before launch, during use, and after close;
- port 8000 ownership;
- installed file layout;
- app-data file layout;
- hashes of exact tested executable, sidecar, and installer.

A successful run requires no:

- application crash;
- sidecar crash;
- unhandled React exception;
- blank WebView;
- fatal Rust panic;
- repeated uncaught promise rejection;
- database/path failure;
- Quran page-load failure under normal packaged operation;
- orphaned sidecar after normal close;
- critical CSP/font/resource failure;
- Render/layout defect that blocks operation.

## 17. Fixing Verified Defects

When a genuine defect is discovered:

1. Capture the exact reproduction and evidence first.
2. Identify whether it belongs to React, Tauri, NSIS, sidecar, packaging, or environment.
3. Apply the smallest compatible fix.
4. Do not redesign unrelated screens during validation.
5. Run targeted checks plus full affected automated suites.
6. Rebuild the sidecar/React/Tauri layer actually affected.
7. Reinstall the exact patched package if packaging changed.
8. Repeat the failed workflow with computer use.
9. Repeat adjacent regression coverage.
10. Document before/after evidence.

Do not commit or push automatically. Leave verified changes and the final report for Kyle/Hamza to review.

## 18. Acceptance Matrix

A `SAFE TO BUILD/PUBLISH FINAL WINDOWS RELEASE` verdict requires:

- React production build passes.
- Applicable tests/lint checks have no release-blocking errors.
- Tauri release executable and NSIS installer build from exact source.
- Fresh bundled sidecar is proven by hash and health counts.
- Actual NSIS installation and shortcut launch pass.
- Packaged app runs without Vite/source dependencies.
- Sidecar launches exactly as intended and exits with the app.
- Major screens pass at default, minimum, maximized, light, and dark states.
- Secure contacts and UUID session creation pass.
- Classroom and page 590 / `84:25` QPC rendering pass.
- Mistakes, notes, performance, reports, and exports pass.
- Desktop tutorial passes.
- Restart persistence passes.
- Live-v3 canonical readback/synchronization passes.
- No app/sidecar crash or release-blocking runtime error remains.
- Installer/executable/sidecar hashes and evidence are recorded.
- Clean-machine status is labeled truthfully.

If the installer is functionally valid but updater signing is unavailable, report that separately as a distribution/signing blocker. Do not conflate it with application runtime quality.

## 19. Final Report Requirements

The final log must include:

- exact AST start/end time and duration;
- baseline commit and final working-tree state;
- toolchain versions;
- build commands/results;
- exact executable, sidecar, and installer hashes;
- installation environment and whether it was genuinely clean;
- process/port/health evidence;
- every matrix row marked PASS, FAIL, BLOCKED, or NOT RUN;
- screenshot/log/evidence paths;
- all verified defects and minimal fixes;
- every rebuild/reinstall/rerun;
- untested items and why;
- remaining release/distribution blockers;
- explicit verdict:
  - `SAFE TO BUILD/PUBLISH FINAL WINDOWS RELEASE`, or
  - `NOT SAFE TO BUILD/PUBLISH FINAL WINDOWS RELEASE`.

Do not issue a SAFE verdict based only on browser/Vite testing.

## 20. Work That Must Wait

Until this validation is complete:

- Do not replace the tracked final Windows installer in `releases/`.
- Do not push any commits.
- Do not publish a GitHub release.
- Do not alter updater keys or manifests.
- Do not modify live schema/RLS/functions.

After a SAFE verdict, Kyle will independently review the changes/evidence, commit verified fixes, rebuild/copy the final release artifacts, record final checksums, and request Hamza's explicit approval before pushing.

## 21. Final Instruction to Codex Desktop

Take ownership of the complete packaged Windows validation. Use your computer-control capability on the installed Tauri application itself. Do not hand the checklist back to Hamza, do not stop after the first successful launch, and do not substitute Chrome/Vite testing for packaged-app evidence. Continue methodically through installer, sidecar, visual, workflow, persistence, synchronization, tutorial, updater, and recovery coverage; fix only verified defects; rerun affected paths; and return a fully evidenced release verdict.

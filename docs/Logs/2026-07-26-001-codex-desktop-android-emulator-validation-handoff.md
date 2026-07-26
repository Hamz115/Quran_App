# QuranTrack Codex Desktop Android Emulator Validation Handoff

**Date:** 2026-07-26
**Session:** 001
**Purpose:** Give Codex Desktop the complete context and acceptance criteria for independently testing the redesigned QuranTrack Flutter Android application through a visible Pixel 7 emulator.
**Repository:** `C:\Users\hamza\Documents\Quran_App` on Hamza's personal Windows laptop
**Current branch:** `main`, with six local commits ahead of `origin/main` when this handoff was prepared
**Do not push.**

## 1. What Hamza Wants From This Session

Hamza does **not** want instructions telling him to manually test the application. He wants Codex Desktop to perform the Android emulator validation itself using its computer-control capability, with screenshots and terminal/ADB evidence where useful.

This is a real release-validation session, not a superficial check that the splash screen opens. Codex must:

1. Read and understand the project history and redesign scope.
2. Launch and control the visible Pixel 7 Android emulator on the Windows laptop.
3. Install and open the latest redesigned Flutter debug build.
4. Inspect every major redesigned screen in both light and dark themes.
5. Execute the core listener/reciter/session workflow end to end.
6. Check persistence, synchronization, tutorial targets, Quran rendering, and runtime errors.
7. Fix only issues actually discovered, validate each fix, and document everything.
8. Leave a precise result: passed items, failed items, screenshots/evidence, fixes, remaining risks, and whether final release builds are safe to produce.

Do not return after merely opening the emulator or seeing the splash screen.

## 2. Required Reading Before Testing

Read these files completely before acting:

- `AGENTS.md`
- `docs/Technical Implementation Journey/Flutter App Overhaul/00-OVERVIEW.md`
- `docs/Logs/2026-07-25-003-pre-v3-runtime-regression.md`
- `docs/Logs/2026-07-25-004-live-v3-rollout-and-android-validation.md`
- `docs/Logs/2026-07-25-005-listener-reciter-ui-terminology-polish.md`
- `docs/Logs/2026-07-25-006-flutter-visual-redesign.md`
- This handoff file

Also inspect:

- `quran_mobile/lib/config/app_colors.dart`
- `quran_mobile/lib/config/theme.dart`
- `quran_mobile/lib/main.dart`
- The changed Flutter screens/widgets from commit `d23e574`

Run `git status --short --branch` and `git log --oneline -8` before changing anything. Preserve all six existing local commits and any legitimate uncommitted handoff/log files. Never reset, discard, overwrite, or push them.

## 3. Current Project State

The following work was already completed before this handoff:

- Production contact/security migration.
- Correction and verification of all 604 Quran page mappings.
- Listener/reciter/session migration across React/Tauri, Flutter, SQLite v6, FastAPI, synchronization, reports, tests, and Supabase.
- Live Supabase v3 migration with RLS, compatibility views, triggers, constraints, and integrity checks.
- Pre-v3 and post-v3 Android/web runtime workflows.
- Visible teacher/student/class terminology cleanup to listener/reciter/session where appropriate.
- Genuine Flutter visual redesign, not just wording changes.
- Flutter formatting and tests passed.
- Flutter analysis had no compile errors, though an existing warning backlog remains.
- Debug APK built and installed successfully.
- Redesigned splash was seen on the Pixel 7 emulator.

Latest redesign commit:

- `d23e574 feat: redesign Flutter mobile experience`

The repository had a clean working tree and was six commits ahead of `origin/main` immediately after the redesign commit. Nothing was pushed.

## 4. Important Preservation Requirements

Do not break or casually rewrite any of the following:

- Live-v3 listener/reciter/session schema compatibility.
- Legacy internal compatibility identifiers required by older clients or staged migrations.
- Quran/QPC fonts and exact Madani Mushaf rendering.
- All 604 page mappings.
- Page 590 and Al-Inshiqaq `84:25` behavior.
- Character/whole-word mistake capture behavior.
- Existing synchronization and offline persistence.
- Existing tutorial `GlobalKey` targets and tutorial sequencing.
- UUID-based navigation and session creation.
- Existing Supabase RLS/security behavior.
- Existing local commits and detailed project logs.

Visible UI should use listener/reciter/session terminology, but internal legacy field names may remain where compatibility requires them.

Do not modify the live database schema during this validation. Do not delete production data. Prefer the existing isolated test accounts/test records. If login credentials or a destructive action are required and unavailable, stop only that specific subtest, clearly record the blocker, and continue all safe tests.

## 5. Windows Emulator Environment

Target computer:

- Hamza personal laptop
- Windows 11
- User: `hamza`
- Project: `C:\Users\hamza\Documents\Quran_App`
- Flutter project: `C:\Users\hamza\Documents\Quran_App\quran_mobile`
- Android SDK: `%LOCALAPPDATA%\Android\Sdk`
- AVD: `Pixel_7`
- App package: `com.quranlogbook.quran_mobile`

A helper exists on the Windows desktop:

- `C:\Users\hamza\Desktop\QuranTrack Emulator Test.cmd`

It is intended to:

1. Copy the stable SwiftShader `libEGL.dll` and `libGLESv2.dll` into the emulator QEMU directory.
2. Launch a visible Pixel 7 emulator with SwiftShader.
3. Wait for Android to finish booting.
4. Install the latest debug APK.
5. Launch QuranTrack.

Expected debug APK path:

- `C:\Users\hamza\Documents\Quran_App\quran_mobile\build\app\outputs\flutter-apk\app-debug.apk`

The previous automated/headless emulator attempts sometimes exited with Windows access-violation code `3221225477`. This appeared to be an Android emulator graphics-host problem, not a Flutter compile/test failure. Codex Desktop should use the visible emulator and its computer-control capability. If the emulator crashes:

- Capture the exact time and visible error.
- Inspect emulator output and relevant Windows/Application event details.
- Check ADB state and emulator process exit code.
- Try a controlled relaunch with the known SwiftShader setup.
- Do not endlessly repeat a crashing command without collecting evidence.
- Distinguish an emulator-host failure from a QuranTrack application failure.

## 6. Mandatory Testing Method

Use actual computer control for the visible emulator when available: observe the rendered screen, click/tap controls, type into fields, scroll, navigate, and capture screenshots. ADB can supplement computer control for installation, logs, screenshots, UI hierarchy, taps, text entry, and app restart, but XML-only inspection is not sufficient for visual approval.

At every major checkpoint:

- Capture a screenshot.
- Note the screen and theme.
- Watch for clipping, overflow, unreadable contrast, incorrect spacing, stale terminology, broken controls, missing loading/error states, and unexpected navigation.
- Monitor `adb logcat` for Flutter exceptions, Android runtime crashes, Supabase errors, and rendering failures.

Do not mark a screen as passed unless it was actually rendered and inspected.

## 7. Preflight

Before interactive testing:

1. Confirm the correct repository and branch.
2. Confirm no unrelated process is editing the same files.
3. Run Flutter formatting check without introducing unrelated formatting churn.
4. Run Flutter tests.
5. Run Flutter analysis and distinguish errors from existing warnings.
6. Build the latest debug APK if the expected APK is stale or missing.
7. Start a clean logcat capture for this run.
8. Launch the visible Pixel 7 emulator and install the current debug APK.
9. Confirm the package version/build under test.

If the Flutter source on Windows differs from commit `d23e574` because of synchronization, investigate and reconcile safely before testing. Do not overwrite newer legitimate work.

## 8. Screen-by-Screen Visual Walkthrough

Inspect all applicable states for each screen, not merely the default populated state.

### 8.1 Splash and startup

- Branded redesigned splash renders correctly.
- Logo, gradients, ornaments, typography, and animation look intentional.
- No blank white/black flash beyond normal platform startup.
- Startup transition reaches authentication or the authenticated shell correctly.
- No visual overflow on Pixel 7 dimensions.

### 8.2 Authentication

- Login and registration surfaces use the new design system.
- Input labels, focus states, password visibility, keyboard behavior, validation, loading state, and error state work.
- Buttons are reachable when keyboard is open.
- Listener/reciter wording is correct.
- Test both light and dark appearance if theme control is available before login.

### 8.3 Main navigation

- Floating/bottom navigation renders correctly.
- Every destination opens the correct screen.
- Selected, unselected, pressed, and disabled states are visually clear.
- Labels/icons do not clip.
- Android back behavior is logical.
- Tutorial targets still align with the intended controls.

### 8.4 Dashboard

- Header, identity, summary cards, quick actions, recent activity, and empty/populated states are coherent.
- Cards have consistent radius, shadows/elevation, spacing, and typography.
- No stale teacher/student/class visible wording.
- Pull-to-refresh/loading behavior works if present.

### 8.5 Contacts

- Contacts list, empty state, search, Add Contact entry point, and contact cards render properly.
- Secure Add Contact flow works without exposing unrestricted profile enumeration.
- Add or locate the intended isolated test reciter/listener where safe.
- Error, duplicate, not-found, and success feedback are understandable.

### 8.6 Sessions list and creation

- Session list and session cards render in empty and populated states where feasible.
- Creation flow uses listener/reciter/session terminology.
- Select the appropriate contact/participant.
- Configure Hifz/Sabqi/Manzil or the currently supported assignment inputs.
- Create a session and confirm UUID-based navigation reaches the correct classroom.
- Check keyboard, dropdowns, pickers, validation, scrolling, and primary action placement.

### 8.7 Classroom

- Header, participant identity, assignment details, session status, controls, chips, sheets/dialogs, and action hierarchy render correctly.
- Start/continue/complete controls work according to the existing workflow.
- Notes and performance controls open, save, and return correctly.
- Bottom sheets respect safe areas and keyboard insets.
- Tutorial targets remain attached to the correct interactive controls.

### 8.8 Quran reader

This is release-critical.

- Quran pages render using the intended QPC fonts and layout.
- Verify page 590 and Al-Inshiqaq `84:25` specifically.
- Ensure page mapping, surah/ayah identity, navigation, and orientation are correct.
- Arabic text must not be substituted, malformed, clipped, reordered, or rendered with a generic font.
- Page controls and overlays must not obscure Quran text.
- Zoom/navigation/selection behavior should remain stable if supported.
- Capture clear screenshots as evidence.

### 8.9 Mistakes

- Create a test mistake using the existing whole-word/character interaction.
- Confirm visual selection/marking corresponds to the intended word or character.
- Confirm the mistake appears in the classroom/session state and later reporting.
- Ensure redesign overlays do not alter hit-testing or Quran text alignment.

### 8.10 Notes and performance

- Add a distinctive test note.
- Set performance/rating values.
- Save and reopen them.
- Check success/error feedback and visual states.
- Ensure keyboard does not cover save/cancel controls.

### 8.11 Reports

- Open reports from the appropriate navigation path.
- Confirm the newly created session, mistake, note, and performance values appear correctly.
- Inspect summary cards, charts/progress, lists, filters, empty states, and detail views.
- Confirm listener/reciter/session terminology.
- Check for clipping and low-contrast chart/text colors in both themes.

### 8.12 Settings and themes

- Open settings and inspect every redesigned section.
- Toggle light and dark themes.
- Revisit dashboard, contacts, sessions, classroom, reader, reports, and dialogs in both themes.
- Confirm theme persists after app restart.
- Verify destructive actions, sign-out, update dialog, and confirmation dialogs are visually coherent without executing unsafe actions unnecessarily.

### 8.13 Tutorial

- Trigger/replay the tutorial if safely available.
- Walk through all steps.
- Confirm each overlay highlights the correct current control.
- Confirm redesigned layout did not orphan any `GlobalKey` or position the tutorial target off-screen.
- Confirm dismiss/next/back behavior works.

### 8.14 Restart and persistence

- Force-stop QuranTrack through ADB.
- Relaunch it.
- Confirm authentication/session state behaves as designed.
- Confirm theme choice persists.
- Confirm created session, mistake, note, and performance data persist.
- Confirm no stale-cache regression in contacts or reports.

## 9. Synchronization Validation

Where safe and credentials/state permit:

1. Make a distinctive Android-side change using the isolated test workflow.
2. Verify it reaches the live-v3 backend/Supabase without schema errors.
3. Verify the corresponding canonical web/React view or API-backed state reflects it.
4. Make a safe corresponding update from the other client if needed.
5. Refresh/restart Android and verify the change returns.
6. Check that no duplicate records are created and no legacy compatibility path breaks.

Do not apply migrations or alter live database policies/functions in this session.

## 10. Visual Quality Checklist

Across every screen, explicitly check:

- Consistent Quran-focused palette and design language.
- Correct light/dark contrast.
- Typography hierarchy and Arabic rendering.
- Card alignment, margins, padding, and corner radii.
- Touch-target sizes.
- Safe areas and system navigation/status-bar handling.
- Keyboard insets.
- Long names and long translated/English labels.
- Scrollability on content-heavy screens.
- Loading, empty, error, disabled, selected, and success states.
- Dialog and bottom-sheet sizing.
- No RenderFlex overflow indicators.
- No content hidden behind floating navigation.
- No old teacher/student/class wording in visible copy unless explicitly necessary for quoted historical data.
- No mock data or generated image presented as real runtime evidence.

## 11. Runtime/Error Acceptance Criteria

A successful run requires:

- No Flutter compilation errors.
- All Flutter tests passing.
- No uncaught Flutter exceptions during the walkthrough.
- No Android app process crashes.
- No critical RenderFlex overflow or layout exceptions.
- No failed live-v3 writes caused by stale teacher/student schema assumptions.
- Quran/QPC rendering and page mappings intact.
- Core session workflow completes.
- Data persists after restart.
- Light and dark themes both inspected.
- Tutorial targets validated.
- Screenshots/evidence retained.

An emulator-host crash must be reported separately and must not be falsely labeled as an application failure. Conversely, do not dismiss an application crash as an emulator issue without evidence.

## 12. Fixing Discovered Issues

If a genuine QuranTrack issue is found:

1. Capture reproduction steps and evidence first.
2. Identify the smallest safe code fix.
3. Preserve compatibility and protected behavior.
4. Apply formatting only to touched files.
5. Run targeted tests plus the full Flutter test suite.
6. Rebuild/reinstall the debug APK.
7. Repeat the failed workflow visually.
8. Document before/after behavior.

Do not make speculative redesign changes during validation. Do not commit automatically unless Hamza explicitly asks. Never push.

## 13. Required Evidence and Final Report

Store evidence in a clearly named project subfolder, for example:

- `docs/Logs/evidence/2026-07-26-codex-desktop-android-validation/`

At minimum retain screenshots for:

- Splash
- Authentication or authenticated startup
- Dashboard light
- Dashboard dark
- Contacts
- Session creation
- Classroom
- Quran page 590 / `84:25`
- Mistake state
- Notes/performance
- Reports
- Settings
- Tutorial target evidence

Update this log or create the next numbered log with:

- Exact start/end time in AST.
- Commit/build tested.
- Emulator launch configuration.
- Test account identifiers with sensitive values redacted.
- Every test item marked PASS, FAIL, BLOCKED, or NOT RUN.
- Screenshot/evidence paths.
- Relevant logcat excerpts.
- Emulator-host incidents and recovery details.
- Code changes made, if any.
- Commands/tests/build results.
- Remaining release blockers.
- Explicit recommendation: `SAFE TO BUILD FINAL RELEASES` or `NOT SAFE TO BUILD FINAL RELEASES`, with reasons.

## 14. Work That Must Wait Until This Validation Passes

Do not perform these as part of the initial walkthrough unless Hamza later requests them:

- Do not replace `releases/QuranTrack-Android-v2.1.0-release.apk` yet.
- Do not rebuild/replace the Windows installer yet.
- Do not push the six local commits.
- Do not change production schema/RLS/functions.

After the redesigned Android runtime is fully validated, the planned sequence is:

1. Fix and revalidate any discovered Android issues.
2. Build the final Android release APK and record checksum.
3. Rebuild the Windows installer and record checksum.
4. Perform a clean-machine Windows installer smoke test, including packaged sidecar `/api/health`.
5. Update logs and commit release evidence.
6. Push only after Hamza explicitly approves.

## 15. Final Instruction to Codex Desktop

Take ownership of the validation. Use the visible Pixel 7 emulator and computer control yourself; do not hand the checklist back to Hamza. Proceed methodically, preserve the existing work, gather real runtime evidence, fix only verified issues, and return a complete release-readiness verdict.

# Session Log: Flutter Tour Rewrite — Match Tauri/Web Flow

**Date:** 2026-04-18
**Session:** 001
**Version:** v2.0.0
**Duration:** ~1 hour

## Objective

Rewrite the Flutter/mobile tutorial to match the Tauri/web interactive 31-step tour structure instead of the old 9-step fake-demo flow. Remove auto-created demo session, make "Start Session" an interactive step, add real student-picking flow, fix the classId UUID issue, and preserve earlier visual overlay improvements.

## Summary

Replaced the old 9-step tour (which auto-created a fake demo session and used local integer IDs) with a 24-step interactive tour that mirrors the Tauri/web flow. The tour now guides users through real session creation — tapping "New Session" (interactive), selecting a student, configuring portions, tapping "Create Class" (interactive), then exploring the classroom with real mistake-marking interactions (tap word, whole-word mistake, letter mistake, haraka mistake), notes, performance rating, reader, and settings. No fake data is created; the session the user creates during the tour is a real session.

## Work Completed

### 1. Rewrote `tour_service.dart`

- **24 steps** (up from 9) organized into 6 phases matching Tauri/web:
  - Phase 1: Dashboard (welcome, add contacts, start session)
  - Phase 2: Session creation modal (student selector, portions, create)
  - Phase 3: Classroom (section tabs, Quran page, 3× word-tap + mistake-type interactions, mistakes area, page/all toggle, settings, notes write/save, performance)
  - Phase 4: Reader
  - Phase 5: Settings
  - Phase 6: Farewell
- Added `isInteractive` flag to `TourStepDef` — interactive steps hide the Next button and require the user to tap the target
- Added `TourService.isTourActive` runtime flag
- Added `Completer`-based interaction mechanism: `waitForInteraction()` / `completeInteraction()`
- Added `tourClassId` (UUID string) to track the session created during tour
- Removed `createDemoClass()`, `cleanupDemoClass()`, `cleanupOrphanedDemoClass()` — no more fake data
- Added `cleanupOrphanedTourData()` that cleans up both old int-based and new string-based keys
- Added 12 new GlobalKeys for classroom sub-targets: `wholeWordKey`, `letterMistakesKey`, `harakaMistakesKey`, `pageAllToggleKey`, `classroomSettingsKey`, `notesButtonKey`, `notesTextareaKey`, `saveNotesKey`, `performanceDropdownKey`, `studentSelectorKey`, `portionsSectionKey`, `createSessionKey`

### 2. Updated `tour_tooltip.dart`

- Added `isInteractive` parameter
- When `isInteractive: true`, hides the Next/Finish button and shows a "Tap to continue" indicator with a touch icon

### 3. Updated `create_class_screen.dart`

- Added `TourService` import
- Wrapped student selector with `TourService.studentSelectorKey`
- Added `TourService.portionsSectionKey` to "Portions" label
- Added `TourService.createSessionKey` to the Create button
- In `_createClass`: when `TourService.isTourActive`, saves the created session's UUID via `TourService.saveTourClassId()` and calls `completeInteraction()` before navigating to classroom

### 4. Updated `dashboard_screen.dart`

- "New Session" button's `onPressed` now calls `TourService.completeInteraction()` when tour is active, before opening the create-session modal

### 5. Rewrote `main.dart` tour orchestration

- Removed `_demoClassId` field and all demo-class logic
- `_startTour()` now orchestrates 6 phases with proper delays:
  - Phase 1 (steps 0-2): Dashboard. Step 2 is interactive — user must tap "New Session"
  - Phase 2 (steps 3-5): Inside the create-session modal (600ms delay for modal render). Step 5 is interactive — user must tap "Create Class"
  - Phase 3 (steps 6-20): Classroom (900ms delay for classroom render). Interactive steps for word tapping, mistake marking, notes, performance
  - After Phase 3: `Navigator.pop()` to return from ClassroomScreen to main tabs
  - Phases 4-6: Reader, Settings, Farewell
- `_showTourSteps` now shows **one step at a time** (not batched), each with its own `TutorialCoachMark` instance
- Interactive steps await `TourService.waitForInteraction()` then dismiss the overlay
- Skip handlers now pop all pushed routes (`while (canPop()) pop()`) before returning to dashboard
- `_cleanupTour()` sets `isTourActive = false` and clears tour class ID
- Changed `cleanupOrphanedDemoClass()` → `cleanupOrphanedTourData()` in `initState`

### 6. `classroom_screen.dart` and `word_popup.dart` — already wired

All new GlobalKeys and `completeInteraction()` calls were already added to:
- Classroom: `classroomSettingsKey`, `pageAllToggleKey`, `performanceDropdownKey`, `notesButtonKey`, `notesTextareaKey`, `saveNotesKey`
- Classroom `_showWordPopup`: calls `completeInteraction()` when word tapped, and when whole-word/letter/haraka selected
- Word popup: `wholeWordKey`, `letterMistakesKey`, `harakaMistakesKey`

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_mobile/lib/core/services/tour_service.dart` | Rewritten | 24 steps, interactive support, Completer mechanism, no demo class |
| `quran_mobile/lib/presentation/widgets/tour_tooltip.dart` | Modified | Added `isInteractive` mode with "Tap to continue" indicator |
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | Modified | GlobalKeys for student/portions/create, tour-mode class creation |
| `quran_mobile/lib/presentation/screens/dashboard/dashboard_screen.dart` | Modified | Tour interaction on "New Session" tap |
| `quran_mobile/lib/main.dart` | Rewritten | 6-phase orchestration, one-step-at-a-time, interactive waits, proper navigation |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Already done | All GlobalKeys and completeInteraction wired |
| `quran_mobile/lib/presentation/screens/classroom/word_popup.dart` | Already done | All GlobalKeys and completeInteraction wired |

## Decisions Made

- **No fake demo class**: Tour uses a real session the user creates — matches web behavior
- **One step at a time**: Each step gets its own TutorialCoachMark instance instead of batching multiple targets, which simplifies interactive step handling
- **24 steps (not 31)**: Flutter's UI differs from web (modal bottom sheets vs routes, no separate "Next: Choose Portions" step, fewer granular surah/ayah fields). The 24 steps cover all the same concepts.
- **Skip pops all routes**: Ensures clean state when user abandons the tour mid-classroom

## Remaining Gaps vs Tauri/Web

| Feature | Web | Flutter | Notes |
|---------|-----|---------|-------|
| Step count | 31 | 24 | Flutter UI has fewer distinct targetable elements |
| Surah selector interactive | Yes (step 8) | No | Flutter uses a different dropdown UX |
| "Next: Choose Portions" button | Yes (step 5) | No | Flutter has a single-page modal, not two-step |
| Delete session step | Yes (step 29) | No | Would require re-pushing classroom; deferred |
| CSS-based element waiting | Yes | N/A | Flutter uses GlobalKeys instead of DOM queries |

## Risky Areas / Follow-Up

- **Modal overlay targeting**: Steps 3-5 target widgets inside a modal bottom sheet, and steps 9/11/13 target widgets inside the word popup modal. `tutorial_coach_mark` uses `Overlay` which should work across routes, but needs device testing.
- **Timing**: The 600ms/900ms delays before showing modal/classroom steps assume those screens render within that time. On slow devices, this might need tuning.
- **Navigator.pop on skip**: The `while (canPop()) pop()` in the skip handler is aggressive — it pops everything back to the root. Should be fine since MainNavigation is the root, but worth testing.
- **Interactive step race condition**: If `completeInteraction()` fires before `waitForInteraction()` is called, the Completer won't exist yet and the signal is lost. The current code creates the Completer in `waitForInteraction()`, so the orchestrator must call it before the user can interact. The 180ms inter-step delay and the fact that the overlay blocks taps should prevent this.

## Next Steps

- [ ] Test on a real device / emulator
- [ ] Tune delay timings if modal/classroom rendering is too slow
- [ ] Consider adding the delete-session step (step 29 from web) if navigation allows
- [ ] Release v2.0.0 when ready

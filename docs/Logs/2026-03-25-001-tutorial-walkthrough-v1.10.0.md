# Session Log: Interactive Guided Tour

**Date:** 2026-03-25
**Session:** 001

## Objective

Add an interactive guided tour that spotlights real UI elements and walks users through the core workflow: Dashboard → Classroom → Reader → Settings. Creates a demo class mid-tour and cleans it up at the end. Implement for both Tauri (web) and Flutter (mobile).

## Summary

Implemented the interactive guided tour on both platforms. Tauri uses driver.js with CSS-based dark/light theming; Flutter uses tutorial_coach_mark with custom TourTooltip widget supporting both themes. Both tours follow the same 9-step flow, create a demo class mid-tour (Al-Mulk 67:1-10), and clean it up on completion/skip. Auto-starts for teachers on first launch; replayable via Settings → Show Tutorial.

## Work Completed

### 1. Scrapped Text Carousel
- Removed TutorialCarousel.tsx and tutorial_carousel.dart
- Reverted all carousel-related changes from TeacherDashboard, Settings, main.dart, settings_screen

### 2. Tauri (Web) Tour — driver.js
- Added `driver.js` v1.4.0 to package.json (5kb, lightweight spotlight library)
- Created `tour.ts` — 9 tour step definitions, demo class create/cleanup, orphan detection, driver.js config with dark/light mode
- Created `TourContext.tsx` — React context with `startTour()`, cross-route navigation via `pendingStep` pattern, custom CSS theming for popovers (`.tour-popover-dark` / `.tour-popover-light`), Skip button on every step
- Added `data-tour` attributes to TeacherDashboard, Classroom, QuranReader, Settings
- Wrapped routes with `<TourProvider>` in App.tsx
- Added "Help & Tutorial" section to Settings.tsx

### 3. Flutter (Mobile) Tour — tutorial_coach_mark
- Added `tutorial_coach_mark: ^1.2.11` to pubspec.yaml
- Created `tour_service.dart` — GlobalKey registry (7 keys), SharedPreferences persistence (`tour_completed`, `tour_demo_class_id`), demo class CRUD via ClassRepository, 9 tour step definitions matching web, orphan cleanup on app load
- Created `tour_tooltip.dart` — Custom tooltip widget with dark/light mode support (slate800 bg in dark, white in light), step counter, cyan gradient Next button, Skip text button
- Added GlobalKeys to 4 screens: Dashboard (Add Student, Start Class buttons), Classroom (top bar, Quran page, mistakes area), Reader (Scaffold), Settings (Appearance header)
- Wired tour orchestration into MainNavigation (`main.dart`):
  - `_startTour()` orchestrates 5 phases: Dashboard steps → create demo class + push Classroom → pop + Reader tab → Settings tab → farewell on Dashboard
  - `_showTourSteps()` creates TargetFocus list with TourTooltip contents, uses Completer for async flow
  - Auto-starts for teachers after initial sync if `tour_completed` is false
  - `TourService.onStartTour` static callback for Settings to trigger replay
  - Orphan demo class cleanup on init
- Added "HELP & TUTORIAL" section to settings_screen.dart with "Show Tutorial" button

### 4. Version bumped to v1.10.0
- All 6 version files + CLAUDE.md updated

## Issues Encountered

- Text carousel rejected by user: didn't visually transition slides and didn't teach anything — scrapped entirely
- Classroom is a pushed route (not a tab): solved by pushing, waiting 800ms for mount, showing tour steps, then popping before continuing
- `_sectionHeader` doesn't accept a key parameter: wrapped with Container to attach GlobalKey

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/lib/tour.ts` | Created | Tour step definitions, demo data CRUD, driver.js config |
| `quran_frontend/src/contexts/TourContext.tsx` | Created | Tour state management, cross-route navigation, CSS theming |
| `quran_frontend/src/App.tsx` | Modified | Wrap with TourProvider |
| `quran_frontend/src/pages/TeacherDashboard.tsx` | Modified | data-tour attributes on buttons |
| `quran_frontend/src/pages/Classroom.tsx` | Modified | data-tour on section tabs, Quran page, mistakes area |
| `quran_frontend/src/pages/QuranReader.tsx` | Modified | data-tour on reader page |
| `quran_frontend/src/pages/Settings.tsx` | Modified | data-tour + "Show Tutorial" section + version bump |
| `quran_frontend/package.json` | Modified | Added driver.js + version bump |
| `quran_frontend/src-tauri/tauri.conf.json` | Modified | Version bump to 1.10.0 |
| `quran_mobile/pubspec.yaml` | Modified | Added tutorial_coach_mark + version bump |
| `quran_mobile/pubspec.lock` | Modified | Lock file updated with new dependency |
| `quran_mobile/lib/core/services/tour_service.dart` | Created | Tour service: keys, prefs, demo class, step defs |
| `quran_mobile/lib/presentation/widgets/tour_tooltip.dart` | Created | Custom dark/light mode tour tooltip widget |
| `quran_mobile/lib/main.dart` | Modified | Tour orchestration, auto-start, tab switching |
| `quran_mobile/lib/presentation/screens/dashboard/dashboard_screen.dart` | Modified | GlobalKeys on Add Student + Start Class buttons |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | Modified | GlobalKeys on top bar, Quran page, mistakes area |
| `quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart` | Modified | GlobalKey on reader Scaffold |
| `quran_mobile/lib/presentation/screens/settings/settings_screen.dart` | Modified | GlobalKey + "Help & Tutorial" section |
| `website/index.html` | Modified | Version bump to 1.10.0 |
| `CLAUDE.md` | Modified | Version history + current version |

## Next Steps

- [ ] Test web tour end-to-end
- [ ] Test Flutter tour end-to-end

## Notes

- Same version v1.10.0 for both platforms
- Tour is teacher-only (students have simpler workflow)
- Demo class uses Al-Mulk 67:1-10 as Hifz assignment
- Orphan cleanup runs on every app load (both platforms)
- Dark/light mode fully supported on both platforms
- Flutter tour tooltip: dark card (slate800) in dark mode, white card in light mode, with matching text colors
- Flutter tour overlay: 75% black opacity in dark mode, 60% in light mode

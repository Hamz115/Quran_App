# Session Log: Interactive Guided Tour

**Date:** 2026-03-25
**Session:** 001

## Objective

Add an interactive guided tour that spotlights real UI elements and walks users through the core workflow: Dashboard → Classroom → Reader → Settings. Creates a demo class mid-tour and cleans it up at the end.

## Summary

Implemented the Tauri (web) interactive tour using driver.js. Scrapped the passive text carousel approach. The tour uses spotlight overlays on real UI elements with contextual tooltips. A demo class is created to show the Classroom, then deleted on tour completion or skip. Flutter implementation pending.

## Work Completed

### 1. Scrapped Text Carousel
- Removed TutorialCarousel.tsx and tutorial_carousel.dart
- Reverted all carousel-related changes from TeacherDashboard, Settings, main.dart, settings_screen

### 2. Installed driver.js
- Added `driver.js` v1.4.0 to package.json (5kb, lightweight spotlight library)

### 3. Created Tour Engine (`tour.ts`)
- 9 tour step definitions spanning Dashboard → Classroom → Reader → Settings
- Demo class create/cleanup functions using existing `createClass`/`deleteClass`
- Orphan detection on app load (safety net for interrupted tours)
- driver.js configuration helpers with dark/light mode theming

### 4. Created Tour Context (`TourContext.tsx`)
- React context with `startTour()`, cross-route navigation state
- Auto-starts on first teacher login (checks `qurantrack:tour_completed` in localStorage)
- Handles route transitions: navigates first, shows step after page mounts
- Custom CSS theming for dark/light mode popovers
- Skip button on every step (except final), cleans up demo class

### 5. Added data-tour Attributes
- TeacherDashboard: `add-student-btn`, `start-class-btn`
- Classroom: `section-tabs`, `quran-page`, `mistakes-area`
- QuranReader: `reader-page`
- Settings: `settings-section`

### 6. Wired into App.tsx
- `<TourProvider>` wraps routes inside BrowserRouter

### 7. Added "Show Tutorial" to Settings
- New "Help & Tutorial" section between Appearance and Sign Out
- Button resets tour flag and starts the tour

### 8. Version bumped to v1.10.0
- All 6 version files + CLAUDE.md updated

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
| `quran_mobile/pubspec.yaml` | Modified | Version bump to 1.10.0 |
| `website/index.html` | Modified | Version bump to 1.10.0 |
| `CLAUDE.md` | Modified | Version history + current version |

## Next Steps

- [ ] Test web tour end-to-end
- [ ] Implement Flutter tour (Phase 2)

## Notes

- Same version v1.10.0
- Tour is teacher-only (students have simpler workflow)
- Demo class uses Al-Mulk 67:1-10 as Hifz assignment
- Orphan cleanup runs on every app load

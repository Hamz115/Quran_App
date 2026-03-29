# Session Log: Interactive Tour Rewrite (Tauri)

**Date:** 2026-03-29
**Session:** 001 (continuation of 2026-03-25-001)

## Objective

Rewrite the Tauri/web guided tour from a 9-step demo-class approach to a ~31-step fully interactive tour where users must actually click every element (create their own class, tap words, mark mistakes, write notes, rate performance, delete class).

## Summary

Completely rewrote `tour.ts` (31 interactive step definitions) and `TourContext.tsx` (interactive step detection with click/change/input listeners, waitForElement polling). Added `data-tour` attributes to TeacherClasses.tsx (class creation form) and Classroom.tsx (word popup, letter/haraka mistakes, notes, performance, delete, page/all toggle). No demo class — users create and delete their own class during the tour.

## Work Completed

### 1. Rewrote tour.ts — 31 Interactive Steps
- Removed demo class CRUD (`createDemoClass`, `cleanupDemoClass`, `cleanupOrphanedDemoClass`)
- Added `setTourClassId()`, `getTourClassId()`, `clearTourClassId()` for tracking user-created class
- Added `type: 'info' | 'interactive'`, `interactiveTarget`, `waitForElement` fields to TourStepDef
- 31 steps across 9 phases: Welcome → Class Creation (date, students, portions, surah, ayah, sabqi, manzil, create) → Classroom Section Tabs → Quran Page & Mistakes (word tap, whole-word, letter, haraka) → Mistakes Area (page/all toggle) → Notes & Performance → Reader → Settings → Delete & Farewell

### 2. Rewrote TourContext.tsx — Interactive Support
- `setupInteractiveListener()`: attaches click/change/input listeners on interactive targets, auto-advances on interaction
- `waitForElement()`: polls DOM for element appearance before showing step
- Hides Next button for interactive steps (`showButtons: isInteractive ? [] : ['next']`)
- Custom step counter via HTML span in description
- Auto-detects class creation by watching URL for `/teacher/classes/<id>`
- Fixed auto-start infinite loop: `autoStarted` ref + `!isActive` guard
- Skip button on every step

### 3. Added data-tour Attributes — TeacherClasses.tsx
- `data-tour="class-date"` on date picker container
- `data-tour="student-selector"` on student selection area
- `data-tour="next-portions-btn"` on "Next: Choose Portions" button
- `data-tour="hifz-section"` / `data-tour="sabqi-toggle"` / `data-tour="manzil-toggle"` on PortionSelector containers
- `data-tour="portion-mode"` on By Page/Surah/Juz toggle
- `data-tour="surah-selector"` on surah grid
- `data-tour="ayah-range"` on ayah range grid
- `data-tour="create-class-btn"` on Create Class button

### 4. Added data-tour Attributes — Classroom.tsx
- `data-tour="word-popup"` on word popup container
- `data-tour="whole-word-btn"` on Whole Word button
- `data-tour="letter-mistakes"` on Letters container
- `data-tour="haraka-mistakes"` on Harakat container
- `data-tour="notes-btn"` on Notes button
- `data-tour="notes-textarea"` on notes textarea
- `data-tour="save-notes-btn"` on Save Notes button
- `data-tour="performance-dropdown"` on performance select
- `data-tour="delete-btn"` on Delete button
- `data-tour="page-all-toggle"` on Page/All mistake filter toggle

### 5. Bug Fixes
- Tour auto-start infinite loop: was re-triggering on every `location.pathname` change
- Step counter "1 of 1": each step used new driver() with single step array, so built-in progress was always "1 of 1" — fixed with custom HTML counter
- Tooltip covering buttons: increased `stagePadding` to 16 and `popoverOffset` to 12

## Issues Encountered

- Tour not stopping: auto-start `useEffect` fired on every pathname change → fixed with `autoStarted` ref
- User rejected demo class approach: "everything has to be interactive" → complete rewrite to user-driven flow
- User rejected text carousel: "what is the use of this" → switched to spotlight tour with driver.js

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/lib/tour.ts` | Rewritten | 31 interactive step definitions, class ID tracking, no demo class |
| `quran_frontend/src/contexts/TourContext.tsx` | Rewritten | Interactive step listeners, waitForElement, auto-class-ID detection |
| `quran_frontend/src/pages/TeacherClasses.tsx` | Modified | 10 data-tour attributes on class creation form |
| `quran_frontend/src/pages/Classroom.tsx` | Modified | 10 data-tour attributes on popup, mistakes, notes, performance, delete |

## Next Steps

- [ ] Test full 31-step interactive tour end-to-end on Tauri
- [ ] Commit, push, re-tag v1.10.0

## Notes

- Flutter tour NOT updated — still uses old 9-step demo-class approach (user said "only implement it in tauri please")
- Tauri-only: 31 steps, fully interactive, no demo class
- All steps except Settings and farewell are interactive (user must click/interact)
- Class ID captured from URL after user creates class, stored in localStorage for delete step

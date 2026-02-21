# Session Log: Fix Input Focus Loss in Class Creation

**Date:** 2026-02-21
**Session:** 001

## Objective

Fix critical input focus bug in the web app's class creation modal — typing a single digit or deleting a digit causes the input to lose focus, requiring clicking back into the input for every keystroke.

## Summary

Root-caused the input focus loss to `PortionSelector` and `ToggleSwitch` being defined as arrow functions INSIDE the `TeacherClasses` render function. Every state change recreated these function references, causing React to unmount/remount the entire component tree (destroying focus). Fixed by extracting both components as standalone functions outside the parent component, passing closure dependencies (`darkMode`, `surahList`, `modalBodyRef`) as props.

## Work Completed

### Root Cause Analysis
- `PortionSelector` (lines 749-1085) and `ToggleSwitch` (lines 733-747) were defined as `const` arrow functions inside `TeacherClasses()`
- Every keystroke triggered a state update → re-render → new function references → React treats as new component types → unmount old DOM → mount new DOM → focus lost
- This is a well-known React anti-pattern

### Fix: Extract Components
- Created standalone `function ToggleSwitch` before `export default function TeacherClasses()` with `darkMode` prop added
- Created standalone `function PortionSelector` before `export default function TeacherClasses()` with `darkMode`, `surahList`, `modalBodyRef` props added
- Removed the old inner `const ToggleSwitch` and `const PortionSelector` definitions (354 lines of duplicate code removed)
- Updated all 6 `<PortionSelector>` usages to pass the three new props

## Issues Encountered

- Edit tool failed on first attempt to remove old inner definitions because the file content shifted after inserting the new extracted components (old_string no longer matched). Resolved by re-reading the file and using the updated content.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `quran_frontend/src/pages/TeacherClasses.tsx` | Modified | Extracted PortionSelector and ToggleSwitch outside component function, removed old inner definitions, updated all 6 usages with new props |
| `docs/Logs/2026-02-21-001-input-focus-fix.md` | Created | Session log |

## Next Steps

- [ ] Verify the fix works in browser (typing in page/ayah inputs should retain focus)
- [ ] Add test mistake data via teacher account to verify end-to-end mistake display

## Notes

- The file went from having duplicate component definitions (both inside and outside the function) to clean standalone components
- `PortionSelector` includes its own `createDefaultPortion()` since it was previously using one from the parent scope
- TypeScript compiles cleanly after the fix

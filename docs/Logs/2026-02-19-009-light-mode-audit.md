# Session Log: Light Mode UI Audit (Web App)

**Date:** 2026-02-19
**Session:** 009

## Objective

Audit the web app's light mode UI by navigating through the dashboard, class creation flow, classes page, classroom, and student dashboard. Document all visual issues, contrast problems, and unclear elements.

## Summary

Used Playwright browser to inspect every major page of the web app in light mode. The **dashboard, classes table, classroom, and student dashboard all look good**. However, the **"New Class" creation dialog** (both Step 1: Select Students and Step 2: Configure Portions) has **severe light mode issues** — the entire modal body and `PortionSelector` component never reference `darkMode`, so all styles are hard-coded for dark mode.

## Work Completed

### Pages Audited

| Page | Light Mode Status | Notes |
|------|-------------------|-------|
| Teacher Dashboard | Good | Stats, My Students, Recent Classes all readable |
| Classes (report table) | Good | Portion badges, filter bar, summary strip all clear |
| Classroom (Quran reader) | Good | QPC text on cream background, legend, mistakes all visible |
| Student Dashboard | Good | Clean, all text readable, cards distinct |
| **New Class Dialog (Step 1)** | **BROKEN** | Student name invisible when selected, dark backgrounds |
| **New Class Dialog (Step 2)** | **BROKEN** | Section titles invisible, inputs have black backgrounds, toggle buttons unreadable |
| Notes Modal | **BROKEN** | Same hard-coded dark styles throughout |

### Root Cause

The `darkMode` variable is destructured from `useTheme()` on **line 36** of `TeacherClasses.tsx` and is correctly used for the outer page layout (lines 692-729) and the modal container (lines 742-758). However, the **entire modal body content** (lines 762-1054) and the **`PortionSelector` component** (lines 379-685) **never reference `darkMode`**. Every CSS class in those regions is hard-coded to dark mode styles.

### Detailed Issues Found

#### Issue 1: Student name invisible when selected (Step 1)
- **Line 803**: `text-slate-200` (near-white text — invisible on light background)
- **Lines 783-787**: Unselected state uses `bg-slate-700/50`, selected uses `bg-blue-500/20` (light blue) but text stays white

#### Issue 2: Section titles barely visible (Step 2)
- **Line 446**: Heading uses `text-slate-100` when enabled — near-white, invisible on light
- **Line 449**: Description uses `text-slate-500` — too dim

#### Issue 3: Toggle buttons ("By Surah", "By Juz") invisible when unselected
- **Lines 485-511**: Unselected state is `bg-slate-700/50 text-slate-400` — gray text on dark overlay, extremely low contrast in light mode

#### Issue 4: Input fields have dark/black backgrounds
- **Lines 535, 549, 572, 586, 608, 621, 653**: All use `bg-slate-800 border-slate-600 text-slate-100` — renders as black input boxes with white text

#### Issue 5: Cancel/Back buttons have dark backgrounds
- **Lines 1063, 1079**: `bg-slate-700 text-slate-200` — dark buttons in light mode
- **Line 1058**: Footer border `border-slate-700` too dark

#### Issue 6: Student badge poor contrast (Step 2 header)
- **Lines 813-816**: `bg-slate-700/50` dark background, `text-slate-400` / `text-blue-400` dim text

#### Issue 7: "+ Add Another Portion" text very faint
- **Lines 674-680**: `text-slate-400` faint text, `hover:text-slate-200` makes it LIGHTER (worse in light mode), `border-slate-600` dark border

#### Additional Issues
| Line(s) | Element | Problem |
|---------|---------|---------|
| 440-441 | Disabled container | `border-slate-700 bg-slate-800/30` |
| 368 | Toggle switch off-state | `bg-slate-600` hard-coded |
| 766 | "Select students" label | `text-slate-300` invisible |
| 770 | Empty state background | `bg-slate-700/30` |
| 821-822 | Portion mode toggle box | `bg-slate-800/50 border-slate-700` |
| 829-847 | Same/Different toggles | `bg-slate-700/50 text-slate-400` |
| 870-874 | Per-student tab buttons | `bg-slate-700/50 text-slate-400` |
| 891 | Step 2 instruction text | `text-slate-300` |
| 465 | Portion divider | `border-slate-700` |
| 1108-1188 | Notes Modal | All hard-coded dark classes |

## Screenshots Taken

| Screenshot | Description |
|-----------|-------------|
| `screenshots/dark-mode-dashboard.png` | Baseline dark mode dashboard |
| `screenshots/light-mode-dashboard.png` | Light mode dashboard (looks good) |
| `screenshots/light-mode-dashboard-bottom.png` | Recent Classes section in light mode (looks good) |
| `screenshots/light-mode-classes.png` | Classes page with report table (looks good) |
| `screenshots/light-mode-new-class.png` | Step 1: Select Students — ISSUES |
| `screenshots/light-mode-student-selected.png` | Step 1: Student selected — NAME INVISIBLE |
| `screenshots/light-mode-portions.png` | Step 2: Configure Portions — SEVERE ISSUES |
| `screenshots/light-mode-portions-scrolled.png` | Step 2: Scrolled down — same issues in all 3 sections |
| `screenshots/light-mode-classroom.png` | Classroom view (looks good) |
| `screenshots/light-mode-student-dashboard.png` | Student dashboard (looks good) |

## Issues Encountered

- The class creation dialog is essentially unusable in light mode due to invisible text and wrong-contrast inputs
- The root cause is architectural — `darkMode` was never threaded into the modal body or PortionSelector component

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `docs/Logs/2026-02-19-009-light-mode-audit.md` | Created | Session log documenting light mode audit |

## Next Steps

- [ ] Fix TeacherClasses.tsx: Add `darkMode` conditionals to all modal body styles (~40+ CSS class strings)
- [ ] Fix PortionSelector component: Add `darkMode` prop or use `useTheme()` directly
- [ ] Fix Notes Modal: Same dark-mode-only issue
- [ ] Re-audit after fixes to confirm all issues resolved

## Notes

- The outer layout, dashboard, classroom, and student views all handle light mode correctly
- The problem is isolated to the "New Class" dialog (TeacherClasses.tsx lines 379-1188) and the Notes Modal
- The fix pattern is consistent: every `bg-slate-700/800` needs a light alternative, every `text-slate-100/200/300` needs a dark text alternative
- Recommended approach: pass `darkMode` to PortionSelector or use `useTheme()` hook inside it, then add ternaries like `darkMode ? 'bg-slate-800' : 'bg-white'` throughout

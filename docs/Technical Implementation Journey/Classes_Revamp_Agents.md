# Classes Revamp — Agent Assignment Guide

> **Reference**: Read `Classes_Revamp_Plan.md` first for full technical context.
>
> This document splits the implementation into **4 teammates** that all launch in parallel. Each teammate owns specific files. When one needs another's output, they wait — and when issues come up, they **talk to each other directly** to resolve them.

---

## The Team

| Teammate | Role | Summary |
|----------|------|---------|
| **Foundation Teammate** | Helpers + Leaf Components | Lays the foundation — pure functions, filter bar, summary strip, export modal |
| **Tabs Teammate** | Tab Components | Builds the 3 content tabs (classes, mistakes, performance) |
| **Panel Teammate** | Orchestrator + Panel | Assembles everything into the slide-out ReportPanel |
| **Integration Teammate** | Integration, Cleanup & Docs | Wires ReportPanel into existing pages, removes old route, writes the implementation session log |

All 4 start at the same time. Each creates new files (no two teammates write to the same file). When one needs another's output, they just wait for that teammate to finish, then continue.

```
All start simultaneously:

  Foundation Teammate (Helpers + Leaf Components)  ──┐
  Tabs Teammate       (Tab Components)             ──┼──→  Panel Teammate waits, then assembles
  Panel Teammate      (Orchestrator + Panel)       ──┘          │
  Integration Teammate (Wire up + Cleanup + Docs)  ─────────────┘ waits for Panel, then wires it in
```

**Key principle**: Every teammate creates only NEW files. Integration Teammate is the only one that touches existing files. Since each teammate owns distinct files, there are no write conflicts — they coordinate freely.

---

## Communication Rules

**Teammates talk directly to each other.** This is not a siloed assembly line — it's a collaborating team.

### When to communicate

- **Interface mismatch**: If Tabs Teammate starts writing `ReportClassesTab` and realizes the props interface from the plan doesn't quite work (e.g. needs an extra prop, or a helper function is missing from `report-helpers.ts`), they talk directly to Foundation Teammate to sort it out — not just wait and hope.
- **Unexpected edge case**: If Panel Teammate discovers that the filter state shape needs tweaking while building `ReportPanel`, they tell Foundation Teammate (who owns `ReportFilterBar`) and Tabs Teammate (whose components consume filtered data) immediately.
- **Blocker**: If any teammate is blocked waiting on another and the dependency is taking longer than expected, they ask the blocking teammate for a status update or partial output they can work with.
- **Integration issues**: If Integration Teammate finds that the wiring doesn't work as planned (e.g. a prop name changed, or an export is missing from `index.ts`), they go directly to Panel Teammate to fix it rather than trying to patch around it.

### How to communicate

- **Be specific**: "Hey Foundation Teammate, I need `formatDate` to also accept `Date` objects, not just strings — can you add an overload?" is better than "something's wrong with the helpers."
- **Propose a fix**: When flagging an issue, suggest a solution. The file owner makes the final call.
- **Don't silently work around problems**: If something doesn't match the plan, flag it. A quick conversation now prevents a broken integration later.

---

## Commit Rules

**Each teammate commits their own work when they're done.** Don't leave uncommitted files for someone else to deal with.

- **When**: After completing all your files and verifying they're correct
- **What**: `git add` only the files you own (see File Ownership Map), then commit
- **Format**: Use conventional commits with your role as scope:
  - Foundation: `feat(report-components): add report helpers, filter bar, summary strip, export modal`
  - Tabs: `feat(report-components): add classes, mistakes, and performance tab components`
  - Panel: `feat(report-components): add ReportPanel orchestrator and barrel exports`
  - Integration: `refactor(teacher-classes): inline student report as slide-out panel` (for the code changes) and a second commit `docs: add classes revamp implementation docs` (for the 2 MD files)
- **Order**: Commit as soon as YOUR work is done — don't wait for the whole team to finish. Later teammates will pull/see your committed files when they need them.

---

## Foundation Teammate: Helpers + Leaf Components

> **The foundation layer.** Pure functions, filter bar, summary strip, export modal. No dependencies — starts and finishes first.

### Files to CREATE
| File | Description |
|------|-------------|
| `src/components/teacher-classes/report-helpers.ts` | Pure functions + constants |
| `src/components/teacher-classes/ReportFilterBar.tsx` | Date/surah/juz filter controls |
| `src/components/teacher-classes/ReportSummaryStrip.tsx` | 5-stat summary bar |
| `src/components/teacher-classes/ExportModal.tsx` | Export dialog component |

### Source Material (read-only)
- `src/pages/StudentReport.tsx` — code to extract from
- `src/lib/report-types.ts` — type imports
- `src/lib/report-export.ts` — export function imports
- `src/lib/quran-utils.ts` — `surahNames`, `getSurahRangeForJuz`

### Task List

1. **Create `report-helpers.ts`**
   - Extract constants: `PERF_MAP`, `PERF_LABELS` (StudentReport lines 13–22)
   - Extract functions: `perfBadgeClasses`, `mistakeCountClasses`, `portionTagClasses`, `formatDate` (lines 24–51)
   - Extract `getDatePresetRange` (lines 53–61)
   - Extract `computePerformanceStats` (lines 63–125)
   - NEW: Create `applyReportFilters(report, filters)` — extract the `filteredReport` useMemo logic (lines 162–256) into a pure function
   - Import types from `../../lib/report-types`
   - Import `getSurahRangeForJuz` from `../../lib/quran-utils`
   - Export all functions and constants
   - **Zero React imports** — pure TypeScript only

2. **Create `ReportFilterBar.tsx`**
   - Props: `{ filters: ReportFilters, onFiltersChange: (f: ReportFilters) => void, darkMode: boolean }`
   - Move filter bar JSX from StudentReport.tsx (lines 369–465)
   - Contains internal handlers: `handlePreset`, `handleJuzChange`, `clearAllFilters` (from lines 264–284)
   - Handlers call `onFiltersChange` with updated filters (does NOT own filter state)
   - Import `getDatePresetRange` from `./report-helpers`
   - Import `surahNames`, `getSurahRangeForJuz` from `../../lib/quran-utils`

3. **Create `ReportSummaryStrip.tsx`**
   - Props: `{ summary: StudentReport['summary'], darkMode: boolean }`
   - Move summary strip JSX from StudentReport.tsx (lines 467–485)
   - Purely presentational — no state, no side effects

4. **Create `ExportModal.tsx`**
   - Props: `{ report: StudentReport, filters: ReportFilters, darkMode: boolean, onClose: () => void }`
   - Move ExportModal from StudentReport.tsx (lines 902–1065)
   - Import `formatDate` from `./report-helpers`
   - Import export functions from `../../lib/report-export`
   - Import `surahNames` from `../../lib/quran-utils`

### Acceptance Criteria
- [ ] `report-helpers.ts` has zero React imports (pure TS only)
- [ ] `applyReportFilters` returns a complete `StudentReport` with recomputed `summary`
- [ ] `ReportFilterBar` calls `onFiltersChange` (not internal setState)
- [ ] Juz/surah mutual exclusion works in filter bar
- [ ] `ExportModal` renders identically to original
- [ ] All TypeScript types satisfied, no `any`

---

## Tabs Teammate: Tab Components

> **The three content tabs.** Imports helpers from Foundation Teammate's `report-helpers.ts`. Can write all code immediately (interfaces are defined in the plan), but imports won't resolve until Foundation finishes — **just wait for Foundation, then verify**.

### Files to CREATE
| File | Description |
|------|-------------|
| `src/components/teacher-classes/ReportClassesTab.tsx` | Classes table + ClassRow |
| `src/components/teacher-classes/ReportMistakesTab.tsx` | Mistakes by surah + repeated |
| `src/components/teacher-classes/ReportPerformanceTab.tsx` | Chart + stats sidebar |

### Coordination
- **Waits on Foundation Teammate** for `report-helpers.ts` (imports `formatDate`, `perfBadgeClasses`, `mistakeCountClasses`, `portionTagClasses`, `PERF_MAP`)
- Can write all component code immediately — the expected exports are defined in the plan. Just verify imports compile once Foundation is done.
- **Talk to Foundation Teammate** if any helper function is missing, has the wrong signature, or if you need an additional utility.

### Source Material (read-only)
- `src/pages/StudentReport.tsx` — JSX to extract
- `src/lib/report-types.ts` — type imports

### Task List

1. **Create `ReportClassesTab.tsx`**
   - Props: `{ classes: StudentClass[], expandedClassId: string | null, onToggleExpand: (id: string) => void, darkMode: boolean }`
   - Move classes tab JSX from StudentReport.tsx (lines 520–563)
   - Move `ClassRow` sub-component (lines 780–898) — keep it in the same file as an internal component
   - Import `formatDate`, `perfBadgeClasses`, `mistakeCountClasses`, `portionTagClasses` from `./report-helpers`
   - Import `surahNames` from `../../lib/quran-utils`

2. **Create `ReportMistakesTab.tsx`**
   - Props: `{ mistakesBySurah: MistakeBySurah[], repeatedMistakes: RepeatedMistake[], darkMode: boolean }`
   - Move mistakes tab JSX from StudentReport.tsx (lines 566–642)
   - Two-column grid: "Mistakes by Surah" (horizontal bars) + "Repeated Mistakes" (numbered list)

3. **Create `ReportPerformanceTab.tsx`**
   - Props: `{ performanceTrend: PerformanceDataPoint[], performanceStats: PerformanceStats, darkMode: boolean }`
   - Move performance tab JSX from StudentReport.tsx (lines 644–762)
   - Bar chart (left) + stats sidebar cards (Current Streak, Best Streak, Mistakes/Class, Trend)
   - Import `PERF_MAP` from `./report-helpers`

### Acceptance Criteria
- [ ] Each component renders the same visual output as the original StudentReport sections
- [ ] Props interfaces match the plan spec exactly
- [ ] Theme variables derived internally from `darkMode` prop
- [ ] All are presentational (no API calls, no owned state except ClassRow expand callback)
- [ ] All components have default exports

---

## Panel Teammate: ReportPanel Orchestrator + Barrel Exports

> **The assembler.** Builds the slide-out panel shell that composes all child components. Writes code immediately (knows all child interfaces from the plan), then **waits for Foundation & Tabs Teammates** before final verification.

### Files to CREATE
| File | Description |
|------|-------------|
| `src/components/teacher-classes/ReportPanel.tsx` | Slide-out panel shell |
| `src/components/teacher-classes/index.ts` | Barrel exports |

### Coordination
- **Waits on Foundation Teammate** for `report-helpers.ts`, `ReportFilterBar`, `ReportSummaryStrip`, `ExportModal`
- **Waits on Tabs Teammate** for `ReportClassesTab`, `ReportMistakesTab`, `ReportPerformanceTab`
- Can write ALL code immediately — child component interfaces are fully specified in the plan. Just needs the files to exist for imports to resolve.
- **Talk to Foundation/Tabs Teammates** if a component's props don't fit the orchestration (e.g. need an extra callback, different data shape). You're the one composing everything, so you'll spot integration issues first.

### Source Material (read-only)
- `src/pages/StudentReport.tsx` — reference for state management, layout, and data flow
- `src/lib/supabase-api.ts` — `getStudentReport` API function

### Task List

1. **Create `ReportPanel.tsx`**
   - Props: `{ studentId: string, onClose: () => void }`
   - Import `getStudentReport` from `../../lib/supabase-api`
   - Import all child components from same directory
   - Import `applyReportFilters`, `computePerformanceStats` from `./report-helpers`
   - Own ALL state: `report`, `loading`, `error`, `activeTab`, `filters`, `showExportModal`, `expandedClassId`
   - Compute `filteredReport` via `useMemo` → `applyReportFilters(report, filters)`
   - Compute `performanceStats` via `useMemo` → `computePerformanceStats(filteredReport.classes)`
   - Render panel shell:
     - Fixed overlay: `fixed inset-0 z-40 bg-black/50`
     - Panel: `fixed right-0 inset-y-0 w-[900px] max-w-full overflow-y-auto`
     - Backdrop click → `onClose()`
   - Body scroll lock via `useEffect`:
     ```ts
     useEffect(() => {
       document.body.style.overflow = 'hidden';
       return () => { document.body.style.overflow = ''; };
     }, []);
     ```
   - Render header: close button, student name/email, export button
   - Render: `<ReportFilterBar>` → `<ReportSummaryStrip>` → tab nav → active tab → `<ExportModal>` (conditional)
   - Loading/error/empty states (same patterns as current StudentReport lines 288–323)

2. **Create `index.ts`**
   ```ts
   export { default as ReportPanel } from './ReportPanel';
   export { default as ReportFilterBar } from './ReportFilterBar';
   export { default as ReportSummaryStrip } from './ReportSummaryStrip';
   export { default as ReportClassesTab } from './ReportClassesTab';
   export { default as ReportMistakesTab } from './ReportMistakesTab';
   export { default as ReportPerformanceTab } from './ReportPerformanceTab';
   export { default as ExportModal } from './ExportModal';
   export * from './report-helpers';
   ```

### Acceptance Criteria
- [ ] Panel slides in from the right when rendered
- [ ] Clicking backdrop calls `onClose`
- [ ] Body scroll locked while panel is open, restored on unmount
- [ ] All 3 tabs (classes, mistakes, performance) switch correctly
- [ ] Filters affect all tabs and summary strip
- [ ] Export modal opens and closes
- [ ] Loading spinner during data fetch
- [ ] Error state displays properly
- [ ] Panel scrolls independently from background
- [ ] `index.ts` barrel exports compile cleanly

---

## Integration Teammate: Integration, Cleanup & Docs

> **The wiring agent.** The only teammate that modifies existing files. **Waits for Panel Teammate** (needs `ReportPanel` to be importable), then makes 4 surgical edits, 1 deletion, and writes the implementation session log.

### Files to MODIFY
| File | Change |
|------|--------|
| `src/api.ts` | Add `getStudentReport` re-export |
| `src/pages/TeacherClasses.tsx` | Import ReportPanel, add state, wire up |
| `src/App.tsx` | Remove standalone report route + import |
| `src/pages/TeacherDashboard.tsx` | Update navigation to use query param |

### Files to DELETE
| File | Reason |
|------|--------|
| `src/pages/StudentReport.tsx` | Fully replaced by component system |

### Files to CREATE
| File | Description |
|------|-------------|
| `docs/Technical Implementation Journey/Classes_Revamp_Implementation.md` | Technical doc covering what was actually built, deviations, and architecture decisions |
| `docs/Logs/YYYY-MM-DD-NNN-classes-revamp-implementation.md` | Session log (follows `TEMPLATE.md` format) |

### Coordination
- **Waits on Panel Teammate** — needs `ReportPanel` and `index.ts` to exist so `import { ReportPanel } from '../components/teacher-classes'` resolves
- Can start reading + planning immediately, but should not write changes until Panel Teammate signals completion
- **Talk to Panel Teammate** if the wiring doesn't work as expected (e.g. missing export, wrong prop name). Go to the source — don't patch around it.
- **Collect info from all teammates** for the session log: any issues encountered, any deviations from the plan, any communication that happened between teammates.

### Task List

1. **Update `api.ts`** (around line 31)
   - Add `getStudentReport` to the Supabase re-exports:
     ```ts
     export {
       // ... existing ...
       getSuggestedPortions,
       getStudentReport,    // ADD
     } from './lib/supabase-api';
     ```

2. **Update `TeacherClasses.tsx`**
   - Add import: `import { ReportPanel } from '../components/teacher-classes';`
   - Add state (near other state declarations, ~line 77):
     ```ts
     const [selectedReportStudentId, setSelectedReportStudentId] = useState<string | null>(null);
     ```
   - In the existing `useEffect` that reads searchParams (lines 80–94), add before the `?new=1` check:
     ```ts
     const reportStudentId = searchParams.get('report');
     if (reportStudentId) {
       setSelectedReportStudentId(reportStudentId);
       setSearchParams({});
     }
     ```
   - Change the Report button handler (line 985):
     - FROM: `navigate(`/teacher/students/${student.id}/report`)`
     - TO: `setSelectedReportStudentId(student.id)`
   - Add JSX at the end of the component return, before the final `</div>`:
     ```tsx
     {selectedReportStudentId && (
       <ReportPanel
         key={selectedReportStudentId}
         studentId={selectedReportStudentId}
         onClose={() => setSelectedReportStudentId(null)}
       />
     )}
     ```

3. **Update `App.tsx`**
   - Remove line 19: `import StudentReport from './pages/StudentReport';`
   - Remove line 49: `<Route path="teacher/students/:studentId/report" element={<StudentReport />} />`

4. **Update `TeacherDashboard.tsx`**
   - Change line 327:
     - FROM: `navigate(`/teacher/students/${student.id}/report`)`
     - TO: `navigate(`/teacher/classes?report=${student.id}`)`

5. **Delete `StudentReport.tsx`**
   - Verify no remaining imports reference this file anywhere in `src/`
   - Delete the file

6. **Write `docs/Technical Implementation Journey/Classes_Revamp_Implementation.md`**
   - The "what actually happened" counterpart to `Classes_Revamp_Plan.md`
   - Document:
     - Final component architecture (confirm or note deviations from the plan)
     - Every file created/modified/deleted with descriptions
     - Any interface or prop changes that diverged from the plan
     - Inter-teammate communication that happened (interface negotiations, blockers, fixes)
     - Edge cases discovered during implementation
     - Architecture decisions made on the fly

7. **Write `docs/Logs/YYYY-MM-DD-NNN-classes-revamp-implementation.md`**
   - Session log following `docs/Logs/TEMPLATE.md` format
   - Use correct date and session number
   - Document:
     - Objective, summary, work completed (standard log sections)
     - Issues encountered and how they were resolved
     - Files changed table
     - Verification results (`npm run build`, manual testing)
     - Next steps / remaining follow-up items

### Acceptance Criteria
- [ ] "Report" button in TeacherClasses opens slide-out panel (no page navigation)
- [ ] "View Report" in TeacherDashboard navigates to `/teacher/classes?report=ID` and auto-opens panel
- [ ] Route `/teacher/students/:id/report` no longer exists
- [ ] No import references to `StudentReport.tsx` remain
- [ ] `getStudentReport` accessible via `import { getStudentReport } from '../api'`
- [ ] `npm run build` succeeds with zero errors
- [ ] All existing TeacherClasses functionality (new class modal, notes, filters, delete) still works
- [ ] Switching students (click Report on student B while A's panel is open) works via `key=` remount
- [ ] `Classes_Revamp_Implementation.md` is written in `docs/Technical Implementation Journey/`
- [ ] Implementation session log is written in `docs/Logs/`

---

## File Ownership Map

Each file has exactly one owner. No conflicts possible.

| Teammate | Creates (new files) | Modifies (existing files) |
|----------|--------------------|----|
| **Foundation** | `report-helpers.ts`, `ReportFilterBar.tsx`, `ReportSummaryStrip.tsx`, `ExportModal.tsx` | — |
| **Tabs** | `ReportClassesTab.tsx`, `ReportMistakesTab.tsx`, `ReportPerformanceTab.tsx` | — |
| **Panel** | `ReportPanel.tsx`, `index.ts` | — |
| **Integration** | `Classes_Revamp_Implementation.md` + session log | `api.ts`, `TeacherClasses.tsx`, `App.tsx`, `TeacherDashboard.tsx` + deletes `StudentReport.tsx` |

**Shared read-only** (everyone can read, nobody modifies): `report-types.ts`, `report-export.ts`, `supabase-api.ts`, `quran-utils.ts`, `StudentReport.tsx` (source reference).

---

## Coordination Timeline

```
Time ──────────────────────────────────────────────────────────→

Foundation:  [===== write helpers + leaf components =====]  ✓ done
Tabs:        [===== write tab components ================]  (waits for Foundation) [verify] ✓
Panel:       [===== write ReportPanel + index.ts ========]  (waits for Foundation+Tabs) [verify] ✓
Integration: [== read existing files, plan edits ========]  (waits for Panel) [=== wire up + log ===] ✓

  ↑↕ teammates communicate directly whenever issues arise ↕↑
```

Everyone starts at time 0. Tabs, Panel, and Integration work on what they can immediately (writing code, reading files). When they hit a dependency, they wait for the specific teammate to finish, then continue. If anyone hits a problem, they talk to the relevant teammate directly — don't just wait silently.

---

## Verification After All Teammates Complete

```bash
# 1. TypeScript compilation
cd quran_frontend && npx tsc --noEmit

# 2. Build check
npm run build

# 3. Verify StudentReport.tsx is deleted
ls src/pages/StudentReport.tsx  # Should fail / not found

# 4. Verify no remaining references
grep -r "StudentReport" src/  # Should find nothing

# 5. Verify new components exist (9 files)
ls src/components/teacher-classes/
# index.ts, report-helpers.ts, ReportPanel.tsx,
# ReportFilterBar.tsx, ReportSummaryStrip.tsx, ReportClassesTab.tsx,
# ReportMistakesTab.tsx, ReportPerformanceTab.tsx, ExportModal.tsx

# 6. Verify both docs exist
ls docs/Technical\ Implementation\ Journey/Classes_Revamp_Implementation.md
ls docs/Logs/*classes-revamp-implementation*

# 7. Manual testing
npm run dev
# Login as teacher → Classes → Click "Report" on a student → panel opens
# Test: tabs, filters, export, dark/light mode, close via backdrop
# Dashboard → "View Report" → navigates and opens panel
```

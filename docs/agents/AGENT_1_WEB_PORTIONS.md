# Agent 1: Web Portions — Edit, Delete & "By Juz" Selection

**Features:** 1 (Edit Portion Supabase migration), 2 (Delete Portion), 3 ("By Juz" Selection)
**Depends on:** Nothing (starts immediately, runs in parallel with Agents 2 + 3)
**Blocks:** Agent 4 (Docs) needs to know when this finishes

## Inter-Agent Communication

**This agent MUST actively communicate with other agents:**
- If you encounter any issue with Supabase RLS policies → flag it immediately (Agent 2 may face the same on Flutter)
- When done → message Agent 4: "W1-W9 complete. Files created/modified: [list]. Any issues: [list]"
- If you discover that `api.ts` barrel exports are structured differently than expected → document the change

## Objective

Migrate the edit portion feature from FastAPI to Supabase, add a delete portion feature (entirely new), and add "By Juz" selection mode for portions in the class creation flow. All work is in the React web frontend (`quran_frontend/`).

## Reference

- **Plan doc:** `docs/Technical Implementation Journey/Web_Portion_Management_Plan.md`
- **Key source files to read first:**
  - `quran_frontend/src/lib/supabase-api.ts` — existing Supabase functions (patterns to follow)
  - `quran_frontend/src/api.ts` — barrel exports + legacy FastAPI calls (lines 106-135)
  - `quran_frontend/src/pages/Classroom.tsx` — edit modal (lines 1406-1454), portion selector (lines 932-972), add modal (lines 1347-1404)
  - `quran_frontend/src/pages/TeacherClasses.tsx` — `SinglePortion` interface (lines 16-25), mode toggle (lines 478-501)
  - `quran_frontend/src/lib/quran-utils.ts` — `JUZ_BOUNDARIES` (lines 40-71), `getSurahRangeForJuz` (lines 74-78)

## Tasks

### Feature 1: Edit Portion — Supabase Migration

- [x] **W1.** Add `updateAssignment()` to `quran_frontend/src/lib/supabase-api.ts`
  - Add after the `deleteClass` function (~line 449)
  - Signature: `updateAssignment(assignmentId: string, data: { type?: string; start_surah?: number; end_surah?: number; start_ayah?: number | null; end_ayah?: number | null })`
  - Implementation: `.update(data).eq('id', assignmentId)` on `assignments` table
  - Add `invalidateCache('classes')` after success
  - Follow the pattern of `deleteClass` at lines 437-448

- [x] **W2.** Add `addClassAssignments()` to `quran_frontend/src/lib/supabase-api.ts`
  - Add right after `updateAssignment`
  - Signature: `addClassAssignments(classId: string, assignments: Array<{ type, start_surah, end_surah, start_ayah?, end_ayah?, student_id? }>)`
  - Implementation: map assignments to rows with `class_id`, then `.insert()` on `assignments` table
  - Follow the existing insert pattern at lines 414-428
  - Add `invalidateCache('classes')` after success

- [x] **W3.** Update `quran_frontend/src/api.ts` — replace legacy functions with Supabase re-exports
  - Replace lines 106-135 (the two `fetch`-based functions) with:
    ```typescript
    export { updateAssignment, addClassAssignments } from './lib/supabase-api';
    ```
  - `Classroom.tsx` imports from `../api` so this swap is transparent — no UI changes needed
  - Verify no other files import these functions directly from `api.ts`

### Feature 2: Delete Portion — New Feature

- [x] **W4.** Add `deleteAssignment()` to `supabase-api.ts` + export from `api.ts`
  - In `supabase-api.ts`: `.delete().eq('id', assignmentId)` on `assignments` table
  - Add to `api.ts` re-exports: `export { updateAssignment, addClassAssignments, deleteAssignment } from './lib/supabase-api';`
  - Follow the `deleteClass` pattern at lines 437-448

- [x] **W5.** Add delete UI in `Classroom.tsx`
  - Add `handleDeletePortion` handler (near existing `handleEditPortion`):
    - Prevent deleting the last assignment in the active section
    - Show `confirm()` dialog before deletion
    - Call `deleteAssignment(assignmentId)`
    - Refresh class data and reset portion index to 0
  - Add trash icon button next to the existing edit pencil button at lines 949-966:
    - Red hover state: `hover:bg-red-600/50 hover:text-red-400`
    - Trash can SVG icon (standard 24x24 viewBox)
    - Only shown when `isTeacher` is true
  - Import `deleteAssignment` from `../api`

### Feature 3: "By Juz" Selection Mode

- [x] **W6.** Update `SinglePortion` interface in `TeacherClasses.tsx`
  - Line 18: change `mode: 'page' | 'surah'` to `mode: 'page' | 'surah' | 'juz'`
  - Add `juz: number` field to the interface (after `endAyah`)
  - Update the default `SinglePortion` factory to include `juz: 1`

- [x] **W7.** Add "By Juz" toggle button + dropdown in `TeacherClasses.tsx`
  - Import `JUZ_BOUNDARIES` from `../lib/quran-utils`
  - Add third toggle button at lines 490-501 (after "By Surah")
  - Add `portion.mode === 'juz'` conditional branch with:
    - Juz dropdown (1-30)
    - `onChange`: look up `JUZ_BOUNDARIES` for selected juz, auto-fill `startSurah`, `endSurah`, `startAyah`, `endAyah`
    - Show auto-filled range below dropdown as helper text

- [x] **W8.** Add "Quick Fill from Juz" in `Classroom.tsx` Add/Edit Portion modals
  - Import `JUZ_BOUNDARIES` from `../lib/quran-utils`
  - Add a "Quick Fill from Juz" dropdown at the top of:
    - Add Portion modal (lines 1362-1396)
    - Edit Portion modal (lines 1421-1445)
  - When a Juz is selected, auto-fill the From/To Surah and From/To Ayah fields
  - Default value: empty ("— Select Juz —")

- [x] **W9.** Verify all 3 features work end-to-end
  - Test: Edit an existing portion → verify Supabase update (no more FastAPI call)
  - Test: Add a new portion → verify Supabase insert
  - Test: Delete a portion → verify it disappears, last-portion guard works
  - Test: Create a class with "By Juz" mode → verify surah/ayah auto-fill
  - Test: Edit portion via "Quick Fill from Juz" → verify fields populate
  - Check browser console for any errors

## Files Modified

| File | Action | Feature |
|---|---|---|
| `quran_frontend/src/lib/supabase-api.ts` | MODIFY — add 3 functions | 1, 2 |
| `quran_frontend/src/api.ts` | MODIFY — replace lines 106-135 with re-exports | 1, 2 |
| `quran_frontend/src/pages/Classroom.tsx` | MODIFY — add delete handler/button, add Juz quick-fill | 2, 3 |
| `quran_frontend/src/pages/TeacherClasses.tsx` | MODIFY — add `'juz'` mode, Juz toggle + dropdown | 3 |

## Key Constraints

- All Supabase calls must use `as any` type assertions to match the existing pattern in `supabase-api.ts`
- Always call `invalidateCache('classes')` after mutations so the UI refreshes
- The delete button must NOT appear when there's only one assignment in a section
- `JUZ_BOUNDARIES` data already exists in `quran-utils.ts` — do NOT duplicate it
- Keep dark mode support: both `Classroom.tsx` and `TeacherClasses.tsx` use `darkMode` from ThemeContext
- The edit/add modals in `Classroom.tsx` are surah-based dropdowns — the Juz quick-fill is an _optional_ convenience on top (doesn't replace surah fields)

## RLS Note

The `assignments` table in Supabase should have RLS policies for UPDATE and DELETE that restrict to the teacher who owns the class. If these policies don't exist:
- UPDATE: `USING (class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()))`
- DELETE: same as UPDATE
- If you can't verify (no Supabase access), document this as a note for the user

## Done Signal

When all tasks are complete, message Agent 4 (Docs) with the full list of files modified and any issues encountered.

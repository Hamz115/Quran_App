# Agent 2: Flutter Portions — Edit, Delete, "By Juz" & Tab Fix

**Features:** 4 (Edit Portion), 5 (Delete Portion), 6 ("By Juz" Selection), 8 (ReportPanel Tab Overflow Fix)
**Depends on:** Nothing (starts immediately, runs in parallel with Agents 1 + 3)
**Blocks:** Agent 3 Feature 9 (Smart Suggestions) depends on this agent finishing — Agent 3 needs to add to `providers.dart` and `create_class_screen.dart` after this agent is done

## Inter-Agent Communication

**This agent MUST actively communicate with other agents:**
- When done → message Agent 3: "F1-F9 complete. `providers.dart` and `create_class_screen.dart` are yours now. Here are the methods I added: [list]"
- When done → message Agent 4: "F1-F9 complete. Files created/modified: [list]. Any issues: [list]"
- If you need to change the structure of `providers.dart` in a way that could affect Agent 3's planned additions → message Agent 3 immediately
- If Agent 1 reports a Supabase RLS issue with assignments → check if Flutter has the same issue

## Objective

Add edit/delete portion functionality to the Flutter classroom screen, add "By Juz" portion selection to class creation, and fix the ReportPanel tab overflow on narrow screens.

## Reference

- **Plan doc:** `docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md`
- **Key source files to read first:**
  - `quran_mobile/lib/data/repositories/class_repository.dart` — existing `updateAssignment()` at line 168 (already exists!)
  - `quran_mobile/lib/data/models/assignment.dart` — `Assignment` model with `copyWith()` at line 63
  - `quran_mobile/lib/presentation/providers/providers.dart` — `ClassesNotifier` at line 262, no update/delete methods yet
  - `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` — `_buildPortionSelector` at line 283 (no edit/delete buttons)
  - `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` — portion builder (surah-only, no juz)
  - `quran_mobile/lib/core/services/report_helpers.dart` — private `_JuzBoundary` at line 24 (no ayah precision)
  - `quran_mobile/lib/data/quran_data.dart` — static Quran metadata (add juz boundaries here)
  - `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` — tab Row at line 148 (overflow)
- **Web reference for patterns:**
  - `quran_frontend/src/pages/Classroom.tsx` — edit modal (lines 1406-1454), portion selector (lines 949-966)
  - `quran_frontend/src/lib/quran-utils.ts` — `JUZ_BOUNDARIES` with ayah precision (lines 40-71)

## Tasks

### Feature 4: Edit Portion

- [x] **F1.** Add `updateAssignment()` method to `ClassesNotifier` in `providers.dart`
  - Add after the `createClass` method (around line 380)
  - Dual-path implementation:
    - **Web (kIsWeb):** `supabase.from('assignments').update(data).eq('id', assignmentId)`
    - **Local:** call existing `_repository.updateAssignment(intId, data)` (already at `class_repository.dart:168`)
  - Call `await loadClasses()` at the end to refresh state
  - Signature: `Future<void> updateAssignment({required String assignmentId, required Map<String, dynamic> data})`

- [x] **F2.** Add edit button + edit bottom sheet in `classroom_screen.dart`
  - Add a pencil icon (`Icons.edit`) button next to each portion pill in `_buildPortionSelector` (lines 301-328)
  - Only show when the current user is a teacher
  - Create `_showEditPortionSheet(BuildContext context, Assignment assignment)` method:
    - `showModalBottomSheet` with `StatefulBuilder`
    - From Surah / To Surah dropdowns (reuse pattern from `create_class_screen.dart`)
    - From Ayah / To Ayah number inputs
    - Cancel + Update buttons
    - On update: call `ref.read(classesProvider.notifier).updateAssignment(...)`
  - Reference: web's edit modal at `Classroom.tsx:1406-1454`

### Feature 5: Delete Portion

- [x] **F3.** Add `deleteAssignment()` to `class_repository.dart`
  - Add after `updateAssignment` (around line 175)
  - Use soft delete (same pattern as `deleteClass` at lines 177-190):
    ```dart
    await db.update('assignments', {'is_deleted': 1, 'sync_status': 'pending'}, where: 'id = ?', whereArgs: [id]);
    await _logSyncOperation(db, 'assignment', id, 'delete');
    ```

- [x] **F4.** Add `deleteAssignment()` to `ClassesNotifier` in `providers.dart`
  - Dual-path:
    - **Web:** `supabase.from('assignments').delete().eq('id', assignmentId)`
    - **Local:** call `_repository.deleteAssignment(intId)`
  - Call `await loadClasses()` to refresh state

- [x] **F5.** Add trash icon + confirmation dialog in `classroom_screen.dart`
  - Add `Icons.delete_outline` button next to the edit button from F2
  - Red color with opacity: `Colors.red.withOpacity(0.6)`
  - Create `_confirmDeletePortion(BuildContext context, Assignment assignment)`:
    - Check if this is the last assignment in the section type → show SnackBar error
    - Otherwise show `AlertDialog` with "Delete Portion" title, confirmation text, Cancel + Delete buttons
    - On delete: call `ref.read(classesProvider.notifier).deleteAssignment(...)`, reset `_selectedPortionIndex = 0`

### Feature 6: "By Juz" Selection Mode

- [x] **F6.** Add `JuzBoundary` class + full data to `quran_data.dart`
  - Create a public `JuzBoundary` class with: `juz`, `startSurah`, `startAyah`, `endSurah`, `endAyah`
  - Add `const List<JuzBoundary> juzBoundaries` with all 30 entries (copy ayah-level data from web's `JUZ_BOUNDARIES` in `quran-utils.ts:40-71`)
  - Add `JuzBoundary? getJuzBoundary(int juz)` helper

- [x] **F7.** Update `report_helpers.dart` to use public juz data from `quran_data.dart`
  - Import `juzBoundaries` from `../../data/quran_data.dart`
  - Remove the private `_JuzBoundary` class and `_juzBoundaries` list (lines 24-62)
  - Update `getSurahRangeForJuz()` (line 66) to use the public `juzBoundaries` list
  - This consolidates juz data to a single source of truth

- [x] **F8.** Add "By Juz" toggle + dropdown in `create_class_screen.dart`
  - Import `getJuzBoundary` from `../../data/quran_data.dart`
  - Add a mode selector to the portion builder section (alongside existing surah selection):
    - Two toggle chips: "By Surah" (active by default) and "By Juz"
    - When "By Juz" is selected: show a `DropdownButtonFormField<int>` with Juz 1-30
    - On selection: look up boundary via `getJuzBoundary(juz)`, auto-fill `startSurah`, `endSurah`, `startAyah`, `endAyah` in the `PortionData`
  - Keep the surah fields visible (read-only when in juz mode) so the teacher can see what was auto-filled

### Feature 8: ReportPanel Tab Overflow Fix

- [x] **F9.** Fix tab row overflow in `report_panel.dart`
  - At line 148: the `Row` contains 3 `_TabButton` children that overflow by ~4.3px on narrow screens
  - Wrap each `_TabButton` in `Expanded`:
    ```dart
    child: Row(
      children: [
        Expanded(child: _TabButton(label: 'Classes', ...)),
        Expanded(child: _TabButton(label: 'Mistakes', ...)),
        Expanded(child: _TabButton(label: 'Performance', ...)),
      ],
    ),
    ```
  - This is a 3-line change — one `Expanded` wrapper per tab

## Files Modified

| File | Action | Feature |
|---|---|---|
| `quran_mobile/lib/presentation/providers/providers.dart` | MODIFY — add `updateAssignment()` + `deleteAssignment()` to ClassesNotifier | 4, 5 |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | MODIFY — add edit/delete buttons + sheets | 4, 5 |
| `quran_mobile/lib/data/repositories/class_repository.dart` | MODIFY — add `deleteAssignment()` | 5 |
| `quran_mobile/lib/data/quran_data.dart` | MODIFY — add `JuzBoundary` class + data | 6 |
| `quran_mobile/lib/core/services/report_helpers.dart` | MODIFY — use public juz data, remove private copy | 6 |
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | MODIFY — add "By Juz" toggle + dropdown | 6 |
| `quran_mobile/lib/presentation/screens/classes/report/report_panel.dart` | MODIFY — wrap tabs in `Expanded` | 8 |

## Key Constraints

- `class_repository.dart:168` already has `updateAssignment()` — for local SQLite. The new provider method must call this existing method.
- Use soft delete for local SQLite (set `is_deleted = 1`), hard delete for Supabase (`.delete()`) — this matches the existing `deleteClass` pattern
- `Assignment` model has `copyWith()` — use it for state updates
- `providers.dart` is a shared file: Agent 3 will add to it AFTER this agent finishes. Do NOT change the file structure in unexpected ways — keep your additions clean and well-commented
- `create_class_screen.dart` is also shared: Agent 3 will add Smart Suggestions UI after this agent finishes
- All UI must support dark mode: use `ref.watch(themeProvider)` + `AppColors.xxx(isDarkMode)`
- The `PortionData` class in `create_class_screen.dart` uses `startSurah`, `endSurah`, `startAyah`, `endAyah` — the juz dropdown sets these
- Do NOT modify web files — Agent 1 handles the web side

## Done Signal

When all tasks are complete:
1. Message Agent 3: "F1-F9 done. `providers.dart` and `create_class_screen.dart` are yours for Feature 9. I added `updateAssignment()` and `deleteAssignment()` to ClassesNotifier, and `JuzBoundary` data to `quran_data.dart`."
2. Message Agent 4: "F1-F9 done. Files modified: [list]."

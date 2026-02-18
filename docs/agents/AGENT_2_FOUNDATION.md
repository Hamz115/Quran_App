# Agent 2: Foundation — Data Models, Helpers, Providers & Character-Level Rendering

**Phases:** B + C (first pass), then G (second pass after Agent 3)
**Depends on:** Nothing for B+C. Phase G depends on Agent 3 completing.
**Blocks:** Agent 3 (UI Widgets) depends on B+C output. Agent 4 (Docs) needs to know when G finishes.

## Objective

**First pass (B+C):** Create the Dart data layer that powers the classes tab revamp: report models, filter models, pure helper functions, and Riverpod providers that fetch/compute report data from Supabase. Agent 3 will build the UI widgets on top of these.

**Second pass (G):** After Agent 3 finishes the classes screen rewrite, come back and add character-level mistake **rendering** to the Mushaf page widget. The creation/storage of character-level mistakes already works — what's missing is the visual display.

## Inter-Agent Communication

**This agent MUST actively communicate with other agents:**
- After B+C completes → message Agent 3: "Models and providers are ready. Here are the exports you need: [list files]"
- After B+C completes → message Agent 4: "Phase B+C done. Files created: [list]"
- When waiting for Agent 3 to finish → periodically check Agent 3's progress
- If you hit any issue with models/types that Agent 3 will depend on → message Agent 3 immediately with the change
- After G completes → message Agent 4: "Phase G done. Files modified: [list]"

## Reference

- **Full plan:** `docs/Technical Implementation Journey/Flutter_Local_Quran_And_Classes_Revamp_Plan.md` → "New Dart Models", "Supabase Queries", "Phase B", "Phase C"
- **Web source to port from:**
  - `quran_frontend/src/lib/report-types.ts` — TypeScript interfaces (models)
  - `quran_frontend/src/components/teacher-classes/report-helpers.ts` — Pure functions
  - `quran_frontend/src/lib/supabase-api.ts:getStudentReport()` — Supabase query logic
  - `quran_frontend/src/lib/quran-utils.ts` — `getSurahRangeForJuz()` helper
- **For Phase G (character-level rendering):**
  - `quran_frontend/src/pages/Classroom.tsx` — Web's character-level mistake rendering (lines 457-522, `renderWordWithColoredChar()`)
  - `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` — Current Flutter Mushaf renderer (needs changes)
  - `quran_mobile/lib/presentation/screens/classroom/word_popup.dart` — Already has letter/harakat parsing (reuse `_parseArabicWord()`)
  - `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` — Mistake removal needs char-level support
- **Existing Flutter files to understand:**
  - `quran_mobile/lib/presentation/providers/providers.dart` — Current providers, especially `teacherStudentsProvider`
  - `quran_mobile/lib/data/models/` — Existing model patterns (ClassSession, Mistake, Assignment)
  - `quran_mobile/lib/config/constants.dart` — `AppConstants.surahNames` map

## Tasks

### Phase B: Data Models & Helpers

- [x] **B1.** Create `quran_mobile/lib/data/models/student_report.dart`
  - Mirror `report-types.ts` interfaces as Dart classes
  - Classes: `StudentReport`, `StudentInfo`, `ReportSummary`, `StudentClass`, `ClassAssignment`, `ClassMistake`, `MistakeBySurah`, `RepeatedMistake`, `PerformanceDataPoint`
  - Each class needs: constructor, named parameters, `copyWith()` method
  - Use `const` constructors where possible
  - See plan doc for exact field definitions

- [x] **B2.** Create `quran_mobile/lib/data/models/report_filters.dart`
  - `DatePreset` enum: `oneMonth`, `twoMonths`, `sixMonths`, `all`
  - `ReportFilters` class with: `dateFrom`, `dateTo`, `datePreset`, `surahFrom`, `surahTo`, `juz`
  - `const` default constructor with all-empty/null defaults
  - `copyWith()` method
  - `PerformanceStats` class with: `currentStreak`, `bestStreak`, `bestStreakRange`, `mistakesPerClass`, `mistakeSparkline`, `trend`

- [x] **B3.** Create `quran_mobile/lib/core/services/report_helpers.dart`
  - Port ALL pure functions from `report-helpers.ts` to Dart
  - Constants: `perfMap` (Map<String, int>), `perfLabels` (List<String>)
  - Badge color functions: `perfBadgeColor(String)`, `mistakeCountColor(int)`, `portionTagColor(String)` — return `Color`
  - Formatting: `formatReportDate(String)`, `getDatePresetRange(DatePreset)` returning `({String from, String to})`
  - Statistics: `computePerformanceStats(List<StudentClass>)` → `PerformanceStats`
    - Current streak (Very Good or above from most recent)
    - Best streak + date range
    - Mistakes per class average
    - Sparkline data (last 12 classes normalized to 0-100%)
    - Trend: compare last 4 vs previous 4 classes
  - Filtering: `applyReportFilters(StudentReport, ReportFilters)` → `StudentReport`
    - Filter classes by date range
    - Filter classes/mistakes by surah range (with Juz override)
    - Recompute summary from filtered data
    - Also filter per-class mistakes by surah range
  - **Important:** Need `getSurahRangeForJuz(int juz)` — either port from `quran-utils.ts` or add to this file
    - Check if `quran_mobile/lib/data/quran_data.dart` already has Juz boundary data

- [x] **B4.** (Optional) Write basic unit tests for `applyReportFilters()` and `computePerformanceStats()`
  - File: `quran_mobile/test/report_helpers_test.dart`
  - Test with mock StudentReport data
  - Skip if time-constrained — Agent 3 will validate via UI

### Phase C: Providers

- [x] **C1.** Fix `teacherStudentsProvider` in `quran_mobile/lib/presentation/providers/providers.dart`
  - **Line 65:** Remove `if (!kIsWeb) return [];` guard
  - The Supabase query works identically on mobile — just remove the platform check
  - Keep the rest of the function body unchanged

- [x] **C2.** Create `quran_mobile/lib/presentation/providers/report_provider.dart`
  - Import Supabase, Riverpod, auth_provider, student_report models, report_filters, report_helpers
  - **`studentReportProvider`** — `FutureProvider.family<StudentReport, String>`
    - Fetches from Supabase (3 queries: profiles, class_students→classes→assignments, mistakes→mistake_occurrences)
    - Builds `StudentReport` using same logic as `supabase-api.ts:getStudentReport()` (lines 835-995)
    - Must build: classMistakeMap, per-class mistakes, summary stats, mistakes_by_surah, repeated_mistakes, performance_trend
    - Use `AppConstants.surahNames` for surah name lookups
  - **`reportFiltersProvider`** — `StateProvider<ReportFilters>` with default (all empty)
  - **`filteredReportProvider`** — Provider that combines `studentReportProvider` + `reportFiltersProvider` → calls `applyReportFilters()`
  - **`performanceStatsProvider`** — Provider that computes from filtered classes → calls `computePerformanceStats()`

**>>> After B+C: Message Agent 3 that foundation is ready. Then WAIT for Agent 3 to complete before starting Phase G. <<<**

### Phase G: Character-Level Mistake Rendering (AFTER Agent 3 completes)

**Context:** The Flutter app can already CREATE character-level mistakes (the `WordPopup` in `word_popup.dart` splits words into letters and harakat, and passes `charIndex` to `addMistake()`). The Mistake model has `charIndex` and `isCharacterLevel`. What's MISSING is the visual rendering — currently, a character-level mistake highlights the **entire word** in QPC glyphs. The web instead switches to `textUthmani` (Amiri font) and colors only the specific character.

- [x] **G1.** Update `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` — `_getMistakeLevel()`
  - Currently returns a single severity level for the whole word
  - Change to also check if the word has character-level mistakes (where `charIndex != null`)
  - If a word has ONLY character-level mistakes (no whole-word), it should be rendered differently
  - Add a method like `_getCharMistakes(QuranPageWord word)` → `List<Mistake>` that returns character-specific mistakes

- [x] **G2.** Update `mushaf_page_widget.dart` — `_buildWord()` rendering
  - Add a branch: if a word has character-level mistakes but NO whole-word mistake:
    - Render using `textUthmani` (Amiri font) instead of QPC `c1` glyphs
    - Use `RichText` with `TextSpan` children to color individual characters
    - Parse word into letters/harakat (reuse logic from `word_popup.dart:_parseArabicWord()`)
    - Color the specific mistaken character (red/error color) while leaving others normal
    - Slightly smaller font size than QPC (match web's 0.85em approach)
  - If word has a whole-word mistake, keep current QPC glyph rendering with full highlight

- [x] **G3.** Extract `_parseArabicWord()` to a shared utility
  - Currently lives in `word_popup.dart` as a private method
  - Move to a shared location (e.g. `quran_mobile/lib/core/services/arabic_text_utils.dart`)
  - Both `word_popup.dart` and `mushaf_page_widget.dart` need it
  - Keep the same harakat Unicode detection logic

- [x] **G4.** Update `classroom_screen.dart` — character-level mistake removal
  - Current `_removeMistake()` only handles `charIndex == null` (whole-word)
  - Add support for removing character-level mistakes
  - When tapping a word that has character-level mistakes, show options:
    - Remove specific character mistake(s)
    - Remove all mistakes on this word
  - Communicate with Agent 3 if this changes the classroom screen they already touched

- [x] **G5.** Test character-level rendering
  - Add a character-level mistake (haraka) via WordPopup
  - Verify the Mushaf page shows only that character highlighted (not the whole word)
  - Add a whole-word mistake to the same word — verify it falls back to full QPC highlight
  - Test with multiple character mistakes on the same word

## Files Created

| File | Phase | Purpose |
|---|---|---|
| `quran_mobile/lib/data/models/student_report.dart` | B | Report data models (9 classes) |
| `quran_mobile/lib/data/models/report_filters.dart` | B | Filter + stats models |
| `quran_mobile/lib/core/services/report_helpers.dart` | B | Pure helper functions |
| `quran_mobile/lib/presentation/providers/report_provider.dart` | C | Report Riverpod providers |
| `quran_mobile/lib/core/services/arabic_text_utils.dart` | G | Shared Arabic word parser |

## Files Modified

| File | Phase | Change |
|---|---|---|
| `quran_mobile/lib/presentation/providers/providers.dart` | C | Remove `kIsWeb` guard from `teacherStudentsProvider` |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | G | Add character-level mistake rendering branch |
| `quran_mobile/lib/presentation/screens/classroom/word_popup.dart` | G | Extract `_parseArabicWord()` to shared util |
| `quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart` | G | Character-level mistake removal support |

## Key Constraints

- All model classes must have `const` constructors where possible
- `StudentReport.copyWith()` is critical — `applyReportFilters()` returns a modified copy
- Use `AppConstants.surahNames` from `config/constants.dart` — do NOT duplicate the surah names map
- The Supabase queries must use the exact same table/column names as the web (`profiles`, `class_students`, `classes`, `assignments`, `mistakes`, `mistake_occurrences`)
- Provider naming convention: match existing patterns in `providers.dart` (camelCase + `Provider` suffix)
- **Export everything Agent 3 needs:** all model classes, all helper functions, all providers
- **Phase G constraint:** When rendering `textUthmani` instead of QPC glyphs, the word must still fit in the same line space. Use `FittedBox` or match the web's 0.85em sizing approach.
- **Phase G constraint:** QPC glyphs are page-specific — `textUthmani` is universal. The font switch only happens for words with character-level-only mistakes.

## Supabase Query Reference

```dart
// Query 1: Student profile
supabase.from('profiles').select('id, name, email, student_id, created_at').eq('id', studentId).single();

// Query 2: Classes via class_students join
supabase.from('class_students').select('''
  class_id,
  classes (id, date, day, notes, performance, teacher_id, is_published, assignments (*))
''').eq('student_id', studentId);

// Query 3: Mistakes with occurrences
supabase.from('mistakes').select('*, mistake_occurrences(id, class_id, occurred_at)').eq('student_id', studentId);
```

## Done Signals

1. **After B+C:** Message Agent 3 — "Foundation ready, start building widgets." Message Agent 4 — "Phases B+C complete."
2. **After G:** Message Agent 4 — "Phase G (character-level rendering) complete." Message Agent 3 if any shared files were affected.

# Agent 3: Flutter Polish — Character-Level Mistakes & Smart Suggestions

**Features:** 7 (Char-Level Mistake Highlighting Polish), then 9 (Smart Suggestions in Class Creation)
**Depends on:** Feature 7 (P1-P5) has NO dependencies. Feature 9 (S1-S4) is BLOCKED until Agent 2 finishes.
**Blocks:** Agent 4 (Docs) needs to know when each feature finishes

## Inter-Agent Communication

**This agent MUST actively communicate with other agents:**
- Feature 7 (P1-P5) starts immediately — no coordination needed
- After P1-P5 complete → message Agent 4: "Feature 7 complete. Files modified: [list]"
- When Agent 2 messages you that F1-F9 are done → start Feature 9 (S1-S4)
- Before starting S1-S4 → read the current state of `providers.dart` and `create_class_screen.dart` (Agent 2 modified them)
- After S1-S4 complete → message Agent 4: "Feature 9 complete. Files created/modified: [list]"
- If you need Agent 2 to adjust something in the files they touched → message them

## Objective

**Feature 7:** Close 3 gaps in character-level mistake highlighting to match the web's rendering: (1) add 6 missing harakat codes, (2) add shadda combination logic, (3) add haraka glow visual effect.

**Feature 9:** Port the web's "Smart Suggestions" feature to Flutter — when creating a new class, auto-suggest hifz/sabqi/manzil portions based on the student's last class.

## Reference

- **Plan doc (Feature 7):** `docs/Technical Implementation Journey/Flutter_CharLevel_Mistakes_Alignment.md`
- **Plan doc (Feature 9):** `docs/Technical Implementation Journey/Flutter_Portion_Management_Plan.md` → Section E: Smart Suggestions
- **Key source files (Feature 7):**
  - `quran_mobile/lib/core/services/arabic_text_utils.dart` — current harakat codes (lines 21-37), `parseArabicWord` (lines 46-60), `groupArabicCharacters` (lines 79-102)
  - `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` — `_buildCharLevelWord` (lines 197-289), haraka TextSpan at lines 223-226
  - `quran_frontend/src/pages/Classroom.tsx` — web harakat list (lines 96-100), `splitArabicWord` with shadda logic (lines 104-130)
- **Key source files (Feature 9):**
  - `quran_frontend/src/lib/supabase-api.ts` — `getSuggestedPortions()` at lines 716-831 (full Supabase query logic)
  - `quran_frontend/src/lib/supabase-api.ts` — `SuggestedPortions` interface at lines 695-714
  - `quran_frontend/src/pages/TeacherClasses.tsx` — Smart Suggestions UI at lines 844-939
  - `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` — where to add the panel
  - `quran_mobile/lib/presentation/providers/providers.dart` — where to add the provider
  - `quran_mobile/lib/config/constants.dart` — `AppConstants.surahNames` for surah name lookups

## Tasks

### Feature 7: Character-Level Mistake Highlighting Polish (Start Immediately)

- [x] **P1.** Add 6 missing harakat codes to `arabic_text_utils.dart`
  - Current `harakatCodes` list at lines 21-37 has 15 entries
  - Add these 6 codes (matching web's `HARAKAT` at `Classroom.tsx:96-100`):
    ```dart
    0x0659, // Zwarakay
    0x065A, // Vowel sign small v above
    0x065B, // Inverted small v above
    0x065C, // Vowel sign dot below
    0x065D, // Reversed damma
    0x065E, // Fatha with two dots
    ```
  - Insert between `0x0658` (Mark noon ghunna) and `0x0670` (Superscript alef)
  - This ensures all Unicode combining marks are recognized as harakat, not letters

- [x] **P2.** Add shadda combination logic to `parseArabicWord` in `arabic_text_utils.dart`
  - Current `parseArabicWord` (lines 46-60) treats each haraka as a separate entry
  - Web's `splitArabicWord` (`Classroom.tsx:110-123`) combines shadda (U+0651) + following haraka into one entry
  - Update logic:
    ```dart
    const shadda = 0x0651;
    // If current char is shadda AND next char is also haraka → combine them
    if (char.codeUnitAt(0) == shadda && i + 1 < word.length && isHaraka(word[i + 1])) {
      harakat.add(CharInfo(char: char + word[i + 1], index: i));
      i++; // skip the combined haraka
    }
    // If previous char was shadda → skip (already combined)
    else if (i > 0 && word[i - 1].codeUnitAt(0) == shadda && isHaraka(word[i - 1])) {
      continue;
    }
    ```

- [x] **P3.** Add shadda combination logic to `groupArabicCharacters` in `arabic_text_utils.dart`
  - Same shadda combo logic as P2 but in `groupArabicCharacters` (lines 79-102)
  - When building `CharGroup.harakat`, combine shadda + following haraka into one `(char:, index:)` entry
  - Skip the next haraka if it was already combined with a preceding shadda

- [x] **P4.** Add haraka glow effect in `mushaf_page_widget.dart`
  - At lines 223-226: haraka mistakes currently only change `TextStyle(color:)`
  - Add visual emphasis to match the web's CSS glow:
    ```dart
    TextSpan(
      text: h.char,
      style: TextStyle(
        color: AppColors.getMistakeColor(level),
        fontSize: 26,  // ~1.3 * 20 (base Amiri size)
        fontWeight: FontWeight.bold,
        shadows: [
          Shadow(color: AppColors.getMistakeColor(level).withOpacity(0.6), blurRadius: 8),
          Shadow(color: AppColors.getMistakeColor(level).withOpacity(0.3), blurRadius: 16),
        ],
      ),
    )
    ```

- [x] **P5.** Test character-level rendering
  - Test 1: Mark a haraka mistake → verify glow effect visible
  - Test 2: Mark a shadda+fatha combo → verify it appears as one unit (not two separate marks)
  - Test 3: Check that uncommon harakat (0x0659-0x065E) are recognized as diacritics
  - Test 4: Whole-word mistake on same word → verify QPC glyph rendering still takes precedence
  - If unable to test (no device), document what should be tested

### Feature 9: Smart Suggestions (BLOCKED — Wait for Agent 2)

**>>> These tasks are BLOCKED until Agent 2 completes F1-F9. When Agent 2 messages you, start these. <<<**

- [x] **S1.** Create `quran_mobile/lib/data/models/suggested_portions.dart`
  - `SuggestedPortion` class:
    ```dart
    class SuggestedPortion {
      final int startSurah;
      final int endSurah;
      final int? startAyah;
      final int? endAyah;
      final String? surahName;
      final String? note;
      const SuggestedPortion({...});
    }
    ```
  - `SuggestedPortions` class:
    ```dart
    class SuggestedPortions {
      final SuggestedPortion? hifz;
      final SuggestedPortion? sabqi;
      final SuggestedPortion? manzil;
      final ({String id, String date, String day})? lastClass;
      const SuggestedPortions({...});
    }
    ```
  - Mirror the web's `SuggestedPortions` interface at `supabase-api.ts:695-714`

- [x] **S2.** Add `suggestedPortionsProvider` to `providers.dart`
  - `FutureProvider.family<SuggestedPortions, String>` (keyed by studentId)
  - Query Supabase (same logic as web's `getSuggestedPortions` at `supabase-api.ts:716-831`):
    1. Query `class_students` → join `classes` → join `assignments` for the student
    2. Sort by `class_id` descending, limit 10
    3. Take the most recent class's assignments
    4. Filter by type: hifz, sabqi, revision/manzil
    5. Return as `SuggestedPortions`
  - Fallback: if no previous classes, return a default suggestion (Al-Mulk / Surah 67)
  - Use `AppConstants.surahNames` for surah name lookups
  - Import `SuggestedPortions` from the model created in S1

- [x] **S3.** Add Smart Suggestions panel in `create_class_screen.dart`
  - `CreateClassScreen` already accepts `studentId` (line 13)
  - Add a Smart Suggestions panel between the date picker and portion sections:
    - Only show when `widget.studentId != null`
    - Use `Consumer` to watch `suggestedPortionsProvider(widget.studentId!)`
    - Purple gradient border container (match web's `from-purple-500/10 to-cyan-500/10`)
    - Header row: lightbulb icon + "Smart Suggestions" + "(based on {day}, {date})"
    - 3-column row of suggestion cards:
      - Hifz (blue) / Sabqi (cyan) / Manzil (grey-slate)
      - Each shows: label, surah name, ayah range, note
    - Tapping a card calls `_applySuggestion(sectionType, portion)` which:
      - Enables the section (`_sectionEnabled[type] = true`)
      - Sets the portion data (`_portions[type] = [PortionData(...)]`)
    - Loading state: spinner + "Loading suggestions..."
    - Empty state: `SizedBox.shrink()` (no panel)
  - Create `_SuggestionCard` widget (local to the file)
  - Footer text: "Tap a suggestion to auto-fill. You can modify it afterward."
  - Reference: web UI at `TeacherClasses.tsx:844-939`

- [x] **S4.** Test smart suggestions flow
  - Test 1: Open "New Class" for a student with previous classes → suggestions should load
  - Test 2: Tap a suggestion card → verify portion fields auto-fill
  - Test 3: Student with no previous classes → verify "No previous classes" or default suggestion
  - Test 4: Loading state visible while Supabase query runs
  - If unable to test, document what should be tested

## Files Created

| File | Feature | Purpose |
|---|---|---|
| `quran_mobile/lib/data/models/suggested_portions.dart` | 9 | Suggested portions data models |

## Files Modified

| File | Feature | Change |
|---|---|---|
| `quran_mobile/lib/core/services/arabic_text_utils.dart` | 7 | Add 6 harakat codes + shadda combo logic |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | 7 | Add glow effect for haraka mistakes |
| `quran_mobile/lib/presentation/providers/providers.dart` | 9 | Add `suggestedPortionsProvider` |
| `quran_mobile/lib/presentation/screens/classes/create_class_screen.dart` | 9 | Add Smart Suggestions panel + `_SuggestionCard` |

## Key Constraints

### Feature 7:
- Only modify `arabic_text_utils.dart` and `mushaf_page_widget.dart` — these files are exclusively owned by this agent
- The shadda combo logic must match the web's `splitArabicWord` behavior exactly
- `Shadow` in Flutter is the equivalent of CSS `text-shadow`
- The glow effect should only apply to haraka mistakes (not letter mistakes)

### Feature 9:
- **Wait for Agent 2** before touching `providers.dart` or `create_class_screen.dart`
- Read the current state of both files first — Agent 2 has modified them
- The `suggestedPortionsProvider` is a NEW provider — add it after Agent 2's additions, don't modify their code
- The Smart Suggestions panel is NEW UI — add it before the portion sections in `create_class_screen.dart`
- `PortionData` class may have been modified by Agent 2 (for juz support) — use whatever shape it's in
- Use `AppConstants.surahNames` for all surah name lookups
- All UI must support dark mode via `AppColors.xxx(isDarkMode)`

## Done Signals

1. **After P1-P5 (Feature 7):** Message Agent 4: "Feature 7 complete. Modified `arabic_text_utils.dart` and `mushaf_page_widget.dart`."
2. **After S1-S4 (Feature 9):** Message Agent 4: "Feature 9 complete. Created `suggested_portions.dart`, modified `providers.dart` and `create_class_screen.dart`."

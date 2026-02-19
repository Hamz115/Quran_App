# Flutter UX Polish — Technical Documentation

## Overview

Post-Phase 18 UX fixes for the Flutter mobile app addressing four issues: summary strip truncation, cramped table layout, placeholder dashboard content, and missing historical mistake context in the classroom screen.

## 1. Summary Strip — FittedBox Pattern

**Problem:** The "Avg Perf" cell in `ReportSummaryStrip` truncates values like "Very Good" on narrow screens because `maxLines: 1` + `TextOverflow.ellipsis` clips the text.

**Solution:** Wrap the value `Text` widget in `FittedBox(fit: BoxFit.scaleDown)`.

```dart
FittedBox(
  fit: BoxFit.scaleDown,
  child: Text(
    stat.value,
    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, ...),
  ),
),
```

**Why FittedBox:** Unlike `maxLines`/`overflow`, `FittedBox` scales the text proportionally to fit its parent, keeping all characters visible. The `scaleDown` fit ensures text never scales UP (which would look wrong for short values like "3").

## 2. Classes Table — Horizontal Scroll

**Problem:** Five columns (date, portions, mistakes, performance, notes) squeeze together on mobile screens, making the table unreadable.

**Solution:** Match the web app's `overflow-x-auto` + `min-w-[640px]` pattern:

```dart
SingleChildScrollView(
  scrollDirection: Axis.horizontal,
  child: ConstrainedBox(
    constraints: BoxConstraints(
      minWidth: 640,
      maxWidth: math.max(640, screenWidth - 32),
    ),
    child: Container(/* existing table */),
  ),
)
```

**Key decisions:**
- `minWidth: 640` ensures columns always have enough space
- `maxWidth: max(640, screenWidth - 32)` prevents the table from being wider than necessary on tablets
- The 32px accounts for the 16px horizontal padding on each side from the parent `Padding`
- Existing `Expanded(flex: N)` columns work because `ConstrainedBox` provides a determined width for `Row`

## 3. Dashboard — Student List with Report Navigation

**Problem:** The "My Students" section shows a "Coming Soon" placeholder, while `teacherStudentsProvider` already fetches student data from Supabase's `teacher_students` table.

**Solution:**

### Wiring the provider
```dart
final teacherStudentsAsync = ref.watch(teacherStudentsProvider);
```

### Stat card fix
```dart
value: '${teacherStudentsAsync.valueOrNull?.length ?? 0}',
```

### Student list with navigation
Replace the placeholder with `teacherStudentsAsync.when(loading/error/data)`:
- **Loading:** `CircularProgressIndicator`
- **Error:** Error message
- **Empty:** Icon + "No students yet" + helpful subtitle
- **Data:** List of `InkWell` tiles, each showing avatar initials + student name + chevron

Tapping a student navigates to `_StudentReportPage`, a private `ConsumerWidget` that wraps `ReportPanel` in a `Scaffold` with an `AppBar`.

## 4. Classroom — Mistakes Split (This Class vs Previous)

**Problem:** The classroom screen (opened when tapping a class) shows "Mistakes in this section" below the Quran page, which lumps ALL accumulated mistakes together. The teacher needs to see which mistakes were made in THIS class vs which came from PREVIOUS classes.

### Architecture

**New provider: `classMistakeIdsProvider`**

Fetches the set of mistake IDs that have an occurrence linked to a specific class:

```dart
final classMistakeIdsProvider = FutureProvider.family<Set<String>, String>((ref, classId) async {
  if (kIsWeb) {
    // Query Supabase mistake_occurrences by class UUID
    final response = await supabase
        .from('mistake_occurrences')
        .select('mistake_id')
        .eq('class_id', classId);
    return (response as List).map((r) => r['mistake_id'].toString()).toSet();
  } else {
    // Query local SQLite mistake_occurrences by class int ID
    final results = await db.query('mistake_occurrences',
      columns: ['mistake_id'],
      where: 'class_id = ? AND is_deleted = 0',
      whereArgs: [intId]);
    return results.map((r) => r['mistake_id'].toString()).toSet();
  }
});
```

### Splitting logic in `_buildMistakesSummary`

```
1. Get all relevant mistakes (filtered by assignment surah/ayah range)
2. Get classMistakeIds for the current class
3. For each relevant mistake:
   - If its ID is in classMistakeIds → "this class"
   - Otherwise → "previous classes"
4. Render both sections
```

### Visual Design

| Section | Color Scheme | Shown When |
|---------|-------------|------------|
| MISTAKES IN THIS CLASS | Red (existing `MistakeBadge`) | Always (shows count even if 0) |
| MISTAKES FROM PREVIOUS CLASSES | Amber badges | Only when non-empty |

Amber colors:

| Theme | Background | Border | Text |
|-------|-----------|--------|------|
| Dark | `amber-500/10` | `amber-500/20` | `amber-300` |
| Light | `amber-50` | `amber-200` | `amber-600` |

### How it works end-to-end

1. Teacher opens a class → `ClassroomScreen(classId: "...")`
2. The screen watches `mistakesProvider` (all student mistakes) and `classMistakeIdsProvider(classId)` (occurrence links)
3. `_getMistakesForAssignment` filters by surah/ayah range
4. The filtered list is split using the occurrence set
5. Teacher marks a new mistake → `addMistake(classId: ...)` creates a `mistake_occurrence` → both providers rebuild → the new mistake appears in "this class"

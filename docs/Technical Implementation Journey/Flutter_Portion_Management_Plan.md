# Flutter Portion Management Plan

> **Features covered:** Edit Portion, Delete Portion, "By Juz" Selection, ReportPanel Tab Overflow Fix, Smart Suggestions
> **Platform:** Flutter (`quran_mobile/`)
> **Created:** 2026-02-19

---

## Table of Contents

1. [Feature 4: Edit Portion](#feature-4-edit-portion)
2. [Feature 5: Delete Portion](#feature-5-delete-portion)
3. [Feature 6: "By Juz" Selection Mode](#feature-6-by-juz-selection-mode)
4. [Feature 8: ReportPanel Tab Row Overflow Fix](#feature-8-reportpanel-tab-row-overflow-fix)
5. [Feature 9: Smart Suggestions in Class Creation](#feature-9-smart-suggestions-in-class-creation)

---

## Feature 4: Edit Portion

### Current State

**Repository layer exists but is unused.** The provider and UI layers are missing.

**`class_repository.dart:168-174`** — method exists:
```dart
// Update assignment
Future<void> updateAssignment(int id, Map<String, dynamic> updates) async {
  final db = await _dbHelper.appDatabase;
  updates['sync_status'] = 'pending';
  await db.update('assignments', updates, where: 'id = ?', whereArgs: [id]);
  await _logSyncOperation(db, 'assignment', id, 'update');
}
```

**`assignment.dart:63-89`** — `copyWith` method exists on `Assignment` model:
```dart
Assignment copyWith({
  int? id, int? serverId, int? classId, int? serverClassId,
  String? type, int? startSurah, int? endSurah,
  int? startAyah, int? endAyah, SyncStatus? syncStatus, bool? isDeleted,
})
```

**`providers.dart:262+`** — `ClassesNotifier` has `loadClasses()` and `createClass()` but **no `updateAssignment()`**.

**`classroom_screen.dart:283-333`** — Portion selector renders portion pills but has **no edit button**.

### What's Missing

1. `updateAssignment()` method in `ClassesNotifier` (provider layer)
2. Edit button in `classroom_screen.dart` portion selector
3. Edit portion bottom sheet UI

### Implementation Steps

#### Step 1: Add `updateAssignment()` to `ClassesNotifier` in `providers.dart`

Add after the `createClass` method (around line 380):

```dart
Future<void> updateAssignment({
  required String assignmentId,
  required Map<String, dynamic> data,
}) async {
  if (kIsWeb) {
    final supabase = Supabase.instance.client;
    final response = await supabase
        .from('assignments')
        .update(data)
        .eq('id', assignmentId);
    // Response is void on update; error throws
  } else {
    final intId = int.tryParse(assignmentId);
    if (intId == null) throw Exception('Invalid assignment ID');
    await _repository.updateAssignment(intId, data);
  }
  await loadClasses(); // Refresh state
}
```

#### Step 2: Add pencil icon button to portion selector

In `classroom_screen.dart:301-328`, modify the portion pill to include an edit button when the user is a teacher. Wrap each portion pill in a `Row`:

```dart
return Padding(
  padding: const EdgeInsets.only(right: 8),
  child: Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      GestureDetector(
        onTap: () { /* existing selection logic */ },
        child: Container(/* existing pill container */),
      ),
      if (isTeacher) ...[
        const SizedBox(width: 4),
        GestureDetector(
          onTap: () => _showEditPortionSheet(context, assignment),
          child: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.surface(isDarkMode).withOpacity(0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.edit, size: 16, color: AppColors.textSecondary(isDarkMode)),
          ),
        ),
      ],
    ],
  ),
);
```

#### Step 3: Create edit portion bottom sheet

Add a `_showEditPortionSheet` method to `_ClassroomScreenState`:

```dart
void _showEditPortionSheet(BuildContext context, Assignment assignment) {
  int startSurah = assignment.startSurah;
  int endSurah = assignment.endSurah;
  int? startAyah = assignment.startAyah;
  int? endAyah = assignment.endAyah;

  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setSheetState) {
        return Container(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20, right: 20, top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Edit Portion', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              // Surah dropdowns (same pattern as create_class_screen.dart)
              // From Surah / To Surah / From Ayah / To Ayah
              // ... (reuse existing _buildSurahDropdown pattern)
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        final notifier = ref.read(classesProvider.notifier);
                        await notifier.updateAssignment(
                          assignmentId: assignment.id.toString(),
                          data: {
                            'start_surah': startSurah,
                            'end_surah': endSurah,
                            'start_ayah': startAyah,
                            'end_ayah': endAyah,
                          },
                        );
                        Navigator.pop(ctx);
                      },
                      child: const Text('Update'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    ),
  );
}
```

**Reference:** Web edit modal pattern at `Classroom.tsx:1406-1454`.

**Files to modify:**
| File | Action |
|------|--------|
| `lib/presentation/providers/providers.dart` | Add `updateAssignment()` to `ClassesNotifier` |
| `lib/presentation/screens/classroom/classroom_screen.dart` | Add edit button + edit bottom sheet |

---

## Feature 5: Delete Portion

### Current State

**Nothing exists** — no repository method, no provider method, no UI.

### Implementation Steps

#### Step 1: Add `deleteAssignment()` to `class_repository.dart`

Add after `updateAssignment` (around line 175):

```dart
// Delete assignment
Future<void> deleteAssignment(int id) async {
  final db = await _dbHelper.appDatabase;
  await db.update(
    'assignments',
    {
      'is_deleted': 1,
      'sync_status': 'pending',
    },
    where: 'id = ?',
    whereArgs: [id],
  );
  await _logSyncOperation(db, 'assignment', id, 'delete');
}
```

Note: Uses soft delete (same pattern as `deleteClass` at `class_repository.dart:177-190`) rather than hard delete, for sync compatibility.

#### Step 2: Add `deleteAssignment()` to `ClassesNotifier` in `providers.dart`

```dart
Future<void> deleteAssignment(String assignmentId) async {
  if (kIsWeb) {
    final supabase = Supabase.instance.client;
    await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);
  } else {
    final intId = int.tryParse(assignmentId);
    if (intId == null) throw Exception('Invalid assignment ID');
    await _repository.deleteAssignment(intId);
  }
  await loadClasses(); // Refresh state
}
```

#### Step 3: Add trash icon button in `classroom_screen.dart`

Next to the edit button added in Feature 4:

```dart
if (isTeacher) ...[
  const SizedBox(width: 4),
  GestureDetector(
    onTap: () => _showEditPortionSheet(context, assignment),
    child: Container(/* edit icon */),
  ),
  const SizedBox(width: 4),
  GestureDetector(
    onTap: () => _confirmDeletePortion(context, assignment),
    child: Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: AppColors.surface(isDarkMode).withOpacity(0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(Icons.delete_outline, size: 16, color: Colors.red.withOpacity(0.6)),
    ),
  ),
],
```

#### Step 4: Add confirmation dialog

```dart
void _confirmDeletePortion(BuildContext context, Assignment assignment) {
  // Get all assignments for this section type
  final allAssignments = /* current class assignments filtered by type */;
  if (allAssignments.length <= 1) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Cannot delete the last portion in a section')),
    );
    return;
  }

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Delete Portion'),
      content: const Text('Are you sure you want to delete this portion?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        TextButton(
          onPressed: () async {
            Navigator.pop(ctx);
            final notifier = ref.read(classesProvider.notifier);
            await notifier.deleteAssignment(assignment.id.toString());
            setState(() => _selectedPortionIndex = 0);
          },
          style: TextButton.styleFrom(foregroundColor: Colors.red),
          child: const Text('Delete'),
        ),
      ],
    ),
  );
}
```

**Files to modify:**
| File | Action |
|------|--------|
| `lib/data/repositories/class_repository.dart` | Add `deleteAssignment()` (soft delete) |
| `lib/presentation/providers/providers.dart` | Add `deleteAssignment()` to `ClassesNotifier` |
| `lib/presentation/screens/classroom/classroom_screen.dart` | Add trash button + confirmation dialog |

---

## Feature 6: "By Juz" Selection Mode

### Current State

**Juz data exists but is private and lacks ayah precision.**

`report_helpers.dart:24-62` has `_JuzBoundary` (private class, surah-only):
```dart
class _JuzBoundary {
  final int juz;
  final int startSurah;
  final int endSurah;
  const _JuzBoundary(this.juz, this.startSurah, this.endSurah);
}

const List<_JuzBoundary> _juzBoundaries = [
  _JuzBoundary(1, 1, 2),
  _JuzBoundary(2, 2, 2),
  // ... no ayah data
];
```

**Web has full precision** in `quran-utils.ts:40-71`:
```typescript
{ juz: 1, startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 141 },
```

**Juz dropdown widget exists** in `report_filter_bar.dart:437` (`_JuzDropdown`), but it's private to that file.

### Implementation Steps

#### Step 1: Add `JuzBoundary` class + full data to `quran_data.dart`

In `lib/data/quran_data.dart`, add a public class with ayah-level precision:

```dart
class JuzBoundary {
  final int juz;
  final int startSurah;
  final int startAyah;
  final int endSurah;
  final int endAyah;

  const JuzBoundary({
    required this.juz,
    required this.startSurah,
    required this.startAyah,
    required this.endSurah,
    required this.endAyah,
  });
}

const List<JuzBoundary> juzBoundaries = [
  JuzBoundary(juz: 1,  startSurah: 1,  startAyah: 1,   endSurah: 2,   endAyah: 141),
  JuzBoundary(juz: 2,  startSurah: 2,  startAyah: 142,  endSurah: 2,   endAyah: 252),
  JuzBoundary(juz: 3,  startSurah: 2,  startAyah: 253,  endSurah: 3,   endAyah: 92),
  JuzBoundary(juz: 4,  startSurah: 3,  startAyah: 93,   endSurah: 4,   endAyah: 23),
  JuzBoundary(juz: 5,  startSurah: 4,  startAyah: 24,   endSurah: 4,   endAyah: 147),
  JuzBoundary(juz: 6,  startSurah: 4,  startAyah: 148,  endSurah: 5,   endAyah: 81),
  JuzBoundary(juz: 7,  startSurah: 5,  startAyah: 82,   endSurah: 6,   endAyah: 110),
  JuzBoundary(juz: 8,  startSurah: 6,  startAyah: 111,  endSurah: 7,   endAyah: 87),
  JuzBoundary(juz: 9,  startSurah: 7,  startAyah: 88,   endSurah: 8,   endAyah: 40),
  JuzBoundary(juz: 10, startSurah: 8,  startAyah: 41,   endSurah: 9,   endAyah: 92),
  JuzBoundary(juz: 11, startSurah: 9,  startAyah: 93,   endSurah: 11,  endAyah: 5),
  JuzBoundary(juz: 12, startSurah: 11, startAyah: 6,    endSurah: 12,  endAyah: 52),
  JuzBoundary(juz: 13, startSurah: 12, startAyah: 53,   endSurah: 14,  endAyah: 52),
  JuzBoundary(juz: 14, startSurah: 15, startAyah: 1,    endSurah: 16,  endAyah: 128),
  JuzBoundary(juz: 15, startSurah: 17, startAyah: 1,    endSurah: 18,  endAyah: 74),
  JuzBoundary(juz: 16, startSurah: 18, startAyah: 75,   endSurah: 20,  endAyah: 135),
  JuzBoundary(juz: 17, startSurah: 21, startAyah: 1,    endSurah: 22,  endAyah: 78),
  JuzBoundary(juz: 18, startSurah: 23, startAyah: 1,    endSurah: 25,  endAyah: 20),
  JuzBoundary(juz: 19, startSurah: 25, startAyah: 21,   endSurah: 27,  endAyah: 55),
  JuzBoundary(juz: 20, startSurah: 27, startAyah: 56,   endSurah: 29,  endAyah: 45),
  JuzBoundary(juz: 21, startSurah: 29, startAyah: 46,   endSurah: 33,  endAyah: 30),
  JuzBoundary(juz: 22, startSurah: 33, startAyah: 31,   endSurah: 36,  endAyah: 27),
  JuzBoundary(juz: 23, startSurah: 36, startAyah: 28,   endSurah: 39,  endAyah: 31),
  JuzBoundary(juz: 24, startSurah: 39, startAyah: 32,   endSurah: 41,  endAyah: 46),
  JuzBoundary(juz: 25, startSurah: 41, startAyah: 47,   endSurah: 45,  endAyah: 37),
  JuzBoundary(juz: 26, startSurah: 46, startAyah: 1,    endSurah: 51,  endAyah: 30),
  JuzBoundary(juz: 27, startSurah: 51, startAyah: 31,   endSurah: 57,  endAyah: 29),
  JuzBoundary(juz: 28, startSurah: 58, startAyah: 1,    endSurah: 66,  endAyah: 12),
  JuzBoundary(juz: 29, startSurah: 67, startAyah: 1,    endSurah: 77,  endAyah: 50),
  JuzBoundary(juz: 30, startSurah: 78, startAyah: 1,    endSurah: 114, endAyah: 6),
];

/// Get full Juz boundary with ayah precision.
JuzBoundary? getJuzBoundary(int juz) {
  if (juz < 1 || juz > 30) return null;
  return juzBoundaries.firstWhere((b) => b.juz == juz);
}
```

#### Step 2: Optionally update `report_helpers.dart` to use the public data

Replace the private `_JuzBoundary` and `_juzBoundaries` with imports from `quran_data.dart`:

```dart
import '../../data/quran_data.dart' show juzBoundaries;

// Replace getSurahRangeForJuz to use the public data:
({int startSurah, int endSurah})? getSurahRangeForJuz(int juz) {
  for (final b in juzBoundaries) {
    if (b.juz == juz) return (startSurah: b.startSurah, endSurah: b.endSurah);
  }
  return null;
}
```

Remove the private `_JuzBoundary` class and `_juzBoundaries` list.

#### Step 3: Add "By Juz" toggle in `create_class_screen.dart`

In the portion builder section, add a third mode toggle button. Currently, `create_class_screen.dart` uses a surah-only selection. Add a "By Juz" tab that shows a dropdown (1-30) which auto-fills the surah/ayah fields:

```dart
// Mode selector row
Row(
  children: [
    _ModeChip(label: 'By Surah', isActive: mode == 'surah', onTap: () => setMode('surah')),
    const SizedBox(width: 8),
    _ModeChip(label: 'By Juz', isActive: mode == 'juz', onTap: () => setMode('juz')),
  ],
),

// Juz dropdown (shown when mode == 'juz')
if (mode == 'juz')
  DropdownButtonFormField<int>(
    value: selectedJuz,
    decoration: const InputDecoration(labelText: 'Select Juz'),
    items: List.generate(30, (i) => DropdownMenuItem(
      value: i + 1,
      child: Text('Juz ${i + 1}'),
    )),
    onChanged: (juz) {
      if (juz == null) return;
      final boundary = getJuzBoundary(juz);
      if (boundary != null) {
        setState(() {
          selectedJuz = juz;
          portion.startSurah = boundary.startSurah;
          portion.endSurah = boundary.endSurah;
          portion.startAyah = boundary.startAyah;
          portion.endAyah = boundary.endAyah;
        });
      }
    },
  ),
```

**Files to modify:**
| File | Action |
|------|--------|
| `lib/data/quran_data.dart` | Add `JuzBoundary` class + `juzBoundaries` list with ayah precision |
| `lib/core/services/report_helpers.dart` | Replace private `_JuzBoundary` with import from `quran_data.dart` |
| `lib/presentation/screens/classes/create_class_screen.dart` | Add "By Juz" toggle + Juz dropdown |

---

## Feature 8: ReportPanel Tab Row Overflow Fix

### Current State

`report_panel.dart:148-177` renders 3 tab buttons in a `Row`:

```dart
Container(
  color: AppColors.card(isDark),
  padding: const EdgeInsets.symmetric(horizontal: 16),
  child: Row(
    children: [
      _TabButton(label: 'Classes', ...),
      _TabButton(label: 'Mistakes', ...),
      _TabButton(label: 'Performance', ...),
    ],
  ),
),
```

On narrow screens (~320px), this `Row` overflows by approximately 4.3 pixels because the `_TabButton` widgets don't constrain their width.

### Fix

Wrap each `_TabButton` in `Expanded` so all 3 tabs share the available width equally:

```dart
child: Row(
  children: [
    Expanded(
      child: _TabButton(label: 'Classes', ...),
    ),
    Expanded(
      child: _TabButton(label: 'Mistakes', ...),
    ),
    Expanded(
      child: _TabButton(label: 'Performance', ...),
    ),
  ],
),
```

This is a one-line-per-tab change. No other modifications needed.

**Alternative fix:** Wrap the `Row` in `SingleChildScrollView(scrollDirection: Axis.horizontal)` — but `Expanded` is simpler and looks better (tabs fill the space evenly).

**Files to modify:**
| File | Action |
|------|--------|
| `lib/presentation/screens/classes/report/report_panel.dart` | Wrap each `_TabButton` in `Expanded` |

---

## Feature 9: Smart Suggestions in Class Creation

### Current State — Web Has Full Implementation

**Supabase API (`supabase-api.ts:716-831`):**
```typescript
export async function getSuggestedPortions(studentId: string): Promise<SuggestedPortions> {
  // Queries last 10 classes for a student via class_students join
  // Returns hifz/sabqi/manzil portions from last class
  // Falls back to Al-Mulk if no previous classes
}
```

**Data model (`supabase-api.ts:695-714`):**
```typescript
interface SuggestedPortion {
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  surah_name?: string;
  note?: string;
}

interface SuggestedPortions {
  hifz: SuggestedPortion | null;
  sabqi: SuggestedPortion | null;
  manzil: SuggestedPortion | null;
  last_class: { id: string; date: string; day: string } | null;
}
```

**UI (`TeacherClasses.tsx:844-939`):**
- Purple gradient panel with lightbulb icon
- 3-column grid: Hifz (blue), Sabqi (cyan), Manzil (slate)
- Each card shows surah name, ayah range, note
- Loading state with spinner
- "No previous classes" fallback message
- Click a card → auto-fills corresponding portion fields

### Flutter Has Nothing

No model, no provider, no UI.

### Implementation Steps

#### Step 1: Add `SuggestedPortions` model

Create `lib/data/models/suggested_portions.dart`:

```dart
class SuggestedPortion {
  final int startSurah;
  final int endSurah;
  final int? startAyah;
  final int? endAyah;
  final String? surahName;
  final String? note;

  const SuggestedPortion({
    required this.startSurah,
    required this.endSurah,
    this.startAyah,
    this.endAyah,
    this.surahName,
    this.note,
  });
}

class SuggestedPortions {
  final SuggestedPortion? hifz;
  final SuggestedPortion? sabqi;
  final SuggestedPortion? manzil;
  final ({String id, String date, String day})? lastClass;

  const SuggestedPortions({
    this.hifz,
    this.sabqi,
    this.manzil,
    this.lastClass,
  });
}
```

#### Step 2: Add `suggestedPortionsProvider` to `providers.dart`

```dart
final suggestedPortionsProvider = FutureProvider.family<SuggestedPortions, String>((ref, studentId) async {
  final supabase = Supabase.instance.client;

  // Default empty response
  SuggestedPortion? hifz, sabqi, manzil;
  ({String id, String date, String day})? lastClass;

  // Find student's most recent class with assignments
  final response = await supabase
      .from('class_students')
      .select('''
        class_id,
        classes (
          id, date, day,
          assignments (type, start_surah, end_surah, start_ayah, end_ayah, student_id)
        )
      ''')
      .eq('student_id', studentId)
      .order('class_id', ascending: false)
      .limit(10);

  final rows = response as List;
  if (rows.isEmpty) {
    // Default to Al-Mulk
    return SuggestedPortions(
      hifz: SuggestedPortion(
        startSurah: 67, endSurah: 67,
        startAyah: 1, endAyah: 30,
        surahName: 'Al-Mulk',
        note: 'No previous classes — starting from Al-Mulk',
      ),
    );
  }

  final lastClassData = rows[0]['classes'];
  if (lastClassData == null) return const SuggestedPortions();

  lastClass = (
    id: lastClassData['id'].toString(),
    date: lastClassData['date'] ?? '',
    day: lastClassData['day'] ?? '',
  );

  // Parse assignments by type (same logic as web)
  final assignments = (lastClassData['assignments'] as List? ?? [])
      .where((a) => a['student_id'] == null || a['student_id'] == studentId);

  for (final a in assignments) {
    final type = a['type'] as String?;
    final portion = SuggestedPortion(
      startSurah: a['start_surah'] ?? 0,
      endSurah: a['end_surah'] ?? 0,
      startAyah: a['start_ayah'],
      endAyah: a['end_ayah'],
      surahName: AppConstants.surahNames[a['start_surah']] ?? 'Surah ${a['start_surah']}',
      note: 'Same as last class — adjust as needed',
    );

    if (type == 'hifz') hifz = portion;
    else if (type == 'sabqi') sabqi = portion;
    else if (type == 'revision' || type == 'manzil') manzil = portion;
  }

  return SuggestedPortions(
    hifz: hifz, sabqi: sabqi, manzil: manzil, lastClass: lastClass,
  );
});
```

#### Step 3: Accept `studentId` in `CreateClassScreen`

`CreateClassScreen` already accepts `studentId` at line 13:
```dart
class CreateClassScreen extends ConsumerStatefulWidget {
  final String? studentId;
  const CreateClassScreen({super.key, this.studentId});
```

#### Step 4: Add Smart Suggestions panel UI

In `create_class_screen.dart`, after the date selector and before the portion sections, add:

```dart
if (widget.studentId != null)
  Consumer(
    builder: (context, ref, _) {
      final suggestionsAsync = ref.watch(suggestedPortionsProvider(widget.studentId!));

      return suggestionsAsync.when(
        loading: () => Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(colors: [
              Colors.purple.withOpacity(0.1),
              Colors.cyan.withOpacity(0.1),
            ]),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.purple.withOpacity(0.2)),
          ),
          child: Row(
            children: [
              SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
              const SizedBox(width: 8),
              Text('Loading suggestions...', style: TextStyle(color: Colors.grey)),
            ],
          ),
        ),
        error: (_, __) => const SizedBox.shrink(),
        data: (suggestions) {
          if (suggestions.hifz == null && suggestions.sabqi == null && suggestions.manzil == null) {
            return const SizedBox.shrink();
          }

          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [
                Colors.purple.withOpacity(0.1),
                Colors.cyan.withOpacity(0.1),
              ]),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.purple.withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.lightbulb_outline, size: 20, color: Colors.purple[300]),
                    const SizedBox(width: 8),
                    Text('Smart Suggestions',
                        style: TextStyle(fontWeight: FontWeight.w500, color: Colors.purple[300])),
                    if (suggestions.lastClass != null)
                      Text(' (based on ${suggestions.lastClass!.day}, ${suggestions.lastClass!.date})',
                          style: TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (suggestions.hifz != null)
                      Expanded(child: _SuggestionCard(
                        label: 'HIFZ',
                        color: Colors.blue,
                        portion: suggestions.hifz!,
                        onTap: () => _applySuggestion('hifz', suggestions.hifz!),
                      )),
                    if (suggestions.sabqi != null) ...[
                      const SizedBox(width: 8),
                      Expanded(child: _SuggestionCard(
                        label: 'SABQI',
                        color: Colors.cyan,
                        portion: suggestions.sabqi!,
                        onTap: () => _applySuggestion('sabqi', suggestions.sabqi!),
                      )),
                    ],
                    if (suggestions.manzil != null) ...[
                      const SizedBox(width: 8),
                      Expanded(child: _SuggestionCard(
                        label: 'MANZIL',
                        color: Colors.grey,
                        portion: suggestions.manzil!,
                        onTap: () => _applySuggestion('revision', suggestions.manzil!),
                      )),
                    ],
                  ],
                ),
                const SizedBox(height: 8),
                Text('Tap a suggestion to auto-fill. You can modify it afterward.',
                    style: TextStyle(fontSize: 10, color: Colors.grey)),
              ],
            ),
          );
        },
      );
    },
  ),
```

#### Step 5: Add `_SuggestionCard` widget and `_applySuggestion` method

```dart
class _SuggestionCard extends StatelessWidget {
  final String label;
  final Color color;
  final SuggestedPortion portion;
  final VoidCallback onTap;

  const _SuggestionCard({
    required this.label,
    required this.color,
    required this.portion,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          border: Border.all(color: color.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: color)),
            const SizedBox(height: 4),
            Text(portion.surahName ?? 'Surah ${portion.startSurah}',
                style: TextStyle(fontSize: 13, color: color.withOpacity(0.8))),
            if (portion.startAyah != null)
              Text('Ayah ${portion.startAyah}-${portion.endAyah}',
                  style: TextStyle(fontSize: 11, color: color.withOpacity(0.6))),
            if (portion.note != null)
              Text(portion.note!, style: TextStyle(fontSize: 9, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
```

```dart
void _applySuggestion(String sectionType, SuggestedPortion portion) {
  setState(() {
    _sectionEnabled[sectionType] = true;
    _portions[sectionType] = [
      PortionData(
        startSurah: portion.startSurah,
        endSurah: portion.endSurah,
        startAyah: portion.startAyah,
        endAyah: portion.endAyah,
      ),
    ];
  });
}
```

**Files to create/modify:**
| File | Action |
|------|--------|
| `lib/data/models/suggested_portions.dart` | Create — `SuggestedPortion` + `SuggestedPortions` models |
| `lib/presentation/providers/providers.dart` | Add `suggestedPortionsProvider` |
| `lib/presentation/screens/classes/create_class_screen.dart` | Add Smart Suggestions panel, `_SuggestionCard`, `_applySuggestion` |

---

## Implementation Order

Recommended sequence:
1. **Feature 8** (Tab overflow fix) — trivial one-line change, can ship immediately
2. **Feature 4** (Edit Portion) — establishes the provider pattern
3. **Feature 5** (Delete Portion) — builds on Feature 4's pattern
4. **Feature 6** (By Juz) — standalone data + UI addition
5. **Feature 9** (Smart Suggestions) — largest feature, depends on having `studentId` flow working

Features 4+5 are tightly coupled and should be done together. Feature 8 is independent. Features 6 and 9 are independent of each other.

# Phase 5: Dashboard Screens

## Overview

Updated the Dashboard screen to be role-aware, showing different content and labels based on whether the user is a Teacher or Student. **Updated 3 Feb 2026** to match React web app design exactly.

**Completed:** Phase 5 of Flutter App Overhaul

---

## Dashboard Screen Updates

### `lib/presentation/screens/dashboard/dashboard_screen.dart`

#### Auth Integration
Added auth state to get user information:

```dart
final authState = ref.watch(authProvider);
final user = authState.user;
final isTeacher = user?.role.name == 'teacher';
final userName = user?.firstName ?? 'User';
```

---

## Teacher Dashboard (Updated 3 Feb 2026)

The Teacher Dashboard was redesigned to match the React web app exactly.

### Header Section
- Title: "Teacher Dashboard" (not avatar greeting)
- Subtitle: "Welcome back, {firstName}!"

### Action Buttons Row
Two gradient buttons for teachers:
- **Add Student** - Opens student management (placeholder)
- **+ Start New Class** - Opens new class modal (placeholder)

```dart
Row(
  children: [
    Expanded(child: _buildActionButton('Add Student', Icons.person_add_outlined)),
    SizedBox(width: 12),
    Expanded(child: _buildGradientButton('+ Start New Class', Icons.add)),
  ],
)
```

### Stat Cards (4 cards matching React)

| Card | Icon | Color | Badge |
|------|------|-------|-------|
| Total Students | `school_outlined` | Emerald | "Active" |
| Classes This Week | `calendar_today` | Cyan | - |
| Total Classes | `class_outlined` | Purple | - |
| Today's Date | `today` | Amber | - |

```dart
StatCard(
  label: 'Total Students',
  value: '${stats['totalStudents'] ?? 0}',
  icon: Icons.school_outlined,
  color: AppColors.emerald500,
  badge: 'Active',  // New badge parameter
),
```

### StatCard Badge Enhancement
Added `badge` parameter to StatCard widget for showing labels like "Active":

```dart
if (badge != null)
  Container(
    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: AppColors.emerald500,
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(badge!, style: TextStyle(fontSize: 11, color: Colors.white)),
  ),
```

---

## Student Dashboard

Students see a different layout focused on their progress:

### Header Section
- Avatar with initials (teal gradient)
- "Assalamu Alaikum, {firstName}"
- "Track your progress" subtitle

### Stat Cards (3 cards)

| Card | Label | Color |
|------|-------|-------|
| My Progress | Current surah | Emerald |
| Classes | Total attended | Cyan |
| To Fix | Mistakes count | Purple |

### Sections Displayed
1. **Surahs Needing Attention** - Bar chart of mistake frequency by surah
2. **Top Repeated Mistakes** - Word badges with error counts
3. **Recent Classes** - List of recent class sessions

---

## UI Components

### Teacher Dashboard Layout
```
┌──────────────────────────────────────────────────────┐
│ Teacher Dashboard                            [Sync] │
│ Welcome back, Hamza!                                 │
├──────────────────────────────────────────────────────┤
│ [Add Student]  [+ Start New Class]                  │
├──────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 👥 Active│ │ 📅       │ │ 📚       │ │ 📆       │ │
│ │ 5        │ │ 3        │ │ 45       │ │ Feb 3    │ │
│ │ Students │ │ This Week│ │ Total    │ │ Today    │ │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├──────────────────────────────────────────────────────┤
│ My Students                                          │
│ (Student management coming soon)                     │
└──────────────────────────────────────────────────────┘
```

### Student Dashboard Layout
```
┌──────────────────────────────────────────────────────┐
│ ┌────┐  Assalamu Alaikum,                    [Sync] │
│ │ HR │  Hamza                                        │
│ └────┘  Track your progress                         │
├──────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │ Al-Baqarah │ │ 12         │ │ 5          │        │
│ │ My Progress│ │ Classes    │ │ To Fix     │        │
│ └────────────┘ └────────────┘ └────────────┘        │
├──────────────────────────────────────────────────────┤
│ Surahs Needing Attention                             │
│ [Bar chart]                                          │
├──────────────────────────────────────────────────────┤
│ Top Repeated Mistakes                                │
│ [Word badges]                                        │
└──────────────────────────────────────────────────────┘
```

---

## Data Sources

All dashboard data comes from local SQLite via existing providers:

| Provider | Data |
|----------|------|
| `statsProvider` | totalClasses, repeatedMistakes counts |
| `topMistakesProvider` | Top 10 repeated mistake words |
| `mistakeCountsBySurahProvider` | Mistake counts grouped by surah |
| `classesProvider` | List of class sessions |
| `authProvider` | Current user info (name, role) |

---

## Theme Support

The dashboard fully supports light/dark mode:
- Background colors adapt via `AppColors.background(isDarkMode)`
- Text colors adapt via `AppColors.text(isDarkMode)`, `textSecondary()`, `textMuted()`
- Card backgrounds and borders adapt via `AppColors.surface()`, `border()`
- Avatar gradient provides visual distinction regardless of theme

---

## Testing

1. Login as a Teacher account
   - Avatar shows initials with cyan gradient
   - Greeting shows "Manage your Halaqah"
   - Stats labeled: "Current Surah", "Classes Taught", "To Review"

2. Login as a Student account
   - Avatar shows initials with teal gradient
   - Greeting shows "Track your progress"
   - Stats labeled: "My Progress", "Classes", "To Fix"

3. Pull to refresh
   - All providers invalidate and reload
   - Sync button triggers manual sync

---

# Phase 6: Classes & Quran Reader

## Overview

Updated the Classes screen and Quran Reader to be role-aware, with appropriate features and labels for Teachers vs Students.

**Completed:** Phase 6 of Flutter App Overhaul

---

## Classes Screen Updates

### `lib/presentation/screens/classes/classes_screen.dart`

#### Auth Integration
Added auth state to determine user role:

```dart
final authState = ref.watch(authProvider);
final isTeacher = authState.user?.role.name == 'teacher';
```

#### Role-Aware Header

| Element | Teacher View | Student View |
|---------|--------------|--------------|
| Title | "Classes" | "My Classes" |
| Subtitle | "Manage your teaching sessions" | "View your class history" |

#### Teacher-Only Features
The following features are only visible to teachers:
- **New Class FAB** - Floating action button to create classes
- **Delete button** - Remove classes from the list
- **Performance dropdown** - Edit class performance rating
- **Notes editor** - Edit class notes

#### Student View
Students see a read-only version:
- Performance badges are displayed but not editable
- Notes can be viewed but not edited
- No delete button on rows
- No create class button

#### Role-Aware Accent Colors
- Month headers use cyan for teachers, teal for students
- Maintains visual consistency with rest of app

#### Empty State
Different messages based on role:
- Teacher: "Start your first class to begin tracking progress" + "Create First Class" button
- Student: "Your teacher has not created any classes yet" (no button)

---

## Quran Reader Updates

### `lib/presentation/screens/reader/quran_reader_screen.dart`

#### Auth Integration
```dart
final authState = ref.watch(authProvider);
final isTeacher = authState.user?.role.name == 'teacher';
```

#### Role-Aware Text
| Element | Teacher View | Student View |
|---------|--------------|--------------|
| Subtitle | "Click words to mark mistakes" | "Review your recitation progress" |

#### Role-Aware Accent Colors
- Bismillah text: cyan for teachers, teal for students
- Ayah number markers: cyan for teachers, teal for students

---

## Phase 13.5: ClassroomScreen — QPC Quran Reader Integration

### Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Text rendering | Plain Arabic via `GoogleFonts.amiri` | QPC glyphs via `MushafPageWidget` |
| Layout | `Wrap` widget with inline words | Page-based Column layout matching printed Mushaf |
| Navigation | Surah selector dropdown | Page prev/next arrows constrained to assignment range |
| Fonts | Google Fonts CDN (Amiri) | QPC per-page fonts via `QpcFontService` |
| Data source | `surahWithAyahsProvider` (SQLite) | `quranPageDataProvider` (bundled JSON assets) |

### Page Navigation UI

Page navigation shows the position within the assignment's page range:

```
  [<]  2 / 5  (p. 563)  [>]
```

- Left arrow = next page (higher page number, RTL convention)
- Right arrow = previous page (lower page number)
- Arrows are disabled at range boundaries
- Switching sections or portions resets to the first page of the new assignment

### Interactive Word Tap → WordPopup

Tapping a QPC glyph word triggers the same `WordPopup` bottom sheet used before, but now receives `word.textUthmani` (plain Arabic from the page JSON) for letter/haraka parsing. The QPC `codeV1` glyph is what's displayed, but the popup parses the `textUthmani` field.

Word index conversion: QPC JSON uses 1-based `wordPosition`, mistakes use 0-based `wordIndex` → `word.wordPosition - 1`.

### Page Range Computation

Assignment page range is computed via `getPageRange()` in `quran_data.dart`:
- `firstPage = getPageNumber(startSurah, startAyah ?? 1)`
- `lastPage = endAyah != null ? getPageNumber(endSurah, endAyah) : getLastPageForSurah(endSurah)`

### Mistake Filtering

Mistakes are filtered by the entire assignment range (not just current page), supporting:
- Single surah with ayah range
- Multi-surah assignments with boundary ayah filtering

---

## Features by Role

### Teacher Features
| Screen | Feature | Available |
|--------|---------|-----------|
| Classes | Create new class | Yes |
| Classes | Delete class | Yes |
| Classes | Edit performance | Yes |
| Classes | Edit notes | Yes |
| Reader | Mark mistakes | Yes |

### Student Features
| Screen | Feature | Available |
|--------|---------|-----------|
| Classes | View classes | Yes |
| Classes | View performance | Yes (read-only) |
| Classes | View notes | Yes (read-only) |
| Reader | View mistakes | Yes |
| Reader | Mark mistakes | Yes |

---

## Testing

### Classes Screen

1. Login as a Teacher
   - Header shows "Classes" with "Manage your teaching sessions"
   - FAB visible for creating new classes
   - Each row has delete button
   - Performance dropdown is interactive
   - Notes icon opens edit dialog

2. Login as a Student
   - Header shows "My Classes" with "View your class history"
   - No FAB visible
   - No delete button on rows
   - Performance shown as badge (not editable)
   - Notes icon shows view-only dialog (if notes exist)

### Quran Reader

1. Login as a Teacher
   - Subtitle shows "Click words to mark mistakes"
   - Bismillah and ayah markers in cyan

2. Login as a Student
   - Subtitle shows "Review your recitation progress"
   - Bismillah and ayah markers in teal

---

## Next Phase

**Phase 7: Shared Widgets** - Refactor common UI components into reusable widgets.

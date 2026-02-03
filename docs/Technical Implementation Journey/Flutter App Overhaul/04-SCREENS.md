# Phase 5: Dashboard Screens

## Overview

Updated the Dashboard screen to be role-aware, showing different content and labels based on whether the user is a Teacher or Student.

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
final userInitials = '${user?.firstName?.isNotEmpty == true ? user!.firstName[0] : ''}${user?.lastName?.isNotEmpty == true ? user!.lastName[0] : ''}'.toUpperCase();
```

#### Personalized Welcome Header
- User avatar showing initials with role-based gradient colors
- "Assalamu Alaikum, [Name]" greeting
- Role-aware subtitle:
  - Teacher: "Manage your Halaqah"
  - Student: "Track your progress"

```dart
Container(
  width: 56,
  height: 56,
  decoration: BoxDecoration(
    gradient: LinearGradient(
      colors: isTeacher
          ? [AppColors.cyan500, AppColors.teal500]  // Teacher: cyan->teal
          : [AppColors.teal500, AppColors.cyan500], // Student: teal->cyan
    ),
    // ...
  ),
  child: Text(userInitials.isNotEmpty ? userInitials : 'QT'),
)
```

#### Role-Aware Stat Cards

| Stat | Teacher Label | Student Label |
|------|---------------|---------------|
| Progress | Current Surah | My Progress |
| Classes | Classes Taught | Classes |
| Mistakes | To Review | To Fix |

```dart
StatCard(
  label: isTeacher ? 'Current Surah' : 'My Progress',
  // ...
),
StatCard(
  label: isTeacher ? 'Classes Taught' : 'Classes',
  // ...
),
StatCard(
  label: isTeacher ? 'To Review' : 'To Fix',
  // ...
),
```

#### Role-Aware Colors
- Teacher avatar: Cyan → Teal gradient with cyan shadow
- Student avatar: Teal → Cyan gradient with teal shadow

---

## UI Components

### Welcome Header
```
┌──────────────────────────────────────────────────────┐
│ ┌────┐  Assalamu Alaikum,                    [Sync] │
│ │ HF │  Hamza                                        │
│ └────┘  Manage your Halaqah                         │
└──────────────────────────────────────────────────────┘
```

### Stat Cards Row
```
┌────────────┐ ┌────────────┐ ┌────────────┐
│ 📖         │ │ 📅         │ │ 🔄         │
│ Al-Baqarah │ │ 12         │ │ 5          │
│ My Progress│ │ Classes    │ │ To Fix     │
└────────────┘ └────────────┘ └────────────┘
```

---

## Sections Displayed

1. **Welcome Header** - Avatar, greeting, role subtitle, sync button
2. **Stat Cards** - Progress, classes count, mistakes to fix
3. **Surahs Needing Attention** - Bar chart of mistake frequency by surah
4. **Top Repeated Mistakes** - Word badges with error counts
5. **Recent Classes** - List of recent class sessions

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

# Phase 4: Role-based Navigation

## Overview

Implemented role-aware navigation that adapts based on the logged-in user's role (Teacher or Student).

**Completed:** Phase 4 of Flutter App Overhaul

---

## Navigation Structure

### Teacher View
| Tab | Icon | Label |
|-----|------|-------|
| Dashboard | dashboard_rounded | Dashboard |
| Classes | school_rounded | Classes |
| Reader | menu_book_rounded | Reader |
| Settings | settings_rounded | Settings |

### Student View
| Tab | Icon | Label |
|-----|------|-------|
| Dashboard | dashboard_rounded | My Progress |
| Classes | school_rounded | My Classes |
| Reader | menu_book_rounded | Reader |
| Settings | settings_rounded | Settings |

---

## Files Modified

### `lib/main.dart`

#### Role Banner
Added a role-aware banner at the top of the app showing:
- Current role (Teacher/Student)
- User's display name
- Role-appropriate color scheme (cyan for teachers, teal for students)

```dart
Widget _buildRoleBanner(bool isDarkMode, bool isTeacher, String userName) {
  // Teacher: cyan colors
  // Student: teal colors
  return Container(
    child: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 16, color: textColor),
        Text(message), // "Teacher View" or "Student View"
        Text('- Welcome, $userName'),
      ],
    ),
  );
}
```

#### Dynamic Navigation Items
Navigation items now adapt based on user role:

```dart
final navItems = isTeacher
    ? [
        _NavItem(Icons.dashboard_rounded, 'Dashboard'),
        _NavItem(Icons.school_rounded, 'Classes'),
        _NavItem(Icons.menu_book_rounded, 'Reader'),
        _NavItem(Icons.settings_rounded, 'Settings'),
      ]
    : [
        _NavItem(Icons.dashboard_rounded, 'My Progress'),
        _NavItem(Icons.school_rounded, 'My Classes'),
        _NavItem(Icons.menu_book_rounded, 'Reader'),
        _NavItem(Icons.settings_rounded, 'Settings'),
      ];
```

#### Role-Aware Colors
Bottom navigation accent colors change based on role:
- **Teachers**: Cyan (`#06B6D4`)
- **Students**: Teal (`#14B8A6`)

```dart
final accentColor = isTeacher ? AppColors.cyan500 : AppColors.teal500;
final selectedColor = isDarkMode
    ? (isTeacher ? AppColors.cyan400 : AppColors.teal400)
    : (isTeacher ? AppColors.cyan600 : AppColors.teal600);
```

---

## Color Scheme by Role

### Teacher (Cyan)
| State | Dark Mode | Light Mode |
|-------|-----------|------------|
| Banner BG | cyan-500/10 | cyan-50 |
| Banner Text | cyan-400 | cyan-600 |
| Selected Nav | cyan-400 | cyan-600 |
| Nav BG | cyan-500/15 | cyan-500/15 |

### Student (Teal)
| State | Dark Mode | Light Mode |
|-------|-----------|------------|
| Banner BG | teal-500/10 | teal-50 |
| Banner Text | teal-400 | teal-600 |
| Selected Nav | teal-400 | teal-600 |
| Nav BG | teal-500/15 | teal-500/15 |

---

## Auth Integration

The navigation reads user role from the auth provider:

```dart
final authState = ref.watch(authProvider);
final isTeacher = authState.user?.role.name == 'teacher';
```

---

## Layout Structure

```
Scaffold
├── Body
│   └── Column
│       ├── RoleBanner (top, with status bar padding)
│       └── Expanded
│           └── IndexedStack (screens)
│               ├── DashboardScreen
│               ├── ClassesScreen
│               ├── QuranReaderScreen
│               └── SettingsScreen
└── BottomNavigationBar
    └── Row of NavItems (role-aware labels/colors)
```

---

## Testing

1. Login as a Teacher account
   - Banner shows "Teacher View"
   - Tabs labeled: Dashboard, Classes, Reader, Settings
   - Cyan accent colors

2. Login as a Student account
   - Banner shows "Student View"
   - Tabs labeled: My Progress, My Classes, Reader, Settings
   - Teal accent colors

3. Toggle theme
   - Colors adapt to light/dark mode
   - Banner and nav items update correctly

---

## Future Enhancements

- **Phase 5** will differentiate dashboard content by role
- **Phase 6** will add role-specific features to Classes screen
- Role switcher (for teachers to preview student view) - deferred

---

## Next Phase

**Phase 5: Dashboard Screens** - Update Teacher and Student dashboards with role-specific content and layouts.

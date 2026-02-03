# Phase 1: Theme System Implementation

## Overview

Implemented a dual-theme system (Light + Dark mode) for the Flutter mobile app that matches the React web app's color scheme exactly.

**Completed:** Phase 1 of Flutter App Overhaul

---

## Files Created

### 1. `lib/config/app_colors.dart`
Centralized color definitions matching the web app.

```dart
class AppColors {
  // Primary Colors (Cyan/Teal gradient)
  static const Color cyan500 = Color(0xFF06B6D4);
  static const Color cyan600 = Color(0xFF0891B2);
  static const Color teal500 = Color(0xFF14B8A6);

  // Dark Theme
  static const Color darkBackground = Color(0xFF0F172A);  // slate-900
  static const Color darkSurface = Color(0xFF1E293B);     // slate-800
  static const Color darkText = Color(0xFFF1F5F9);        // slate-100

  // Light Theme
  static const Color lightBackground = Color(0xFFF8FAFC); // slate-50
  static const Color lightSurface = Color(0xFFFFFFFF);    // white
  static const Color lightText = Color(0xFF1E293B);       // slate-800

  // Theme-aware helper methods
  static Color background(bool isDark) => isDark ? darkBackground : lightBackground;
  static Color surface(bool isDark) => isDark ? darkSurface : lightSurface;
  static Color text(bool isDark) => isDark ? darkText : lightText;
  // ... more helpers
}
```

### 2. `lib/presentation/providers/theme_provider.dart`
Riverpod state management for theme with SharedPreferences persistence.

```dart
class ThemeNotifier extends StateNotifier<bool> {
  ThemeNotifier() : super(true) { _loadTheme(); }

  Future<void> toggleTheme() async {
    state = !state;
    await _saveTheme();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    final savedTheme = prefs.getString('theme_mode');
    if (savedTheme != null) state = savedTheme == 'dark';
  }

  Future<void> _saveTheme() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('theme_mode', state ? 'dark' : 'light');
  }
}

final themeProvider = StateNotifierProvider<ThemeNotifier, bool>((ref) {
  return ThemeNotifier();
});
```

---

## Files Modified

### 1. `lib/config/theme.dart`
- Added `lightTheme` getter
- Updated `darkTheme` to use Cyan primary colors (was Emerald)
- Added `ThemeExtensions` for easy access in widgets

```dart
extension ThemeExtensions on BuildContext {
  bool get isDarkMode => Theme.of(this).brightness == Brightness.dark;
  Color get backgroundColor => AppColors.background(isDarkMode);
  Color get textColor => AppColors.text(isDarkMode);
  // ... more getters
}
```

### 2. `lib/main.dart`
- Changed `QuranLogbookApp` to `ConsumerWidget`
- Watches `themeProvider` to get current theme
- Uses `ThemeMode.dark` / `ThemeMode.light` based on provider state

```dart
class QuranLogbookApp extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final isDarkMode = ref.watch(themeProvider);
    return MaterialApp(
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
    );
  }
}
```

### 3. All Screen Files Updated
Every screen was updated to be theme-aware:

| File | Changes |
|------|---------|
| `dashboard_screen.dart` | All hardcoded `AppTheme.slate*` replaced with `AppColors.*(isDarkMode)` |
| `classes_screen.dart` | Theme-aware table, headers, dialogs, empty state |
| `quran_reader_screen.dart` | Theme-aware text, legends, mistakes summary |
| `settings_screen.dart` | Added theme toggle switch in Appearance section |
| `create_class_screen.dart` | Theme-aware bottom sheet modal |
| `classroom/word_popup.dart` | Theme-aware word marking popup |

### 4. Shared Widgets Updated

| Widget | Changes |
|--------|---------|
| `glassmorphic_card.dart` | Uses `context.isDarkMode` for card colors |
| `section_badge.dart` | Theme-aware badges and tabs |

---

## Color Scheme Reference

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Primary | `#06b6d4` (cyan-500) | `#0891b2` (cyan-600) |
| Secondary | `#14b8a6` (teal-500) | `#0d9488` (teal-600) |
| Background | `#0f172a` (slate-900) | `#f8fafc` (slate-50) |
| Surface/Card | `#1e293b` (slate-800) | `#ffffff` (white) |
| Border | `#334155` (slate-700) | `#e2e8f0` (slate-200) |
| Text Primary | `#f1f5f9` (slate-100) | `#1e293b` (slate-800) |
| Text Secondary | `#94a3b8` (slate-400) | `#64748b` (slate-500) |
| Text Muted | `#64748b` (slate-500) | `#94a3b8` (slate-400) |

---

## How to Use Theme in New Components

### Option 1: In ConsumerWidget (screens)
```dart
class MyScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final isDarkMode = ref.watch(themeProvider);

    return Container(
      color: AppColors.background(isDarkMode),
      child: Text('Hello', style: TextStyle(color: AppColors.text(isDarkMode))),
    );
  }
}
```

### Option 2: In StatelessWidget (widgets)
```dart
class MyWidget extends StatelessWidget {
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode; // Uses ThemeExtensions

    return Container(
      color: AppColors.surface(isDark),
    );
  }
}
```

---

## Theme Toggle Location

The theme toggle is in **Settings Screen** under the "APPEARANCE" section:
- Shows current mode (Dark mode / Light mode)
- Toggle switch to change theme
- Persists across app restarts

---

## Testing

To verify theme system works:

1. Run the app: `flutter run`
2. Go to Settings tab
3. Toggle the theme switch
4. Navigate to other tabs (Dashboard, Classes, Reader)
5. All screens should reflect the new theme
6. Restart the app - theme preference should persist

---

## Known Issues

- `withOpacity` deprecation warnings (non-breaking, just style)
- Some unused imports (can be cleaned up later)

---

## Next Phase

**Phase 2: Supabase Auth Service** - Add authentication without replacing SQLite data layer.

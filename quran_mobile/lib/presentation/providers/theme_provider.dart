import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Key used for storing theme preference
const String _themeKey = 'theme_mode';

/// Theme state notifier that manages dark/light mode with persistence
class ThemeNotifier extends StateNotifier<bool> {
  ThemeNotifier() : super(true) {
    // Default to dark mode, then load saved preference
    _loadTheme();
  }

  /// Load theme preference from SharedPreferences
  Future<void> _loadTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedTheme = prefs.getString(_themeKey);

      if (savedTheme != null) {
        state = savedTheme == 'dark';
      }
      // If no saved preference, keep default (dark mode)
    } catch (e) {
      // On error, keep default dark mode
      print('Error loading theme preference: $e');
    }
  }

  /// Toggle between dark and light mode
  Future<void> toggleTheme() async {
    state = !state;
    await _saveTheme();
  }

  /// Set theme explicitly
  Future<void> setDarkMode(bool isDark) async {
    if (state != isDark) {
      state = isDark;
      await _saveTheme();
    }
  }

  /// Save current theme preference to SharedPreferences
  Future<void> _saveTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_themeKey, state ? 'dark' : 'light');
    } catch (e) {
      print('Error saving theme preference: $e');
    }
  }
}

/// Provider for theme state (true = dark mode, false = light mode)
final themeProvider = StateNotifierProvider<ThemeNotifier, bool>((ref) {
  return ThemeNotifier();
});

/// Convenience provider to check if dark mode is enabled
final isDarkModeProvider = Provider<bool>((ref) {
  return ref.watch(themeProvider);
});

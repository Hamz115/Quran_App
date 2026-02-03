import 'package:flutter/material.dart';

/// Centralized color definitions matching the web app.
/// All colors are defined here for consistency across the app.
class AppColors {
  AppColors._(); // Prevent instantiation

  // ============================================
  // PRIMARY COLORS (Cyan/Teal gradient)
  // ============================================
  static const Color cyan50 = Color(0xFFECFEFF);
  static const Color cyan100 = Color(0xFFCFFAFE);
  static const Color cyan200 = Color(0xFFA5F3FC);
  static const Color cyan400 = Color(0xFF22D3EE);
  static const Color cyan500 = Color(0xFF06B6D4);
  static const Color cyan600 = Color(0xFF0891B2);
  static const Color cyan700 = Color(0xFF0E7490);
  static const Color cyan900 = Color(0xFF164E63);

  static const Color teal400 = Color(0xFF2DD4BF);
  static const Color teal500 = Color(0xFF14B8A6);
  static const Color teal600 = Color(0xFF0D9488);

  // ============================================
  // ACCENT COLORS (Emerald)
  // ============================================
  static const Color emerald400 = Color(0xFF34D399);
  static const Color emerald500 = Color(0xFF10B981);
  static const Color emerald600 = Color(0xFF059669);

  // ============================================
  // SLATE COLORS (Grays)
  // ============================================
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate900 = Color(0xFF0F172A);

  // ============================================
  // MISTAKE SEVERITY COLORS
  // ============================================
  static const Color mistake1 = Color(0xFFF59E0B); // Amber - 1x
  static const Color mistake2 = Color(0xFF3B82F6); // Blue - 2x
  static const Color mistake3 = Color(0xFFF97316); // Orange - 3x
  static const Color mistake4 = Color(0xFFA855F7); // Purple - 4x
  static const Color mistake5 = Color(0xFFEF4444); // Red - 5x+

  // ============================================
  // PURPLE COLORS
  // ============================================
  static const Color purple500 = Color(0xFFA855F7);
  static const Color purple600 = Color(0xFF9333EA);

  // ============================================
  // PORTION/SECTION COLORS
  // ============================================
  static const Color hifzColor = emerald500;
  static const Color sabqiColor = cyan500;
  static const Color revisionColor = purple500;

  // ============================================
  // STATUS COLORS
  // ============================================
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);

  // ============================================
  // DARK THEME SPECIFIC
  // ============================================
  static const Color darkBackground = Color(0xFF0F172A);     // slate-900
  static const Color darkSurface = Color(0xFF1E293B);        // slate-800
  static const Color darkCard = Color(0xFF1E293B);           // slate-800
  static const Color darkBorder = Color(0xFF334155);         // slate-700
  static const Color darkInputBg = Color(0xFF252D3D);        // custom
  static const Color darkOverlay = Color(0xCC1A1F2E);        // rgba(26,31,46,0.8)
  static const Color darkText = Color(0xFFF1F5F9);           // slate-100
  static const Color darkTextSecondary = Color(0xFF94A3B8);  // slate-400
  static const Color darkTextMuted = Color(0xFF64748B);      // slate-500

  // ============================================
  // LIGHT THEME SPECIFIC
  // ============================================
  static const Color lightBackground = Color(0xFFF8FAFC);    // slate-50
  static const Color lightSurface = Color(0xFFFFFFFF);       // white
  static const Color lightCard = Color(0xFFFFFFFF);          // white
  static const Color lightBorder = Color(0xFFE2E8F0);        // slate-200
  static const Color lightInputBg = Color(0xFFF0FDFA);       // cyan-50
  static const Color lightOverlay = Color(0xB3E0F2FE);       // sky-100/70
  static const Color lightText = Color(0xFF1E293B);          // slate-800
  static const Color lightTextSecondary = Color(0xFF64748B); // slate-500
  static const Color lightTextMuted = Color(0xFF94A3B8);     // slate-400

  // ============================================
  // GRADIENT DEFINITIONS
  // ============================================
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [cyan500, teal500],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient primaryGradientHover = LinearGradient(
    colors: [cyan600, teal600],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  // ============================================
  // HELPER METHODS
  // ============================================

  /// Get mistake color based on error count
  static Color getMistakeColor(int count) {
    if (count >= 5) return mistake5;
    if (count >= 4) return mistake4;
    if (count >= 3) return mistake3;
    if (count >= 2) return mistake2;
    return mistake1;
  }

  /// Get portion/section color
  static Color getSectionColor(String type) {
    switch (type.toLowerCase()) {
      case 'hifz':
        return hifzColor;
      case 'sabqi':
        return sabqiColor;
      case 'revision':
      case 'manzil':
        return revisionColor;
      default:
        return slate400;
    }
  }

  /// Get theme-aware color
  static Color background(bool isDark) => isDark ? darkBackground : lightBackground;
  static Color surface(bool isDark) => isDark ? darkSurface : lightSurface;
  static Color card(bool isDark) => isDark ? darkCard : lightCard;
  static Color border(bool isDark) => isDark ? darkBorder : lightBorder;
  static Color inputBg(bool isDark) => isDark ? darkInputBg : lightInputBg;
  static Color text(bool isDark) => isDark ? darkText : lightText;
  static Color textSecondary(bool isDark) => isDark ? darkTextSecondary : lightTextSecondary;
  static Color textMuted(bool isDark) => isDark ? darkTextMuted : lightTextMuted;
  static Color overlay(bool isDark) => isDark ? darkOverlay : lightOverlay;

  /// Primary color adjusts slightly for light mode
  static Color primary(bool isDark) => isDark ? cyan500 : cyan600;
  static Color primaryLight(bool isDark) => isDark ? cyan400 : cyan500;
}

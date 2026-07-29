import 'package:flutter/material.dart';

/// Centralized color definitions matching the web app.
/// All colors are defined here for consistency across the app.
class AppColors {
  AppColors._(); // Prevent instantiation

  // ============================================
  // APPROVED QURANTRACK VISUAL SYSTEM
  // ============================================
  static const Color navy = Color(0xFF002E49);
  static const Color navyDeep = Color(0xFF001F35);
  static const Color navySoft = Color(0xFF0B4059);
  static const Color emerald = Color(0xFF007A5A);
  static const Color emeraldDark = Color(0xFF005E47);
  static const Color emeraldSoft = Color(0xFFE7F2EC);
  static const Color ivory = Color(0xFFFFFCF5);
  static const Color ivoryWarm = Color(0xFFF8F1E3);
  static const Color goldMuted = Color(0xFFC59432);
  static const Color goldBorder = Color(0xFFE5CFA3);
  static const Color ink = Color(0xFF10283B);
  static const Color inkMuted = Color(0xFF536678);

  // ============================================
  // PRIMARY COLORS (Cyan/Teal gradient)
  // ============================================
  static const Color cyan50 = Color(0xFFECFEFF);
  static const Color cyan100 = Color(0xFFCFFAFE);
  static const Color cyan200 = Color(0xFFA5F3FC);
  static const Color cyan400 = Color(0xFF2B9B78);
  static const Color cyan500 = emerald;
  static const Color cyan600 = emeraldDark;
  static const Color cyan700 = Color(0xFF004F3D);
  static const Color cyan900 = navySoft;

  static const Color teal400 = Color(0xFF2DD4BF);
  static const Color teal500 = emerald;
  static const Color teal600 = emeraldDark;
  static const Color teal700 = Color(0xFF004F3D);

  // ============================================
  // PREMIUM QURANTRACK PALETTE
  // ============================================
  static const Color deepTeal = navy;
  static const Color inkTeal = navyDeep;
  static const Color night = Color(0xFF001622);
  static const Color nightSurface = navyDeep;
  static const Color nightCard = navy;
  static const Color parchment = ivory;
  static const Color parchmentWarm = ivoryWarm;
  static const Color mist = Color(0xFFEAF8F6);
  static const Color porcelain = ivory;
  static const Color gold = goldMuted;
  static const Color goldSoft = Color(0xFFF4E4B8);
  static const Color rose = Color(0xFFE46F7A);

  // ============================================
  // ACCENT COLORS (Emerald)
  // ============================================
  static const Color emerald400 = Color(0xFF34D399);
  static const Color emerald500 = emerald;
  static const Color emerald600 = emeraldDark;

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
  // AMBER/YELLOW COLORS
  // ============================================
  static const Color amber500 = Color(0xFFF59E0B);
  static const Color amber600 = Color(0xFFD97706);

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
  static const Color darkBackground = night;
  static const Color darkSurface = nightSurface;
  static const Color darkCard = nightCard;
  static const Color darkBorder = Color(0xFF254249);
  static const Color darkInputBg = Color(0xFF102A30);
  static const Color darkOverlay = Color(0xCC1A1F2E); // rgba(26,31,46,0.8)
  static const Color darkText = Color(0xFFF1F5F9); // slate-100
  static const Color darkTextSecondary = Color(0xFF94A3B8); // slate-400
  static const Color darkTextMuted = Color(0xFF64748B); // slate-500

  // ============================================
  // LIGHT THEME SPECIFIC
  // ============================================
  static const Color lightBackground = ivory;
  static const Color lightSurface = Color(0xFFFFFEFA);
  static const Color lightCard = Color(0xFFFFFEFA);
  static const Color lightBorder = goldBorder;
  static const Color lightInputBg = Color(0xFFFFFDF7);
  static const Color lightOverlay = Color(0xB3E0F2FE); // sky-100/70
  static const Color lightText = ink;
  static const Color lightTextSecondary = inkMuted;
  static const Color lightTextMuted = Color(0xFF94A3B8); // slate-400

  // ============================================
  // GRADIENT DEFINITIONS
  // ============================================
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [emeraldDark, emerald],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient primaryGradientHover = LinearGradient(
    colors: [cyan700, teal700],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient premiumLightGradient = LinearGradient(
    colors: [ivory, ivory, ivoryWarm],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient premiumDarkGradient = LinearGradient(
    colors: [night, inkTeal, Color(0xFF0D1F24)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient readerLightGradient = LinearGradient(
    colors: [parchment, Color(0xFFFFF7E5), Color(0xFFF5EBCF)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient readerDarkGradient = LinearGradient(
    colors: [Color(0xFF020607), Color(0xFF071316), Color(0xFF0C171A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
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
  static Color background(bool isDark) =>
      isDark ? darkBackground : lightBackground;
  static Color surface(bool isDark) => isDark ? darkSurface : lightSurface;
  static Color card(bool isDark) => isDark ? darkCard : lightCard;
  static Color border(bool isDark) => isDark ? darkBorder : lightBorder;
  static Color inputBg(bool isDark) => isDark ? darkInputBg : lightInputBg;
  static Color text(bool isDark) => isDark ? darkText : lightText;
  static Color textSecondary(bool isDark) =>
      isDark ? darkTextSecondary : lightTextSecondary;
  static Color textMuted(bool isDark) =>
      isDark ? darkTextMuted : lightTextMuted;
  static Color overlay(bool isDark) => isDark ? darkOverlay : lightOverlay;

  /// Primary color adjusts slightly for light mode
  static Color primary(bool isDark) => isDark ? emerald500 : emerald;
  static Color primaryLight(bool isDark) => isDark ? emerald400 : emerald;
  static Color elevatedSurface(bool isDark) =>
      isDark ? const Color(0xFF18363C) : lightSurface;
  static Color softSurface(bool isDark) =>
      isDark ? navySoft : const Color(0xFFFFFAEF);
  static Color readerBackground(bool isDark) =>
      isDark ? Colors.black : parchment;
  static LinearGradient appBackgroundGradient(bool isDark) =>
      isDark ? premiumDarkGradient : premiumLightGradient;
  static LinearGradient readerGradient(bool isDark) =>
      isDark ? readerDarkGradient : readerLightGradient;
}

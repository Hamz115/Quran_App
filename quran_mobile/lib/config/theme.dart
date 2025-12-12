import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Slate colors (dark theme)
  static const Color slate900 = Color(0xFF0F172A);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate100 = Color(0xFFF1F5F9);

  // Primary colors (emerald/teal)
  static const Color emerald600 = Color(0xFF059669);
  static const Color emerald500 = Color(0xFF10B981);
  static const Color emerald400 = Color(0xFF34D399);
  static const Color teal600 = Color(0xFF0D9488);
  static const Color teal500 = Color(0xFF14B8A6);

  // Mistake severity colors
  static const Color mistake1 = Color(0xFFF59E0B); // Amber - 1x
  static const Color mistake2 = Color(0xFF3B82F6); // Blue - 2x
  static const Color mistake3 = Color(0xFFF97316); // Orange - 3x
  static const Color mistake4 = Color(0xFFA855F7); // Purple - 4x
  static const Color mistake5 = Color(0xFFEF4444); // Red - 5x+

  // Section colors
  static const Color hifzColor = emerald400;
  static const Color sabqiColor = Color(0xFF60A5FA); // Blue-400
  static const Color revisionColor = Color(0xFFC084FC); // Purple-400

  // Status colors
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: slate900,
      primaryColor: emerald500,
      colorScheme: const ColorScheme.dark(
        primary: emerald500,
        secondary: teal600,
        surface: slate800,
        error: error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: slate100,
        onError: Colors.white,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: slate400),
        titleTextStyle: TextStyle(
          color: slate100,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      cardTheme: CardThemeData(
        color: slate800.withOpacity(0.5),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: slate700.withOpacity(0.5)),
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: slate800,
        selectedItemColor: emerald400,
        unselectedItemColor: slate400,
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: emerald500,
        foregroundColor: Colors.white,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: slate800,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: slate600),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: slate600),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: emerald500, width: 2),
        ),
        labelStyle: const TextStyle(color: slate400),
        hintStyle: const TextStyle(color: slate500),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: emerald500,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: emerald400,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: slate700.withOpacity(0.5),
        thickness: 1,
      ),
      textTheme: GoogleFonts.interTextTheme(
        ThemeData.dark().textTheme,
      ).copyWith(
        headlineLarge: GoogleFonts.inter(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: slate100,
        ),
        headlineMedium: GoogleFonts.inter(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: slate100,
        ),
        titleLarge: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: slate100,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: slate200,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          color: slate300,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          color: slate400,
        ),
        labelLarge: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: slate100,
        ),
      ),
    );
  }

  // Get mistake color based on count
  static Color getMistakeColor(int count) {
    if (count >= 5) return mistake5;
    if (count >= 4) return mistake4;
    if (count >= 3) return mistake3;
    if (count >= 2) return mistake2;
    return mistake1;
  }

  // Get section color
  static Color getSectionColor(String type) {
    switch (type) {
      case 'hifz':
        return hifzColor;
      case 'sabqi':
        return sabqiColor;
      case 'revision':
        return revisionColor;
      default:
        return slate400;
    }
  }
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_colors.dart';

/// Renders the Bismillah in Amiri font.
/// Shown for surahs 2-114 except surah 9 (At-Tawbah).
class BismillahWidget extends StatelessWidget {
  final bool isDarkMode;

  const BismillahWidget({
    super.key,
    required this.isDarkMode,
  });

  /// Whether bismillah should be shown for a given surah.
  static bool shouldShow(int surahNum) {
    return surahNum != 1 && surahNum != 9;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        'بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ',
        textAlign: TextAlign.center,
        textDirection: TextDirection.rtl,
        style: GoogleFonts.amiriQuran(
          fontSize: 18,
          color: AppColors.cyan700,
        ),
      ),
    );
  }
}

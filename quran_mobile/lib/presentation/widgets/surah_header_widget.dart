import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_colors.dart';
import '../../data/quran_data.dart';

/// Displays a surah name header in styled Arabic text (Amiri font).
/// Matches the web app's surah header design.
class SurahHeaderWidget extends StatelessWidget {
  final int surahNum;
  final bool isDarkMode;

  const SurahHeaderWidget({
    super.key,
    required this.surahNum,
    required this.isDarkMode,
  });

  @override
  Widget build(BuildContext context) {
    final name = surahNamesArabic[surahNum] ?? '';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      margin: const EdgeInsets.symmetric(vertical: 2),
      decoration: BoxDecoration(
        color: AppColors.cyan50,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: AppColors.cyan200,
          width: 1,
        ),
      ),
      child: Text(
        'سُورَةُ $name',
        textAlign: TextAlign.center,
        textDirection: TextDirection.rtl,
        style: GoogleFonts.amiri(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppColors.cyan700,
        ),
      ),
    );
  }
}

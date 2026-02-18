import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/theme.dart';
import '../../../config/app_colors.dart';
import '../../../core/services/arabic_text_utils.dart' as arabic_utils;

class WordPopup extends StatelessWidget {
  final String word;
  final VoidCallback onSelectWhole;
  final Function(int charIndex, String charText) onSelectChar;

  const WordPopup({
    super.key,
    required this.word,
    required this.onSelectWhole,
    required this.onSelectChar,
  });

  @override
  Widget build(BuildContext context) {
    final parsed = _parseArabicWord(word);
    final isDarkMode = context.isDarkMode;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.surface(isDarkMode),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.textMuted(isDarkMode),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          // Word display
          Text(
            word,
            style: GoogleFonts.amiri(
              fontSize: 36,
              color: AppColors.text(isDarkMode),
            ),
            textDirection: TextDirection.rtl,
          ),
          const SizedBox(height: 20),

          // Whole word button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onSelectWhole,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.mistake1.withOpacity(0.2),
                foregroundColor: AppColors.mistake1,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: AppColors.mistake1.withOpacity(0.3)),
                ),
              ),
              child: const Text('Mark Whole Word', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 20),

          // Letters section
          if (parsed.letters.isNotEmpty) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Letters:',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary(isDarkMode)),
              ),
            ),
            const SizedBox(height: 8),
            Directionality(
              textDirection: TextDirection.rtl,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: parsed.letters.map((l) {
                  return GestureDetector(
                    onTap: () => onSelectChar(l.index, l.char),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.border(isDarkMode),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.textMuted(isDarkMode)),
                      ),
                      child: Center(
                        child: Text(
                          l.char,
                          style: GoogleFonts.amiri(
                            fontSize: 22,
                            color: AppColors.text(isDarkMode),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],

          // Harakat section
          if (parsed.harakat.isNotEmpty) ...[
            const SizedBox(height: 16),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Harakat:',
                style: TextStyle(fontSize: 13, color: AppColors.textSecondary(isDarkMode)),
              ),
            ),
            const SizedBox(height: 8),
            Directionality(
              textDirection: TextDirection.rtl,
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: parsed.harakat.map((h) {
                  return GestureDetector(
                    onTap: () => onSelectChar(h.index, h.char),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: AppColors.revisionColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.revisionColor.withOpacity(0.3)),
                      ),
                      child: Center(
                        child: Text(
                          'ـ${h.char}',
                          style: GoogleFonts.amiri(
                            fontSize: 22,
                            color: AppColors.revisionColor,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],

          const SizedBox(height: 20),

          // Cancel
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: TextStyle(color: AppColors.textSecondary(isDarkMode))),
          ),

          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
    );
  }

  arabic_utils.ParsedWord _parseArabicWord(String word) {
    return arabic_utils.parseArabicWord(word);
  }
}

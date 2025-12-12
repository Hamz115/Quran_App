import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/theme.dart';

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

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: AppTheme.slate800,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.slate600,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          // Word display
          Text(
            word,
            style: GoogleFonts.amiri(
              fontSize: 36,
              color: AppTheme.slate100,
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
                backgroundColor: AppTheme.mistake1.withOpacity(0.2),
                foregroundColor: AppTheme.mistake1,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: AppTheme.mistake1.withOpacity(0.3)),
                ),
              ),
              child: const Text('Mark Whole Word', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 20),

          // Letters section
          if (parsed.letters.isNotEmpty) ...[
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Letters:',
                style: TextStyle(fontSize: 13, color: AppTheme.slate400),
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
                        color: AppTheme.slate700,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.slate600),
                      ),
                      child: Center(
                        child: Text(
                          l.char,
                          style: GoogleFonts.amiri(
                            fontSize: 22,
                            color: AppTheme.slate200,
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
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Harakat:',
                style: TextStyle(fontSize: 13, color: AppTheme.slate400),
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
                        color: AppTheme.revisionColor.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.revisionColor.withOpacity(0.3)),
                      ),
                      child: Center(
                        child: Text(
                          'ـ${h.char}',
                          style: GoogleFonts.amiri(
                            fontSize: 22,
                            color: AppTheme.revisionColor,
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
            child: const Text('Cancel', style: TextStyle(color: AppTheme.slate400)),
          ),

          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ],
      ),
    );
  }

  ParsedWord _parseArabicWord(String word) {
    final letters = <CharInfo>[];
    final harakat = <CharInfo>[];

    // Arabic harakat unicode range
    const harakatCodes = [
      0x064B, 0x064C, 0x064D, 0x064E, 0x064F, 0x0650, 0x0651, 0x0652,
      0x0653, 0x0654, 0x0655, 0x0656, 0x0657, 0x0658, 0x0670,
    ];

    for (int i = 0; i < word.length; i++) {
      final char = word[i];
      final code = char.codeUnitAt(0);

      if (harakatCodes.contains(code)) {
        harakat.add(CharInfo(char: char, index: i));
      } else {
        letters.add(CharInfo(char: char, index: i));
      }
    }

    return ParsedWord(letters: letters, harakat: harakat);
  }
}

class CharInfo {
  final String char;
  final int index;

  const CharInfo({required this.char, required this.index});
}

class ParsedWord {
  final List<CharInfo> letters;
  final List<CharInfo> harakat;

  const ParsedWord({required this.letters, required this.harakat});
}

/// Shared Arabic text utilities for parsing words into letters and harakat.
/// Used by both word_popup.dart (mistake selection) and mushaf_page_widget.dart (char-level rendering).

/// Information about a single character in an Arabic word.
class CharInfo {
  final String char;
  final int index;

  const CharInfo({required this.char, required this.index});
}

/// Result of parsing an Arabic word into letters and harakat.
class ParsedWord {
  final List<CharInfo> letters;
  final List<CharInfo> harakat;

  const ParsedWord({required this.letters, required this.harakat});
}

/// Arabic harakat Unicode code points.
const List<int> harakatCodes = [
  0x064B, // Fathatan
  0x064C, // Dammatan
  0x064D, // Kasratan
  0x064E, // Fathah
  0x064F, // Dammah
  0x0650, // Kasrah
  0x0651, // Shaddah
  0x0652, // Sukun
  0x0653, // Maddah
  0x0654, // Hamza above
  0x0655, // Hamza below
  0x0656, // Subscript alef
  0x0657, // Inverted damma
  0x0658, // Mark noon ghunna
  0x0659, // Zwarakay
  0x065A, // Vowel sign small v above
  0x065B, // Inverted small v above
  0x065C, // Vowel sign dot below
  0x065D, // Reversed damma
  0x065E, // Fatha with two dots
  0x0670, // Superscript alef
];

/// Check if a character is an Arabic haraka (diacritical mark).
bool isHaraka(String char) {
  if (char.isEmpty) return false;
  return harakatCodes.contains(char.codeUnitAt(0));
}

/// Parse an Arabic word into separate letters and harakat lists.
/// Combines shadda + following haraka into a single entry (matches web behavior).
ParsedWord parseArabicWord(String word) {
  const shadda = 0x0651;
  final letters = <CharInfo>[];
  final harakat = <CharInfo>[];

  for (int i = 0; i < word.length; i++) {
    final char = word[i];
    if (isHaraka(char)) {
      // Combine shadda + following haraka into one entry
      if (char.codeUnitAt(0) == shadda &&
          i + 1 < word.length &&
          isHaraka(word[i + 1])) {
        final combined = char + word[i + 1];
        harakat.add(CharInfo(char: combined, index: i));
        i++; // skip next character (already combined)
      } else if (i > 0 && word[i - 1].codeUnitAt(0) == shadda && isHaraka(word[i - 1])) {
        // Already combined with previous shadda — skip
        continue;
      } else {
        harakat.add(CharInfo(char: char, index: i));
      }
    } else {
      letters.add(CharInfo(char: char, index: i));
    }
  }

  return ParsedWord(letters: letters, harakat: harakat);
}

/// A grouped character: a base letter with its following harakat.
/// Used for character-level mistake rendering.
class CharGroup {
  final int baseIndex;
  final String base;
  final List<({String char, int index})> harakat;

  CharGroup({
    required this.baseIndex,
    required this.base,
    required this.harakat,
  });
}

/// Group characters in an Arabic word: each base letter with its following harakat.
/// This is used for rendering character-level mistakes where we need to color
/// individual letters or harakat differently.
/// Combines shadda + following haraka into a single entry (matches web behavior).
List<CharGroup> groupArabicCharacters(String text) {
  const shadda = 0x0651;
  final groups = <CharGroup>[];
  CharGroup? currentGroup;

  for (int i = 0; i < text.length; i++) {
    final char = text[i];
    if (isHaraka(char)) {
      // Add haraka to current group
      if (currentGroup != null) {
        // Combine shadda + following haraka into one entry
        if (char.codeUnitAt(0) == shadda &&
            i + 1 < text.length &&
            isHaraka(text[i + 1])) {
          final combined = char + text[i + 1];
          currentGroup.harakat.add((char: combined, index: i));
          i++; // skip next character (already combined)
        } else if (i > 0 && text[i - 1].codeUnitAt(0) == shadda) {
          // Already combined with previous shadda — skip
          continue;
        } else {
          currentGroup.harakat.add((char: char, index: i));
        }
      }
    } else {
      // Start new group with this letter
      currentGroup = CharGroup(
        baseIndex: i,
        base: char,
        harakat: [],
      );
      groups.add(currentGroup);
    }
  }

  return groups;
}

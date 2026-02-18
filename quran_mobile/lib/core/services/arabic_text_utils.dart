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
  0x0670, // Superscript alef
];

/// Check if a character is an Arabic haraka (diacritical mark).
bool isHaraka(String char) {
  if (char.isEmpty) return false;
  return harakatCodes.contains(char.codeUnitAt(0));
}

/// Parse an Arabic word into separate letters and harakat lists.
ParsedWord parseArabicWord(String word) {
  final letters = <CharInfo>[];
  final harakat = <CharInfo>[];

  for (int i = 0; i < word.length; i++) {
    final char = word[i];
    if (isHaraka(char)) {
      harakat.add(CharInfo(char: char, index: i));
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
List<CharGroup> groupArabicCharacters(String text) {
  final groups = <CharGroup>[];
  CharGroup? currentGroup;

  for (int i = 0; i < text.length; i++) {
    final char = text[i];
    if (isHaraka(char)) {
      // Add haraka to current group
      if (currentGroup != null) {
        currentGroup.harakat.add((char: char, index: i));
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

# Flutter Character-Level Mistake Highlighting — Alignment with Web

> **Feature covered:** Character-level mistake highlighting polish (3 gaps)
> **Platform:** Flutter (`quran_mobile/`)
> **Created:** 2026-02-19

---

## Overview

The character-level mistake highlighting feature is **already mostly implemented** in Flutter. Three specific gaps remain that cause visual differences between the web and Flutter rendering.

### What Already Works

- **`mushaf_page_widget.dart:105-289`** — Switches from QPC glyph rendering to Uthmani+Amiri font when character-level mistakes are present
- **`arabic_text_utils.dart`** — `parseArabicWord()` splits Arabic text into letters and harakat; `groupArabicCharacters()` groups base letters with following harakat
- **`word_popup.dart`** — Offers letter/haraka selection for marking character-level mistakes
- **`section_badge.dart:128-196`** — `MistakeBadge` shows `word_text` in Amiri font (matches web)
- **`mushaf_page_widget.dart:197-289`** — `_buildCharLevelWord()` renders individual character colors using `RichText` with `TextSpan` children

---

## Gap 1: Missing Harakat Codes

### Problem

Flutter's `arabic_text_utils.dart:21-37` defines 15 harakat codes but is **missing 6** that the web includes.

**Flutter (`arabic_text_utils.dart:21-37`) — 15 codes:**
```dart
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
```

**Web (`Classroom.tsx:96-100`) — 21 codes:**
```typescript
const HARAKAT = [
  '\u064B', '\u064C', '\u064D', '\u064E', '\u064F', '\u0650', '\u0651', '\u0652',
  '\u0653', '\u0654', '\u0655', '\u0656', '\u0657', '\u0658', '\u0659', '\u065A',
  '\u065B', '\u065C', '\u065D', '\u065E', '\u0670',
];
```

**Missing 6 codes:**
| Code | Unicode | Name |
|------|---------|------|
| `0x0659` | `\u0659` | Zwarakay (Pashto) |
| `0x065A` | `\u065A` | Vowel sign small v above |
| `0x065B` | `\u065B` | Inverted small v above |
| `0x065C` | `\u065C` | Vowel sign dot below |
| `0x065D` | `\u065D` | Reversed damma |
| `0x065E` | `\u065E` | Fatha with two dots |

While these are uncommon in standard Quranic text, including them ensures parity with the web and handles any edge cases in Quranic annotation marks.

### Fix

In `arabic_text_utils.dart:21-37`, add the 6 missing codes:

```dart
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
```

**File:** `lib/core/services/arabic_text_utils.dart:21-37`

---

## Gap 2: Shadda Combination Logic

### Problem

The web's `splitArabicWord` (`Classroom.tsx:104-130`) **combines shadda with the following haraka** into a single entry. Flutter's `parseArabicWord` (`arabic_text_utils.dart:46-60`) does **not** — it treats shadda and the following haraka as separate entries.

**Web implementation (`Classroom.tsx:110-123`):**
```typescript
for (let i = 0; i < word.length; i++) {
  const char = word[i];
  if (isHaraka(char)) {
    if (char === SHADDA && i + 1 < word.length && isHaraka(word[i + 1])) {
      // Combine shadda + following haraka into one entry
      const combined = char + word[i + 1];
      harakat.push({ char: combined, index: i, display: combined });
      i++; // skip next character
    } else if (i > 0 && word[i - 1] === SHADDA) {
      // Already combined with previous shadda — skip
    } else {
      harakat.push({ char, index: i, display: char });
    }
  } else {
    letters.push({ char, index: i });
  }
}
```

**Flutter implementation (`arabic_text_utils.dart:46-60`):**
```dart
ParsedWord parseArabicWord(String word) {
  final letters = <CharInfo>[];
  final harakat = <CharInfo>[];

  for (int i = 0; i < word.length; i++) {
    final char = word[i];
    if (isHaraka(char)) {
      harakat.add(CharInfo(char: char, index: i));  // No shadda combo logic
    } else {
      letters.add(CharInfo(char: char, index: i));
    }
  }

  return ParsedWord(letters: letters, harakat: harakat);
}
```

### Why This Matters

When a user marks a "shadda + fatha" combination as a mistake, the web treats it as a single selectable unit. Without this logic in Flutter, the shadda and fatha appear as separate items in the word popup and render separately in the mistake highlighting — causing inconsistent behavior between platforms.

### Fix

Update `parseArabicWord` in `arabic_text_utils.dart`:

```dart
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
```

Also update `groupArabicCharacters` in the same file to handle combined shadda entries:

```dart
List<CharGroup> groupArabicCharacters(String text) {
  const shadda = 0x0651;
  final groups = <CharGroup>[];
  CharGroup? currentGroup;

  for (int i = 0; i < text.length; i++) {
    final char = text[i];
    if (isHaraka(char)) {
      if (currentGroup != null) {
        // Combine shadda + following haraka
        if (char.codeUnitAt(0) == shadda &&
            i + 1 < text.length &&
            isHaraka(text[i + 1])) {
          final combined = char + text[i + 1];
          currentGroup.harakat.add((char: combined, index: i));
          i++; // skip next character
        } else if (i > 0 && text[i - 1].codeUnitAt(0) == shadda) {
          // Already combined — skip
          continue;
        } else {
          currentGroup.harakat.add((char: char, index: i));
        }
      }
    } else {
      currentGroup = CharGroup(baseIndex: i, base: char, harakat: []);
      groups.add(currentGroup);
    }
  }

  return groups;
}
```

**File:** `lib/core/services/arabic_text_utils.dart`

---

## Gap 3: Haraka Glow Effect

### Problem

The web uses a dramatic visual effect for haraka mistakes — CSS `text-shadow` glow + enlarged font size + bold weight. Flutter just changes the `TextStyle.color` with no visual emphasis.

**Web rendering (in `Classroom.tsx` inline styles for haraka mistakes):**
- `text-shadow: 0 0 8px <color>, 0 0 16px <color>` — glow effect
- `font-size: 1.3em` — 30% larger than surrounding text
- `font-weight: bold`

**Flutter rendering (`mushaf_page_widget.dart:223-226`):**
```dart
children.add(TextSpan(
  text: h.char,
  style: TextStyle(color: AppColors.getMistakeColor(level)),
  // No shadow, no size increase, no bold
));
```

### Fix

Update the haraka mistake `TextSpan` in `mushaf_page_widget.dart:223-226`:

```dart
children.add(TextSpan(
  text: h.char,
  style: TextStyle(
    color: AppColors.getMistakeColor(level),
    fontSize: 26,  // ~1.3 * 20 (Amiri base size)
    fontWeight: FontWeight.bold,
    shadows: [
      Shadow(
        color: AppColors.getMistakeColor(level).withOpacity(0.6),
        blurRadius: 8,
      ),
      Shadow(
        color: AppColors.getMistakeColor(level).withOpacity(0.3),
        blurRadius: 16,
      ),
    ],
  ),
));
```

This adds:
1. **Glow effect** via `Shadow` (equivalent to CSS `text-shadow`)
2. **Enlarged size** via `fontSize: 26` (1.3x the Amiri base of 20)
3. **Bold weight** via `fontWeight: FontWeight.bold`

**File:** `lib/presentation/widgets/mushaf_page_widget.dart:223-226`

---

## Summary of Changes

| File | Gap | Change |
|------|-----|--------|
| `lib/core/services/arabic_text_utils.dart:21-37` | Gap 1 | Add 6 missing harakat codes (0x0659-0x065E) |
| `lib/core/services/arabic_text_utils.dart:46-60` | Gap 2 | Add shadda combination logic to `parseArabicWord` |
| `lib/core/services/arabic_text_utils.dart:79-102` | Gap 2 | Add shadda combination logic to `groupArabicCharacters` |
| `lib/presentation/widgets/mushaf_page_widget.dart:223-226` | Gap 3 | Add `Shadow`, `fontSize: 26`, `fontWeight: FontWeight.bold` for haraka mistakes |

---

## Testing

1. **Gap 1:** Find a word with an uncommon haraka (e.g., a word containing U+0659). Verify it's recognized as a haraka (not a letter) in the word popup.
2. **Gap 2:** Mark a shadda+fatha combination as a mistake. Verify it appears as a single unit in the word popup and renders as one highlighted piece (not two separate marks).
3. **Gap 3:** Mark a haraka as a mistake. Verify it renders with a visible glow effect, slightly larger font, and bold weight — matching the web's visual prominence.

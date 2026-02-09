# Flutter Quran Rendering Reference

**Date**: 9 February 2026
**Purpose**: Document how the Flutter app renders QPC Quran pages — the gold standard the web app should match.

---

## Layout Architecture

```
Scaffold
└── Column (mainAxisAlignment: spaceBetween)
    ├── Line 0: Expanded
    │   └── FittedBox(fit: BoxFit.scaleDown)
    │       └── Row(mainAxisAlignment: center, textDirection: rtl)
    │           └── Text(word.codeV1, style: ...)
    ├── Line 1: Expanded → FittedBox → Row → Text...
    ├── ...
    └── Line 14: Expanded → FittedBox → Row → Text...
```

### Key layout decisions:

1. **`Column(mainAxisAlignment: spaceBetween)`** — Lines are evenly distributed across the page height
2. **`Expanded` per line** — Each line gets equal vertical space (15 lines → 1/15 each)
3. **`FittedBox(fit: BoxFit.scaleDown)`** — Only scales DOWN, never up

---

## FittedBox scaleDown Behavior

This is the single most important rendering decision.

```dart
FittedBox(
  fit: BoxFit.scaleDown,  // ← KEY
  child: Row(children: words),
)
```

**What `scaleDown` does:**
- If the Row is **wider** than the Expanded container → shrinks uniformly to fit
- If the Row is **narrower** than the container → stays at natural size, centered
- It **never** scales up — text is never bigger than `fontSize: 24`

**Why this matters:**
- QPC fonts are designed for a specific size. Scaling UP distorts glyphs and causes blur
- Scaling DOWN preserves glyph quality (fewer pixels, but proportions stay correct)
- Short surahs (e.g., Al-Kawthar with 3 ayahs) never get enlarged to fill the page width

---

## Font Configuration

```dart
TextStyle(
  fontFamily: 'QPC-Page-$pageNumber',
  fontSize: 24,
  height: 1.8,           // line-height multiplier
  color: Color(0xFF1E293B), // slate-800
)
```

- **fontSize: 24** — Fixed, never changes based on screen size
- **height: 1.8** — Line height multiplier (actual line height = 24 * 1.8 = 43.2px)
- **fontFamily** — Each page (1-604) has its own QPC font file with page-specific glyph codes

---

## Surah Header

```dart
Container(
  width: double.infinity,
  padding: EdgeInsets.symmetric(horizontal: 24, vertical: 4),
  decoration: BoxDecoration(
    color: Color(0xFFECFDF5),      // cyan-50/green-50
    border: Border.all(color: Color(0xFFA7F3D0)), // cyan-200
    borderRadius: BorderRadius.circular(8),
  ),
  child: Text(
    'سُورَةُ $surahName',
    textAlign: TextAlign.center,
    style: TextStyle(
      fontFamily: 'Amiri',
      fontSize: 18,
      fontWeight: FontWeight.bold,
      color: Color(0xFF155E75),     // cyan-800
    ),
  ),
)
```

---

## Bismillah

```dart
Text(
  'بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ',
  textAlign: TextAlign.center,
  style: TextStyle(
    fontFamily: 'Amiri Quran',
    fontSize: 18,
    color: Color(0xFF0E7490),       // cyan-700
  ),
)
```

**Rules:**
- Surah 1 (Al-Fatihah): Bismillah is ayah 1, rendered as QPC text (no separate display)
- Surah 9 (At-Tawbah): No bismillah
- Surahs 2-114 (except 9): Show bismillah above the first line

---

## Page 586 Overflow Handling

Page 586 contains overflow ayahs where glyph codes are `>= 0xFC00`. These glyphs belong to the **previous page's font** (page 585).

```dart
// Check if glyph needs previous page font
final glyphCode = word.codeV1.codeUnitAt(0);
final needsPrevFont = pageNumber == 586 && glyphCode >= 0xFC00;
final fontFamily = needsPrevFont ? 'QPC-Page-585' : 'QPC-Page-586';
```

---

## Mistake Highlighting

Words with mistakes get colored backgrounds based on error count:

| Error Count | Level | Color |
|-------------|-------|-------|
| 1 | Level 1 | Light yellow |
| 2 | Level 2 | Orange |
| 3 | Level 3 | Light red |
| 4 | Level 4 | Red |
| 5+ | Level 5 | Dark red |

Ayah end markers (`charType: 'end'`) are rendered in cyan-700, not highlighted for mistakes.

---

## Why This Approach Works

1. **Consistent text quality**: Text is always at or below its designed size — never stretched beyond what the font was designed for
2. **No distortion on short surahs**: Pages 598-604 have short surahs. Without `scaleDown`, the FittedBox would enlarge 2-3 word lines to fill the entire width, making them enormous and blurry
3. **Uniform rendering**: Every page looks the same — full lines fill edge-to-edge (scaled down slightly), short lines stay centered at natural size
4. **Mobile-friendly**: The fixed font size + scaleDown approach works at any screen size. The FittedBox handles all the responsive scaling automatically

---

## Web App Equivalent

The web app matches this with:

| Flutter | Web |
|---------|-----|
| `FittedBox(fit: BoxFit.scaleDown)` | `FittedLine` with `Math.min(1.0, containerWidth / contentWidth)` |
| `fontSize: 24` | `fontSize: 28px` (desktop) / `pageDims.height / 18` (mobile) |
| `height: 1.8` | `lineHeight: 1.8` |
| `Expanded` per line | `flex: 1` per line |
| `Column(spaceBetween)` | `flex-col justify-between` |
| `Row(center, rtl)` | `display: flex, whiteSpace: nowrap, margin: 0 auto` |

The web uses a slightly larger base font size (28px vs 24px) because CSS rendering is different from Flutter's, but the principle is the same: set a base size that makes most lines wider than the container, then scale down to fit.

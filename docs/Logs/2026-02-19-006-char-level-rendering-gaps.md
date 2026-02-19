# Session Log: Character-Level Mistake Rendering — Web vs Flutter Gaps

**Date:** 2026-02-19
**Session:** 006

## Objective

Document visual differences between web and Flutter character-level mistake rendering (same page, same mistakes — Surah Al-Mulk).

## Differences Found

### 1. Amiri words too small/narrow in Flutter
- Flutter `fontSize: 20` vs QPC `fontSize: 24` creates too much size gap
- Web uses `fontSize: 0.85em` + `letterSpacing: 0.02em` — proportions work out better
- Most visible on "سَمَـٰوَٰتٍ" (line 5) and "فَوۡجٌ" (line 11)

### 2. Vertical misalignment
- Web applies `position: relative; top: -0.3em` to shift Amiri text upward to align with QPC baseline
- Flutter has NO such offset — Amiri text sits at its natural position, misaligned with surrounding QPC words

### 3. Line compression / spacing breaks
- FittedBox scales entire line, so when one word switches from QPC to Amiri (different natural width), the whole line's spacing changes
- Lines with char-level mistakes look squeezed or unevenly spaced vs web where lines stay uniform

### 4. Letter highlight WidgetSpan boxing
- Web: letter-level mistake gets a subtle gradient background on just the letter group — blends in naturally
- Flutter: WidgetSpan Container creates a visible "box" that doesn't flow as naturally within RichText

### 5. Line height / breathing room
- Web has more vertical space between lines
- Flutter lines are tighter, making the Amiri size difference more jarring

### 6. Whole-word highlights look OK
- QPC glyph + gradient background approach is consistent between web and Flutter — no issue here

## Key Web CSS Reference (to match)

```css
/* Web's char-level word container */
font-family: 'Amiri';
font-size: 0.85em;
font-weight: 400;
letter-spacing: 0.02em;
line-height: 1;
position: relative;
top: -0.3em;
```

```css
/* Web's letter-mistake highlight */
.letter-mistake-N {
  background: linear-gradient(...);
  border-bottom: 2px solid <color>;
  border-radius: 4px;
  padding: 0 2px;
}
```

```css
/* Web's haraka-mistake glow */
.haraka-mistake-N {
  color: <bright-color>;
  font-size: 1.3em;
  font-weight: bold;
  text-shadow: 0 0 3px #fff, 0 0 6px <color>, 0 0 10px <color>, 0 0 15px <darker>, 0 0 20px <darker>;
}
```

## Files Involved

| File | What needs fixing |
|------|-------------------|
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | `_buildCharLevelWord` — adjust fontSize, add vertical offset, fix WidgetSpan proportions |

## Status

Documented only — no code changes made yet.

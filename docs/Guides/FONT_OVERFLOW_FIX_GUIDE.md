# QPC Font & Page Layout Fix Guide

## Overview

This guide documents ALL fixes applied to the Quran page display system. There are THREE types of problems that have been addressed:

1. **Line Number Issue** - Ayah appears at wrong vertical position (top vs bottom)
2. **Font Overflow Issue** - Ayah shows as boxes because it uses the previous page's font glyphs
3. **Text Clipping Issue** - Text gets cut off at the edges of the page container

---

## Problem 1: Line Number Issue

### Symptom
An ayah appears at the **wrong vertical position** on the page (e.g., at the bottom instead of the top, or vice versa).

### Cause
The `l` (line number) field in the JSON controls vertical positioning:
- Lower numbers = top of page (1-3)
- Higher numbers = bottom of page (14-18)
- Using `0` places content at the very top

### Solution
Change the line number for all words in that ayah using Python:

```python
import json

PAGE_NUMBER = 584
SURAH = 79  # Optional: filter by surah
AYAH_TO_FIX = 16
NEW_LINE_NUMBER = 0  # 0 = very top of page

file_path = f'page_{PAGE_NUMBER}.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for word in data:
    if word.get('a') == AYAH_TO_FIX:
        # Optionally filter by surah too
        # if word.get('s') == SURAH:
        word['l'] = NEW_LINE_NUMBER

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
```

### Pattern: Moving Overflow Lines to Bottom

Many pages have ayahs at the top (lines 1-3) that should be at the bottom. The standard fix:
- Line 1 → Line 16
- Line 2 → Line 17
- Line 3 → Line 18

```python
import json

PAGE_NUMBER = 597
file_path = f'page_{PAGE_NUMBER}.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Map old lines to new lines
line_mapping = {1: 16, 2: 17, 3: 18}

for word in data:
    if word['l'] in line_mapping:
        word['l'] = line_mapping[word['l']]

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)
```

---

## Problem 2: Font Overflow Issue

### Symptom
Ayahs appear as **boxes (□□□□)** or don't render at all, even though the JSON data is correct.

### Cause
QPC fonts are **page-specific**. Each page has its own font file with glyphs at specific Unicode positions:
- Normal range: `0xFB51` to ~`0xFBFF`
- Extended range: `0xFC00` to ~`0xFC20`

Sometimes, ayahs that "overflow" from a previous page have glyph codes that belong to the **previous page's font**, not the current page's font.

### Solution (Frontend Fix in QuranReader.tsx)

#### 1. Load both current AND previous page fonts:

```javascript
useEffect(() => {
  const paddedPage = currentPage.toString().padStart(3, '0');
  const paddedPrevPage = (currentPage - 1).toString().padStart(3, '0');

  // Add current page font
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'QPC-Page-${currentPage}';
      src: url('/fonts/qpc/QCF_P${paddedPage}.woff2') format('woff2');
      font-display: swap;
    }
  `;
  document.head.appendChild(style);

  // Add previous page font for overflow glyphs
  if (currentPage > 1) {
    const prevStyle = document.createElement('style');
    prevStyle.textContent = `
      @font-face {
        font-family: 'QPC-Page-${currentPage - 1}';
        src: url('/fonts/qpc/QCF_P${paddedPrevPage}.woff2') format('woff2');
        font-display: swap;
      }
    `;
    document.head.appendChild(prevStyle);
  }
}, [currentPage]);
```

#### 2. Detect overflow glyphs and use correct font:

```javascript
{words.map((word) => {
  const glyphCode = word.codeV1.charCodeAt(0);
  // Glyphs > 0xFC18 are overflow from previous page
  const usesPrevPageFont = glyphCode > 0xFC18;
  const fontFamily = usesPrevPageFont
    ? `'QPC-Page-${currentPage - 1}', 'Amiri Quran', serif`
    : undefined; // inherit from parent

  return (
    <span
      key={word.id}
      style={fontFamily ? { fontFamily } : undefined}
    >
      {word.codeV1}
    </span>
  );
})}
```

---

## Problem 3: Text Clipping Issue

### Symptom
Text gets **cut off at the edges** of the page - first letters on the left and ayah numbers on the right appear partially or fully clipped.

### Cause
1. CSS `overflow: hidden` on multiple container levels
2. Font size too large for lines with many words
3. Container `max-width` too restrictive

### Solution

#### 1. CSS Changes (index.css)

Changed `overflow: hidden` to `overflow: visible`:

```css
.mushaf-page {
  position: relative;
  background: #fffef8;
  max-width: 560px;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: visible;  /* Changed from hidden */
}

/* Allow text to display fully without clipping */
.mushaf-page [dir="rtl"] {
  overflow: visible;  /* Changed from hidden */
}

.mushaf-page [dir="rtl"] > div {
  overflow: visible;  /* Changed from hidden */
}
```

#### 2. JSX Changes (QuranReader.tsx)

Removed `overflow-hidden` class from mushaf-page container:

```jsx
// Before
className="bg-[#FEF9E7] rounded-lg overflow-hidden px-3 py-4 md:px-4 md:py-6 mushaf-page"

// After
className="bg-[#FEF9E7] rounded-lg px-3 py-4 md:px-4 md:py-6 mushaf-page"
```

#### 3. Font Size Adjustment

Reduced max font size to prevent overflow on lines with many words:

```jsx
// Before
fontSize: 'clamp(14px, 3.5vw, 26px)'

// After
fontSize: 'clamp(14px, 3.2vw, 24px)'
```

---

## All Page Fixes Applied

### Line Number Fixes

| Page | Surah | Ayahs | Original Line(s) | Fixed Line(s) | Issue |
|------|-------|-------|------------------|---------------|-------|
| 534 | 55 | 68-69 | l:15 (bottom) | l:0 (top) | Ayahs appeared at bottom instead of top |
| 568 | 69 | 35 | l:15 (bottom) | l:0 (top) | Ayah appeared at bottom instead of top |
| 570 | 70 | 40 | l:15 (bottom) | l:0 (top) | Ayah appeared at bottom instead of top |
| 576 | 74 | 18 | l:15 (bottom) | l:0 (top) | Ayah appeared at bottom instead of top |
| 584 | 79 | 16 | l:15 (bottom) | l:0 (top) | Ayah appeared at bottom instead of top |
| 587 | 83 | 5-6 | l:1-2 (top) | l:16-17 (bottom) | Ayahs at top should be at bottom |
| 588 | 83 | 34 | l:1-2 (top) | l:16-17 (bottom) | Overflow ayahs moved to bottom |
| 588 | 83 | 7 | - | l:1 (top) | Kept ayah 7 complete on line 1 |
| 588 | 83 | 8 | l:1 | l:2 | Moved ayah 8 words to line 2 |
| 589 | 84 | 25 | l:1-2 (top) | l:16-17 (bottom) | Overflow ayahs moved to bottom |
| 589 | - | single word | l:1 | l:2 | Combined single word with next line |
| 591 | 87 | 11-15 | l:1-2 (top) | l:16-17 (bottom) | Overflow ayahs moved to bottom |
| 592 | 88 | 23-26 | l:1-2 (top) | l:16-17 (bottom) | Overflow ayahs moved to bottom |
| 593 | 89 | 23 | l:1-2 (top) | l:16-17 (bottom) | Overflow ayahs moved to bottom |
| 594 | 90 | 19-20 | l:1-2 (top) | l:16-17 (bottom) | Only these ayahs to bottom |
| 594 | 89 | 24 | l:17 (bottom) | l:2 (top) | Restored to top (was incorrectly moved) |
| 595 | 92 | 14 | l:1-2 (top) | l:16-17 (bottom) | Overflow ayahs moved to bottom |
| 596 | 94 | 3-8 | l:1-3 (top) | l:16-18 (bottom) | Overflow ayahs moved to bottom |
| 596 | 92 | 15-17 | l:16-18 (bottom) | l:1-3 (top) | Restored to top |
| 597 | - | lines 1-3 | l:1-3 (top) | l:16-18 (bottom) | 3 lines moved to bottom |
| 598 | - | lines 1-3 | l:1-3 (top) | l:16-18 (bottom) | 3 lines moved to bottom |
| 599 | 100 | 6-9 | l:1-2 (top) | l:16-17 (bottom) | Overflow ayahs moved to bottom |
| 599 | - | single word | l:3 | l:4 | Combined single word with next line |

### Font Overflow Fix

| Page | Ayahs Affected | Issue | Fix Location |
|------|----------------|-------|--------------|
| 586 | 41-42 (Surah 80) | Glyphs > 0xFC18 using wrong font | QuranReader.tsx - loads previous page font |

### CSS/Display Fixes

| File | Change | Purpose |
|------|--------|---------|
| index.css | `overflow: visible` on .mushaf-page | Prevent text clipping |
| index.css | `overflow: visible` on [dir="rtl"] containers | Prevent text clipping |
| index.css | `max-width: 620px` on .mushaf-page | Page container width |
| QuranReader.tsx | Removed `overflow-hidden` class | Prevent text clipping |
| QuranReader.tsx | Content padding `5% 3%` | Top/bottom and left/right spacing |
| QuranReader.tsx | Aspect ratio `3/4` | Page proportions |

### Font Size by Page Range

| Page Range | Font Size | Reason |
|------------|-----------|--------|
| 1-594 | `clamp(16px, 3.5vw, 28px)` | Default size for most pages |
| 595-599 | `clamp(14px, 3vw, 24px)` | Smaller for pages with more content |
| 600-604 | `clamp(12px, 2.6vw, 21px)` | Smallest for final pages with dense text |

### Decorative Border

| File | Change | Purpose |
|------|--------|---------|
| QuranReader.tsx | Import `BorderImage` from assets | Decorative Quran page frame |
| QuranReader.tsx | Border overlay with `z-index: 2` | Sits on top of content |
| src/assets/Border.png | Transparent PNG border image | Custom decorative frame |

---

## JSON Data Structure Reference

```json
{
  "id": 42285,      // Unique word ID
  "s": 80,          // Surah number
  "a": 41,          // Ayah number
  "p": 1,           // Word position in ayah
  "t": "تَرْهَقُهَا",   // Arabic text (display reference)
  "c1": "ﰙ",        // QPC glyph code v1 (used for rendering)
  "c2": "ﱁ",        // QPC glyph code v2 (alternative)
  "l": 1,           // Line number (1-15, or 0 for top, 16-18 for bottom overflow)
  "ct": "word"      // Type: "word" or "end" (ayah marker)
}
```

### Key Fields:
- **`l` (line)**: Controls vertical position. Lower = higher on page. Use 16-18 for bottom overflow lines.
- **`c1` (glyph)**: The Unicode character that maps to the QPC font glyph.
- **`s` (surah)**: Surah number - important when multiple surahs on same page.

---

## How to Diagnose Issues

### Check what's on each line of a page:

```python
import json
from collections import Counter

PAGE = 599

with open(f'page_{PAGE}.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

line_counts = Counter(w['l'] for w in data)
print(f'Page {PAGE} - Words per line:')
for line, count in sorted(line_counts.items()):
    words_on_line = [w for w in data if w['l'] == line]
    surahs = set(w['s'] for w in words_on_line)
    ayahs = set(w['a'] for w in words_on_line)
    print(f'  Line {line}: {count} words - Surah(s) {surahs}, Ayah(s) {ayahs}')
```

### Check for overflow glyphs:

```python
import json

PAGE = 586

with open(f'page_{PAGE}.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Check for overflow glyphs (> 0xFC18)
overflow = [w for w in data if ord(w['c1'][0]) > 0xFC18]
if overflow:
    print(f"Overflow glyphs: {len(overflow)} words")
    print(f"Ayahs affected: {set(w['a'] for w in overflow)}")
    for w in overflow[:5]:
        print(f"  Surah {w['s']}, Ayah {w['a']}: {w['t']} (0x{ord(w['c1'][0]):04X})")
else:
    print("No overflow glyphs found")
```

### Check glyph code ranges across pages:

```python
import json

for page_num in range(585, 590):
    with open(f'page_{page_num}.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    c1_codes = [ord(w['c1'][0]) for w in data]
    print(f"Page {page_num}: {hex(min(c1_codes))} to {hex(max(c1_codes))}")
```

---

## Important Notes

1. **Never move words between pages** - The glyph codes (`c1`) are page-specific and won't render correctly on a different page.

2. **The `0xFC18` threshold** - Any glyph > 0xFC18 belongs to the previous page's font. This is based on data analysis.

3. **Two fonts per page** - The frontend loads 2 font files per page (current + previous) for overflow handling.

4. **Line number ranges**:
   - Lines 1-15: Normal page content
   - Line 0: Very top (before line 1)
   - Lines 16-18: Bottom overflow area

5. **Single words on lines** - If a single word appears alone on a line and looks odd, consider moving it to combine with adjacent content.

6. **Backup before changes**:
   ```bash
   cp page_599.json page_599.json.backup
   ```

7. **Git restore if needed**:
   ```bash
   git restore quran-pages/page_599.json
   ```

---

## Files Modified

### Frontend Files
- `quran_frontend/src/pages/QuranReader.tsx` - Font loading, overflow detection, display
- `quran_frontend/src/index.css` - Overflow and styling fixes

### JSON Page Files (in `quran-pages/`)
- `page_534.json`
- `page_568.json`
- `page_570.json`
- `page_576.json`
- `page_584.json`
- `page_587.json`
- `page_588.json`
- `page_589.json`
- `page_591.json`
- `page_592.json`
- `page_593.json`
- `page_594.json`
- `page_595.json`
- `page_596.json`
- `page_597.json`
- `page_598.json`
- `page_599.json`

### Pages Confirmed Working (No Changes Needed)
- Pages 600-604 were verified as displaying correctly

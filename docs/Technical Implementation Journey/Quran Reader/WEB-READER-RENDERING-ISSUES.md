# Web Quran Reader - Rendering Issues & Required Fixes

**Date**: 9 February 2026
**Status**: In Progress - Multiple issues identified
**Applies to**: `quran_frontend/src/pages/QuranReader.tsx` and `Classroom.tsx`

---

## What Was Done (Current Session)

### 1. Text Justification Change
- **Before**: `justify-center` (words clustered in center of each line)
- **After**: `justify-between` (words spread across full line width)
- **Files**: QuranReader.tsx line 482, Classroom.tsx line 1431
- **Why**: The printed Mushaf has fully justified text where each line fills the page width edge to edge. `justify-center` left gaps on both sides.

### 2. Page Sizing Attempts
- **Before**: `{ aspectRatio: '14/20', maxHeight: '95vh' }`
- **Attempted**: Added `maxWidth: '500px'` then `'700px'`, changed to `height: 'calc(100vh - 140px)'`
- **Files**: QuranReader.tsx line 426, Classroom.tsx line 1378
- **Problem**: Fixed pixel widths don't scale across screen sizes. Height calc doesn't respond to different viewports properly.

### 3. Padding Increase
- **Before**: `padding: '5% 3%'`
- **After**: `padding: '4% 6%'`
- **Files**: QuranReader.tsx line 431, Classroom.tsx line 1380
- **Why**: Words were being clipped at the left and right edges of the page.

### 4. Removed overflow-hidden from word row (Classroom.tsx only)
- **Before**: `<div className="flex justify-center items-center text-slate-800 w-full overflow-hidden">`
- **After**: `<div className="flex justify-between items-center text-slate-800 w-full">`
- **Why**: `overflow-hidden` on the word row was directly clipping words at the edges.

---

## Known Issues (Must Fix)

### Issue 1: Page Proportions Don't Match Real Mushaf
- **Current**: `aspectRatio: '14/20'` (0.7 width/height ratio)
- **Problem**: The actual Madani Mushaf text area is narrower and taller. The current ratio makes the page too wide.
- **Reference**: QuranFlash (https://app.quranflash.com) shows the correct proportions - the text area is noticeably narrower than what we render.
- **Fix needed**: Research the correct aspect ratio of the Madani Mushaf text block and update accordingly. Likely closer to ~0.58-0.62 (e.g., `10/17` or `11/18`).

### Issue 2: Uneven Word Spacing (justify-between)
- **Problem**: `justify-between` distributes remaining space equally between ALL words on a line. This creates:
  - Lines with many words: tight spacing (looks OK)
  - Lines with few words: huge gaps between words (looks wrong)
  - Inconsistent appearance across lines on the same page
- **How the real Mushaf does it**: The QPC fonts have glyphs designed for a specific page width at a specific font size. At the correct size, words naturally fill each line without artificial gaps. The printing uses kashida (elongation of Arabic connectors) and precise kerning.
- **Fix needed**: Replace `justify-between` with a **scale-to-fit** approach (see Proposed Solution below).

### Issue 3: Not Responsive
- **Problem**: Using `height: 'calc(100vh - 140px)'` means:
  - On small screens: the page bottom gets cut off and the user must scroll
  - On large screens: the page may be unnecessarily large
  - The page does NOT adapt to different screen sizes properly
- **Fix needed**: The page must always fit within the viewport without scrolling. Use `max-height` with the aspect ratio so both dimensions scale together. The page should shrink on smaller screens and grow on larger ones, always fitting fully on screen.

### Issue 4: Fixed Pixel Values
- **Problem**: `maxWidth: '700px'` is a fixed value that doesn't adapt.
  - On a 720p laptop: page dominates the screen
  - On a 4K monitor: page looks tiny
  - On mobile: may overflow
- **Fix needed**: Use relative units (vh, vw, %) instead of fixed px values for page dimensions.

---

## Proposed Solution: Scale-to-Fit Line Rendering

### The Flutter App Already Does This Right
In `mushaf_page_widget.dart`, each line is rendered with:
```dart
FittedBox(
  fit: BoxFit.scaleDown,
  child: Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: words.map((word) => Text(word.codeV1, ...)).toList(),
  ),
)
```
This renders words at their natural size and then **scales the entire line down** to fit the container width. No artificial gaps. No justify-between. Words maintain their natural relative spacing.

### Web Equivalent (React)
Replace the current flex justify-between approach with a scale-to-fit div:

```jsx
// For each line:
<div style={{ width: '100%', overflow: 'hidden' }}>
  <div
    ref={lineRef}
    style={{
      display: 'inline-flex',
      flexDirection: 'row',
      whiteSpace: 'nowrap',
      transformOrigin: 'right center', // RTL: scale from right edge
      transform: `scaleX(${scale})`,   // computed via useEffect
    }}
  >
    {words.map(word => <span key={word.id}>{word.codeV1}</span>)}
  </div>
</div>
```

The `scale` value is computed by measuring the natural content width vs the container width:
```jsx
useEffect(() => {
  const containerWidth = containerRef.current.offsetWidth;
  const contentWidth = lineRef.current.scrollWidth;
  setScale(Math.min(1, containerWidth / contentWidth));
}, [words]);
```

This ensures:
- Words render at their natural QPC font size with natural spacing
- The entire line is scaled uniformly to fit the container
- All lines look consistent (no varying gaps)
- Matches the Flutter FittedBox behavior exactly

### Responsive Page Container
Replace fixed dimensions with responsive max-based sizing:
```jsx
style={{
  aspectRatio: '10/17',  // Correct Mushaf ratio (needs verification)
  maxHeight: 'calc(100vh - 180px)',  // Always fits in viewport
  maxWidth: '100%',
  width: 'auto',
  margin: '0 auto',
  backgroundColor: '#FEF9E7'
}}
```
- `maxHeight` ensures the page never exceeds viewport height minus header/controls
- `aspectRatio` computes the width from the constrained height
- On ANY screen size, the full page is always visible without scrolling
- The width naturally follows from the height, maintaining correct proportions

---

## Current Code State (Uncommitted)

| File | Line | Current Value | Issue |
|------|------|---------------|-------|
| QuranReader.tsx | 426 | `height: 'calc(100vh - 140px)', maxWidth: '700px'` | Not responsive, fixed values |
| QuranReader.tsx | 431 | `padding: '4% 6%'` | Increased from 3% to prevent clipping |
| QuranReader.tsx | 482 | `flex justify-between` | Creates uneven gaps |
| Classroom.tsx | 1378 | `height: 'calc(100vh - 140px)', maxWidth: '700px'` | Same issues |
| Classroom.tsx | 1380 | `padding: '4% 6%'` | Same as QuranReader |
| Classroom.tsx | 1431 | `flex justify-between` (removed overflow-hidden) | Same gap issue |

---

## Priority Order for Fixes

1. **Responsive page sizing** - page must fit on all screens without scrolling
2. **Scale-to-fit lines** - replace justify-between with FittedBox-like scaling
3. **Correct aspect ratio** - match the actual Madani Mushaf proportions
4. **Apply same fixes to Classroom.tsx** - keep both files in sync
5. **Apply same fixes to Flutter** - Flutter already has FittedBox but may need the responsive container fix

---

## Reference: How Real Mushaf Apps Render

### QuranFlash
- Uses pre-rendered GIF images of each page
- Each page is a single image, not dynamic text
- Perfect rendering but no interactivity (can't select words, highlight mistakes)

### Quran.com
- Uses QPC fonts similar to our approach
- Each line is rendered as a block of inline spans
- Uses CSS text-align with careful font sizing

### Our Flutter App (mushaf_page_widget.dart)
- Uses `FittedBox(fit: BoxFit.scaleDown)` per line
- Words rendered at natural size, line scaled to fit container
- `Column(mainAxisAlignment: MainAxisAlignment.spaceBetween)` distributes lines vertically
- This is the correct approach - the web app should match this behavior

---

## Files Involved

| File | Role |
|------|------|
| `quran_frontend/src/pages/QuranReader.tsx` | Standalone Quran Reader page |
| `quran_frontend/src/pages/Classroom.tsx` | Classroom view with embedded reader |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Flutter equivalent (reference implementation) |
| `quran_frontend/public/fonts/qpc/QCF_P*.woff2` | 604 QPC font files |
| `quran_backend/quran-pages/*.json` | 604 page data files |

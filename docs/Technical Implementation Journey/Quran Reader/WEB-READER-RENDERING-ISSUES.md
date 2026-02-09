# Web Quran Reader - Rendering Issues & Fixes

**Date**: 9 February 2026
**Status**: Complete (v2 — scaleDown fix applied)
**Applies to**: `quran_frontend/src/pages/QuranReader.tsx`, `Classroom.tsx`, `FittedLine.tsx`, `Layout.tsx`
**See also**: [FLUTTER-RENDERING-REFERENCE.md](./FLUTTER-RENDERING-REFERENCE.md)

---

## v2 Fix: Scale DOWN Only (Match Flutter)

### The Problem

The web app's `FittedLine` component was scaling text both UP and DOWN:
- Lines with fewer words got **enlarged** (scaled up to fill the container width)
- This caused **blurry, distorted text** on mobile — especially on pages with short surahs (598-604)
- Some lines had enormously enlarged text while others were normal size

### The Root Cause

Flutter uses `FittedBox(fit: BoxFit.scaleDown)` which **only scales down, never up**. The web was using `transform: scale(containerWidth / contentWidth)` with no upper bound — scaling both up and down.

### The Fix

**FittedLine.tsx** — One-line change:
```tsx
// Before (broken): scales both up AND down
const scale = containerWidth / contentWidth;

// After (fixed): only scale DOWN, never up
const scale = Math.min(1.0, containerWidth / contentWidth);
```

**QuranReader.tsx & Classroom.tsx** — Set large base font size:
```tsx
// Before: small font, FittedLine scaled UP to fill width
fontSize: isMobile ? `${Math.floor(pageDims.height / 25)}px` : 'clamp(16px, 3.5vw, 28px)'

// After: large font, FittedLine scales DOWN to fit
fontSize: isMobile ? `${Math.floor(pageDims.height / 18)}px` : '28px',
lineHeight: 1.8,  // Match Flutter's height: 1.8
```

**Surah headers & Bismillah** — Fixed sizes:
- Surah header: `fontSize: '18px'`, Amiri font, `border-cyan-200`, `bg-cyan-50`
- Bismillah: `fontSize: '18px'`, Amiri Quran font, `text-cyan-700`

### Why This Works

1. The base font size is set large enough that QPC lines are naturally **wider** than the container
2. FittedLine scales them **down** to fit — text is always sharp (scaling down preserves quality)
3. Short lines (end of surah, short surahs) stay at their natural size and are centered
4. Text is **never enlarged** beyond its designed size — no more blurry/distorted words

---

## Summary of All Changes Made

### 1. FittedLine Component — Scale DOWN Only (v2 Fix)
- **File**: `quran_frontend/src/components/FittedLine.tsx`
- **What**: Matches Flutter's `FittedBox(fit: BoxFit.scaleDown)` — text is only scaled down, never up
- **How**: `Math.min(1.0, containerWidth / contentWidth)` caps scale at 1.0
- **Scale logic**:
  - `scale < 1.0`: Line is wider than container → shrink uniformly, `transformOrigin: right center`
  - `scale = 1.0`: Line fits naturally → no transform, centered via `margin: 0 auto`

### 2. Font Size Strategy — Large Base + Scale Down
- **Files**: `QuranReader.tsx`, `Classroom.tsx`
- **Mobile**: `pageDims.height / 18` (~40px) — intentionally oversized so FittedLine always scales down
- **Desktop**: `28px` fixed
- **lineHeight**: `1.8` — matches Flutter's `height: 1.8`
- **Why**: QPC glyphs are designed for specific sizes. Scaling down is safe; scaling up distorts them.

### 3. Surah Header & Bismillah — Fixed Sizes
- Surah header: 18px, Amiri font, `border-cyan-200`, `bg-cyan-50`
- Bismillah: 18px, Amiri Quran, `text-cyan-700`
- No longer responsive (`clamp()`) — fixed sizes that scale with the page via FittedLine

### 4. Page Sizing - Responsive Desktop + Fullscreen Mobile
- **Desktop**: `height: min(80vh, calc(100vh - 160px))`, `width: calc(height * 0.7)`, `maxWidth: 500px`
- **Mobile**: Full-width page, height = viewport - 112px (header + bottom nav)

### 5. Mobile Fullscreen Reading Mode
- Header, Legend, Page Info: hidden on mobile
- Mushaf page: full-width, no rounded corners, edge-to-edge
- Overlay controls at top/bottom with gradient backgrounds
- Negative margins to negate Layout padding

### 6. Navigation Arrows Closer to Page
- `gap-1` between arrows and page

### 7. Content Padding
- `padding: '4% 6%'`

### 8. Mobile Bottom Navigation
- Fixed bottom nav bar on mobile with icons + labels

---

## Architecture: FittedLine Component

```
FittedLine (container: width=100%, overflow=hidden)
  └── Inner div (display=flex, whiteSpace=nowrap, width=max-content)
       └── Children (QPC word spans at natural font size)

useLayoutEffect:
  1. Measure container.clientWidth (available width)
  2. Measure content.scrollWidth (natural content width)
  3. scale = Math.min(1.0, containerWidth / contentWidth)
  4. If scale < 1.0: apply transform: scale(scale), transformOrigin: 'right center'
  5. If scale = 1.0: no transform, centered via margin: '0 auto'
```

---

## Page Container Sizing

### Desktop (>= 640px)
```
Height: min(80vh, calc(100vh - 160px))
Width:  calc(height * 0.7)
MaxWidth: 500px
Font: 28px, lineHeight 1.8
```

### Mobile (< 640px)
```
Width: 100% (full screen width)
Height: viewport - 112px (56px header + 56px bottom nav)
Font: pageDims.height / 18, lineHeight 1.8
```

---

## Known Remaining Issues

1. **Page 586 overflow**: Uses previous page's font for high glyph codes (>= 0xFC00) — handled correctly
2. **Multi-surah pages**: Pages with multiple surah starts have compressed vertical space due to headers + bismillah taking up line slots

---

## Previous Failed Approaches (for reference)

1. **`justify-between`**: Created uneven word gaps — rejected
2. **`justify-center`**: Words clustered in center, edges empty — rejected
3. **Fixed `maxWidth`**: Not responsive — rejected
4. **`aspect-ratio`**: Didn't compute width in flex context — rejected for desktop
5. **FittedLine with no scale cap**: Short lines (2-3 words) became enormous — rejected
6. **FittedLine with exact scale (no cap)**: Lines scaled UP and DOWN — caused distortion on mobile, rejected
7. **FittedLine with 75% threshold + 1.35x cap**: Too conservative — rejected
8. **Responsive `clamp()` font sizes**: Font changed with viewport, inconsistent rendering — rejected
9. **v2 approach (current)**: Large base font + `Math.min(1.0, scale)` — matches Flutter, works correctly

---

## Files Involved

| File | Role | Change Type |
|------|------|-------------|
| `quran_frontend/src/components/FittedLine.tsx` | Scale-down-only line component | **REWRITTEN** |
| `quran_frontend/src/pages/QuranReader.tsx` | Standalone Quran Reader page | MODIFIED (font size + lineHeight) |
| `quran_frontend/src/pages/Classroom.tsx` | Classroom view with embedded reader | MODIFIED (font size + lineHeight) |
| `quran_frontend/src/components/Layout.tsx` | App layout with bottom nav | Previously modified |

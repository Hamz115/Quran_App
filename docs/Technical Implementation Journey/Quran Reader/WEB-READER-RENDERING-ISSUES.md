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

### 2. Font Size Strategy — Responsive, Capped at 28px
- **Files**: `QuranReader.tsx`, `Classroom.tsx`
- **Formula**: `Math.min(28, Math.floor(pageDims.height / 21))px`
- Large screens: capped at 28px (sharp text, FittedLine scales down horizontally)
- Small screens: font scales down proportionally so text always fits vertically within line slots
- **Why**: QPC glyphs are designed for specific sizes. Scaling down is safe; scaling up distorts them.

### 3. Surah Header & Bismillah — Fixed Sizes
- Surah header: 18px, Amiri font, `border-cyan-200`, `bg-cyan-50`
- Bismillah: 18px, Amiri Quran, `text-cyan-700`
- No longer responsive (`clamp()`) — fixed sizes that scale with the page via FittedLine

### 4. Page Sizing - 3-Tier Responsive
- **Phone** (<640px): Full-width page, height = viewport - 112px (header + bottom nav)
- **Tablet/Small Laptop** (640-1024px): Centered page, chromeHeight = 220px, width = height * 0.7, maxWidth 500px
- **Desktop** (>=1024px): Centered page, chromeHeight = 160px, width = height * 0.7, maxWidth 500px

### 5. Compact Overlay Mode (below lg)
- Header, Page Info: hidden below lg (1024px)
- Legend: shown on sm+ (640px+) to fill space above page
- Overlay controls (page input, surah dropdown) on mushaf page
- Nav buttons overlaid at bottom of mushaf page
- Negative margins below lg to negate Layout padding

### 6. Bottom Navigation — Below lg (1024px)
- Fixed bottom nav bar on phones, tablets, and small laptops
- Top tab nav only shows at 1024px+ (lg breakpoint)
- Role banner and role switcher also hidden below lg
- Main content has `pb-20` below lg to clear the bottom nav

### 7. Navigation Arrows Closer to Page
- `gap-1` between arrows and page

### 8. Content Padding
- `padding: '4% 6%'`

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

### Phone (< 640px)
```
Width: 100% (full screen width)
Height: viewport - 112px (56px header + 56px bottom nav)
Font: 28px
Mushaf: full-screen, no rounded corners, overlay controls
```

### Tablet / Small Laptop (640px - 1024px)
```
ChromeHeight: 220px (header + bottom nav + legend + padding)
Height: min(80vh, calc(100vh - 220px))
Width:  calc(height * 0.7)
MaxWidth: 500px
Font: min(28, pageHeight/21)px — responsive to page height
Bottom nav: visible, overlay controls on page, legend above page
```

### Desktop (>= 1024px)
```
ChromeHeight: 160px (header + cards + padding, no bottom nav)
Height: min(80vh, calc(100vh - 160px))
Width:  calc(height * 0.7)
MaxWidth: 500px
Font: min(28, pageHeight/21)px — capped at 28px on large screens
Top tab nav: visible, full header + legend + page info
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

## Responsive Breakpoint Summary

| Feature | Phone (<640px) | Tablet (640-1024px) | Desktop (>=1024px) |
|---------|----------------|---------------------|---------------------|
| **Tab Navigation** | Bottom nav | Bottom nav | Top tab nav |
| **Role Banner** | Hidden | Hidden | Visible |
| **Role Switcher** | Hidden | Hidden | Visible |
| **Mushaf Page** | Full-screen | Centered, sized | Centered, sized |
| **Reader Controls** | Overlay on page | Header cards | Header cards |
| **Nav Arrows** | Overlay on page | Beside page | Beside page |
| **Content Bottom Padding** | 80px (pb-20) | 80px (pb-20) | 16px (pb-4) |

---

## Files Involved

| File | Role | Change Type |
|------|------|-------------|
| `quran_frontend/src/components/FittedLine.tsx` | Scale-down-only line component | **REWRITTEN** |
| `quran_frontend/src/pages/QuranReader.tsx` | Standalone Quran Reader page | MODIFIED (font size, 3-tier responsive) |
| `quran_frontend/src/pages/Classroom.tsx` | Classroom view with embedded reader | MODIFIED (font size, bottom nav aware) |
| `quran_frontend/src/components/Layout.tsx` | App layout, nav breakpoints | MODIFIED (sm→lg for nav) |

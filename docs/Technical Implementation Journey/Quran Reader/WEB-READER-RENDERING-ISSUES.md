# Web Quran Reader - Rendering Issues & Fixes

**Date**: 9 February 2026
**Status**: Complete
**Applies to**: `quran_frontend/src/pages/QuranReader.tsx`, `Classroom.tsx`, `FittedLine.tsx`, `Layout.tsx`

---

## Summary of All Changes Made

### 1. FittedLine Component (NEW - Core Fix)
- **File**: `quran_frontend/src/components/FittedLine.tsx`
- **What**: Custom React component that replaces CSS `justify-between` for word spacing
- **How**: Renders QPC words at natural size, measures content vs container width, applies `transform: scaleX()` to fill the line edge-to-edge
- **Why**: `justify-between` created uneven gaps — lines with many words had small gaps, lines with few words had huge gaps. The real Mushaf has each line uniformly stretched to fill the page width.
- **Scale logic**:
  - Lines that are 40%+ full: stretched to exactly fill the container width (no cap — exact fit)
  - Short lines (<40% full): kept at natural size and **centered** on the line
  - This matches real Mushaf behavior where normal lines fill edge-to-edge but the last line of a surah is centered

### 2. Page Sizing - Responsive Desktop + Fullscreen Mobile
- **Desktop**: `height: min(80vh, calc(100vh - 160px))`, `width: calc(height * 0.7)`, `maxWidth: 500px`
- **Mobile**: Full-width page with `aspect-ratio: 14/20` to compute height automatically
- **Why**: On desktop, explicit width from height maintains correct 14:20 Madani Mushaf proportions. On mobile, the page fills the entire screen width like the Flutter app.

### 3. Mobile Fullscreen Reading Mode (NEW)
- **What**: On mobile (< 640px), the Quran page takes over the entire screen
- **Changes**:
  - Header, Legend, Page Info cards: hidden on mobile
  - Desktop nav arrows: hidden on mobile
  - Mushaf page: full-width, no rounded corners, edge-to-edge
  - Overlay controls: page number + page input + surah dropdown at top with gradient overlay
  - Navigation buttons: overlaid at bottom of the page
  - Outer container: negative margins (`-mx-3 -mt-4`) to negate Layout padding
- **Why**: Mobile should match the Flutter app experience — the Mushaf page IS the screen

### 4. Navigation Arrows Closer to Page
- **Before**: `gap-2 md:gap-4` between arrows and page
- **After**: `gap-1` — arrows sit right next to the mushaf page
- **Files**: QuranReader.tsx and Classroom.tsx

### 5. Content Padding
- **Before**: `padding: '5% 3%'`
- **After**: `padding: '4% 6%'`
- **Why**: Words were being clipped at the left and right edges

### 6. Layout Responsiveness
- **File**: `quran_frontend/src/components/Layout.tsx`
- **Changes**:
  - Header: responsive padding (`px-3 sm:px-6 lg:px-12`)
  - Tab nav: hidden on mobile (moved to bottom nav)
  - Role switcher: hidden on mobile
  - Role banner: hidden on mobile
  - Main content: responsive padding, extra bottom padding for mobile bottom nav

### 7. Mobile Bottom Navigation (NEW)
- **File**: `quran_frontend/src/components/Layout.tsx`
- **What**: Fixed bottom navigation bar on mobile (below `sm` breakpoint)
- **Appearance**: Icons + short labels, active tab highlighted in cyan
- **Behavior**: Same tabs as the top navbar — Dashboard, Classes, Quran Reader
- **Why**: Top navbar tabs were cramped on mobile. Bottom nav matches the Flutter app pattern and is more thumb-friendly.

---

## Architecture: FittedLine Component

```
FittedLine (container: width=100%, overflow=hidden)
  └── Inner div (display=flex, whiteSpace=nowrap, width=max-content)
       └── Children (QPC word spans at natural font size)

useLayoutEffect:
  1. Measure container.clientWidth (available width)
  2. Measure content.scrollWidth (natural content width)
  3. Calculate fillRatio = contentWidth / containerWidth
  4. If fillRatio >= 0.40: scale exactly to fill → scaleX(containerWidth/contentWidth)
     - transformOrigin: 'right center' (for RTL alignment)
  5. If fillRatio < 0.40: no transform, centered via margin: '0 auto'
     - Short lines stay at natural size, centered on the line
```

Key insight: The old approach used a max scale cap (1.35x) which could leave some lines not fully filled. The new approach always scales to exactly `containerWidth / contentWidth` for any line that's at least 40% full. This means every normal line fills edge-to-edge perfectly.

---

## Page Container Sizing

### Desktop (>= 640px)
```
Height: min(80vh, calc(100vh - 160px))
Width:  calc(height * 0.7)
MaxWidth: 500px

Result: Mushaf proportions (14:20 = 0.7 ratio), centered with nav arrows
```

### Mobile (< 640px)
```
Width: 100% (full screen width via JS: windowSize.w)
Height: viewport - 112px (56px header + 56px bottom nav)
Rounded corners: none (edge-to-edge)
Controls: overlaid with gradient backgrounds
Negative margins: -mx-3 -mt-4 -mb-20 to negate Layout padding

Result: Page fills entire screen from header to bottom nav, like the Flutter app
```

### Why JS-computed dimensions instead of CSS?
- CSS `aspect-ratio` was unreliable in flex containers
- CSS `min()`/`calc()` inline styles were being overridden by global `.mushaf-page` CSS
- Global `.mushaf-page` had `width: 100%` and `max-width: 645px` that fought with inline styles
- JS dimensions are set as explicit pixel values — no specificity wars, always correct
- `window.resize` listener keeps dimensions responsive

---

## Mobile vs Desktop Layout

| Feature | Mobile (< 640px) | Desktop (>= 640px) |
|---------|-------------------|---------------------|
| Header / Legend / Page Info | Hidden | Visible |
| Navigation | Bottom tab bar | Top tab bar |
| Nav arrows | Overlay on page | Beside page |
| Page shape | Full-width, no border radius | Centered card, rounded |
| Controls | Overlay (top/bottom gradient) | Above page in cards |
| Role switcher | Hidden | Visible in header |
| Role banner | Hidden | Visible |

---

## Known Remaining Issues

### Fine-Tuning Needed
1. **40% fill threshold**: May need adjustment. If some normal lines have fewer words than expected (data issue), they'd be centered instead of stretched.
2. **Surah headers on special pages**: Pages with multiple surah starts (e.g., page 587) have compressed vertical space due to headers + bismillah taking up line slots.
3. **Page 586 overflow**: Uses previous page's font for high glyph codes (>= 0xFC00).

### Classroom.tsx
1. The Classroom page still uses the desktop-only layout for the mushaf. Same mobile fullscreen treatment could be applied if needed, but the classroom has more controls above the page that make fullscreen less practical.

---

## Files Involved

| File | Role | Change Type |
|------|------|-------------|
| `quran_frontend/src/components/FittedLine.tsx` | Scale-to-fit line component | **CREATED** |
| `quran_frontend/src/pages/QuranReader.tsx` | Standalone Quran Reader page | **MAJOR REWRITE** |
| `quran_frontend/src/pages/Classroom.tsx` | Classroom view with embedded reader | MODIFIED |
| `quran_frontend/src/components/Layout.tsx` | App layout with bottom nav | **MAJOR REWRITE** |
| `quran_mobile/lib/presentation/widgets/mushaf_page_widget.dart` | Flutter equivalent (reference) | Unchanged |

---

## Previous Failed Approaches (for reference)

1. **`justify-between`**: Created uneven word gaps — rejected
2. **`justify-center`**: Words clustered in center, edges empty — rejected
3. **Fixed `maxWidth: '500px'` / `'700px'`**: Not responsive — rejected
4. **`aspect-ratio: '14/20'`**: Didn't compute width in flex context on desktop — rejected for desktop, used for mobile
5. **`aspect-ratio: '3/5'`**: Way too wide, not Mushaf proportions — rejected
6. **FittedLine with no scale cap**: Short lines (2-3 words) became enormous — fixed with fill ratio threshold
7. **FittedLine with `Math.min(scale, 1.0)` cap**: Ragged left edge, normal lines didn't fill width — rejected
8. **FittedLine with 75% threshold + 1.35x cap**: Too conservative, many lines left unfilled — replaced with 40% threshold + exact scale
9. **Short lines right-aligned**: Looked unbalanced with empty space on left — changed to centered

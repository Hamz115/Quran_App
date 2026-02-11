# 06 - Quran Reader Rewrite (Page-Based QPC Rendering)

## Overview

The Flutter mobile Quran Reader was completely rewritten from surah-based plain text rendering to page-based QPC (Quran Printing Complex) glyph rendering, matching the React web app's pixel-perfect Madani Mushaf display.

### Before vs After

| Feature | Before | After |
|---------|--------|-------|
| Navigation | Surah dropdown + prev/next buttons | 604-page PageView with RTL swipe |
| Text rendering | Google Fonts Amiri, plain Arabic text | QPC fonts with page-specific glyph codes |
| Layout | Wrap-based text flow | Line-based Column layout matching printed page |
| Font source | Google Fonts CDN | Backend API with local disk cache |
| Page data | Surah-based from SQLite | Bundled JSON assets (604 files) |
| Offline | Depends on Google Fonts cache | Full offline (bundled data, cached fonts) |

## Architecture

```
QuranReaderScreen (fullscreen immersive)
  ├── PageView.builder (604 pages, reverse=true for RTL, fills entire screen)
  │     └── _PageLoader (loads data + fonts, shows loading state)
  │           └── MushafPageWidget (renders single page)
  │                 ├── SurahHeaderWidget? (if surah starts on this line)
  │                 ├── BismillahWidget? (surahs 2-114 except 9)
  │                 └── FittedBox → Row of QPC glyph Text widgets per line
  ├── GestureDetector (tap to toggle overlay)
  ├── Top overlay (gradient, page number, surah name, surah dropdown)
  ├── Bottom overlay (gradient, prev/next arrows, surah info)
  └── Jump dialog (go to specific page number)
```

### Fullscreen Immersive Mode

The Quran Reader uses a fullscreen layout like real mobile Quran apps:
- **No persistent header or bottom bar** - the mushaf page fills the entire screen
- **Tap to toggle overlay** - tapping anywhere shows/hides translucent controls
- **Auto-hide** - overlay automatically disappears after 4 seconds
- **Gradient overlays** - top/bottom controls use black gradient for readability over page content

### Cream Page Background (Theme-Independent)

The mushaf page background is always `#FEF9E7` (cream) regardless of light/dark theme, matching the printed Mushaf and the React web app. All text and decorations on the page also use fixed light-mode colors:
- **Word text**: `AppColors.lightText` (dark slate) — always readable on cream
- **Ayah end markers**: `AppColors.cyan600`
- **Surah header**: `cyan50` background, `cyan200` border, `cyan700` text
- **Bismillah**: `AppColors.cyan700`

The **scaffold background** adapts to the theme:
- **Light mode**: Cream (`#FEF9E7`) — seamless, no visible border around the page
- **Dark mode**: Black — creates a framed card effect with padding, rounded corners, and shadow around the cream page

### Overflow Prevention

Each line of QPC words is wrapped in a `FittedBox(fit: BoxFit.scaleDown)` which automatically scales down lines that would overflow horizontally. This ensures all glyphs fit within the page width regardless of screen size.

## File Structure

```
quran_mobile/lib/
├── data/
│   ├── models/
│   │   ├── quran_page_word.dart      # Single word with QPC glyph data
│   │   └── quran_page_data.dart      # Full page: words grouped by line
│   └── quran_data.dart               # Static: pageStarts[604], surahNames[114]
├── core/services/
│   ├── qpc_font_service.dart         # Download, cache, load QPC .ttf fonts
│   └── quran_page_data_service.dart  # Load JSON from assets, LRU cache
├── presentation/
│   ├── providers/
│   │   └── quran_page_provider.dart  # Riverpod providers for page + font state
│   ├── widgets/
│   │   ├── mushaf_page_widget.dart   # Renders one Mushaf page
│   │   ├── surah_header_widget.dart  # "سُورَةُ ..." header
│   │   └── bismillah_widget.dart     # Bismillah text
│   └── screens/reader/
│       └── quran_reader_screen.dart  # Complete rewrite
```

## Data Flow

### Page Data (Bundled in APK)
1. 604 JSON files copied from `quran_backend/quran-pages/` to `quran_mobile/assets/quran-pages/`
2. `QuranPageDataService` loads via `rootBundle.loadString()`
3. Parsed into `QuranPageData` with words grouped by line number
4. LRU cache keeps 10 pages in memory

### Font Loading (Download + Cache)
1. `QpcFontService.ensureFontsForPage(n)` loads fonts for pages n-1, n, n+1
2. Checks disk cache first: `getApplicationDocumentsDirectory()/qpc_fonts/QCF_PXXX.ttf`
3. If not cached, downloads from `GET /api/fonts/qpc/{page_number}`
4. Registers font with Flutter via `FontLoader('QPC-Page-{n}')`
5. Concurrent load deduplication via `Completer` map

### Backend Font Endpoint
```python
# quran_backend/main.py
@app.get("/api/fonts/qpc/{page_number}")
def get_qpc_font(page_number: int):
    # Serves .ttf with 1-year cache header
    return FileResponse(path=font_file, media_type="font/ttf")
```

Fonts must first be converted from .woff2 to .ttf:
```bash
pip install fonttools brotli
python scripts/convert_fonts.py
```

## QPC Rendering Details

### Word JSON Structure
```json
{
  "id": 1, "s": 1, "a": 1, "p": 1,
  "t": "بِسْمِ",     // Arabic text (reference only)
  "c1": "ﭑ",         // QPC glyph code (used for rendering)
  "l": 2,            // Line number (0-15 normal, 16-18 overflow)
  "ct": "word"       // "word" or "end" (ayah marker)
}
```

### Font Assignment
- Each word renders with `fontFamily: 'QPC-Page-{pageNumber}'`
- The `c1` field contains the glyph code specific to that page's font
- **Page 586 special case**: overflow glyphs (codeUnit >= 0xFC00) use page 585's font

### Surah Headers and Bismillah
- Detected when `ayahNum == 1 && wordPosition == 1` in the word data
- Surah header: Amiri font, cyan border, "سُورَةُ {name}" text
- Bismillah: Amiri Quran font, shown for surahs 2-114 except surah 9
- Surah 1 (Al-Fatihah): Bismillah is part of ayah 1, not shown separately

### Mistake Highlighting
5-level severity coloring inherited from the existing system:
| Level | Color | Count |
|-------|-------|-------|
| 1 | Amber | 1x |
| 2 | Blue | 2x |
| 3 | Orange | 3x |
| 4 | Purple | 4x |
| 5 | Red | 5x+ |

Applied as gradient background + bottom border on the word container.

## Providers

```dart
// Singleton services
qpcFontServiceProvider    // QpcFontService (download/cache/load fonts)
quranPageDataServiceProvider  // QuranPageDataService (load JSON)

// State
currentPageProvider       // StateProvider<int> (1-604)

// Async data
quranPageDataProvider(pageNum)  // FutureProvider.family<QuranPageData, int>
fontReadyProvider(pageNum)      // FutureProvider.family<bool, int>
```

## Static Data

`quran_data.dart` contains:
- `pageStarts`: 604 entries mapping page number to [surahNumber, ayahNumber]
- `surahNamesArabic`: 114 Arabic surah names
- `getPageForSurah(surahNum)`: Find first page of a surah
- `getPageNumber(surahNum, ayahNum)`: Find page for any ayah
- `getSurahsOnPage(pageNumber)`: List surahs appearing on a page

## Setup Instructions

### 1. Convert Fonts (one-time)
```bash
pip install fonttools brotli
python scripts/convert_fonts.py
# Creates 604 .ttf files in quran_backend/fonts/qpc/
```

### 2. Start Backend
```bash
cd quran_backend && python main.py
# Font endpoint: GET /api/fonts/qpc/{1-604}
```

### 3. Run Flutter App
```bash
cd quran_mobile && flutter run
# Navigate to Quran Reader tab
```

## Classroom Integration (Phase 13.5)

### How MushafPageWidget Was Extended

`MushafPageWidget` gained two optional callbacks:

```dart
final void Function(QuranPageWord word)? onWordTap;
final void Function(QuranPageWord word)? onWordLongPress;
```

When either callback is provided, each word widget is wrapped in a `GestureDetector`. This keeps the widget **backwards-compatible** — `QuranReaderScreen` passes no callbacks (read-only mode), while `ClassroomScreen` passes callbacks for mistake marking.

### Classroom Reuses the Same QPC Pipeline

```
ClassroomScreen
  ├── ref.watch(quranPageDataProvider(pageNum))  → QuranPageData
  ├── ref.watch(fontReadyProvider(pageNum))       → QpcFontService
  ├── ref.watch(teacherStudentsProvider)          → Student selector (web)
  └── PageView.builder (swipe navigation)
        └── MushafPageWidget(
              pageNumber, pageData, isDarkMode, mistakes,
              onWordTap: _showWordPopup,        // ← interactive
              onWordLongPress: _removeMistake,  // ← interactive
            )
```

The same `QpcFontService`, `QuranPageDataService`, and providers used by `QuranReaderScreen` are reused without modification.

### Navigation

The classroom uses a `PageView.builder` with `reverse: true` for RTL swipe navigation, plus arrow buttons that `animateToPage()`. The `onPageChanged` callback keeps the arrow UI and page counter in sync with swipe gestures.

### Page Range Helpers

Added to `quran_data.dart`:

- `getLastPageForSurah(int surahNum)` — Returns the last mushaf page of a surah by looking at the next surah's first page minus one.
- `getPageRange({startSurah, endSurah, startAyah?, endAyah?})` — Computes `(firstPage, lastPage)` for an assignment's range.

### Supabase UUID Handling

Supabase uses UUID strings as primary keys, but Flutter models use `int? id` for SQLite compatibility. The solution:
- `ClassSession` and `Mistake` gained a `String? supabaseId` field
- Web parsing: `id = rawId.hashCode` (unique int), `supabaseId = rawId.toString()` (original UUID)
- All web Supabase mutations resolve the UUID from `supabaseId` before querying
- `classProvider` on web finds from the loaded list (avoids re-querying with wrong ID type)

### Mistakes — RLS-Compliant Flow

The `addMistake` web path now matches the React web app:
1. Teacher selects a student via `teacherStudentsProvider` dropdown
2. `addMistake` passes `studentId` (the student's Supabase UUID)
3. Checks for existing mistake (same surah/ayah/word/charIndex) → increments `error_count` if found
4. Records `mistake_occurrences` linking the mistake to the class
5. `loadMistakes` targets the selected student via `setWebStudentId()`

### Architecture

```
┌──────────────────┐     ┌───────────────────────────┐
│ QuranReaderScreen │     │ ClassroomScreen            │
│   (read-only)    │     │   (interactive + swipe)    │
└────────┬─────────┘     │   + student selector (web) │
         │               │   + mistakes on scroll     │
         │               └────────────┬────────────────┘
         ▼                            ▼
┌──────────────────────────────────────────────┐
│            MushafPageWidget                  │
│  (onWordTap? / onWordLongPress?)             │
├──────────────────────────────────────────────┤
│  quranPageDataProvider  ← JSON assets        │
│  fontReadyProvider      ← QpcFontService     │
│  teacherStudentsProvider ← Supabase (web)    │
└──────────────────────────────────────────────┘
```

### Known Issues / TODO
- Performance dropdown and notes button not yet in ClassroomScreen
- WordPopup letter/haraka selection needs fixing (only whole word works)

---

## Verification Checklist

- [ ] Font conversion: 604 .ttf files generated
- [ ] Backend: `GET /api/fonts/qpc/1` returns font file
- [ ] Page 1 (Al-Fatihah): Renders with QPC glyphs
- [ ] Swipe navigation: RTL direction works
- [ ] Multi-surah page (e.g., 587): Shows surah header + bismillah
- [ ] Page 586: Overflow glyphs render correctly
- [ ] Surah dropdown: Jumps to correct page
- [ ] Jump to page dialog: Works with page numbers
- [ ] Offline: Cached pages render after disconnect
- [ ] Mistake highlighting: Colors match severity levels

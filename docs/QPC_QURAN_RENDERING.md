# QPC Quran Rendering System

This document explains the QPC (Quran Printing Complex) font-based rendering system implemented for displaying Quran pages with accurate word-by-word selection.

## Overview

The system renders Quran pages exactly like the printed Madani Mushaf using:
1. **QPC Fonts** - Page-specific fonts from King Fahd Complex
2. **Quran.com API Data** - Word-by-word data with glyph codes and line positions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                 │
├─────────────────────────────────────────────────────────────┤
│  quran_backend/                                              │
│  ├── quran-pages/           # 604 JSON files (17 MB)        │
│  │   ├── page_001.json                                      │
│  │   ├── page_002.json                                      │
│  │   └── ... (604 files)                                    │
│  │                                                          │
│  └── main.py                                                │
│      └── GET /api/quran/page/{num}  # Serves word data      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
├─────────────────────────────────────────────────────────────┤
│  quran_frontend/                                             │
│  ├── public/fonts/qpc/      # 604 font files (47 MB)        │
│  │   ├── QCF_P001.woff2                                     │
│  │   ├── QCF_P002.woff2                                     │
│  │   └── ... (604 files)                                    │
│  │                                                          │
│  └── src/                                                   │
│      ├── api.ts             # getQuranPageWords() function  │
│      └── pages/QuranPageTest.tsx  # Test implementation     │
└─────────────────────────────────────────────────────────────┘
```

## Data Structure

Each page JSON file contains an array of words with:

```typescript
interface QuranPageWord {
  id: number;     // Unique word ID
  s: number;      // Surah number (1-114)
  a: number;      // Ayah number
  p: number;      // Position in ayah (word index)
  t: string;      // text_uthmani (readable Arabic text)
  c1: string;     // code_v1 - QPC V1 glyph code
  c2: string;     // code_v2 - QPC V2 glyph code
  l: number;      // line_number (1-15 on each page)
  ct: string;     // char_type: 'word' or 'end' (ayah marker)
}
```

## How QPC Fonts Work

### The Problem with Regular Fonts
- Arabic text with regular fonts doesn't match the exact layout of printed Mushaf
- Line breaks, word spacing, and justification differ from the original
- No way to guarantee 15 lines per page with exact word positions

### The QPC Solution
- King Fahd Complex created **604 separate font files** (one per page)
- Each word in the Quran is mapped to a **unique glyph code** (code_v1/code_v2)
- When you render the glyph code with the matching page font, it displays exactly as printed
- The font itself contains all positioning information

### Font Loading
```typescript
// Dynamic font loading for each page
@font-face {
  font-family: 'QPC-Page-{pageNum}';
  src: url('/fonts/qpc/QCF_P{pageNum}.woff2') format('woff2');
}
```

## API Endpoints

### Get Page Words
```
GET /api/quran/page/{page_number}

Response:
{
  "data": [
    { "id": 1, "s": 1, "a": 1, "p": 1, "t": "بِسْمِ", "c1": "ﭑ", "l": 1, "ct": "word" },
    ...
  ],
  "page": 1
}
```

## Rendering Process

1. **Load Font**: Dynamically inject @font-face for current page
2. **Fetch Data**: Call `/api/quran/page/{num}` to get word data
3. **Group by Line**: Organize words by `line_number` (1-15)
4. **Render Words**: Each word is a clickable `<span>` displaying `code_v1`
5. **Handle Selection**: Click events identify exact word (surah:ayah:position)

```tsx
// Rendering each word
<span
  onClick={() => handleWordClick(word)}
  style={{ fontFamily: `'QPC-Page-${currentPage}'` }}
>
  {word.c1}  {/* QPC glyph code */}
</span>
```

## Offline Capability

The entire system works offline:
- **Fonts**: Stored locally in `public/fonts/qpc/` (47 MB)
- **Word Data**: Stored in backend `quran-pages/` folder (17 MB)
- **No external API calls**: Everything served from local files

## Data Sources

### Original Data Source
- **Quran.com API v4**: `https://api.quran.com/api/v4/verses/by_page/{page}?words=true`
- Provides: `code_v1`, `code_v2`, `line_number`, `text_uthmani`, `position`

### Font Source
- **GitHub**: `https://github.com/mustafa0x/qpc-fonts`
- **CDN**: `https://cdn.jsdelivr.net/gh/mustafa0x/qpc-fonts@master/mushaf-woff2/`
- Original: King Fahd Glorious Quran Printing Complex

## Download Scripts

### Download Word Data
```bash
node scripts/downloadQuranData.cjs
```
Downloads all 604 pages from Quran.com API and saves to JSON files.

### Download Fonts
```bash
node scripts/downloadFonts.cjs
```
Downloads all 604 QPC font files from CDN.

## File Sizes

| Component | Size | Files |
|-----------|------|-------|
| QPC Fonts | 47 MB | 604 woff2 files |
| Word Data | 17 MB | 604 JSON files |
| **Total** | **64 MB** | 1,208 files |

## Surah Detection

The system detects when a new surah starts on a page by checking:
- `ayah === 1` (first ayah of surah)
- `position === 1` (first word of ayah)
- `char_type === 'word'` (actual word, not marker)

When detected, it displays:
- Surah name header (e.g., "سورة البقرة")
- Bismillah (except for Surah 1 and 9)

## Benefits

1. **Pixel-Perfect Rendering**: Matches printed Mushaf exactly
2. **Accurate Word Selection**: Each word is a separate clickable element
3. **Offline Support**: No internet required after initial setup
4. **Mistake Tracking**: Can mark specific words as mistakes
5. **Line Accuracy**: Words positioned on correct lines (1-15)

## Limitations

1. **Large File Size**: 64 MB for fonts + data
2. **Page-Specific Fonts**: Must load new font for each page
3. **No Text Search**: Glyph codes aren't searchable text

## Future Improvements

- [ ] Add decorative borders (image-based corners/frames)
- [ ] Implement in main QuranReader page
- [ ] Add mistake marking integration with existing API
- [ ] Cache fonts in browser for faster page switching

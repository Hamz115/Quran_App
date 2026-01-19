# Quran Page Layout Fix Guide

## Overview

This guide explains how to fix ayah positioning issues in the Quran page JSON files. The issue occurs when ayahs appear at the wrong vertical position on a page (e.g., at the bottom instead of the top).

## JSON Data Structure

Each page file (`page_XXX.json`) contains an array of word objects:

```json
{
  "id": 18609,        // Unique word ID
  "s": 79,            // Surah number
  "a": 16,            // Ayah number
  "p": 1,             // Position of word within the ayah
  "t": "إِذْ",         // Arabic text (for display reference)
  "c1": "ﭑ",          // QPC font glyph (code_v1)
  "c2": "ﳎ",          // QPC font glyph (code_v2)
  "l": 1,             // LINE NUMBER (determines vertical position)
  "ct": "word"        // Character type: "word" or "end" (ayah marker)
}
```

## The Key Field: `l` (Line Number)

The `l` field determines where the word appears vertically on the page:
- `l: 1` = Line 1 (top of page)
- `l: 2` = Line 2
- ...
- `l: 15` = Line 15 (bottom of page)

The frontend sorts words by line number, so a word with `l: 15` will always appear at the bottom, regardless of its position in the JSON array.

## Common Issues

### Issue: Ayah appears at bottom instead of top
**Symptom**: An ayah that should start the page appears at the bottom.
**Cause**: The `l` value is set to a high number (e.g., 15).
**Solution**: Change the `l` value to 0 or 1.

### Issue: Ayahs appear out of order
**Symptom**: Ayahs display in wrong sequence.
**Cause**: Inconsistent `l` values across words in the same line.
**Solution**: Ensure all words on the same visual line have the same `l` value.

## How to Fix

### Method 1: Python Script (Recommended)

Use this Python script to fix all words of a specific ayah:

```python
import json

PAGE_NUMBER = 584
AYAH_TO_FIX = 16
NEW_LINE_NUMBER = 0  # 0 = top of page

file_path = f'page_{PAGE_NUMBER}.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix all words with the specified ayah number
for word in data:
    if word.get('a') == AYAH_TO_FIX:
        word['l'] = NEW_LINE_NUMBER

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False)

print(f"Fixed ayah {AYAH_TO_FIX} on page {PAGE_NUMBER} to line {NEW_LINE_NUMBER}")
```

### Method 2: Manual JSON Edit

1. Open the page JSON file
2. Find all objects where `"a": <ayah_number>`
3. Change the `"l": X` value to the desired line number
4. Save the file

### Method 3: Bulk Fix Script

To fix multiple pages at once:

```python
import json
import os

FIXES = [
    # (page_number, ayah_number, new_line_number)
    (584, 16, 0),
    (585, 41, 0),
    # Add more fixes as needed
]

for page_num, ayah_num, new_line in FIXES:
    file_path = f'page_{page_num}.json'

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        continue

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    count = 0
    for word in data:
        if word.get('a') == ayah_num:
            word['l'] = new_line
            count += 1

    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

    print(f"Page {page_num}: Fixed {count} words for ayah {ayah_num}")
```

## Important Notes

1. **DO NOT move words between pages** - The `c1` and `c2` glyph codes are page-specific. Moving a word to a different page will break the font rendering.

2. **Line 0 vs Line 1** - Using `l: 0` ensures the ayah appears before line 1. This is useful when you want an ayah at the very top.

3. **Backup first** - Always backup the JSON file before making changes:
   ```bash
   cp page_584.json page_584.json.backup
   ```

4. **Test after changes** - Reload the QuranReader to verify the fix works correctly.

5. **Git restore** - If something goes wrong:
   ```bash
   git restore quran-pages/page_584.json
   ```

## Fixes Applied

| Page | Ayah | Issue | Fix Applied |
|------|------|-------|-------------|
| 584 | 16 | Appeared at bottom (l:15) | Changed to l:0 (top) |

## Troubleshooting

### Words appear scrambled after fix
- Ensure all words of the same ayah have the same `l` value
- Check that word positions (`p` field) are sequential

### Ayah still appears in wrong place
- Clear browser cache
- Verify the JSON file was saved correctly
- Check frontend is loading from the correct file path

### Font glyphs not rendering
- The `c1`/`c2` codes are page-specific
- Never copy words from one page to another
- Only modify the `l` (line) value

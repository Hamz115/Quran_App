# Claude Code Instructions for QuranTrack

## Project Overview

QuranTrack is a Quran memorization and recitation tracking app for teachers and students. It uses QPC (Quran Printing Complex) fonts to render Quran pages exactly like the printed Madani Mushaf.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS (`quran_frontend/`)
- **Backend**: FastAPI (Python) + SQLite (`quran_backend/`)
- **Mobile**: Flutter (Dart) (`quran_mobile/`)
- **Cloud Database**: Supabase (PostgreSQL) - for cross-device sync

## Key Directories

```
Quran_App/
├── quran_backend/           # FastAPI backend
│   ├── main.py              # All API endpoints
│   ├── app.db               # Application database (users, classes, mistakes)
│   ├── quran.db             # Quran text database (read-only)
│   ├── quran-pages/         # 604 JSON files with QPC word data
│   ├── create_test_users.py # Creates demo accounts
│   └── clear_mistakes.py    # Clears all mistakes (testing)
│
├── quran_frontend/          # React frontend
│   ├── src/pages/           # Main pages (QuranReader, Classroom, etc.)
│   ├── src/api.ts           # API client functions
│   └── public/fonts/qpc/    # 604 QPC font files
│
├── docs/                    # Documentation
│   ├── PROJECT_CHANGELOG.md # Main reference - read this first!
│   ├── Architecture/        # Design docs
│   ├── Technical Implementation Journey/  # Implementation details
│   └── Guides/              # Troubleshooting guides for AI/developers
│
└── CLAUDE.md                # This file
```

## Important Rules

### Git Commands
- **ALWAYS use `git add .`** before committing (not `git add -A` or individual files)
- This project uses conventional commits

### Database
- `app.db` - Local SQLite: Users, classes, mistakes (read-write)
- `quran.db` - Quran text only (read-only)
- **Supabase** - Cloud PostgreSQL for cross-device sync (see `docs/Technical Implementation Journey/Supabase Implementation/`)
- Never modify `quran.db`

### QPC Fonts
- Each Quran page (1-604) has its own font file
- Glyph codes (`c1` field in JSON) are page-specific
- Never move words between pages - the glyphs won't render correctly
- Page 586 has overflow glyphs that need the previous page's font

### Quran Page JSON Structure
```json
{
  "id": 123,
  "s": 2,        // Surah number
  "a": 1,        // Ayah number
  "p": 1,        // Word position in ayah
  "t": "بِسْمِ",   // Arabic text (display reference)
  "c1": "ﭑ",     // QPC glyph code (used for rendering)
  "l": 3,        // Line number (controls vertical position)
  "ct": "word"   // Type: "word" or "end" (ayah marker)
}
```

### Line Numbers
- `l: 0-15` = Normal page content (0=top, 15=bottom)
- `l: 16-18` = Overflow lines at bottom
- To move an ayah, change the `l` value for ALL its words

### Surah Headers & Bismillah
- Rendered as styled Arabic text (not QPC glyphs)
- Displayed ABOVE existing lines - never replace words
- Surah 1: Bismillah is ayah 1 (no separate display)
- Surah 9: No bismillah at all
- Surahs 2-114 (except 9): Show bismillah

## Common Tasks

### Run the project
```bash
# Backend
cd quran_backend && python main.py

# Frontend
cd quran_frontend && npm run dev
```

### Create test users
```bash
cd quran_backend && python create_test_users.py
```

### Clear all mistakes (testing)
```bash
cd quran_backend && python clear_mistakes.py
```

### Build frontend
```bash
cd quran_frontend && npm run build
```

## Documentation

**Start with `docs/PROJECT_CHANGELOG.md`** - it's the main reference guide with links to all other docs.

| Doc | Purpose |
|-----|---------|
| PROJECT_CHANGELOG.md | Main reference, all phases, doc directory |
| Technical Implementation Journey/ | How features were built |
| Guides/ | Troubleshooting for AI/developers |
| Architecture/ | System design docs |

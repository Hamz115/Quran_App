# QuranTrack

A Quran memorization and recitation tracking app for teachers and students.

## What is QuranTrack?

QuranTrack is designed for Quran teachers (Ustadh/Ustadha) who conduct Hifz (memorization) classes. It provides a digital way to track student progress, mark mistakes during recitation, and maintain class records.

### For Teachers

- **Conduct Classes**: Create class sessions with specific Quran portions (Hifz, Sabqi, Revision)
- **Track Mistakes**: Tap on words to mark mistakes - they persist across all classes for each student
- **Character-Level Precision**: Mark mistakes on specific letters or harakat (diacritical marks)
- **Multiple Students**: Manage a roster of students, each with their own mistake history
- **Performance Ratings**: Rate each student's performance after class sessions
- **Student Reports**: View detailed reports with mistakes by surah, performance charts, and export to PDF/CSV/Word
- **Smart Suggestions**: Auto-suggest next portions based on the student's last class
- **Beautiful Mushaf Display**: Quran pages render exactly like the printed Madani Mushaf

### For Students

- **View Progress**: See your class history and assigned portions
- **Review Mistakes**: View highlighted problem areas that need practice
- **Track Improvement**: See which mistakes you've corrected over time
- **Focus Areas**: See mistakes grouped by surah with most-repeated words

## Key Features

### Authentic Quran Rendering
QuranTrack uses QPC (Quran Printing Complex) fonts from the King Fahd Complex to render Quran pages pixel-perfect, exactly matching the printed Madani Mushaf. Each of the 604 pages has its own font for perfect accuracy.

### Smart Mistake Tracking
- Mistakes are tracked **globally per student** - mark a mistake once, see it highlighted everywhere
- **Word-level mistakes**: Highlight entire words
- **Character-level mistakes**: Highlight specific letters or harakat
- **Color-coded severity**: From amber (1x) to red (5x+) based on frequency

### Class Management
- **Three portion types**: Hifz (new memorization), Sabqi (recent review), Revision (long-term)
- **Flexible selection**: Assign portions by page, surah + ayah range, or juz
- **Flexible assignments**: Assign same portions to all students or customize per-student
- **Publish control**: Choose when students can see their class records

### Cross-Platform
- **Web App**: React + TypeScript + Tailwind CSS (desktop browsers)
- **Desktop App**: Tauri (Windows/macOS/Linux native installer)
- **Mobile App**: Flutter (Android/iOS)
- **Cloud Sync**: All data synced via Supabase across devices

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Tailwind CSS + Vite |
| Backend | FastAPI (Python) + SQLite |
| Desktop | Tauri v2 (Rust) |
| Mobile | Flutter (Dart) + Riverpod |
| Cloud Sync | Supabase (PostgreSQL + Auth + RLS) |

## Project Structure

```
Quran_App/
├── quran_backend/          # FastAPI backend
│   ├── main.py             # API endpoints
│   ├── auth/               # Auth module
│   ├── sync_service.py     # Supabase sync
│   ├── scripts/            # Utility scripts
│   │   ├── nuke_all_data.py      # Wipe all data (Supabase + local)
│   │   ├── create_test_users.py  # Create demo accounts
│   │   ├── clear_mistakes.py     # Clear mistakes only
│   │   ├── seed_database.py      # Seed test data
│   │   └── seed.js               # JS seed script
│   ├── app.db              # Local SQLite (users, classes, mistakes)
│   └── quran.db            # Quran text data (read-only)
│
├── quran_frontend/         # React web app
│   ├── src/
│   │   ├── pages/          # All page components
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # Auth & Theme contexts
│   │   └── lib/            # Supabase client, API, utilities
│   └── public/fonts/qpc/   # 604 QPC font files
│
├── quran_mobile/           # Flutter mobile app
│   ├── lib/
│   │   ├── core/           # Auth, network, database, services
│   │   ├── data/           # Models & repositories
│   │   └── presentation/   # Screens, providers, widgets
│   └── assets/fonts/qpc/   # 604 QPC font files (bundled)
│
└── docs/                   # Documentation
    ├── PROJECT_CHANGELOG.md          # Main reference — start here
    ├── PRODUCTION_READINESS.md       # Production checklist
    ├── Architecture/                 # System design docs
    ├── Technical Implementation Journey/  # How features were built
    ├── Guides/                       # Troubleshooting guides
    ├── Mockups/                      # Report design mockups
    └── Logs/                         # Development session logs
```

## Getting Started

```bash
# Backend
cd quran_backend && pip install -r requirements.txt && python main.py

# Frontend
cd quran_frontend && npm install && npm run dev

# Mobile
cd quran_mobile && flutter run
```

## Documentation

See [`docs/README.md`](docs/README.md) for a full navigation guide. Key docs:

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Documentation navigation guide |
| [PROJECT_CHANGELOG.md](docs/PROJECT_CHANGELOG.md) | Main reference guide — start here |
| [Architecture/](docs/Architecture/) | System design and planning docs |
| [Technical Implementation Journey/](docs/Technical%20Implementation%20Journey/) | How features were built |
| [Guides/](docs/Guides/) | Troubleshooting guides |
| [PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) | Production checklist & roadmap |
| [Logs/](docs/Logs/) | Development session logs |

## License

*TBD*

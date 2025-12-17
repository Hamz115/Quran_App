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
- **Beautiful Mushaf Display**: Quran pages render exactly like the printed Madani Mushaf

### For Students

- **View Progress**: See your class history and assigned portions
- **Review Mistakes**: View highlighted problem areas that need practice
- **Track Improvement**: See which mistakes you've corrected over time

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
- **Flexible assignments**: Assign different portions to different students
- **Publish control**: Choose when students can see their class records

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) + SQLite |
| Mobile | Flutter (Dart) |

## Project Structure

```
Quran_App/
├── quran_backend/        # FastAPI backend
├── quran_frontend/       # React web app
├── quran_mobile/         # Flutter mobile app
└── docs/                 # Documentation
```

## Documentation

For detailed documentation, see the `docs/` folder:

| Document | Description |
|----------|-------------|
| [PROJECT_CHANGELOG.md](docs/PROJECT_CHANGELOG.md) | Main reference guide - start here |
| [Architecture/](docs/Architecture/) | System design and planning docs |
| [Technical Implementation Journey/](docs/Technical%20Implementation%20Journey/) | How features were built |
| [Guides/](docs/Guides/) | Troubleshooting guides |

## Screenshots

*Coming soon*

## License

*TBD*

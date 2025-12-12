# QuranTrack

A Quran memorization and recitation tracking app for teachers and students.

## What is this?

QuranTrack helps Quran teachers track their students' recitation progress. Teachers can:
- Record class sessions with surah/ayah ranges
- Mark and track mistakes for each student
- Rate student performance
- Manage multiple students

Students can:
- View their class history
- See mistakes they need to review
- Practice with highlighted problem areas

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) + SQLite |
| Mobile | Flutter (Dart) |

## Quick Start

**Frontend:**
```bash
cd quran_frontend
npm install
npm run dev
```

**Backend:**
```bash
cd quran_backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

**Mobile:**
```bash
cd quran_mobile
flutter pub get
flutter run
```

## Project Structure

```
Quran_App/
├── docs/                 # Documentation
├── quran_backend/        # FastAPI backend
├── quran_frontend/       # React frontend
└── quran_mobile/         # Flutter mobile app
```

## Documentation

See the `docs/` folder for detailed documentation:
- [Project Changelog](docs/PROJECT_CHANGELOG.md) - Development history
- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md) - Implementation details
- [Architecture Blueprint](docs/QuranTrack%20Academy_%20Architecture%20Blueprint.md) - System design

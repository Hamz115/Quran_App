# QuranTrack Documentation

## Where to Start

**New to the project?** Read `PROJECT_CHANGELOG.md` first — it's the main reference covering all 15+ development phases with links to detailed docs.

## Documentation Map

```
docs/
├── PROJECT_CHANGELOG.md              # START HERE — all phases, features, links
├── PRODUCTION_READINESS.md           # Production checklist & roadmap
│
├── Architecture/                     # System design & planning
│   ├── QuranTrack_Academy_Architecture_Blueprint.md   # High-level system design
│   ├── Logical_Architecture_Blueprint_...md           # User roles & relationships
│   ├── Quran_Full_App.md                              # Full feature set planning
│   └── Supabase_Migration_Architecture.md             # Cloud migration blueprint
│
├── Technical Implementation Journey/ # How features were built
│   ├── Technical_Documentation.md    # Full API reference & DB schema
│   ├── Auth_System.md               # JWT auth, roles, login/signup
│   ├── Classes_And_Mistakes.md      # Class CRUD, mistake tracking logic
│   ├── Qpc_Quran_Rendering.md       # QPC font system (604 pages)
│   ├── Test_System.md               # Test scoring & tanbeeh algorithm
│   ├── Settings_Password_Reset.md   # Settings & password reset flows
│   ├── Light_Dark_Mode_Implementation.md  # Theme system
│   ├── Auth_Navigation_Fixes.md     # Auth bug fixes post-Supabase
│   │
│   ├── Supabase Implementation/     # Cloud database
│   │   ├── Implementation_Journey.md                  # Step-by-step migration
│   │   ├── Supabase_Reference.md                      # Schema & RLS policies
│   │   └── Supabase_Frontend_Integration_Reference.md # React integration
│   │
│   ├── Quran Reader/                # Rendering details
│   │   ├── WEB-READER-RENDERING-ISSUES.md   # Web rendering fixes
│   │   └── FLUTTER-RENDERING-REFERENCE.md   # Flutter rendering reference
│   │
│   └── Flutter App Overhaul/        # Mobile app rewrite (Phase 13)
│       ├── 00-OVERVIEW.md           # Architecture summary
│       ├── 01-THEME-SYSTEM.md       # Dark/light with AppColors
│       ├── 02-AUTHENTICATION.md     # Supabase auth in Flutter
│       ├── 03-NAVIGATION.md         # Bottom nav & routing
│       ├── 04-SCREENS.md            # All screen implementations
│       ├── 05-SHARED-WIDGETS.md     # Reusable widget library
│       └── 06-QURAN-READER.md       # QPC page-based reader
│
├── Guides/                           # Troubleshooting
│   ├── Font_Overflow_Fix_Guide.md   # Fixing page 586 overflow
│   ├── Page_Layout_Fix_Guide.md     # Fixing page layout issues
│   └── Seeding_Database.md          # Creating test data
│
└── Logs/                             # Development session logs
    ├── TEMPLATE.md                   # Session log template
    └── YYYY-MM-DD-NNN-description.md # Named by date + focus area
```

## Quick Links by Topic

| I want to... | Read this |
|--------------|-----------|
| Understand the full project history | `PROJECT_CHANGELOG.md` |
| Look up an API endpoint | `Technical Implementation Journey/Technical_Documentation.md` |
| Understand the database schema | `Technical Implementation Journey/Technical_Documentation.md` |
| Learn how QPC fonts work | `Technical Implementation Journey/Qpc_Quran_Rendering.md` |
| Understand Supabase setup | `Technical Implementation Journey/Supabase Implementation/` |
| Fix a Quran page rendering issue | `Guides/Font_Overflow_Fix_Guide.md` or `Page_Layout_Fix_Guide.md` |
| Understand the Flutter app | `Technical Implementation Journey/Flutter App Overhaul/00-OVERVIEW.md` |
| See what's needed for production | `PRODUCTION_READINESS.md` |
| Seed the database with test data | `Guides/Seeding_Database.md` |
| Create a session log | `Logs/TEMPLATE.md` → save in `Logs/` |

# Flutter Mobile App UI Overhaul

## Summary

Complete UI overhaul of the Flutter mobile app (`quran_mobile/`) to match the React web app design, implementing Supabase authentication, role-based navigation, and theme support.

**Duration:** Phases 1-7
**Status:** Complete

---

## Key Principles

1. **UI First** - Match the web app design pixel-perfect
2. **Local-First** - SQLite remains the primary database
3. **Supabase for Auth + Sync (Web)** - Phase 12 added local-first sync with Supabase for the React web app (classes, mistakes, performance sync to cloud). The Flutter mobile app still uses Supabase for authentication only; mobile data sync is a future enhancement.
4. **Mobile: Auth Only** - On mobile, Supabase handles login/signup; all data is stored locally in SQLite

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Flutter App                     │
├─────────────────────────────────────────────────┤
│  Presentation Layer                              │
│  ├── Screens (Dashboard, Classes, Reader, etc.)  │
│  ├── Providers (Riverpod state management)       │
│  └── Widgets (Shared UI components)              │
├─────────────────────────────────────────────────┤
│  Core Layer                                      │
│  ├── Auth (Supabase authentication)              │
│  ├── Sync (Cloud sync service)                   │
│  └── Config (Theme, colors, constants)           │
├─────────────────────────────────────────────────┤
│  Data Layer                                      │
│  ├── SQLite (Primary local database)             │
│  ├── Supabase (Auth; data sync on web only)      │
│  └── Repositories (Data access)                  │
└─────────────────────────────────────────────────┘
```

---

## Phase Summary

| Phase | Title | Description |
|-------|-------|-------------|
| 1 | Theme System | Dual theme (light/dark) with persistence |
| 2 | Supabase Auth | Authentication service with Supabase |
| 3 | Auth UI Screens | Login, Signup, Forgot Password screens |
| 4 | Role-based Navigation | Teacher/Student navigation with role banner |
| 5 | Dashboard Screens | Role-aware dashboard with personalized content |
| 6 | Classes & Reader | Role-aware Classes and Quran Reader screens |
| 7 | Shared Widgets | Common reusable UI components |

---

## Files Created

### Core Auth
```
lib/core/auth/supabase_config.dart       # Supabase initialization
lib/core/auth/auth_service.dart          # Auth operations wrapper
lib/data/models/app_user.dart            # User model with role
```

### Providers
```
lib/presentation/providers/auth_provider.dart    # Auth state management
lib/presentation/providers/theme_provider.dart   # Theme state (already existed)
```

### Auth Screens
```
lib/presentation/screens/auth/login_screen.dart
lib/presentation/screens/auth/signup_screen.dart
lib/presentation/screens/auth/forgot_password_screen.dart
```

### Shared Widgets
```
lib/presentation/widgets/common/common_widgets.dart
lib/presentation/widgets/common/gradient_button.dart
lib/presentation/widgets/common/icon_input_field.dart
lib/presentation/widgets/common/avatar_circle.dart
```

### Configuration
```
.env                    # Supabase credentials (not committed)
.env.example            # Example env file
```

---

## Files Modified

| File | Changes |
|------|---------|
| `lib/main.dart` | Supabase init, auth routing, role banner, nav items |
| `lib/config/app_colors.dart` | Added purple colors |
| `lib/presentation/screens/dashboard/dashboard_screen.dart` | Role-aware welcome, stats |
| `lib/presentation/screens/classes/classes_screen.dart` | Role-aware features |
| `lib/presentation/screens/reader/quran_reader_screen.dart` | Role-aware text/colors |
| `pubspec.yaml` | Added supabase_flutter, flutter_dotenv |
| `.gitignore` | Added .env exclusion |

---

## Dependencies Added

```yaml
dependencies:
  supabase_flutter: ^2.3.0    # Supabase authentication
  flutter_dotenv: ^5.1.0       # Environment configuration
```

---

## Role-Based Features

### Teacher View
- Cyan accent color throughout
- "Teacher View" banner
- Full CRUD on classes
- Can mark/review mistakes
- Sees "Manage your Halaqah" subtitle

### Student View
- Teal accent color throughout
- "Student View" banner
- Read-only class history
- Can view mistakes
- Sees "Track your progress" subtitle

---

## Theme Support

### Color Scheme

| Element | Dark Mode | Light Mode |
|---------|-----------|------------|
| Background | `#0f172a` | `#f8fafc` |
| Surface | `#1e293b` | `#ffffff` |
| Border | `#334155` | `#e2e8f0` |
| Text | `#f1f5f9` | `#1e293b` |
| Text Secondary | `#94a3b8` | `#64748b` |

### Usage Pattern
```dart
final isDarkMode = ref.watch(themeProvider);
final bgColor = AppColors.background(isDarkMode);
final textColor = AppColors.text(isDarkMode);
```

---

## Auth Flow

```
App Start
  │
  ├─► isLoading? ──► SplashScreen
  │
  ├─► isAuthenticated?
  │       │
  │       ├─► Yes ──► MainNavigation
  │       │            ├─► Dashboard
  │       │            ├─► Classes
  │       │            ├─► Reader
  │       │            └─► Settings
  │       │
  │       └─► No ──► LoginScreen
  │                   ├─► Sign In ──► MainNavigation
  │                   ├─► Sign Up ──► MainNavigation
  │                   └─► Forgot Password
```

---

## Documentation

| Document | Description |
|----------|-------------|
| `00-OVERVIEW.md` | This file - summary of the overhaul |
| `01-THEME-SYSTEM.md` | Theme implementation details |
| `02-AUTHENTICATION.md` | Supabase auth integration |
| `03-NAVIGATION.md` | Role-based navigation structure |
| `04-SCREENS.md` | Dashboard, Classes, Reader updates |
| `05-SHARED-WIDGETS.md` | Widget catalog and usage |

---

## Testing Checklist

- [x] Fresh install shows login screen
- [x] Login with valid credentials
- [x] Login with invalid credentials shows error
- [x] Signup as Teacher
- [x] Signup as Student
- [x] Toggle theme persists after restart
- [x] Navigate all tabs without crashes
- [x] Teacher can create/delete classes
- [x] Student sees read-only class view
- [x] Logout returns to login screen

---

## Future Enhancements

1. **Mobile Supabase Data Sync** - Web already has local-first sync (Phase 12); mobile still needs sync for classes, mistakes, and performance
2. **Push Notifications** - Class reminders, progress alerts
3. **Offline Support** - Full offline functionality with sync queue
4. **Student Management** - Teacher can manage multiple students

---

## Quick Start

1. Copy `.env.example` to `.env`
2. Add Supabase credentials
3. Run `flutter pub get`
4. Run `flutter run`

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Teacher | hamzaferoze115@gmail.com | 12345678 |
| Student | hamza@iiotsolutions.sa | 12345678 |

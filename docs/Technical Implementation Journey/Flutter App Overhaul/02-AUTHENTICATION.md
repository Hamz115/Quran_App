# Phase 2: Supabase Authentication

## Overview

Added Supabase authentication service to the Flutter mobile app. This provides login/signup functionality matching the web app, while keeping SQLite as the primary data store.

**Completed:** Phase 2 of Flutter App Overhaul

---

## Architecture Decision

**Auth Only, No Sync** - Supabase is used ONLY for authentication:
- Login/signup to enter the app
- User profiles stored in Supabase `profiles` table
- Local SQLite remains the primary data store
- Data sync with Supabase comes in a future phase

---

## Files Created

### 1. `lib/core/auth/supabase_config.dart`
Supabase initialization and configuration.

```dart
class SupabaseConfig {
  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';

  /// Initialize Supabase - call in main() before runApp()
  static Future<void> initialize() async {
    await dotenv.load(fileName: '.env');
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
  static GoTrueClient get auth => client.auth;
}
```

### 2. `lib/data/models/app_user.dart`
User model matching Supabase profiles table.

```dart
enum UserRole {
  teacher,
  student;

  static UserRole fromString(String? role) {
    switch (role?.toLowerCase()) {
      case 'teacher': return UserRole.teacher;
      case 'student':
      default: return UserRole.student;
    }
  }
}

class AppUser extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final UserRole role;
  final bool isVerified;
  final String? studentId;
  final DateTime createdAt;

  String get fullName => '$firstName $lastName'.trim();
  String get displayName => firstName.isNotEmpty ? firstName : email.split('@').first;

  factory AppUser.fromSupabase(Map<String, dynamic> profile) { ... }
  factory AppUser.fromAuthUser({ ... }) { ... }
}
```

### 3. `lib/core/auth/auth_service.dart`
Authentication service wrapping Supabase operations.

```dart
class AuthService {
  // Singleton pattern
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;

  // Auth operations
  Future<AppUser> signIn({required String email, required String password});
  Future<AppUser> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required UserRole role,
  });
  Future<void> signOut();
  Future<void> resetPassword(String email);
  Future<void> updatePassword(String newPassword);
  Future<AppUser> updateProfile({required String firstName, required String lastName});
  Future<AppUser?> getCurrentUser();

  // State
  Session? get currentSession;
  User? get currentAuthUser;
  bool get isLoggedIn;
  Stream<AuthState> get authStateChanges;
}
```

### 4. `lib/presentation/providers/auth_provider.dart`
Riverpod state management for auth.

```dart
/// Auth state (not to be confused with Supabase's AuthState)
class AppAuthState {
  final AppUser? user;
  final bool isLoading;
  final String? error;

  bool get isAuthenticated => user != null;
  bool get isVerified => user?.isVerified ?? false;
  bool get isTeacher => user?.role == UserRole.teacher;
  bool get isStudent => user?.role == UserRole.student;
}

/// Auth notifier with all auth operations
class AuthNotifier extends StateNotifier<AppAuthState> {
  Future<void> signIn({required String email, required String password});
  Future<void> signUp({ ... });
  Future<void> signOut();
  Future<void> resetPassword(String email);
  Future<void> updatePassword(String newPassword);
  Future<void> updateProfile({ ... });
  Future<void> refreshUser();
  void clearError();
}

// Providers
final authServiceProvider = Provider<AuthService>((ref) => AuthService());
final authProvider = StateNotifierProvider<AuthNotifier, AppAuthState>((ref) => ...);

// Convenience providers
final isAuthenticatedProvider = Provider<bool>((ref) => ref.watch(authProvider).isAuthenticated);
final currentUserProvider = Provider<AppUser?>((ref) => ref.watch(authProvider).user);
final isTeacherProvider = Provider<bool>((ref) => ref.watch(authProvider).isTeacher);
final isStudentProvider = Provider<bool>((ref) => ref.watch(authProvider).isStudent);
final authLoadingProvider = Provider<bool>((ref) => ref.watch(authProvider).isLoading);
```

### 5. `.env` and `.env.example`
Environment configuration for Supabase credentials.

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Files Modified

### 1. `pubspec.yaml`
Added dependencies:
```yaml
# Auth
supabase_flutter: ^2.3.0
flutter_dotenv: ^5.1.0
```

Added `.env` to assets:
```yaml
assets:
  - assets/databases/
  - .env
```

### 2. `lib/main.dart`
- Import auth providers
- Initialize Supabase in `main()`
- Added splash screen while auth state loads
- Prepared for Phase 3 auth-aware routing (commented TODO)

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SupabaseConfig.initialize();
  runApp(const ProviderScope(child: QuranLogbookApp()));
}

class QuranLogbookApp extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      home: authState.isLoading
          ? _SplashScreen(isDarkMode: isDarkMode)
          : const MainNavigation(),
      // TODO: Phase 3 - Add auth-aware routing
    );
  }
}
```

### 3. `.gitignore`
Added `.env` to prevent committing secrets:
```
# Environment files (keep .env.example)
.env
*.env.local
```

---

## Supabase Profile Schema

The app expects this schema in Supabase (created by database trigger on signup):

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key, matches auth.users.id |
| email | text | User email |
| name | text | Full name (first + last) |
| role | text | 'teacher' or 'student' |
| student_id | text? | Optional student ID |
| is_verified | boolean | Email verified status |
| created_at | timestamptz | Account creation time |

---

## How to Use Auth in Screens

### Check Authentication
```dart
class MyScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final isAuthenticated = ref.watch(isAuthenticatedProvider);
    final user = ref.watch(currentUserProvider);
    final isTeacher = ref.watch(isTeacherProvider);

    if (!isAuthenticated) {
      return const LoginScreen();
    }

    return Text('Welcome, ${user?.displayName}');
  }
}
```

### Perform Auth Actions
```dart
// Sign in
await ref.read(authProvider.notifier).signIn(
  email: 'user@example.com',
  password: 'password123',
);

// Sign up
await ref.read(authProvider.notifier).signUp(
  email: 'new@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.teacher,
);

// Sign out
await ref.read(authProvider.notifier).signOut();

// Update profile
await ref.read(authProvider.notifier).updateProfile(
  firstName: 'Jane',
  lastName: 'Smith',
);
```

### Handle Loading & Errors
```dart
class LoginScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    if (authState.isLoading) {
      return const CircularProgressIndicator();
    }

    if (authState.error != null) {
      // Show error snackbar or message
    }

    return LoginForm();
  }
}
```

---

## Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Run `flutter pub get`

---

## Testing

To verify auth works:

1. Run the app: `flutter run`
2. App should show splash screen briefly while checking auth
3. Since no login screen yet, it goes directly to MainNavigation
4. Check console for Supabase initialization logs

**Manual API testing** (using auth_service directly):
```dart
final authService = AuthService();
final user = await authService.signIn(
  email: 'test@example.com',
  password: 'test123',
);
print('Logged in as: ${user.fullName}');
```

---

## Known Issues

- Splash screen briefly shows even when already authenticated (expected)
- Auth-aware routing not yet implemented (Phase 3)
- `withOpacity` deprecation warnings (non-breaking)

---

## Phase 3: Auth UI Screens

### Files Created

#### 1. `lib/presentation/screens/auth/login_screen.dart`
Login screen matching web app design:
- **Background Image** - Same mosque/lantern image as React web app (`assets/images/background.jpg`)
- **Dark Gradient Overlay** - Ensures text readability (60%-80% opacity black gradient)
- **Full Quran Verse Header** - Al-Isra 17:9 in Arabic with English translation:
  - Arabic: "إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ..."
  - English: "Indeed, this Quran guides to that which is most suitable..."
- Split card layout: Form + Decorative panel
- Logo + "QuranTrack" branding
- "Assalamu Alaikum!" greeting
- Email input with envelope icon
- Password input with lock icon
- Demo accounts dropdown (Teacher 1, Teacher 2, Student)
- Gradient button (cyan -> teal)
- Theme toggle (top right)
- Links: Forgot Password, Create Account

**Updated 3 Feb 2026:** Fixed background image not covering full viewport on Flutter web by using Container with DecorationImage instead of Stack with Positioned.fill.

#### 2. `lib/presentation/screens/auth/signup_screen.dart`
Signup screen matching web app design:
- **Background Image** - Same as login screen
- **Dark Gradient Overlay** - Same as login screen
- **Full Quran Verse Header** - Same Al-Isra 17:9 ayah
- Role selector cards (Teacher/Student with icons)
- First Name + Last Name side by side
- Email, Username fields
- Password + Confirm Password side by side
- Role-based button color (cyan for teacher, teal for student)
- Form validation (email format, password length, username characters)
- Back button to login

#### 3. `lib/presentation/screens/auth/forgot_password_screen.dart`
Password reset screen:
- Email input for reset link
- Success state with "Check Your Email" message
- "Try with different email" option
- Back to Sign In button

### Files Modified

#### `lib/main.dart`
- Added import for `LoginScreen`
- Updated routing logic:
```dart
home: authState.isLoading
    ? _SplashScreen(isDarkMode: isDarkMode)
    : authState.isAuthenticated
        ? const MainNavigation()
        : const LoginScreen(),
```

#### `lib/config/app_colors.dart`
- Added purple500 and purple600 colors for student demo button

### UI Features

**Responsive Design:**
- Large screens (>600px): Side-by-side layout (form + decorative panel)
- Small screens: Stacked layout (decorative header + form)

**Theme Support:**
- All screens support light/dark mode
- Theme toggle button available on all auth screens
- Theme persists across screens

**Form Validation:**
- Email format validation
- Password minimum length (8 characters)
- Username characters (letters, numbers, underscores only)
- Password confirmation match

**Demo Accounts:**
- Teacher 1: hamzaferoze115@gmail.com / 12345678
- Teacher 2: hamzaferoze115+23@gmail.com / 12345678
- Student: hamza@iiotsolutions.sa / 12345678

### Auth Flow

```
App Start
  └── Check auth state (isLoading)
       ├── Loading → SplashScreen
       └── Loaded
            ├── Authenticated → MainNavigation
            └── Not authenticated → LoginScreen
                 ├── Sign In → MainNavigation
                 ├── Create Account → SignupScreen → MainNavigation
                 └── Forgot Password → ForgotPasswordScreen → LoginScreen
```

---

## Testing Auth Screens

1. Run the app: `flutter run`
2. App shows login screen (not authenticated)
3. Try demo accounts or sign up
4. Test theme toggle on all auth screens
5. Test form validation (empty fields, invalid email, short password)
6. Test forgot password flow
7. After successful login → Main navigation appears
8. Logout (from Settings) → Login screen appears

---

## Next Phase

**Phase 4: Role-based Navigation** - Implement teacher/student specific navigation and shells.

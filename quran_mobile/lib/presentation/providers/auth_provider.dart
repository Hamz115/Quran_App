import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../core/auth/auth_service.dart';
import '../../data/models/app_user.dart';

/// Auth state containing user and loading status
class AppAuthState {
  final AppUser? user;
  final bool isLoading;
  final String? error;

  const AppAuthState({
    this.user,
    this.isLoading = true,
    this.error,
  });

  bool get isAuthenticated => user != null;
  bool get isVerified => user?.isVerified ?? false;
  bool get isTeacher => user?.role == UserRole.teacher;
  bool get isStudent => user?.role == UserRole.student;

  AppAuthState copyWith({
    AppUser? user,
    bool? isLoading,
    String? error,
    bool clearUser = false,
    bool clearError = false,
  }) {
    return AppAuthState(
      user: clearUser ? null : (user ?? this.user),
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Auth state notifier managing authentication
class AuthNotifier extends StateNotifier<AppAuthState> {
  final AuthService _authService;
  StreamSubscription<supabase.AuthState>? _authSubscription;

  AuthNotifier(this._authService) : super(const AppAuthState()) {
    _init();
  }

  Future<void> _init() async {
    // Listen to auth state changes
    _authSubscription = _authService.authStateChanges.listen((authState) async {
      if (authState.event == supabase.AuthChangeEvent.signedIn ||
          authState.event == supabase.AuthChangeEvent.tokenRefreshed ||
          authState.event == supabase.AuthChangeEvent.userUpdated) {
        await _loadUser();
      } else if (authState.event == supabase.AuthChangeEvent.signedOut) {
        state = const AppAuthState(isLoading: false);
      }
    });

    // Load initial user
    await _loadUser();
  }

  Future<void> _loadUser() async {
    try {
      final user = await _authService.getCurrentUser();
      state = AppAuthState(user: user, isLoading: false);
    } catch (e) {
      state = AppAuthState(isLoading: false, error: e.toString());
    }
  }

  /// Sign in with email and password
  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final user = await _authService.signIn(
        email: email,
        password: password,
      );
      state = AppAuthState(user: user, isLoading: false);
    } on supabase.AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      rethrow;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  /// Sign up with email and password
  Future<void> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required UserRole role,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final user = await _authService.signUp(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        role: role,
      );
      state = AppAuthState(user: user, isLoading: false);
    } on supabase.AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      rethrow;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    state = state.copyWith(isLoading: true);

    try {
      await _authService.signOut();
      state = const AppAuthState(isLoading: false);
    } catch (e) {
      // Force clear state even if signOut fails
      state = const AppAuthState(isLoading: false);
    }
  }

  /// Reset password
  Future<void> resetPassword(String email) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      await _authService.resetPassword(email);
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  /// Update password
  Future<void> updatePassword(String newPassword) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      await _authService.updatePassword(newPassword);
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  /// Update profile
  Future<void> updateProfile({
    required String firstName,
    required String lastName,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final user = await _authService.updateProfile(
        firstName: firstName,
        lastName: lastName,
      );
      state = AppAuthState(user: user, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  /// Refresh user data
  Future<void> refreshUser() async {
    await _loadUser();
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(clearError: true);
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }
}

/// Auth service provider (singleton)
final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService();
});

/// Auth state provider
final authProvider = StateNotifierProvider<AuthNotifier, AppAuthState>((ref) {
  final authService = ref.watch(authServiceProvider);
  return AuthNotifier(authService);
});

/// Convenience providers for common checks
final isAuthenticatedProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isAuthenticated;
});

final currentUserProvider = Provider<AppUser?>((ref) {
  return ref.watch(authProvider).user;
});

final isTeacherProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isTeacher;
});

final isStudentProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isStudent;
});

final authLoadingProvider = Provider<bool>((ref) {
  return ref.watch(authProvider).isLoading;
});

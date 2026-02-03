import 'package:supabase_flutter/supabase_flutter.dart';
import 'supabase_config.dart';
import '../../data/models/app_user.dart';

/// Authentication service wrapping Supabase auth operations
class AuthService {
  /// Singleton instance
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  /// Supabase client shortcuts
  SupabaseClient get _client => SupabaseConfig.client;
  GoTrueClient get _auth => SupabaseConfig.auth;

  /// Current auth session
  Session? get currentSession => _auth.currentSession;

  /// Current Supabase user (raw)
  User? get currentAuthUser => _auth.currentUser;

  /// Check if user is logged in
  bool get isLoggedIn => currentSession != null;

  /// Stream of auth state changes
  Stream<AuthState> get authStateChanges => _auth.onAuthStateChange;

  /// Sign in with email and password
  Future<AppUser> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _auth.signInWithPassword(
      email: email,
      password: password,
    );

    if (response.user == null) {
      throw Exception('Sign in failed: No user returned');
    }

    // Fetch full profile
    final profile = await _fetchProfile(response.user!.id);
    return profile;
  }

  /// Sign up with email and password
  Future<AppUser> signUp({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required UserRole role,
  }) async {
    final fullName = '$firstName $lastName'.trim();

    final response = await _auth.signUp(
      email: email,
      password: password,
      data: {
        'name': fullName,
        'role': role.toJson(),
      },
    );

    if (response.user == null) {
      throw Exception('Sign up failed: No user returned');
    }

    // Return user from auth metadata (profile is created by Supabase trigger)
    return AppUser.fromAuthUser(
      id: response.user!.id,
      email: email,
      metadata: response.user!.userMetadata,
    );
  }

  /// Sign out
  Future<void> signOut() async {
    await _auth.signOut();
  }

  /// Reset password (send email)
  Future<void> resetPassword(String email) async {
    await _auth.resetPasswordForEmail(email);
  }

  /// Update password (when logged in)
  Future<void> updatePassword(String newPassword) async {
    await _auth.updateUser(UserAttributes(password: newPassword));
  }

  /// Update profile (first/last name)
  Future<AppUser> updateProfile({
    required String firstName,
    required String lastName,
  }) async {
    final user = currentAuthUser;
    if (user == null) {
      throw Exception('Not authenticated');
    }

    final fullName = '$firstName $lastName'.trim();

    await _client
        .from('profiles')
        .update({'name': fullName})
        .eq('id', user.id);

    // Return updated profile
    return _fetchProfile(user.id);
  }

  /// Fetch user profile from profiles table
  Future<AppUser> _fetchProfile(String userId) async {
    final response = await _client
        .from('profiles')
        .select()
        .eq('id', userId)
        .single();

    return AppUser.fromSupabase(response);
  }

  /// Get current user profile (if logged in)
  Future<AppUser?> getCurrentUser() async {
    final authUser = currentAuthUser;
    if (authUser == null) return null;

    try {
      return await _fetchProfile(authUser.id);
    } catch (e) {
      // Profile fetch failed - return minimal user from auth
      return AppUser.fromAuthUser(
        id: authUser.id,
        email: authUser.email ?? '',
        metadata: authUser.userMetadata,
      );
    }
  }

  /// Refresh the current session
  Future<void> refreshSession() async {
    await _auth.refreshSession();
  }
}

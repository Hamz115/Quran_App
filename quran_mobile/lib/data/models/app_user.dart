import 'package:equatable/equatable.dart';

/// User roles in the app (legacy — kept for backward compatibility)
/// In v2.0.0+, all users have the same account type.
/// "teacher" maps to "listener" (person evaluating recitation)
/// "student" maps to "reciter" (person reciting)
enum UserRole {
  teacher,  // Legacy: maps to "listener"
  student;  // Legacy: maps to "reciter"

  static UserRole fromString(String? role) {
    switch (role?.toLowerCase()) {
      case 'teacher':
        return UserRole.teacher;
      case 'student':
      default:
        // Default to teacher (listener) — everyone can create sessions now
        return UserRole.teacher;
    }
  }

  String toJson() => name;
}

/// App user model matching Supabase profiles table
class AppUser extends Equatable {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final UserRole role;
  final bool isVerified;
  final String? studentId;
  final DateTime createdAt;

  const AppUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.isVerified,
    this.studentId,
    required this.createdAt,
  });

  /// Full name (first + last)
  String get fullName => '$firstName $lastName'.trim();

  /// Display name (first name or email prefix if no name)
  String get displayName {
    if (firstName.isNotEmpty) return firstName;
    return email.split('@').first;
  }

  /// Create from Supabase profile data
  factory AppUser.fromSupabase(Map<String, dynamic> profile) {
    // Parse name into first and last
    final name = profile['name'] as String? ?? '';
    final nameParts = name.split(' ');
    final firstName = nameParts.isNotEmpty ? nameParts[0] : '';
    final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

    return AppUser(
      id: profile['id'] as String,
      email: profile['email'] as String? ?? '',
      firstName: firstName,
      lastName: lastName,
      role: UserRole.fromString(profile['role'] as String?),
      isVerified: true, // v2.0.0: always verified, no role-gating
      studentId: (profile['user_code'] ?? profile['student_id']) as String?,
      createdAt: DateTime.parse(
        profile['created_at'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  /// Create minimal user from Supabase auth user (when profile fetch fails)
  factory AppUser.fromAuthUser({
    required String id,
    required String email,
    Map<String, dynamic>? metadata,
  }) {
    final name = metadata?['name'] as String? ?? '';
    final nameParts = name.split(' ');
    final firstName = nameParts.isNotEmpty ? nameParts[0] : '';
    final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';

    return AppUser(
      id: id,
      email: email,
      firstName: firstName,
      lastName: lastName,
      role: UserRole.fromString(metadata?['role'] as String?),
      isVerified: true, // v2.0.0: always verified
      createdAt: DateTime.now(),
    );
  }

  AppUser copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    UserRole? role,
    bool? isVerified,
    String? studentId,
    DateTime? createdAt,
  }) {
    return AppUser(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      role: role ?? this.role,
      isVerified: isVerified ?? this.isVerified,
      studentId: studentId ?? this.studentId,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [id, email, firstName, lastName, role, isVerified, studentId, createdAt];
}

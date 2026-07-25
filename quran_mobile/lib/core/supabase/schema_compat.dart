import 'package:supabase_flutter/supabase_flutter.dart';

bool isSchemaCompatibilityError(Object error) {
  if (error is PostgrestException) {
    final code = error.code ?? '';
    final message = '${error.message} ${error.details ?? ''}';
    return {'42P01', '42703', 'PGRST200', 'PGRST204'}.contains(code) ||
        RegExp(
          r'listener_reciters|class_reciters|reciter_id|user_code|listener_id|relationship',
          caseSensitive: false,
        ).hasMatch(message);
  }

  final message = error.toString();
  return RegExp(
    r'listener_reciters|class_reciters|reciter_id|user_code|listener_id|relationship',
    caseSensitive: false,
  ).hasMatch(message);
}

Future<T> withLegacySchemaFallback<T>(
  Future<T> Function() primary,
  Future<T> Function() legacy,
) async {
  try {
    return await primary();
  } catch (error) {
    if (!isSchemaCompatibilityError(error)) rethrow;
    return legacy();
  }
}

String userCodeFromProfile(Map<String, dynamic> profile) {
  return (profile['user_code'] ?? profile['student_id'] ?? '').toString();
}

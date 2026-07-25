import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:quran_mobile/core/supabase/schema_compat.dart';

void main() {
  test('userCodeFromProfile prefers user_code and falls back to student_id', () {
    expect(userCodeFromProfile({'user_code': 'USR-123', 'student_id': 'STU-999'}), 'USR-123');
    expect(userCodeFromProfile({'student_id': 'STU-999'}), 'STU-999');
    expect(userCodeFromProfile({}), '');
  });

  test('isSchemaCompatibilityError detects missing v3 schema terms', () {
    final error = PostgrestException(
      message: 'Could not find relationship for class_reciters.reciter_id',
      code: 'PGRST200',
    );

    expect(isSchemaCompatibilityError(error), isTrue);
    expect(isSchemaCompatibilityError(Exception('network failed')), isFalse);
  });
}

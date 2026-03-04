import '../../core/database/database_helper.dart';
import '../models/mistake.dart';

class MistakeRepository {
  final DatabaseHelper _dbHelper;

  MistakeRepository({DatabaseHelper? dbHelper})
      : _dbHelper = dbHelper ?? DatabaseHelper.instance;

  // Get all mistakes
  Future<List<Mistake>> getAllMistakes() async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query('mistakes', orderBy: 'error_count DESC');
    return results.map((map) => Mistake.fromMap(map)).toList();
  }

  // Get mistakes for a surah
  Future<List<Mistake>> getMistakesForSurah(int surahNumber) async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'mistakes',
      where: 'surah_number = ?',
      whereArgs: [surahNumber],
    );
    return results.map((map) => Mistake.fromMap(map)).toList();
  }

  // Get mistakes with occurrences (for displaying in classroom)
  Future<List<Mistake>> getMistakesWithOccurrences() async {
    final db = await _dbHelper.appDatabase;
    final mistakeResults = await db.query('mistakes');

    final mistakes = <Mistake>[];
    for (final mistakeRow in mistakeResults) {
      final occurrences = await getOccurrencesForMistake(mistakeRow['id'] as int);
      mistakes.add(Mistake.fromMap(mistakeRow, occurrences: occurrences));
    }
    return mistakes;
  }

  // Get occurrences for a mistake
  Future<List<MistakeOccurrence>> getOccurrencesForMistake(int mistakeId) async {
    final db = await _dbHelper.appDatabase;
    final results = await db.rawQuery('''
      SELECT mo.*, c.date as class_date, c.day as class_day
      FROM mistake_occurrences mo
      LEFT JOIN classes c ON mo.class_id = c.id
      WHERE mo.mistake_id = ? AND mo.is_deleted = 0
      ORDER BY mo.occurred_at DESC
    ''', [mistakeId]);
    return results.map((map) => MistakeOccurrence.fromMap(map)).toList();
  }

  // Get mistakes for a specific student (by Supabase student_id)
  Future<List<Mistake>> getMistakesByStudentId(String studentId) async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'mistakes',
      where: 'student_id = ?',
      whereArgs: [studentId],
      orderBy: 'error_count DESC',
    );
    return results.map((map) => Mistake.fromMap(map)).toList();
  }

  // Get mistake occurrence IDs (supabase_id or local id) for a specific class
  Future<Set<String>> getOccurrencesForClass(String classId) async {
    final db = await _dbHelper.appDatabase;

    // Try matching by supabase_class_id first, then by local class_id
    List<Map<String, Object?>> results;
    final intClassId = int.tryParse(classId);

    if (intClassId != null) {
      // Could be either a local int ID or a numeric string
      results = await db.rawQuery('''
        SELECT m.supabase_id, m.id
        FROM mistake_occurrences mo
        JOIN mistakes m ON mo.mistake_id = m.id
        WHERE (mo.supabase_class_id = ? OR mo.class_id = ?) AND mo.is_deleted = 0
      ''', [classId, intClassId]);
    } else {
      // UUID string — match supabase_class_id
      results = await db.rawQuery('''
        SELECT m.supabase_id, m.id
        FROM mistake_occurrences mo
        JOIN mistakes m ON mo.mistake_id = m.id
        WHERE mo.supabase_class_id = ? AND mo.is_deleted = 0
      ''', [classId]);
    }

    return results.map((r) {
      final sbId = r['supabase_id'] as String?;
      return sbId ?? (r['id'] as int).toString();
    }).toSet();
  }

  // Get mistakes for previous classes (before the given class), grouped by class
  // Returns raw data maps for the provider to construct PreviousClassMistakeGroup objects
  Future<List<Map<String, dynamic>>> getMistakesForPreviousClasses(
    String teacherId,
    String classId,
  ) async {
    final db = await _dbHelper.appDatabase;

    // 1. Get current class date
    List<Map<String, Object?>> classData;
    final intClassId = int.tryParse(classId);
    if (intClassId != null) {
      classData = await db.query('classes',
        columns: ['date', 'teacher_id'],
        where: 'id = ? OR supabase_id = ?',
        whereArgs: [intClassId, classId],
        limit: 1,
      );
    } else {
      classData = await db.query('classes',
        columns: ['date', 'teacher_id'],
        where: 'supabase_id = ?',
        whereArgs: [classId],
        limit: 1,
      );
    }
    if (classData.isEmpty) return [];
    final currentDate = classData.first['date'] as String;

    // 2. Get all older classes by this teacher
    final olderClasses = await db.rawQuery('''
      SELECT id, supabase_id, date, day FROM classes
      WHERE teacher_id = ? AND date <= ? AND supabase_id != ? AND is_deleted = 0
      ORDER BY date DESC
    ''', [teacherId, currentDate, classId]);
    if (olderClasses.isEmpty) return [];

    // 3. For each older class, get its mistakes via occurrences
    final groups = <Map<String, dynamic>>[];
    for (final cls in olderClasses) {
      final localClassId = cls['id'] as int;
      final sbClassId = cls['supabase_id'] as String?;

      final mistakes = await db.rawQuery('''
        SELECT m.surah_number, m.ayah_number, m.word_index, m.word_text, m.error_count
        FROM mistake_occurrences mo
        JOIN mistakes m ON mo.mistake_id = m.id
        WHERE (mo.class_id = ? OR mo.supabase_class_id = ?) AND mo.is_deleted = 0
      ''', [localClassId, sbClassId ?? '']);

      if (mistakes.isNotEmpty) {
        groups.add({
          'date': cls['date'] as String? ?? '',
          'day': cls['day'] as String? ?? '',
          'mistakes': mistakes,
        });
      }
    }
    return groups;
  }

  // Add or increment mistake (with student_id and optional supabase class ID support)
  Future<Mistake> addMistake({
    required int surahNumber,
    required int ayahNumber,
    required int wordIndex,
    required String wordText,
    int? charIndex,
    int? classId,
    String? classSupabaseId,
    String? studentId,
  }) async {
    final db = await _dbHelper.appDatabase;

    // Check if mistake already exists (scoped to student_id)
    List<Map<String, Object?>> existing;
    if (studentId != null) {
      if (charIndex != null) {
        existing = await db.query(
          'mistakes',
          where: 'student_id = ? AND surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index = ?',
          whereArgs: [studentId, surahNumber, ayahNumber, wordIndex, charIndex],
        );
      } else {
        existing = await db.query(
          'mistakes',
          where: 'student_id = ? AND surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index IS NULL',
          whereArgs: [studentId, surahNumber, ayahNumber, wordIndex],
        );
      }
    } else {
      existing = await db.query(
        'mistakes',
        where: 'surah_number = ? AND ayah_number = ? AND word_index = ? AND (char_index = ? OR (char_index IS NULL AND ? IS NULL))',
        whereArgs: [surahNumber, ayahNumber, wordIndex, charIndex, charIndex],
      );
    }

    int mistakeId;
    int errorCount;

    if (existing.isNotEmpty) {
      // Increment error count
      mistakeId = existing.first['id'] as int;
      errorCount = (existing.first['error_count'] as int) + 1;

      await db.update(
        'mistakes',
        {
          'error_count': errorCount,
          'sync_status': 'pending',
        },
        where: 'id = ?',
        whereArgs: [mistakeId],
      );
    } else {
      // Create new mistake
      errorCount = 1;
      mistakeId = await db.insert('mistakes', {
        'surah_number': surahNumber,
        'ayah_number': ayahNumber,
        'word_index': wordIndex,
        'word_text': wordText,
        'char_index': charIndex,
        'student_id': studentId,
        'error_count': 1,
        'last_synced_count': 0,
        'sync_status': 'pending',
      });
    }

    // Add occurrence if class ID provided
    if (classId != null || classSupabaseId != null) {
      await db.insert('mistake_occurrences', {
        'mistake_id': mistakeId,
        'class_id': classId ?? 0,
        'supabase_class_id': classSupabaseId,
        'occurred_at': DateTime.now().toIso8601String(),
        'sync_status': 'pending',
        'is_deleted': 0,
      });
    }

    // Log sync operation
    await db.insert('sync_log', {
      'entity_type': 'mistake',
      'entity_id': mistakeId,
      'operation': existing.isEmpty ? 'create' : 'update',
      'created_at': DateTime.now().toIso8601String(),
      'sync_status': 'pending',
    });

    final result = await db.query('mistakes', where: 'id = ?', whereArgs: [mistakeId]);
    return Mistake.fromMap(result.first);
  }

  // Decrement mistake (or delete if count reaches 0)
  Future<Mistake?> removeMistake(int id) async {
    final db = await _dbHelper.appDatabase;

    final existing = await db.query('mistakes', where: 'id = ?', whereArgs: [id]);
    if (existing.isEmpty) return null;

    final currentCount = existing.first['error_count'] as int;

    if (currentCount <= 1) {
      // Delete the mistake
      await db.delete('mistakes', where: 'id = ?', whereArgs: [id]);
      await db.delete('mistake_occurrences', where: 'mistake_id = ?', whereArgs: [id]);
      return null;
    } else {
      // Decrement count
      await db.update(
        'mistakes',
        {
          'error_count': currentCount - 1,
          'sync_status': 'pending',
        },
        where: 'id = ?',
        whereArgs: [id],
      );

      // Remove most recent occurrence
      final occurrences = await db.query(
        'mistake_occurrences',
        where: 'mistake_id = ? AND is_deleted = 0',
        whereArgs: [id],
        orderBy: 'occurred_at DESC',
        limit: 1,
      );
      if (occurrences.isNotEmpty) {
        await db.update(
          'mistake_occurrences',
          {'is_deleted': 1, 'sync_status': 'pending'},
          where: 'id = ?',
          whereArgs: [occurrences.first['id']],
        );
      }

      final result = await db.query('mistakes', where: 'id = ?', whereArgs: [id]);
      return Mistake.fromMap(result.first);
    }
  }

  // Get top repeated mistakes
  Future<List<Mistake>> getTopRepeatedMistakes({int limit = 10}) async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'mistakes',
      where: 'error_count >= 2',
      orderBy: 'error_count DESC',
      limit: limit,
    );
    return results.map((map) => Mistake.fromMap(map)).toList();
  }

  // Get mistake stats by surah
  Future<Map<int, int>> getMistakeCountsBySurah() async {
    final db = await _dbHelper.appDatabase;
    final results = await db.rawQuery('''
      SELECT surah_number, SUM(error_count) as total
      FROM mistakes
      GROUP BY surah_number
      ORDER BY total DESC
    ''');

    return {
      for (final row in results)
        row['surah_number'] as int: row['total'] as int
    };
  }

  // Get pending sync mistakes
  Future<List<Mistake>> getPendingSyncMistakes() async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'mistakes',
      where: "sync_status = 'pending'",
    );
    return results.map((map) => Mistake.fromMap(map)).toList();
  }

  // Mark mistake as synced (with int server ID)
  Future<void> markMistakeSynced(int localId, int serverId, int syncedCount) async {
    final db = await _dbHelper.appDatabase;
    await db.update(
      'mistakes',
      {
        'server_id': serverId,
        'last_synced_count': syncedCount,
        'sync_status': 'synced',
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }

  // Mark mistake as synced with Supabase UUID
  Future<void> markMistakeSyncedWithSupabaseId(int localId, String supabaseId) async {
    final db = await _dbHelper.appDatabase;
    await db.update(
      'mistakes',
      {
        'supabase_id': supabaseId,
        'sync_status': 'synced',
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }

  // Get mistake by supabase_id
  Future<Mistake?> getMistakeBySupabaseId(String supabaseId) async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'mistakes',
      where: 'supabase_id = ?',
      whereArgs: [supabaseId],
    );
    if (results.isEmpty) return null;
    return Mistake.fromMap(results.first);
  }

  // Delete a mistake by its supabase_id
  Future<void> deleteMistakeBySupabaseId(String supabaseId) async {
    final db = await _dbHelper.appDatabase;
    // Find the local mistake first to clean up occurrences
    final existing = await db.query('mistakes', where: 'supabase_id = ?', whereArgs: [supabaseId]);
    if (existing.isNotEmpty) {
      final localId = existing.first['id'] as int;
      await db.delete('mistake_occurrences', where: 'mistake_id = ?', whereArgs: [localId]);
      await db.delete('mistakes', where: 'id = ?', whereArgs: [localId]);
    }
  }

  // Delete ALL mistakes (for testing/reset)
  Future<void> deleteAllMistakes() async {
    final db = await _dbHelper.appDatabase;
    await db.delete('mistake_occurrences');
    await db.delete('mistakes');
  }

  // Get overall stats
  Future<Map<String, dynamic>> getStats() async {
    final db = await _dbHelper.appDatabase;

    final totalClasses = await db.rawQuery('SELECT COUNT(*) as count FROM classes WHERE is_deleted = 0');
    final totalMistakes = await db.rawQuery('SELECT COUNT(*) as count FROM mistakes');
    final totalErrors = await db.rawQuery('SELECT SUM(error_count) as sum FROM mistakes');
    final repeatedMistakes = await db.rawQuery('SELECT COUNT(*) as count FROM mistakes WHERE error_count >= 2');

    return {
      'totalClasses': totalClasses.first['count'] as int? ?? 0,
      'totalMistakes': totalMistakes.first['count'] as int? ?? 0,
      'totalErrors': totalErrors.first['sum'] as int? ?? 0,
      'repeatedMistakes': repeatedMistakes.first['count'] as int? ?? 0,
    };
  }

  // Upsert mistake from server (for sync — supports both int server_id and string supabase_id)
  Future<void> upsertFromServer({
    int? serverId,
    String? supabaseId,
    String? studentId,
    required int surahNumber,
    required int ayahNumber,
    required int wordIndex,
    required String wordText,
    int? charIndex,
    required int errorCount,
  }) async {
    final db = await _dbHelper.appDatabase;

    // Check if mistake exists by supabase_id first
    List<Map<String, Object?>> existing = [];
    if (supabaseId != null) {
      existing = await db.query('mistakes', where: 'supabase_id = ?', whereArgs: [supabaseId]);
    }
    if (existing.isEmpty && serverId != null) {
      existing = await db.query('mistakes', where: 'server_id = ?', whereArgs: [serverId]);
    }

    if (existing.isNotEmpty) {
      // Update existing - take max error count
      final localCount = existing.first['error_count'] as int? ?? 0;
      final newCount = errorCount > localCount ? errorCount : localCount;
      await db.update(
        'mistakes',
        {
          if (supabaseId != null) 'supabase_id': supabaseId,
          if (studentId != null) 'student_id': studentId,
          'error_count': newCount,
          'sync_status': 'synced',
        },
        where: 'id = ?',
        whereArgs: [existing.first['id']],
      );
    } else {
      // Check if mistake exists by location (no server/supabase_id yet)
      List<Map<String, dynamic>> byLocation;
      if (studentId != null) {
        if (charIndex != null) {
          byLocation = await db.query('mistakes',
            where: 'student_id = ? AND surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index = ?',
            whereArgs: [studentId, surahNumber, ayahNumber, wordIndex, charIndex],
          );
        } else {
          byLocation = await db.query('mistakes',
            where: 'student_id = ? AND surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index IS NULL',
            whereArgs: [studentId, surahNumber, ayahNumber, wordIndex],
          );
        }
      } else {
        if (charIndex != null) {
          byLocation = await db.query('mistakes',
            where: 'surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index = ?',
            whereArgs: [surahNumber, ayahNumber, wordIndex, charIndex],
          );
        } else {
          byLocation = await db.query('mistakes',
            where: 'surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index IS NULL',
            whereArgs: [surahNumber, ayahNumber, wordIndex],
          );
        }
      }

      if (byLocation.isNotEmpty) {
        // Link to server and merge counts
        final localCount = byLocation.first['error_count'] as int? ?? 0;
        final newCount = errorCount > localCount ? errorCount : localCount;
        await db.update(
          'mistakes',
          {
            if (serverId != null) 'server_id': serverId,
            if (supabaseId != null) 'supabase_id': supabaseId,
            if (studentId != null) 'student_id': studentId,
            'error_count': newCount,
            'sync_status': 'synced',
          },
          where: 'id = ?',
          whereArgs: [byLocation.first['id']],
        );
      } else {
        // Create new mistake from server
        await db.insert('mistakes', {
          if (serverId != null) 'server_id': serverId,
          'supabase_id': supabaseId,
          'student_id': studentId,
          'surah_number': surahNumber,
          'ayah_number': ayahNumber,
          'word_index': wordIndex,
          'word_text': wordText,
          'char_index': charIndex,
          'error_count': errorCount,
          'last_synced_count': errorCount,
          'sync_status': 'synced',
        });
      }
    }
  }

  // Clear all local data (for logout/cleanup)
  Future<void> clearAllLocal() async {
    final db = await _dbHelper.appDatabase;
    await db.delete('mistake_occurrences');
    await db.delete('mistakes');
  }
}

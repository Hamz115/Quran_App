import '../../core/database/database_helper.dart';
import '../models/mistake.dart';
import '../models/class_session.dart';

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

  // Add or increment mistake
  Future<Mistake> addMistake({
    required int surahNumber,
    required int ayahNumber,
    required int wordIndex,
    required String wordText,
    int? charIndex,
    int? classId,
  }) async {
    final db = await _dbHelper.appDatabase;

    // Check if mistake already exists
    final existing = await db.query(
      'mistakes',
      where: 'surah_number = ? AND ayah_number = ? AND word_index = ? AND (char_index = ? OR (char_index IS NULL AND ? IS NULL))',
      whereArgs: [surahNumber, ayahNumber, wordIndex, charIndex, charIndex],
    );

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
        'error_count': 1,
        'last_synced_count': 0,
        'sync_status': 'pending',
      });
    }

    // Add occurrence if class ID provided
    if (classId != null) {
      await db.insert('mistake_occurrences', {
        'mistake_id': mistakeId,
        'class_id': classId,
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

  // Mark mistake as synced
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

  // Upsert mistake from server (for sync)
  Future<void> upsertFromServer({
    required int serverId,
    required int surahNumber,
    required int ayahNumber,
    required int wordIndex,
    required String wordText,
    int? charIndex,
    required int errorCount,
  }) async {
    final db = await _dbHelper.appDatabase;

    // Check if mistake exists by server_id
    final existing = await db.query(
      'mistakes',
      where: 'server_id = ?',
      whereArgs: [serverId],
    );

    if (existing.isNotEmpty) {
      // Update existing - take max error count
      final localCount = existing.first['error_count'] as int? ?? 0;
      final newCount = errorCount > localCount ? errorCount : localCount;
      await db.update(
        'mistakes',
        {
          'error_count': newCount,
          'sync_status': 'synced',
        },
        where: 'server_id = ?',
        whereArgs: [serverId],
      );
    } else {
      // Check if mistake exists by location (no server_id yet)
      List<Map<String, dynamic>> byLocation;
      if (charIndex != null) {
        byLocation = await db.query(
          'mistakes',
          where: 'surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index = ?',
          whereArgs: [surahNumber, ayahNumber, wordIndex, charIndex],
        );
      } else {
        byLocation = await db.query(
          'mistakes',
          where: 'surah_number = ? AND ayah_number = ? AND word_index = ? AND char_index IS NULL',
          whereArgs: [surahNumber, ayahNumber, wordIndex],
        );
      }

      if (byLocation.isNotEmpty) {
        // Link to server and merge counts
        final localCount = byLocation.first['error_count'] as int? ?? 0;
        final newCount = errorCount > localCount ? errorCount : localCount;
        await db.update(
          'mistakes',
          {
            'server_id': serverId,
            'error_count': newCount,
            'sync_status': 'synced',
          },
          where: 'id = ?',
          whereArgs: [byLocation.first['id']],
        );
      } else {
        // Create new mistake from server
        await db.insert('mistakes', {
          'server_id': serverId,
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
}

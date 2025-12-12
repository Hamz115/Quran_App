import 'package:uuid/uuid.dart';
import '../../core/database/database_helper.dart';
import '../models/class_session.dart';
import '../models/assignment.dart';

class ClassRepository {
  final DatabaseHelper _dbHelper;
  final _uuid = const Uuid();

  ClassRepository({DatabaseHelper? dbHelper})
      : _dbHelper = dbHelper ?? DatabaseHelper.instance;

  // Get all classes (not deleted)
  Future<List<ClassSession>> getAllClasses() async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'classes',
      where: 'is_deleted = 0',
      orderBy: 'date DESC',
    );

    final classes = <ClassSession>[];
    for (final row in results) {
      final assignments = await getAssignmentsForClass(row['id'] as int);
      classes.add(ClassSession.fromMap(row, assignments: assignments));
    }
    return classes;
  }

  // Get single class by ID
  Future<ClassSession?> getClass(int id) async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'classes',
      where: 'id = ? AND is_deleted = 0',
      whereArgs: [id],
    );
    if (results.isEmpty) return null;

    final assignments = await getAssignmentsForClass(id);
    return ClassSession.fromMap(results.first, assignments: assignments);
  }

  // Get assignments for a class
  Future<List<Assignment>> getAssignmentsForClass(int classId) async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'assignments',
      where: 'class_id = ? AND is_deleted = 0',
      whereArgs: [classId],
    );
    return results.map((map) => Assignment.fromMap(map)).toList();
  }

  // Create a new class with assignments
  Future<ClassSession> createClass({
    required String date,
    required String day,
    String? notes,
    required List<Map<String, dynamic>> assignments,
  }) async {
    final db = await _dbHelper.appDatabase;
    final now = DateTime.now().toIso8601String();
    final deviceId = _uuid.v4();

    // Insert class
    final classId = await db.insert('classes', {
      'date': date,
      'day': day,
      'notes': notes,
      'created_at': now,
      'updated_at': now,
      'sync_status': 'pending',
      'is_deleted': 0,
      'device_id': deviceId,
    });

    // Insert assignments
    for (final assignment in assignments) {
      await db.insert('assignments', {
        'class_id': classId,
        'type': assignment['type'],
        'start_surah': assignment['start_surah'],
        'end_surah': assignment['end_surah'],
        'start_ayah': assignment['start_ayah'],
        'end_ayah': assignment['end_ayah'],
        'sync_status': 'pending',
        'is_deleted': 0,
      });
    }

    // Log sync operation
    await _logSyncOperation(db, 'class', classId, 'create');

    return (await getClass(classId))!;
  }

  // Update class notes
  Future<void> updateClassNotes(int id, String? notes) async {
    final db = await _dbHelper.appDatabase;
    await db.update(
      'classes',
      {
        'notes': notes,
        'updated_at': DateTime.now().toIso8601String(),
        'sync_status': 'pending',
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    await _logSyncOperation(db, 'class', id, 'update');
  }

  // Update class performance
  Future<void> updateClassPerformance(int id, String? performance) async {
    final db = await _dbHelper.appDatabase;
    await db.update(
      'classes',
      {
        'performance': performance,
        'updated_at': DateTime.now().toIso8601String(),
        'sync_status': 'pending',
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    await _logSyncOperation(db, 'class', id, 'update');
  }

  // Add assignment to existing class
  Future<Assignment> addAssignment({
    required int classId,
    required String type,
    required int startSurah,
    required int endSurah,
    int? startAyah,
    int? endAyah,
  }) async {
    final db = await _dbHelper.appDatabase;
    final id = await db.insert('assignments', {
      'class_id': classId,
      'type': type,
      'start_surah': startSurah,
      'end_surah': endSurah,
      'start_ayah': startAyah,
      'end_ayah': endAyah,
      'sync_status': 'pending',
      'is_deleted': 0,
    });

    // Update class timestamp
    await db.update(
      'classes',
      {
        'updated_at': DateTime.now().toIso8601String(),
        'sync_status': 'pending',
      },
      where: 'id = ?',
      whereArgs: [classId],
    );

    await _logSyncOperation(db, 'assignment', id, 'create');

    final results = await db.query('assignments', where: 'id = ?', whereArgs: [id]);
    return Assignment.fromMap(results.first);
  }

  // Update assignment
  Future<void> updateAssignment(int id, Map<String, dynamic> updates) async {
    final db = await _dbHelper.appDatabase;
    updates['sync_status'] = 'pending';
    await db.update('assignments', updates, where: 'id = ?', whereArgs: [id]);
    await _logSyncOperation(db, 'assignment', id, 'update');
  }

  // Delete class (soft delete)
  Future<void> deleteClass(int id) async {
    final db = await _dbHelper.appDatabase;
    await db.update(
      'classes',
      {
        'is_deleted': 1,
        'updated_at': DateTime.now().toIso8601String(),
        'sync_status': 'pending',
      },
      where: 'id = ?',
      whereArgs: [id],
    );
    await _logSyncOperation(db, 'class', id, 'delete');
  }

  // Get classes with filter
  Future<List<ClassSession>> getClassesByType(String type) async {
    final db = await _dbHelper.appDatabase;

    // Get class IDs that have assignments of this type
    final assignmentResults = await db.query(
      'assignments',
      columns: ['DISTINCT class_id'],
      where: 'type = ? AND is_deleted = 0',
      whereArgs: [type],
    );

    if (assignmentResults.isEmpty) return [];

    final classIds = assignmentResults.map((r) => r['class_id'] as int).toList();
    final placeholders = List.filled(classIds.length, '?').join(',');

    final classResults = await db.query(
      'classes',
      where: 'id IN ($placeholders) AND is_deleted = 0',
      whereArgs: classIds,
      orderBy: 'date DESC',
    );

    final classes = <ClassSession>[];
    for (final row in classResults) {
      final assignments = await getAssignmentsForClass(row['id'] as int);
      classes.add(ClassSession.fromMap(row, assignments: assignments));
    }
    return classes;
  }

  // Get pending sync items
  Future<List<ClassSession>> getPendingSyncClasses() async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'classes',
      where: "sync_status = 'pending'",
    );

    final classes = <ClassSession>[];
    for (final row in results) {
      final assignments = await getAssignmentsForClass(row['id'] as int);
      classes.add(ClassSession.fromMap(row, assignments: assignments));
    }
    return classes;
  }

  // Mark as synced
  Future<void> markClassSynced(int localId, int serverId) async {
    final db = await _dbHelper.appDatabase;
    await db.update(
      'classes',
      {
        'server_id': serverId,
        'sync_status': 'synced',
      },
      where: 'id = ?',
      whereArgs: [localId],
    );
  }

  // Get class by server ID
  Future<ClassSession?> getClassByServerId(int serverId) async {
    final db = await _dbHelper.appDatabase;
    final results = await db.query(
      'classes',
      where: 'server_id = ?',
      whereArgs: [serverId],
    );
    if (results.isEmpty) return null;
    final assignments = await getAssignmentsForClass(results.first['id'] as int);
    return ClassSession.fromMap(results.first, assignments: assignments);
  }

  // Create class from server data
  Future<ClassSession> createClassFromServer({
    required int serverId,
    required String date,
    required String day,
    String? notes,
    required List<dynamic> assignments,
  }) async {
    final db = await _dbHelper.appDatabase;
    final now = DateTime.now().toIso8601String();

    // Insert class with server_id
    final classId = await db.insert('classes', {
      'server_id': serverId,
      'date': date,
      'day': day,
      'notes': notes,
      'created_at': now,
      'updated_at': now,
      'sync_status': 'synced',
      'is_deleted': 0,
    });

    // Insert assignments
    for (final assignment in assignments) {
      await db.insert('assignments', {
        'class_id': classId,
        'type': assignment['type'],
        'start_surah': assignment['start_surah'],
        'end_surah': assignment['end_surah'],
        'start_ayah': assignment['start_ayah'],
        'end_ayah': assignment['end_ayah'],
        'sync_status': 'synced',
        'is_deleted': 0,
      });
    }

    return (await getClass(classId))!;
  }

  Future<void> _logSyncOperation(dynamic db, String entityType, int entityId, String operation) async {
    await db.insert('sync_log', {
      'entity_type': entityType,
      'entity_id': entityId,
      'operation': operation,
      'created_at': DateTime.now().toIso8601String(),
      'sync_status': 'pending',
    });
  }
}

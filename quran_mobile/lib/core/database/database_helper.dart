import 'dart:io';
import 'package:flutter/services.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';
import '../../config/constants.dart';

class DatabaseHelper {
  static DatabaseHelper? _instance;
  static Database? _quranDb;
  static Database? _appDb;
  static Database? _qpcLayoutDb;
  static Database? _qpcWordsDb;

  DatabaseHelper._();

  static DatabaseHelper get instance {
    _instance ??= DatabaseHelper._();
    return _instance!;
  }

  // Get Quran database (read-only, bundled asset)
  Future<Database> get quranDatabase async {
    if (_quranDb != null) return _quranDb!;
    _quranDb = await _initQuranDatabase();
    return _quranDb!;
  }

  // Get App database (read-write, local storage)
  Future<Database> get appDatabase async {
    if (_appDb != null) return _appDb!;
    _appDb = await _initAppDatabase();
    return _appDb!;
  }

  // Get QPC v2 layout database (read-only, bundled asset)
  Future<Database> get qpcLayoutDatabase async {
    if (_qpcLayoutDb != null) return _qpcLayoutDb!;
    _qpcLayoutDb = await _initBundledDatabase(AppConstants.qpcLayoutDbName);
    return _qpcLayoutDb!;
  }

  // Get QPC v2 words database (read-only, bundled asset)
  Future<Database> get qpcWordsDatabase async {
    if (_qpcWordsDb != null) return _qpcWordsDb!;
    _qpcWordsDb = await _initBundledDatabase(AppConstants.qpcWordsDbName);
    return _qpcWordsDb!;
  }

  Future<Database> _initQuranDatabase() async {
    return _initBundledDatabase(AppConstants.quranDbName);
  }

  /// Copy a bundled database from assets if it doesn't exist locally, then open read-only.
  Future<Database> _initBundledDatabase(String dbName) async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, dbName);

    // Check if database already exists
    final exists = await databaseExists(path);

    if (!exists) {
      // Make sure the parent directory exists
      try {
        await Directory(dirname(path)).create(recursive: true);
      } catch (_) {}

      // Copy from assets
      final data = await rootBundle.load('assets/databases/$dbName');
      final bytes = data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes);
      await File(path).writeAsBytes(bytes, flush: true);
    }

    return await openDatabase(path, readOnly: true);
  }

  Future<Database> _initAppDatabase() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, AppConstants.appDbName);

    return await openDatabase(
      path,
      version: 6,
      onCreate: _createAppDatabase,
      onUpgrade: _upgradeAppDatabase,
    );
  }

  Future<void> _createAppDatabase(Database db, int version) async {
    // Classes table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        supabase_id TEXT,
        teacher_id TEXT,
        listener_id TEXT,
        date TEXT NOT NULL,
        day TEXT NOT NULL,
        notes TEXT,
        performance TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        is_deleted INTEGER DEFAULT 0,
        device_id TEXT
      )
    ''');

    // Assignments table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        supabase_id TEXT,
        class_id INTEGER NOT NULL,
        server_class_id INTEGER,
        type TEXT NOT NULL CHECK(type IN ('hifz', 'sabqi', 'revision')),
        start_surah INTEGER NOT NULL,
        end_surah INTEGER NOT NULL,
        start_ayah INTEGER,
        end_ayah INTEGER,
        student_id TEXT,
        reciter_id TEXT,
        sync_status TEXT DEFAULT 'pending',
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
      )
    ''');

    // Mistakes table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS mistakes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        supabase_id TEXT,
        student_id TEXT,
        reciter_id TEXT,
        surah_number INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        word_index INTEGER NOT NULL,
        word_text TEXT NOT NULL,
        char_index INTEGER,
        error_count INTEGER DEFAULT 1,
        last_synced_count INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        UNIQUE(student_id, surah_number, ayah_number, word_index, char_index)
      )
    ''');

    // Mistake occurrences table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS mistake_occurrences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        supabase_id TEXT,
        mistake_id INTEGER NOT NULL,
        server_mistake_id INTEGER,
        supabase_mistake_id TEXT,
        class_id INTEGER NOT NULL,
        server_class_id INTEGER,
        supabase_class_id TEXT,
        occurred_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sync_status TEXT DEFAULT 'pending',
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (mistake_id) REFERENCES mistakes(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
      )
    ''');

    // Sync log table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT,
        sync_status TEXT DEFAULT 'pending'
      )
    ''');

    // Sync metadata table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS sync_metadata (
        entity_type TEXT PRIMARY KEY,
        last_sync_at TEXT,
        last_server_timestamp TEXT
      )
    ''');

    // Create indexes
    await db.execute('CREATE INDEX IF NOT EXISTS idx_classes_sync ON classes(sync_status)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(date DESC)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_classes_supabase_id ON classes(supabase_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_supabase_id ON assignments(supabase_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_surah ON mistakes(surah_number)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_sync ON mistakes(sync_status)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_supabase_id ON mistakes(supabase_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_student_id ON mistakes(student_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_reciter_id ON assignments(reciter_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_reciter_id ON mistakes(reciter_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_occurrences_mistake ON mistake_occurrences(mistake_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_occurrences_class ON mistake_occurrences(class_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_occurrences_supabase_class ON mistake_occurrences(supabase_class_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(sync_status)');
  }

  Future<void> _upgradeAppDatabase(Database db, int oldVersion, int newVersion) async {
    // Version 2: Add performance column to classes
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE classes ADD COLUMN performance TEXT');
    }
    // Version 3: Add supabase_id, teacher_id, student_id columns for local-first sync
    if (oldVersion < 3) {
      await _migrateToVersion3(db);
    }
    // Version 4: Add student_id column to assignments for per-student portions
    if (oldVersion < 4) {
      final cols = await db.rawQuery("PRAGMA table_info('assignments')");
      final colNames = cols.map((c) => c['name'] as String).toSet();
      if (!colNames.contains('student_id')) {
        await db.execute('ALTER TABLE assignments ADD COLUMN student_id TEXT');
      }
    }
    // Version 5: Add listener_id column for unified role model (v2.0.0)
    if (oldVersion < 5) {
      final cols = await db.rawQuery("PRAGMA table_info('classes')");
      final colNames = cols.map((c) => c['name'] as String).toSet();
      if (!colNames.contains('listener_id')) {
        await db.execute('ALTER TABLE classes ADD COLUMN listener_id TEXT');
        await db.execute('UPDATE classes SET listener_id = teacher_id WHERE listener_id IS NULL');
      }
    }
    // Version 6: Add canonical reciter_id aliases for listener/reciter schema v3.
    if (oldVersion < 6) {
      await _migrateToVersion6(db);
    }
  }

  Future<void> _migrateToVersion6(Database db) async {
    final assignmentColumns = await db.rawQuery("PRAGMA table_info('assignments')");
    final assignmentColNames = assignmentColumns.map((c) => c['name'] as String).toSet();
    if (!assignmentColNames.contains('reciter_id')) {
      await db.execute('ALTER TABLE assignments ADD COLUMN reciter_id TEXT');
    }
    await db.execute('UPDATE assignments SET reciter_id = student_id WHERE reciter_id IS NULL AND student_id IS NOT NULL');

    final mistakeColumns = await db.rawQuery("PRAGMA table_info('mistakes')");
    final mistakeColNames = mistakeColumns.map((c) => c['name'] as String).toSet();
    if (!mistakeColNames.contains('reciter_id')) {
      await db.execute('ALTER TABLE mistakes ADD COLUMN reciter_id TEXT');
    }
    await db.execute('UPDATE mistakes SET reciter_id = student_id WHERE reciter_id IS NULL AND student_id IS NOT NULL');

    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_reciter_id ON assignments(reciter_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_reciter_id ON mistakes(reciter_id)');
  }

  Future<void> _migrateToVersion3(Database db) async {
    // Add supabase_id and teacher_id to classes
    final classColumns = await db.rawQuery("PRAGMA table_info('classes')");
    final classColNames = classColumns.map((c) => c['name'] as String).toSet();
    if (!classColNames.contains('supabase_id')) {
      await db.execute('ALTER TABLE classes ADD COLUMN supabase_id TEXT');
    }
    if (!classColNames.contains('teacher_id')) {
      await db.execute('ALTER TABLE classes ADD COLUMN teacher_id TEXT');
    }

    // Add supabase_id to assignments
    final assignmentColumns = await db.rawQuery("PRAGMA table_info('assignments')");
    final assignmentColNames = assignmentColumns.map((c) => c['name'] as String).toSet();
    if (!assignmentColNames.contains('supabase_id')) {
      await db.execute('ALTER TABLE assignments ADD COLUMN supabase_id TEXT');
    }

    // Add supabase_id and student_id to mistakes
    final mistakeColumns = await db.rawQuery("PRAGMA table_info('mistakes')");
    final mistakeColNames = mistakeColumns.map((c) => c['name'] as String).toSet();
    if (!mistakeColNames.contains('supabase_id')) {
      await db.execute('ALTER TABLE mistakes ADD COLUMN supabase_id TEXT');
    }
    if (!mistakeColNames.contains('student_id')) {
      await db.execute('ALTER TABLE mistakes ADD COLUMN student_id TEXT');
    }

    // Add supabase_id and string class/mistake IDs to mistake_occurrences
    final occColumns = await db.rawQuery("PRAGMA table_info('mistake_occurrences')");
    final occColNames = occColumns.map((c) => c['name'] as String).toSet();
    if (!occColNames.contains('supabase_id')) {
      await db.execute('ALTER TABLE mistake_occurrences ADD COLUMN supabase_id TEXT');
    }
    if (!occColNames.contains('supabase_mistake_id')) {
      await db.execute('ALTER TABLE mistake_occurrences ADD COLUMN supabase_mistake_id TEXT');
    }
    if (!occColNames.contains('supabase_class_id')) {
      await db.execute('ALTER TABLE mistake_occurrences ADD COLUMN supabase_class_id TEXT');
    }

    // Create indexes for new columns
    await db.execute('CREATE INDEX IF NOT EXISTS idx_classes_supabase_id ON classes(supabase_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_supabase_id ON mistakes(supabase_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_student_id ON mistakes(student_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_supabase_id ON assignments(supabase_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_occurrences_supabase_class ON mistake_occurrences(supabase_class_id)');
  }

  // Close databases
  Future<void> close() async {
    if (_quranDb != null) {
      await _quranDb!.close();
      _quranDb = null;
    }
    if (_appDb != null) {
      await _appDb!.close();
      _appDb = null;
    }
    if (_qpcLayoutDb != null) {
      await _qpcLayoutDb!.close();
      _qpcLayoutDb = null;
    }
    if (_qpcWordsDb != null) {
      await _qpcWordsDb!.close();
      _qpcWordsDb = null;
    }
  }
}

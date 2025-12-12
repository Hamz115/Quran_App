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

  Future<Database> _initQuranDatabase() async {
    final documentsDirectory = await getApplicationDocumentsDirectory();
    final path = join(documentsDirectory.path, AppConstants.quranDbName);

    // Check if database already exists
    final exists = await databaseExists(path);

    if (!exists) {
      // Make sure the parent directory exists
      try {
        await Directory(dirname(path)).create(recursive: true);
      } catch (_) {}

      // Copy from assets
      final data = await rootBundle.load('assets/databases/${AppConstants.quranDbName}');
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
      version: 2,
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
        class_id INTEGER NOT NULL,
        server_class_id INTEGER,
        type TEXT NOT NULL CHECK(type IN ('hifz', 'sabqi', 'revision')),
        start_surah INTEGER NOT NULL,
        end_surah INTEGER NOT NULL,
        start_ayah INTEGER,
        end_ayah INTEGER,
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
        surah_number INTEGER NOT NULL,
        ayah_number INTEGER NOT NULL,
        word_index INTEGER NOT NULL,
        word_text TEXT NOT NULL,
        char_index INTEGER,
        error_count INTEGER DEFAULT 1,
        last_synced_count INTEGER DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        UNIQUE(surah_number, ayah_number, word_index, char_index)
      )
    ''');

    // Mistake occurrences table
    await db.execute('''
      CREATE TABLE IF NOT EXISTS mistake_occurrences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id INTEGER,
        mistake_id INTEGER NOT NULL,
        server_mistake_id INTEGER,
        class_id INTEGER NOT NULL,
        server_class_id INTEGER,
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
    await db.execute('CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_surah ON mistakes(surah_number)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_mistakes_sync ON mistakes(sync_status)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_occurrences_mistake ON mistake_occurrences(mistake_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_occurrences_class ON mistake_occurrences(class_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(sync_status)');
  }

  Future<void> _upgradeAppDatabase(Database db, int oldVersion, int newVersion) async {
    // Version 2: Add performance column to classes
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE classes ADD COLUMN performance TEXT');
    }
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
  }
}

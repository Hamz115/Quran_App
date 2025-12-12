import 'package:equatable/equatable.dart';
import 'class_session.dart';

class Mistake extends Equatable {
  final int? id;
  final int? serverId;
  final int surahNumber;
  final int ayahNumber;
  final int wordIndex;
  final String wordText;
  final int? charIndex; // For character-level mistakes (harakat)
  final int errorCount;
  final int lastSyncedCount; // For sync conflict resolution
  final SyncStatus syncStatus;
  final List<MistakeOccurrence> occurrences;

  const Mistake({
    this.id,
    this.serverId,
    required this.surahNumber,
    required this.ayahNumber,
    required this.wordIndex,
    required this.wordText,
    this.charIndex,
    this.errorCount = 1,
    this.lastSyncedCount = 0,
    this.syncStatus = SyncStatus.pending,
    this.occurrences = const [],
  });

  factory Mistake.fromMap(Map<String, dynamic> map, {List<MistakeOccurrence>? occurrences}) {
    return Mistake(
      id: map['id'] as int?,
      serverId: map['server_id'] as int?,
      surahNumber: map['surah_number'] as int,
      ayahNumber: map['ayah_number'] as int,
      wordIndex: map['word_index'] as int,
      wordText: map['word_text'] as String,
      charIndex: map['char_index'] as int?,
      errorCount: map['error_count'] as int? ?? 1,
      lastSyncedCount: map['last_synced_count'] as int? ?? 0,
      syncStatus: _parseSyncStatus(map['sync_status'] as String?),
      occurrences: occurrences ?? [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      'surah_number': surahNumber,
      'ayah_number': ayahNumber,
      'word_index': wordIndex,
      'word_text': wordText,
      'char_index': charIndex,
      'error_count': errorCount,
      'last_synced_count': lastSyncedCount,
      'sync_status': syncStatus.name,
    };
  }

  Map<String, dynamic> toSyncMap() {
    return {
      'local_id': id,
      'server_id': serverId,
      'surah_number': surahNumber,
      'ayah_number': ayahNumber,
      'word_index': wordIndex,
      'word_text': wordText,
      'char_index': charIndex,
      'error_count': errorCount,
      'is_deleted': false,
    };
  }

  Mistake copyWith({
    int? id,
    int? serverId,
    int? surahNumber,
    int? ayahNumber,
    int? wordIndex,
    String? wordText,
    int? charIndex,
    int? errorCount,
    int? lastSyncedCount,
    SyncStatus? syncStatus,
    List<MistakeOccurrence>? occurrences,
  }) {
    return Mistake(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      surahNumber: surahNumber ?? this.surahNumber,
      ayahNumber: ayahNumber ?? this.ayahNumber,
      wordIndex: wordIndex ?? this.wordIndex,
      wordText: wordText ?? this.wordText,
      charIndex: charIndex ?? this.charIndex,
      errorCount: errorCount ?? this.errorCount,
      lastSyncedCount: lastSyncedCount ?? this.lastSyncedCount,
      syncStatus: syncStatus ?? this.syncStatus,
      occurrences: occurrences ?? this.occurrences,
    );
  }

  // Check if this is a character-level mistake
  bool get isCharacterLevel => charIndex != null;

  // Get severity level (1-5) for color coding
  int get severityLevel {
    if (errorCount >= 5) return 5;
    if (errorCount >= 4) return 4;
    if (errorCount >= 3) return 3;
    if (errorCount >= 2) return 2;
    return 1;
  }

  static SyncStatus _parseSyncStatus(String? status) {
    switch (status) {
      case 'synced':
        return SyncStatus.synced;
      case 'conflict':
        return SyncStatus.conflict;
      default:
        return SyncStatus.pending;
    }
  }

  @override
  List<Object?> get props => [id, surahNumber, ayahNumber, wordIndex, charIndex, errorCount];
}

class MistakeOccurrence extends Equatable {
  final int? id;
  final int? serverId;
  final int mistakeId;
  final int? serverMistakeId;
  final int classId;
  final int? serverClassId;
  final String occurredAt;
  final SyncStatus syncStatus;
  final bool isDeleted;

  // Optional class info for display
  final String? classDate;
  final String? classDay;

  const MistakeOccurrence({
    this.id,
    this.serverId,
    required this.mistakeId,
    this.serverMistakeId,
    required this.classId,
    this.serverClassId,
    required this.occurredAt,
    this.syncStatus = SyncStatus.pending,
    this.isDeleted = false,
    this.classDate,
    this.classDay,
  });

  factory MistakeOccurrence.fromMap(Map<String, dynamic> map) {
    return MistakeOccurrence(
      id: map['id'] as int?,
      serverId: map['server_id'] as int?,
      mistakeId: map['mistake_id'] as int,
      serverMistakeId: map['server_mistake_id'] as int?,
      classId: map['class_id'] as int,
      serverClassId: map['server_class_id'] as int?,
      occurredAt: map['occurred_at'] as String? ?? DateTime.now().toIso8601String(),
      syncStatus: _parseSyncStatus(map['sync_status'] as String?),
      isDeleted: (map['is_deleted'] as int?) == 1,
      classDate: map['class_date'] as String?,
      classDay: map['class_day'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      'mistake_id': mistakeId,
      if (serverMistakeId != null) 'server_mistake_id': serverMistakeId,
      'class_id': classId,
      if (serverClassId != null) 'server_class_id': serverClassId,
      'occurred_at': occurredAt,
      'sync_status': syncStatus.name,
      'is_deleted': isDeleted ? 1 : 0,
    };
  }

  static SyncStatus _parseSyncStatus(String? status) {
    switch (status) {
      case 'synced':
        return SyncStatus.synced;
      case 'conflict':
        return SyncStatus.conflict;
      default:
        return SyncStatus.pending;
    }
  }

  @override
  List<Object?> get props => [id, mistakeId, classId, occurredAt];
}

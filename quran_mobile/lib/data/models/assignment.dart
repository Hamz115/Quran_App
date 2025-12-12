import 'package:equatable/equatable.dart';
import 'class_session.dart';

class Assignment extends Equatable {
  final int? id;
  final int? serverId;
  final int classId;
  final int? serverClassId;
  final String type; // 'hifz', 'sabqi', 'revision'
  final int startSurah;
  final int endSurah;
  final int? startAyah;
  final int? endAyah;
  final SyncStatus syncStatus;
  final bool isDeleted;

  const Assignment({
    this.id,
    this.serverId,
    required this.classId,
    this.serverClassId,
    required this.type,
    required this.startSurah,
    required this.endSurah,
    this.startAyah,
    this.endAyah,
    this.syncStatus = SyncStatus.pending,
    this.isDeleted = false,
  });

  factory Assignment.fromMap(Map<String, dynamic> map) {
    return Assignment(
      id: map['id'] as int?,
      serverId: map['server_id'] as int?,
      classId: map['class_id'] as int,
      serverClassId: map['server_class_id'] as int?,
      type: map['type'] as String,
      startSurah: map['start_surah'] as int,
      endSurah: map['end_surah'] as int,
      startAyah: map['start_ayah'] as int?,
      endAyah: map['end_ayah'] as int?,
      syncStatus: _parseSyncStatus(map['sync_status'] as String?),
      isDeleted: (map['is_deleted'] as int?) == 1,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      'class_id': classId,
      if (serverClassId != null) 'server_class_id': serverClassId,
      'type': type,
      'start_surah': startSurah,
      'end_surah': endSurah,
      'start_ayah': startAyah,
      'end_ayah': endAyah,
      'sync_status': syncStatus.name,
      'is_deleted': isDeleted ? 1 : 0,
    };
  }

  Assignment copyWith({
    int? id,
    int? serverId,
    int? classId,
    int? serverClassId,
    String? type,
    int? startSurah,
    int? endSurah,
    int? startAyah,
    int? endAyah,
    SyncStatus? syncStatus,
    bool? isDeleted,
  }) {
    return Assignment(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      classId: classId ?? this.classId,
      serverClassId: serverClassId ?? this.serverClassId,
      type: type ?? this.type,
      startSurah: startSurah ?? this.startSurah,
      endSurah: endSurah ?? this.endSurah,
      startAyah: startAyah ?? this.startAyah,
      endAyah: endAyah ?? this.endAyah,
      syncStatus: syncStatus ?? this.syncStatus,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  // Check if assignment spans multiple surahs
  bool get isMultiSurah => startSurah != endSurah;

  // Check if assignment has specific ayah range
  bool get hasAyahRange => startAyah != null && endAyah != null;

  // Get list of surah numbers in this assignment
  List<int> get surahNumbers {
    return List.generate(endSurah - startSurah + 1, (i) => startSurah + i);
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
  List<Object?> get props => [id, classId, type, startSurah, endSurah, startAyah, endAyah];
}

import 'package:equatable/equatable.dart';
import 'assignment.dart';

enum SyncStatus { pending, synced, conflict }

class ClassSession extends Equatable {
  final int? id;
  final int? serverId;
  final String date;
  final String day;
  final String? notes;
  final String? performance; // Excellent, Very Good, Good, Needs Work
  final String createdAt;
  final String? updatedAt;
  final SyncStatus syncStatus;
  final bool isDeleted;
  final String? deviceId;
  final List<Assignment> assignments;

  const ClassSession({
    this.id,
    this.serverId,
    required this.date,
    required this.day,
    this.notes,
    this.performance,
    required this.createdAt,
    this.updatedAt,
    this.syncStatus = SyncStatus.pending,
    this.isDeleted = false,
    this.deviceId,
    this.assignments = const [],
  });

  factory ClassSession.fromMap(Map<String, dynamic> map, {List<Assignment>? assignments}) {
    return ClassSession(
      id: map['id'] as int?,
      serverId: map['server_id'] as int?,
      date: map['date'] as String,
      day: map['day'] as String,
      notes: map['notes'] as String?,
      performance: map['performance'] as String?,
      createdAt: map['created_at'] as String? ?? DateTime.now().toIso8601String(),
      updatedAt: map['updated_at'] as String?,
      syncStatus: _parseSyncStatus(map['sync_status'] as String?),
      isDeleted: (map['is_deleted'] as int?) == 1,
      deviceId: map['device_id'] as String?,
      assignments: assignments ?? [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      if (id != null) 'id': id,
      if (serverId != null) 'server_id': serverId,
      'date': date,
      'day': day,
      'notes': notes,
      'performance': performance,
      'created_at': createdAt,
      'updated_at': updatedAt,
      'sync_status': syncStatus.name,
      'is_deleted': isDeleted ? 1 : 0,
      'device_id': deviceId,
    };
  }

  Map<String, dynamic> toSyncMap() {
    return {
      'local_id': id,
      'server_id': serverId,
      'date': date,
      'day': day,
      'notes': notes,
      'performance': performance,
      'is_deleted': isDeleted,
      'assignments': assignments.map((a) => {
        'type': a.type,
        'start_surah': a.startSurah,
        'end_surah': a.endSurah,
        'start_ayah': a.startAyah,
        'end_ayah': a.endAyah,
      }).toList(),
    };
  }

  ClassSession copyWith({
    int? id,
    int? serverId,
    String? date,
    String? day,
    String? notes,
    String? performance,
    String? createdAt,
    String? updatedAt,
    SyncStatus? syncStatus,
    bool? isDeleted,
    String? deviceId,
    List<Assignment>? assignments,
  }) {
    return ClassSession(
      id: id ?? this.id,
      serverId: serverId ?? this.serverId,
      date: date ?? this.date,
      day: day ?? this.day,
      notes: notes ?? this.notes,
      performance: performance ?? this.performance,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
      isDeleted: isDeleted ?? this.isDeleted,
      deviceId: deviceId ?? this.deviceId,
      assignments: assignments ?? this.assignments,
    );
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
  List<Object?> get props => [id, serverId, date, day, notes, performance, syncStatus];
}

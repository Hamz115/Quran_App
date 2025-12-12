import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import '../network/api_client.dart';
import '../network/connectivity_service.dart';
import '../../data/repositories/class_repository.dart';
import '../../data/repositories/mistake_repository.dart';

enum SyncState { idle, syncing, success, error }

class SyncService {
  final ApiClient _apiClient;
  final ConnectivityService _connectivity;
  final ClassRepository _classRepository;
  final MistakeRepository _mistakeRepository;

  final _stateController = StreamController<SyncState>.broadcast();
  Stream<SyncState> get stateStream => _stateController.stream;
  SyncState _currentState = SyncState.idle;
  SyncState get currentState => _currentState;

  String? _lastError;
  String? get lastError => _lastError;

  SyncService({
    ApiClient? apiClient,
    ConnectivityService? connectivity,
    ClassRepository? classRepository,
    MistakeRepository? mistakeRepository,
  })  : _apiClient = apiClient ?? ApiClient(),
        _connectivity = connectivity ?? ConnectivityService(),
        _classRepository = classRepository ?? ClassRepository(),
        _mistakeRepository = mistakeRepository ?? MistakeRepository();

  // Perform full sync
  Future<bool> sync() async {
    if (_currentState == SyncState.syncing) return false;

    // Check connectivity
    if (!await _connectivity.isOnline) {
      _lastError = 'No internet connection';
      return false;
    }

    _setState(SyncState.syncing);

    try {
      // 1. Get last sync timestamp
      final lastSyncAt = await _getLastSyncTimestamp();

      // 2. Pull changes from server
      final serverData = await _apiClient.syncPull(lastSyncAt: lastSyncAt);

      // 3. Apply server changes locally
      await _applyServerChanges(serverData);

      // 4. Get pending local changes
      final pendingClasses = await _classRepository.getPendingSyncClasses();
      final pendingMistakes = await _mistakeRepository.getPendingSyncMistakes();

      // 5. Push local changes to server
      if (pendingClasses.isNotEmpty || pendingMistakes.isNotEmpty) {
        final pushPayload = {
          'classes': pendingClasses.map((c) => c.toSyncMap()).toList(),
          'mistakes': pendingMistakes.map((m) => m.toSyncMap()).toList(),
          'device_id': await _getDeviceId(),
        };

        final pushResult = await _apiClient.syncPush(pushPayload);

        // 6. Update local records with server IDs
        await _updateLocalWithServerIds(pushResult);
      }

      // 7. Save sync timestamp
      await _setLastSyncTimestamp(serverData['server_timestamp'] as String?);

      _setState(SyncState.success);
      _lastError = null;
      return true;
    } catch (e) {
      _lastError = e.toString();
      _setState(SyncState.error);
      return false;
    }
  }

  // Apply server changes to local database
  Future<void> _applyServerChanges(Map<String, dynamic> serverData) async {
    // Apply classes from server
    final serverClasses = serverData['classes'] as List<dynamic>? ?? [];
    for (final classData in serverClasses) {
      final serverId = classData['id'] as int?;
      if (serverId == null) continue;

      // Check if class already exists locally (by server_id)
      final existingClass = await _classRepository.getClassByServerId(serverId);

      if (existingClass == null) {
        // Create new class locally
        await _classRepository.createClassFromServer(
          serverId: serverId,
          date: classData['date'] as String,
          day: classData['day'] as String,
          notes: classData['notes'] as String?,
          assignments: (classData['assignments'] as List<dynamic>? ?? []),
        );
      }
    }

    // Apply mistakes from server with additive merge
    final serverMistakes = serverData['mistakes'] as List<dynamic>? ?? [];
    for (final mistakeData in serverMistakes) {
      final serverId = mistakeData['id'] as int?;
      if (serverId == null) continue;

      await _mistakeRepository.upsertFromServer(
        serverId: serverId,
        surahNumber: mistakeData['surah_number'] as int,
        ayahNumber: mistakeData['ayah_number'] as int,
        wordIndex: mistakeData['word_index'] as int,
        wordText: mistakeData['word_text'] as String,
        charIndex: mistakeData['char_index'] as int?,
        errorCount: mistakeData['error_count'] as int? ?? 1,
      );
    }
  }

  // Update local records with server IDs after push
  Future<void> _updateLocalWithServerIds(Map<String, dynamic> pushResult) async {
    final results = pushResult['results'] as Map<String, dynamic>? ?? {};

    // Update classes
    final classResults = results['classes'] as List<dynamic>? ?? [];
    for (final result in classResults) {
      final localId = result['local_id'] as int?;
      final serverId = result['server_id'] as int?;
      if (localId != null && serverId != null) {
        await _classRepository.markClassSynced(localId, serverId);
      }
    }

    // Update mistakes
    final mistakeResults = results['mistakes'] as List<dynamic>? ?? [];
    for (final result in mistakeResults) {
      final localId = result['local_id'] as int?;
      final serverId = result['server_id'] as int?;
      final errorCount = result['error_count'] as int? ?? 0;
      if (localId != null && serverId != null) {
        await _mistakeRepository.markMistakeSynced(localId, serverId, errorCount);
      }
    }
  }

  // Get last sync timestamp from shared preferences
  Future<String?> _getLastSyncTimestamp() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('last_sync_at');
  }

  // Save last sync timestamp
  Future<void> _setLastSyncTimestamp(String? timestamp) async {
    if (timestamp == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_sync_at', timestamp);
  }

  // Get or create device ID
  Future<String> _getDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var deviceId = prefs.getString('device_id');
    if (deviceId == null) {
      deviceId = DateTime.now().millisecondsSinceEpoch.toString();
      await prefs.setString('device_id', deviceId);
    }
    return deviceId;
  }

  void _setState(SyncState state) {
    _currentState = state;
    _stateController.add(state);
  }

  // Check if there are pending changes
  Future<bool> hasPendingChanges() async {
    final pendingClasses = await _classRepository.getPendingSyncClasses();
    final pendingMistakes = await _mistakeRepository.getPendingSyncMistakes();
    return pendingClasses.isNotEmpty || pendingMistakes.isNotEmpty;
  }

  void dispose() {
    _stateController.close();
  }
}

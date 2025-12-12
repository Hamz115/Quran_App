import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

enum NetworkStatus { online, offline }

class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final _controller = StreamController<NetworkStatus>.broadcast();

  Stream<NetworkStatus> get statusStream => _controller.stream;
  NetworkStatus _currentStatus = NetworkStatus.offline;
  NetworkStatus get currentStatus => _currentStatus;

  ConnectivityService() {
    _init();
  }

  void _init() {
    _connectivity.onConnectivityChanged.listen((result) {
      _updateStatusFromResult(result);
    });
    // Check initial status
    checkConnectivity();
  }

  Future<void> checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    _updateStatusFromResult(result);
  }

  void _updateStatusFromResult(dynamic result) {
    bool hasConnection = false;

    // Handle both List<ConnectivityResult> (new API) and ConnectivityResult (old API)
    if (result is List) {
      hasConnection = result.any((r) =>
          r == ConnectivityResult.wifi ||
          r == ConnectivityResult.mobile ||
          r == ConnectivityResult.ethernet);
    } else if (result is ConnectivityResult) {
      hasConnection = result == ConnectivityResult.wifi ||
          result == ConnectivityResult.mobile ||
          result == ConnectivityResult.ethernet;
    }

    _currentStatus = hasConnection ? NetworkStatus.online : NetworkStatus.offline;
    _controller.add(_currentStatus);
  }

  Future<bool> get isOnline async {
    await checkConnectivity();
    return _currentStatus == NetworkStatus.online;
  }

  void dispose() {
    _controller.close();
  }
}

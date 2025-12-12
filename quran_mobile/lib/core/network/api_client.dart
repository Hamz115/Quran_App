import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../config/constants.dart';

class ApiClient {
  late final Dio _dio;
  String _baseUrl = AppConstants.apiBaseUrl;
  static const String _urlKey = 'api_base_url';

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add interceptors for logging
    _dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
    ));

    // Load saved URL on init
    _loadSavedUrl();
  }

  Future<void> _loadSavedUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(_urlKey);
    if (savedUrl != null && savedUrl.isNotEmpty) {
      _baseUrl = savedUrl;
      _dio.options.baseUrl = savedUrl;
    }
  }

  String get baseUrl => _baseUrl;

  // Set base URL and persist it
  Future<void> setBaseUrl(String url) async {
    _baseUrl = url;
    _dio.options.baseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_urlKey, url);
  }

  // GET request
  Future<Response> get(String path, {Map<String, dynamic>? queryParams}) async {
    return await _dio.get(path, queryParameters: queryParams);
  }

  // POST request
  Future<Response> post(String path, {dynamic data}) async {
    return await _dio.post(path, data: data);
  }

  // PUT request
  Future<Response> put(String path, {dynamic data}) async {
    return await _dio.put(path, data: data);
  }

  // DELETE request
  Future<Response> delete(String path) async {
    return await _dio.delete(path);
  }

  // Sync endpoints
  Future<Map<String, dynamic>> syncPull({String? lastSyncAt, String? deviceId}) async {
    final response = await post('/sync/pull', data: {
      'last_sync_at': lastSyncAt,
      'device_id': deviceId,
    });
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> syncPush(Map<String, dynamic> payload) async {
    final response = await post('/sync/push', data: payload);
    return response.data as Map<String, dynamic>;
  }

  // Class endpoints
  Future<List<dynamic>> getClasses() async {
    final response = await get('/classes');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getClass(int id) async {
    final response = await get('/classes/$id');
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createClass(Map<String, dynamic> data) async {
    final response = await post('/classes', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<void> deleteClass(int id) async {
    await delete('/classes/$id');
  }

  // Mistake endpoints
  Future<List<dynamic>> getMistakes() async {
    final response = await get('/mistakes');
    return response.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> addMistake(Map<String, dynamic> data) async {
    final response = await post('/mistakes', data: data);
    return response.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> removeMistake(int id) async {
    final response = await delete('/mistakes/$id');
    return response.data as Map<String, dynamic>;
  }

  // Stats endpoint
  Future<Map<String, dynamic>> getStats() async {
    final response = await get('/stats');
    return response.data as Map<String, dynamic>;
  }
}

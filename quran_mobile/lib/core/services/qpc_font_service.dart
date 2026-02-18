import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';

/// Downloads and loads QPC .ttf fonts for Quran page rendering.
///
/// On mobile: loads font from bundled assets (fully offline).
/// On web: loads font from backend API via HTTP (no disk cache).
class QpcFontService {
  final String baseUrl;
  final Dio _dio;
  final Set<int> _loadedFonts = {};
  final Map<int, Future<void>> _pendingLoads = {};

  QpcFontService({required this.baseUrl}) : _dio = Dio();

  bool isFontLoaded(int pageNum) => _loadedFonts.contains(pageNum);

  static String fontFamily(int pageNum) => 'QPC-Page-$pageNum';

  Future<void> ensureFontsForPage(int pageNum) async {
    final pagesToLoad = <int>[];
    if (pageNum > 1) pagesToLoad.add(pageNum - 1);
    pagesToLoad.add(pageNum);
    if (pageNum < 604) pagesToLoad.add(pageNum + 1);

    await Future.wait(pagesToLoad.map((p) => _loadFont(p)));
  }

  Future<void> _loadFont(int pageNum) async {
    if (_loadedFonts.contains(pageNum)) return;

    if (_pendingLoads.containsKey(pageNum)) {
      return _pendingLoads[pageNum]!;
    }

    final completer = Completer<void>();
    _pendingLoads[pageNum] = completer.future;

    try {
      final fontBytes = kIsWeb
          ? await _downloadFontWeb(pageNum)
          : await _loadFontFromAssets(pageNum);

      final fontLoader = FontLoader(fontFamily(pageNum));
      fontLoader.addFont(Future.value(ByteData.sublistView(fontBytes)));
      await fontLoader.load();

      _loadedFonts.add(pageNum);
      completer.complete();
    } catch (e) {
      completer.completeError(e);
      rethrow;
    } finally {
      _pendingLoads.remove(pageNum);
    }
  }

  /// Web: download font from backend API (no disk caching on web).
  Future<Uint8List> _downloadFontWeb(int pageNum) async {
    final url = '$baseUrl/fonts/qpc/$pageNum';

    final response = await _dio.get<List<int>>(
      url,
      options: Options(responseType: ResponseType.bytes),
    );

    if (response.statusCode != 200 || response.data == null) {
      throw Exception('Failed to load web font for page $pageNum');
    }
    return Uint8List.fromList(response.data!);
  }

  /// Mobile: load font from bundled assets (no network needed).
  Future<Uint8List> _loadFontFromAssets(int pageNum) async {
    final padded = pageNum.toString().padLeft(3, '0');
    final byteData = await rootBundle.load('assets/fonts/qpc/QCF_P$padded.ttf');
    return byteData.buffer.asUint8List();
  }
}

import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';

// Conditional import: uses stub on web, real dart:io on mobile
import 'qpc_font_io_stub.dart'
    if (dart.library.io) 'qpc_font_io_mobile.dart' as font_io;

/// Downloads, caches, and loads QPC .ttf fonts for Quran page rendering.
///
/// On mobile: downloads .ttf from API, caches to disk, loads via FontLoader.
/// On web: loads .woff2 directly from the web server via FontLoader (no disk cache).
class QpcFontService {
  final String baseUrl;
  final Dio _dio;
  final Set<int> _loadedFonts = {};
  final Map<int, Future<void>> _pendingLoads = {};
  String? _cacheDir;

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
          : await _downloadFontMobile(pageNum);

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

  /// Mobile: check disk cache, download .ttf if not cached.
  Future<Uint8List> _downloadFontMobile(int pageNum) async {
    if (_cacheDir == null) {
      _cacheDir = await font_io.getFontCacheDir();
    }

    final padded = pageNum.toString().padLeft(3, '0');
    final localPath = '$_cacheDir/QCF_P$padded.ttf';

    // Check disk cache
    final cached = await font_io.readFileIfExists(localPath);
    if (cached != null) return cached;

    // Download from backend API
    final url = '$baseUrl/fonts/qpc/$pageNum';
    final response = await _dio.get<List<int>>(
      url,
      options: Options(responseType: ResponseType.bytes),
    );

    if (response.statusCode != 200 || response.data == null) {
      throw Exception('Failed to download font for page $pageNum');
    }

    final fontBytes = Uint8List.fromList(response.data!);

    // Cache to disk
    await font_io.writeFile(localPath, fontBytes);

    return fontBytes;
  }
}

import 'dart:async';
import 'package:flutter/services.dart';

/// Loads QPC .ttf fonts for Quran page rendering.
///
/// Fonts are bundled in assets/fonts/qpc/ and loaded via rootBundle
/// on both web and mobile (fully offline, no backend dependency).
class QpcFontService {
  final Set<int> _loadedFonts = {};
  final Map<int, Future<void>> _pendingLoads = {};

  QpcFontService();

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
      final padded = pageNum.toString().padLeft(3, '0');
      final byteData = await rootBundle.load('assets/fonts/qpc/QCF_P$padded.ttf');
      final fontBytes = byteData.buffer.asUint8List();

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
}

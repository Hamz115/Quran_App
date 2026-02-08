// Web stub: these functions are never called on web (guarded by kIsWeb),
// but need to exist for compilation.

import 'dart:typed_data';

Future<String> getFontCacheDir() async {
  throw UnsupportedError('Disk caching not available on web');
}

Future<Uint8List?> readFileIfExists(String path) async {
  return null;
}

Future<void> writeFile(String path, Uint8List bytes) async {}

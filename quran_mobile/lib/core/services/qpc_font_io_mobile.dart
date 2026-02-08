// Mobile implementation: uses dart:io and path_provider for disk caching.

import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';

Future<String> getFontCacheDir() async {
  final dir = await getApplicationDocumentsDirectory();
  final cacheDir = Directory('${dir.path}/qpc_fonts');
  if (!await cacheDir.exists()) {
    await cacheDir.create(recursive: true);
  }
  return cacheDir.path;
}

Future<Uint8List?> readFileIfExists(String path) async {
  final file = File(path);
  if (await file.exists()) {
    return file.readAsBytes();
  }
  return null;
}

Future<void> writeFile(String path, Uint8List bytes) async {
  final file = File(path);
  await file.writeAsBytes(bytes);
}

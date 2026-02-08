import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/qpc_font_service.dart';
import '../../core/services/quran_page_data_service.dart';
import '../../data/models/quran_page_data.dart';
import 'providers.dart';

/// Singleton QpcFontService - downloads and caches QPC .ttf fonts.
final qpcFontServiceProvider = Provider<QpcFontService>((ref) {
  // On web, use localhost directly since 10.0.2.2 is Android emulator only
  final baseUrl = kIsWeb ? 'http://localhost:8000/api' : ref.watch(apiClientProvider).baseUrl;
  return QpcFontService(baseUrl: baseUrl);
});

/// Singleton QuranPageDataService - loads page JSON from bundled assets.
final quranPageDataServiceProvider = Provider<QuranPageDataService>((ref) {
  return QuranPageDataService();
});

/// Current page number (1-604). Default: page 1 (Al-Fatihah).
final currentPageProvider = StateProvider<int>((ref) => 1);

/// Load page data for a given page number.
final quranPageDataProvider = FutureProvider.family<QuranPageData, int>((ref, pageNum) async {
  final service = ref.watch(quranPageDataServiceProvider);
  return service.getPageData(pageNum);
});

/// Ensure fonts are loaded for a given page (current + adjacent).
final fontReadyProvider = FutureProvider.family<bool, int>((ref, pageNum) async {
  final fontService = ref.watch(qpcFontServiceProvider);
  await fontService.ensureFontsForPage(pageNum);
  return true;
});

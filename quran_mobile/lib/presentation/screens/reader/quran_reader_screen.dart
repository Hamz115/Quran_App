import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/app_colors.dart';
import '../../../data/quran_data.dart';
import '../../../data/models/mistake.dart';
import '../../../data/models/quran_page_data.dart';
import '../../providers/providers.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../providers/quran_page_provider.dart';
import '../../widgets/mushaf_page_widget.dart';

class QuranReaderScreen extends ConsumerStatefulWidget {
  const QuranReaderScreen({super.key});

  @override
  ConsumerState<QuranReaderScreen> createState() => _QuranReaderScreenState();
}

class _QuranReaderScreenState extends ConsumerState<QuranReaderScreen> {
  late PageController _pageController;
  int _currentPage = 1;
  bool _showOverlay = false;
  Timer? _overlayTimer;
  final TextEditingController _jumpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
  }

  @override
  void dispose() {
    _pageController.dispose();
    _jumpController.dispose();
    _overlayTimer?.cancel();
    super.dispose();
  }

  void _toggleOverlay() {
    setState(() => _showOverlay = !_showOverlay);
    _overlayTimer?.cancel();
    if (_showOverlay) {
      _overlayTimer = Timer(const Duration(seconds: 4), () {
        if (mounted) setState(() => _showOverlay = false);
      });
    }
  }

  void _jumpToPage(int page) {
    if (page < 1 || page > totalPages) return;
    setState(() => _currentPage = page);
    _pageController.jumpToPage(page - 1);
  }

  void _jumpToSurah(int surahNum) {
    final page = getPageForSurah(surahNum);
    _jumpToPage(page);
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = ref.watch(themeProvider);
    final isTeacher = ref.watch(authProvider).isTeacher;
    // Only show mistakes for students — teachers should see a clean Quran
    final mistakes = isTeacher ? <Mistake>[] : (ref.watch(mistakesProvider).value ?? []);

    return Scaffold(
      backgroundColor: isDarkMode ? Colors.black : const Color(0xFFFEF9E7),
      body: GestureDetector(
        onTap: _toggleOverlay,
        child: Stack(
          children: [
            // Full-screen PageView
            PageView.builder(
              controller: _pageController,
              reverse: true, // RTL: swipe left = next page
              itemCount: totalPages,
              onPageChanged: (index) {
                setState(() => _currentPage = index + 1);
              },
              itemBuilder: (context, index) {
                final pageNum = index + 1;
                return _PageLoader(
                  pageNumber: pageNum,
                  isDarkMode: isDarkMode,
                  mistakes: mistakes,
                );
              },
            ),

            // Overlay controls (appear on tap)
            if (_showOverlay) ...[
              // Top overlay
              _buildTopOverlay(isDarkMode),
              // Bottom overlay
              _buildBottomOverlay(isDarkMode),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTopOverlay(bool isDarkMode) {
    final surahsOnPage = getSurahsOnPage(_currentPage);
    final primarySurah = surahsOnPage.isNotEmpty ? surahsOnPage.first : 1;

    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 8,
          left: 12,
          right: 12,
          bottom: 10,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.black.withOpacity(0.7),
              Colors.black.withOpacity(0.0),
            ],
          ),
        ),
        child: Row(
          children: [
            // Page number (tappable to jump)
            GestureDetector(
              onTap: () {
                _overlayTimer?.cancel();
                _showJumpDialog(isDarkMode);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '$_currentPage / $totalPages',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ),

            const SizedBox(width: 8),

            // Surah name (center)
            Expanded(
              child: Text(
                surahNamesArabic[primarySurah] ?? '',
                textAlign: TextAlign.center,
                textDirection: TextDirection.rtl,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.amiri(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),

            const SizedBox(width: 8),

            // Surah list popup
            PopupMenuButton<int>(
              icon: const Icon(Icons.list_rounded, color: Colors.white, size: 22),
              tooltip: 'Jump to Surah',
              color: AppColors.surface(isDarkMode),
              constraints: const BoxConstraints(maxHeight: 400),
              onSelected: (surahNum) => _jumpToSurah(surahNum),
              itemBuilder: (context) => List.generate(114, (i) {
                final num = i + 1;
                return PopupMenuItem(
                  value: num,
                  child: Text(
                    '$num. ${surahNamesArabic[num]}',
                    textDirection: TextDirection.rtl,
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.text(isDarkMode),
                    ),
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomOverlay(bool isDarkMode) {
    final surahsOnPage = getSurahsOnPage(_currentPage);

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).padding.bottom + 8,
          left: 16,
          right: 16,
          top: 16,
        ),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [
              Colors.black.withOpacity(0.7),
              Colors.black.withOpacity(0.0),
            ],
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Previous page (higher number in RTL)
            IconButton(
              icon: const Icon(Icons.chevron_left, size: 24),
              color: Colors.white70,
              onPressed: _currentPage < totalPages
                  ? () => _jumpToPage(_currentPage + 1)
                  : null,
            ),

            // Surah info
            Text(
              surahsOnPage.map((s) => surahNamesArabic[s] ?? '').join(' - '),
              textDirection: TextDirection.rtl,
              style: const TextStyle(
                fontSize: 13,
                color: Colors.white70,
              ),
            ),

            // Next page (lower number in RTL)
            IconButton(
              icon: const Icon(Icons.chevron_right, size: 24),
              color: Colors.white70,
              onPressed: _currentPage > 1
                  ? () => _jumpToPage(_currentPage - 1)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  void _showJumpDialog(bool isDarkMode) {
    _jumpController.text = _currentPage.toString();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface(isDarkMode),
        title: Text(
          'Go to Page',
          style: TextStyle(color: AppColors.text(isDarkMode)),
        ),
        content: TextField(
          controller: _jumpController,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: InputDecoration(
            hintText: '1-$totalPages',
            hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          style: TextStyle(color: AppColors.text(isDarkMode)),
          onSubmitted: (value) {
            final page = int.tryParse(value);
            if (page != null) {
              _jumpToPage(page);
            }
            Navigator.pop(context);
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel',
                style: TextStyle(color: AppColors.textSecondary(isDarkMode))),
          ),
          TextButton(
            onPressed: () {
              final page = int.tryParse(_jumpController.text);
              if (page != null) {
                _jumpToPage(page);
              }
              Navigator.pop(context);
            },
            child: Text('Go',
                style: TextStyle(color: AppColors.primary(isDarkMode))),
          ),
        ],
      ),
    );
  }
}

/// Loads page data + fonts for a single page, shows loading state.
class _PageLoader extends ConsumerWidget {
  final int pageNumber;
  final bool isDarkMode;
  final List<Mistake> mistakes;

  const _PageLoader({
    required this.pageNumber,
    required this.isDarkMode,
    required this.mistakes,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final pageDataAsync = ref.watch(quranPageDataProvider(pageNumber));
    final fontReadyAsync = ref.watch(fontReadyProvider(pageNumber));

    return pageDataAsync.when(
      data: (pageData) {
        return fontReadyAsync.when(
          data: (_) {
            final widget = MushafPageWidget(
              pageNumber: pageNumber,
              pageData: pageData,
              isDarkMode: isDarkMode,
              mistakes: mistakes,
            );
            // Dark mode: add padding so the dark scaffold frames the page
            // Light mode: edge-to-edge cream, no visible gap
            return isDarkMode
                ? Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                    child: widget,
                  )
                : widget;
          },
          loading: () => _buildLoadingState(),
          error: (e, _) => _buildFontFallback(pageData),
        );
      },
      loading: () => _buildLoadingState(),
      error: (e, _) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, color: AppColors.error, size: 32),
            const SizedBox(height: 8),
            Text(
              'Error loading page $pageNumber',
              style: const TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 4),
            Text(
              '$e',
              style: const TextStyle(fontSize: 12, color: Colors.white54),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.primary(isDarkMode),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Loading page $pageNumber...',
            style: const TextStyle(fontSize: 13, color: Colors.white54),
          ),
        ],
      ),
    );
  }

  /// When font fails to load, show the page with plain Arabic text fallback.
  Widget _buildFontFallback(QuranPageData pageData) {
    final widget = MushafPageWidget(
      pageNumber: pageNumber,
      pageData: pageData,
      isDarkMode: isDarkMode,
      mistakes: mistakes,
    );
    return isDarkMode
        ? Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            child: widget,
          )
        : widget;
  }
}

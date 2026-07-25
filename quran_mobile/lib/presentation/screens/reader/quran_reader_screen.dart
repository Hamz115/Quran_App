import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/app_colors.dart';
import '../../../data/quran_data.dart';
import '../../../data/models/mistake.dart';
import '../../../data/models/quran_page_data.dart';
import '../../providers/providers.dart';
import '../../providers/theme_provider.dart';
import '../../providers/quran_page_provider.dart';
import '../../widgets/mushaf_page_widget.dart';
import '../../../core/services/tour_service.dart';

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
    // Always show mistakes — no role gating in v2.0.0
    final mistakes = ref.watch(mistakesProvider).value ?? <Mistake>[];
    final mistakesWithOccurrences =
        ref.watch(readerMistakeOccurrencesProvider).value ?? <Mistake>[];

    return Scaffold(
      key: TourService.readerPageKey,
      backgroundColor: AppColors.readerBackground(isDarkMode),
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: AppColors.readerGradient(isDarkMode),
        ),
        child: GestureDetector(
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
                    mistakesWithOccurrences: mistakesWithOccurrences,
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
              Colors.black.withOpacity(isDarkMode ? 0.82 : 0.62),
              AppColors.deepTeal.withOpacity(isDarkMode ? 0.36 : 0.18),
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
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.18),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.16)),
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

            // Surah list button — opens full-screen scrollable dialog
            IconButton(
              icon: const Icon(
                Icons.list_rounded,
                color: Colors.white,
                size: 22,
              ),
              tooltip: 'Jump to Surah',
              onPressed: () {
                _overlayTimer?.cancel();
                _showSurahPickerDialog(isDarkMode);
              },
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
              Colors.black.withOpacity(isDarkMode ? 0.82 : 0.66),
              AppColors.deepTeal.withOpacity(isDarkMode ? 0.32 : 0.16),
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
              style: const TextStyle(fontSize: 13, color: Colors.white70),
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
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
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
            child: Text(
              'Cancel',
              style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
            ),
          ),
          TextButton(
            onPressed: () {
              final page = int.tryParse(_jumpController.text);
              if (page != null) {
                _jumpToPage(page);
              }
              Navigator.pop(context);
            },
            child: Text(
              'Go',
              style: TextStyle(color: AppColors.primary(isDarkMode)),
            ),
          ),
        ],
      ),
    );
  }

  void _showSurahPickerDialog(bool isDarkMode) {
    final surahsOnPage = getSurahsOnPage(_currentPage);
    final currentSurah = surahsOnPage.isNotEmpty ? surahsOnPage.first : 1;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        final scrollController = ScrollController(
          initialScrollOffset:
              (currentSurah - 1) * 48.0, // Approximate item height
        );

        return DraggableScrollableSheet(
          initialChildSize: 0.7,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, sheetScrollController) {
            return Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isDarkMode
                      ? [AppColors.nightCard, AppColors.nightSurface]
                      : [Colors.white, AppColors.porcelain],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  // Handle bar
                  Container(
                    margin: const EdgeInsets.only(top: 8, bottom: 4),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDarkMode ? Colors.white24 : Colors.black26,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  // Title
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Text(
                      'Jump to Surah',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w600,
                        color: AppColors.text(isDarkMode),
                      ),
                    ),
                  ),
                  const Divider(height: 1),
                  // Scrollable list
                  Expanded(
                    child: ListView.builder(
                      controller: sheetScrollController,
                      itemCount: 114,
                      itemBuilder: (context, index) {
                        final surahNum = index + 1;
                        final isCurrentSurah = surahNum == currentSurah;

                        return ListTile(
                          dense: true,
                          selected: isCurrentSurah,
                          selectedTileColor: AppColors.cyan600.withOpacity(
                            0.15,
                          ),
                          leading: Container(
                            width: 32,
                            height: 32,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: isCurrentSurah
                                  ? AppColors.cyan600.withOpacity(0.2)
                                  : (isDarkMode
                                        ? Colors.white10
                                        : Colors.black.withOpacity(0.05)),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '$surahNum',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isCurrentSurah
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: isCurrentSurah
                                    ? AppColors.cyan600
                                    : AppColors.textSecondary(isDarkMode),
                              ),
                            ),
                          ),
                          title: Text(
                            surahNamesArabic[surahNum] ?? '',
                            textDirection: TextDirection.rtl,
                            style: GoogleFonts.amiri(
                              fontSize: 18,
                              fontWeight: isCurrentSurah
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                              color: isCurrentSurah
                                  ? AppColors.cyan600
                                  : AppColors.text(isDarkMode),
                            ),
                          ),
                          trailing: Text(
                            'p. ${getPageForSurah(surahNum)}',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted(isDarkMode),
                            ),
                          ),
                          onTap: () {
                            Navigator.pop(context);
                            _jumpToSurah(surahNum);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

/// Loads page data + fonts for a single page, shows loading state.
/// Now a StatefulWidget to support ScrollController and flash state.
class _PageLoader extends ConsumerStatefulWidget {
  final int pageNumber;
  final bool isDarkMode;
  final List<Mistake> mistakes;
  final List<Mistake> mistakesWithOccurrences;

  const _PageLoader({
    required this.pageNumber,
    required this.isDarkMode,
    required this.mistakes,
    required this.mistakesWithOccurrences,
  });

  @override
  ConsumerState<_PageLoader> createState() => _PageLoaderState();
}

class _PageLoaderState extends ConsumerState<_PageLoader> {
  final ScrollController _scrollController = ScrollController();
  String? _highlightedWordKey;
  Timer? _flashTimer;

  @override
  void dispose() {
    _scrollController.dispose();
    _flashTimer?.cancel();
    super.dispose();
  }

  void _flashWord(int surah, int ayah, int wordIndex) {
    _flashTimer?.cancel();
    setState(() => _highlightedWordKey = '$surah-$ayah-$wordIndex');

    // Scroll to top to see the flashing word
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }

    _flashTimer = Timer(const Duration(milliseconds: 1500), () {
      if (mounted) setState(() => _highlightedWordKey = null);
    });
  }

  @override
  Widget build(BuildContext context) {
    final pageDataAsync = ref.watch(quranPageDataProvider(widget.pageNumber));
    final fontReadyAsync = ref.watch(fontReadyProvider(widget.pageNumber));

    return pageDataAsync.when(
      data: (pageData) {
        return fontReadyAsync.when(
          data: (_) => _buildPageWithMistakes(pageData),
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
              'Error loading page ${widget.pageNumber}',
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

  Widget _buildPageWithMistakes(QuranPageData pageData) {
    // Filter mistakes with occurrences for this page
    final pageMistakes = widget.mistakesWithOccurrences.where((m) {
      final mistakePage = getPageNumber(m.surahNumber, m.ayahNumber);
      return mistakePage == widget.pageNumber;
    }).toList();

    final mushafWidget = MushafPageWidget(
      pageNumber: widget.pageNumber,
      pageData: pageData,
      isDarkMode: widget.isDarkMode,
      mistakes: widget.mistakes,
      highlightedWordKey: _highlightedWordKey,
    );

    final pageWidget = widget.isDarkMode
        ? Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            child: mushafWidget,
          )
        : mushafWidget;

    // If no mistakes on this page, show page only (no scroll needed)
    if (pageMistakes.isEmpty) {
      return pageWidget;
    }

    // Wrap in scrollable view with mistakes section below
    final screenHeight = MediaQuery.of(context).size.height;

    return SingleChildScrollView(
      controller: _scrollController,
      child: Column(
        children: [
          SizedBox(height: screenHeight, child: pageWidget),
          _MistakesByClassSection(
            mistakes: pageMistakes,
            isDarkMode: widget.isDarkMode,
            onMistakeTap: (m) =>
                _flashWord(m.surahNumber, m.ayahNumber, m.wordIndex),
          ),
          const SizedBox(height: 40),
        ],
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
              color: AppColors.primary(widget.isDarkMode),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Loading page ${widget.pageNumber}...',
            style: const TextStyle(fontSize: 13, color: Colors.white54),
          ),
        ],
      ),
    );
  }

  Widget _buildFontFallback(QuranPageData pageData) {
    // Re-use the same logic but without flash — font fallback doesn't need it
    final mushafWidget = MushafPageWidget(
      pageNumber: widget.pageNumber,
      pageData: pageData,
      isDarkMode: widget.isDarkMode,
      mistakes: widget.mistakes,
    );
    return widget.isDarkMode
        ? Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            child: mushafWidget,
          )
        : mushafWidget;
  }
}

/// Strip Quranic pause marks that don't render properly in most fonts
String _stripQuranMarks(String text) {
  return text.replaceAll(RegExp(r'[\u06D6-\u06ED]'), '').trim();
}

/// Displays mistakes grouped by class (day + date) below the mushaf page.
class _MistakesByClassSection extends StatelessWidget {
  final List<Mistake> mistakes;
  final bool isDarkMode;
  final void Function(Mistake) onMistakeTap;

  const _MistakesByClassSection({
    required this.mistakes,
    required this.isDarkMode,
    required this.onMistakeTap,
  });

  @override
  Widget build(BuildContext context) {
    // Group by class using occurrences
    final classBuckets = <String, _ClassBucket>{};
    final noClassMistakes = <Mistake>[];

    for (final m in mistakes) {
      if (m.occurrences.isEmpty) {
        noClassMistakes.add(m);
        continue;
      }
      for (final occ in m.occurrences) {
        final key =
            '${occ.classDay ?? ""}-${occ.classDate ?? ""}-${occ.classId}';
        classBuckets.putIfAbsent(
          key,
          () =>
              _ClassBucket(day: occ.classDay ?? '', date: occ.classDate ?? ''),
        );
        // Avoid duplicates
        if (!classBuckets[key]!.mistakes.any((em) => em.id == m.id)) {
          classBuckets[key]!.mistakes.add(m);
        }
      }
    }

    final sortedKeys = classBuckets.keys.toList()
      ..sort((a, b) {
        final dateA = classBuckets[a]!.date;
        final dateB = classBuckets[b]!.date;
        return dateB.compareTo(dateA);
      });

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Container(
        decoration: BoxDecoration(
          color: isDarkMode ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDarkMode
                ? Colors.white.withOpacity(0.1)
                : const Color(0xFFE2E8F0),
          ),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  size: 20,
                  color: isDarkMode ? Colors.white70 : const Color(0xFF334155),
                ),
                const SizedBox(width: 8),
                Text(
                  'Mistakes on this page (${mistakes.length})',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: isDarkMode
                        ? Colors.white70
                        : const Color(0xFF334155),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Class groups
            ...sortedKeys.map((key) {
              final bucket = classBuckets[key]!;
              return _buildClassGroup(bucket.day, bucket.date, bucket.mistakes);
            }),

            // Unlinked mistakes
            if (noClassMistakes.isNotEmpty)
              _buildClassGroup(
                'Unlinked',
                '',
                noClassMistakes,
                isUnlinked: true,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildClassGroup(
    String day,
    String date,
    List<Mistake> groupMistakes, {
    bool isUnlinked = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(
              color: isUnlinked
                  ? (isDarkMode ? Colors.white24 : const Color(0xFFCBD5E1))
                  : AppColors.cyan600,
              width: 2,
            ),
          ),
        ),
        padding: const EdgeInsets.only(left: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Sub-header
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: day.isNotEmpty ? day : 'Session',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDarkMode
                          ? Colors.white60
                          : const Color(0xFF475569),
                    ),
                  ),
                  if (date.isNotEmpty)
                    TextSpan(
                      text: ' ($date)',
                      style: TextStyle(
                        fontSize: 11,
                        color: isDarkMode
                            ? Colors.white38
                            : const Color(0xFF94A3B8),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Badges
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: groupMistakes
                  .map((m) => _buildMistakeBadge(m))
                  .toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMistakeBadge(Mistake m) {
    final mistakeColor = AppColors.getMistakeColor(m.severityLevel);

    return GestureDetector(
      onTap: () => onMistakeTap(m),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: mistakeColor.withOpacity(isDarkMode ? 0.2 : 0.15),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: mistakeColor.withOpacity(0.5)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _stripQuranMarks(m.wordText),
              style: GoogleFonts.amiri(
                fontSize: 16,
                color: isDarkMode
                    ? mistakeColor
                    : mistakeColor.withOpacity(0.9),
              ),
              textDirection: TextDirection.rtl,
            ),
            const SizedBox(width: 6),
            Text(
              '${m.surahNumber}:${m.ayahNumber}:${m.wordIndex + 1}',
              style: TextStyle(
                fontSize: 10,
                color: (isDarkMode ? Colors.white54 : const Color(0xFF64748B)),
              ),
            ),
            if (m.errorCount > 1) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${m.errorCount}x',
                  style: TextStyle(
                    fontSize: 10,
                    color: isDarkMode
                        ? Colors.white54
                        : const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ClassBucket {
  final String day;
  final String date;
  final List<Mistake> mistakes = [];

  _ClassBucket({required this.day, required this.date});
}

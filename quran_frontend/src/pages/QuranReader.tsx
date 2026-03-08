import { useState, useEffect, useCallback, useRef } from 'react';
import { getQuranPage, getMistakesWithOccurrences, type QuranPageData, type QuranPageWord, type MistakeWithOccurrences } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getPageNumber } from '../data/quranPages';
import FittedLine from '../components/FittedLine';

// Surah names in Arabic
const SURAH_NAMES: Record<number, string> = {
  1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء', 5: 'المائدة',
  6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبة', 10: 'يونس',
  11: 'هود', 12: 'يوسف', 13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر',
  16: 'النحل', 17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه',
  21: 'الأنبياء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان',
  26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنكبوت', 30: 'الروم',
  31: 'لقمان', 32: 'السجدة', 33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر',
  36: 'يس', 37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر',
  41: 'فصلت', 42: 'الشورى', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثية',
  46: 'الأحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'ق',
  51: 'الذاريات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمن',
  56: 'الواقعة', 57: 'الحديد', 58: 'المجادلة', 59: 'الحشر', 60: 'الممتحنة',
  61: 'الصف', 62: 'الجمعة', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق',
  66: 'التحريم', 67: 'الملك', 68: 'القلم', 69: 'الحاقة', 70: 'المعارج',
  71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القيامة',
  76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس',
  81: 'التكوير', 82: 'الانفطار', 83: 'المطففين', 84: 'الانشقاق', 85: 'البروج',
  86: 'الطارق', 87: 'الأعلى', 88: 'الغاشية', 89: 'الفجر', 90: 'البلد',
  91: 'الشمس', 92: 'الليل', 93: 'الضحى', 94: 'الشرح', 95: 'التين',
  96: 'العلق', 97: 'القدر', 98: 'البينة', 99: 'الزلزلة', 100: 'العاديات',
  101: 'القارعة', 102: 'التكاثر', 103: 'العصر', 104: 'الهمزة', 105: 'الفيل',
  106: 'قريش', 107: 'الماعون', 108: 'الكوثر', 109: 'الكافرون', 110: 'النصر',
  111: 'المسد', 112: 'الإخلاص', 113: 'الفلق', 114: 'الناس'
};

const TOTAL_PAGES = 604;

// Get mistake level (1-5) based on error_count
const getMistakeLevel = (errorCount: number): number => {
  if (errorCount >= 5) return 5;
  if (errorCount >= 4) return 4;
  if (errorCount >= 3) return 3;
  if (errorCount >= 2) return 2;
  return 1;
};

// Strip Quranic pause marks that don't render properly in most fonts
const stripQuranMarks = (text: string): string => {
  return text.replace(/[\u06D6-\u06ED]/g, '').trim();
};

const getMistakeColor = (errorCount: number, darkMode: boolean) => {
  if (errorCount >= 5) return darkMode ? 'bg-red-500/20 text-red-400 border-red-600/50' : 'bg-red-100 text-red-700 border-red-300';
  if (errorCount >= 4) return darkMode ? 'bg-purple-500/20 text-purple-400 border-purple-600/50' : 'bg-purple-100 text-purple-700 border-purple-300';
  if (errorCount >= 3) return darkMode ? 'bg-orange-500/20 text-orange-400 border-orange-600/50' : 'bg-orange-100 text-orange-700 border-orange-300';
  if (errorCount >= 2) return darkMode ? 'bg-cyan-500/20 text-cyan-400 border-cyan-600/50' : 'bg-cyan-100 text-cyan-700 border-cyan-300';
  return darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-600/50' : 'bg-amber-100 text-amber-700 border-amber-300';
};

export default function QuranReader() {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState<QuranPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [jumpToPage, setJumpToPage] = useState('');
  const [showJumpModal, setShowJumpModal] = useState(false);

  // Mistakes state (read-only viewing)
  const [mistakes, setMistakes] = useState<MistakeWithOccurrences[]>([]);
  const [mistakesLoading, setMistakesLoading] = useState(false);
  const [surahs, setSurahs] = useState<number[]>([]);

  // Highlight state for click-to-flash
  const [highlightedWordKey, setHighlightedWordKey] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashWord = (surah: number, ayah: number, wordIndex: number) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const key = `${surah}-${ayah}-${wordIndex}`;
    setHighlightedWordKey(key);
    flashTimerRef.current = setTimeout(() => setHighlightedWordKey(null), 1500);
  };

  // Get highest mistake level for a word
  // Note: word position in v2 is 1-based, word_index in mistakes is 0-based
  const getWordMistakeInfo = (surah: number, ayah: number, wordIndex: number): { errorCount: number; mistakeId: string | null } => {
    const wordMistakes = mistakes.filter(
      m => m.surah_number === surah && m.ayah_number === ayah && m.word_index === wordIndex
    );

    if (wordMistakes.length === 0) {
      return { errorCount: 0, mistakeId: null };
    }

    const highest = wordMistakes.reduce((prev, curr) =>
      curr.error_count > prev.error_count ? curr : prev
    );

    const totalErrors = wordMistakes.reduce((sum, m) => sum + m.error_count, 0);

    return { errorCount: totalErrors, mistakeId: highest.id };
  };

  // Load QPC font for current page only (no overflow in v2)
  useEffect(() => {
    const paddedPage = currentPage.toString().padStart(3, '0');

    // Remove old font styles
    document.querySelectorAll('[id^="qpc-font-"]').forEach(el => el.remove());

    // Add current page font
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'QPC-Page-${currentPage}';
        src: url('/fonts/qpc/QCF_P${paddedPage}.woff2') format('woff2');
        font-display: swap;
      }
    `;
    style.id = `qpc-font-${currentPage}`;
    document.head.appendChild(style);

    setFontLoaded(false);
    const fontName = `QPC-Page-${currentPage}`;
    document.fonts.load(`32px "${fontName}"`).then(() => {
      setFontLoaded(true);
    }).catch(() => {
      setFontLoaded(true);
    });
  }, [currentPage]);

  // Load page data from backend API
  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setLoading(true);
      try {
        const data = await getQuranPage(currentPage);

        if (!isMounted) return;

        setPageData(data);

        // Extract unique surahs from ayah lines
        const surahSet = new Set<number>();
        for (const line of data.lines) {
          for (const word of line.words) {
            surahSet.add(word.surah);
          }
        }
        setSurahs(Array.from(surahSet));
      } catch (err) {
        console.error('Failed to load page:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPage();

    return () => { isMounted = false; };
  }, [currentPage]);

  // Load mistakes for surahs on current page
  useEffect(() => {
    if (!user || surahs.length === 0) return;

    let isMounted = true;

    const loadMistakes = async () => {
      setMistakesLoading(true);
      try {
        const allMistakes: MistakeWithOccurrences[] = [];
        for (const surahNum of surahs) {
          const surahMistakes = await getMistakesWithOccurrences(surahNum);
          allMistakes.push(...surahMistakes);
        }
        if (isMounted) setMistakes(allMistakes);
      } catch (err) {
        console.error('Failed to load mistakes:', err);
      } finally {
        if (isMounted) setMistakesLoading(false);
      }
    };

    loadMistakes();

    return () => { isMounted = false; };
  }, [user, surahs]);

  // Compute mushaf page dimensions based on window size
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = windowSize.w < 640;
  const hasBottomNav = windowSize.w < 1024;
  const getPageDimensions = useCallback(() => {
    if (isMobile) {
      const w = windowSize.w;
      const h = windowSize.h - 112;
      return { width: w, height: h };
    }
    const chromeHeight = hasBottomNav ? 220 : 160;
    const maxH = Math.min(windowSize.h * 0.8, windowSize.h - chromeHeight);
    const w = maxH * 0.7;
    const clampedW = Math.min(w, 500);
    const finalH = clampedW / 0.7;
    return { width: clampedW, height: Math.min(maxH, finalH) };
  }, [isMobile, hasBottomNav, windowSize]);

  const pageDims = getPageDimensions();

  const canGoNext = currentPage < TOTAL_PAGES;
  const canGoPrev = currentPage > 1;

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum && pageNum >= 1 && pageNum <= TOTAL_PAGES) {
      setCurrentPage(pageNum);
      setShowJumpModal(false);
      setJumpToPage('');
    }
  };

  const getCurrentSurahNum = () => {
    if (!pageData) return null;
    for (const line of pageData.lines) {
      if (line.words.length > 0) {
        return line.words[0].surah;
      }
    }
    return null;
  };

  // Get word styling based on mistake status
  const getWordStyle = (word: QuranPageWord) => {
    // Convert 1-based word position to 0-based word_index for lookup
    const { errorCount, mistakeId } = getWordMistakeInfo(word.surah, word.ayah, word.word - 1);

    if (errorCount > 0) {
      const level = getMistakeLevel(errorCount);
      return {
        className: `mistake-${level}`,
        errorCount,
        mistakeId
      };
    }

    return { className: '', errorCount: 0, mistakeId: null };
  };

  // Count total words across all lines
  const totalWords = pageData ? pageData.lines.reduce((sum, line) => sum + line.words.length, 0) : 0;
  const ayahLines = pageData ? pageData.lines.filter(l => l.line_type === 'ayah') : [];

  return (
    <div className="space-y-2 lg:space-y-4 -mx-3 -mt-4 -mb-20 lg:mx-0 lg:mt-0 lg:mb-0">
      {/* Header - only on desktop (lg+) */}
      <div className="hidden lg:flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Quran Reader</h1>
          <p className={`mt-1 text-base ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>View Quran pages with mistake highlights</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicators */}
          <span className={`text-xs px-2 py-1 rounded ${fontLoaded ? 'bg-cyan-600/30 text-cyan-400' : 'bg-amber-600/30 text-amber-400'}`}>
            {fontLoaded ? 'Ready' : 'Loading...'}
          </span>
          {mistakesLoading && (
            <span className="text-xs px-2 py-1 rounded bg-cyan-600/30 text-cyan-400">
              Loading mistakes...
            </span>
          )}

          {/* Page Input */}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max={TOTAL_PAGES}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= TOTAL_PAGES) {
                  setCurrentPage(val);
                }
              }}
              className={`w-20 px-3 py-2 rounded-xl border text-center focus:outline-none focus:ring-2 focus:ring-cyan-500 ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
            />
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>/ {TOTAL_PAGES}</span>
          </div>

          {/* Surah Dropdown */}
          <select
            value={surahs.length > 0 ? surahs[0] : ''}
            onChange={(e) => {
              const surahNum = parseInt(e.target.value);
              if (surahNum >= 1 && surahNum <= 114) {
                const page = getPageNumber(surahNum, 1);
                setCurrentPage(page);
              }
            }}
            className={`px-3 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer ${darkMode ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-slate-300 bg-white text-slate-700'}`}
            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
          >
            {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num}. {SURAH_NAMES[num]}
              </option>
            ))}
          </select>

          {/* Jump Button */}
          <button
            onClick={() => setShowJumpModal(true)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${darkMode ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700/30' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Jump
          </button>
        </div>
      </div>

      {/* Legend - shown on tablet+ */}
      <div className={`hidden sm:block card p-3 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Legend:</span>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-1"></span>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>1x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-2"></span>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>2x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-3"></span>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>3x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-4"></span>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>4x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-5"></span>
            <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>5+</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {mistakes.filter(m => getPageNumber(m.surah_number, m.ayah_number) === currentPage).length} mistakes on this page
            </span>
          </div>
        </div>
      </div>

      {/* Page Info - hidden below lg (save vertical space on tablet) */}
      <div className={`hidden lg:flex card p-4 items-center justify-between ${darkMode ? '' : 'bg-white border-slate-200'}`}>
        <div className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
          <span className="font-semibold">Page {currentPage}</span>
          {getCurrentSurahNum() && (
            <>
              <span className={`mx-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>-</span>
              <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Surah {getCurrentSurahNum()}</span>
            </>
          )}
        </div>
        <div className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {ayahLines.length} lines | {totalWords} words
        </div>
      </div>

      {/* Mushaf Display */}
      <div className="flex items-center justify-center gap-1 relative">
        {/* Next Page Button - LEFT side (RTL) - only on desktop */}
        <button
          onClick={() => canGoNext && setCurrentPage(currentPage + 1)}
          disabled={!canGoNext}
          className={`hidden lg:flex flex-shrink-0 w-10 h-10 rounded-full transition-all items-center justify-center ${
            canGoNext
              ? 'bg-cyan-600/80 hover:bg-cyan-500 text-white'
              : 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
          }`}
          title="Next Page"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Mushaf Page */}
        <div
          className={`${isMobile ? 'rounded-none' : 'rounded-lg'} mushaf-page relative`}
          style={{
            backgroundColor: '#FEF9E7',
            width: pageDims.width,
            height: pageDims.height,
          }}
        >
          {/* Page Content */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: 1, padding: '4% 6%' }}
          >
          {(loading || !fontLoaded || !pageData) ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="spinner mb-2"></div>
                <p className="text-slate-600">Loading page {currentPage}...</p>
              </div>
            </div>
          ) : (
            <div
              className="h-full flex flex-col justify-between"
              dir="rtl"
              style={{
                fontFamily: `'QPC-Page-${currentPage}', 'Amiri Quran', serif`,
                fontSize: `${Math.min(28, Math.floor(pageDims.height / 21))}px`,
              }}
            >
              {pageData.lines.map((line) => {
                // Surah header line
                if (line.line_type === 'surah_name' && line.surah_number) {
                  return (
                    <div
                      key={`surah-${line.line_number}`}
                      className="flex-none w-full px-4 py-1 border-2 border-cyan-200 rounded-lg bg-cyan-50 text-center"
                      style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                    >
                      <span className="text-cyan-800 font-bold" style={{ fontSize: '18px' }}>
                        سُورَةُ {SURAH_NAMES[line.surah_number]}
                      </span>
                    </div>
                  );
                }

                // Bismillah line
                if (line.line_type === 'basmallah') {
                  return (
                    <div
                      key={`bismillah-${line.line_number}`}
                      className="flex-none text-center text-cyan-700"
                      style={{
                        fontFamily: "'Amiri Quran', 'Amiri', serif",
                        fontSize: '18px',
                      }}
                    >
                      بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ
                    </div>
                  );
                }

                // Ayah line — render words with FittedLine
                return (
                  <div key={`line-${line.line_number}`} className="flex-1 min-h-0 flex items-center justify-center">
                    <FittedLine className="text-slate-800">
                      {line.words.map((word) => {
                        const wordStyle = getWordStyle(word);
                        const wordKey = `${word.surah}-${word.ayah}-${word.word - 1}`;
                        const isFlashing = highlightedWordKey === wordKey;

                        return (
                          <span
                            key={word.id}
                            className={`rounded px-0.5 ${
                              !word.is_end
                                ? wordStyle.className
                                : 'text-cyan-700'
                            } ${isFlashing ? 'reader-flash-highlight' : ''}`}
                            title={!word.is_end
                              ? `${word.text_uthmani || ''} (${word.surah}:${word.ayah}:${word.word})${wordStyle.errorCount > 0 ? ` - ${wordStyle.errorCount}x mistakes` : ''}`
                              : `Ayah ${word.ayah} end`
                            }
                          >
                            {word.text}
                          </span>
                        );
                      })}
                    </FittedLine>
                  </div>
                );
              })}
            </div>
          )}
          </div>

          {/* Overlay controls — shown below lg */}
          <div className="lg:hidden absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)' }}>
            <span className="text-white text-xs font-medium bg-black/40 px-2 py-1 rounded-lg">
              Page {currentPage}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={TOTAL_PAGES}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= TOTAL_PAGES) {
                    setCurrentPage(val);
                  }
                }}
                className="w-14 px-1 py-1 rounded-lg border border-white/30 bg-black/40 text-white text-xs text-center focus:outline-none"
              />
              <select
                value={surahs.length > 0 ? surahs[0] : ''}
                onChange={(e) => {
                  const surahNum = parseInt(e.target.value);
                  if (surahNum >= 1 && surahNum <= 114) {
                    const page = getPageNumber(surahNum, 1);
                    setCurrentPage(page);
                  }
                }}
                className="px-1 py-1 rounded-lg border border-white/30 bg-black/40 text-white text-xs focus:outline-none"
                style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif", maxWidth: '100px' }}
              >
                {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}. {SURAH_NAMES[num]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nav buttons at bottom — shown below lg */}
          <div className="lg:hidden absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.25), transparent)' }}>
            <button
              onClick={() => canGoNext && setCurrentPage(currentPage + 1)}
              disabled={!canGoNext}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${canGoNext ? 'bg-black/40 text-white' : 'bg-black/20 text-white/40'}`}
            >
              &larr; Next
            </button>
            <span className="text-white/60 text-xs">{currentPage} / {TOTAL_PAGES}</span>
            <button
              onClick={() => canGoPrev && setCurrentPage(currentPage - 1)}
              disabled={!canGoPrev}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${canGoPrev ? 'bg-black/40 text-white' : 'bg-black/20 text-white/40'}`}
            >
              Prev &rarr;
            </button>
          </div>
        </div>

        {/* Previous Page Button - RIGHT side - only on desktop */}
        <button
          onClick={() => canGoPrev && setCurrentPage(currentPage - 1)}
          disabled={!canGoPrev}
          className={`hidden lg:flex flex-shrink-0 w-10 h-10 rounded-full transition-all items-center justify-center ${
            canGoPrev
              ? 'bg-cyan-600/80 hover:bg-cyan-500 text-white'
              : 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
          }`}
          title="Previous Page"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Mistakes by Class Section */}
      {(() => {
        // Filter mistakes for the current page
        const pageMistakes = mistakes.filter(m => {
          const mistakePage = getPageNumber(m.surah_number, m.ayah_number);
          return mistakePage === currentPage;
        });

        if (pageMistakes.length === 0) return null;

        // Group by class using occurrences
        const classBuckets: Record<string, { day: string; date: string; mistakes: MistakeWithOccurrences[] }> = {};
        const noClassMistakes: MistakeWithOccurrences[] = [];

        for (const m of pageMistakes) {
          if (!m.occurrences || m.occurrences.length === 0) {
            noClassMistakes.push(m);
            continue;
          }
          for (const occ of m.occurrences) {
            const key = `${occ.class_day}-${occ.class_date}-${occ.class_id}`;
            if (!classBuckets[key]) {
              classBuckets[key] = { day: occ.class_day || '', date: occ.class_date || '', mistakes: [] };
            }
            if (!classBuckets[key].mistakes.find(em => em.id === m.id)) {
              classBuckets[key].mistakes.push(m);
            }
          }
        }

        const sortedKeys = Object.keys(classBuckets).sort((a, b) => {
          const dateA = classBuckets[a].date;
          const dateB = classBuckets[b].date;
          return dateB.localeCompare(dateA);
        });

        return (
          <div>
            <div className={`card p-4 lg:p-6 ${darkMode ? 'border-slate-600/50' : 'bg-white border-slate-200'}`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Mistakes on this page ({pageMistakes.length})
              </h3>

              <div className="space-y-4">
                {sortedKeys.map(key => {
                  const { day, date, mistakes: classMistakes } = classBuckets[key];
                  return (
                    <div key={key} className={`border-l-2 pl-4 ${darkMode ? 'border-cyan-600' : 'border-cyan-400'}`}>
                      <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {day || 'Class'} <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>({date})</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {classMistakes.map(m => (
                          <button
                            key={m.id}
                            onClick={() => flashWord(m.surah_number, m.ayah_number, m.word_index)}
                            className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 border cursor-pointer transition-transform hover:scale-105 ${getMistakeColor(m.error_count, darkMode)}`}
                          >
                            <span className="font-amiri text-lg">{stripQuranMarks(m.word_text)}</span>
                            <span className="text-xs opacity-75">{m.surah_number}:{m.ayah_number}:{m.word_index + 1}</span>
                            {m.error_count > 1 && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">{m.error_count}x</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {noClassMistakes.length > 0 && (
                  <div className={`border-l-2 pl-4 ${darkMode ? 'border-slate-600' : 'border-slate-300'}`}>
                    <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Unlinked mistakes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {noClassMistakes.map(m => (
                        <button
                          key={m.id}
                          onClick={() => flashWord(m.surah_number, m.ayah_number, m.word_index)}
                          className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 border cursor-pointer transition-transform hover:scale-105 ${getMistakeColor(m.error_count, darkMode)}`}
                        >
                          <span className="font-amiri text-lg">{stripQuranMarks(m.word_text)}</span>
                          <span className="text-xs opacity-75">{m.surah_number}:{m.ayah_number}:{m.word_index + 1}</span>
                          {m.error_count > 1 && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">{m.error_count}x</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Flash highlight animation */}
      <style>{`
        @keyframes reader-flash {
          0% { transform: scale(1); background-color: rgba(6, 182, 212, 0.5); }
          50% { transform: scale(1.15); background-color: rgba(6, 182, 212, 0.7); }
          100% { transform: scale(1); background-color: transparent; }
        }
        .reader-flash-highlight {
          animation: reader-flash 1.5s ease-in-out;
          border-radius: 4px;
        }
      `}</style>

      {/* Jump Modal */}
      {showJumpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-sm shadow-2xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Jump to Page</h3>
            <input
              type="number"
              min="1"
              max={TOTAL_PAGES}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              placeholder={`Enter page number (1-${TOTAL_PAGES})`}
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4 ${darkMode ? 'border-slate-600 bg-slate-700 text-slate-100 placeholder-slate-500' : 'border-slate-300 bg-slate-50 text-slate-800 placeholder-slate-400'}`}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowJumpModal(false)}
                className={`flex-1 py-2.5 rounded-xl border font-medium transition-colors ${darkMode ? 'border-slate-600 text-slate-400 hover:bg-slate-700/30' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleJumpToPage}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors"
              >
                Jump
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

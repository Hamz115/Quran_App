import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getQuranPage, getMistakesWithOccurrences, type QuranPageData, type QuranPageWord, type MistakeWithOccurrences } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getPageNumber } from '../data/quranPages';
import { surahNames } from '../lib/quran-utils';
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
  const [searchParams] = useSearchParams();
  const linkedSurah = Number(searchParams.get('surah'));
  const linkedAyah = Number(searchParams.get('ayah'));
  const linkedWord = Number(searchParams.get('word'));
  const hasLinkedWord = Number.isInteger(linkedSurah) && linkedSurah > 0
    && Number.isInteger(linkedAyah) && linkedAyah > 0
    && Number.isInteger(linkedWord) && linkedWord >= 0;
  const [currentPage, setCurrentPage] = useState(() => hasLinkedWord ? getPageNumber(linkedSurah, linkedAyah) : 1);
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
  const linkedWordAppliedRef = useRef(false);

  const flashWord = (surah: number, ayah: number, wordIndex: number) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const key = `${surah}-${ayah}-${wordIndex}`;
    setHighlightedWordKey(key);
    flashTimerRef.current = setTimeout(() => setHighlightedWordKey(null), 1500);
  };

  useEffect(() => {
    if (!pageData || !hasLinkedWord || linkedWordAppliedRef.current) return;
    linkedWordAppliedRef.current = true;
    const key = `${linkedSurah}-${linkedAyah}-${linkedWord}`;
    setHighlightedWordKey(key);
    requestAnimationFrame(() => {
      document.querySelector(`[data-word-key="${key}"]`)?.scrollIntoView({ block: 'center', inline: 'center' });
    });
    flashTimerRef.current = setTimeout(() => setHighlightedWordKey(null), 4000);
  }, [pageData, hasLinkedWord, linkedSurah, linkedAyah, linkedWord]);

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
          const surahMistakes = await getMistakesWithOccurrences(surahNum, user.id);
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
  const selectedSurahNum = surahs[0] || getCurrentSurahNum() || 1;

  return (
    <div data-tour="reader-page" className="approved-page approved-legacy-page approved-reader-page space-y-2 lg:space-y-4 -mx-3 -mt-4 -mb-20 lg:mx-0 lg:mt-0 lg:mb-0">
      {/* Editorial reader header and controls - desktop */}
      <div className="reader-editorial-header hidden lg:flex">
        <div className="reader-selected-surah">
          <span className="reader-eyebrow">Quran Reader · Selected Surah</span>
          <div className="reader-surah-title-row">
            <h1>{surahNames[selectedSurahNum]}</h1>
            <strong lang="ar" dir="rtl">{SURAH_NAMES[selectedSurahNum]}</strong>
          </div>
          <p>Surah {selectedSurahNum} · Page {currentPage} · View with mistake highlights</p>
        </div>

        <div className="reader-control-strip">
          <span className={`reader-status ${fontLoaded ? 'ready' : 'loading'}`}>
            {fontLoaded ? 'Ready' : 'Loading...'}
          </span>
          {mistakesLoading && <span className="reader-status loading">Loading mistakes...</span>}

          <label className="reader-page-input">
            <span>Page</span>
            <input
              type="number"
              min="1"
              max={TOTAL_PAGES}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= TOTAL_PAGES) setCurrentPage(val);
              }}
            />
            <small>/ {TOTAL_PAGES}</small>
          </label>

          <select
            aria-label="Select Surah"
            value={surahs.length > 0 ? surahs[0] : ''}
            onChange={(e) => {
              const surahNum = parseInt(e.target.value);
              if (surahNum >= 1 && surahNum <= 114) setCurrentPage(getPageNumber(surahNum, 1));
            }}
            className="reader-surah-select"
            style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
          >
            {Array.from({ length: 114 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>{num}. {SURAH_NAMES[num]}</option>
            ))}
          </select>

          <button onClick={() => setShowJumpModal(true)} className="reader-jump-button">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Jump
          </button>
        </div>
      </div>

      {/* Same occurrence language and toolbar styling as Classroom */}
      <div className="reader-matching-toolbar hidden sm:grid">
        <div className="classroom-line-legend" aria-label="Mistake occurrence legend">
          <span>Legend</span>
          <span><i className="level-1" />1x</span>
          <span><i className="level-2" />2x</span>
          <span><i className="level-3" />3x</span>
          <span><i className="level-4" />4x</span>
          <span><i className="level-5" />5+</span>
        </div>
        <div className="reader-page-summary">
          <span>{mistakes.filter(m => getPageNumber(m.surah_number, m.ayah_number) === currentPage).length} on page</span>
          <strong>Page {currentPage}{getCurrentSurahNum() ? ` · Surah ${getCurrentSurahNum()}` : ''}</strong>
          <small>{ayahLines.length} lines · {totalWords} words</small>
        </div>
      </div>

      {/* Mushaf Display */}
      <div className="flex items-center justify-center gap-1 relative">
        {/* Next Page Button - LEFT side (RTL) - only on desktop */}
        <button
          onClick={() => canGoNext && setCurrentPage(currentPage + 1)}
          disabled={!canGoNext}
          className={`reader-page-nav hidden lg:flex ${canGoNext ? '' : 'disabled'}`}
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
                            data-word-key={wordKey}
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
          className={`reader-page-nav hidden lg:flex ${canGoPrev ? '' : 'disabled'}`}
          title="Previous Page"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Mistakes by session section */}
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
                        {day || 'Session'} <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>({date})</span>
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
        <div className="new-session-backdrop">
          <div className="reader-jump-dialog">
            <header><span className="approved-eyebrow">QURAN READER</span><h3>Jump to a Mushaf page</h3><p>Enter any verified page from 1 to {TOTAL_PAGES}.</p></header>
            <div className="reader-jump-body">
              <label htmlFor="reader-jump-page">Page number</label>
              <input id="reader-jump-page" type="number" min="1" max={TOTAL_PAGES} value={jumpToPage} onChange={(e) => setJumpToPage(e.target.value)} placeholder={`1–${TOTAL_PAGES}`} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()} />
            </div>
            <footer><button onClick={() => setShowJumpModal(false)} className="approved-secondary-button">Cancel</button><button onClick={handleJumpToPage} className="approved-primary-button">Open page</button></footer>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { getQuranPageWords, getMistakes, type QuranPageWord, type MistakeData } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { getPageNumber } from '../data/quranPages';

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

interface WordData {
  id: number;
  surahNum: number;
  ayahNum: number;
  wordPosition: number;
  textUthmani: string;
  codeV1: string;
  codeV2: string;
  lineNumber: number;
  charType: string;
}

const TOTAL_PAGES = 604;

// Get mistake level (1-5) based on error_count
const getMistakeLevel = (errorCount: number): number => {
  if (errorCount >= 5) return 5;
  if (errorCount >= 4) return 4;
  if (errorCount >= 3) return 3;
  if (errorCount >= 2) return 2;
  return 1;
};

export default function QuranReader() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [wordsByLine, setWordsByLine] = useState<Map<number, WordData[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [jumpToPage, setJumpToPage] = useState('');
  const [showJumpModal, setShowJumpModal] = useState(false);

  // Mistakes state (read-only viewing)
  const [mistakes, setMistakes] = useState<MistakeData[]>([]);
  const [mistakesLoading, setMistakesLoading] = useState(false);
  const [surahs, setSurahs] = useState<number[]>([]);

  // Get highest mistake level for a word (considering all char-level and word-level mistakes)
  // Note: word_index in mistakes is 0-based, but wordPosition from QPC is 1-based
  // So we need to convert: wordPosition - 1 = word_index
  const getWordMistakeInfo = (surah: number, ayah: number, wordIndex: number): { errorCount: number; mistakeId: number | null } => {
    // Find all mistakes for this word (both whole-word and character-level)
    const wordMistakes = mistakes.filter(
      m => m.surah_number === surah && m.ayah_number === ayah && m.word_index === wordIndex
    );

    if (wordMistakes.length === 0) {
      return { errorCount: 0, mistakeId: null };
    }

    // Find the one with highest error_count for display
    const highest = wordMistakes.reduce((prev, curr) =>
      curr.error_count > prev.error_count ? curr : prev
    );

    // Sum all error counts for the word
    const totalErrors = wordMistakes.reduce((sum, m) => sum + m.error_count, 0);

    return { errorCount: totalErrors, mistakeId: highest.id };
  };

  // Load QPC fonts from LOCAL files (OFFLINE)
  // Load both current page font AND previous page font (for overflow ayahs)
  useEffect(() => {
    const paddedPage = currentPage.toString().padStart(3, '0');
    const paddedPrevPage = (currentPage - 1).toString().padStart(3, '0');

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

    // Add previous page font (for overflow ayahs with glyph codes > 0xFC00)
    if (currentPage > 1) {
      const prevStyle = document.createElement('style');
      prevStyle.textContent = `
        @font-face {
          font-family: 'QPC-Page-${currentPage - 1}';
          src: url('/fonts/qpc/QCF_P${paddedPrevPage}.woff2') format('woff2');
          font-display: swap;
        }
      `;
      prevStyle.id = `qpc-font-${currentPage - 1}`;
      document.head.appendChild(prevStyle);
    }

    setFontLoaded(false);
    const fontName = `QPC-Page-${currentPage}`;
    const prevFontName = `QPC-Page-${currentPage - 1}`;

    // Load both fonts
    Promise.all([
      document.fonts.load(`32px "${fontName}"`),
      currentPage > 1 ? document.fonts.load(`32px "${prevFontName}"`) : Promise.resolve()
    ]).then(() => {
      setFontLoaded(true);
    }).catch(() => {
      setFontLoaded(true);
    });
  }, [currentPage]);

  // Load words from backend API
  useEffect(() => {
    const loadPageWords = async () => {
      setLoading(true);
      try {
        const words = await getQuranPageWords(currentPage);

        const lineMap = new Map<number, WordData[]>();
        const surahSet = new Set<number>();

        words.forEach((word: QuranPageWord) => {
          const wordData: WordData = {
            id: word.id,
            surahNum: word.s,
            ayahNum: word.a,
            wordPosition: word.p,
            textUthmani: word.t,
            codeV1: word.c1,
            codeV2: word.c2,
            lineNumber: word.l,
            charType: word.ct
          };

          surahSet.add(word.s);

          if (!lineMap.has(word.l)) {
            lineMap.set(word.l, []);
          }
          lineMap.get(word.l)!.push(wordData);
        });

        setWordsByLine(lineMap);
        setSurahs(Array.from(surahSet));
      } catch (err) {
        console.error('Failed to load page words:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPageWords();
  }, [currentPage]);

  // Load mistakes for surahs on current page
  const loadMistakes = useCallback(async () => {
    if (!user || surahs.length === 0) return;

    setMistakesLoading(true);
    try {
      const allMistakes: MistakeData[] = [];
      for (const surahNum of surahs) {
        const surahMistakes = await getMistakes(surahNum);
        allMistakes.push(...surahMistakes);
      }
      setMistakes(allMistakes);
    } catch (err) {
      console.error('Failed to load mistakes:', err);
    } finally {
      setMistakesLoading(false);
    }
  }, [user, surahs]);

  useEffect(() => {
    loadMistakes();
  }, [loadMistakes]);

  const canGoNext = currentPage < TOTAL_PAGES;
  const canGoPrev = currentPage > 1;

  const lineNumbers = Array.from(wordsByLine.keys()).sort((a, b) => a - b);

  // Detect which surahs START on this page (ayah 1 appears)
  const surahsStartingOnPage = (): { surahNum: number; lineNum: number }[] => {
    const starts: { surahNum: number; lineNum: number }[] = [];
    const seenSurahs = new Set<number>();

    for (const lineNum of lineNumbers) {
      const words = wordsByLine.get(lineNum) || [];
      for (const word of words) {
        if (word.ayahNum === 1 && word.wordPosition === 1 && !seenSurahs.has(word.surahNum)) {
          starts.push({ surahNum: word.surahNum, lineNum });
          seenSurahs.add(word.surahNum);
        }
      }
    }
    return starts;
  };

  const surahStarts = surahsStartingOnPage();

  // Check if a line is the first line of a surah (ayah 1)
  const getSurahStartForLine = (lineNum: number): number | null => {
    const start = surahStarts.find(s => s.lineNum === lineNum);
    return start ? start.surahNum : null;
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum && pageNum >= 1 && pageNum <= TOTAL_PAGES) {
      setCurrentPage(pageNum);
      setShowJumpModal(false);
      setJumpToPage('');
    }
  };

  const getCurrentSurahNum = () => {
    const firstLine = wordsByLine.get(lineNumbers[0]);
    if (firstLine && firstLine.length > 0) {
      return firstLine[0].surahNum;
    }
    return null;
  };

  // Get word styling based on mistake status
  const getWordStyle = (word: WordData) => {
    // Convert 1-based wordPosition to 0-based word_index for lookup
    const { errorCount, mistakeId } = getWordMistakeInfo(word.surahNum, word.ayahNum, word.wordPosition - 1);

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Quran Reader</h1>
          <p className="text-slate-400 mt-1">View Quran pages with mistake highlights</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicators */}
          <span className={`text-xs px-2 py-1 rounded ${fontLoaded ? 'bg-emerald-600/30 text-emerald-400' : 'bg-amber-600/30 text-amber-400'}`}>
            {fontLoaded ? 'Ready' : 'Loading...'}
          </span>
          {mistakesLoading && (
            <span className="text-xs px-2 py-1 rounded bg-blue-600/30 text-blue-400">
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
              className="w-20 px-3 py-2 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-slate-400">/ {TOTAL_PAGES}</span>
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
            className="px-3 py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
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
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-700/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Jump
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-3">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-slate-400 text-sm font-medium">Legend:</span>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-1"></span>
            <span className="text-slate-400">1x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-2"></span>
            <span className="text-slate-400">2x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-3"></span>
            <span className="text-slate-400">3x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-4"></span>
            <span className="text-slate-400">4x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded mistake-5"></span>
            <span className="text-slate-400">5+</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-slate-500 text-sm">
              {mistakes.length} mistakes on this page
            </span>
          </div>
        </div>
      </div>

      {/* Page Info */}
      <div className="card p-4 flex items-center justify-between">
        <div className="text-slate-300">
          <span className="font-semibold">Page {currentPage}</span>
          {getCurrentSurahNum() && (
            <>
              <span className="text-slate-500 mx-2">-</span>
              <span className="text-slate-400">Surah {getCurrentSurahNum()}</span>
            </>
          )}
        </div>
        <div className="text-sm text-slate-500">
          {lineNumbers.length} lines | {Array.from(wordsByLine.values()).flat().length} words
        </div>
      </div>

      {/* Mushaf Display */}
      <div className="flex items-center justify-center gap-2 md:gap-4 min-h-[90vh] relative">
        {/* Next Page Button - LEFT side (RTL) */}
        <button
          onClick={() => canGoNext && setCurrentPage(currentPage + 1)}
          disabled={!canGoNext}
          className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full transition-all flex items-center justify-center ${
            canGoNext
              ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
              : 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
          }`}
          title="Next Page"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Mushaf Page */}
        <div
          className="rounded-lg mushaf-page relative"
          style={{ aspectRatio: '14/20', maxHeight: '95vh', backgroundColor: '#FEF9E7' }}
        >
          {/* Page Content - inside the border */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ zIndex: 1, padding: '5% 3%' }}
          >
          {(loading || !fontLoaded) ? (
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
                fontSize: 'clamp(16px, 3.5vw, 28px)'
              }}
            >
              {lineNumbers.map((lineNum) => {
                const words = wordsByLine.get(lineNum) || [];
                const surahStarting = getSurahStartForLine(lineNum);
                // Show bismillah for surahs 2-114 except surah 9 (At-Tawbah has no bismillah)
                const showBismillah = surahStarting && surahStarting !== 1 && surahStarting !== 9;

                return (
                  <div key={lineNum} className="flex-1 flex flex-col justify-center">
                    {/* Surah Header - shown before the first ayah of a new surah */}
                    {surahStarting && (
                      <div
                        className="text-center mb-1"
                        style={{ fontFamily: "'Amiri', 'Noto Naskh Arabic', serif" }}
                      >
                        <div className="inline-block px-6 py-1 border-2 border-emerald-600 rounded-lg bg-emerald-50">
                          <span className="text-emerald-800 font-bold" style={{ fontSize: 'clamp(14px, 2.5vw, 20px)' }}>
                            سُورَةُ {SURAH_NAMES[surahStarting]}
                          </span>
                        </div>
                      </div>
                    )}
                    {/* Bismillah - shown for surahs 2-114 except 9 */}
                    {showBismillah && (
                      <div
                        className="text-center mb-1 text-slate-700"
                        style={{
                          fontFamily: "'Amiri Quran', 'Amiri', serif",
                          fontSize: 'clamp(12px, 2vw, 18px)'
                        }}
                      >
                        بِسْمِ اللَّهِ الرَّحْمَـٰنِ الرَّحِيمِ
                      </div>
                    )}
                    <div className="flex justify-center items-center text-slate-800 w-full">
                      {words.map((word) => {
                        const wordStyle = getWordStyle(word);
                        // Page 586 has overflow glyphs from page 585 (ayahs 41-42 of Surah 80)
                        // These glyphs have codes >= 0xFC00 and need the previous page's font
                        const glyphCode = word.codeV1.charCodeAt(0);
                        const needsPrevPageFont = currentPage === 586 && glyphCode >= 0xFC00;
                        const fontFamily = needsPrevPageFont
                          ? `'QPC-Page-${currentPage - 1}', 'Amiri Quran', serif`
                          : undefined;

                        return (
                          <span
                            key={word.id}
                            className={`rounded px-0.5 ${
                              word.charType === 'word'
                                ? wordStyle.className
                                : 'text-emerald-700'
                            }`}
                            style={fontFamily ? { fontFamily } : undefined}
                            title={word.charType === 'word'
                              ? `${word.textUthmani} (${word.surahNum}:${word.ayahNum}:${word.wordPosition})${wordStyle.errorCount > 0 ? ` - ${wordStyle.errorCount}x mistakes` : ''}`
                              : `Ayah ${word.ayahNum} end`
                            }
                          >
                            {word.codeV1}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>

        </div>

        {/* Previous Page Button - RIGHT side */}
        <button
          onClick={() => canGoPrev && setCurrentPage(currentPage - 1)}
          disabled={!canGoPrev}
          className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full transition-all flex items-center justify-center ${
            canGoPrev
              ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white'
              : 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
          }`}
          title="Previous Page"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Jump Modal */}
      {showJumpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Jump to Page</h3>
            <input
              type="number"
              min="1"
              max={TOTAL_PAGES}
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value)}
              placeholder={`Enter page number (1-${TOTAL_PAGES})`}
              className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowJumpModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 font-medium hover:bg-slate-700/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJumpToPage}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
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

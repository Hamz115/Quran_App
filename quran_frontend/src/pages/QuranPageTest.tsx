import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuranPageWords, type QuranPageWord } from '../api';

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

export default function QuranPageTest() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [wordsByLine, setWordsByLine] = useState<Map<number, WordData[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);
  const [surahStarts, setSurahStarts] = useState<Map<number, number>>(new Map()); // lineNumber -> surahNum

  // Load QPC fonts from LOCAL files (OFFLINE)
  useEffect(() => {
    const paddedPage = currentPage.toString().padStart(3, '0');
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'QPC-Page-${currentPage}';
        src: url('/fonts/qpc/QCF_P${paddedPage}.woff2') format('woff2');
        font-display: swap;
      }
    `;
    style.id = `qpc-font-${currentPage}`;

    // Remove old font styles
    document.querySelectorAll('[id^="qpc-font-"]').forEach(el => {
      if (el.id !== `qpc-font-${currentPage}`) el.remove();
    });

    document.head.appendChild(style);

    // Wait for font to load
    setFontLoaded(false);
    const fontName = `QPC-Page-${currentPage}`;
    document.fonts.load(`32px "${fontName}"`).then(() => {
      setFontLoaded(true);
    }).catch(() => {
      // Font failed to load, will fallback to Amiri
      setFontLoaded(true);
    });

    return () => {
      // Cleanup on unmount
    };
  }, [currentPage]);

  // Load words from backend API
  useEffect(() => {
    const loadPageWords = async () => {
      setLoading(true);
      try {
        const words = await getQuranPageWords(currentPage);

        const lineMap = new Map<number, WordData[]>();
        const surahStartsMap = new Map<number, number>(); // lineNumber -> surahNum

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

          // Detect surah start (first word of ayah 1)
          if (word.a === 1 && word.p === 1 && word.ct === 'word') {
            surahStartsMap.set(word.l, word.s);
          }

          if (!lineMap.has(word.l)) {
            lineMap.set(word.l, []);
          }
          lineMap.get(word.l)!.push(wordData);
        });

        setWordsByLine(lineMap);
        setSurahStarts(surahStartsMap);
      } catch (err) {
        console.error('Failed to load page words:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPageWords();
  }, [currentPage]);

  const handleWordClick = (word: WordData) => {
    // Only select actual words, not ayah markers
    if (word.charType === 'word') {
      setSelectedWord(word);
      console.log('Word clicked:', word);
    }
  };

  const canGoNext = currentPage < TOTAL_PAGES;
  const canGoPrev = currentPage > 1;

  // Get sorted line numbers
  const lineNumbers = Array.from(wordsByLine.keys()).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
          <h1 className="text-lg font-bold text-emerald-400">QPC Font Rendering Test</h1>
          <span className={`text-xs px-2 py-1 rounded ${fontLoaded ? 'bg-emerald-600' : 'bg-amber-600'}`}>
            {fontLoaded ? 'Font Loaded' : 'Loading Font...'}
          </span>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="max-w-4xl mx-auto mb-4 flex items-center justify-center gap-4">
        <button
          onClick={() => canGoPrev && setCurrentPage(currentPage - 1)}
          disabled={!canGoPrev}
          className={`px-4 py-2 rounded-lg transition-all ${
            canGoPrev
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          <input
            type="number"
            value={currentPage}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= 1 && val <= TOTAL_PAGES) {
                setCurrentPage(val);
              }
            }}
            className="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-center"
            min={1}
            max={TOTAL_PAGES}
          />
          <span className="text-slate-400">/ {TOTAL_PAGES}</span>
        </div>

        <button
          onClick={() => canGoNext && setCurrentPage(currentPage + 1)}
          disabled={!canGoNext}
          className={`px-4 py-2 rounded-lg transition-all ${
            canGoNext
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          Next
        </button>
      </div>

      {/* Mushaf Page - QPC Font Rendered */}
      <div className="max-w-2xl mx-auto">
        <div
          className="bg-[#FEF9E7] rounded-lg shadow-2xl overflow-hidden px-3 py-4 md:px-4 md:py-6"
          style={{ aspectRatio: '14/20' }}
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
                fontSize: 'clamp(14px, 3.5vw, 26px)'
              }}
            >
              {lineNumbers.map((lineNum) => {
                const words = wordsByLine.get(lineNum) || [];
                const surahStarting = surahStarts.get(lineNum);

                return (
                  <div key={lineNum} className="flex-1 flex flex-col justify-center">
                    {/* Surah Header - show if new surah starts on this line */}
                    {surahStarting && (
                      <div className="text-center mb-0.5">
                        <span className="inline-block px-3 py-0.5 bg-emerald-100 border border-emerald-300 rounded text-emerald-800 font-amiri text-sm">
                          سورة {SURAH_NAMES[surahStarting]}
                        </span>
                        {/* Bismillah - show for all surahs except 1 (Fatiha) and 9 (Tawbah) */}
                        {surahStarting !== 1 && surahStarting !== 9 && (
                          <div className="text-emerald-700 font-amiri text-xs">
                            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                          </div>
                        )}
                      </div>
                    )}
                    {/* Words */}
                    <div className="flex justify-center items-center text-slate-800 w-full overflow-hidden">
                      {words.map((word) => (
                        <span
                          key={word.id}
                          onClick={() => handleWordClick(word)}
                          className={`cursor-pointer transition-all rounded px-0.5 ${
                            word.charType === 'word'
                              ? 'hover:bg-emerald-200'
                              : 'text-emerald-700'
                          } ${
                            selectedWord?.id === word.id
                              ? 'bg-amber-300 text-amber-900'
                              : ''
                          }`}
                          title={word.charType === 'word'
                            ? `${word.textUthmani} (${word.surahNum}:${word.ayahNum}:${word.wordPosition})`
                            : `Ayah ${word.ayahNum} end`
                          }
                        >
                          {word.codeV1}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Word Info */}
        {selectedWord && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-emerald-400 font-semibold mb-2">Selected Word:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div><span className="text-slate-400">Word:</span> <span className="font-amiri text-xl">{selectedWord.textUthmani}</span></div>
              <div><span className="text-slate-400">Surah:</span> {selectedWord.surahNum}</div>
              <div><span className="text-slate-400">Ayah:</span> {selectedWord.ayahNum}</div>
              <div><span className="text-slate-400">Word #:</span> {selectedWord.wordPosition}</div>
              <div><span className="text-slate-400">Line:</span> {selectedWord.lineNumber}</div>
              <div><span className="text-slate-400">Type:</span> {selectedWord.charType}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm">
                Mark Mistake (Level 1)
              </button>
              <button className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-sm">
                Level 3
              </button>
              <button className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm">
                Level 5
              </button>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="mt-4 p-4 bg-slate-800/30 rounded-lg text-xs text-slate-400">
          <p>Page: {currentPage} | Lines: {lineNumbers.length} | Total words: {Array.from(wordsByLine.values()).flat().length}</p>
          <p className="mt-1 text-emerald-400">
            Using QPC V1 font (page-specific) with glyph codes from Quran.com API.
            Each word is directly clickable - no coordinate guessing!
          </p>
        </div>
      </div>
    </div>
  );
}

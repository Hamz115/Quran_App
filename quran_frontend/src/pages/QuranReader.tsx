import { useState, useEffect, useRef } from 'react';
import { getSurahs, getSurah } from '../api';
import { getPageRange, getSurahsOnPage, TOTAL_PAGES } from '../data/quranPages';

interface AyahData {
  number: number;
  text: string;
  numberInSurah: number;
}

interface SurahData {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: AyahData[];
}

export default function QuranReader() {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSurahsData, setPageSurahsData] = useState<Map<number, SurahData>>(new Map());
  const [surahLoading, setSurahLoading] = useState(false);
  const [surahList, setSurahList] = useState<{ number: number; englishName: string; name: string; numberOfAyahs: number }[]>([]);
  const [jumpToPage, setJumpToPage] = useState('');
  const [showJumpModal, setShowJumpModal] = useState(false);

  // Refs for content
  const quranContentRef = useRef<HTMLDivElement>(null);
  const quranContainerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(2.2);

  // Calculate line-height to fill page AFTER content renders
  useEffect(() => {
    if (!quranContentRef.current || !quranContainerRef.current || surahLoading || !pageSurahsData.size) return;

    // Wait for content to fully render
    const timer = setTimeout(() => {
      const container = quranContainerRef.current;
      const content = quranContentRef.current;
      if (!container || !content) return;

      // Get available height (container minus padding)
      const containerRect = container.getBoundingClientRect();
      const style = getComputedStyle(container);
      const paddingTop = parseFloat(style.paddingTop);
      const paddingBottom = parseFloat(style.paddingBottom);
      const availableHeight = containerRect.height - paddingTop - paddingBottom;

      // Measure content at base line-height
      content.style.lineHeight = '2';
      void content.offsetHeight; // Force reflow
      const contentHeight = content.getBoundingClientRect().height;

      if (contentHeight > 0) {
        const ratio = availableHeight / contentHeight;
        // Scale line-height: compress if too big (ratio < 1), expand if too small (ratio > 1)
        // Min 1.4 (very compressed), Max 4.0 (very expanded)
        const newLH = Math.max(1.4, Math.min(4.0, 2 * ratio));
        setLineHeight(newLH);
      } else {
        setLineHeight(2);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [currentPage, pageSurahsData, surahLoading]);

  // Load surah list
  useEffect(() => {
    getSurahs().then(setSurahList).catch(console.error);
  }, []);

  // Load surahs for current page
  useEffect(() => {
    const loadPageSurahs = async () => {
      const surahsOnPage = getSurahsOnPage(currentPage);
      const newSurahsData = new Map(pageSurahsData);
      let needsUpdate = false;

      setSurahLoading(true);

      for (const surahNum of surahsOnPage) {
        if (!newSurahsData.has(surahNum)) {
          try {
            const data = await getSurah(surahNum);
            newSurahsData.set(surahNum, data);
            needsUpdate = true;
          } catch (err) {
            console.error(`Failed to load surah ${surahNum}:`, err);
          }
        }
      }

      if (needsUpdate) {
        setPageSurahsData(newSurahsData);
      }
      setSurahLoading(false);
    };

    loadPageSurahs();
  }, [currentPage]);

  // Get content for current page
  const getPageContent = () => {
    const range = getPageRange(currentPage);
    const surahsOnPage = getSurahsOnPage(currentPage);
    const content: { surahNum: number; surahData: SurahData; ayahs: AyahData[] }[] = [];

    for (const surahNum of surahsOnPage) {
      const surahData = pageSurahsData.get(surahNum);
      if (!surahData) continue;

      let startAyah = 1;
      let endAyah = surahData.numberOfAyahs;

      if (surahNum === range.startSurah) {
        startAyah = range.startAyah;
      }
      if (surahNum === range.endSurah) {
        endAyah = range.endAyah === 999 ? surahData.numberOfAyahs : range.endAyah;
      }

      const ayahs = surahData.ayahs.filter(
        a => a.numberInSurah >= startAyah && a.numberInSurah <= endAyah
      );

      if (ayahs.length > 0) {
        content.push({ surahNum, surahData, ayahs });
      }
    }

    return content;
  };

  const pageContent = getPageContent();
  const allSurahsLoaded = getSurahsOnPage(currentPage).every(s => pageSurahsData.has(s));

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

  // Get surah info for current page
  const getPageSurahInfo = () => {
    const surahsOnPage = getSurahsOnPage(currentPage);
    const names = surahsOnPage.map(s => {
      const surah = surahList.find(sl => sl.number === s);
      return surah ? surah.englishName : `Surah ${s}`;
    });
    return names.join(', ');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Mushaf Page Viewer</h1>
          <p className="text-slate-400 mt-1">Check each page for errors in page mapping</p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Page Info */}
      <div className="card p-4 flex items-center justify-between">
        <div className="text-slate-300">
          <span className="font-semibold">Page {currentPage}</span>
          <span className="text-slate-500 mx-2">•</span>
          <span className="text-slate-400">{getPageSurahInfo()}</span>
        </div>
        <div className="text-sm text-slate-500">
          Use arrow keys or buttons to navigate
        </div>
      </div>

      {/* Mushaf Display */}
      <div className="flex items-center justify-center gap-2 md:gap-4 min-h-[90vh] relative">
        {/* Next Page Button - LEFT side (RTL: forward = left) - Small & subtle */}
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

        {/* Mushaf Page - Madani Mushaf aspect ratio 14:20 (width:height = 0.7), 15 lines per page */}
        <div className="mushaf-page mx-auto overflow-hidden flex flex-col" style={{ aspectRatio: '14/20', height: '85vh' }}>
          {/* Corner decorations */}
          <span className="corner-tl">✦</span>
          <span className="corner-tr">✦</span>
          <span className="corner-bl">✦</span>
          <span className="corner-br">✦</span>
          {/* Edge decorations */}
          <span className="edge-top">❧ ✤ ❧ ✤ ❧ ✤ ❧</span>
          <span className="edge-bottom">❧ ✤ ❧ ✤ ❧ ✤ ❧</span>

          {/* Content */}
          <div ref={quranContainerRef} className="p-4 md:p-6 pt-8 pb-8 h-full flex flex-col">
            {surahLoading || !allSurahsLoaded ? (
              <div className="flex flex-col items-center justify-center py-20 flex-1">
                <div className="spinner mb-4"></div>
                <p className="text-slate-600">Loading Quran...</p>
              </div>
            ) : pageContent.length > 0 ? (
              <div ref={quranContentRef} style={{ lineHeight }}>
                {pageContent.map(({ surahNum, surahData, ayahs }, surahIndex) => (
                  <div key={surahNum}>
                    {/* Surah Header */}
                    {ayahs.some(a => a.numberInSurah === 1) && (
                      <div className={`text-center mb-2 ${surahIndex > 0 ? 'mt-6' : ''}`}>
                        <div className="surah-header-frame">
                          <h2 className="font-amiri text-xl md:text-2xl text-emerald-800">{surahData.name}</h2>
                        </div>
                      </div>
                    )}

                    {/* Bismillah */}
                    {surahNum !== 9 && surahNum !== 1 && ayahs.some(a => a.numberInSurah === 1) && (
                      <p className="font-amiri text-base md:text-lg text-center text-emerald-700 mb-3 pb-1 border-b border-emerald-600/20">
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                      </p>
                    )}

                    {/* Continuation badge */}
                    {!ayahs.some(a => a.numberInSurah === 1) && surahIndex === 0 && (
                      <div className="text-center mb-2">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs">
                          {surahData.englishName} (continued)
                        </span>
                      </div>
                    )}

                    {/* Ayahs */}
                    <div className="font-amiri text-lg md:text-xl text-slate-800 text-justify" dir="rtl" style={{ lineHeight }}>
                      {ayahs.map((ayah) => {
                        const shouldStripBismillah = ayah.numberInSurah === 1 && surahNum !== 1 && surahNum !== 9;
                        const words = ayah.text.split(' ');
                        const displayWords = shouldStripBismillah ? words.slice(4) : words;

                        return (
                          <span key={`${surahNum}-${ayah.number}`} className="inline">
                            {displayWords.map((word, idx) => (
                              <span key={`${ayah.number}-${idx}`} className="inline">
                                {word}{' '}
                              </span>
                            ))}
                            <span className="text-emerald-600 text-sm md:text-base font-medium select-none">
                              ﴿{ayah.numberInSurah}﴾
                            </span>{' '}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-slate-700">No content for this page</p>
              </div>
            )}
          </div>
        </div>

        {/* Previous Page Button - RIGHT side - Small & subtle */}
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

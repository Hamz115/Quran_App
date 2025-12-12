import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSurahs, getSurah, getMistakes, addMistake, removeMistake } from '../api';

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

interface Mistake {
  id: number;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  error_count: number;
  last_error: string;
}

export default function QuranReader() {
  const [searchParams] = useSearchParams();
  const initialSurah = Number(searchParams.get('surah')) || 67;

  const [selectedSurah, setSelectedSurah] = useState(initialSurah);
  const [surahData, setSurahData] = useState<SurahData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [surahList, setSurahList] = useState<{ number: number; englishName: string; name: string; numberOfAyahs: number }[]>([]);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpToAyah, setJumpToAyah] = useState('');

  // Load surah list
  useEffect(() => {
    getSurahs().then(setSurahList).catch(console.error);
  }, []);

  // Load mistakes
  useEffect(() => {
    getMistakes().then(setMistakes).catch(console.error);
  }, []);

  // Handle URL param changes
  useEffect(() => {
    const surahFromUrl = Number(searchParams.get('surah'));
    if (surahFromUrl && surahFromUrl !== selectedSurah) {
      setSelectedSurah(surahFromUrl);
    }
  }, [searchParams]);

  // Load surah data
  useEffect(() => {
    setLoading(true);
    getSurah(selectedSurah)
      .then(setSurahData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedSurah]);

  const getMistakeLevel = (ayahNumber: number, wordIndex: number): number => {
    const mistake = mistakes.find(
      (m) =>
        m.surah_number === selectedSurah &&
        m.ayah_number === ayahNumber &&
        m.word_index === wordIndex
    );
    if (!mistake) return 0;
    if (mistake.error_count >= 3) return 3;
    if (mistake.error_count >= 2) return 2;
    return 1;
  };

  const handleWordClick = async (ayahNumber: number, wordIndex: number, wordText: string) => {
    try {
      const result = await addMistake({
        surah_number: selectedSurah,
        ayah_number: ayahNumber,
        word_index: wordIndex,
        word_text: wordText,
      });

      // Update local state
      const existingIndex = mistakes.findIndex(
        (m) =>
          m.surah_number === selectedSurah &&
          m.ayah_number === ayahNumber &&
          m.word_index === wordIndex
      );

      if (existingIndex >= 0) {
        const updated = [...mistakes];
        updated[existingIndex] = { ...updated[existingIndex], error_count: result.error_count };
        setMistakes(updated);
      } else {
        setMistakes([...mistakes, {
          id: result.id,
          surah_number: selectedSurah,
          ayah_number: ayahNumber,
          word_index: wordIndex,
          word_text: wordText,
          error_count: result.error_count,
          last_error: new Date().toISOString().split('T')[0],
        }]);
      }
    } catch (err) {
      console.error('Failed to add mistake:', err);
    }
  };

  const handleWordRightClick = async (e: React.MouseEvent, ayahNumber: number, wordIndex: number) => {
    e.preventDefault();

    const existingMistake = mistakes.find(
      (m) =>
        m.surah_number === selectedSurah &&
        m.ayah_number === ayahNumber &&
        m.word_index === wordIndex
    );

    if (!existingMistake) return;

    try {
      const result = await removeMistake(existingMistake.id);

      if (result.error_count === 0) {
        setMistakes(mistakes.filter((m) => m.id !== existingMistake.id));
      } else {
        setMistakes(
          mistakes.map((m) =>
            m.id === existingMistake.id ? { ...m, error_count: result.error_count } : m
          )
        );
      }
    } catch (err) {
      console.error('Failed to remove mistake:', err);
    }
  };

  const currentMistakes = mistakes.filter((m) => m.surah_number === selectedSurah);
  const totalErrors = currentMistakes.reduce((acc, m) => acc + m.error_count, 0);

  const goToPrevSurah = () => {
    if (selectedSurah > 1) setSelectedSurah(selectedSurah - 1);
  };

  const goToNextSurah = () => {
    if (selectedSurah < 114) setSelectedSurah(selectedSurah + 1);
  };

  const handleJumpToAyah = () => {
    const ayahNum = parseInt(jumpToAyah);
    if (ayahNum && surahData && ayahNum >= 1 && ayahNum <= surahData.numberOfAyahs) {
      const element = document.getElementById(`ayah-${ayahNum}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-emerald-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-emerald-500', 'ring-offset-2');
        }, 2000);
      }
      setShowJumpModal(false);
      setJumpToAyah('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Quran Reader</h1>
          <p className="text-slate-400 mt-1">Click words to mark mistakes. Right-click to remove.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Jump to Ayah */}
          <button
            onClick={() => setShowJumpModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-700/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Jump to Ayah
          </button>

          {/* Surah Selector */}
          <select
            value={selectedSurah}
            onChange={(e) => setSelectedSurah(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[200px]"
          >
            {surahList.map((surah) => (
              <option key={surah.number} value={surah.number}>
                {surah.number}. {surah.englishName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Bar */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400 font-medium">Legend:</span>
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
              <span className="text-slate-400">3+</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Error Count */}
          <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
            totalErrors === 0
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : totalErrors < 5
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {totalErrors} {totalErrors === 1 ? 'mistake' : 'mistakes'} in this Surah
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevSurah}
          disabled={selectedSurah === 1}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous Surah
        </button>

        {surahData && (
          <div className="text-center">
            <h2 className="arabic text-2xl text-slate-100">{surahData.name}</h2>
            <p className="text-sm text-slate-400">{surahData.englishName} • {surahData.numberOfAyahs} Ayahs • {surahData.revelationType}</p>
          </div>
        )}

        <button
          onClick={goToNextSurah}
          disabled={selectedSurah === 114}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next Surah
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Quran Text */}
      <div className="card p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner mb-4"></div>
            <p className="text-slate-400">Loading Surah...</p>
          </div>
        ) : surahData ? (
          <div>
            {/* Bismillah */}
            {selectedSurah !== 9 && selectedSurah !== 1 && (
              <p className="arabic text-2xl text-center text-emerald-400 mb-8 pb-6 border-b border-slate-700/30">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
            )}

            {/* Ayahs */}
            <div className="arabic text-2xl leading-[2.8] text-slate-100 text-right">
              {surahData.ayahs.map((ayah) => {
                // Strip Bismillah from first ayah (4 words) for surahs other than 1 and 9
                const shouldStripBismillah = ayah.numberInSurah === 1 && selectedSurah !== 1 && selectedSurah !== 9;
                const words = ayah.text.split(' ');
                const displayWords = shouldStripBismillah ? words.slice(4) : words;
                const wordOffset = shouldStripBismillah ? 4 : 0;

                return (
                <span key={ayah.number} id={`ayah-${ayah.numberInSurah}`} className="inline transition-all rounded-lg">
                  {displayWords.map((word, idx) => {
                    const wordIndex = idx + wordOffset;
                    const mistakeLevel = getMistakeLevel(ayah.numberInSurah, wordIndex);
                    return (
                      <span
                        key={`${ayah.number}-${wordIndex}`}
                        onClick={() => handleWordClick(ayah.numberInSurah, wordIndex, word)}
                        onContextMenu={(e) => handleWordRightClick(e, ayah.numberInSurah, wordIndex)}
                        className={`cursor-pointer hover:bg-slate-700/50 rounded px-0.5 transition-all inline-block ${
                          mistakeLevel === 1
                            ? 'mistake-1'
                            : mistakeLevel === 2
                            ? 'mistake-2'
                            : mistakeLevel === 3
                            ? 'mistake-3'
                            : ''
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}{' '}
                  <span className="text-emerald-400 text-lg font-medium mx-2 select-none">
                    ﴿{ayah.numberInSurah}﴾
                  </span>{' '}
                </span>
              );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-slate-100 font-medium mb-1">Failed to load Surah</p>
            <p className="text-slate-400 text-sm">Please check your connection and try again</p>
          </div>
        )}
      </div>

      {/* Mistakes Summary */}
      {currentMistakes.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-100">Mistakes in this Surah</h3>
            <span className="text-sm text-slate-400">{currentMistakes.length} words marked</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentMistakes.map((mistake) => (
              <button
                key={mistake.id}
                onClick={() => {
                  const element = document.getElementById(`ayah-${mistake.ayah_number}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all hover:scale-105 ${
                  mistake.error_count >= 3
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : mistake.error_count >= 2
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                }`}
              >
                <span className="arabic text-lg">{mistake.word_text}</span>
                <span className="text-xs opacity-75">
                  {mistake.ayah_number}:{mistake.word_index + 1}
                </span>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  mistake.error_count >= 3 ? 'bg-red-500/40' :
                  mistake.error_count >= 2 ? 'bg-orange-500/40' :
                  'bg-amber-500/40'
                }`}>
                  {mistake.error_count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Jump to Ayah Modal */}
      {showJumpModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Jump to Ayah</h3>
            <input
              type="number"
              min="1"
              max={surahData?.numberOfAyahs || 999}
              value={jumpToAyah}
              onChange={(e) => setJumpToAyah(e.target.value)}
              placeholder={`Enter ayah number (1-${surahData?.numberOfAyahs || '...'})`}
              className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleJumpToAyah()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowJumpModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-400 font-medium hover:bg-slate-700/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJumpToAyah}
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

import { useParams, useNavigate } from 'react-router-dom';

// Mock student data
const mockStudent = {
  id: 1,
  name: 'Ahmed Hassan',
};

// Mock class data for this student
const mockClassData = {
  id: 1,
  date: '2024-12-10',
  day: 'Tuesday',
  teacherName: 'Ustadh Ibrahim',
  surah: 67,
  ayahStart: 1,
  ayahEnd: 10,
  performance: 'Excellent',
  notes: 'Great recitation today. Minor tajweed corrections needed on the madd in ayah 4. Keep practicing the flow between ayahs.',
};

const surahNames: Record<number, string> = {
  67: 'Al-Mulk', 68: 'Al-Qalam', 78: 'An-Naba', 89: 'Al-Fajr',
};

// Mock Quran text
const mockAyahs = [
  { number: 1, text: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ' },
  { number: 2, text: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ' },
  { number: 3, text: 'الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ' },
  { number: 4, text: 'ثُمَّ ارْجِعِ الْبَصَرَ كَرَّتَيْنِ يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ' },
  { number: 5, text: 'وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ ۖ وَأَعْتَدْنَا لَهُمْ عَذَابَ السَّعِيرِ' },
  { number: 6, text: 'وَلِلَّذِينَ كَفَرُوا بِرَبِّهِمْ عَذَابُ جَهَنَّمَ ۖ وَبِئْسَ الْمَصِيرُ' },
  { number: 7, text: 'إِذَا أُلْقُوا فِيهَا سَمِعُوا لَهَا شَهِيقًا وَهِيَ تَفُورُ' },
  { number: 8, text: 'تَكَادُ تَمَيَّزُ مِنَ الْغَيْظِ ۖ كُلَّمَا أُلْقِيَ فِيهَا فَوْجٌ سَأَلَهُمْ خَزَنَتُهَا أَلَمْ يَأْتِكُمْ نَذِيرٌ' },
  { number: 9, text: 'قَالُوا بَلَىٰ قَدْ جَاءَنَا نَذِيرٌ فَكَذَّبْنَا وَقُلْنَا مَا نَزَّلَ اللَّهُ مِن شَيْءٍ إِنْ أَنتُمْ إِلَّا فِي ضَلَالٍ كَبِيرٍ' },
  { number: 10, text: 'وَقَالُوا لَوْ كُنَّا نَسْمَعُ أَوْ نَعْقِلُ مَا كُنَّا فِي أَصْحَابِ السَّعِيرِ' },
];

// My mistakes from this class
const mockMyMistakes = [
  { ayah: 2, wordIndex: 3, text: 'لِيَبْلُوَكُمْ', count: 2 },
  { ayah: 4, wordIndex: 1, text: 'ارْجِعِ', count: 1 },
];

const getPerformanceStyle = (perf: string) => {
  switch (perf) {
    case 'Excellent': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Very Good': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    case 'Good': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'Needs Work': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-600/50 text-slate-400 border-slate-500/30';
  }
};

const getMistakeStyle = (count: number) => {
  if (count >= 3) return 'bg-red-500/30 text-red-200';
  if (count >= 2) return 'bg-orange-500/30 text-orange-200';
  return 'bg-amber-500/30 text-amber-200';
};

export default function StudentClassroom() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/student/classes')}
          className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">
            My Class - {mockClassData.day}, {mockClassData.date}
          </h1>
          <p className="text-slate-400 text-sm">
            With {mockClassData.teacherName}
          </p>
        </div>
      </div>

      {/* Class Summary Card */}
      <div className="card p-6 bg-gradient-to-r from-slate-800 to-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl font-bold text-white">
              {mockStudent.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">{mockStudent.name}</h2>
              <p className="text-slate-400">
                {surahNames[mockClassData.surah]} • Ayah {mockClassData.ayahStart}-{mockClassData.ayahEnd}
              </p>
            </div>
          </div>

          {/* Performance Badge */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Teacher's Rating</p>
            <span className={`px-4 py-2 rounded-xl border text-lg font-semibold ${getPerformanceStyle(mockClassData.performance)}`}>
              {mockClassData.performance}
            </span>
          </div>
        </div>
      </div>

      {/* Teacher's Notes */}
      {mockClassData.notes && (
        <div className="card p-5 border-l-4 border-amber-500/50">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h3 className="font-medium text-amber-400 mb-1">Notes from {mockClassData.teacherName}</h3>
              <p className="text-slate-300">{mockClassData.notes}</p>
            </div>
          </div>
        </div>
      )}

      {/* My Mistakes in This Class */}
      {mockMyMistakes.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-medium text-slate-200">Mistakes to Review</h3>
            <span className="text-xs text-slate-500">({mockMyMistakes.length} words)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {mockMyMistakes.map((m, idx) => (
              <div key={idx} className={`px-4 py-2 rounded-xl ${getMistakeStyle(m.count)}`}>
                <span className="arabic text-lg">{m.text}</span>
                <span className="text-xs ml-2 opacity-75">Ayah {m.ayah} • {m.count}x</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-3">
            Practice these words before your next class!
          </p>
        </div>
      )}

      {/* Quran Text (Read-Only) */}
      <div className="card p-8">
        {/* Surah Header */}
        <div className="text-center mb-8 pb-6 border-b border-slate-700/30">
          <h2 className="arabic text-3xl text-slate-100 mb-2">سُورَةُ الْمُلْك</h2>
          <p className="text-slate-400">
            {surahNames[mockClassData.surah]} • Ayah {mockClassData.ayahStart}-{mockClassData.ayahEnd}
          </p>
        </div>

        {/* Bismillah */}
        <p className="arabic text-2xl text-center text-emerald-400 mb-8 pb-6 border-b border-slate-700/30">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        {/* Ayahs - Read-only, mistakes highlighted */}
        <div className="arabic text-2xl leading-[2.8] text-slate-200 text-right">
          {mockAyahs.slice(0, mockClassData.ayahEnd).map((ayah) => {
            const words = ayah.text.split(' ');

            return (
              <span key={ayah.number} className="inline">
                {words.map((word, wordIdx) => {
                  const mistake = mockMyMistakes.find(
                    m => m.ayah === ayah.number && m.wordIndex === wordIdx
                  );

                  return (
                    <span
                      key={`${ayah.number}-${wordIdx}`}
                      className={`rounded px-0.5 ${mistake ? getMistakeStyle(mistake.count) : ''}`}
                    >
                      {word}
                    </span>
                  );
                })}{' '}
                <span className="text-emerald-400 text-lg font-medium mx-2 select-none">
                  ﴿{ayah.number}﴾
                </span>{' '}
              </span>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4">
        <a
          href="/student/practice"
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Practice This Portion
        </a>
        <a
          href="/reader"
          className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Open in Quran Reader
        </a>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// Mock students in this class
const mockClassStudents = [
  { id: 1, name: 'Ahmed Hassan', surah: 67, ayahStart: 1, ayahEnd: 10, mistakes: 2, performance: null },
  { id: 3, name: 'Zaid Ibrahim', surah: 78, ayahStart: 1, ayahEnd: 15, mistakes: 5, performance: null },
  { id: 5, name: 'Hamza Khan', surah: 89, ayahStart: 1, ayahEnd: 10, mistakes: 0, performance: null },
];

const surahNames: Record<number, string> = {
  67: 'Al-Mulk', 68: 'Al-Qalam', 78: 'An-Naba', 89: 'Al-Fajr',
};

// Mock Quran text
const mockAyahs: Record<number, { number: number; text: string }[]> = {
  67: [
    { number: 1, text: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ' },
    { number: 2, text: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ' },
    { number: 3, text: 'الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ' },
    { number: 4, text: 'ثُمَّ ارْجِعِ الْبَصَرَ كَرَّتَيْنِ يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ' },
    { number: 5, text: 'وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ ۖ وَأَعْتَدْنَا لَهُمْ عَذَابَ السَّعِيرِ' },
  ],
  78: [
    { number: 1, text: 'عَمَّ يَتَسَاءَلُونَ' },
    { number: 2, text: 'عَنِ النَّبَإِ الْعَظِيمِ' },
    { number: 3, text: 'الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ' },
    { number: 4, text: 'كَلَّا سَيَعْلَمُونَ' },
    { number: 5, text: 'ثُمَّ كَلَّا سَيَعْلَمُونَ' },
  ],
  89: [
    { number: 1, text: 'وَالْفَجْرِ' },
    { number: 2, text: 'وَلَيَالٍ عَشْرٍ' },
    { number: 3, text: 'وَالشَّفْعِ وَالْوَتْرِ' },
    { number: 4, text: 'وَاللَّيْلِ إِذَا يَسْرِ' },
    { number: 5, text: 'هَلْ فِي ذَٰلِكَ قَسَمٌ لِّذِي حِجْرٍ' },
  ],
};

// Mock mistakes per student (each student has their own "layer")
const mockStudentMistakes: Record<number, { ayah: number; wordIndex: number; text: string; count: number }[]> = {
  1: [ // Ahmed's mistakes
    { ayah: 2, wordIndex: 3, text: 'لِيَبْلُوَكُمْ', count: 2 },
    { ayah: 4, wordIndex: 1, text: 'ارْجِعِ', count: 1 },
  ],
  3: [ // Zaid's mistakes
    { ayah: 1, wordIndex: 0, text: 'عَمَّ', count: 3 },
    { ayah: 2, wordIndex: 2, text: 'الْعَظِيمِ', count: 1 },
    { ayah: 3, wordIndex: 4, text: 'مُخْتَلِفُونَ', count: 2 },
  ],
  5: [], // Hamza has no mistakes
};

const performanceOptions = ['Excellent', 'Very Good', 'Good', 'Needs Work'];

const getPerformanceStyle = (perf: string | null) => {
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

export default function TeacherClassroom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [selectedStudentId, setSelectedStudentId] = useState(mockClassStudents[0].id);
  const [studentPerformances, setStudentPerformances] = useState<Record<number, string | null>>(
    Object.fromEntries(mockClassStudents.map(s => [s.id, s.performance]))
  );
  const [showPerformanceDropdown, setShowPerformanceDropdown] = useState(false);

  const selectedStudent = mockClassStudents.find(s => s.id === selectedStudentId)!;
  const studentMistakes = mockStudentMistakes[selectedStudentId] || [];
  const ayahs = mockAyahs[selectedStudent.surah] || [];

  const handleSetPerformance = (perf: string) => {
    setStudentPerformances(prev => ({ ...prev, [selectedStudentId]: perf }));
    setShowPerformanceDropdown(false);
  };

  const currentPerformance = studentPerformances[selectedStudentId];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/teacher/classes')}
          className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">
            Class #{id} - Tuesday, Dec 10, 2024
          </h1>
          <p className="text-slate-400 text-sm">
            {mockClassStudents.length} students in this session
          </p>
        </div>
        <button className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Publish Class
        </button>
      </div>

      {/* Student Switcher Tabs - THE KEY FEATURE */}
      <div className="card p-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 px-3">Students:</span>
          {mockClassStudents.map((student) => {
            const isSelected = student.id === selectedStudentId;
            const perf = studentPerformances[student.id];
            const mistakes = mockStudentMistakes[student.id]?.length || 0;

            return (
              <button
                key={student.id}
                onClick={() => setSelectedStudentId(student.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 border-2 border-emerald-500/50'
                    : 'bg-slate-800/50 border-2 border-transparent hover:border-slate-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {student.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="text-left">
                  <p className={`font-medium ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {student.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {surahNames[student.surah]} • {mistakes} mistakes
                  </p>
                </div>
                {perf && (
                  <span className={`text-xs px-2 py-1 rounded-full border ${getPerformanceStyle(perf)}`}>
                    {perf}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Current Student Info Bar */}
      <div className="card p-4 bg-gradient-to-r from-slate-800 to-slate-800/50 border-l-4 border-emerald-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center text-xl font-bold text-white">
              {selectedStudent.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">{selectedStudent.name}</h2>
              <p className="text-slate-400">
                {surahNames[selectedStudent.surah]} • Ayah {selectedStudent.ayahStart}-{selectedStudent.ayahEnd}
              </p>
            </div>
          </div>

          {/* Performance Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPerformanceDropdown(!showPerformanceDropdown)}
              className={`px-4 py-2.5 rounded-xl border font-medium transition-colors flex items-center gap-2 ${
                currentPerformance
                  ? getPerformanceStyle(currentPerformance)
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
            >
              {currentPerformance || 'Rate Performance'}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showPerformanceDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
                {performanceOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSetPerformance(opt)}
                    className={`w-full px-4 py-2.5 text-left hover:bg-slate-700 transition-colors ${
                      currentPerformance === opt ? 'bg-slate-700' : ''
                    }`}
                  >
                    <span className={getPerformanceStyle(opt).split(' ')[1]}>{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student's Mistakes Summary (Their Global Layer) */}
      {studentMistakes.length > 0 && (
        <div className="card p-4 border-l-4 border-red-500/50">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-red-400">{selectedStudent.name}'s Known Mistakes</span>
            <span className="text-xs text-slate-500">(from previous classes)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {studentMistakes.map((m, idx) => (
              <span key={idx} className={`px-3 py-1.5 rounded-lg text-sm ${getMistakeStyle(m.count)}`}>
                <span className="arabic">{m.text}</span>
                <span className="text-xs ml-2 opacity-75">({m.count}x)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quran Text */}
      <div className="card p-8">
        {/* Surah Header */}
        <div className="text-center mb-8 pb-6 border-b border-slate-700/30">
          <h2 className="arabic text-3xl text-slate-100 mb-2">
            {selectedStudent.surah === 67 ? 'سُورَةُ الْمُلْك' :
             selectedStudent.surah === 78 ? 'سُورَةُ النَّبَأ' :
             'سُورَةُ الْفَجْر'}
          </h2>
          <p className="text-slate-400">
            {surahNames[selectedStudent.surah]} • Ayah {selectedStudent.ayahStart}-{selectedStudent.ayahEnd}
          </p>
        </div>

        {/* Bismillah */}
        <p className="arabic text-2xl text-center text-emerald-400 mb-8 pb-6 border-b border-slate-700/30">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        {/* Ayahs */}
        <div className="arabic text-2xl leading-[2.8] text-slate-200 text-right">
          {ayahs.slice(0, selectedStudent.ayahEnd).map((ayah) => {
            const words = ayah.text.split(' ');

            return (
              <span key={ayah.number} className="inline">
                {words.map((word, wordIdx) => {
                  // Check if this word has a mistake for this student
                  const mistake = studentMistakes.find(
                    m => m.ayah === ayah.number && m.wordIndex === wordIdx
                  );

                  return (
                    <span
                      key={`${ayah.number}-${wordIdx}`}
                      className={`cursor-pointer hover:bg-slate-700/30 rounded px-0.5 transition-all ${
                        mistake ? getMistakeStyle(mistake.count) : ''
                      }`}
                      title={mistake ? `Mistake: ${mistake.count}x` : 'Click to mark mistake'}
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

      {/* Quick Navigation Between Students */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            const currentIdx = mockClassStudents.findIndex(s => s.id === selectedStudentId);
            if (currentIdx > 0) {
              setSelectedStudentId(mockClassStudents[currentIdx - 1].id);
            }
          }}
          disabled={mockClassStudents.findIndex(s => s.id === selectedStudentId) === 0}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Previous Student
        </button>

        <span className="text-slate-500">
          {mockClassStudents.findIndex(s => s.id === selectedStudentId) + 1} of {mockClassStudents.length}
        </span>

        <button
          onClick={() => {
            const currentIdx = mockClassStudents.findIndex(s => s.id === selectedStudentId);
            if (currentIdx < mockClassStudents.length - 1) {
              setSelectedStudentId(mockClassStudents[currentIdx + 1].id);
            }
          }}
          disabled={mockClassStudents.findIndex(s => s.id === selectedStudentId) === mockClassStudents.length - 1}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded-xl transition-colors"
        >
          Next Student
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

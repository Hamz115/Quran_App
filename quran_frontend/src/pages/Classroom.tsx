import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getClass, getSurahs, getQuranPageWords, getMistakesWithOccurrences, addMistake, removeMistake, deleteClass, updateClassNotes, updateStudentPerformance, addClassAssignments, updateAssignment, getTestByClass, startTest, completeTest, startQuestion, endQuestion, cancelQuestion, addTestMistake, type QuranPageWord, type TestData, type TestQuestion } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { getPageNumber, getSurahsOnPage } from '../data/quranPages';

interface Assignment {
  id: number;
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  student_id?: number;
}

interface ClassData {
  id: number;
  date: string;
  day: string;
  notes?: string;
  assignments: Assignment[];
  students?: { id: number; first_name: string; last_name: string; performance?: string }[];
  is_published?: boolean;
  performance?: string;
  class_type?: 'regular' | 'test';
}

interface MistakeOccurrence {
  class_id: number;
  occurred_at: string;
  class_date: string;
  class_day: string;
}

interface Mistake {
  id: number;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  error_count: number;
  char_index?: number;
  occurrences?: MistakeOccurrence[];
}

interface WordData {
  id: number;
  surahNum: number;
  ayahNum: number;
  wordPosition: number;
  textUthmani: string;
  codeV1: string;
  lineNumber: number;
  charType: string;
}

type SectionType = 'hifz' | 'sabqi' | 'revision';

// Surah names in Arabic (same as QuranReader)
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

const SECTION_LABELS: Record<SectionType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  hifz: { label: 'Memorization (Hifz)', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-600/50' },
  sabqi: { label: 'Sabqi (Recent)', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-600/50' },
  revision: { label: 'Revision (Manzil)', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-600/50' },
};

// Arabic harakat
const HARAKAT = [
  '\u064B', '\u064C', '\u064D', '\u064E', '\u064F', '\u0650', '\u0651', '\u0652',
  '\u0653', '\u0654', '\u0655', '\u0656', '\u0657', '\u0658', '\u0659', '\u065A',
  '\u065B', '\u065C', '\u065D', '\u065E', '\u0670',
];

const isHaraka = (char: string) => HARAKAT.includes(char);

const splitArabicWord = (word: string): {
  letters: { char: string; index: number }[];
  harakat: { char: string; index: number; display: string }[]
} => {
  const letters: { char: string; index: number }[] = [];
  const harakat: { char: string; index: number; display: string }[] = [];
  const SHADDA = '\u0651';

  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    if (isHaraka(char)) {
      if (char === SHADDA && i + 1 < word.length && isHaraka(word[i + 1])) {
        const combined = char + word[i + 1];
        harakat.push({ char: combined, index: i, display: combined });
        i++;
      } else if (i > 0 && word[i - 1] === SHADDA) {
        // Already combined
      } else {
        harakat.push({ char, index: i, display: char });
      }
    } else {
      letters.push({ char, index: i });
    }
  }

  return { letters, harakat };
};

// Strip Quranic pause marks that don't render properly in most fonts
// These appear as "0" or "00" when font doesn't support them
const stripQuranMarks = (text: string): string => {
  // Remove Quranic annotation marks (U+06D6 to U+06ED range)
  return text.replace(/[\u06D6-\u06ED]/g, '').trim();
};

export default function Classroom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isTeacher = user?.is_verified === true;

  const preSelectedStudentId = searchParams.get('student') ? Number(searchParams.get('student')) : null;

  const getBackRoute = () => {
    if (location.pathname.startsWith('/teacher/')) return '/teacher/classes';
    if (location.pathname.startsWith('/student/')) return '/student/classes';
    return '/classes';
  };

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionType>('hifz');
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [surahList, setSurahList] = useState<{ number: number; englishName: string; name: string; numberOfAyahs: number }[]>([]);
  const [selectedPortionIndex, setSelectedPortionIndex] = useState<number>(0);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [performanceSaving, setPerformanceSaving] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Add portion modal state
  const [showAddPortionModal, setShowAddPortionModal] = useState(false);
  const [newPortionType, setNewPortionType] = useState<SectionType>('hifz');
  const [newPortionStart, setNewPortionStart] = useState(67);
  const [newPortionEnd, setNewPortionEnd] = useState(67);
  const [newPortionStartAyah, setNewPortionStartAyah] = useState<number | undefined>(undefined);
  const [newPortionEndAyah, setNewPortionEndAyah] = useState<number | undefined>(undefined);
  const [newPortionStudentId, setNewPortionStudentId] = useState<number | null>(null);

  // Edit portion modal state
  const [showEditPortionModal, setShowEditPortionModal] = useState(false);
  const [editAssignmentId, setEditAssignmentId] = useState<number | null>(null);
  const [editPortionType, setEditPortionType] = useState<SectionType>('hifz');
  const [editPortionStart, setEditPortionStart] = useState(67);
  const [editPortionEnd, setEditPortionEnd] = useState(67);
  const [editPortionStartAyah, setEditPortionStartAyah] = useState<number | undefined>(undefined);
  const [editPortionEndAyah, setEditPortionEndAyah] = useState<number | undefined>(undefined);

  // QPC page-based state
  const [currentPage, setCurrentPage] = useState<number>(560);
  const [wordsByLine, setWordsByLine] = useState<Map<number, WordData[]>>(new Map());
  const [pageLoading, setPageLoading] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);

  // Word popup state
  const [wordPopup, setWordPopup] = useState<{
    show: boolean;
    word: WordData;
    position: { x: number; y: number };
    showAbove?: boolean;
  } | null>(null);

  // Test mode state
  const [testData, setTestData] = useState<TestData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<TestQuestion | null>(null);
  const [testMode, setTestMode] = useState<'idle' | 'select_start' | 'in_progress' | 'select_end'>('idle');
  const isTestClass = classData?.class_type === 'test';

  // Close popup on scroll
  useEffect(() => {
    if (!wordPopup) return;
    const handleScroll = () => setWordPopup(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [wordPopup]);

  // Load QPC font for current page
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

    document.querySelectorAll('[id^="qpc-font-"]').forEach(el => {
      if (el.id !== `qpc-font-${currentPage}`) el.remove();
    });

    document.head.appendChild(style);

    setFontLoaded(false);
    const fontName = `QPC-Page-${currentPage}`;
    document.fonts.load(`32px "${fontName}"`).then(() => {
      setFontLoaded(true);
    }).catch(() => {
      setFontLoaded(true);
    });
  }, [currentPage]);

  // Load page words from backend
  useEffect(() => {
    const loadPageWords = async () => {
      setPageLoading(true);
      try {
        const words = await getQuranPageWords(currentPage);

        const lineMap = new Map<number, WordData[]>();

        words.forEach((word: QuranPageWord) => {
          const wordData: WordData = {
            id: word.id,
            surahNum: word.s,
            ayahNum: word.a,
            wordPosition: word.p,
            textUthmani: word.t,
            codeV1: word.c1,
            lineNumber: word.l,
            charType: word.ct
          };

          if (!lineMap.has(word.l)) {
            lineMap.set(word.l, []);
          }
          lineMap.get(word.l)!.push(wordData);
        });

        setWordsByLine(lineMap);
      } catch (err) {
        console.error('Failed to load page words:', err);
      } finally {
        setPageLoading(false);
      }
    };

    loadPageWords();
  }, [currentPage]);

  // Load class data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getClass(Number(id))
      .then((data) => {
        setClassData(data);
        setNotesText(data.notes || '');
        if (data.assignments.length > 0) {
          setActiveSection(data.assignments[0].type as SectionType);
        }
        if (isTeacher && data.students && data.students.length > 0) {
          const validPreSelected = preSelectedStudentId && data.students.some(s => s.id === preSelectedStudentId);
          setSelectedStudentId(validPreSelected ? preSelectedStudentId : data.students[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, isTeacher, preSelectedStudentId]);

  // Load surah list
  useEffect(() => {
    getSurahs().then(setSurahList).catch(console.error);
  }, []);

  // Load mistakes
  useEffect(() => {
    if (isTeacher && !selectedStudentId) {
      setMistakes([]);
      return;
    }

    getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined)
      .then(data => setMistakes(data || []))
      .catch(console.error);
  }, [isTeacher, selectedStudentId]);

  // Load test data for test classes
  useEffect(() => {
    if (!classData || classData.class_type !== 'test') return;

    getTestByClass(classData.id)
      .then(data => {
        setTestData(data);
        // Find current in-progress question
        const inProgressQ = data.questions?.find(q => q.status === 'in_progress');
        if (inProgressQ) {
          setCurrentQuestion(inProgressQ);
          setTestMode('in_progress');
        }
      })
      .catch(console.error);
  }, [classData?.id, classData?.class_type]);

  // Get assignments for active section (or all assignments for test class)
  const sectionAssignments = classData?.assignments.filter(a => {
    // For test classes, use all assignments (there's only one)
    if (isTestClass) {
      if (!a.student_id) return true;
      if (isTeacher && selectedStudentId) return a.student_id === selectedStudentId;
      return true;
    }
    // For regular classes, filter by section type
    if (a.type !== activeSection) return false;
    if (!a.student_id) return true;
    if (isTeacher && selectedStudentId) return a.student_id === selectedStudentId;
    if (!isTeacher && user?.id) return a.student_id === user.id;
    return false;
  }) || [];

  const currentAssignment = sectionAssignments[selectedPortionIndex];

  useEffect(() => {
    setSelectedPortionIndex(0);
  }, [activeSection]);

  // Calculate page range for current assignment
  const assignmentPageRange = (() => {
    if (!currentAssignment) return { minPage: 560, maxPage: 560 };
    const startPage = getPageNumber(currentAssignment.start_surah, currentAssignment.start_ayah || 1);
    const endAyahEstimate = currentAssignment.end_ayah || 286;
    const endPage = getPageNumber(currentAssignment.end_surah, endAyahEstimate);
    return { minPage: startPage, maxPage: endPage };
  })();

  // Check if a word is within the assigned portion
  const isWordInPortion = (word: WordData): boolean => {
    if (!currentAssignment) return true; // No assignment, show everything

    const { start_surah, start_ayah, end_surah, end_ayah } = currentAssignment;
    const startAyah = start_ayah || 1;
    const endAyah = end_ayah || 286; // Default to full surah if not specified

    // Check if word is within the surah/ayah range
    const surah = word.surahNum;
    const ayah = word.ayahNum;

    // Before start
    if (surah < start_surah) return false;
    if (surah === start_surah && ayah < startAyah) return false;

    // After end
    if (surah > end_surah) return false;
    if (surah === end_surah && ayah > endAyah) return false;

    return true;
  };

  // Initialize currentPage when assignment changes
  useEffect(() => {
    if (currentAssignment) {
      const startPage = getPageNumber(currentAssignment.start_surah, currentAssignment.start_ayah || 1);
      setCurrentPage(startPage);
    }
  }, [activeSection, selectedPortionIndex, currentAssignment?.start_surah, currentAssignment?.start_ayah]);

  // Mistake helpers - convert QPC 1-based position to 0-based word_index
  // Returns mistake info including which specific characters have mistakes
  const getWordMistakeInfo = (word: WordData): {
    wholeWordLevel: number;
    charMistakes: { charIndex: number; level: number }[];
    totalMistakes: number
  } => {
    const wordIndex = word.wordPosition - 1; // Convert to 0-based
    const wordMistakes = mistakes.filter(
      m => m.surah_number === word.surahNum &&
           m.ayah_number === word.ayahNum &&
           m.word_index === wordIndex
    );

    if (wordMistakes.length === 0) {
      return { wholeWordLevel: 0, charMistakes: [], totalMistakes: 0 };
    }

    // Separate whole-word mistakes from character-level mistakes
    const wholeWordMistakes = wordMistakes.filter(m => m.char_index === undefined || m.char_index === null);
    const charLevelMistakes = wordMistakes.filter(m => m.char_index !== undefined && m.char_index !== null);

    const wholeWordErrors = wholeWordMistakes.reduce((sum, m) => sum + m.error_count, 0);
    const totalMistakes = wordMistakes.reduce((sum, m) => sum + m.error_count, 0);

    const getLevel = (count: number) => {
      if (count >= 5) return 5;
      if (count >= 4) return 4;
      if (count >= 3) return 3;
      if (count >= 2) return 2;
      if (count >= 1) return 1;
      return 0;
    };

    // Build char mistakes array with char_index and level
    const charMistakes = charLevelMistakes.map(m => ({
      charIndex: m.char_index!,
      level: getLevel(m.error_count)
    }));

    return {
      wholeWordLevel: getLevel(wholeWordErrors),
      charMistakes,
      totalMistakes
    };
  };

  // Render word with textUthmani
  // - Haraka mistakes: color ONLY the haraka using SVG text layering
  // - Letter mistakes: background box highlight on letter (harakat follow)
  const renderWordWithColoredChar = (word: WordData, charMistakes: { charIndex: number; level: number }[]) => {
    const text = word.textUthmani;

    // Create a map of char_index to mistake level
    const charMistakeMap = new Map<number, number>();
    charMistakes.forEach(cm => {
      charMistakeMap.set(cm.charIndex, cm.level);
    });

    // Group characters: each letter with its following harakat
    const groups: { baseIndex: number; base: string; harakat: { char: string; index: number; mistakeLevel?: number }[] }[] = [];
    let currentGroup: typeof groups[0] | null = null;

    [...text].forEach((char, index) => {
      if (isHaraka(char)) {
        // Add haraka to current group
        if (currentGroup) {
          currentGroup.harakat.push({
            char,
            index,
            mistakeLevel: charMistakeMap.get(index)
          });
        }
      } else {
        // Start new group with this letter
        currentGroup = {
          baseIndex: index,
          base: char,
          harakat: []
        };
        groups.push(currentGroup);
      }
    });

    return groups.map((group) => {
      const baseMistakeLevel = charMistakeMap.get(group.baseIndex);
      const harakatWithMistakes = group.harakat.filter(h => h.mistakeLevel);

      // If any HARAKA has a mistake, color BOTH letter AND harakat together (no box)
      if (harakatWithMistakes.length > 0) {
        const maxLevel = Math.max(...harakatWithMistakes.map(h => h.mistakeLevel || 0));
        const harakatStr = group.harakat.map(h => h.char).join('');

        return (
          <span key={group.baseIndex} className={`haraka-mistake-${maxLevel}`}>
            {group.base}{harakatStr}
          </span>
        );
      }

      // If only the BASE letter has a mistake (no harakat mistake), highlight the whole group but with letter-style
      if (baseMistakeLevel) {
        return (
          <span key={group.baseIndex} className={`letter-mistake-${baseMistakeLevel}`}>
            {group.base}{group.harakat.map(h => h.char).join('')}
          </span>
        );
      }

      // No mistakes - render plain
      return <span key={group.baseIndex}>{group.base}{group.harakat.map(h => h.char).join('')}</span>;
    });
  };

  const handleWordClick = (e: React.MouseEvent, word: WordData) => {
    if (!isTeacher) return;
    if (word.charType !== 'word') return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const popupHeight = 350;
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < popupHeight && rect.top > popupHeight;

    setWordPopup({
      show: true,
      word,
      position: {
        x: rect.left + rect.width / 2,
        y: showAbove ? rect.top - 8 : rect.bottom + 8,
      },
      showAbove,
    });
  };

  const handleAddMistake = async (mistakeText: string, charIndex?: number, isTanbeeh?: boolean) => {
    if (!wordPopup) return;
    if (isTeacher && !selectedStudentId) return;

    try {
      // In test mode with an active question, record test mistake
      if (isTestClass && testData && currentQuestion && testMode === 'in_progress') {
        await addTestMistake(testData.id, {
          question_id: currentQuestion.id,
          surah_number: wordPopup.word.surahNum,
          ayah_number: wordPopup.word.ayahNum,
          word_index: wordPopup.word.wordPosition - 1,
          word_text: mistakeText,
          char_index: charIndex,
          is_tanbeeh: isTanbeeh || false,
        });
        // Refresh test data to get updated scores
        const updated = await getTestByClass(classData!.id);
        setTestData(updated);
      } else {
        // Regular class mistake
        await addMistake({
          student_id: isTeacher ? selectedStudentId || undefined : undefined,
          surah_number: wordPopup.word.surahNum,
          ayah_number: wordPopup.word.ayahNum,
          word_index: wordPopup.word.wordPosition - 1, // Convert to 0-based
          word_text: mistakeText,
          char_index: charIndex,
          class_id: id ? parseInt(id) : undefined,
        });
      }

      const updatedMistakes = await getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined);
      setMistakes(updatedMistakes || []);
    } catch (err) {
      console.error('Failed to add mistake:', err);
    }

    setWordPopup(null);
  };

  const handleWordRightClick = async (e: React.MouseEvent, word: WordData) => {
    e.preventDefault();
    if (!isTeacher) return;
    if (word.charType !== 'word') return;

    const wordIndex = word.wordPosition - 1;
    const existingMistake = mistakes.find(
      m => m.surah_number === word.surahNum &&
           m.ayah_number === word.ayahNum &&
           m.word_index === wordIndex
    );

    if (!existingMistake) return;

    try {
      await removeMistake(existingMistake.id);
      const updatedMistakes = await getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined);
      setMistakes(updatedMistakes || []);
    } catch (err) {
      console.error('Failed to remove mistake:', err);
    }
  };

  // Test mode handlers
  const handleStartTest = async () => {
    if (!testData || !classData) return;
    try {
      await startTest(testData.id);
      // Refresh full test data
      const updated = await getTestByClass(classData.id);
      setTestData(updated);
    } catch (err) {
      console.error('Failed to start test:', err);
    }
  };

  const handleCompleteTest = async () => {
    if (!testData || !classData) return;
    if (!confirm('Are you sure you want to end this test? This will calculate the final score.')) return;
    try {
      await completeTest(testData.id);
      // Refresh full test data
      const updated = await getTestByClass(classData.id);
      setTestData(updated);
      setCurrentQuestion(null);
      setTestMode('idle');
    } catch (err) {
      console.error('Failed to complete test:', err);
    }
  };

  const handleStartQuestion = () => {
    setTestMode('select_start');
  };

  const handleAyahClickForTest = async (surah: number, ayah: number) => {
    if (!testData) return;

    if (testMode === 'select_start') {
      // Start the question with this ayah
      try {
        const question = await startQuestion(testData.id, surah, ayah);
        setCurrentQuestion(question);
        setTestMode('in_progress');
        // Refresh test data
        const updated = await getTestByClass(classData!.id);
        setTestData(updated);
      } catch (err) {
        console.error('Failed to start question:', err);
      }
    } else if (testMode === 'select_end' && currentQuestion) {
      // End the question with this ayah
      try {
        await endQuestion(testData.id, currentQuestion.id, surah, ayah);
        setCurrentQuestion(null);
        setTestMode('idle');
        // Refresh test data
        const updated = await getTestByClass(classData!.id);
        setTestData(updated);
      } catch (err) {
        console.error('Failed to end question:', err);
      }
    }
  };

  const handleEndQuestion = () => {
    setTestMode('select_end');
  };

  const handleCancelQuestion = async () => {
    if (!testData || !currentQuestion) return;
    try {
      await cancelQuestion(testData.id, currentQuestion.id);
      setCurrentQuestion(null);
      setTestMode('idle');
      // Refresh test data
      const updated = await getTestByClass(classData!.id);
      setTestData(updated);
    } catch (err) {
      console.error('Failed to cancel question:', err);
    }
  };

  const handleDeleteClass = async () => {
    if (!classData) return;
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      await deleteClass(classData.id);
      navigate(getBackRoute());
    } catch (err) {
      console.error('Failed to delete class:', err);
    }
  };

  const handleSaveNotes = async () => {
    if (!classData) return;

    setNotesSaving(true);
    try {
      await updateClassNotes(classData.id, notesText || null);
      setClassData({ ...classData, notes: notesText || undefined });
      setShowNotesEditor(false);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleAddPortion = async () => {
    if (!classData || !id) return;

    try {
      await addClassAssignments(parseInt(id), [{
        type: newPortionType,
        start_surah: newPortionStart,
        end_surah: newPortionEnd,
        start_ayah: newPortionStartAyah,
        end_ayah: newPortionEndAyah,
        student_id: newPortionStudentId || undefined,
      }]);

      const updatedClass = await getClass(parseInt(id));
      setClassData(updatedClass);
      setShowAddPortionModal(false);
      setNewPortionStart(67);
      setNewPortionEnd(67);
      setNewPortionStartAyah(undefined);
      setNewPortionEndAyah(undefined);
      setNewPortionStudentId(null);
    } catch (err) {
      console.error('Failed to add portion:', err);
    }
  };

  const handleEditPortion = async () => {
    if (!classData || !id || !editAssignmentId) return;

    try {
      await updateAssignment(editAssignmentId, {
        type: editPortionType,
        start_surah: editPortionStart,
        end_surah: editPortionEnd,
        start_ayah: editPortionStartAyah,
        end_ayah: editPortionEndAyah,
      });

      const updatedClass = await getClass(parseInt(id));
      setClassData(updatedClass);
      setShowEditPortionModal(false);
      setEditAssignmentId(null);
    } catch (err) {
      console.error('Failed to update portion:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner mb-4"></div>
        <p className="text-slate-400">Loading class...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold text-slate-100 mb-2">Class not found</h2>
        <button onClick={() => navigate(getBackRoute())} className="px-6 py-3 bg-emerald-600 text-white rounded-xl">
          Back to Classes
        </button>
      </div>
    );
  }

  const getSurahName = (num: number) => surahList.find(s => s.number === num)?.englishName || `Surah ${num}`;

  const formatAssignmentRange = (assignment: Assignment) => {
    const startName = getSurahName(assignment.start_surah);
    const endName = getSurahName(assignment.end_surah);
    if (assignment.start_surah === assignment.end_surah) {
      if (assignment.start_ayah && assignment.end_ayah) {
        return `${startName} (${assignment.start_ayah}-${assignment.end_ayah})`;
      }
      return startName;
    }
    return `${startName} to ${endName}`;
  };

  // Filter mistakes to current page
  const surahsOnPage = getSurahsOnPage(currentPage);
  const currentMistakes = mistakes.filter(m => {
    if (!surahsOnPage.includes(m.surah_number)) return false;
    const mistakePage = getPageNumber(m.surah_number, m.ayah_number);
    return mistakePage === currentPage;
  });

  const totalErrors = currentMistakes.length;

  // Navigation
  const canGoPrev = currentPage > assignmentPageRange.minPage;
  const canGoNext = currentPage < assignmentPageRange.maxPage;
  const totalPagesInAssignment = assignmentPageRange.maxPage - assignmentPageRange.minPage + 1;
  const currentPageInAssignment = currentPage - assignmentPageRange.minPage + 1;

  const lineNumbers = Array.from(wordsByLine.keys()).sort((a, b) => a - b);
  const availableSections: SectionType[] = ['hifz', 'sabqi', 'revision'];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(getBackRoute())} className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center">
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">Class - {classData.day}, {classData.date}</h1>
          {isTeacher && classData.students && classData.students.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-slate-400">Marking mistakes for:</span>
              <select
                value={selectedStudentId || ''}
                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium"
              >
                {classData.students.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-800 text-slate-100">
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Performance Dropdown */}
        {isTeacher && selectedStudentId && classData.students && (() => {
          const selectedStudent = classData.students.find(s => s.id === selectedStudentId);
          const studentPerf = selectedStudent?.performance;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Performance:</span>
              <select
                value={studentPerf || ''}
                onChange={async (e) => {
                  setPerformanceSaving(true);
                  try {
                    await updateStudentPerformance(classData.id, selectedStudentId, e.target.value);
                    setClassData({
                      ...classData,
                      students: classData.students?.map(s =>
                        s.id === selectedStudentId ? { ...s, performance: e.target.value || undefined } : s
                      )
                    });
                  } catch (err) {
                    console.error('Failed to update performance:', err);
                  } finally {
                    setPerformanceSaving(false);
                  }
                }}
                disabled={performanceSaving}
                className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium ${
                  studentPerf === 'Excellent' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : studentPerf === 'Very Good' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  : studentPerf === 'Good' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : studentPerf === 'Needs Work' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                }`}
              >
                <option value="" className="bg-slate-800">Not rated</option>
                <option value="Excellent" className="bg-slate-800">Excellent</option>
                <option value="Very Good" className="bg-slate-800">Very Good</option>
                <option value="Good" className="bg-slate-800">Good</option>
                <option value="Needs Work" className="bg-slate-800">Needs Work</option>
              </select>
            </div>
          );
        })()}

        {(isTeacher || classData.notes) && (
          <button
            onClick={() => setShowNotesEditor(!showNotesEditor)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
              classData.notes ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-700/50 text-slate-400 border border-slate-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {isTeacher ? (classData.notes ? 'View Notes' : 'Add Notes') : 'View Notes'}
          </button>
        )}

        {isTeacher && (
          <button onClick={handleDeleteClass} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        )}
      </div>

      {/* Notes Editor */}
      {showNotesEditor && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-100">Class Notes</h3>
            <button onClick={() => setShowNotesEditor(false)} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {isTeacher ? (
            <>
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Add notes..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 resize-none"
              />
              <div className="flex justify-end gap-3 mt-3">
                <button onClick={() => { setNotesText(classData.notes || ''); setShowNotesEditor(false); }} className="px-4 py-2 rounded-lg text-slate-400">
                  Cancel
                </button>
                <button onClick={handleSaveNotes} disabled={notesSaving} className="px-5 py-2 rounded-lg bg-amber-500 text-white font-medium disabled:opacity-50">
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-3 rounded-xl border border-slate-600 bg-slate-800/50 text-slate-200">
              {classData.notes || 'No notes for this class.'}
            </div>
          )}
        </div>
      )}

      {/* Test Control Panel (for test classes) */}
      {isTestClass && testData ? (
        <div className="card p-5 border-2 border-cyan-500/30 bg-cyan-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase">
                Test Mode
              </span>
              <span className={`text-sm font-medium ${
                testData.status === 'not_started' ? 'text-slate-400' :
                testData.status === 'in_progress' ? 'text-cyan-400' : 'text-emerald-400'
              }`}>
                {testData.status === 'not_started' ? 'Not Started' :
                 testData.status === 'in_progress' ? 'In Progress' : 'Completed'}
              </span>
            </div>
            <div className="text-right">
              {testData.status === 'completed' ? (() => {
                const totalDeductions = testData.questions?.filter(q => q.status === 'completed')
                  .reduce((sum, q) => sum + (q.points_earned || 0), 0) || 0;
                const finalScore = Math.max(0, 100 - totalDeductions);
                return (
                  <>
                    <span className="text-2xl font-bold text-cyan-400">{finalScore.toFixed(0)}%</span>
                    <span className="text-slate-500 text-sm ml-2">({finalScore.toFixed(1)}/100)</span>
                  </>
                );
              })() : (
                <>
                  <span className="text-2xl font-bold text-cyan-400">—</span>
                  <span className="text-slate-400 text-lg"> / 100</span>
                </>
              )}
            </div>
          </div>

          {/* Test Status Actions */}
          {testData.status === 'not_started' && isTeacher && (
            <button
              onClick={handleStartTest}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium"
            >
              Start Test
            </button>
          )}

          {testData.status === 'in_progress' && isTeacher && (
            <div className="space-y-3">
              {/* Current Question Info */}
              {currentQuestion ? (
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">
                      Question {currentQuestion.question_number} in progress
                      {currentQuestion.start_surah && (
                        <span className="text-cyan-400 ml-2">
                          Starting from {currentQuestion.start_surah}:{currentQuestion.start_ayah}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ) : testMode === 'select_start' ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <span className="text-sm text-amber-400">
                    Click on an ayah marker to set the start point for this question
                  </span>
                </div>
              ) : testMode === 'select_end' ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <span className="text-sm text-amber-400">
                    Click on an ayah marker to set the end point for this question
                  </span>
                </div>
              ) : null}

              {/* Question Controls */}
              <div className="flex gap-2">
                {!currentQuestion && testMode === 'idle' && (
                  <button
                    onClick={handleStartQuestion}
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium"
                  >
                    Start Question {(testData.questions?.filter(q => q.status === 'completed').length || 0) + 1}
                  </button>
                )}
                {currentQuestion && testMode === 'in_progress' && (
                  <>
                    <button
                      onClick={handleEndQuestion}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium"
                    >
                      End Question
                    </button>
                    <button
                      onClick={handleCancelQuestion}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {(testMode === 'select_start' || testMode === 'select_end') && (
                  <button
                    onClick={() => setTestMode(currentQuestion ? 'in_progress' : 'idle')}
                    className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium"
                  >
                    Cancel Selection
                  </button>
                )}
              </div>

              {/* Current Question Mistakes (Live) */}
              {currentQuestion && testMode === 'in_progress' && currentQuestion.mistakes && currentQuestion.mistakes.length > 0 && (
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">
                    Current Question Mistakes ({currentQuestion.mistakes.length}):
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {currentQuestion.mistakes.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-800/50 rounded px-2 py-1">
                        <span className="flex items-center gap-2">
                          <span className="text-slate-500">{m.surah_number}:{m.ayah_number}</span>
                          <span className="font-amiri text-sm">{stripQuranMarks(m.word_text)}</span>
                          {m.is_tanbeeh === 1 && <span className="text-cyan-400 text-[10px]">(تنبيه)</span>}
                        </span>
                        <span className={`font-medium ${m.is_tanbeeh === 1 ? 'text-cyan-400' : 'text-red-400'}`}>
                          -{m.points_deducted.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right text-xs text-red-400 mt-1 font-medium">
                    Total: -{currentQuestion.mistakes.reduce((sum, m) => sum + m.points_deducted, 0).toFixed(1)} pts
                  </div>
                </div>
              )}

              {/* Completed Questions Summary with Mistakes */}
              {testData.questions && testData.questions.filter(q => q.status === 'completed').length > 0 && (
                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Completed Questions:</p>
                  <div className="space-y-3">
                    {testData.questions.filter(q => q.status === 'completed').map(q => (
                      <div key={q.id} className="bg-slate-800/30 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-300">
                            Q{q.question_number}: {q.start_surah}:{q.start_ayah} → {q.end_surah}:{q.end_ayah}
                          </span>
                          <span className={`text-xs font-medium ${
                            (q.points_earned || 0) === 0 ? 'text-emerald-400' :
                            (q.points_earned || 0) < 3 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {(q.points_earned || 0) === 0 ? 'Perfect!' : `-${q.points_earned?.toFixed(1)} pts`}
                          </span>
                        </div>
                        {q.mistakes && q.mistakes.length > 0 && (
                          <div className="space-y-0.5 pl-2 border-l border-slate-600">
                            {q.mistakes.map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[10px]">
                                <span className="flex items-center gap-1.5">
                                  <span className="text-slate-500">{m.surah_number}:{m.ayah_number}</span>
                                  <span className="font-amiri text-xs">{stripQuranMarks(m.word_text)}</span>
                                  {m.is_tanbeeh === 1 && <span className="text-cyan-400">(تنبيه)</span>}
                                </span>
                                <span className={`${m.is_tanbeeh === 1 ? 'text-cyan-400' : 'text-red-400'}`}>
                                  -{m.points_deducted.toFixed(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* End Test Button */}
              <button
                onClick={handleCompleteTest}
                className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg font-medium mt-2"
              >
                End Test
              </button>
            </div>
          )}

          {/* Test Completed - Show Results */}
          {testData.status === 'completed' && (() => {
            // Calculate total deductions from questions
            const totalDeductions = testData.questions?.filter(q => q.status === 'completed')
              .reduce((sum, q) => sum + (q.points_earned || 0), 0) || 0;
            // Score is always out of 100, minimum 0
            const finalScore = Math.max(0, 100 - totalDeductions);
            const percentage = finalScore;

            return (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-5xl font-bold text-emerald-400">
                    {percentage.toFixed(0)}%
                  </p>
                  <p className="text-lg text-slate-300 mt-2">
                    {finalScore.toFixed(1)} / 100 points
                  </p>
                  {totalDeductions > 0 && (
                    <p className="text-sm text-red-400 mt-1">
                      ({totalDeductions.toFixed(1)} points deducted)
                    </p>
                  )}
                </div>

                {testData.questions && testData.questions.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-300">Question Breakdown:</p>
                    {testData.questions.filter(q => q.status === 'completed').map(q => (
                      <div key={q.id} className="p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-300">
                            Q{q.question_number}: {q.start_surah}:{q.start_ayah} → {q.end_surah}:{q.end_ayah}
                          </span>
                          <span className={`text-sm font-medium ${
                            (q.points_earned || 0) === 0 ? 'text-emerald-400' :
                            (q.points_earned || 0) < 3 ? 'text-amber-400' : 'text-red-400'
                          }`}>
                            {(q.points_earned || 0) === 0 ? 'Perfect!' : `-${q.points_earned?.toFixed(1)} pts`}
                          </span>
                        </div>
                        {/* Show mistakes for this question */}
                        {q.mistakes && q.mistakes.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-slate-600 space-y-1.5">
                            {q.mistakes.map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 flex items-center gap-2">
                                  <span className="text-slate-500">{m.surah_number}:{m.ayah_number}</span>
                                  <span className={`text-lg ${m.is_tanbeeh ? 'tanbeeh' : ''}`} style={{ fontFamily: "'Amiri Quran', 'Amiri', 'Scheherazade New', serif" }}>{stripQuranMarks(m.word_text)}</span>
                                  {m.is_tanbeeh === 1 && <span className="text-cyan-400 text-[10px]">(تنبيه)</span>}
                                  {m.is_tanbeeh === 0 && m.is_repeated === 1 && <span className="text-amber-400 text-[10px]">(repeated {m.previous_error_count}x)</span>}
                                </span>
                                <span className={`font-medium ${m.is_tanbeeh ? 'text-cyan-400' : 'text-red-400'}`}>-{m.points_deducted.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        <>
          {/* Section Tabs (for regular classes) */}
          <div className="flex items-center gap-3">
            {availableSections.map((type) => {
              const config = SECTION_LABELS[type];
              const typeAssignments = classData.assignments.filter(a => a.type === type);
              const isActive = activeSection === type;

              return (
                <button
                  key={type}
                  onClick={() => setActiveSection(type)}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    isActive ? `${config.bgColor} ${config.borderColor} ${config.color}` : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="text-left">
                    <p className={`font-semibold ${isActive ? config.color : 'text-slate-200'}`}>{config.label}</p>
                    {typeAssignments.length > 0 && (
                      <p className={`text-sm mt-1 ${isActive ? 'opacity-80' : 'text-slate-400'}`}>
                        {typeAssignments.map((a, i) => <span key={a.id}>{i > 0 && ' + '}{formatAssignmentRange(a)}</span>)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Add Portion Button */}
          {isTeacher && (
            <div className="flex justify-end">
              <button
                onClick={() => { setNewPortionType(activeSection); setShowAddPortionModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-xl border border-slate-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Portion
              </button>
            </div>
          )}
        </>
      )}

      {/* Content */}
      {currentAssignment ? (
        <>
          {/* Portion selector */}
          {sectionAssignments.length > 1 && (
            <div className="card p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-400">Select Portion:</span>
                <div className="flex flex-wrap gap-2">
                  {sectionAssignments.map((assignment, index) => (
                    <div key={assignment.id} className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedPortionIndex(index)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          selectedPortionIndex === index
                            ? `${SECTION_LABELS[activeSection].bgColor} ${SECTION_LABELS[activeSection].color} border ${SECTION_LABELS[activeSection].borderColor}`
                            : 'bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        Portion {index + 1}: {formatAssignmentRange(assignment)}
                      </button>
                      {isTeacher && (
                        <button
                          onClick={() => {
                            setEditAssignmentId(assignment.id);
                            setEditPortionType(assignment.type as SectionType);
                            setEditPortionStart(assignment.start_surah);
                            setEditPortionEnd(assignment.end_surah);
                            setEditPortionStartAyah(assignment.start_ayah);
                            setEditPortionEndAyah(assignment.end_ayah);
                            setShowEditPortionModal(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="card p-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400 font-medium">Legend:</span>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-1"></span><span className="text-slate-400">1x</span></div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-2"></span><span className="text-slate-400">2x</span></div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-3"></span><span className="text-slate-400">3x</span></div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-4"></span><span className="text-slate-400">4x</span></div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-5"></span><span className="text-slate-400">5+</span></div>
            </div>
            <div className="flex items-center gap-4">
              {isTeacher && <p className="text-sm text-slate-400">Click words to mark. Right-click to remove.</p>}
              <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                totalErrors === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-600/50'
                : totalErrors < 5 ? 'bg-amber-500/20 text-amber-400 border border-amber-600/50'
                : 'bg-red-500/20 text-red-400 border border-red-600/50'
              }`}>
                {totalErrors} {totalErrors === 1 ? 'mistake' : 'mistakes'}
              </div>
            </div>
          </div>

          {/* Page Indicator */}
          <div className="flex flex-col items-center py-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-emerald-400">{currentPageInAssignment}</span>
              <span className="text-slate-500 text-xl">/</span>
              <span className="text-xl text-slate-400">{totalPagesInAssignment}</span>
            </div>
            <span className="text-sm text-slate-500 mt-1">Page {currentPage} (Madani Mushaf)</span>
          </div>

          {/* Quran Display with QPC Fonts */}
          <div className="flex items-center gap-2 md:gap-4 justify-center">
            {/* Next Page (Left for RTL) */}
            <button
              onClick={() => canGoNext && setCurrentPage(currentPage + 1)}
              disabled={!canGoNext}
              className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full transition-all flex items-center justify-center ${
                canGoNext ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white' : 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Mushaf Page */}
            <div className="rounded-lg mushaf-page relative" style={{ aspectRatio: '14/20', maxHeight: '95vh', backgroundColor: '#FEF9E7' }}>
              {/* Page Content */}
              <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1, padding: '5% 3%' }}>

              {(pageLoading || !fontLoaded) ? (
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
                        <div className="flex justify-center items-center text-slate-800 w-full overflow-hidden">
                          {words.map((word) => {
                            const { wholeWordLevel, charMistakes, totalMistakes } = getWordMistakeInfo(word);
                            const hasCharMistakes = charMistakes.length > 0;
                            const inPortion = isWordInPortion(word);
                            const dimStyle = !inPortion ? { opacity: 0.25, filter: 'blur(0.5px)' } : {};

                            // Character-level mistakes: render with textUthmani (smaller), highlight char
                            if (hasCharMistakes && word.charType === 'word') {
                              return (
                                <span
                                  key={word.id}
                                  onClick={(e) => inPortion && handleWordClick(e, word)}
                                  onContextMenu={(e) => inPortion && handleWordRightClick(e, word)}
                                  className={`${isTeacher && inPortion ? 'cursor-pointer' : ''} transition-all px-0.5 font-amiri inline-block align-middle ${
                                    inPortion && wholeWordLevel > 0 ? `mistake-${wholeWordLevel} rounded` : isTeacher && inPortion ? 'hover:bg-emerald-200 rounded' : ''
                                  }`}
                                  style={{ fontSize: '0.82em', fontWeight: 500, letterSpacing: '0.03em', ...dimStyle }}
                                  title={inPortion ? `${word.textUthmani} (${word.surahNum}:${word.ayahNum}:${word.wordPosition})${totalMistakes > 0 ? ` - ${totalMistakes}x mistakes` : ''}` : 'Outside assigned portion'}
                                >
                                  {renderWordWithColoredChar(word, charMistakes)}
                                </span>
                              );
                            }

                            // Check if we're in test selection mode and this is an ayah end marker
                            const isAyahEndInTestSelectMode = word.charType === 'end' &&
                              isTestClass && (testMode === 'select_start' || testMode === 'select_end');

                            return (
                              <span
                                key={word.id}
                                onClick={(e) => {
                                  if (isAyahEndInTestSelectMode) {
                                    e.preventDefault();
                                    handleAyahClickForTest(word.surahNum, word.ayahNum);
                                  } else if (inPortion && word.charType === 'word') {
                                    handleWordClick(e, word);
                                  }
                                }}
                                onContextMenu={(e) => inPortion && word.charType === 'word' && handleWordRightClick(e, word)}
                                className={`${isTeacher && inPortion && word.charType === 'word' ? 'cursor-pointer' : ''} ${
                                  isAyahEndInTestSelectMode ? 'cursor-pointer hover:bg-cyan-300 hover:text-cyan-800 rounded-full' : ''
                                } transition-all rounded px-0.5 ${
                                  word.charType === 'word'
                                    ? inPortion && wholeWordLevel > 0
                                      ? `mistake-${wholeWordLevel}`
                                      : isTeacher && inPortion ? 'hover:bg-emerald-200' : ''
                                    : inPortion ? 'text-emerald-700' : ''
                                }`}
                                style={dimStyle}
                                title={word.charType === 'word'
                                  ? inPortion
                                    ? `${word.textUthmani} (${word.surahNum}:${word.ayahNum}:${word.wordPosition})${totalMistakes > 0 ? ` - ${totalMistakes}x mistakes` : ''}`
                                    : 'Outside assigned portion'
                                  : isAyahEndInTestSelectMode
                                    ? `Click to select Ayah ${word.ayahNum}`
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

            {/* Previous Page (Right for RTL) */}
            <button
              onClick={() => canGoPrev && setCurrentPage(currentPage - 1)}
              disabled={!canGoPrev}
              className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full transition-all flex items-center justify-center ${
                canGoPrev ? 'bg-emerald-600/80 hover:bg-emerald-500 text-white' : 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Mistakes Summary */}
          {currentMistakes.length > 0 && (() => {
            const currentClassId = classData?.id;

            // Mistakes that occurred in THIS class (may also have previous occurrences)
            const mistakesInThisClass = currentMistakes.filter(m =>
              m.occurrences?.some(o => o.class_id === currentClassId)
            );

            // Mistakes that have ANY occurrence in a PREVIOUS class (even if also in this class)
            const mistakesFromPrevious = currentMistakes.filter(m =>
              m.occurrences?.some(o => o.class_id !== currentClassId)
            );

            const getMistakeColor = (errorCount: number) => {
              if (errorCount >= 5) return 'bg-red-500/20 text-red-400 border-red-600/50';
              if (errorCount >= 4) return 'bg-purple-500/20 text-purple-400 border-purple-600/50';
              if (errorCount >= 3) return 'bg-orange-500/20 text-orange-400 border-orange-600/50';
              if (errorCount >= 2) return 'bg-blue-500/20 text-blue-400 border-blue-600/50';
              return 'bg-amber-500/20 text-amber-400 border-amber-600/50';
            };

            const renderMistake = (m: Mistake) => (
              <div key={m.id} className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 border ${getMistakeColor(m.error_count)}`}>
                <span className="font-amiri text-lg">{stripQuranMarks(m.word_text)}</span>
                <span className="text-xs opacity-75">{m.surah_number}:{m.ayah_number}:{m.word_index + 1}</span>
                {m.error_count > 1 && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">{m.error_count}x</span>}
              </div>
            );

            return (
              <div className="space-y-4">
                {/* Mistakes in this class */}
                {mistakesInThisClass.length > 0 && (
                  <div className="card p-6 border-2 border-emerald-600/30">
                    <h3 className="font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mistakes in this class ({mistakesInThisClass.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {mistakesInThisClass.map(renderMistake)}
                    </div>
                  </div>
                )}

                {/* Mistakes from previous classes - grouped by day */}
                {mistakesFromPrevious.length > 0 && (() => {
                  // Group mistakes by class day
                  const mistakesByDay: { [key: string]: { day: string; date: string; class_id: number; mistakes: Mistake[] }[] } = {};

                  mistakesFromPrevious.forEach(m => {
                    m.occurrences?.filter(o => o.class_id !== currentClassId).forEach(o => {
                      const key = `${o.class_day}-${o.class_date}`;
                      if (!mistakesByDay[key]) {
                        mistakesByDay[key] = [];
                      }
                      // Check if this class_id entry exists
                      let classEntry = mistakesByDay[key].find(e => e.class_id === o.class_id);
                      if (!classEntry) {
                        classEntry = { day: o.class_day, date: o.class_date, class_id: o.class_id, mistakes: [] };
                        mistakesByDay[key].push(classEntry);
                      }
                      // Add mistake if not already there
                      if (!classEntry.mistakes.find(em => em.id === m.id)) {
                        classEntry.mistakes.push(m);
                      }
                    });
                  });

                  // Sort by date (most recent first)
                  const sortedDays = Object.keys(mistakesByDay).sort((a, b) => {
                    const dateA = mistakesByDay[a][0]?.date || '';
                    const dateB = mistakesByDay[b][0]?.date || '';
                    return dateB.localeCompare(dateA);
                  });

                  return (
                    <div className="card p-6 border border-slate-600/50">
                      <h3 className="font-semibold text-slate-400 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Mistakes from previous classes
                      </h3>
                      <div className="space-y-4">
                        {sortedDays.map(dayKey => {
                          const entries = mistakesByDay[dayKey];
                          const { day, date } = entries[0];
                          const allMistakes = entries.flatMap(e => e.mistakes);
                          // Remove duplicates
                          const uniqueMistakes = allMistakes.filter((m, idx, arr) => arr.findIndex(x => x.id === m.id) === idx);

                          return (
                            <div key={dayKey} className="border-l-2 border-slate-600 pl-4">
                              <h4 className="text-sm font-medium text-slate-300 mb-2">
                                {day} <span className="text-slate-500 text-xs">({date})</span>
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {uniqueMistakes.map(renderMistake)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </>
      ) : (
        <div className="card p-12 text-center">
          <p className="text-slate-400">No {activeSection} portion assigned for this class.</p>
        </div>
      )}

      {/* Word Selection Popup */}
      {wordPopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setWordPopup(null)} />
          <div
            className="fixed z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 w-[260px] max-h-[70vh] overflow-y-auto"
            style={{
              left: `${Math.min(Math.max(wordPopup.position.x, 140), window.innerWidth - 140)}px`,
              top: wordPopup.showAbove ? 'auto' : `${wordPopup.position.y}px`,
              bottom: wordPopup.showAbove ? `${window.innerHeight - wordPopup.position.y}px` : 'auto',
              transform: 'translateX(-50%)',
            }}
          >
            <div className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-slate-600 ${
              wordPopup.showAbove ? '-bottom-1.5 border-r border-b rotate-45' : '-top-1.5 border-l border-t rotate-45'
            }`} />

            <div className="text-center mb-2 pb-2 border-b border-slate-700">
              <p className="font-amiri text-xl text-slate-100">{wordPopup.word.textUthmani}</p>
              <p className="text-xs text-slate-500 mt-1">{wordPopup.word.surahNum}:{wordPopup.word.ayahNum} word {wordPopup.word.wordPosition}</p>
            </div>

            <button
              onClick={() => handleAddMistake(wordPopup.word.textUthmani, undefined)}
              className="w-full mb-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium"
            >
              Whole Word
            </button>

            {(() => {
              const { letters, harakat } = splitArabicWord(wordPopup.word.textUthmani);
              return (
                <>
                  <div className="mb-2">
                    <p className="text-xs text-slate-400 mb-1">Letters:</p>
                    <div className="flex flex-row-reverse flex-wrap gap-1.5 justify-center">
                      {letters.map((l) => (
                        <button
                          key={`letter-${l.index}`}
                          onClick={() => handleAddMistake(l.char, l.index)}
                          className="w-8 h-8 font-amiri text-lg bg-slate-700/50 hover:bg-blue-500/30 border border-slate-600 hover:border-blue-500/50 rounded text-slate-200 hover:text-blue-400"
                        >
                          {l.char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {harakat.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-400 mb-1">Harakat:</p>
                      <div className="flex flex-row-reverse flex-wrap gap-1.5 justify-center">
                        {harakat.map((h) => (
                          <button
                            key={`haraka-${h.index}`}
                            onClick={() => handleAddMistake(h.char, h.index)}
                            className="w-9 h-9 font-amiri text-xl bg-slate-700/50 hover:bg-purple-500/30 border border-slate-600 hover:border-purple-500/50 rounded text-slate-200 hover:text-purple-400 flex items-center justify-center"
                          >
                            ـ{h.display}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* Test Mode: Add Tanbeeh option at the bottom */}
            {isTestClass && testMode === 'in_progress' && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-500 text-center mb-2">Or mark as warning:</p>
                <button
                  onClick={() => handleAddMistake(wordPopup.word.textUthmani, undefined, true)}
                  className="w-full px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-cyan-400 text-sm font-medium"
                >
                  <span className="font-bold">تنبيه Tanbeeh</span>
                  <span className="text-xs opacity-75 ml-2">(-0.5 pts, student self-corrected)</span>
                </button>
              </div>
            )}

            <button onClick={() => setWordPopup(null)} className="w-full px-3 py-1.5 text-slate-500 hover:text-slate-300 text-xs mt-2">
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Add Portion Modal */}
      {showAddPortionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">Add Portion</h2>
                <button onClick={() => setShowAddPortionModal(false)} className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Surah</label>
                  <select value={newPortionStart} onChange={(e) => { setNewPortionStart(Number(e.target.value)); setNewPortionEnd(Number(e.target.value)); }} className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100">
                    {surahList.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Surah</label>
                  <select value={newPortionEnd} onChange={(e) => setNewPortionEnd(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100">
                    {surahList.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Ayah</label>
                  <input type="number" min="1" value={newPortionStartAyah || ''} onChange={(e) => setNewPortionStartAyah(e.target.value ? Number(e.target.value) : undefined)} placeholder="All" className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Ayah</label>
                  <input type="number" min="1" value={newPortionEndAyah || ''} onChange={(e) => setNewPortionEndAyah(e.target.value ? Number(e.target.value) : undefined)} placeholder="All" className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500" />
                </div>
              </div>
              {isTeacher && classData?.students && classData.students.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Assign to Student</label>
                  <select value={newPortionStudentId ?? 'all'} onChange={(e) => setNewPortionStudentId(e.target.value === 'all' ? null : Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100">
                    <option value="all">All Students</option>
                    {classData.students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} only</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-800/50 border-t border-slate-700/30 flex gap-3">
              <button onClick={() => { setShowAddPortionModal(false); setNewPortionStudentId(null); }} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium">Cancel</button>
              <button onClick={handleAddPortion} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium">Add Portion</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Portion Modal */}
      {showEditPortionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-100">Edit Portion</h2>
                <button onClick={() => setShowEditPortionModal(false)} className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Surah</label>
                  <select value={editPortionStart} onChange={(e) => { setEditPortionStart(Number(e.target.value)); setEditPortionEnd(Number(e.target.value)); }} className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100">
                    {surahList.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Surah</label>
                  <select value={editPortionEnd} onChange={(e) => setEditPortionEnd(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100">
                    {surahList.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Ayah</label>
                  <input type="number" min="1" value={editPortionStartAyah || ''} onChange={(e) => setEditPortionStartAyah(e.target.value ? Number(e.target.value) : undefined)} placeholder="All" className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Ayah</label>
                  <input type="number" min="1" value={editPortionEndAyah || ''} onChange={(e) => setEditPortionEndAyah(e.target.value ? Number(e.target.value) : undefined)} placeholder="All" className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-800/50 border-t border-slate-700/30 flex gap-3">
              <button onClick={() => setShowEditPortionModal(false)} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium">Cancel</button>
              <button onClick={handleEditPortion} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium">Update Portion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

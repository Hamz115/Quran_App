import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import FittedLine from '../components/FittedLine';
import { getClass, getSurahs, getQuranPage, getMistakesWithOccurrences, addMistake, removeMistake, deleteClass, updateClassNotes, updateStudentPerformance, addClassAssignments, updateAssignment, deleteAssignment, type QuranPageWord, type QuranPageData } from '../api';
import { JUZ_BOUNDARIES } from '../lib/quran-utils';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getPageNumber, getSurahsOnPage } from '../data/quranPages';

interface Assignment {
  id: string;
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  student_id?: string;
}

interface ClassData {
  id: string;
  date: string;
  day: string;
  notes?: string;
  assignments: Assignment[];
  students?: { id: string; first_name: string; last_name: string; performance?: string }[];
  is_published?: boolean;
  performance?: string;
}

interface MistakeOccurrence {
  class_id: string;
  occurred_at?: string;
  class_date?: string;
  class_day?: string;
}

interface Mistake {
  id: string;
  student_id?: string;
  surah_number: number;
  ayah_number: number;
  word_index: number;
  word_text: string;
  error_count: number;
  char_index?: number;
  occurrences?: MistakeOccurrence[];
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
  hifz: { label: 'Memorization (Hifz)', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-600/50' },
  sabqi: { label: 'Sabqi (Recent)', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-600/50' },
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
const stripQuranMarks = (text: string): string => {
  return text.replace(/[\u06D6-\u06ED]/g, '').trim();
};

export default function Classroom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  // isListener = ownership-based: true if user created this session (listener_id or teacher_id matches)
  const [isListener, setIsListener] = useState(false);
  // Legacy alias for minimal code changes in JSX
  const isTeacher = isListener;

  // Compute mushaf page dimensions based on window size
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getPageDimensions = useCallback(() => {
    const hasBottomNav = windowSize.w < 1024;
    const chromeHeight = hasBottomNav ? 220 : 160;
    const maxH = Math.min(windowSize.h * 0.8, windowSize.h - chromeHeight);
    const w = maxH * 0.7;
    const clampedW = Math.min(w, 500);
    const finalH = clampedW / 0.7;
    return { width: clampedW, height: Math.min(maxH, finalH) };
  }, [windowSize]);

  const pageDims = getPageDimensions();

  const preSelectedStudentId = searchParams.get('student');

  const getBackRoute = () => {
    // Legacy URL support
    if (location.pathname.startsWith('/teacher/')) return '/sessions';
    if (location.pathname.startsWith('/student/')) return '/sessions';
    return '/sessions';
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
  const [performanceSaving, _setPerformanceSaving] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Add portion modal state
  const [showAddPortionModal, setShowAddPortionModal] = useState(false);
  const [newPortionType, setNewPortionType] = useState<SectionType>('hifz');
  const [newPortionStart, setNewPortionStart] = useState(67);
  const [newPortionEnd, setNewPortionEnd] = useState(67);
  const [newPortionStartAyah, setNewPortionStartAyah] = useState<number | undefined>(undefined);
  const [newPortionEndAyah, setNewPortionEndAyah] = useState<number | undefined>(undefined);
  const [newPortionStudentId, setNewPortionStudentId] = useState<string | null>(null);

  // Mistakes filter: "all" (entire assignment) vs "page" (current page only)
  const [mistakeFilter, setMistakeFilter] = useState<'page' | 'all'>('page');

  // Click-to-flash highlight state
  const [highlightedWordKey, setHighlightedWordKey] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashWord = (surah: number, ayah: number, wordIndex: number) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const key = `${surah}-${ayah}-${wordIndex}`;
    // Navigate to the correct page if the mistake is on a different page
    const targetPage = getPageNumber(surah, ayah);
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
      // Delay flash slightly so the new page renders first
      setTimeout(() => {
        setHighlightedWordKey(key);
        flashTimerRef.current = setTimeout(() => setHighlightedWordKey(null), 1500);
      }, 100);
    } else {
      setHighlightedWordKey(key);
      flashTimerRef.current = setTimeout(() => setHighlightedWordKey(null), 1500);
    }
  };

  // Edit portion modal state
  const [showEditPortionModal, setShowEditPortionModal] = useState(false);
  const [editAssignmentId, setEditAssignmentId] = useState<string | null>(null);
  const [editPortionType, setEditPortionType] = useState<SectionType>('hifz');
  const [editPortionStart, setEditPortionStart] = useState(67);
  const [editPortionEnd, setEditPortionEnd] = useState(67);
  const [editPortionStartAyah, setEditPortionStartAyah] = useState<number | undefined>(undefined);
  const [editPortionEndAyah, setEditPortionEndAyah] = useState<number | undefined>(undefined);

  // QPC v2 page-based state
  const [currentPage, setCurrentPage] = useState<number>(560);
  const [pageData, setPageData] = useState<QuranPageData | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [fontLoaded, setFontLoaded] = useState(false);

  // Word popup state
  const [wordPopup, setWordPopup] = useState<{
    show: boolean;
    word: QuranPageWord;
    position: { x: number; y: number };
    showAbove?: boolean;
  } | null>(null);

  // Close popup on scroll
  useEffect(() => {
    if (!wordPopup) return;
    const handleScroll = () => setWordPopup(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [wordPopup]);

  // Load QPC font for current page (no overflow in v2)
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

  // Load page data from backend
  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setPageLoading(true);
      setPageError(null);
      setPageData(null);
      try {
        const data = await getQuranPage(currentPage);
        if (!isMounted) return;
        setPageData(data);
      } catch (err) {
        console.error('Failed to load page:', err);
        if (isMounted) {
          setPageError(err instanceof Error ? err.message : 'Failed to load Quran page');
        }
      } finally {
        if (isMounted) setPageLoading(false);
      }
    };

    loadPage();

    return () => { isMounted = false; };
  }, [currentPage]);

  // Load class data
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    setLoading(true);
    getClass(id)
      .then((data) => {
        if (!isMounted) return;
        setClassData(data);
        setNotesText(data.notes || '');
        if (data.assignments.length > 0) {
          setActiveSection(data.assignments[0].type as SectionType);
        }
        // Ownership check: am I the listener (creator) of this session?
        const amListener = user?.id != null && (
          data.listener_id === user.id || data.teacher_id === user.id
        );
        setIsListener(amListener);
        if (amListener && data.students && data.students.length > 0) {
          const validPreSelected = preSelectedStudentId && data.students.some(s => s.id === preSelectedStudentId);
          setSelectedStudentId(validPreSelected ? preSelectedStudentId : data.students[0].id);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [id, user?.id, preSelectedStudentId]);

  // Load surah list
  useEffect(() => {
    let isMounted = true;
    getSurahs()
      .then(data => { if (isMounted) setSurahList(data); })
      .catch(console.error);
    return () => { isMounted = false; };
  }, []);

  // Load mistakes
  useEffect(() => {
    if (isTeacher && !selectedStudentId) {
      setMistakes([]);
      return;
    }

    let isMounted = true;
    getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined)
      .then(data => { if (isMounted) setMistakes(data || []); })
      .catch(console.error);
    return () => { isMounted = false; };
  }, [isTeacher, selectedStudentId]);

  // Get assignments for active section
  const sectionAssignments = classData?.assignments.filter(a => {
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
  const isWordInPortion = (word: QuranPageWord): boolean => {
    if (!currentAssignment) return true;

    const { start_surah, start_ayah, end_surah, end_ayah } = currentAssignment;
    const startAyah = start_ayah || 1;
    const endAyah = end_ayah || 286;

    const surah = word.surah;
    const ayah = word.ayah;

    if (surah < start_surah) return false;
    if (surah === start_surah && ayah < startAyah) return false;
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
  const getWordMistakeInfo = (word: QuranPageWord): {
    wholeWordLevel: number;
    charMistakes: { charIndex: number; level: number }[];
    totalMistakes: number
  } => {
    const wordIndex = word.word - 1; // Convert to 0-based
    const wordMistakes = mistakes.filter(
      m => m.surah_number === word.surah &&
           m.ayah_number === word.ayah &&
           m.word_index === wordIndex
    );

    if (wordMistakes.length === 0) {
      return { wholeWordLevel: 0, charMistakes: [], totalMistakes: 0 };
    }

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

  // Render word with textUthmani for char-level mistakes
  const renderWordWithColoredChar = (word: QuranPageWord, charMistakes: { charIndex: number; level: number }[]) => {
    const text = word.text_uthmani || '';

    const charMistakeMap = new Map<number, number>();
    charMistakes.forEach(cm => {
      charMistakeMap.set(cm.charIndex, cm.level);
    });

    const groups: { baseIndex: number; base: string; harakat: { char: string; index: number; mistakeLevel?: number }[] }[] = [];
    let currentGroup: typeof groups[0] | null = null;

    [...text].forEach((char, index) => {
      if (isHaraka(char)) {
        if (currentGroup) {
          currentGroup.harakat.push({
            char,
            index,
            mistakeLevel: charMistakeMap.get(index)
          });
        }
      } else {
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

      if (harakatWithMistakes.length > 0) {
        const highestLevel = Math.max(...harakatWithMistakes.map(h => h.mistakeLevel!));
        return (
          <span key={group.baseIndex} className={`haraka-group-mistake-${highestLevel}`}>
            {group.base}{group.harakat.map(h => h.char).join('')}
          </span>
        );
      }

      if (baseMistakeLevel) {
        return (
          <span key={group.baseIndex} className={`letter-mistake-${baseMistakeLevel}`}>
            {group.base}{group.harakat.map(h => h.char).join('')}
          </span>
        );
      }

      return <span key={group.baseIndex}>{group.base}{group.harakat.map(h => h.char).join('')}</span>;
    });
  };

  const handleWordClick = (e: React.MouseEvent, word: QuranPageWord) => {
    if (!isTeacher) return;
    if (word.is_end) return;

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

  const handleAddMistake = async (mistakeText: string, charIndex?: number) => {
    if (!wordPopup) return;
    if (isTeacher && !selectedStudentId) return;

    const wordIndex = wordPopup.word.word - 1; // Convert to 0-based
    const surahNumber = wordPopup.word.surah;
    const ayahNumber = wordPopup.word.ayah;

    // Optimistic UI: update state immediately before awaiting network
    setMistakes(prev => {
      const existing = prev.find(
        m => m.surah_number === surahNumber &&
             m.ayah_number === ayahNumber &&
             m.word_index === wordIndex
      );
      if (existing) {
        return prev.map(m => {
          if (m.id !== existing.id) return m;
          // Add occurrence for this class if not already present
          const hasThisClass = m.occurrences?.some(o => o.class_id === id);
          const updatedOccurrences = hasThisClass ? m.occurrences : [
            ...(m.occurrences || []),
            ...(id ? [{ class_id: id, class_date: classData?.date || '', class_day: classData?.day || '' }] : []),
          ];
          return { ...m, error_count: m.error_count + 1, occurrences: updatedOccurrences };
        });
      }
      // New mistake — add with temporary id + occurrence for this class
      return [...prev, {
        id: `temp-${Date.now()}`,
        student_id: isTeacher ? selectedStudentId || '' : '',
        surah_number: surahNumber,
        ayah_number: ayahNumber,
        word_index: wordIndex,
        word_text: mistakeText,
        char_index: charIndex,
        error_count: 1,
        occurrences: id ? [{ class_id: id, class_date: classData?.date || '', class_day: classData?.day || '' }] : [],
      }];
    });
    setWordPopup(null);

    // Fire the actual API call in background (non-blocking for UI)
    try {
      const result = await addMistake({
        student_id: isTeacher ? selectedStudentId || undefined : undefined,
        surah_number: surahNumber,
        ayah_number: ayahNumber,
        word_index: wordIndex,
        word_text: mistakeText,
        char_index: charIndex,
        class_id: id || undefined,
      });

      // Update temp id with real id and correct error_count
      if (result?.id) {
        setMistakes(prev => prev.map(m =>
          (m.id.startsWith('temp-') && m.surah_number === surahNumber && m.ayah_number === ayahNumber && m.word_index === wordIndex)
            ? { ...m, id: result.id, error_count: result.error_count ?? m.error_count }
            : m
        ));
      }
    } catch (err) {
      console.error('Failed to add mistake:', err);
      // Revert optimistic update on failure
      const updatedMistakes = await getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined);
      setMistakes(updatedMistakes || []);
    }
  };

  const handleWordRightClick = async (e: React.MouseEvent, word: QuranPageWord) => {
    e.preventDefault();
    if (!isTeacher) return;
    if (word.is_end) return;

    const wordIndex = word.word - 1;
    const existingMistake = mistakes.find(
      m => m.surah_number === word.surah &&
           m.ayah_number === word.ayah &&
           m.word_index === wordIndex
    );

    if (!existingMistake) return;

    // Optimistic UI: remove from state immediately
    const mistakeId = existingMistake.id;
    if (existingMistake.error_count > 1) {
      setMistakes(prev => prev.map(m =>
        m.id === mistakeId ? { ...m, error_count: m.error_count - 1 } : m
      ));
    } else {
      setMistakes(prev => prev.filter(m => m.id !== mistakeId));
    }

    // Fire the actual API call in background
    try {
      await removeMistake(mistakeId);
    } catch (err) {
      console.error('Failed to remove mistake:', err);
      // Revert on failure
      const updatedMistakes = await getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined);
      setMistakes(updatedMistakes || []);
    }
  };

  const handleDeleteClass = () => {
    if (!classData) return;
    if (!confirm('Are you sure you want to delete this class?')) return;

    // Navigate immediately (instant)
    navigate(getBackRoute());
    // Fire Supabase delete in background (non-blocking)
    deleteClass(classData.id).catch(err => console.error('Failed to delete class:', err));
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
      await addClassAssignments(id, [{
        type: newPortionType,
        start_surah: newPortionStart,
        end_surah: newPortionEnd,
        start_ayah: newPortionStartAyah,
        end_ayah: newPortionEndAyah,
        student_id: newPortionStudentId || undefined,
      }]);

      const updatedClass = await getClass(id);
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

      const updatedClass = await getClass(id);
      setClassData(updatedClass);
      setShowEditPortionModal(false);
      setEditAssignmentId(null);
    } catch (err) {
      console.error('Failed to update portion:', err);
    }
  };

  const handleDeletePortion = async (assignmentId: string) => {
    if (!classData || !id) return;

    const sectionAssignments = classData.assignments.filter(a => a.type === activeSection);
    if (sectionAssignments.length <= 1) {
      alert('Cannot delete the last portion in a section.');
      return;
    }

    if (!confirm('Are you sure you want to delete this portion?')) return;

    try {
      await deleteAssignment(assignmentId);
      const updatedClass = await getClass(id);
      setClassData(updatedClass);
      setSelectedPortionIndex(0);
    } catch (err) {
      console.error('Failed to delete portion:', err);
      alert('Failed to delete portion');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner mb-4"></div>
        <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Loading class...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Class not found</h2>
        <button onClick={() => navigate(getBackRoute())} className="px-6 py-3 bg-cyan-600 text-white rounded-xl">
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

  // Filter mistakes to current page (for word highlighting on page)
  const surahsOnPage = getSurahsOnPage(currentPage);
  const currentMistakes = mistakes.filter(m => {
    if (!surahsOnPage.includes(m.surah_number)) return false;
    const mistakePage = getPageNumber(m.surah_number, m.ayah_number);
    return mistakePage === currentPage;
  });

  // All mistakes in the assignment range (for "All" filter in summary)
  const allAssignmentMistakes = mistakes;

  // Mistakes to show in the summary section (page-only or all)
  const summaryMistakes = mistakeFilter === 'page' ? currentMistakes : allAssignmentMistakes;

  const totalErrors = currentMistakes.length;

  // Navigation
  const canGoPrev = currentPage > assignmentPageRange.minPage;
  const canGoNext = currentPage < assignmentPageRange.maxPage;
  const totalPagesInAssignment = assignmentPageRange.maxPage - assignmentPageRange.minPage + 1;
  const currentPageInAssignment = currentPage - assignmentPageRange.minPage + 1;

  const availableSections: SectionType[] = ['hifz', 'sabqi', 'revision'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(getBackRoute())} className={`w-10 h-10 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50' : 'bg-slate-200 hover:bg-slate-300'}`}>
          <svg className={`w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Class - {classData.day}, {classData.date}</h1>
          {isTeacher && classData.students && classData.students.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Student:</span>
              {classData.students.length === 1 ? (
                <span className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  {classData.students[0].first_name} {classData.students[0].last_name}
                </span>
              ) : (
                classData.students.map(s => {
                  const isActive = selectedStudentId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : darkMode
                            ? 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700'
                      }`}
                    >
                      {s.first_name}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Performance Dropdown */}
        {isTeacher && selectedStudentId && classData.students && (() => {
          const selectedStudent = classData.students.find(s => s.id === selectedStudentId);
          const studentPerf = selectedStudent?.performance;

          return (
            <div className="flex items-center gap-2">
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Performance:</span>
              <div className="relative">
                <select
                  data-tour="performance-dropdown"
                  value={studentPerf || ''}
                  onChange={async (e) => {
                    const newPerf = e.target.value || undefined;
                    // Optimistic: update UI immediately
                    setClassData({
                      ...classData,
                      students: classData.students?.map(s =>
                        s.id === selectedStudentId ? { ...s, performance: newPerf } : s
                      )
                    });
                    // Save in background
                    try {
                      await updateStudentPerformance(classData.id, selectedStudentId, e.target.value);
                    } catch (err) {
                      console.error('Failed to update performance:', err);
                    }
                  }}
                  disabled={performanceSaving}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${
                    studentPerf === 'Excellent' ? darkMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                    : studentPerf === 'Very Good' ? darkMode ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'bg-teal-100 text-teal-700 border border-teal-300'
                    : studentPerf === 'Good' ? darkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-300'
                    : studentPerf === 'Needs Work' ? darkMode ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-100 text-red-700 border border-red-300'
                    : darkMode ? 'bg-slate-700/50 text-slate-400 border border-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-300'
                  }`}
                >
                  <option value="" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Not rated</option>
                  <option value="Excellent" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Excellent</option>
                  <option value="Very Good" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Very Good</option>
                  <option value="Good" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Good</option>
                  <option value="Needs Work" className={darkMode ? 'bg-slate-800' : 'bg-white'}>Needs Work</option>
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          );
        })()}

        {(isTeacher || classData.notes) && (
          <button
            data-tour="notes-btn"
            onClick={() => setShowNotesEditor(!showNotesEditor)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
              classData.notes
                ? darkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-700 border border-amber-300'
                : darkMode ? 'bg-slate-700/50 text-slate-400 border border-slate-600' : 'bg-slate-100 text-slate-600 border border-slate-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {isTeacher ? (classData.notes ? 'Listener Notes (ملاحظات)' : 'Add Notes (ملاحظات)') : 'Listener Notes (ملاحظات)'}
          </button>
        )}

        {isTeacher && (
          <button data-tour="delete-btn" onClick={handleDeleteClass} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        )}
      </div>

      {/* Notes Editor */}
      {showNotesEditor && (
        <div className={`card p-5 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>Listener Notes (ملاحظات المستمع)</h3>
            <button onClick={() => setShowNotesEditor(false)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-700/50 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {isTeacher ? (
            <>
              <textarea
                data-tour="notes-textarea"
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
                <button data-tour="save-notes-btn" onClick={handleSaveNotes} disabled={notesSaving} className="px-5 py-2 rounded-lg bg-amber-500 text-white font-medium disabled:opacity-50">
                  {notesSaving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </>
          ) : (
            <div className={`px-4 py-3 rounded-xl border ${darkMode ? 'border-slate-600 bg-slate-800/50 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              {classData.notes || 'No notes for this class.'}
            </div>
          )}
        </div>
      )}

      {/* Section Tabs */}
      <div data-tour="section-tabs" className="flex items-center gap-3">
        {availableSections.map((type) => {
          const config = SECTION_LABELS[type];
          const typeAssignments = classData.assignments.filter(a => {
            if (a.type !== type) return false;
            if (!a.student_id) return true;
            if (isTeacher && selectedStudentId) return a.student_id === selectedStudentId;
            if (!isTeacher && user?.id) return a.student_id === user.id;
            return false;
          });
          const isActive = activeSection === type;

          return (
            <button
              key={type}
              onClick={() => setActiveSection(type)}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                isActive ? `${config.bgColor} ${config.borderColor} ${config.color}` : darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div className="text-left">
                <p className={`font-semibold ${isActive ? config.color : darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{config.label}</p>
                {typeAssignments.length > 0 && (
                  <p className={`text-sm mt-1 ${isActive ? 'opacity-80' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 border-slate-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Portion
          </button>
        </div>
      )}

      {/* Content */}
      {currentAssignment ? (
        <>
          {/* Portion selector */}
          {sectionAssignments.length >= 1 && (
            <div className={`card p-4 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select Portion:</span>
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
                        <div className="flex items-center gap-1">
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
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-500'}`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeletePortion(assignment.id)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-700/50 hover:bg-red-600/50 text-slate-400 hover:text-red-400' : 'bg-slate-200 hover:bg-red-100 text-slate-500 hover:text-red-500'}`}
                            title="Delete portion"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className={`card p-4 flex items-center justify-between flex-wrap gap-4 ${darkMode ? '' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-4 text-sm">
              <span className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Legend:</span>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-1"></span><span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>1x</span></div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-2"></span><span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>2x</span></div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-3"></span><span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>3x</span></div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-4"></span><span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>4x</span></div>
              <div className="flex items-center gap-2"><span className="w-5 h-5 rounded mistake-5"></span><span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>5+</span></div>
            </div>
            <div className="flex items-center gap-4">
              {isTeacher && <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Click words to mark. Right-click to remove.</p>}
              <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                totalErrors === 0
                  ? darkMode ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-600/50' : 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                  : totalErrors < 5
                  ? darkMode ? 'bg-amber-500/20 text-amber-400 border border-amber-600/50' : 'bg-amber-100 text-amber-700 border border-amber-300'
                  : darkMode ? 'bg-red-500/20 text-red-400 border border-red-600/50' : 'bg-red-100 text-red-700 border border-red-300'
              }`}>
                {totalErrors} {totalErrors === 1 ? 'mistake' : 'mistakes'}
              </div>
            </div>
          </div>

          {/* Page Indicator */}
          <div className="flex flex-col items-center py-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-cyan-400">{currentPageInAssignment}</span>
              <span className={`text-xl ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>/</span>
              <span className={`text-xl ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{totalPagesInAssignment}</span>
            </div>
            <span className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Page {currentPage} (Madani Mushaf)</span>
          </div>

          {/* Quran Display with QPC v2 Fonts */}
          <div className="flex items-center gap-1 justify-center">
            {/* Next Page (Left for RTL) */}
            <button
              onClick={() => canGoNext && setCurrentPage(currentPage + 1)}
              disabled={!canGoNext}
              className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full transition-all flex items-center justify-center ${
                canGoNext ? 'bg-cyan-600/80 hover:bg-cyan-500 text-white' : 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Mushaf Page */}
            <div data-tour="quran-page" className="rounded-lg mushaf-page relative" style={{ width: pageDims.width, height: pageDims.height, backgroundColor: '#FEF9E7' }}>
              {/* Page Content */}
              <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1, padding: '4% 6%' }}>

              {pageError ? (
                <div className="flex items-center justify-center h-full px-6">
                  <div className="text-center text-red-700">
                    <p className="font-semibold">Unable to load page {currentPage}</p>
                    <p className="mt-1 text-sm">{pageError}</p>
                  </div>
                </div>
              ) : (pageLoading || !fontLoaded || !pageData) ? (
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
                            const { wholeWordLevel, charMistakes, totalMistakes } = getWordMistakeInfo(word);
                            const hasCharMistakes = charMistakes.length > 0;
                            const inPortion = isWordInPortion(word);
                            const dimStyle = !inPortion ? { opacity: 0.25, filter: 'blur(0.5px)' } : {};
                            const wordKey = `${word.surah}-${word.ayah}-${word.word - 1}`;
                            const isFlashing = highlightedWordKey === wordKey;

                            // Character-level mistakes: render with textUthmani (smaller), highlight char
                            if (hasCharMistakes && !word.is_end) {
                              return (
                                <span
                                  key={word.id}
                                  onClick={(e) => inPortion && handleWordClick(e, word)}
                                  onContextMenu={(e) => inPortion && handleWordRightClick(e, word)}
                                  className={`${isTeacher && inPortion ? 'cursor-pointer' : ''} transition-all px-0.5 font-amiri inline-block ${
                                    inPortion && wholeWordLevel > 0 ? `mistake-${wholeWordLevel} rounded` : isTeacher && inPortion ? 'hover:bg-cyan-200 rounded' : ''
                                  } ${isFlashing ? 'reader-flash-highlight' : ''}`}
                                  style={{ fontSize: '0.95em', fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1, position: 'relative', top: '-0.15em', WebkitTextStroke: '0', color: 'rgba(30,41,59,0.92)', ...dimStyle }}
                                  title={inPortion ? `${word.text_uthmani || ''} (${word.surah}:${word.ayah}:${word.word})${totalMistakes > 0 ? ` - ${totalMistakes}x mistakes` : ''}` : 'Outside assigned portion'}
                                >
                                  {renderWordWithColoredChar(word, charMistakes)}
                                </span>
                              );
                            }

                            return (
                              <span
                                key={word.id}
                                onClick={(e) => {
                                  if (inPortion && !word.is_end) {
                                    handleWordClick(e, word);
                                  }
                                }}
                                onContextMenu={(e) => inPortion && !word.is_end && handleWordRightClick(e, word)}
                                className={`${isTeacher && inPortion && !word.is_end ? 'cursor-pointer' : ''} transition-all rounded px-0.5 ${
                                  !word.is_end
                                    ? inPortion && wholeWordLevel > 0
                                      ? `mistake-${wholeWordLevel}`
                                      : isTeacher && inPortion ? 'hover:bg-cyan-200' : ''
                                    : inPortion ? 'text-cyan-700' : ''
                                } ${isFlashing ? 'reader-flash-highlight' : ''}`}
                                style={dimStyle}
                                title={!word.is_end
                                  ? inPortion
                                    ? `${word.text_uthmani || ''} (${word.surah}:${word.ayah}:${word.word})${totalMistakes > 0 ? ` - ${totalMistakes}x mistakes` : ''}`
                                    : 'Outside assigned portion'
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
            </div>

            {/* Previous Page (Right for RTL) */}
            <button
              onClick={() => canGoPrev && setCurrentPage(currentPage - 1)}
              disabled={!canGoPrev}
              className={`flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full transition-all flex items-center justify-center ${
                canGoPrev ? 'bg-cyan-600/80 hover:bg-cyan-500 text-white' : 'bg-slate-700/20 text-slate-500 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Mistakes Summary */}
          {(summaryMistakes.length > 0 || allAssignmentMistakes.length > 0) && (() => {
            const currentClassId = classData?.id;

            const mistakesInThisClass = summaryMistakes.filter(m =>
              m.occurrences?.some(o => o.class_id === currentClassId)
            );

            const mistakesFromPrevious = summaryMistakes.filter(m =>
              m.occurrences?.some(o => o.class_id !== currentClassId)
            );

            const getMistakeColor = (errorCount: number) => {
              if (errorCount >= 5) return darkMode ? 'bg-red-500/20 text-red-400 border-red-600/50' : 'bg-red-100 text-red-700 border-red-300';
              if (errorCount >= 4) return darkMode ? 'bg-purple-500/20 text-purple-400 border-purple-600/50' : 'bg-purple-100 text-purple-700 border-purple-300';
              if (errorCount >= 3) return darkMode ? 'bg-orange-500/20 text-orange-400 border-orange-600/50' : 'bg-orange-100 text-orange-700 border-orange-300';
              if (errorCount >= 2) return darkMode ? 'bg-cyan-500/20 text-cyan-400 border-cyan-600/50' : 'bg-cyan-100 text-cyan-700 border-cyan-300';
              return darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-600/50' : 'bg-amber-100 text-amber-700 border-amber-300';
            };

            const renderMistake = (m: Mistake) => (
              <div
                key={m.id}
                className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 border cursor-pointer hover:opacity-80 transition-opacity ${getMistakeColor(m.error_count)}`}
                onClick={() => flashWord(m.surah_number, m.ayah_number, m.word_index)}
              >
                <span className="font-amiri text-lg">{stripQuranMarks(m.word_text)}</span>
                <span className="text-xs opacity-75">{m.surah_number}:{m.ayah_number}:{m.word_index + 1}</span>
                {m.error_count > 1 && <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">{m.error_count}x</span>}
              </div>
            );

            return (
              <div data-tour="mistakes-area" className="space-y-4">
                {/* All / Page toggle */}
                <div data-tour="page-all-toggle" className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setMistakeFilter('all')}
                    className={`px-4 py-1.5 rounded-l-lg text-sm font-medium transition-colors ${
                      mistakeFilter === 'all'
                        ? 'bg-cyan-600 text-white'
                        : darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    All ({allAssignmentMistakes.filter(m => m.occurrences?.some(o => o.class_id === currentClassId)).length})
                  </button>
                  <button
                    onClick={() => setMistakeFilter('page')}
                    className={`px-4 py-1.5 rounded-r-lg text-sm font-medium transition-colors ${
                      mistakeFilter === 'page'
                        ? 'bg-cyan-600 text-white'
                        : darkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                    }`}
                  >
                    Page ({currentMistakes.filter(m => m.occurrences?.some(o => o.class_id === currentClassId)).length})
                  </button>
                </div>

                {/* Mistakes in this class */}
                {mistakesInThisClass.length > 0 && (
                  <div className="card p-6 border-2 border-cyan-600/30">
                    <h3 className="font-semibold text-cyan-400 mb-4 flex items-center gap-2">
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
                  const mistakesByDay: { [key: string]: { day: string; date: string; class_id: string; mistakes: Mistake[] }[] } = {};

                  mistakesFromPrevious.forEach(m => {
                    m.occurrences?.filter(o => o.class_id !== currentClassId).forEach(o => {
                      const key = `${o.class_day}-${o.class_date}`;
                      if (!mistakesByDay[key]) {
                        mistakesByDay[key] = [];
                      }
                      let classEntry = mistakesByDay[key].find(e => e.class_id === o.class_id);
                      if (!classEntry) {
                        classEntry = { day: o.class_day || '', date: o.class_date || '', class_id: o.class_id, mistakes: [] };
                        mistakesByDay[key].push(classEntry);
                      }
                      if (!classEntry.mistakes.find(em => em.id === m.id)) {
                        classEntry.mistakes.push(m);
                      }
                    });
                  });

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
            data-tour="word-popup"
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
              <p className="font-amiri text-xl text-slate-100">{wordPopup.word.text_uthmani || ''}</p>
              <p className="text-xs text-slate-500 mt-1">{wordPopup.word.surah}:{wordPopup.word.ayah} word {wordPopup.word.word}</p>
            </div>

            <button
              data-tour="whole-word-btn"
              onClick={() => handleAddMistake(wordPopup.word.text_uthmani || '', undefined)}
              className="w-full mb-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium"
            >
              Whole Word
            </button>

            {(() => {
              const { letters, harakat } = splitArabicWord(wordPopup.word.text_uthmani || '');
              return (
                <>
                  <div data-tour="letter-mistakes" className="mb-2">
                    <p className="text-xs text-slate-400 mb-1">Letters:</p>
                    <div className="flex flex-row-reverse flex-wrap gap-1.5 justify-center">
                      {letters.map((l) => (
                        <button
                          key={`letter-${l.index}`}
                          onClick={() => handleAddMistake(l.char, l.index)}
                          className="w-8 h-8 font-amiri text-lg bg-slate-700/50 hover:bg-cyan-500/30 border border-slate-600 hover:border-cyan-500/50 rounded text-slate-200 hover:text-cyan-400 flex items-center justify-center"
                        >
                          {l.char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {harakat.length > 0 && (
                    <div data-tour="haraka-mistakes" className="mb-2">
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Quick Fill from Juz (optional)</label>
                <select
                  value=""
                  onChange={(e) => {
                    const juzNum = Number(e.target.value);
                    const boundary = JUZ_BOUNDARIES.find(b => b.juz === juzNum);
                    if (boundary) {
                      setNewPortionStart(boundary.startSurah);
                      setNewPortionEnd(boundary.endSurah);
                      setNewPortionStartAyah(boundary.startAyah);
                      setNewPortionEndAyah(boundary.endAyah);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100"
                >
                  <option value="">— Select Juz —</option>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                    <option key={j} value={j}>Juz {j}</option>
                  ))}
                </select>
              </div>
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
                  <select value={newPortionStudentId ?? 'all'} onChange={(e) => setNewPortionStudentId(e.target.value === 'all' ? null : e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100">
                    <option value="all">All Students</option>
                    {classData.students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} only</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-800/50 border-t border-slate-700/30 flex gap-3">
              <button onClick={() => { setShowAddPortionModal(false); setNewPortionStudentId(null); }} className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium">Cancel</button>
              <button onClick={handleAddPortion} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-medium">Add Portion</button>
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Quick Fill from Juz (optional)</label>
                <select
                  value=""
                  onChange={(e) => {
                    const juzNum = Number(e.target.value);
                    const boundary = JUZ_BOUNDARIES.find(b => b.juz === juzNum);
                    if (boundary) {
                      setEditPortionStart(boundary.startSurah);
                      setEditPortionEnd(boundary.endSurah);
                      setEditPortionStartAyah(boundary.startAyah);
                      setEditPortionEndAyah(boundary.endAyah);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100"
                >
                  <option value="">— Select Juz —</option>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                    <option key={j} value={j}>Juz {j}</option>
                  ))}
                </select>
              </div>
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
              <button onClick={handleEditPortion} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-600 text-white font-medium">Update Portion</button>
            </div>
          </div>
        </div>
      )}

      {/* Flash highlight animation (shared with QuranReader) */}
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
    </div>
  );
}

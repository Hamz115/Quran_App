import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import FittedLine from '../components/FittedLine';
import { getClass, getSurahs, getQuranPage, getMistakesWithOccurrences, addMistake, removeMistake, deleteClass, updateClassNotes, updateStudentPerformance, addClassAssignments, updateAssignment, deleteAssignment, type QuranPageWord, type QuranPageData } from '../api';
import { JUZ_BOUNDARIES } from '../lib/quran-utils';
import { useAuth } from '../contexts/AuthContext';
import { useTour } from '../contexts/TourContext';
import { getPageNumber, getSurahsOnPage } from '../data/quranPages';
import { invalidateCache } from '../lib/cache';
import ConfirmDialog from '../components/ConfirmDialog';

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

const SECTION_LABELS: Record<SectionType, { label: string; shortLabel: string; description: string }> = {
  hifz: { label: 'Memorization (Hifz)', shortLabel: 'Hifz', description: 'New memorization' },
  sabqi: { label: 'Sabqi (Recent)', shortLabel: 'Sabqi', description: 'Recent revision' },
  revision: { label: 'Revision (Manzil)', shortLabel: 'Manzil', description: 'Long-term revision' },
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
  const { isActive: isTourActive } = useTour();
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
    // Portion controls now share the assignment rail, so the reader can use
    // considerably more of the viewport without duplicating controls above it.
    const compactHeight = windowSize.h <= 850;
    // On 13-inch/short laptop screens, prominence matters more than fitting the
    // entire session chrome above the fold. Let the Mushaf use 80% of the
    // viewport height and keep secondary inspector content below the reader.
    const reservedVerticalSpace = compactHeight ? 145 : 220;
    const availableHeight = Math.max(440, windowSize.h - reservedVerticalSpace);
    const maxHeight = Math.min(windowSize.h * (compactHeight ? 0.8 : 0.82), availableHeight, 820);
    const widthCap = windowSize.w < 1280 ? 420 : windowSize.w < 1500 ? 480 : 560;
    const width = Math.min(maxHeight * 0.7, widthCap);
    return { width, height: width / 0.7 };
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
  const [deletingClass, setDeletingClass] = useState(false);
  const [showDeleteSessionConfirm, setShowDeleteSessionConfirm] = useState(false);
  const [deletePortionId, setDeletePortionId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const performanceSaving = false;
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
    // The guided tour deliberately supports a brand-new listener with no
    // contacts yet. Keep its mistakes local/disposable instead of blocking the
    // word, letter, and haraka demonstrations on an empty reciter selection.
    if (isTeacher && !selectedStudentId && !isTourActive) return;

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
          // Add occurrence for this session if not already present
          const hasThisClass = m.occurrences?.some(o => o.class_id === id);
          const updatedOccurrences = hasThisClass ? m.occurrences : [
            ...(m.occurrences || []),
            ...(id ? [{ class_id: id, class_date: classData?.date || '', class_day: classData?.day || '' }] : []),
          ];
          return { ...m, error_count: m.error_count + 1, occurrences: updatedOccurrences };
        });
      }
      // New mistake — add with temporary id + occurrence for this session
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

    // Tutorial mistakes are disposable demonstrations. Keep their optimistic
    // highlights in this session without changing the reciter's real history.
    if (isTourActive) return;

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

  const handleDeleteClass = async () => {
    if (!classData || deletingClass) return;

    setDeletingClass(true);
    try {
      // Wait for the deletion before returning to lists so no stale session can render.
      await deleteClass(classData.id);
      invalidateCache('classes');
      window.dispatchEvent(new CustomEvent('qurantrack:sessions-changed', {
        detail: { action: 'deleted', sessionId: classData.id },
      }));
      navigate(getBackRoute(), { replace: true });
    } catch (err) {
      console.error('Failed to delete session:', err);
      setDialogError(err instanceof Error ? `Failed to delete session: ${err.message}` : 'Failed to delete session. Please try again.');
      setShowDeleteSessionConfirm(false);
      setDeletingClass(false);
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
      const updates = {
        type: editPortionType,
        start_surah: editPortionStart,
        end_surah: editPortionEnd,
        start_ayah: editPortionStartAyah,
        end_ayah: editPortionEndAyah,
      };
      await updateAssignment(editAssignmentId, {
        ...updates,
        // Supabase omits `undefined` properties. Send null explicitly so a
        // teacher can clear previously configured ayah bounds.
        start_ayah: editPortionStartAyah ?? null,
        end_ayah: editPortionEndAyah ?? null,
      });

      // Reflect the confirmed update immediately. A read directly after the
      // PATCH can briefly return the previous nested assignment representation,
      // leaving the reader on the old page until a full reload.
      setClassData(current => current ? {
        ...current,
        assignments: current.assignments.map(assignment =>
          assignment.id === editAssignmentId
            ? { ...assignment, ...updates }
            : assignment
        ),
      } : current);
      setShowEditPortionModal(false);
      setEditAssignmentId(null);
    } catch (err) {
      console.error('Failed to update portion:', err);
    }
  };

  const handleDeletePortion = async () => {
    if (!classData || !id || !deletePortionId) return;

    try {
      await deleteAssignment(deletePortionId);
      const updatedClass = await getClass(id);
      setClassData(updatedClass);
      setSelectedPortionIndex(0);
      setDeletePortionId(null);
    } catch (err) {
      console.error('Failed to delete portion:', err);
      setDeletePortionId(null);
      setDialogError('The portion could not be deleted. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="spinner mb-4"></div>
        <p className="text-slate-500">Loading session...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="mb-2 text-xl font-semibold text-slate-900">Session not found</h2>
        <button onClick={() => navigate(getBackRoute())} className="approved-primary-button">
          Back to Sessions
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
    <div className="approved-page approved-legacy-page approved-classroom-page space-y-6">
      {/* Header */}
      <div className="classroom-header approved-page-header flex items-center gap-4">
        <button onClick={() => navigate(getBackRoute())} className="desktop-icon-button flex-shrink-0" aria-label="Back to sessions">
          <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="approved-page-title">Session - {classData.day}, {classData.date}</h1>
          {isTeacher && classData.students && classData.students.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-sm text-slate-500">Reciter:</span>
              {classData.students.length === 1 ? (
                <span className="text-sm font-medium text-slate-700">
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
                        isActive ? 'classroom-reciter-active' : 'classroom-reciter-idle'
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
        {isTeacher && ((selectedStudentId && classData.students) || isTourActive) && (() => {
          const selectedStudent = classData.students?.find(s => s.id === selectedStudentId);
          const studentPerf = selectedStudent?.performance;

          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Performance:</span>
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
                    // A contact-free tutorial uses this as a disposable UI
                    // demonstration and must never write a fake reciter rating.
                    if (isTourActive || !selectedStudentId) return;
                    // Save in background
                    try {
                      await updateStudentPerformance(classData.id, selectedStudentId, e.target.value);
                    } catch (err) {
                      console.error('Failed to update performance:', err);
                    }
                  }}
                  disabled={performanceSaving}
                  className="approved-input appearance-none cursor-pointer py-2 pl-3 pr-8 text-sm font-medium"
                >
                  <option value="">Not rated</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Very Good">Very Good</option>
                  <option value="Good">Good</option>
                  <option value="Needs Work">Needs Work</option>
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
            className="approved-secondary-button"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {isTeacher ? (classData.notes ? 'Listener Notes (ملاحظات)' : 'Add Notes (ملاحظات)') : 'Listener Notes (ملاحظات)'}
          </button>
        )}

        {isTeacher && (
          <button data-tour="delete-btn" onClick={() => setShowDeleteSessionConfirm(true)} disabled={deletingClass} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:cursor-wait disabled:opacity-60">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {deletingClass ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>

      {/* Notes Editor */}
      {showNotesEditor && (
        <div className="card classroom-notes-editor border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Listener Notes (ملاحظات المستمع)</h3>
            <button onClick={() => setShowNotesEditor(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200">
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
                className="classroom-notes-textarea w-full resize-none rounded-md border px-4 py-3"
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
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
              {classData.notes || 'No notes for this session.'}
            </div>
          )}
        </div>
      )}

      <section className="classroom-assignment-rail approved-card" data-tour="section-tabs">
        <div className="classroom-assignment-summary">
          <span className="classroom-control-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></svg>
          </span>
          <div className="classroom-assignment-copy">
            <small>{SECTION_LABELS[activeSection].description}</small>
            <div className="classroom-rail-portions">
              {sectionAssignments.length > 0 ? sectionAssignments.map((assignment, index) => (
                <div key={assignment.id} className={`classroom-rail-portion ${selectedPortionIndex === index ? 'active' : ''}`}>
                  <button type="button" onClick={() => setSelectedPortionIndex(index)}>
                    {formatAssignmentRange(assignment)}
                  </button>
                  {isTeacher && (
                    <div className="classroom-rail-portion-actions">
                      <button
                        type="button"
                        className="classroom-icon-action"
                        aria-label={`Edit ${formatAssignmentRange(assignment)}`}
                        onClick={() => {
                          setEditAssignmentId(assignment.id);
                          setEditPortionType(assignment.type as SectionType);
                          setEditPortionStart(assignment.start_surah);
                          setEditPortionEnd(assignment.end_surah);
                          setEditPortionStartAyah(assignment.start_ayah);
                          setEditPortionEndAyah(assignment.end_ayah);
                          setShowEditPortionModal(true);
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m4 16-.8 4 4-.8L18.5 7.9a2.1 2.1 0 0 0-3-3L4 16Z" /><path d="m13.8 6.6 3 3" /></svg>
                      </button>
                      <button
                        type="button"
                        className="classroom-icon-action danger"
                        aria-label={`Delete ${formatAssignmentRange(assignment)}`}
                        onClick={() => setDeletePortionId(assignment.id)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              )) : (
                <strong className="classroom-no-portion">No {SECTION_LABELS[activeSection].shortLabel} portion</strong>
              )}
              {isTeacher && (
                <button type="button" className="classroom-rail-add" onClick={() => { setNewPortionType(activeSection); setShowAddPortionModal(true); }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" /></svg>
                  Add
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="classroom-section-switch" role="tablist" aria-label="Recitation section">
          {availableSections.map((type) => {
            const config = SECTION_LABELS[type];
            const count = classData.assignments.filter((assignment) => {
              if (assignment.type !== type) return false;
              if (!assignment.student_id) return true;
              if (isTeacher && selectedStudentId) return assignment.student_id === selectedStudentId;
              return !isTeacher && user?.id === assignment.student_id;
            }).length;
            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={activeSection === type}
                className={activeSection === type ? 'active' : ''}
                onClick={() => { setActiveSection(type); setSelectedPortionIndex(0); }}
              >
                <span>{config.shortLabel}</span>
                <small>{count || 'Empty'}</small>
              </button>
            );
          })}
        </div>
      </section>

      {/* Content */}
      {currentAssignment ? (
        <>
          <div className="classroom-workspace">
          <div className="classroom-quran-column">
          <div className="classroom-reader-toolbar">
            <div className="classroom-scope-switch" role="group" aria-label="Mistake scope">
              <button type="button" className={mistakeFilter === 'page' ? 'active' : ''} onClick={() => setMistakeFilter('page')}>Current page</button>
              <button type="button" className={mistakeFilter === 'all' ? 'active' : ''} onClick={() => setMistakeFilter('all')}>All mistakes</button>
            </div>
            <div className="classroom-line-legend" aria-label="Mistake occurrence legend">
              <span>Legend</span>
              <span><i className="level-1" />1x</span>
              <span><i className="level-2" />2x</span>
              <span><i className="level-3" />3x</span>
              <span><i className="level-4" />4x</span>
              <span><i className="level-5" />5+</span>
            </div>
            <div className="classroom-page-context">
              <span>{totalErrors} on page</span>
              <strong>Page {currentPage} <i /> {getSurahName(surahsOnPage[0] || currentAssignment.start_surah)}</strong>
            </div>
          </div>

          <div className="classroom-page-progress" aria-label={`Portion page ${currentPageInAssignment} of ${totalPagesInAssignment}`}>
            <span>Portion page</span><strong>{currentPageInAssignment} / {totalPagesInAssignment}</strong>
          </div>

          {/* Quran Display with QPC v2 Fonts */}
          <div className="flex items-center gap-1 justify-center">
            {/* Next Page (Left for RTL) */}
            <button
              onClick={() => canGoNext && setCurrentPage(currentPage + 1)}
              disabled={!canGoNext}
              className="classroom-page-nav"
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
                    fontSize: `${Math.min(34, Math.floor(pageDims.height / 21))}px`,
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
                          <span className="text-cyan-800 font-bold" style={{ fontSize: `${Math.min(24, Math.max(18, Math.floor(pageDims.height / 30)))}px` }}>
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
                            fontSize: `${Math.min(24, Math.max(18, Math.floor(pageDims.height / 30)))}px`,
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
              className="classroom-page-nav"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          </div>
          <aside className="classroom-inspector">
            <section className="approved-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="approved-card-title">Session notes</h2>
                {(isTeacher || classData.notes) && (
                  <button type="button" className="text-xs font-medium text-[var(--accent-primary)]" onClick={() => setShowNotesEditor(true)}>
                    {classData.notes ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
                {classData.notes || 'No notes for this session.'}
              </p>
            </section>

            <section className="approved-card p-4">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h2 className="approved-card-title">Page inspector</h2>
                <span className="approved-count-badge">{currentMistakes.length}</span>
              </div>
              <dl className="approved-detail-list">
                <div><dt>Page</dt><dd>{currentPage} / 604</dd></div>
                <div><dt>Portion page</dt><dd>{currentPageInAssignment} / {totalPagesInAssignment}</dd></div>
                <div><dt>Section</dt><dd className="capitalize">{activeSection === 'revision' ? 'Manzil' : activeSection}</dd></div>
              </dl>
              <div className="classroom-page-mistakes-scroll space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Mistakes on this page</h3>
                {currentMistakes.length > 0 ? currentMistakes.map((mistake) => (
                  <button
                    key={mistake.id}
                    type="button"
                    className="classroom-inspector-mistake"
                    onClick={() => flashWord(mistake.surah_number, mistake.ayah_number, mistake.word_index)}
                  >
                    <span className="font-amiri text-lg" dir="rtl">{stripQuranMarks(mistake.word_text)}</span>
                    <span>{mistake.surah_number}:{mistake.ayah_number}:{mistake.word_index + 1}</span>
                    <span className="approved-count-badge !h-6 !w-6">{mistake.error_count}</span>
                  </button>
                )) : (
                  <p className="rounded-md border border-dashed border-[var(--border-color)] p-4 text-center text-xs text-[var(--text-muted)]">
                    No mistakes marked on this page.
                  </p>
                )}
              </div>
            </section>

          {/* Mistakes Summary */}
          {(isTourActive || summaryMistakes.length > 0 || allAssignmentMistakes.length > 0) && (() => {
            const currentClassId = classData?.id;

            const mistakesInThisClass = summaryMistakes.filter(m =>
              m.occurrences?.some(o => o.class_id === currentClassId)
            );

            const mistakesFromPrevious = summaryMistakes.filter(m =>
              m.occurrences?.some(o => o.class_id !== currentClassId)
            );

            const getMistakeColor = (errorCount: number) => {
              if (errorCount >= 4) return 'classroom-mistake-severe';
              if (errorCount >= 2) return 'classroom-mistake-moderate';
              return 'classroom-mistake-minor';
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
              <div data-tour="mistakes-area" className="classroom-all-mistakes-scroll space-y-4">
                {/* All / Page toggle */}
                <div data-tour="page-all-toggle" className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => setMistakeFilter('all')}
                    className={`px-4 py-1.5 rounded-l-lg text-sm font-medium transition-colors ${
                      mistakeFilter === 'all'
                        ? 'active' : ''
                    }`}
                  >
                    All ({allAssignmentMistakes.filter(m => m.occurrences?.some(o => o.class_id === currentClassId)).length})
                  </button>
                  <button
                    onClick={() => setMistakeFilter('page')}
                    className={`px-4 py-1.5 rounded-r-lg text-sm font-medium transition-colors ${
                      mistakeFilter === 'page'
                        ? 'active' : ''
                    }`}
                  >
                    Page ({currentMistakes.filter(m => m.occurrences?.some(o => o.class_id === currentClassId)).length})
                  </button>
                </div>

                {/* Mistakes in this session */}
                {mistakesInThisClass.length > 0 && (
                  <div className="classroom-history-group">
                    <h3>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mistakes in this session ({mistakesInThisClass.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {mistakesInThisClass.map(renderMistake)}
                    </div>
                  </div>
                )}

                {/* Mistakes from previous sessions - grouped by day */}
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
                    <div className="classroom-history-group">
                      <h3 className="font-semibold text-slate-400 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Mistakes from previous sessions
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
          </aside>
          </div>
        </>
      ) : (
        <div className="classroom-empty-section approved-card">
          <span className="classroom-control-icon" aria-hidden="true">+</span>
          <h2>No {SECTION_LABELS[activeSection].shortLabel} portion</h2>
          <p>This section can remain empty, or a Quran range can be added when it is needed.</p>
          {isTeacher && (
            <button type="button" className="approved-primary-button" onClick={() => { setNewPortionType(activeSection); setShowAddPortionModal(true); }}>
              Add {SECTION_LABELS[activeSection].shortLabel} portion
            </button>
          )}
        </div>
      )}

      {/* Word Selection Popup */}
      {wordPopup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setWordPopup(null)} />
          <div
            data-tour="word-popup"
            className="classroom-word-popup fixed z-50 w-[260px] max-h-[70vh] overflow-y-auto"
            style={{
              left: `${Math.min(Math.max(wordPopup.position.x, 140), window.innerWidth - 140)}px`,
              top: wordPopup.showAbove ? 'auto' : `${wordPopup.position.y}px`,
              bottom: wordPopup.showAbove ? `${window.innerHeight - wordPopup.position.y}px` : 'auto',
              transform: 'translateX(-50%)',
            }}
          >
            <div className={`classroom-word-popup-arrow absolute left-1/2 -translate-x-1/2 w-3 h-3 ${
              wordPopup.showAbove ? '-bottom-1.5 border-r border-b rotate-45' : '-top-1.5 border-l border-t rotate-45'
            }`} />

            <div className="classroom-word-popup-header">
              <p className="font-amiri text-xl">{wordPopup.word.text_uthmani || ''}</p>
              <p>{wordPopup.word.surah}:{wordPopup.word.ayah} word {wordPopup.word.word}</p>
            </div>

            <button
              data-tour="whole-word-btn"
              onClick={() => handleAddMistake(wordPopup.word.text_uthmani || '', undefined)}
              className="classroom-word-whole"
            >
              Whole Word
            </button>

            {(() => {
              const { letters, harakat } = splitArabicWord(wordPopup.word.text_uthmani || '');
              return (
                <>
                  <div data-tour="letter-mistakes" className="mb-2">
                    <p className="classroom-word-label">Letters</p>
                    <div className="flex flex-row-reverse flex-wrap gap-1.5 justify-center">
                      {letters.map((l) => (
                        <button
                          key={`letter-${l.index}`}
                          onClick={() => handleAddMistake(l.char, l.index)}
                          className="classroom-letter-button"
                        >
                          {l.char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {harakat.length > 0 && (
                    <div data-tour="haraka-mistakes" className="mb-2">
                      <p className="classroom-word-label">Harakat</p>
                      <div className="flex flex-row-reverse flex-wrap gap-1.5 justify-center">
                        {harakat.map((h) => (
                          <button
                            key={`haraka-${h.index}`}
                            onClick={() => handleAddMistake(h.char, h.index)}
                            className="classroom-letter-button !h-9 !w-9 text-xl"
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

            <button onClick={() => setWordPopup(null)} className="classroom-word-cancel">
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Add Portion Modal */}
      {showAddPortionModal && (
        <div className="classroom-modal-backdrop">
          <div className="classroom-portion-dialog" role="dialog" aria-modal="true" aria-labelledby="add-portion-title">
            <header className="classroom-dialog-header">
              <div>
                <span className="approved-eyebrow">Session assignment</span>
                <h2 id="add-portion-title">Add portion</h2>
                <p>Add a verified Quran range to this recitation session.</p>
              </div>
                <button type="button" onClick={() => setShowAddPortionModal(false)} className="classroom-dialog-close" aria-label="Close add portion dialog">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
            </header>

            <div className="classroom-dialog-body">
              <fieldset className="classroom-dialog-fieldset">
                <legend>Recitation section</legend>
                <div className="classroom-dialog-sections">
                  {availableSections.map((type) => (
                    <button key={type} type="button" className={newPortionType === type ? 'active' : ''} onClick={() => setNewPortionType(type)}>
                      <strong>{SECTION_LABELS[type].shortLabel}</strong>
                      <small>{SECTION_LABELS[type].description}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="classroom-dialog-field">
                <span>Quick fill from Juz <small>Optional</small></span>
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
                  className="approved-input"
                >
                  <option value="">— Select Juz —</option>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                    <option key={j} value={j}>Juz {j}</option>
                  ))}
                </select>
              </label>
              <fieldset className="classroom-dialog-fieldset">
                <legend>Quran range</legend>
                <div className="classroom-dialog-grid">
                  <label className="classroom-dialog-field">
                    <span>From Surah</span>
                  <select value={newPortionStart} onChange={(e) => { setNewPortionStart(Number(e.target.value)); setNewPortionEnd(Number(e.target.value)); }} className="approved-input">
                    {surahList.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                  </select>
                  </label>
                  <label className="classroom-dialog-field">
                    <span>To Surah</span>
                  <select value={newPortionEnd} onChange={(e) => setNewPortionEnd(Number(e.target.value))} className="approved-input">
                    {surahList.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                  </select>
                  </label>
                  <label className="classroom-dialog-field">
                    <span>From Ayah</span>
                    <input type="number" min="1" value={newPortionStartAyah || ''} onChange={(e) => setNewPortionStartAyah(e.target.value ? Number(e.target.value) : undefined)} placeholder="Entire surah" className="approved-input" />
                  </label>
                  <label className="classroom-dialog-field">
                    <span>To Ayah</span>
                    <input type="number" min="1" value={newPortionEndAyah || ''} onChange={(e) => setNewPortionEndAyah(e.target.value ? Number(e.target.value) : undefined)} placeholder="Entire surah" className="approved-input" />
                  </label>
                </div>
              </fieldset>
              {isTeacher && classData?.students && classData.students.length > 1 && (
                <label className="classroom-dialog-field">
                  <span>Assign to reciter</span>
                  <select value={newPortionStudentId ?? 'all'} onChange={(e) => setNewPortionStudentId(e.target.value === 'all' ? null : e.target.value)} className="approved-input">
                    <option value="all">All Reciters</option>
                    {classData.students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} only</option>)}
                  </select>
                </label>
              )}
            </div>

            <footer className="classroom-dialog-footer">
              <button type="button" onClick={() => { setShowAddPortionModal(false); setNewPortionStudentId(null); }} className="approved-secondary-button">Cancel</button>
              <button type="button" onClick={handleAddPortion} className="approved-primary-button">Add portion</button>
            </footer>
          </div>
        </div>
      )}

      {/* Edit Portion Modal */}
      {showEditPortionModal && (
        <div className="classroom-modal-backdrop">
          <div className="classroom-portion-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-portion-title">
            <header className="classroom-dialog-header">
              <div>
                <span className="approved-eyebrow">Session assignment</span>
                <h2 id="edit-portion-title">Edit portion</h2>
                <p>Adjust the section or Quran range for this portion.</p>
              </div>
                <button type="button" onClick={() => setShowEditPortionModal(false)} className="classroom-dialog-close" aria-label="Close edit portion dialog">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
            </header>

            <div className="classroom-dialog-body">
              <fieldset className="classroom-dialog-fieldset">
                <legend>Recitation section</legend>
                <div className="classroom-dialog-sections">
                  {availableSections.map((type) => (
                    <button key={type} type="button" className={editPortionType === type ? 'active' : ''} onClick={() => setEditPortionType(type)}>
                      <strong>{SECTION_LABELS[type].shortLabel}</strong>
                      <small>{SECTION_LABELS[type].description}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="classroom-dialog-field">
                <span>Quick fill from Juz <small>Optional</small></span>
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
                  className="approved-input"
                >
                  <option value="">— Select Juz —</option>
                  {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                    <option key={j} value={j}>Juz {j}</option>
                  ))}
                </select>
              </label>
              <fieldset className="classroom-dialog-fieldset">
                <legend>Quran range</legend>
                <div className="classroom-dialog-grid">
                  <label className="classroom-dialog-field">
                    <span>From Surah</span>
                  <select value={editPortionStart} onChange={(e) => { setEditPortionStart(Number(e.target.value)); setEditPortionEnd(Number(e.target.value)); }} className="approved-input">
                    {surahList.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                  </select>
                  </label>
                  <label className="classroom-dialog-field">
                    <span>To Surah</span>
                  <select value={editPortionEnd} onChange={(e) => setEditPortionEnd(Number(e.target.value))} className="approved-input">
                    {surahList.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.englishName}</option>)}
                  </select>
                  </label>
                  <label className="classroom-dialog-field">
                    <span>From Ayah</span>
                    <input type="number" min="1" value={editPortionStartAyah || ''} onChange={(e) => setEditPortionStartAyah(e.target.value ? Number(e.target.value) : undefined)} placeholder="Entire surah" className="approved-input" />
                  </label>
                  <label className="classroom-dialog-field">
                    <span>To Ayah</span>
                    <input type="number" min="1" value={editPortionEndAyah || ''} onChange={(e) => setEditPortionEndAyah(e.target.value ? Number(e.target.value) : undefined)} placeholder="Entire surah" className="approved-input" />
                  </label>
                </div>
              </fieldset>
            </div>

            <footer className="classroom-dialog-footer">
              <button type="button" onClick={() => setShowEditPortionModal(false)} className="approved-secondary-button">Cancel</button>
              <button type="button" onClick={handleEditPortion} className="approved-primary-button">Update portion</button>
            </footer>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteSessionConfirm}
        eyebrow="Delete session"
        title="Remove this session?"
        message="This will permanently remove the session, its portions, and mistake occurrences recorded in it. This action cannot be undone."
        confirmLabel="Delete session"
        busy={deletingClass}
        onCancel={() => setShowDeleteSessionConfirm(false)}
        onConfirm={handleDeleteClass}
      />

      <ConfirmDialog
        open={Boolean(deletePortionId)}
        eyebrow="Delete portion"
        title="Remove this Quran portion?"
        message="The portion will be removed from this session. The section may remain empty and can be filled again later."
        confirmLabel="Delete portion"
        onCancel={() => setDeletePortionId(null)}
        onConfirm={handleDeletePortion}
      />

      <ConfirmDialog
        open={Boolean(dialogError)}
        eyebrow="Action unsuccessful"
        title="Something went wrong"
        message={dialogError || ''}
        confirmLabel="Close"
        showCancel={false}
        tone="primary"
        onCancel={() => setDialogError(null)}
        onConfirm={() => setDialogError(null)}
      />

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

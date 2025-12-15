import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { getClass, getSurahs, getSurah, getMistakesWithOccurrences, addMistake, removeMistake, deleteClass, updateClassNotes, updateStudentPerformance, addClassAssignments, updateAssignment } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { getPageNumber, getSurahsOnPage } from '../data/quranPages';

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

interface Assignment {
  id: number;
  type: string;
  start_surah: number;
  end_surah: number;
  start_ayah?: number;
  end_ayah?: number;
  student_id?: number;  // Which student this assignment is for (null = all students)
}

interface ClassData {
  id: number;
  date: string;
  day: string;
  notes?: string;
  assignments: Assignment[];
  students?: { id: number; first_name: string; last_name: string; performance?: string }[];
  is_published?: boolean;
  performance?: string;  // Legacy - now using per-student performance
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
  char_index?: number; // If set, it's a character-level mistake (index within the word)
  occurrences?: MistakeOccurrence[];
}

type SectionType = 'hifz' | 'sabqi' | 'revision';

const SECTION_LABELS: Record<SectionType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  hifz: {
    label: 'Memorization (Hifz)',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-600/50'
  },
  sabqi: {
    label: 'Sabqi (Recent)',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-600/50'
  },
  revision: {
    label: 'Revision (Manzil)',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-600/50'
  },
};

export default function Classroom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  // Teachers are verified users (is_verified = true when role=teacher at signup)
  const isTeacher = user?.is_verified === true;

  // Get pre-selected student from URL (if clicked from Classes tab)
  const preSelectedStudentId = searchParams.get('student') ? Number(searchParams.get('student')) : null;

  // Determine the back route based on current URL
  const getBackRoute = () => {
    if (location.pathname.startsWith('/teacher/')) return '/teacher/classes';
    if (location.pathname.startsWith('/student/')) return '/student/classes';
    return '/classes';
  };

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionType>('hifz');
  // Store multiple surahs for pages that span multiple surahs
  const [pageSurahsData, setPageSurahsData] = useState<Map<number, SurahData>>(new Map());
  const [surahLoading, setSurahLoading] = useState(false);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [surahList, setSurahList] = useState<{ number: number; englishName: string; name: string; numberOfAyahs: number }[]>([]);
  const [selectedPortionIndex, setSelectedPortionIndex] = useState<number>(0);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  // Performance state
  const [performanceSaving, setPerformanceSaving] = useState(false);
  // Selected student for teachers viewing class
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Add portion modal state
  const [showAddPortionModal, setShowAddPortionModal] = useState(false);
  const [newPortionType, setNewPortionType] = useState<SectionType>('hifz');
  const [newPortionStart, setNewPortionStart] = useState(67);
  const [newPortionEnd, setNewPortionEnd] = useState(67);
  const [newPortionStartAyah, setNewPortionStartAyah] = useState<number | undefined>(undefined);
  const [newPortionEndAyah, setNewPortionEndAyah] = useState<number | undefined>(undefined);
  const [newPortionStudentId, setNewPortionStudentId] = useState<number | null>(null);  // null = all students

  // Edit portion modal state
  const [showEditPortionModal, setShowEditPortionModal] = useState(false);
  const [editAssignmentId, setEditAssignmentId] = useState<number | null>(null);
  const [editPortionType, setEditPortionType] = useState<SectionType>('hifz');
  const [editPortionStart, setEditPortionStart] = useState(67);
  const [editPortionEnd, setEditPortionEnd] = useState(67);
  const [editPortionStartAyah, setEditPortionStartAyah] = useState<number | undefined>(undefined);
  const [editPortionEndAyah, setEditPortionEndAyah] = useState<number | undefined>(undefined);

  // Page-based navigation state
  const [currentPage, setCurrentPage] = useState<number>(560); // Default to Al-Mulk page

  // Refs for content measurement
  const quranContentRef = useRef<HTMLDivElement>(null);
  const quranContainerRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(2.2);

  // Word popup state for selecting word/letter/haraka
  const [wordPopup, setWordPopup] = useState<{
    show: boolean;
    word: string;
    surahNum: number;
    ayahNumber: number;
    wordIndex: number;
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

  // Calculate line-height to fill page AFTER content renders
  useEffect(() => {
    if (!quranContentRef.current || !quranContainerRef.current || surahLoading || !pageSurahsData.size) return;

    const timer = setTimeout(() => {
      const container = quranContainerRef.current;
      const content = quranContentRef.current;
      if (!container || !content) return;

      // Get available height
      const containerRect = container.getBoundingClientRect();
      const style = getComputedStyle(container);
      const paddingTop = parseFloat(style.paddingTop);
      const paddingBottom = parseFloat(style.paddingBottom);
      const availableHeight = containerRect.height - paddingTop - paddingBottom;

      // Measure content at base line-height
      content.style.lineHeight = '2';
      void content.offsetHeight;
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

  // Load class data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getClass(Number(id))
      .then((data) => {
        setClassData(data);
        setNotesText(data.notes || '');
        // Set initial active section to first available
        if (data.assignments.length > 0) {
          setActiveSection(data.assignments[0].type as SectionType);
        }
        // For teachers, pre-select student from URL or fall back to first student
        if (isTeacher && data.students && data.students.length > 0) {
          // Check if preSelectedStudentId is valid (exists in this class)
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

  // Load mistakes with occurrence info - depends on selected student for teachers
  useEffect(() => {
    // For teachers, need a selected student to fetch mistakes
    if (isTeacher && !selectedStudentId) {
      setMistakes([]);
      return;
    }

    getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined)
      .then(data => setMistakes(data || []))
      .catch(console.error);
  }, [isTeacher, selectedStudentId]);

  // Get all assignments for the active section type
  // For teachers: filter by selected student (show shared + student-specific)
  // For students: backend already filters, but we also filter here for safety
  const sectionAssignments = classData?.assignments.filter(a => {
    if (a.type !== activeSection) return false;
    // If no student_id, it's for all students
    if (!a.student_id) return true;
    // If teacher has a student selected, show that student's portions
    if (isTeacher && selectedStudentId) {
      return a.student_id === selectedStudentId;
    }
    // For students, show portions assigned to them
    if (!isTeacher && user?.id) {
      return a.student_id === user.id;
    }
    return false;
  }) || [];

  // Get current assignment based on selected portion index
  const currentAssignment = sectionAssignments[selectedPortionIndex];

  // Reset portion index when section changes
  useEffect(() => {
    setSelectedPortionIndex(0);
  }, [activeSection]);

  // Calculate page range for current assignment
  const assignmentPageRange = (() => {
    if (!currentAssignment) return { minPage: 560, maxPage: 560 };

    // Get starting page
    const startPage = getPageNumber(
      currentAssignment.start_surah,
      currentAssignment.start_ayah || 1
    );

    // Get ending page - need to figure out the last ayah
    // For simplicity, if end_ayah specified use it, otherwise use a high number
    const endSurah = currentAssignment.end_surah;
    const endAyahEstimate = currentAssignment.end_ayah || 286; // Max ayahs in any surah
    const endPage = getPageNumber(endSurah, endAyahEstimate);

    return { minPage: startPage, maxPage: endPage };
  })();

  // Initialize currentPage when assignment changes
  useEffect(() => {
    if (currentAssignment) {
      const startPage = getPageNumber(
        currentAssignment.start_surah,
        currentAssignment.start_ayah || 1
      );
      setCurrentPage(startPage);
    }
  }, [activeSection, selectedPortionIndex, currentAssignment?.start_surah, currentAssignment?.start_ayah]);

  // Load all surahs on the current page
  useEffect(() => {
    if (!currentPage) return;

    const surahsOnPage = getSurahsOnPage(currentPage);

    // Check which surahs we need to load (not already in cache)
    const surahsToLoad = surahsOnPage.filter(s => !pageSurahsData.has(s));

    if (surahsToLoad.length === 0) {
      // All surahs already loaded
      return;
    }

    setSurahLoading(true);

    // Load all surahs in parallel
    Promise.all(surahsToLoad.map(surahNum => getSurah(surahNum)))
      .then(results => {
        const newMap = new Map(pageSurahsData);
        results.forEach((surahData, idx) => {
          newMap.set(surahsToLoad[idx], surahData);
        });
        setPageSurahsData(newMap);
      })
      .catch(console.error)
      .finally(() => setSurahLoading(false));
  }, [currentPage]);

  const handleDeleteClass = async () => {
    if (!classData) return;
    if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) return;

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
      const newAssignment = {
        type: newPortionType,
        start_surah: newPortionStart,
        end_surah: newPortionEnd,
        start_ayah: newPortionStartAyah,
        end_ayah: newPortionEndAyah,
        student_id: newPortionStudentId || undefined,  // Convert null to undefined for API
      };

      await addClassAssignments(parseInt(id), [newAssignment]);

      // Reload class data
      const updatedClass = await getClass(parseInt(id));
      setClassData(updatedClass);

      // Reset form and close modal
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
      const updatedAssignment = {
        type: editPortionType,
        start_surah: editPortionStart,
        end_surah: editPortionEnd,
        start_ayah: editPortionStartAyah,
        end_ayah: editPortionEndAyah,
      };

      await updateAssignment(editAssignmentId, updatedAssignment);

      // Reload class data
      const updatedClass = await getClass(parseInt(id));
      setClassData(updatedClass);

      // Reset form and close modal
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
        <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 110 20 10 10 0 010-20z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">Class not found</h2>
        <p className="text-slate-400 mb-6">The class you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate(getBackRoute())}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
        >
          Back to Classes
        </button>
      </div>
    );
  }

  // Arabic harakat (diacritical marks) unicode ranges
  const HARAKAT = [
    '\u064B', // Fathatan ً
    '\u064C', // Dammatan ٌ
    '\u064D', // Kasratan ٍ
    '\u064E', // Fatha َ
    '\u064F', // Damma ُ
    '\u0650', // Kasra ِ
    '\u0651', // Shadda ّ
    '\u0652', // Sukun ْ
    '\u0653', // Maddah ٓ
    '\u0654', // Hamza above ٔ
    '\u0655', // Hamza below ٕ
    '\u0656', // Subscript alef ٖ
    '\u0657', // Inverted damma ٗ
    '\u0658', // Mark noon ghunna ٘
    '\u0659', // Zwarakay ٙ
    '\u065A', // Vowel sign small v above ٚ
    '\u065B', // Vowel sign inverted small v above ٛ
    '\u065C', // Vowel sign dot below ٜ
    '\u065D', // Reversed damma ٝ
    '\u065E', // Fatha with two dots ٞ
    '\u0670', // Superscript alef ٰ
  ];

  const isHaraka = (char: string) => HARAKAT.includes(char);

  // Split Arabic word into base letters and harakat, preserving original indices
  // Groups shadda with following vowel mark as a single unit
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
        // Check if this is a shadda followed by another haraka - group them
        if (char === SHADDA && i + 1 < word.length && isHaraka(word[i + 1])) {
          const combined = char + word[i + 1];
          harakat.push({ char: combined, index: i, display: combined });
          i++; // Skip the next character since we combined it
        }
        // Check if previous was shadda (already handled above, skip)
        else if (i > 0 && word[i - 1] === SHADDA) {
          // Already combined with shadda, skip
        }
        else {
          harakat.push({ char, index: i, display: char });
        }
      } else {
        letters.push({ char, index: i });
      }
    }

    return { letters, harakat };
  };

  // Split word into render units - each letter separate, each haraka separate
  // but they render adjacently so harakat stay visually attached
  interface RenderUnit {
    char: string;
    index: number;
    isHaraka: boolean;
  }

  const splitIntoRenderUnits = (word: string): RenderUnit[] => {
    return [...word].map((char, index) => ({
      char,
      index,
      isHaraka: isHaraka(char),
    }));
  };

  // Check if a specific character index has a mistake
  // Only matches on exact char_index - no fallback to text matching
  const getCharMistakeLevel = (surahNum: number, ayahNumber: number, wordIndex: number, charIndex: number): number => {
    const mistake = mistakes.find((m) => {
      if (m.surah_number !== surahNum || m.ayah_number !== ayahNumber || m.word_index !== wordIndex) {
        return false;
      }
      // Only match if char_index matches exactly
      return m.char_index === charIndex;
    });
    if (!mistake) return 0;
    if (mistake.error_count >= 5) return 5;
    if (mistake.error_count >= 4) return 4;
    if (mistake.error_count >= 3) return 3;
    if (mistake.error_count >= 2) return 2;
    return 1;
  };

  // Check if whole word has a mistake (char_index is null/undefined)
  const getWordMistakeLevel = (surahNum: number, ayahNumber: number, wordIndex: number): number => {
    const mistake = mistakes.find(
      (m) =>
        m.surah_number === surahNum &&
        m.ayah_number === ayahNumber &&
        m.word_index === wordIndex &&
        (m.char_index === undefined || m.char_index === null)
    );
    if (!mistake) return 0;
    if (mistake.error_count >= 5) return 5;
    if (mistake.error_count >= 4) return 4;
    if (mistake.error_count >= 3) return 3;
    if (mistake.error_count >= 2) return 2;
    return 1;
  };

  // Check if word has any mistake (word-level or char-level)
  const _hasAnyMistake = (surahNum: number, ayahNumber: number, wordIndex: number): boolean => {
    return mistakes.some(
      (m) =>
        m.surah_number === surahNum &&
        m.ayah_number === ayahNumber &&
        m.word_index === wordIndex
    );
  };
  void _hasAnyMistake; // Suppress unused warning

  // Show popup when word is clicked - Teachers only
  const handleWordClick = (e: React.MouseEvent, surahNum: number, ayahNumber: number, wordIndex: number, wordText: string) => {
    if (!isTeacher) return; // Students cannot mark mistakes

    // Get click position for popup
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const popupHeight = 350; // Approximate popup height
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < popupHeight && rect.top > popupHeight;

    setWordPopup({
      show: true,
      word: wordText,
      surahNum,
      ayahNumber,
      wordIndex,
      position: {
        x: rect.left + rect.width / 2,
        y: showAbove ? rect.top - 8 : rect.bottom + 8,
      },
      showAbove,
    });
  };

  // Add mistake when user selects from popup
  // charIndex: undefined = whole word, number = specific character position in original word
  const handleAddMistake = async (mistakeText: string, charIndex?: number) => {
    if (!wordPopup) return;

    // Teachers must have a student selected
    if (isTeacher && !selectedStudentId) {
      console.error('Teacher must select a student first');
      return;
    }

    try {
      await addMistake({
        student_id: isTeacher ? selectedStudentId || undefined : undefined,
        surah_number: wordPopup.surahNum,
        ayah_number: wordPopup.ayahNumber,
        word_index: wordPopup.wordIndex,
        word_text: mistakeText,
        char_index: charIndex,
        class_id: id ? parseInt(id) : undefined,
      });

      // Reload all mistakes with occurrence info to get fresh data
      const updatedMistakes = await getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined);
      setMistakes(updatedMistakes || []);
    } catch (err) {
      console.error('Failed to add mistake:', err);
    }

    setWordPopup(null);
  };

  const handleWordRightClick = async (e: React.MouseEvent, surahNum: number, ayahNumber: number, wordIndex: number) => {
    e.preventDefault();
    if (!isTeacher) return; // Students cannot remove mistakes

    const existingMistake = mistakes.find(
      (m) =>
        m.surah_number === surahNum &&
        m.ayah_number === ayahNumber &&
        m.word_index === wordIndex
    );

    if (!existingMistake) return;

    try {
      await removeMistake(existingMistake.id);
      // Reload all mistakes with occurrence info to get fresh data
      const updatedMistakes = await getMistakesWithOccurrences(undefined, isTeacher ? selectedStudentId || undefined : undefined);
      setMistakes(updatedMistakes || []);
    } catch (err) {
      console.error('Failed to remove mistake:', err);
    }
  };

  const getSurahName = (num: number) => {
    const surah = surahList.find(s => s.number === num);
    return surah?.englishName || `Surah ${num}`;
  };

  const formatAssignmentRange = (assignment: Assignment) => {
    const startName = getSurahName(assignment.start_surah);
    const endName = getSurahName(assignment.end_surah);

    if (assignment.start_surah === assignment.end_surah) {
      if (assignment.start_ayah && assignment.end_ayah) {
        return `${startName} (${assignment.start_ayah}-${assignment.end_ayah})`;
      }
      return startName;
    } else {
      return `${startName} to ${endName}`;
    }
  };


  // Filter mistakes to only show those within the current page's surahs
  const surahsOnPage = getSurahsOnPage(currentPage);
  const currentMistakes = (mistakes || []).filter((m) => {
    // Check if mistake is in one of the surahs on this page
    if (!surahsOnPage.includes(m.surah_number)) return false;
    // Also check if the ayah is on the current page
    const mistakePage = getPageNumber(m.surah_number, m.ayah_number);
    return mistakePage === currentPage;
  });

  // Group consecutive word mistakes into phrases (adjacent words = 1 mistake)
  interface MistakeGroup {
    ayah_number: number;
    start_word_index: number;
    end_word_index: number;
    words: Mistake[];
    max_error_count: number;
  }

  const groupConsecutiveMistakes = (mistakeList: Mistake[]): MistakeGroup[] => {
    if (mistakeList.length === 0) return [];

    // Sort by ayah number, then by word index
    const sorted = [...mistakeList].sort((a, b) => {
      if (a.ayah_number !== b.ayah_number) return a.ayah_number - b.ayah_number;
      return a.word_index - b.word_index;
    });

    const groups: MistakeGroup[] = [];
    let currentGroup: MistakeGroup = {
      ayah_number: sorted[0].ayah_number,
      start_word_index: sorted[0].word_index,
      end_word_index: sorted[0].word_index,
      words: [sorted[0]],
      max_error_count: sorted[0].error_count,
    };

    for (let i = 1; i < sorted.length; i++) {
      const mistake = sorted[i];
      const isConsecutive =
        mistake.ayah_number === currentGroup.ayah_number &&
        mistake.word_index === currentGroup.end_word_index + 1;

      if (isConsecutive) {
        // Add to current group
        currentGroup.end_word_index = mistake.word_index;
        currentGroup.words.push(mistake);
        currentGroup.max_error_count = Math.max(currentGroup.max_error_count, mistake.error_count);
      } else {
        // Start a new group
        groups.push(currentGroup);
        currentGroup = {
          ayah_number: mistake.ayah_number,
          start_word_index: mistake.word_index,
          end_word_index: mistake.word_index,
          words: [mistake],
          max_error_count: mistake.error_count,
        };
      }
    }
    groups.push(currentGroup);

    return groups;
  };

  const mistakeGroups = groupConsecutiveMistakes(currentMistakes);
  const totalErrors = mistakeGroups.length;

  // Get all surahs on the current page and their ayahs
  const surahsOnCurrentPage = getSurahsOnPage(currentPage);

  // Build page content: array of { surahNum, surahData, ayahs } for each surah on this page
  const pageContent = surahsOnCurrentPage.map(surahNum => {
    const surahData = pageSurahsData.get(surahNum);
    if (!surahData) return null;

    // Filter ayahs to only those on the current page
    const filteredAyahs = surahData.ayahs.filter(ayah => {
      const ayahPage = getPageNumber(surahNum, ayah.numberInSurah);
      return ayahPage === currentPage;
    });

    return {
      surahNum,
      surahData,
      ayahs: filteredAyahs
    };
  }).filter(Boolean) as { surahNum: number; surahData: SurahData; ayahs: AyahData[] }[];

  // Check if all surahs are loaded
  const allSurahsLoaded = surahsOnCurrentPage.every(s => pageSurahsData.has(s));

  // Navigation helpers
  const canGoPrev = currentPage > assignmentPageRange.minPage;
  const canGoNext = currentPage < assignmentPageRange.maxPage;
  const totalPagesInAssignment = assignmentPageRange.maxPage - assignmentPageRange.minPage + 1;
  const currentPageInAssignment = currentPage - assignmentPageRange.minPage + 1;

  // All section types - always show all three tabs so users can add portions to any
  const availableSections: SectionType[] = ['hifz', 'sabqi', 'revision'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(getBackRoute())}
          className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-100">
            Class - {classData.day}, {classData.date}
          </h1>
          {/* Student selector for teachers */}
          {isTeacher && classData.students && classData.students.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-slate-400">Marking mistakes for:</span>
              <div className="relative">
                <select
                  value={selectedStudentId || ''}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  {classData.students.map(s => (
                    <option key={s.id} value={s.id} className="bg-slate-800 text-slate-100">
                      {s.first_name} {s.last_name}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          {isTeacher && (!classData.students || classData.students.length === 0) && (
            <p className="text-sm text-amber-400 mt-2">No students in this class - cannot mark mistakes</p>
          )}
        </div>

        {/* Performance Dropdown - Per-student performance */}
        {isTeacher && selectedStudentId && classData.students && (() => {
          const selectedStudent = classData.students.find(s => s.id === selectedStudentId);
          const studentPerf = selectedStudent?.performance;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Performance:</span>
              <div className="relative">
                <select
                  value={studentPerf || ''}
                  onChange={async (e) => {
                    const newPerformance = e.target.value;
                    setPerformanceSaving(true);
                    try {
                      await updateStudentPerformance(classData.id, selectedStudentId, newPerformance);
                      // Update local state
                      setClassData({
                        ...classData,
                        students: classData.students?.map(s =>
                          s.id === selectedStudentId ? { ...s, performance: newPerformance || undefined } : s
                        )
                      });
                    } catch (err) {
                      console.error('Failed to update performance:', err);
                    } finally {
                      setPerformanceSaving(false);
                    }
                  }}
                  disabled={performanceSaving}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${
                    studentPerf === 'Excellent'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : studentPerf === 'Very Good'
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : studentPerf === 'Good'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : studentPerf === 'Needs Work'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                  }`}
                >
                  <option value="" className="bg-slate-800 text-slate-300">Not rated</option>
                  <option value="Excellent" className="bg-slate-800 text-slate-100">Excellent</option>
                  <option value="Very Good" className="bg-slate-800 text-slate-100">Very Good</option>
                  <option value="Good" className="bg-slate-800 text-slate-100">Good</option>
                  <option value="Needs Work" className="bg-slate-800 text-slate-100">Needs Work</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-current pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          );
        })()}

        {/* Notes button - View for all, Edit for teachers only */}
        {(isTeacher || classData.notes) && (
          <button
            onClick={() => setShowNotesEditor(!showNotesEditor)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-colors ${
              classData.notes
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-600/50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {isTeacher ? (classData.notes ? 'View Notes' : 'Add Notes') : 'View Notes'}
          </button>
        )}
        {/* Delete button - Teachers only */}
        {isTeacher && (
          <button
            onClick={handleDeleteClass}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Class
          </button>
        )}
      </div>

      {/* Notes Editor/Viewer */}
      {showNotesEditor && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Class Notes {!isTeacher && '(from your teacher)'}
            </h3>
            <button
              onClick={() => setShowNotesEditor(false)}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
            >
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
                placeholder="Add observations, feedback, or reminders for this class..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-shadow"
              />
              <div className="flex justify-end gap-3 mt-3">
                <button
                  onClick={() => {
                    setNotesText(classData.notes || '');
                    setShowNotesEditor(false);
                  }}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
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

      {/* Section Tabs */}
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
                isActive
                  ? `${config.bgColor} ${config.borderColor} ${config.color}`
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600/50'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold ${isActive ? config.color : 'text-slate-200'}`}>
                    {config.label}
                  </p>
                  {typeAssignments.length > 1 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-slate-700'
                    }`}>
                      {typeAssignments.length} portions
                    </span>
                  )}
                </div>
                {typeAssignments.length > 0 && (
                  <p className={`text-sm mt-1 ${isActive ? 'opacity-80' : 'text-slate-400'}`}>
                    {typeAssignments.map((a, i) => (
                      <span key={a.id}>
                        {i > 0 && ' + '}
                        {formatAssignmentRange(a)}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Portion Button - Teachers only */}
      {isTeacher && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setNewPortionType(activeSection);
              setShowAddPortionModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-slate-100 rounded-xl transition-colors border border-slate-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Portion to {SECTION_LABELS[activeSection].label}
          </button>
        </div>
      )}

      {/* Current Section Info */}
      {currentAssignment ? (
        <>
          {/* Portion Navigation for Multiple Portions in Same Section */}
          {sectionAssignments.length > 1 && (
            <div className="card p-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-400">Select Portion:</span>
                <div className="flex flex-wrap gap-2">
                  {sectionAssignments.map((assignment, index) => (
                    <div key={assignment.id} className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedPortionIndex(index)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedPortionIndex === index
                            ? `${SECTION_LABELS[activeSection].bgColor} ${SECTION_LABELS[activeSection].color} border ${SECTION_LABELS[activeSection].borderColor}`
                            : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
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
                          className="w-8 h-8 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
                          title="Edit portion"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Single Portion Info with Edit Button */}
          {sectionAssignments.length === 1 && (
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-400">Current Portion:</span>
                  <span className="text-slate-200 font-medium">{formatAssignmentRange(currentAssignment)}</span>
                </div>
                {isTeacher && (
                  <button
                    onClick={() => {
                      setEditAssignmentId(currentAssignment.id);
                      setEditPortionType(currentAssignment.type as SectionType);
                      setEditPortionStart(currentAssignment.start_surah);
                      setEditPortionEnd(currentAssignment.end_surah);
                      setEditPortionStartAyah(currentAssignment.start_ayah);
                      setEditPortionEndAyah(currentAssignment.end_ayah);
                      setShowEditPortionModal(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors text-sm"
                    title="Edit portion"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    Edit
                  </button>
                )}
              </div>
            </div>
          )}

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
              </div>
            </div>

            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-400">
                Click words to mark mistakes. Right-click to remove.
              </p>
              {/* Error Count */}
              <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                totalErrors === 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-600/50'
                  : totalErrors < 5
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-600/50'
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

          {/* Quran Text with Navigation Buttons on Sides (RTL: Next on left, Previous on right) */}
          <div className="flex items-center gap-2 md:gap-4 justify-center">
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

            {/* Mushaf Page - Madani Mushaf aspect ratio 14:20 (width:height = 0.7), 15 lines per page - FIXED SIZE, NO SCROLLING */}
            <div className="mushaf-page mx-auto overflow-hidden flex flex-col" style={{ aspectRatio: '14/20', height: '85vh' }}>
              {/* Corner decorations */}
              <span className="corner-tl">✦</span>
              <span className="corner-tr">✦</span>
              <span className="corner-bl">✦</span>
              <span className="corner-br">✦</span>
              {/* Edge decorations - top and bottom only */}
              <span className="edge-top">❧ ✤ ❧ ✤ ❧ ✤ ❧</span>
              <span className="edge-bottom">❧ ✤ ❧ ✤ ❧ ✤ ❧</span>
              {/* Content - fills entire page height with vertical justification */}
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
                    {/* Surah Header - show for each surah on the page */}
                    {/* Add extra top margin if this is not the first surah on the page (surah starts mid-page) */}
                    {ayahs.some(a => a.numberInSurah === 1) && (
                      <div className={`text-center mb-2 ${surahIndex > 0 ? 'mt-6' : ''}`}>
                        <div className="surah-header-frame">
                          <h2 className="font-amiri text-xl md:text-2xl text-emerald-800">{surahData.name}</h2>
                        </div>
                      </div>
                    )}

                    {/* Bismillah - show if surah starts on this page and not surah 1 or 9 */}
                    {surahNum !== 9 && surahNum !== 1 && ayahs.some(a => a.numberInSurah === 1) && (
                      <p className="font-amiri text-base md:text-lg text-center text-emerald-700 mb-3 pb-1 border-b border-emerald-600/20">
                        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                      </p>
                    )}

                    {/* Surah name badge if not starting from ayah 1 */}
                    {!ayahs.some(a => a.numberInSurah === 1) && surahIndex === 0 && (
                      <div className="text-center mb-2">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs">
                          {surahData.englishName} (continued)
                        </span>
                      </div>
                    )}

                    {/* Ayahs - Uthmani style with justification */}
                    <div className="font-amiri text-lg md:text-xl text-slate-800 text-justify" dir="rtl" style={{ lineHeight }}>
                      {ayahs.map((ayah) => {
                        // Strip Bismillah from first ayah (4 words) for surahs other than 1 and 9
                        const shouldStripBismillah = ayah.numberInSurah === 1 && surahNum !== 1 && surahNum !== 9;
                        const words = ayah.text.split(' ');
                        const displayWords = shouldStripBismillah ? words.slice(4) : words;
                        const wordOffset = shouldStripBismillah ? 4 : 0;

                        return (
                        <span key={`${surahNum}-${ayah.number}`} id={`ayah-${surahNum}-${ayah.numberInSurah}`} className="inline transition-all rounded-lg">
                          {displayWords.map((word, idx) => {
                            const wordIndex = idx + wordOffset;
                            const wordMistakeLevel = getWordMistakeLevel(surahNum, ayah.numberInSurah, wordIndex);
                            // Check for char-level mistakes: only explicit char_index
                            const hasCharMistakes = mistakes.some(
                              m => m.surah_number === surahNum &&
                                   m.ayah_number === ayah.numberInSurah &&
                                   m.word_index === wordIndex &&
                               m.char_index !== undefined && m.char_index !== null
                        );

                        return (
                          <span
                            key={`${ayah.number}-${wordIndex}`}
                            onClick={(e) => handleWordClick(e, surahNum, ayah.numberInSurah, wordIndex, word)}
                            onContextMenu={(e) => handleWordRightClick(e, surahNum, ayah.numberInSurah, wordIndex)}
                            className={`${isTeacher ? 'cursor-pointer hover:bg-emerald-100' : ''} rounded px-0.5 transition-all inline-block ${
                              wordMistakeLevel === 1
                                ? 'bg-amber-200 text-amber-900'
                                : wordMistakeLevel === 2
                                ? 'bg-blue-200 text-blue-900'
                                : wordMistakeLevel === 3
                                ? 'bg-orange-200 text-orange-900'
                                : wordMistakeLevel === 4
                                ? 'bg-purple-200 text-purple-900'
                                : wordMistakeLevel === 5
                                ? 'bg-red-200 text-red-900'
                                : ''
                            }`}
                          >
                            {hasCharMistakes ? (
                              // Render each character separately - harakat stay visually attached
                              splitIntoRenderUnits(word).map((unit) => {
                                const charMistakeLevel = getCharMistakeLevel(
                                  surahNum,
                                  ayah.numberInSurah,
                                  wordIndex,
                                  unit.index
                                );
                                // Use different styling for harakat vs letters
                                // Harakat use bright text color, letters use background
                                const getCharStyle = () => {
                                  if (charMistakeLevel === 0) return '';
                                  if (unit.isHaraka) {
                                    // Bright colored text for harakat (more visible on white bg)
                                    return charMistakeLevel >= 5
                                      ? 'text-red-600 font-bold'
                                      : charMistakeLevel >= 4
                                      ? 'text-purple-600 font-bold'
                                      : charMistakeLevel >= 3
                                      ? 'text-orange-600 font-bold'
                                      : charMistakeLevel >= 2
                                      ? 'text-blue-600 font-bold'
                                      : 'text-amber-600 font-bold';
                                  }
                                  // Background highlight for letters (on white bg)
                                  return charMistakeLevel >= 5
                                    ? 'bg-red-200 text-red-900'
                                    : charMistakeLevel >= 4
                                    ? 'bg-purple-200 text-purple-900'
                                    : charMistakeLevel >= 3
                                    ? 'bg-orange-200 text-orange-900'
                                    : charMistakeLevel >= 2
                                    ? 'bg-blue-200 text-blue-900'
                                    : 'bg-amber-200 text-amber-900';
                                };
                                return (
                                  <span
                                    key={unit.index}
                                    className={getCharStyle()}
                                  >
                                    {unit.char}
                                  </span>
                                );
                              })
                            ) : (
                              word
                            )}
                          </span>
                        );
                          })}
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
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-slate-700 font-medium mb-1">Failed to load Surah</p>
                <p className="text-slate-500 text-sm">Please check your connection and try again</p>
              </div>
            )}
              </div>
            </div>

            {/* Previous Page Button - RIGHT side (RTL: backward = right) - Small & subtle */}
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

          {/* Class-Grouped Mistakes Summary */}
          {currentMistakes.length > 0 && (() => {
            // Get current class ID and date
            const currentClassId = classData?.id;
            const currentClassDate = classData?.date;

            // Separate mistakes into "this class" and "previous classes" (only classes BEFORE this one)
            const thisClassMistakes = currentMistakes.filter(m =>
              m.occurrences?.some(o => o.class_id === currentClassId)
            );

            // Only include mistakes from classes with dates BEFORE the current class
            const previousClassMistakes = currentMistakes.filter(m =>
              m.occurrences?.some(o =>
                o.class_id !== currentClassId &&
                currentClassDate &&
                o.class_date < currentClassDate
              )
            );

            // Group previous mistakes by class (only classes before current)
            const previousByClass: { [classId: number]: { date: string; day: string; mistakes: Mistake[] } } = {};
            previousClassMistakes.forEach(m => {
              m.occurrences?.forEach(o => {
                // Only include if it's a previous class (date before current)
                if (o.class_id !== currentClassId && currentClassDate && o.class_date < currentClassDate) {
                  if (!previousByClass[o.class_id]) {
                    previousByClass[o.class_id] = { date: o.class_date, day: o.class_day, mistakes: [] };
                  }
                  if (!previousByClass[o.class_id].mistakes.find(pm => pm.id === m.id)) {
                    previousByClass[o.class_id].mistakes.push(m);
                  }
                }
              });
            });

            // Sort classes by date (most recent first)
            const sortedClassIds = Object.keys(previousByClass)
              .map(Number)
              .sort((a, b) => previousByClass[b].date.localeCompare(previousByClass[a].date));

            const getMistakeColor = (errorCount: number) => {
              if (errorCount >= 5) return 'bg-red-500/20 text-red-400 border-red-600/50';
              if (errorCount >= 4) return 'bg-purple-500/20 text-purple-400 border-purple-600/50';
              if (errorCount >= 3) return 'bg-orange-500/20 text-orange-400 border-orange-600/50';
              if (errorCount >= 2) return 'bg-blue-500/20 text-blue-400 border-blue-600/50';
              return 'bg-amber-500/20 text-amber-400 border-amber-600/50';
            };

            return (
              <div className="space-y-4">
                {/* This Class Mistakes */}
                {thisClassMistakes.length > 0 && (
                  <div className="card p-6 border-2 border-emerald-600/30 bg-emerald-500/5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                        <h3 className="font-semibold text-emerald-400">
                          Mistakes in This Class (Class {currentClassId} - {classData?.date})
                        </h3>
                      </div>
                      <span className="text-sm text-emerald-400/70">
                        {thisClassMistakes.length} mistake{thisClassMistakes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {thisClassMistakes.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            const element = document.getElementById(`ayah-${m.ayah_number}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }}
                          className={`px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all hover:scale-105 border ${getMistakeColor(m.error_count)}`}
                        >
                          <span className="arabic text-lg">{m.word_text}</span>
                          <span className="text-xs opacity-75">{m.ayah_number}:{m.word_index + 1}</span>
                          {m.error_count > 1 && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">
                              {m.error_count}x total
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Classes Mistakes */}
                {sortedClassIds.length > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-100">Mistakes from Previous Classes</h3>
                      <span className="text-sm text-slate-400">
                        {previousClassMistakes.length} mistake{previousClassMistakes.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {sortedClassIds.map(classId => {
                        const classInfo = previousByClass[classId];
                        return (
                          <div key={classId} className="border-l-2 border-slate-600 pl-4">
                            <div className="text-sm font-medium text-slate-300 mb-2">
                              Class {classId} - {classInfo.date} ({classInfo.day})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {classInfo.mistakes.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    const element = document.getElementById(`ayah-${m.ayah_number}`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all hover:scale-105 border ${getMistakeColor(m.error_count)}`}
                                >
                                  <span className="arabic text-base">{m.word_text}</span>
                                  <span className="text-xs opacity-75">{m.ayah_number}:{m.word_index + 1}</span>
                                  {m.error_count > 1 && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-white/10">
                                      {m.error_count}x
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-slate-400">
            No {activeSection} portion assigned for this class.
          </p>
        </div>
      )}

      {/* Word Selection Popup */}
      {wordPopup && (
        <>
          {/* Backdrop to close popup - click anywhere to dismiss */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setWordPopup(null)}
          />

          {/* Popup */}
          <div
            className="fixed z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3 w-[260px] max-h-[70vh] overflow-y-auto"
            style={{
              left: `${Math.min(Math.max(wordPopup.position.x, 140), window.innerWidth - 140)}px`,
              top: wordPopup.showAbove ? 'auto' : `${wordPopup.position.y}px`,
              bottom: wordPopup.showAbove ? `${window.innerHeight - wordPopup.position.y}px` : 'auto',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Arrow - points up or down based on popup position */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-slate-600 ${
                wordPopup.showAbove
                  ? '-bottom-1.5 border-r border-b rotate-45'
                  : '-top-1.5 border-l border-t rotate-45'
              }`}
            />

            {/* Header */}
            <div className="text-center mb-2 pb-2 border-b border-slate-700">
              <p className="arabic text-xl text-slate-100">{wordPopup.word}</p>
            </div>

            {/* Whole Word Option */}
            <button
              onClick={() => handleAddMistake(wordPopup.word, undefined)}
              className="w-full mb-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-amber-400 text-sm font-medium transition-colors"
            >
              Whole Word
            </button>

            {/* Letters & Harakat Sections */}
            {(() => {
              const { letters, harakat } = splitArabicWord(wordPopup.word);
              return (
                <>
                  <div className="mb-2">
                    <p className="text-xs text-slate-400 mb-1">Letters:</p>
                    <div className="flex flex-row-reverse flex-wrap gap-1.5 justify-center">
                      {letters.map((l) => (
                        <button
                          key={`letter-${l.index}`}
                          onClick={() => handleAddMistake(l.char, l.index)}
                          className="w-8 h-8 arabic text-lg bg-slate-700/50 hover:bg-blue-500/30 border border-slate-600 hover:border-blue-500/50 rounded text-slate-200 hover:text-blue-400 transition-colors"
                        >
                          {l.char}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Harakat Section */}
                  {harakat.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-400 mb-1">Harakat:</p>
                      <div className="flex flex-row-reverse flex-wrap gap-1.5 justify-center">
                        {harakat.map((h) => (
                          <button
                            key={`haraka-${h.index}`}
                            onClick={() => handleAddMistake(h.char, h.index)}
                            className="w-9 h-9 arabic text-xl bg-slate-700/50 hover:bg-purple-500/30 border border-slate-600 hover:border-purple-500/50 rounded text-slate-200 hover:text-purple-400 transition-colors flex items-center justify-center"
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

            {/* Cancel */}
            <button
              onClick={() => setWordPopup(null)}
              className="w-full px-3 py-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Add Portion Modal */}
      {showAddPortionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Add Portion</h2>
                  <p className="text-slate-400 mt-1">Add a new portion to {SECTION_LABELS[newPortionType].label}</p>
                </div>
                <button
                  onClick={() => setShowAddPortionModal(false)}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Surah</label>
                  <select
                    value={newPortionStart}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewPortionStart(val);
                      setNewPortionEnd(val);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {surahList.map((surah) => (
                      <option key={surah.number} value={surah.number}>
                        {surah.number}. {surah.englishName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Surah</label>
                  <select
                    value={newPortionEnd}
                    onChange={(e) => setNewPortionEnd(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {surahList.map((surah) => (
                      <option key={surah.number} value={surah.number}>
                        {surah.number}. {surah.englishName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Ayah (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={newPortionStartAyah || ''}
                    onChange={(e) => setNewPortionStartAyah(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="All"
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Ayah (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={newPortionEndAyah || ''}
                    onChange={(e) => setNewPortionEndAyah(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="All"
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Student selector for per-student portions - only show for teachers with multiple students */}
              {isTeacher && classData?.students && classData.students.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Assign to Student</label>
                  <div className="relative">
                    <select
                      value={newPortionStudentId ?? 'all'}
                      onChange={(e) => setNewPortionStudentId(e.target.value === 'all' ? null : Number(e.target.value))}
                      className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                    >
                      <option value="all">All Students</option>
                      {classData.students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} only
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {newPortionStudentId === null
                      ? 'This portion will be visible to all students'
                      : `Only ${classData.students.find(s => s.id === newPortionStudentId)?.first_name} will see this portion`}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-800/50 border-t border-slate-700/30 flex gap-3">
              <button
                onClick={() => {
                  setShowAddPortionModal(false);
                  setNewPortionStudentId(null);
                }}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPortion}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
              >
                Add Portion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Portion Modal */}
      {showEditPortionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100">Edit Portion</h2>
                  <p className="text-slate-400 mt-1">Update portion details</p>
                </div>
                <button
                  onClick={() => setShowEditPortionModal(false)}
                  className="w-10 h-10 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Surah</label>
                  <select
                    value={editPortionStart}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditPortionStart(val);
                      setEditPortionEnd(val);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {surahList.map((surah) => (
                      <option key={surah.number} value={surah.number}>
                        {surah.number}. {surah.englishName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Surah</label>
                  <select
                    value={editPortionEnd}
                    onChange={(e) => setEditPortionEnd(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {surahList.map((surah) => (
                      <option key={surah.number} value={surah.number}>
                        {surah.number}. {surah.englishName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">From Ayah (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={editPortionStartAyah || ''}
                    onChange={(e) => setEditPortionStartAyah(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="All"
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">To Ayah (optional)</label>
                  <input
                    type="number"
                    min="1"
                    value={editPortionEndAyah || ''}
                    onChange={(e) => setEditPortionEndAyah(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="All"
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-800/50 border-t border-slate-700/30 flex gap-3">
              <button
                onClick={() => setShowEditPortionModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditPortion}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
              >
                Update Portion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

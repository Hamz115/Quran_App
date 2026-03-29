import { type DriveStep, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';

// ── Tour step definitions ──

export type StepType = 'info' | 'interactive';

export interface TourStepDef {
  screen: 'dashboard' | 'teacher-classes' | 'classroom' | 'reader' | 'settings' | 'dashboard-final';
  element?: string; // data-tour selector, or undefined for full overlay
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  type: StepType; // 'info' = Next button, 'interactive' = must click target
  interactiveTarget?: string; // CSS selector for the clickable element (for interactive steps)
  waitForElement?: string; // Wait for this element to appear before showing step
}

export const TOUR_STEPS: TourStepDef[] = [
  // ── PHASE 1: WELCOME (Dashboard) ──
  {
    screen: 'dashboard',
    title: 'Welcome to QuranTrack!',
    description: 'This hands-on tour will walk you through creating your first class, tracking mistakes, and managing sessions. Follow along!',
    type: 'info',
  },
  {
    screen: 'dashboard',
    element: '[data-tour="add-student-btn"]',
    title: 'Add Students',
    description: 'Add students to your roster by searching their email. They must have a QuranTrack account first.',
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'dashboard',
    element: '[data-tour="start-class-btn"]',
    title: 'Start a Class',
    description: "Let's create your first class. <strong>Click this button.</strong>",
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="start-class-btn"]',
  },

  // ── PHASE 2: CLASS CREATION (TeacherClasses modal) ──
  {
    screen: 'teacher-classes',
    element: '[data-tour="class-date"]',
    title: 'Class Date',
    description: 'The date and day are auto-filled. You can change them if this class was on a different day.',
    side: 'bottom',
    type: 'info',
    waitForElement: '[data-tour="class-date"]',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="student-selector"]',
    title: 'Select Students',
    description: "Select students from your roster. If you haven't added any yet, that's fine — you can skip this for now.",
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="next-portions-btn"]',
    title: 'Continue to Portions',
    description: '<strong>Click "Next: Choose Portions"</strong> to configure what the student will recite.',
    side: 'top',
    type: 'interactive',
    interactiveTarget: '[data-tour="next-portions-btn"]',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="hifz-section"]',
    title: 'Memorization (Hifz)',
    description: 'This is the Memorization section. It\'s on by default. Each section lets you assign a Quran portion for the student to recite.',
    side: 'bottom',
    type: 'info',
    waitForElement: '[data-tour="hifz-section"]',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="portion-mode"]',
    title: 'Selection Mode',
    description: 'Choose how to select the portion — <strong>By Surah</strong> (surah + ayah range), <strong>By Page</strong>, or <strong>By Juz</strong>.',
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="surah-selector"]',
    title: 'Choose a Surah',
    description: '<strong>Select any surah</strong> you\'d like to test with.',
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="surah-selector"]',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="ayah-range"]',
    title: 'Ayah Range',
    description: 'Set the start and end ayah. If you leave them as is, the full surah is used.',
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="sabqi-toggle"]',
    title: 'Recent Review (Sabqi)',
    description: 'Toggle this ON to add a Recent Review section. Toggle OFF if not needed for this class.',
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="manzil-toggle"]',
    title: 'Revision (Manzil)',
    description: 'Toggle this ON to add a Revision section.',
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'teacher-classes',
    element: '[data-tour="create-class-btn"]',
    title: 'Create the Class',
    description: "You're ready! <strong>Click Create Class</strong> to start the session.",
    side: 'top',
    type: 'interactive',
    interactiveTarget: '[data-tour="create-class-btn"]',
  },

  // ── PHASE 3: CLASSROOM — SECTION TABS ──
  {
    screen: 'classroom',
    element: '[data-tour="section-tabs"]',
    title: 'Section Tabs',
    description: 'These tabs switch between your assigned sections — Memorization, Recent Review, and Revision.',
    side: 'bottom',
    type: 'info',
    waitForElement: '[data-tour="section-tabs"]',
  },

  // ── PHASE 4: CLASSROOM — QURAN PAGE & MISTAKES ──
  {
    screen: 'classroom',
    element: '[data-tour="quran-page"]',
    title: 'The Mushaf Page',
    description: "This is the Quran in authentic Madani Mushaf fonts. Tap any word to mark a mistake during recitation.",
    side: 'left',
    type: 'info',
  },
  {
    screen: 'classroom',
    element: '[data-tour="quran-page"]',
    title: 'Try It — Tap a Word',
    description: '<strong>Click any word</strong> on the Quran page to open the mistake menu.',
    side: 'left',
    type: 'interactive',
    interactiveTarget: '[data-tour="quran-page"]',
    waitForElement: '[data-tour="word-popup"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="word-popup"]',
    title: 'Word Mistake',
    description: 'This is a <strong>Whole Word Mistake</strong> — marks the entire word as incorrect. Use it when the student skips or misreads the whole word. <strong>Click "Whole Word" to mark it.</strong>',
    side: 'left',
    type: 'interactive',
    interactiveTarget: '[data-tour="whole-word-btn"]',
    waitForElement: '[data-tour="word-popup"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="quran-page"]',
    title: 'Now Tap Another Word',
    description: '<strong>Click a different word</strong> to see the letter and haraka options.',
    side: 'left',
    type: 'interactive',
    interactiveTarget: '[data-tour="quran-page"]',
    waitForElement: '[data-tour="word-popup"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="letter-mistakes"]',
    title: 'Letter Mistakes',
    description: 'These are the <strong>individual letters</strong>. Click any letter to mark it as a mistake — the student read the wrong letter. <strong>Click any letter.</strong>',
    side: 'left',
    type: 'interactive',
    interactiveTarget: '[data-tour="letter-mistakes"]',
    waitForElement: '[data-tour="letter-mistakes"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="quran-page"]',
    title: 'One More Word',
    description: '<strong>Click another word</strong> to see haraka mistakes.',
    side: 'left',
    type: 'interactive',
    interactiveTarget: '[data-tour="quran-page"]',
    waitForElement: '[data-tour="word-popup"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="haraka-mistakes"]',
    title: 'Haraka Mistakes',
    description: 'These are the <strong>diacritical marks</strong> (tashkeel). Notice they look different from letter mistakes — the haraka sits above or below a placeholder line. <strong>Click any haraka.</strong>',
    side: 'left',
    type: 'interactive',
    interactiveTarget: '[data-tour="haraka-mistakes"]',
    waitForElement: '[data-tour="haraka-mistakes"]',
  },

  // ── PHASE 5: CLASSROOM — MISTAKES AREA ──
  {
    screen: 'classroom',
    element: '[data-tour="mistakes-area"]',
    title: 'Mistakes Area',
    description: 'All your mistakes appear here, grouped by class session. You can scroll down to see them.',
    side: 'top',
    type: 'info',
  },
  {
    screen: 'classroom',
    element: '[data-tour="page-all-toggle"]',
    title: 'Page / All Toggle',
    description: 'This toggles between <strong>current page</strong> mistakes and <strong>all assignment</strong> mistakes. <strong>Click it to toggle.</strong>',
    side: 'top',
    type: 'interactive',
    interactiveTarget: '[data-tour="page-all-toggle"]',
  },

  // ── PHASE 6: CLASSROOM — NOTES & PERFORMANCE ──
  {
    screen: 'classroom',
    element: '[data-tour="notes-btn"]',
    title: 'Session Notes',
    description: 'Add notes about this session — observations or feedback. <strong>Click to open the notes editor.</strong>',
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="notes-btn"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="notes-textarea"]',
    title: 'Write a Note',
    description: '<strong>Type anything</strong> in the notes field to try it out.',
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="notes-textarea"]',
    waitForElement: '[data-tour="notes-textarea"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="save-notes-btn"]',
    title: 'Save Notes',
    description: '<strong>Click Save Notes</strong> to save your note.',
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="save-notes-btn"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="performance-dropdown"]',
    title: 'Performance Rating',
    description: "Rate the student's performance for this session — Excellent, Very Good, Good, or Needs Work. <strong>Select any rating.</strong>",
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="performance-dropdown"]',
  },

  // ── PHASE 7: READER ──
  {
    screen: 'reader',
    element: '[data-tour="reader-page"]',
    title: 'Quran Reader',
    description: 'This is the standalone Quran Reader. Words with previous mistakes are highlighted for review.',
    side: 'bottom',
    type: 'info',
  },

  // ── PHASE 8: SETTINGS ──
  {
    screen: 'settings',
    element: '[data-tour="settings-section"]',
    title: 'Settings',
    description: 'Customize your experience — dark/light mode, Teacher/Student view, password, and updates. You can replay this tour anytime from the "Show Tutorial" button here.',
    side: 'bottom',
    type: 'info',
  },

  // ── PHASE 9: DELETE CLASS & FAREWELL ──
  {
    screen: 'classroom',
    element: '[data-tour="delete-btn"]',
    title: 'Delete This Class',
    description: "Let's clean up the class we just created. <strong>Click the Delete button.</strong>",
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="delete-btn"]',
    waitForElement: '[data-tour="delete-btn"]',
  },
  // Note: step 30 — the browser confirm() dialog is native; we show an info step BEFORE delete explaining it
  {
    screen: 'dashboard-final',
    title: "You're All Set!",
    description: "You've learned how to add students, create classes, track letter/haraka/word mistakes, manage notes and performance, and delete classes. A confirmation always appears before deleting — <strong>deleting a class permanently removes all its mistakes.</strong> Jazakumullahu Khairan!",
    type: 'info',
  },
];

// ── Tour persistence ──

const TOUR_COMPLETED_KEY = 'qurantrack:tour_completed';
const TOUR_CLASS_ID_KEY = 'qurantrack:tour_class_id';

export function isTourCompleted(): boolean {
  return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
}

export function markTourCompleted(): void {
  localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
}

export function resetTourCompleted(): void {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}

/** Store the class ID created during the tour (for cleanup if interrupted) */
export function setTourClassId(id: string): void {
  localStorage.setItem(TOUR_CLASS_ID_KEY, id);
}

export function getTourClassId(): string | null {
  return localStorage.getItem(TOUR_CLASS_ID_KEY);
}

export function clearTourClassId(): void {
  localStorage.removeItem(TOUR_CLASS_ID_KEY);
}

// ── driver.js helpers ──

export function createDriverStep(stepDef: TourStepDef): DriveStep {
  const step: DriveStep = {
    popover: {
      title: stepDef.title,
      description: stepDef.description,
      side: stepDef.side || 'bottom',
      align: 'center',
    },
  };
  if (stepDef.element) {
    step.element = stepDef.element;
  }
  return step;
}

export function getDriverConfig(isDarkMode: boolean): Partial<Config> {
  return {
    showProgress: false,
    allowClose: false,
    overlayColor: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.6)',
    stagePadding: 16,
    stageRadius: 12,
    popoverOffset: 12,
    animate: true,
    popoverClass: isDarkMode ? 'tour-popover-dark' : 'tour-popover-light',
  };
}

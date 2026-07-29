import { type DriveStep, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';

// ── Tour step definitions ──

export type StepType = 'info' | 'interactive';

export interface TourStepDef {
  screen: 'dashboard' | 'sessions' | 'classroom' | 'reader' | 'settings' | 'dashboard-final';
  element?: string; // data-tour selector, or undefined for full overlay
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  type: StepType; // 'info' = Next button, 'interactive' = must click target
  interactiveTarget?: string; // CSS selector for the clickable element (for interactive steps)
  waitForElement?: string; // Wait for this element to appear before showing step
  resultElement?: string; // Advance only after this result appears
  waitForPath?: string; // Wait for navigation to this path before advancing
  waitForPathPrefix?: string; // Wait for navigation to a dynamic path before advancing
}

export const TOUR_STEPS: TourStepDef[] = [
  // ── PHASE 1: WELCOME (Dashboard) ──
  {
    screen: 'dashboard',
    title: 'Welcome to QuranTrack!',
    description: 'This hands-on tour will walk you through creating your first session, tracking mistakes, and managing recitation. Follow along!',
    type: 'info',
  },
  {
    screen: 'dashboard',
    element: '[data-tour="add-student-btn"]',
    title: 'Add Contacts',
    description: 'Add contacts to your roster by searching their email. They must have a QuranTrack account first.',
    side: 'left',
    align: 'start',
    type: 'info',
    waitForElement: '[data-tour="add-student-btn"]',
  },
  {
    screen: 'dashboard',
    element: '[data-tour="start-class-btn"]',
    title: 'Start a Session',
    description: "Let's create your first listening session. <strong>Click this button.</strong>",
    side: 'left',
    align: 'start',
    type: 'interactive',
    interactiveTarget: '[data-tour="start-class-btn"]',
    waitForElement: '[data-tour="start-class-btn"]',
  },

  // ── PHASE 2: SESSION CREATION (Sessions modal) ──
  {
    screen: 'sessions',
    element: '[data-tour="class-date"]',
    title: 'Session Date',
    description: 'The date and day are auto-filled. You can change them if this session was on a different day.',
    side: 'bottom',
    type: 'info',
    waitForElement: '[data-tour="class-date"]',
  },
  {
    screen: 'sessions',
    element: '[data-tour="student-selector"]',
    title: 'Select Contacts',
    description: "Select contacts (reciters) from your roster. If you haven't added any yet, that's fine — you can skip this for now.",
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'sessions',
    element: '[data-tour="next-portions-btn"]',
    title: 'Continue to Portions',
    description: '<strong>Click "Next: Choose Portions"</strong> to configure what the reciter will recite.',
    side: 'left',
    align: 'end',
    type: 'interactive',
    interactiveTarget: '[data-tour="next-portions-btn"]',
  },
  {
    screen: 'sessions',
    element: '[data-tour="hifz-section"]',
    title: 'Memorization (Hifz)',
    description: 'This is the Memorization section. It\'s on by default. Each section lets you assign a Quran portion for the reciter.',
    side: 'bottom',
    type: 'info',
    waitForElement: '[data-tour="hifz-section"]',
  },
  {
    screen: 'sessions',
    element: '[data-tour="mode-by-surah"]',
    title: 'Selection Mode',
    description: 'Switch to <strong>By Surah</strong> so you can choose a surah and ayah range for this test session.',
    side: 'right',
    align: 'center',
    type: 'interactive',
    interactiveTarget: '[data-tour="mode-by-surah"]',
    waitForElement: '[data-tour="surah-selector"]',
  },
  {
    screen: 'sessions',
    element: '[data-tour="from-surah-selector"]',
    title: 'Choose a Starting Surah',
    description: 'Open <strong>From Surah</strong> and choose a different surah. The tour continues after the value changes.',
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="from-surah-selector"]',
    waitForElement: '[data-tour="from-surah-selector"]',
  },
  {
    screen: 'sessions',
    element: '[data-tour="ayah-range"]',
    title: 'Ayah Range',
    description: 'Set the start and end ayah. If you leave them as is, the full surah is used.',
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'sessions',
    element: '[data-tour="sabqi-toggle"]',
    title: 'Recent Review (Sabqi)',
    description: 'This section is optional and starts on. Leave it on for recent material, or use the switch to exclude it; then click Next.',
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'sessions',
    element: '[data-tour="manzil-toggle"]',
    title: 'Revision (Manzil)',
    description: 'This optional section also starts on. Leave it on for older revision material, or switch it off; then click Next.',
    side: 'bottom',
    type: 'info',
  },
  {
    screen: 'sessions',
    element: '[data-tour="create-class-btn"]',
    title: 'Start the Session',
    description: "You're ready! <strong>Click Start Session</strong> to begin.",
    side: 'left',
    align: 'center',
    type: 'interactive',
    interactiveTarget: '[data-tour="create-class-btn"]',
    waitForPathPrefix: '/sessions/',
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
    resultElement: '[data-tour="word-popup"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="word-popup"]',
    title: 'Word Mistake',
    description: 'This is a <strong>Whole Word Mistake</strong> — marks the entire word as incorrect. Use it when the reciter skips or misreads the whole word. <strong>Click "Whole Word" to mark it.</strong>',
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
    resultElement: '[data-tour="word-popup"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="letter-mistakes"]',
    title: 'Letter Mistakes',
    description: 'These are the <strong>individual letters</strong>. Click any letter to mark it as a mistake — the reciter read the wrong letter. <strong>Click any letter.</strong>',
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
    resultElement: '[data-tour="word-popup"]',
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
    description: 'All mistakes appear here, grouped by session. You can scroll down to see them.',
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
    title: 'Listener Notes (ملاحظات)',
    description: 'Add notes about this session — observations or feedback. <strong>Click to open the notes editor.</strong>',
    side: 'top',
    align: 'start',
    type: 'interactive',
    interactiveTarget: '[data-tour="notes-btn"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="notes-textarea"]',
    title: 'Write a Note',
    description: '<strong>Type anything</strong> in the notes field to try it out.',
    side: 'top',
    align: 'start',
    type: 'interactive',
    interactiveTarget: '[data-tour="notes-textarea"]',
    waitForElement: '[data-tour="notes-textarea"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="save-notes-btn"]',
    title: 'Save Notes',
    description: '<strong>Click Save Notes</strong> to save your note.',
    side: 'top',
    align: 'start',
    type: 'interactive',
    interactiveTarget: '[data-tour="save-notes-btn"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="performance-dropdown"]',
    title: 'Performance Rating',
    description: "Rate the reciter's performance for this session — Excellent, Very Good, Good, or Needs Work. <strong>Select any rating.</strong>",
    side: 'top',
    align: 'start',
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
    description: 'Customize your experience — dark/light mode, password, and updates. You can replay this tour anytime from the "Show Tutorial" button here.',
    side: 'bottom',
    type: 'info',
  },

  // ── PHASE 9: DELETE SESSION & FAREWELL ──
  {
    screen: 'classroom',
    element: '[data-tour="delete-btn"]',
    title: 'Delete Safely',
    description: 'Deleting a session permanently removes its mistakes. Click Next, then use Delete and confirm the Windows prompt to remove this tutorial session.',
    side: 'bottom',
    type: 'info',
    waitForElement: '[data-tour="delete-btn"]',
  },
  {
    screen: 'classroom',
    element: '[data-tour="delete-btn"]',
    title: 'Clean Up the Tutorial Session',
    description: '<strong>Click Delete, then confirm the prompt.</strong> The tour advances only after the session has actually closed.',
    side: 'bottom',
    type: 'interactive',
    interactiveTarget: '[data-tour="delete-btn"]',
    waitForElement: '[data-tour="delete-btn"]',
    waitForPath: '/sessions',
  },
  {
    screen: 'dashboard-final',
    title: "You're All Set!",
    description: "You've learned how to add contacts, create listening sessions, track letter/haraka/word mistakes, manage notes and performance, and delete sessions. A confirmation always appears before deleting — <strong>deleting a session permanently removes all its mistakes.</strong> Jazakumullahu Khairan!",
    type: 'info',
  },
];

// ── Tour persistence ──

const TOUR_COMPLETED_KEY = 'qurantrack:tour_completed';
const TOUR_AUTO_SHOWN_KEY = 'qurantrack:tour_auto_shown';
const TOUR_CLASS_ID_KEY = 'qurantrack:tour_class_id';

function getScopedKey(baseKey: string, userId?: string | null): string {
  return userId ? `${baseKey}:${userId}` : baseKey;
}

export function isTourCompleted(userId?: string | null): boolean {
  return localStorage.getItem(getScopedKey(TOUR_COMPLETED_KEY, userId)) === 'true';
}

export function markTourCompleted(userId?: string | null): void {
  localStorage.setItem(getScopedKey(TOUR_COMPLETED_KEY, userId), 'true');
}

export function hasTourBeenAutoShown(userId?: string | null): boolean {
  return (
    isTourCompleted(userId) ||
    localStorage.getItem(getScopedKey(TOUR_AUTO_SHOWN_KEY, userId)) === 'true'
  );
}

export function markTourAutoShown(userId?: string | null): void {
  localStorage.setItem(getScopedKey(TOUR_AUTO_SHOWN_KEY, userId), 'true');
}

export function resetTourCompleted(userId?: string | null): void {
  localStorage.removeItem(getScopedKey(TOUR_COMPLETED_KEY, userId));
}

/** Store the class ID created during the tour (for cleanup if interrupted) */
export function setTourClassId(id: string, userId?: string | null): void {
  localStorage.setItem(getScopedKey(TOUR_CLASS_ID_KEY, userId), id);
}

export function getTourClassId(userId?: string | null): string | null {
  return localStorage.getItem(getScopedKey(TOUR_CLASS_ID_KEY, userId));
}

export function clearTourClassId(userId?: string | null): void {
  localStorage.removeItem(getScopedKey(TOUR_CLASS_ID_KEY, userId));
}

// ── driver.js helpers ──

export function createDriverStep(stepDef: TourStepDef): DriveStep {
  const step: DriveStep = {
    popover: {
      title: stepDef.title,
      description: stepDef.description,
      side: stepDef.side || 'bottom',
      align: stepDef.align || 'center',
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

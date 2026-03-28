import { type DriveStep, type Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { createClass, deleteClass } from './supabase-api';

// ── Tour step definitions ──

export interface TourStepDef {
  screen: 'dashboard' | 'classroom' | 'reader' | 'settings' | 'dashboard-final';
  element?: string; // data-tour selector, or undefined for full overlay
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  onNext?: () => Promise<void>; // runs BEFORE advancing
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    screen: 'dashboard',
    title: 'Welcome to QuranTrack!',
    description: 'This quick tour will show you the core workflow — adding students, starting classes, and tracking Quran recitation mistakes.',
  },
  {
    screen: 'dashboard',
    element: '[data-tour="add-student-btn"]',
    title: 'Add Students',
    description: 'Add students to your roster by searching their email address. They must have a QuranTrack account first.',
    side: 'bottom',
  },
  {
    screen: 'dashboard',
    element: '[data-tour="start-class-btn"]',
    title: 'Start a Class',
    description: 'Start a new class session. Select students from your roster, then assign Quran portions for Hifz, Sabqi, or Revision.',
    side: 'bottom',
  },
  // Steps 3-5 are on Classroom (after demo class is created)
  {
    screen: 'classroom',
    element: '[data-tour="section-tabs"]',
    title: 'Section Tabs',
    description: 'Switch between Memorization (Hifz), Recent Review (Sabqi), and Revision (Manzil) sections. Each shows the assigned Quran portion.',
    side: 'bottom',
  },
  {
    screen: 'classroom',
    element: '[data-tour="quran-page"]',
    title: 'The Mushaf Page',
    description: 'This is the Quran page in authentic Madani Mushaf fonts. Tap any word to mark a mistake during the student\'s recitation.',
    side: 'right',
  },
  {
    screen: 'classroom',
    element: '[data-tour="mistakes-area"]',
    title: 'Mistake Tracking',
    description: 'Mistakes appear here, grouped by class session. Toggle between the current page or the full assignment view.',
    side: 'top',
  },
  // Step 6 on Reader
  {
    screen: 'reader',
    element: '[data-tour="reader-page"]',
    title: 'Quran Reader',
    description: 'Read the Quran anytime from this standalone reader. Words with previous mistakes are highlighted for easy review.',
    side: 'bottom',
  },
  // Step 7 on Settings
  {
    screen: 'settings',
    element: '[data-tour="settings-section"]',
    title: 'Settings & More',
    description: 'Customize your experience — dark/light mode, Teacher/Student view toggle, password changes, and app updates. You can replay this tour anytime from here.',
    side: 'bottom',
  },
  // Step 8 final overlay
  {
    screen: 'dashboard-final',
    title: "You're All Set!",
    description: 'The demo class has been cleaned up. Start adding your real students and begin tracking their progress. Jazakumullahu Khairan!',
  },
];

// ── Demo data management ──

const DEMO_CLASS_KEY = 'qurantrack:tour_demo_class_id';
const TOUR_COMPLETED_KEY = 'qurantrack:tour_completed';

export function isTourCompleted(): boolean {
  return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
}

export function markTourCompleted(): void {
  localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
}

export function resetTourCompleted(): void {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}

export async function createDemoClass(): Promise<string | null> {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const dayStr = today.toLocaleDateString('en-US', { weekday: 'long' });

    const result = await createClass({
      date: dateStr,
      day: dayStr,
      notes: '[Demo class — created by tutorial]',
      student_ids: [],
      assignments: [{
        type: 'hifz',
        start_surah: 67,
        end_surah: 67,
        start_ayah: 1,
        end_ayah: 10,
      }],
    });

    if (result?.id) {
      localStorage.setItem(DEMO_CLASS_KEY, result.id);
      return result.id;
    }
    return null;
  } catch (err) {
    console.error('Failed to create demo class:', err);
    return null;
  }
}

export async function cleanupDemoClass(): Promise<void> {
  const demoId = localStorage.getItem(DEMO_CLASS_KEY);
  if (!demoId) return;
  try {
    await deleteClass(demoId);
  } catch (err) {
    console.error('Failed to cleanup demo class:', err);
  } finally {
    localStorage.removeItem(DEMO_CLASS_KEY);
  }
}

/** Call on app load to clean up any orphaned demo class from a previous interrupted tour */
export async function cleanupOrphanedDemoClass(): Promise<void> {
  const demoId = localStorage.getItem(DEMO_CLASS_KEY);
  if (demoId) {
    console.log('Cleaning up orphaned demo class:', demoId);
    await cleanupDemoClass();
  }
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
    showProgress: true,
    allowClose: false, // We handle skip ourselves
    overlayColor: isDarkMode ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.6)',
    stagePadding: 10,
    stageRadius: 12,
    animate: true,
    popoverClass: isDarkMode ? 'tour-popover-dark' : 'tour-popover-light',
  };
}

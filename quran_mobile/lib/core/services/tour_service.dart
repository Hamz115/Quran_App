import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ── Tour step definition ──

class TourStepDef {
  final String screen; // 'dashboard', 'create-session', 'classroom', 'reader', 'settings', 'dashboard-final'
  final GlobalKey? targetKey;
  final String title;
  final String description;
  final ContentPosition position;
  /// When true, the tooltip hides the "Next" button — the user must interact
  /// with the highlighted target to advance.  The tour orchestrator waits on
  /// [TourService.waitForInteraction] which the target widget completes.
  final bool isInteractive;

  const TourStepDef({
    required this.screen,
    this.targetKey,
    required this.title,
    required this.description,
    this.position = ContentPosition.bottom,
    this.isInteractive = false,
  });
}

enum ContentPosition { top, bottom, left, right }

// ── Tour Service ──

class TourService {
  // SharedPreferences keys
  static const _tourCompletedKey = 'tour_completed';
  static const _tourClassIdKey = 'tour_class_id';

  // ── Runtime tour state ──
  static bool isTourActive = false;

  /// UUID of the session created during the tour (for classroom navigation).
  static String? tourClassId;

  /// Completer the tour orchestrator awaits; target widgets complete it.
  static Completer<void>? _interactionCompleter;

  /// Wait for the user to interact with the current target.
  static Future<void> waitForInteraction() {
    _interactionCompleter = Completer<void>();
    return _interactionCompleter!.future;
  }

  /// Called by target widgets when the user performs the required interaction.
  static void completeInteraction() {
    if (_interactionCompleter != null && !_interactionCompleter!.isCompleted) {
      _interactionCompleter!.complete();
    }
    _interactionCompleter = null;
  }

  // ── GlobalKey registry ──

  // Dashboard
  static final addContactKey = GlobalKey(debugLabel: 'tour-add-contact');
  static final startSessionKey = GlobalKey(debugLabel: 'tour-start-session');

  // Create-session modal
  static final studentSelectorKey = GlobalKey(debugLabel: 'tour-student-selector');
  static final portionsSectionKey = GlobalKey(debugLabel: 'tour-portions-section');
  static final createSessionKey = GlobalKey(debugLabel: 'tour-create-session');

  // Classroom
  static final sectionTabsKey = GlobalKey(debugLabel: 'tour-section-tabs');
  static final quranPageKey = GlobalKey(debugLabel: 'tour-quran-page');
  static final wholeWordKey = GlobalKey(debugLabel: 'tour-whole-word');
  static final letterMistakesKey = GlobalKey(debugLabel: 'tour-letter-mistakes');
  static final harakaMistakesKey = GlobalKey(debugLabel: 'tour-haraka-mistakes');
  static final mistakesAreaKey = GlobalKey(debugLabel: 'tour-mistakes-area');
  static final pageAllToggleKey = GlobalKey(debugLabel: 'tour-page-all-toggle');
  static final classroomSettingsKey = GlobalKey(debugLabel: 'tour-classroom-settings');
  static final notesButtonKey = GlobalKey(debugLabel: 'tour-notes-button');
  static final notesTextareaKey = GlobalKey(debugLabel: 'tour-notes-textarea');
  static final saveNotesKey = GlobalKey(debugLabel: 'tour-save-notes');
  static final performanceDropdownKey = GlobalKey(debugLabel: 'tour-performance-dropdown');

  // Reader & Settings
  static final readerPageKey = GlobalKey(debugLabel: 'tour-reader-page');
  static final settingsSectionKey = GlobalKey(debugLabel: 'tour-settings-section');

  // Callback for "Show Tutorial" in Settings to trigger tour restart
  static VoidCallback? onStartTour;

  // ── Tour step definitions — mirrors web tour structure ──

  static List<TourStepDef> get steps => [
    // ── Phase 1: Dashboard ──

    // 0 — Welcome overlay (full-screen, no target)
    const TourStepDef(
      screen: 'dashboard',
      title: 'Welcome to QuranTrack!',
      description:
          'This quick tour will show you the core workflow — adding contacts, '
          'starting listening sessions, and tracking Quran recitation mistakes.',
    ),

    // 1 — Add Contact button (info)
    TourStepDef(
      screen: 'dashboard',
      targetKey: addContactKey,
      title: 'Add Contacts',
      description:
          'Add contacts to your roster by searching their email address. '
          'They must have a QuranTrack account first.',
      position: ContentPosition.bottom,
    ),

    // 2 — Start Session (INTERACTIVE — user must tap the button)
    TourStepDef(
      screen: 'dashboard',
      targetKey: startSessionKey,
      title: 'Start a Session',
      description:
          'Tap the "New Session" button to create a listening session. '
          'You\'ll select a contact and assign Quran portions.',
      position: ContentPosition.bottom,
      isInteractive: true,
    ),

    // ── Phase 2: Session creation modal ──

    // 3 — Student selector (info)
    TourStepDef(
      screen: 'create-session',
      targetKey: studentSelectorKey,
      title: 'Select a Contact',
      description:
          'Choose a reciter from your contacts list. '
          'If you haven\'t added anyone yet, you can skip this for now — '
          'but a contact is required to create a session.',
      position: ContentPosition.bottom,
    ),

    // 4 — Portions section (info)
    TourStepDef(
      screen: 'create-session',
      targetKey: portionsSectionKey,
      title: 'Configure Portions',
      description:
          'Set up Hifz (new memorization), Sabqi (recent review), and '
          'Revision (manzil) portions. Choose by Surah, Page, or Juz.',
      position: ContentPosition.top,
    ),

    // 5 — Create Session button (INTERACTIVE — user must tap)
    TourStepDef(
      screen: 'create-session',
      targetKey: createSessionKey,
      title: 'Create the Session',
      description:
          'Once you\'ve selected a contact and configured portions, '
          'tap "Create Class" to start the session.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // ── Phase 3: Classroom ──

    // 6 — Section tabs
    TourStepDef(
      screen: 'classroom',
      targetKey: sectionTabsKey,
      title: 'Section Tabs',
      description:
          'Switch between Memorization (Hifz), Recent Review (Sabqi), '
          'and Revision (Manzil) sections. Each shows the assigned portion.',
      position: ContentPosition.bottom,
    ),

    // 7 — Quran page overview
    TourStepDef(
      screen: 'classroom',
      targetKey: quranPageKey,
      title: 'The Mushaf Page',
      description:
          'This is the Quran page in authentic Madani Mushaf fonts. '
          'Tap any word to mark a mistake during recitation.',
      position: ContentPosition.bottom,
    ),

    // 8 — Tap a word (INTERACTIVE)
    TourStepDef(
      screen: 'classroom',
      targetKey: quranPageKey,
      title: 'Try It — Tap a Word',
      description:
          'Tap any word on the page to open the mistake popup. '
          'This is how you mark mistakes during a live recitation.',
      position: ContentPosition.bottom,
      isInteractive: true,
    ),

    // 9 — Whole word mistake
    TourStepDef(
      screen: 'classroom',
      targetKey: wholeWordKey,
      title: 'Whole Word Mistake',
      description:
          'Use this when the entire word was read incorrectly. Tap the '
          'whole-word button now.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // 10 — Tap another word
    TourStepDef(
      screen: 'classroom',
      targetKey: quranPageKey,
      title: 'Now Tap Another Word',
      description:
          'Tap another word to see the letter and haraka mistake options.',
      position: ContentPosition.bottom,
      isInteractive: true,
    ),

    // 11 — Letter mistakes
    TourStepDef(
      screen: 'classroom',
      targetKey: letterMistakesKey,
      title: 'Letter Mistakes',
      description:
          'These are the individual letters. Tap any letter to mark it as '
          'a mistake.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // 12 — One more word
    TourStepDef(
      screen: 'classroom',
      targetKey: quranPageKey,
      title: 'One More Word',
      description:
          'Tap another word to try a haraka mistake.',
      position: ContentPosition.bottom,
      isInteractive: true,
    ),

    // 13 — Haraka mistakes
    TourStepDef(
      screen: 'classroom',
      targetKey: harakaMistakesKey,
      title: 'Haraka Mistakes',
      description:
          'These are the harakat (diacritical marks). Tap any haraka to '
          'mark it as a mistake.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // 14 — Mistakes area
    TourStepDef(
      screen: 'classroom',
      targetKey: mistakesAreaKey,
      title: 'Mistake Tracking',
      description:
          'Mistakes appear here, grouped by session. Toggle between '
          'the current page or the full assignment view.',
      position: ContentPosition.top,
    ),

    // 15 — Page / All toggle
    TourStepDef(
      screen: 'classroom',
      targetKey: pageAllToggleKey,
      title: 'Page / All Toggle',
      description:
          'Switch between current-page mistakes and all assignment mistakes '
          'by tapping this toggle.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // 16 — Open classroom controls
    TourStepDef(
      screen: 'classroom',
      targetKey: classroomSettingsKey,
      title: 'Session Controls',
      description:
          'Tap the settings button to open notes, performance, and other '
          'session controls.',
      position: ContentPosition.bottom,
      isInteractive: true,
    ),

    // 17 — Notes button
    TourStepDef(
      screen: 'classroom',
      targetKey: notesButtonKey,
      title: 'Listener Notes',
      description:
          'Tap here to open the notes editor for this session.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // 18 — Notes textarea
    TourStepDef(
      screen: 'classroom',
      targetKey: notesTextareaKey,
      title: 'Write a Note',
      description:
          'Type anything into the notes field to try it out.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // 19 — Save notes
    TourStepDef(
      screen: 'classroom',
      targetKey: saveNotesKey,
      title: 'Save Notes',
      description:
          'Tap Save Notes to store the note for this session.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // 20 — Performance dropdown
    TourStepDef(
      screen: 'classroom',
      targetKey: performanceDropdownKey,
      title: 'Performance Rating',
      description:
          'Choose any performance rating for this session.',
      position: ContentPosition.top,
      isInteractive: true,
    ),

    // ── Phase 4: Reader ──

    // 21 — Reader
    TourStepDef(
      screen: 'reader',
      targetKey: readerPageKey,
      title: 'Quran Reader',
      description:
          'Read the Quran anytime from this standalone reader. Words with '
          'previous mistakes are highlighted for easy review.',
      position: ContentPosition.bottom,
    ),

    // ── Phase 5: Settings ──

    // 22 — Settings
    TourStepDef(
      screen: 'settings',
      targetKey: settingsSectionKey,
      title: 'Settings & More',
      description:
          'Customize your experience — dark/light mode, password changes, '
          'and app updates. You can replay this tour anytime from here.',
      position: ContentPosition.bottom,
    ),

    // ── Phase 6: Farewell ──

    // 23 — Farewell overlay (full-screen)
    const TourStepDef(
      screen: 'dashboard-final',
      title: "You're All Set!",
      description:
          'Start adding your contacts and begin tracking their recitation. '
          'You can delete the session you just created from the Sessions tab. '
          'Jazakumullahu Khairan!',
    ),
  ];

  // ── SharedPreferences helpers ──

  static Future<bool> isTourCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_tourCompletedKey) ?? false;
  }

  static Future<void> markTourCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_tourCompletedKey, true);
  }

  static Future<void> resetTourCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tourCompletedKey);
  }

  // ── Tour class ID persistence (for interrupted-tour cleanup) ──

  static Future<void> saveTourClassId(String classId) async {
    tourClassId = classId;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tourClassIdKey, classId);
  }

  static Future<void> clearTourClassId() async {
    tourClassId = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tourClassIdKey);
  }

  /// Clean up any persisted tour class ID from a previous interrupted tour.
  static Future<void> cleanupOrphanedTourData() async {
    final prefs = await SharedPreferences.getInstance();
    // Clean up old int-based demo class ID if it exists
    if (prefs.containsKey('tour_demo_class_id')) {
      await prefs.remove('tour_demo_class_id');
    }
    // Clean up string-based tour class ID
    final storedId = prefs.getString(_tourClassIdKey);
    if (storedId != null) {
      debugPrint('[TourService] Cleaning up orphaned tour class ID: $storedId');
      await prefs.remove(_tourClassIdKey);
    }
    tourClassId = null;
  }
}

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../data/repositories/class_repository.dart';

// ── Tour step definition ──

class TourStepDef {
  final String screen; // 'dashboard', 'classroom', 'reader', 'settings', 'dashboard-final'
  final GlobalKey? targetKey;
  final String title;
  final String description;
  final ContentPosition position;

  const TourStepDef({
    required this.screen,
    this.targetKey,
    required this.title,
    required this.description,
    this.position = ContentPosition.bottom,
  });
}

enum ContentPosition { top, bottom, left, right }

// ── Tour Service ──

class TourService {
  // SharedPreferences keys
  static const _tourCompletedKey = 'tour_completed';
  static const _demoClassIdKey = 'tour_demo_class_id';

  // GlobalKey registry — static so screens can reference them
  static final addStudentKey = GlobalKey(debugLabel: 'tour-add-student');
  static final startClassKey = GlobalKey(debugLabel: 'tour-start-class');
  static final sectionTabsKey = GlobalKey(debugLabel: 'tour-section-tabs');
  static final quranPageKey = GlobalKey(debugLabel: 'tour-quran-page');
  static final mistakesAreaKey = GlobalKey(debugLabel: 'tour-mistakes-area');
  static final readerPageKey = GlobalKey(debugLabel: 'tour-reader-page');
  static final settingsSectionKey = GlobalKey(debugLabel: 'tour-settings-section');

  // Callback for "Show Tutorial" in Settings to trigger tour restart
  static VoidCallback? onStartTour;

  // ── Tour step definitions (same text as web tour.ts) ──

  static List<TourStepDef> get steps => [
    // Step 0: Welcome overlay (no target)
    TourStepDef(
      screen: 'dashboard',
      title: 'Welcome to QuranTrack!',
      description:
          'This quick tour will show you the core workflow — adding students, starting classes, and tracking Quran recitation mistakes.',
    ),
    // Step 1: Add Student button
    TourStepDef(
      screen: 'dashboard',
      targetKey: addStudentKey,
      title: 'Add Students',
      description:
          'Add students to your roster by searching their email address. They must have a QuranTrack account first.',
      position: ContentPosition.bottom,
    ),
    // Step 2: Start Class button
    TourStepDef(
      screen: 'dashboard',
      targetKey: startClassKey,
      title: 'Start a Class',
      description:
          'Start a new class session. Select students from your roster, then assign Quran portions for Hifz, Sabqi, or Revision.',
      position: ContentPosition.bottom,
    ),
    // Step 3: Section tabs (Classroom)
    TourStepDef(
      screen: 'classroom',
      targetKey: sectionTabsKey,
      title: 'Section Tabs',
      description:
          'Switch between Memorization (Hifz), Recent Review (Sabqi), and Revision (Manzil) sections. Each shows the assigned Quran portion.',
      position: ContentPosition.bottom,
    ),
    // Step 4: Quran page (Classroom)
    TourStepDef(
      screen: 'classroom',
      targetKey: quranPageKey,
      title: 'The Mushaf Page',
      description:
          "This is the Quran page in authentic Madani Mushaf fonts. Tap any word to mark a mistake during the student's recitation.",
      position: ContentPosition.bottom,
    ),
    // Step 5: Mistakes area (Classroom)
    TourStepDef(
      screen: 'classroom',
      targetKey: mistakesAreaKey,
      title: 'Mistake Tracking',
      description:
          'Mistakes appear here, grouped by class session. Toggle between the current page or the full assignment view.',
      position: ContentPosition.top,
    ),
    // Step 6: Reader
    TourStepDef(
      screen: 'reader',
      targetKey: readerPageKey,
      title: 'Quran Reader',
      description:
          'Read the Quran anytime from this standalone reader. Words with previous mistakes are highlighted for easy review.',
      position: ContentPosition.bottom,
    ),
    // Step 7: Settings
    TourStepDef(
      screen: 'settings',
      targetKey: settingsSectionKey,
      title: 'Settings & More',
      description:
          'Customize your experience — dark/light mode, Teacher/Student view toggle, password changes, and app updates. You can replay this tour anytime from here.',
      position: ContentPosition.bottom,
    ),
    // Step 8: Farewell overlay (no target)
    TourStepDef(
      screen: 'dashboard-final',
      title: "You're All Set!",
      description:
          'The demo class has been cleaned up. Start adding your real students and begin tracking their progress. Jazakumullahu Khairan!',
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

  // ── Demo class management ──

  static Future<int?> createDemoClass(String teacherId) async {
    try {
      final repo = ClassRepository();
      final now = DateTime.now();
      final dateStr =
          '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
      final days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      final dayStr = days[now.weekday - 1];

      final classSession = await repo.createClass(
        date: dateStr,
        day: dayStr,
        notes: '[Demo class — created by tutorial]',
        teacherId: teacherId,
        assignments: [
          {
            'type': 'hifz',
            'start_surah': 67,
            'end_surah': 67,
            'start_ayah': 1,
            'end_ayah': 10,
          }
        ],
      );

      // Store ID for cleanup
      final id = classSession.id;
      if (id == null) return null;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_demoClassIdKey, id);
      return id;
    } catch (e) {
      debugPrint('[TourService] Failed to create demo class: $e');
      return null;
    }
  }

  static Future<void> cleanupDemoClass() async {
    final prefs = await SharedPreferences.getInstance();
    final demoId = prefs.getInt(_demoClassIdKey);
    if (demoId == null) return;

    try {
      final repo = ClassRepository();
      await repo.deleteClass(demoId);
    } catch (e) {
      debugPrint('[TourService] Failed to cleanup demo class: $e');
    } finally {
      await prefs.remove(_demoClassIdKey);
    }
  }

  /// Call on app load to clean up any orphaned demo class from a previous interrupted tour
  static Future<void> cleanupOrphanedDemoClass() async {
    final prefs = await SharedPreferences.getInstance();
    final demoId = prefs.getInt(_demoClassIdKey);
    if (demoId != null) {
      debugPrint('[TourService] Cleaning up orphaned demo class: $demoId');
      await cleanupDemoClass();
    }
  }
}

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tutorial_coach_mark/tutorial_coach_mark.dart';
import 'config/theme.dart';
import 'config/app_colors.dart';
import 'core/auth/supabase_config.dart';
import 'core/database/database_helper.dart';
import 'core/services/tour_service.dart';
import 'core/services/update_service.dart';
import 'core/sync/supabase_sync_helper.dart';
import 'presentation/providers/theme_provider.dart';
import 'presentation/providers/auth_provider.dart';
import 'presentation/providers/providers.dart';
import 'presentation/widgets/tour_tooltip.dart';
import 'presentation/widgets/premium_scaffold.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/dashboard/dashboard_screen.dart';
import 'presentation/screens/classes/classes_screen.dart';
import 'presentation/screens/classroom/classroom_screen.dart';
import 'presentation/screens/reader/quran_reader_screen.dart';
import 'presentation/screens/settings/settings_screen.dart';
import 'presentation/widgets/update_dialog.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase
  await SupabaseConfig.initialize();

  runApp(const ProviderScope(child: QuranLogbookApp()));
}

class QuranLogbookApp extends ConsumerWidget {
  const QuranLogbookApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDarkMode = ref.watch(themeProvider);
    final authState = ref.watch(authProvider);

    // Update system UI based on theme
    SystemChrome.setSystemUIOverlayStyle(
      SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: isDarkMode
            ? Brightness.light
            : Brightness.dark,
        systemNavigationBarColor: isDarkMode
            ? AppColors.night
            : AppColors.porcelain,
        systemNavigationBarIconBrightness: isDarkMode
            ? Brightness.light
            : Brightness.dark,
      ),
    );

    return MaterialApp(
      title: 'QuranTrack',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: isDarkMode ? ThemeMode.dark : ThemeMode.light,
      home: authState.isLoading
          ? _SplashScreen(isDarkMode: isDarkMode)
          : authState.isAuthenticated
          ? MainNavigation(key: ValueKey(authState.user?.id))
          : const LoginScreen(),
    );
  }
}

/// Splash screen shown while auth state is loading
class _SplashScreen extends StatelessWidget {
  final bool isDarkMode;

  const _SplashScreen({required this.isDarkMode});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background(isDarkMode),
      body: PremiumScaffoldBackground(
        useSafeArea: false,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 92,
                height: 92,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: Colors.white.withOpacity(0.18)),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.cyan600.withOpacity(0.28),
                      blurRadius: 28,
                      offset: const Offset(0, 14),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.menu_book_rounded,
                  color: Colors.white,
                  size: 46,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'QuranTrack',
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text(isDarkMode),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Memorization, recitation, and review',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary(isDarkMode),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.cyan500),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class MainNavigation extends ConsumerStatefulWidget {
  const MainNavigation({super.key});

  @override
  ConsumerState<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends ConsumerState<MainNavigation> {
  int _currentIndex = 0;
  SupabaseSyncHelper? _syncHelper;
  bool _initialSyncDone = false;
  bool _tourRunning = false;

  @override
  void initState() {
    super.initState();
    // Register the tour start callback so Settings can trigger it
    TourService.onStartTour = _startTour;
    // Auto-check for updates after a short delay to let the UI settle
    Future.delayed(const Duration(seconds: 2), _checkForUpdates);
    // Initialize local database and perform initial sync
    _initLocalFirst();
    // Cleanup any orphaned tour state from a previous interrupted tour
    TourService.cleanupOrphanedTourData();
  }

  @override
  void dispose() {
    TourService.onStartTour = null;
    _syncHelper?.dispose();
    super.dispose();
  }

  /// Initialize local SQLite database and perform first sync from Supabase.
  Future<void> _initLocalFirst() async {
    if (kIsWeb) return; // Only on mobile
    try {
      // Ensure local app database is initialized (triggers migrations)
      await DatabaseHelper.instance.appDatabase;

      // Clear local SQLite data from previous user to prevent data leakage
      final classRepo = ref.read(classRepositoryProvider);
      final mistakeRepo = ref.read(mistakeRepositoryProvider);
      await classRepo.clearAllLocal();
      await mistakeRepo.clearAllLocal();

      // Invalidate all data providers to clear stale data from previous user
      ref.invalidate(classesProvider);
      ref.invalidate(enrolledClassesProvider);
      ref.invalidate(statsProvider);
      ref.invalidate(topMistakesProvider);
      ref.invalidate(mistakeCountsBySurahProvider);
      ref.invalidate(teacherStudentsProvider);
      ref.invalidate(teacherClassDatesProvider);
      ref.invalidate(classStudentNamesProvider);
      ref.invalidate(mistakesProvider);

      // Get current user
      final authState = ref.read(authProvider);
      final user = authState.user;
      if (user == null) return;

      // Create sync helper
      _syncHelper = ref.read(supabaseSyncHelperProvider);

      // Pull all remote data to local SQLite (first load populates local DB)
      if (!_initialSyncDone) {
        _initialSyncDone = true;
        await _syncHelper!.pullAll(user.id);

        // Reload ALL providers from fresh local data after sync
        ref.invalidate(classesProvider);
        ref.invalidate(mistakesProvider);
        ref.invalidate(statsProvider);
        ref.invalidate(topMistakesProvider);
        ref.invalidate(mistakeCountsBySurahProvider);
        ref.invalidate(enrolledClassesProvider);
        ref.invalidate(teacherClassDatesProvider);
        ref.invalidate(classStudentNamesProvider);
      }

      // Start periodic sync (every 30 seconds)
      _syncHelper!.startPeriodicSync(user.id);

      // Auto-start tour on first launch
      final tourDone = await TourService.isTourCompleted();
      if (!tourDone && mounted) {
        Future.delayed(const Duration(milliseconds: 800), _startTour);
      }
    } catch (e) {
      debugPrint('[MainNavigation] _initLocalFirst error: $e');
      // Don't block app usage — local data is still available
    }
  }

  // ==================== TOUR ORCHESTRATION ====================

  void _switchTab(int index) {
    if (mounted) setState(() => _currentIndex = index);
  }

  Future<void> _startTour() async {
    if (_tourRunning || !mounted) return;
    _tourRunning = true;
    TourService.isTourActive = true;
    await TourService.clearTourClassId();

    // Ensure we start on Dashboard
    _switchTab(0);
    await Future.delayed(const Duration(milliseconds: 300));

    if (!mounted) return;
    final isDarkMode = ref.read(themeProvider);
    final steps = TourService.steps;

    // Phase 1: Dashboard — welcome, add contacts, start session (interactive)
    // Step 2 is interactive: user must tap "New Session" which opens the
    // create-session modal and calls TourService.completeInteraction().
    await _showTourSteps(steps, 0, 2, isDarkMode);
    if (!_tourRunning || !mounted) return;

    // Phase 2: Create-session modal (opened by the dashboard button tap)
    // Wait for the modal to render, then show steps inside it.
    // Step 5 is interactive: user must tap "Create Session" which creates
    // the session, stores its UUID via TourService.saveTourClassId(),
    // pops the modal, and pushes ClassroomScreen.
    await Future.delayed(const Duration(milliseconds: 600));
    if (!_tourRunning || !mounted) return;
    await _showTourSteps(steps, 3, 5, isDarkMode);
    if (!_tourRunning || !mounted) return;

    // Phase 3: Classroom — section tabs, Quran page, word tapping, mistakes,
    // notes, performance.  The ClassroomScreen was pushed by create_class_screen
    // after session creation, so it's already on top of the navigator stack.
    await Future.delayed(const Duration(milliseconds: 900));
    if (!_tourRunning || !mounted) return;
    await _showTourSteps(steps, 6, 20, isDarkMode);
    if (!_tourRunning || !mounted) return;

    // Close the session-controls sheet left open by the performance step,
    // then pop ClassroomScreen to return to the MainNavigation tabs.
    if (!mounted) return;
    final navigator = Navigator.of(context);
    for (var popCount = 0; popCount < 2 && mounted; popCount++) {
      if (!navigator.canPop()) break;
      navigator.pop();
      await Future.delayed(const Duration(milliseconds: 300));
    }

    // Phase 4: Reader
    _switchTab(2);
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    await _showTourSteps(steps, 21, 21, isDarkMode);
    if (!_tourRunning || !mounted) return;

    // Phase 5: Settings
    _switchTab(3);
    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    await _showTourSteps(steps, 22, 22, isDarkMode);
    if (!_tourRunning || !mounted) return;

    // Phase 6: Farewell on Dashboard
    _switchTab(0);
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    await _showTourSteps(steps, 23, 23, isDarkMode);

    await _cleanupTour();
  }

  /// Show tour steps [fromIndex..toIndex] one at a time using tutorial_coach_mark.
  /// Interactive steps wait for TourService.waitForInteraction() before advancing.
  Future<void> _showTourSteps(
    List<TourStepDef> allSteps,
    int fromIndex,
    int toIndex,
    bool isDarkMode,
  ) async {
    final totalSteps = allSteps.length;
    final screenSize = MediaQuery.of(context).size;

    for (int i = fromIndex; i <= toIndex; i++) {
      if (!_tourRunning || !mounted) return;

      final step = allSteps[i];
      final targetContext = step.targetKey?.currentContext;
      if (targetContext != null) {
        if (!targetContext.mounted) continue;
        await Scrollable.ensureVisible(
          targetContext,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          alignment: 0.5,
        );
        await Future.delayed(const Duration(milliseconds: 100));
        if (!_tourRunning || !mounted) return;
      }

      final isFullOverlay = step.targetKey == null;
      final customTargetPosition = _getCustomTargetPosition(
        step: step,
        isFullOverlay: isFullOverlay,
        screenSize: screenSize,
      );

      final completer = Completer<void>();
      final interactionFuture = step.isInteractive
          ? TourService.waitForInteraction()
          : null;
      dynamic coachController;

      final tutorial = TutorialCoachMark(
        targets: [
          TargetFocus(
            identify: 'step_$i',
            keyTarget: customTargetPosition != null
                ? null
                : (isFullOverlay ? null : step.targetKey),
            targetPosition:
                customTargetPosition ??
                (isFullOverlay
                    ? TargetPosition(screenSize, Offset.zero)
                    : null),
            shape: ShapeLightFocus.RRect,
            radius: isFullOverlay ? 0 : 8,
            paddingFocus: isFullOverlay ? 0 : 12,
            enableTargetTab: !step.isInteractive,
            contents: [
              _buildTargetContent(
                step: step,
                stepIndex: i,
                totalSteps: totalSteps,
                isDarkMode: isDarkMode,
                isFullOverlay: isFullOverlay,
                screenSize: screenSize,
                onNext: () {
                  if (!completer.isCompleted) completer.complete();
                  coachController?.next();
                },
                onSkip: () {
                  _tourRunning = false;
                  if (!completer.isCompleted) completer.complete();
                  _cleanupTour();
                  // Pop any pushed routes (classroom, modals) to return to main tabs
                  if (mounted) {
                    while (Navigator.of(context).canPop()) {
                      Navigator.of(context).pop();
                    }
                    _switchTab(0);
                  }
                  coachController?.skip();
                },
                onControllerReady: (controller) {
                  coachController = controller;
                },
              ),
            ],
          ),
        ],
        colorShadow: isDarkMode
            ? const Color(0x80000000)
            : const Color(0x73000000),
        opacityShadow: 1.0,
        hideSkip: true,
        onFinish: () {
          if (!completer.isCompleted) completer.complete();
        },
        onSkip: () {
          _tourRunning = false;
          if (!completer.isCompleted) completer.complete();
          _cleanupTour();
          if (mounted) {
            while (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
            _switchTab(0);
          }
          return true;
        },
      );

      tutorial.show(context: context);

      await completer.future;
      if (!_tourRunning || !mounted) return;

      if (interactionFuture != null) {
        await interactionFuture;
        if (!_tourRunning || !mounted) return;
      }

      await Future.delayed(const Duration(milliseconds: 180));
    }
  }

  TargetPosition? _getCustomTargetPosition({
    required TourStepDef step,
    required bool isFullOverlay,
    required Size screenSize,
  }) {
    if (isFullOverlay) return null;

    final isDashboardActionStep =
        step.screen == 'dashboard' &&
        (step.targetKey == TourService.addContactKey ||
            step.targetKey == TourService.startSessionKey);

    if (isDashboardActionStep) {
      // Cover most of the screen so the dashboard stays visible behind the
      // spotlight instead of being dimmed to near-black.  Only a thin strip
      // at the very bottom (nav bar area) falls outside the spotlight.
      final width = screenSize.width;
      final height = screenSize.height * 0.82;
      return TargetPosition(Size(width, height), Offset.zero);
    }

    final isMistakeContextStep =
        step.targetKey == TourService.mistakesAreaKey ||
        step.targetKey == TourService.pageAllToggleKey;

    if (isMistakeContextStep) {
      // These controls sit at the end of a tall Mushaf scroll view. Keep the
      // entire mistakes panel visible so the toggle is not an isolated sliver.
      final height = screenSize.height * 0.32;
      return TargetPosition(
        Size(screenSize.width, height),
        Offset(0, screenSize.height - height),
      );
    }

    return null;
  }

  TargetContent _buildTargetContent({
    required TourStepDef step,
    required int stepIndex,
    required int totalSteps,
    required bool isDarkMode,
    required bool isFullOverlay,
    required Size screenSize,
    required VoidCallback onNext,
    required VoidCallback onSkip,
    required void Function(dynamic controller) onControllerReady,
  }) {
    final customPosition = _getCustomContentPosition(
      step: step,
      isFullOverlay: isFullOverlay,
      screenSize: screenSize,
    );

    return TargetContent(
      align: customPosition != null
          ? ContentAlign.custom
          : _getContentAlign(step.position),
      customPosition: customPosition,
      padding: EdgeInsets.zero,
      builder: (context, controller) {
        onControllerReady(controller);
        return TourTooltip(
          title: step.title,
          description: step.description,
          currentStep: stepIndex,
          totalSteps: totalSteps,
          isDarkMode: isDarkMode,
          isLastStep: stepIndex == totalSteps - 1,
          isInteractive: step.isInteractive,
          onNext: onNext,
          onSkip: onSkip,
        );
      },
    );
  }

  CustomTargetContentPosition? _getCustomContentPosition({
    required TourStepDef step,
    required bool isFullOverlay,
    required Size screenSize,
  }) {
    if (isFullOverlay) {
      return CustomTargetContentPosition(
        left: 0,
        right: 0,
        bottom: screenSize.height * 0.12,
      );
    }

    // For normal spotlight steps, pin the tooltip to the screen edge instead of
    // placing it directly next to the target. That keeps the surrounding screen
    // context visible instead of letting the tooltip cover the whole viewport and
    // making the app feel blank.
    switch (step.position) {
      case ContentPosition.bottom:
        return CustomTargetContentPosition(left: 0, right: 0, bottom: 96);
      case ContentPosition.top:
        return CustomTargetContentPosition(left: 0, right: 0, top: 96);
      case ContentPosition.left:
      case ContentPosition.right:
        return null;
    }
  }

  ContentAlign _getContentAlign(ContentPosition position) {
    switch (position) {
      case ContentPosition.top:
        return ContentAlign.top;
      case ContentPosition.bottom:
        return ContentAlign.bottom;
      case ContentPosition.left:
        return ContentAlign.left;
      case ContentPosition.right:
        return ContentAlign.right;
    }
  }

  Future<void> _cleanupTour() async {
    _tourRunning = false;
    TourService.isTourActive = false;
    await TourService.clearTourClassId();
    await TourService.markTourCompleted();
  }

  Future<void> _checkForUpdates() async {
    if (!mounted) return;
    try {
      final updateService = UpdateService();
      final updateInfo = await updateService.checkForUpdate();
      if (!mounted || !updateInfo.updateAvailable) return;
      final isDarkMode = ref.read(themeProvider);
      UpdateDialog.show(
        context,
        updateInfo: updateInfo,
        updateService: updateService,
        isDarkMode: isDarkMode,
      );
    } catch (_) {
      // Silently ignore — don't block app usage
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = ref.watch(themeProvider);

    // Unified screens — no role branching
    final screens = [
      const DashboardScreen(),
      const ClassesScreen(),
      const QuranReaderScreen(),
      const SettingsScreen(),
    ];

    // Unified nav items
    final navItems = [
      _NavItem(Icons.dashboard_rounded, 'Dashboard'),
      _NavItem(Icons.school_rounded, 'Sessions'),
      _NavItem(Icons.menu_book_rounded, 'Reader'),
      _NavItem(Icons.settings_rounded, 'Settings'),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: screens),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(14, 0, 14, 12),
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppColors.surface(
              isDarkMode,
            ).withOpacity(isDarkMode ? 0.94 : 0.98),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: AppColors.border(
                isDarkMode,
              ).withOpacity(isDarkMode ? 0.72 : 0.9),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(isDarkMode ? 0.42 : 0.12),
                blurRadius: 22,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: navItems.asMap().entries.map((entry) {
              return Expanded(
                child: _buildNavItem(
                  entry.key,
                  entry.value.icon,
                  entry.value.label,
                  isDarkMode,
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(
    int index,
    IconData icon,
    String label,
    bool isDarkMode,
  ) {
    final isSelected = _currentIndex == index;

    final accentColor = index == 1
        ? AppColors.teal500
        : index == 2
        ? AppColors.gold
        : AppColors.cyan500;
    final selectedColor = isDarkMode ? AppColors.cyan400 : AppColors.cyan600;
    final unselectedColor = AppColors.textMuted(isDarkMode);

    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 9),
        decoration: BoxDecoration(
          gradient: isSelected
              ? LinearGradient(
                  colors: [
                    accentColor.withOpacity(isDarkMode ? 0.34 : 0.20),
                    accentColor.withOpacity(isDarkMode ? 0.18 : 0.11),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: isSelected ? null : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
          border: isSelected
              ? Border.all(color: accentColor.withOpacity(0.22))
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? selectedColor : unselectedColor,
              size: isSelected ? 25 : 23,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                color: isSelected ? selectedColor : unselectedColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;

  const _NavItem(this.icon, this.label);
}

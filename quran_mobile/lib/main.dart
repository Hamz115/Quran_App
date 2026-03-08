import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'config/theme.dart';
import 'config/app_colors.dart';
import 'core/auth/supabase_config.dart';
import 'core/database/database_helper.dart';
import 'core/services/update_service.dart';
import 'core/sync/supabase_sync_helper.dart';
import 'presentation/providers/theme_provider.dart';
import 'presentation/providers/auth_provider.dart';
import 'presentation/providers/providers.dart';
import 'data/models/app_user.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/dashboard/dashboard_screen.dart';
import 'presentation/screens/classes/classes_screen.dart';
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
        statusBarIconBrightness: isDarkMode ? Brightness.light : Brightness.dark,
        systemNavigationBarColor: isDarkMode ? AppColors.darkBackground : AppColors.lightBackground,
        systemNavigationBarIconBrightness: isDarkMode ? Brightness.light : Brightness.dark,
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
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // App icon/logo placeholder
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.cyan500, AppColors.teal500],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.menu_book_rounded,
                color: Colors.white,
                size: 40,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'QuranTrack',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: AppColors.text(isDarkMode),
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

  @override
  void initState() {
    super.initState();
    // Auto-check for updates after a short delay to let the UI settle
    Future.delayed(const Duration(seconds: 2), _checkForUpdates);
    // Initialize local database and perform initial sync
    _initLocalFirst();
  }

  @override
  void dispose() {
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
        await _syncHelper!.pullAll(user.id, user.role.name);

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
      _syncHelper!.startPeriodicSync(user.id, user.role.name);
    } catch (e) {
      debugPrint('[MainNavigation] _initLocalFirst error: $e');
      // Don't block app usage — local data is still available
    }
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
    final authState = ref.watch(authProvider);
    final viewMode = ref.watch(viewModeProvider);
    final isTeacher = viewMode == UserRole.teacher;

    // Role-based screens
    final screens = [
      const DashboardScreen(),
      const ClassesScreen(),
      const QuranReaderScreen(),
      const SettingsScreen(),
    ];

    // Role-based nav items
    final navItems = isTeacher
        ? [
            _NavItem(Icons.dashboard_rounded, 'Dashboard'),
            _NavItem(Icons.school_rounded, 'Classes'),
            _NavItem(Icons.menu_book_rounded, 'Reader'),
            _NavItem(Icons.settings_rounded, 'Settings'),
          ]
        : [
            _NavItem(Icons.dashboard_rounded, 'My Progress'),
            _NavItem(Icons.school_rounded, 'My Classes'),
            _NavItem(Icons.menu_book_rounded, 'Reader'),
            _NavItem(Icons.settings_rounded, 'Settings'),
          ];

    return Scaffold(
      body: Column(
        children: [
          // Role banner (visual indicator of current view mode)
          _buildRoleBanner(isDarkMode, isTeacher, authState.user?.displayName ?? 'User'),
          // Main content
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: screens,
            ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface(isDarkMode),
          border: Border(
            top: BorderSide(
              color: AppColors.border(isDarkMode).withOpacity(0.5),
              width: 1,
            ),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: navItems.asMap().entries.map((entry) {
                return _buildNavItem(
                  entry.key,
                  entry.value.icon,
                  entry.value.label,
                  isDarkMode,
                  isTeacher,
                );
              }).toList(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleBanner(bool isDarkMode, bool isTeacher, String userName) {
    final Color bgColor;
    final Color textColor;
    final Color borderColor;
    final String message;
    final IconData icon;

    if (isTeacher) {
      bgColor = isDarkMode
          ? AppColors.cyan500.withOpacity(0.1)
          : AppColors.cyan50;
      textColor = isDarkMode ? AppColors.cyan400 : AppColors.cyan600;
      borderColor = isDarkMode
          ? AppColors.cyan500.withOpacity(0.2)
          : AppColors.cyan200;
      message = 'Teacher View';
      icon = Icons.school_rounded;
    } else {
      bgColor = isDarkMode
          ? AppColors.teal500.withOpacity(0.1)
          : const Color(0xFFF0FDFA); // teal-50
      textColor = isDarkMode ? AppColors.teal400 : AppColors.teal600;
      borderColor = isDarkMode
          ? AppColors.teal500.withOpacity(0.2)
          : const Color(0xFF99F6E4); // teal-200
      message = 'Student View';
      icon = Icons.person_rounded;
    }

    return Container(
      width: double.infinity,
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        bottom: 8,
        left: 16,
        right: 16,
      ),
      decoration: BoxDecoration(
        color: bgColor,
        border: Border(
          bottom: BorderSide(color: borderColor, width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 8),
          Text(
            message,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: textColor,
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '- Welcome, $userName',
            style: TextStyle(
              fontSize: 13,
              color: textColor.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label, bool isDarkMode, bool isTeacher) {
    final isSelected = _currentIndex == index;

    // Use cyan for teacher, teal for student
    final accentColor = isTeacher ? AppColors.cyan500 : AppColors.teal500;
    final selectedColor = isDarkMode
        ? (isTeacher ? AppColors.cyan400 : AppColors.teal400)
        : (isTeacher ? AppColors.cyan600 : AppColors.teal600);
    final unselectedColor = AppColors.textMuted(isDarkMode);
    final selectedBgColor = accentColor.withOpacity(0.15);

    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? selectedBgColor : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? selectedColor : unselectedColor,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
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

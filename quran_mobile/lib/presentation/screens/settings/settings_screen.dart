import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../../config/theme.dart';
import '../../../config/app_colors.dart';
import '../../../core/network/connectivity_service.dart';
import '../../../core/sync/sync_service.dart';
import '../../../core/services/update_service.dart';
import '../../providers/providers.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/update_dialog.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  String _appVersion = '';
  String _updateStatusText = '';
  bool _isCheckingUpdate = false;
  final UpdateService _updateService = UpdateService();

  @override
  void initState() {
    super.initState();
    _loadVersion();
  }

  Future<void> _loadVersion() async {
    final info = await PackageInfo.fromPlatform();
    if (mounted) {
      setState(() => _appVersion = info.version);
    }
  }

  Future<void> _checkForUpdates() async {
    setState(() {
      _isCheckingUpdate = true;
      _updateStatusText = 'Checking...';
    });

    try {
      final updateInfo = await _updateService.checkForUpdate();

      if (!mounted) return;

      if (updateInfo.updateAvailable) {
        setState(() {
          _isCheckingUpdate = false;
          _updateStatusText = '';
        });
        final isDarkMode = ref.read(themeProvider);
        await UpdateDialog.show(
          context,
          updateInfo: updateInfo,
          updateService: _updateService,
          isDarkMode: isDarkMode,
        );
      } else {
        setState(() {
          _isCheckingUpdate = false;
          _updateStatusText = 'Up to date!';
        });
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) setState(() => _updateStatusText = '');
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isCheckingUpdate = false;
          _updateStatusText = 'Check failed';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final syncState = ref.watch(syncStateProvider);
    final connectivity = ref.watch(connectivityStreamProvider);
    final isDarkMode = ref.watch(themeProvider);

    return Scaffold(
      backgroundColor: AppColors.background(isDarkMode),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Settings',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.text(isDarkMode),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Manage sync and app settings',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary(isDarkMode)),
              ),
              const SizedBox(height: 32),

              // Appearance Section
              Text(
                'APPEARANCE',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted(isDarkMode),
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),

              GlassmorphicCard(
                padding: const EdgeInsets.all(0),
                child: ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDarkMode
                          ? AppColors.cyan500.withOpacity(0.2)
                          : AppColors.cyan100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      isDarkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                      color: AppColors.cyan500,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    'Theme',
                    style: TextStyle(color: AppColors.text(isDarkMode)),
                  ),
                  subtitle: Text(
                    isDarkMode ? 'Dark mode' : 'Light mode',
                    style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                  ),
                  trailing: Switch(
                    value: isDarkMode,
                    onChanged: (_) => ref.read(themeProvider.notifier).toggleTheme(),
                    activeColor: AppColors.cyan500,
                    activeTrackColor: AppColors.cyan500.withOpacity(0.5),
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Sync Section
              Text(
                'SYNC',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted(isDarkMode),
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),

              GlassmorphicCard(
                padding: const EdgeInsets.all(0),
                child: Column(
                  children: [
                    // Connection status
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: connectivity.when(
                            data: (status) => status == NetworkStatus.online
                                ? AppTheme.emerald500.withOpacity(0.2)
                                : AppTheme.slate700,
                            loading: () => AppTheme.slate700,
                            error: (_, __) => AppTheme.error.withOpacity(0.2),
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          connectivity.when(
                            data: (status) => status == NetworkStatus.online
                                ? Icons.wifi_rounded
                                : Icons.wifi_off_rounded,
                            loading: () => Icons.wifi_rounded,
                            error: (_, __) => Icons.error_outline_rounded,
                          ),
                          color: connectivity.when(
                            data: (status) => status == NetworkStatus.online
                                ? AppTheme.emerald400
                                : AppTheme.slate400,
                            loading: () => AppTheme.slate400,
                            error: (_, __) => AppTheme.error,
                          ),
                          size: 20,
                        ),
                      ),
                      title: const Text(
                        'Connection Status',
                        style: TextStyle(color: AppTheme.slate200),
                      ),
                      subtitle: Text(
                        connectivity.when(
                          data: (status) => status == NetworkStatus.online ? 'Online' : 'Offline',
                          loading: () => 'Checking...',
                          error: (_, __) => 'Error',
                        ),
                        style: TextStyle(
                          color: connectivity.when(
                            data: (status) => status == NetworkStatus.online
                                ? AppTheme.emerald400
                                : AppTheme.slate500,
                            loading: () => AppTheme.slate500,
                            error: (_, __) => AppTheme.error,
                          ),
                        ),
                      ),
                    ),
                    Divider(color: AppTheme.slate700.withOpacity(0.5), height: 1),

                    // Sync status
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.slate700,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: syncState.when(
                          data: (state) {
                            if (state == SyncState.syncing) {
                              return const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppTheme.emerald400,
                                ),
                              );
                            }
                            return Icon(
                              state == SyncState.success
                                  ? Icons.cloud_done_rounded
                                  : state == SyncState.error
                                      ? Icons.cloud_off_rounded
                                      : Icons.cloud_sync_rounded,
                              color: state == SyncState.success
                                  ? AppTheme.emerald400
                                  : state == SyncState.error
                                      ? AppTheme.error
                                      : AppTheme.slate400,
                              size: 20,
                            );
                          },
                          loading: () => const Icon(Icons.cloud_sync_rounded, color: AppTheme.slate400, size: 20),
                          error: (_, __) => const Icon(Icons.cloud_off_rounded, color: AppTheme.error, size: 20),
                        ),
                      ),
                      title: const Text(
                        'Sync Status',
                        style: TextStyle(color: AppTheme.slate200),
                      ),
                      subtitle: Text(
                        syncState.when(
                          data: (state) {
                            switch (state) {
                              case SyncState.syncing:
                                return 'Syncing...';
                              case SyncState.success:
                                return 'All synced';
                              case SyncState.error:
                                return 'Sync failed';
                              default:
                                return 'Tap to sync';
                            }
                          },
                          loading: () => 'Checking...',
                          error: (_, __) => 'Error',
                        ),
                        style: const TextStyle(color: AppTheme.slate500),
                      ),
                      trailing: SizedBox(
                        width: 100,
                        child: ElevatedButton(
                          onPressed: () => ref.read(syncServiceProvider).sync(),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.emerald500,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          child: const Text('Sync Now'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Server Section
              const Text(
                'SERVER',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.slate500,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),

              GlassmorphicCard(
                padding: const EdgeInsets.all(0),
                child: Column(
                  children: [
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.slate700,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.dns_rounded, color: AppTheme.slate400, size: 20),
                      ),
                      title: const Text(
                        'Server URL',
                        style: TextStyle(color: AppTheme.slate200),
                      ),
                      subtitle: Text(
                        ref.watch(apiClientProvider).baseUrl,
                        style: const TextStyle(color: AppTheme.slate500, fontSize: 12),
                      ),
                      trailing: IconButton(
                        onPressed: () => _showServerUrlDialog(context),
                        icon: const Icon(Icons.edit_rounded, color: AppTheme.slate400),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // About Section
              const Text(
                'ABOUT',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.slate500,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),

              GlassmorphicCard(
                padding: const EdgeInsets.all(0),
                child: Column(
                  children: [
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.emerald500.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.menu_book_rounded, color: AppTheme.emerald400, size: 20),
                      ),
                      title: Text(
                        'QuranTrack',
                        style: TextStyle(color: AppColors.text(isDarkMode)),
                      ),
                      subtitle: Text(
                        _appVersion.isNotEmpty ? 'Version $_appVersion' : 'Loading...',
                        style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                      ),
                    ),
                    Divider(color: AppColors.border(isDarkMode).withOpacity(0.5), height: 1),
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isDarkMode
                              ? AppColors.cyan500.withOpacity(0.2)
                              : AppColors.cyan100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: _isCheckingUpdate
                            ? SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: AppColors.cyan500,
                                ),
                              )
                            : Icon(
                                Icons.system_update_rounded,
                                color: AppColors.cyan500,
                                size: 20,
                              ),
                      ),
                      title: Text(
                        'Check for Updates',
                        style: TextStyle(color: AppColors.text(isDarkMode)),
                      ),
                      subtitle: Text(
                        _updateStatusText.isNotEmpty
                            ? _updateStatusText
                            : 'Tap to check for new versions',
                        style: TextStyle(
                          color: _updateStatusText == 'Up to date!'
                              ? AppTheme.emerald400
                              : _updateStatusText == 'Check failed'
                                  ? AppColors.error
                                  : AppColors.textSecondary(isDarkMode),
                        ),
                      ),
                      trailing: SizedBox(
                        width: 100,
                        child: ElevatedButton(
                          onPressed: _isCheckingUpdate ? null : _checkForUpdates,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.cyan500,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          child: Text(_isCheckingUpdate ? 'Checking' : 'Check'),
                        ),
                      ),
                    ),
                    Divider(color: AppColors.border(isDarkMode).withOpacity(0.5), height: 1),
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: isDarkMode ? AppTheme.slate700 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.storage_rounded,
                          color: AppColors.textMuted(isDarkMode),
                          size: 20,
                        ),
                      ),
                      title: Text(
                        'Database',
                        style: TextStyle(color: AppColors.text(isDarkMode)),
                      ),
                      subtitle: Text(
                        'SQLite (Local + Sync)',
                        style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Account Section
              Text(
                'ACCOUNT',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted(isDarkMode),
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),

              GlassmorphicCard(
                padding: const EdgeInsets.all(0),
                child: Column(
                  children: [
                    // User info
                    Consumer(
                      builder: (context, ref, child) {
                        final authState = ref.watch(authProvider);
                        final user = authState.user;
                        return ListTile(
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDarkMode
                                  ? AppColors.cyan500.withOpacity(0.2)
                                  : AppColors.cyan100,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(
                              Icons.person_rounded,
                              color: AppColors.cyan500,
                              size: 20,
                            ),
                          ),
                          title: Text(
                            user?.email ?? 'Not signed in',
                            style: TextStyle(color: AppColors.text(isDarkMode)),
                          ),
                          subtitle: Text(
                            user?.role.name.toUpperCase() ?? '',
                            style: TextStyle(
                              color: user?.role.name == 'teacher'
                                  ? AppColors.cyan500
                                  : AppColors.teal500,
                              fontWeight: FontWeight.w600,
                              fontSize: 11,
                            ),
                          ),
                        );
                      },
                    ),
                    Divider(color: AppColors.border(isDarkMode).withOpacity(0.5), height: 1),
                    // Logout button
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.error.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          Icons.logout_rounded,
                          color: AppColors.error,
                          size: 20,
                        ),
                      ),
                      title: Text(
                        'Sign Out',
                        style: TextStyle(color: AppColors.text(isDarkMode)),
                      ),
                      subtitle: Text(
                        'Sign out of your account',
                        style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                      ),
                      trailing: SizedBox(
                        width: 100,
                        child: ElevatedButton(
                          onPressed: () => _showSignOutDialog(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.error,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          child: const Text('Sign Out'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Danger Zone Section
              Text(
                'DANGER ZONE',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.error,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),

              GlassmorphicCard(
                padding: const EdgeInsets.all(0),
                child: Column(
                  children: [
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.error.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.delete_forever_rounded, color: AppTheme.error, size: 20),
                      ),
                      title: const Text(
                        'Delete All Mistakes',
                        style: TextStyle(color: AppTheme.slate200),
                      ),
                      subtitle: const Text(
                        'Remove all tracked mistakes',
                        style: TextStyle(color: AppTheme.slate500),
                      ),
                      trailing: SizedBox(
                        width: 100,
                        child: ElevatedButton(
                          onPressed: () => _showDeleteAllMistakesDialog(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.error,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          child: const Text('Delete All'),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  void _showDeleteAllMistakesDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.slate800,
        title: const Text('Delete All Mistakes?', style: TextStyle(color: AppTheme.error)),
        content: const Text(
          'This will permanently delete ALL tracked mistakes. This action cannot be undone.',
          style: TextStyle(color: AppTheme.slate300),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              ref.read(mistakesProvider.notifier).deleteAllMistakes();
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('All mistakes deleted')),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Delete All'),
          ),
        ],
      ),
    );
  }

  void _showServerUrlDialog(BuildContext context) {
    final currentUrl = ref.read(apiClientProvider).baseUrl;
    final controller = TextEditingController(text: currentUrl);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.slate800,
        title: const Text('Server URL'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'http://192.168.x.x:8000/api',
            labelText: 'URL',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              await ref.read(apiClientProvider).setBaseUrl(controller.text);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Server URL updated to: ${controller.text}')),
              );
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showSignOutDialog(BuildContext context) {
    final isDarkMode = ref.read(themeProvider);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface(isDarkMode),
        title: Text(
          'Sign Out?',
          style: TextStyle(color: AppColors.text(isDarkMode)),
        ),
        content: Text(
          'Are you sure you want to sign out of your account?',
          style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(authProvider.notifier).signOut();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
  }
}

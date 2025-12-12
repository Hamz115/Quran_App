import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../core/network/connectivity_service.dart';
import '../../../core/sync/sync_service.dart';
import '../../providers/providers.dart';
import '../../widgets/glassmorphic_card.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final syncState = ref.watch(syncStateProvider);
    final connectivity = ref.watch(connectivityStreamProvider);

    return Scaffold(
      backgroundColor: AppTheme.slate900,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Settings',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.slate100,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Manage sync and app settings',
                style: TextStyle(fontSize: 14, color: AppTheme.slate400),
              ),
              const SizedBox(height: 32),

              // Sync Section
              const Text(
                'SYNC',
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
                      trailing: ElevatedButton(
                        onPressed: () => ref.read(syncServiceProvider).sync(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.emerald500,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        ),
                        child: const Text('Sync Now'),
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
                        onPressed: () => _showServerUrlDialog(context, ref),
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
                      title: const Text(
                        'Quran Logbook',
                        style: TextStyle(color: AppTheme.slate200),
                      ),
                      subtitle: const Text(
                        'Version 1.0.0',
                        style: TextStyle(color: AppTheme.slate500),
                      ),
                    ),
                    Divider(color: AppTheme.slate700.withOpacity(0.5), height: 1),
                    ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppTheme.slate700,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.storage_rounded, color: AppTheme.slate400, size: 20),
                      ),
                      title: const Text(
                        'Database',
                        style: TextStyle(color: AppTheme.slate200),
                      ),
                      subtitle: const Text(
                        'SQLite (Local + Sync)',
                        style: TextStyle(color: AppTheme.slate500),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Danger Zone Section
              const Text(
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
                      trailing: ElevatedButton(
                        onPressed: () => _showDeleteAllMistakesDialog(context, ref),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.error,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        ),
                        child: const Text('Delete All'),
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

  void _showDeleteAllMistakesDialog(BuildContext context, WidgetRef ref) {
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

  void _showServerUrlDialog(BuildContext context, WidgetRef ref) {
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
}

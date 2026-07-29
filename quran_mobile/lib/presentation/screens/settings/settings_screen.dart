import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../config/app_colors.dart';
import '../../../core/services/tour_service.dart';
import '../../../core/services/update_service.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/approved_ui.dart';
import '../../widgets/update_dialog.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _updateService = UpdateService();
  String _version = '';
  bool _checkingUpdate = false;
  bool _keepAwake = true;
  bool _readerControls = true;
  bool _sessionReminders = true;
  bool _weeklySummary = true;

  @override
  void initState() {
    super.initState();
    PackageInfo.fromPlatform().then((info) {
      if (mounted) setState(() => _version = info.version);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final user = auth.user;
    final dark = ref.watch(themeProvider);
    final name = user?.fullName ?? 'QuranTrack User';
    return Scaffold(
      backgroundColor: AppColors.ivory,
      body: Column(
        children: [
          ApprovedBrandHeader(initials: _initials(name)),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
              children: [
                Text(
                  'Settings',
                  style: Theme.of(context).textTheme.headlineLarge,
                ),
                const SizedBox(height: 14),
                ApprovedCard(
                  child: Row(
                    children: [
                      ApprovedInitialsAvatar(name: name, size: 62),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            Text(user?.email ?? 'Signed in'),
                            const Text('North Halaqah'),
                          ],
                        ),
                      ),
                      OutlinedButton.icon(
                        onPressed: _showEditProfile,
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        label: const Text('Edit'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _SettingsGroup(
                  icon: Icons.palette_outlined,
                  title: 'Appearance',
                  children: [
                    _ChoiceRow(
                      label: 'Theme',
                      choices: const ['Light', 'Dark'],
                      selected: dark ? 1 : 0,
                      onChanged: (value) {
                        if ((value == 1) != dark) {
                          ref.read(themeProvider.notifier).toggleTheme();
                        }
                      },
                    ),
                    const _ValueRow(label: 'Text size', value: 'Normal'),
                  ],
                ),
                const SizedBox(height: 14),
                _SettingsGroup(
                  icon: Icons.auto_stories_outlined,
                  title: 'Quran Reader',
                  children: [
                    const _ValueRow(label: 'Page layout', value: 'Mushaf'),
                    _SwitchRow(
                      label: 'Keep screen awake',
                      value: _keepAwake,
                      onChanged: (value) => setState(() => _keepAwake = value),
                    ),
                    _SwitchRow(
                      label: 'Show reading controls',
                      value: _readerControls,
                      onChanged: (value) =>
                          setState(() => _readerControls = value),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _SettingsGroup(
                  icon: Icons.sync,
                  title: 'Sync & Data',
                  children: [
                    _ActionRow(
                      label: 'All data up to date',
                      subtitle: 'Last synced just now',
                      actionLabel: _checkingUpdate ? 'Checking' : 'Sync now',
                      onPressed: _checkingUpdate ? null : _checkForUpdates,
                    ),
                    const _ValueRow(label: 'Offline Quran data', value: 'Ready'),
                  ],
                ),
                const SizedBox(height: 14),
                _SettingsGroup(
                  icon: Icons.notifications_none,
                  title: 'Notifications',
                  children: [
                    _SwitchRow(
                      label: 'Session reminders',
                      value: _sessionReminders,
                      onChanged: (value) =>
                          setState(() => _sessionReminders = value),
                    ),
                    _SwitchRow(
                      label: 'Weekly summary',
                      value: _weeklySummary,
                      onChanged: (value) =>
                          setState(() => _weeklySummary = value),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _SettingsGroup(
                  icon: Icons.shield_outlined,
                  title: 'Security',
                  children: [
                    _LinkRow(
                      label: 'Change password',
                      onTap: _showPasswordDialog,
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _SettingsGroup(
                  icon: Icons.help_outline,
                  title: 'Help',
                  children: [
                    _LinkRow(label: 'Tutorial', onTap: _restartTutorial),
                    _LinkRow(
                      label: 'About QuranTrack',
                      value: _version.isEmpty ? '' : 'v$_version',
                      onTap: _showAbout,
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                OutlinedButton.icon(
                  onPressed: _confirmSignOut,
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign out'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _checkForUpdates() async {
    setState(() => _checkingUpdate = true);
    try {
      final update = await _updateService.checkForUpdate();
      if (!mounted) return;
      if (update.updateAvailable) {
        await UpdateDialog.show(
          context,
          updateInfo: update,
          updateService: _updateService,
          isDarkMode: ref.read(themeProvider),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('QuranTrack is up to date.')),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Update check failed. Try again later.')),
        );
      }
    } finally {
      if (mounted) setState(() => _checkingUpdate = false);
    }
  }

  Future<void> _showEditProfile() async {
    final user = ref.read(authProvider).user;
    final parts = (user?.fullName ?? '').split(' ');
    final first = TextEditingController(text: parts.firstOrNull ?? '');
    final last = TextEditingController(
      text: parts.length > 1 ? parts.skip(1).join(' ') : '',
    );
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Edit profile'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: first,
              decoration: const InputDecoration(labelText: 'First name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: last,
              decoration: const InputDecoration(labelText: 'Last name'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              await ref.read(authProvider.notifier).updateProfile(
                    firstName: first.text.trim(),
                    lastName: last.text.trim(),
                  );
              if (dialogContext.mounted) Navigator.pop(dialogContext);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    first.dispose();
    last.dispose();
  }

  Future<void> _showPasswordDialog() async {
    final password = TextEditingController();
    final confirm = TextEditingController();
    String? error;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Change password'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'New password'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: confirm,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Confirm password',
                  errorText: error,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (password.text.length < 8 ||
                    password.text != confirm.text) {
                  setDialogState(
                    () => error = password.text.length < 8
                        ? 'Use at least 8 characters'
                        : 'Passwords do not match',
                  );
                  return;
                }
                await ref
                    .read(authProvider.notifier)
                    .updatePassword(password.text);
                if (dialogContext.mounted) Navigator.pop(dialogContext);
              },
              child: const Text('Update'),
            ),
          ],
        ),
      ),
    );
    password.dispose();
    confirm.dispose();
  }

  Future<void> _restartTutorial() async {
    await TourService.resetTourCompleted();
    TourService.onStartTour?.call();
  }

  void _showAbout() {
    showAboutDialog(
      context: context,
      applicationName: 'QuranTrack',
      applicationVersion: _version,
      applicationLegalese: 'Teach • Track • Transform',
    );
  }

  Future<void> _confirmSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('Your synced and offline Quran data will remain.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (confirmed == true) await ref.read(authProvider.notifier).signOut();
  }

  static String _initials(String value) => value
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .take(2)
      .map((part) => part[0])
      .join()
      .toUpperCase();
}

class _SettingsGroup extends StatelessWidget {
  final IconData icon;
  final String title;
  final List<Widget> children;

  const _SettingsGroup({
    required this.icon,
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return ApprovedCard(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
      child: Column(
        children: [
          ApprovedSectionTitle(icon: icon, title: title),
          const SizedBox(height: 8),
          ...children,
        ],
      ),
    );
  }
}

class _SwitchRow extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _SwitchRow({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      trailing: Switch(value: value, onChanged: onChanged),
    );
  }
}

class _ValueRow extends StatelessWidget {
  final String label;
  final String value;

  const _ValueRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(value),
          const SizedBox(width: 5),
          const Icon(Icons.chevron_right, size: 19),
        ],
      ),
    );
  }
}

class _LinkRow extends StatelessWidget {
  final String label;
  final String? value;
  final VoidCallback onTap;

  const _LinkRow({required this.label, this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(label),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (value != null) Text(value!),
          const Icon(Icons.chevron_right, size: 19),
        ],
      ),
      onTap: onTap,
    );
  }
}

class _ActionRow extends StatelessWidget {
  final String label;
  final String subtitle;
  final String actionLabel;
  final VoidCallback? onPressed;

  const _ActionRow({
    required this.label,
    required this.subtitle,
    required this.actionLabel,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: const Icon(Icons.check_circle, color: AppColors.emerald),
      title: Text(label),
      subtitle: Text(subtitle),
      trailing: ElevatedButton(onPressed: onPressed, child: Text(actionLabel)),
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  final String label;
  final List<String> choices;
  final int selected;
  final ValueChanged<int> onChanged;

  const _ChoiceRow({
    required this.label,
    required this.choices,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Expanded(child: Text(label)),
          SegmentedButton<int>(
            segments: List.generate(
              choices.length,
              (index) => ButtonSegment(
                value: index,
                label: Text(choices[index]),
              ),
            ),
            selected: {selected},
            onSelectionChanged: (value) => onChanged(value.first),
          ),
        ],
      ),
    );
  }
}

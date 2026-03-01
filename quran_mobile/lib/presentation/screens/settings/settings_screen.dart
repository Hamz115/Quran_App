import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../../../config/app_colors.dart';
import '../../../core/services/update_service.dart';
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

  // Change password state
  bool _showPasswordForm = false;
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _passwordLoading = false;
  String? _passwordError;
  bool _passwordSuccess = false;

  @override
  void initState() {
    super.initState();
    _loadVersion();
  }

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
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

  Future<void> _handlePasswordChange() async {
    final newPassword = _newPasswordController.text.trim();
    final confirmPassword = _confirmPasswordController.text.trim();

    setState(() {
      _passwordError = null;
      _passwordSuccess = false;
    });

    if (newPassword != confirmPassword) {
      setState(() => _passwordError = 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setState(() => _passwordError = 'Password must be at least 8 characters');
      return;
    }

    setState(() => _passwordLoading = true);

    try {
      await ref.read(authProvider.notifier).updatePassword(newPassword);
      if (mounted) {
        setState(() {
          _passwordSuccess = true;
          _newPasswordController.clear();
          _confirmPasswordController.clear();
        });
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            setState(() {
              _passwordSuccess = false;
              _showPasswordForm = false;
            });
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _passwordError = e.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _passwordLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
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
                'Manage your account and app settings',
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary(isDarkMode)),
              ),
              const SizedBox(height: 32),

              // ── Appearance Section ──
              _sectionHeader('APPEARANCE', isDarkMode),
              const SizedBox(height: 12),

              GlassmorphicCard(
                padding: const EdgeInsets.all(0),
                child: ListTile(
                  leading: _iconBox(
                    isDarkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                    AppColors.cyan500,
                    isDarkMode,
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

              // ── About Section ──
              _sectionHeader('ABOUT', isDarkMode),
              const SizedBox(height: 12),

              GlassmorphicCard(
                padding: const EdgeInsets.all(0),
                child: Column(
                  children: [
                    ListTile(
                      leading: _iconBox(
                        Icons.menu_book_rounded,
                        AppColors.teal500,
                        isDarkMode,
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
                      leading: _isCheckingUpdate
                          ? _loadingIconBox(AppColors.cyan500, isDarkMode)
                          : _iconBox(Icons.system_update_rounded, AppColors.cyan500, isDarkMode),
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
                              ? AppColors.teal500
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
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // ── Account Section ──
              _sectionHeader('ACCOUNT', isDarkMode),
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
                          leading: _iconBox(
                            Icons.person_rounded,
                            AppColors.cyan500,
                            isDarkMode,
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

                    // Change Password toggle
                    ListTile(
                      leading: _iconBox(
                        Icons.lock_rounded,
                        Colors.purple,
                        isDarkMode,
                      ),
                      title: Text(
                        'Change Password',
                        style: TextStyle(color: AppColors.text(isDarkMode)),
                      ),
                      subtitle: Text(
                        _showPasswordForm ? 'Enter your new password below' : 'Tap to change your password',
                        style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                      ),
                      trailing: Icon(
                        _showPasswordForm ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                        color: AppColors.textSecondary(isDarkMode),
                      ),
                      onTap: () {
                        setState(() {
                          _showPasswordForm = !_showPasswordForm;
                          if (!_showPasswordForm) {
                            _newPasswordController.clear();
                            _confirmPasswordController.clear();
                            _passwordError = null;
                            _passwordSuccess = false;
                          }
                        });
                      },
                    ),

                    // Collapsible password form
                    if (_showPasswordForm) ...[
                      Divider(color: AppColors.border(isDarkMode).withOpacity(0.5), height: 1),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_passwordError != null)
                              Container(
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: AppColors.error.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.error.withOpacity(0.3)),
                                ),
                                child: Text(
                                  _passwordError!,
                                  style: TextStyle(color: AppColors.error, fontSize: 13),
                                ),
                              ),
                            if (_passwordSuccess)
                              Container(
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: AppColors.teal500.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.teal500.withOpacity(0.3)),
                                ),
                                child: Text(
                                  'Password changed successfully!',
                                  style: TextStyle(color: AppColors.teal500, fontSize: 13),
                                ),
                              ),
                            TextField(
                              controller: _newPasswordController,
                              obscureText: true,
                              style: TextStyle(color: AppColors.text(isDarkMode)),
                              decoration: InputDecoration(
                                labelText: 'New Password',
                                hintText: 'Enter new password (8+ characters)',
                                labelStyle: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                                hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide(color: AppColors.border(isDarkMode)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide(color: AppColors.cyan500),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _confirmPasswordController,
                              obscureText: true,
                              style: TextStyle(color: AppColors.text(isDarkMode)),
                              decoration: InputDecoration(
                                labelText: 'Confirm New Password',
                                hintText: 'Confirm new password',
                                labelStyle: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                                hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide(color: AppColors.border(isDarkMode)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide(color: AppColors.cyan500),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed: _passwordLoading ? null : _handlePasswordChange,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.cyan500,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                    child: _passwordLoading
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white,
                                            ),
                                          )
                                        : const Text('Update Password'),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                TextButton(
                                  onPressed: () {
                                    setState(() {
                                      _showPasswordForm = false;
                                      _newPasswordController.clear();
                                      _confirmPasswordController.clear();
                                      _passwordError = null;
                                      _passwordSuccess = false;
                                    });
                                  },
                                  child: Text(
                                    'Cancel',
                                    style: TextStyle(color: AppColors.textSecondary(isDarkMode)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],

                    Divider(color: AppColors.border(isDarkMode).withOpacity(0.5), height: 1),

                    // Sign out
                    ListTile(
                      leading: _iconBox(
                        Icons.logout_rounded,
                        AppColors.error,
                        isDarkMode,
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

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  // ── Helper widgets ──

  Widget _sectionHeader(String title, bool isDarkMode) {
    return Text(
      title,
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: AppColors.textMuted(isDarkMode),
        letterSpacing: 1,
      ),
    );
  }

  Widget _iconBox(IconData icon, Color color, bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(isDarkMode ? 0.2 : 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }

  Widget _loadingIconBox(Color color, bool isDarkMode) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(isDarkMode ? 0.2 : 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2, color: color),
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

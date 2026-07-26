import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/app_colors.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _emailSent = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleResetPassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await ref
          .read(authProvider.notifier)
          .resetPassword(_emailController.text.trim());
      setState(() => _emailSent = true);
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = ref.watch(themeProvider);

    return Scaffold(
      backgroundColor: AppColors.background(isDarkMode),
      body: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: AppColors.appBackgroundGradient(isDarkMode),
            ),
          ),

          // Main content
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const SizedBox(height: 60),

                  // Quran verse
                  _buildQuranVerse(isDarkMode),

                  const SizedBox(height: 32),

                  // Main card
                  Container(
                    constraints: const BoxConstraints(maxWidth: 400),
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: isDarkMode
                            ? [
                                AppColors.nightCard.withOpacity(0.98),
                                AppColors.nightSurface.withOpacity(0.96),
                              ]
                            : [Colors.white, AppColors.porcelain],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(
                        color: isDarkMode
                            ? AppColors.cyan500.withOpacity(0.2)
                            : AppColors.cyan200.withOpacity(0.5),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 30,
                          offset: const Offset(0, 16),
                        ),
                      ],
                    ),
                    child: _emailSent
                        ? _buildSuccessContent(isDarkMode)
                        : _buildForm(isDarkMode),
                  ),
                ],
              ),
            ),
          ),

          // Keep floating controls above the full-screen scroll view so they
          // remain reachable during hit testing.
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 16,
            child: _buildThemeToggle(isDarkMode),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 16,
            child: _buildBackButton(isDarkMode),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeToggle(bool isDarkMode) {
    return GestureDetector(
      onTap: () => ref.read(themeProvider.notifier).toggleTheme(),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDarkMode ? AppColors.cyan500.withOpacity(0.2) : Colors.white,
          shape: BoxShape.circle,
          border: Border.all(
            color: isDarkMode
                ? AppColors.cyan500.withOpacity(0.3)
                : AppColors.cyan200,
          ),
        ),
        child: Icon(
          isDarkMode ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
          color: isDarkMode ? AppColors.cyan400 : AppColors.cyan600,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildBackButton(bool isDarkMode) {
    return GestureDetector(
      onTap: () => Navigator.pop(context),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDarkMode ? AppColors.cyan500.withOpacity(0.2) : Colors.white,
          shape: BoxShape.circle,
          border: Border.all(
            color: isDarkMode
                ? AppColors.cyan500.withOpacity(0.3)
                : AppColors.cyan200,
          ),
        ),
        child: Icon(
          Icons.arrow_back_rounded,
          color: isDarkMode ? AppColors.cyan400 : AppColors.cyan600,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildQuranVerse(bool isDarkMode) {
    return Column(
      children: [
        Text(
          'إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ',
          style: GoogleFonts.amiri(
            fontSize: 22,
            color: isDarkMode ? AppColors.slate300 : AppColors.slate600,
          ),
          textDirection: TextDirection.rtl,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          '"This Quran guides to that which is most suitable" - Al-Isra 17:9',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.textSecondary(isDarkMode),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildForm(bool isDarkMode) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Icon
          Center(
            child: Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.lock_reset_rounded,
                color: Colors.white,
                size: 32,
              ),
            ),
          ),
          const SizedBox(height: 24),

          Center(
            child: Text(
              'Reset Password',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: AppColors.text(isDarkMode),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: Text(
              "Enter your email and we'll send you\na link to reset your password",
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary(isDarkMode),
              ),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 24),

          // Error message
          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDarkMode
                    ? Colors.red.withOpacity(0.1)
                    : Colors.red.withOpacity(0.05),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDarkMode
                      ? Colors.red.withOpacity(0.3)
                      : Colors.red.withOpacity(0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    color: isDarkMode ? Colors.red[400] : Colors.red[600],
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDarkMode ? Colors.red[400] : Colors.red[600],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Email field
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Please enter your email';
              }
              if (!value.contains('@')) {
                return 'Please enter a valid email';
              }
              return null;
            },
            style: TextStyle(fontSize: 15, color: AppColors.text(isDarkMode)),
            decoration: InputDecoration(
              hintText: 'E-mail',
              hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
              prefixIcon: Icon(
                Icons.email_outlined,
                color: AppColors.cyan500,
                size: 22,
              ),
              filled: true,
              fillColor: isDarkMode
                  ? const Color(0xFF252D3D)
                  : AppColors.cyan50.withOpacity(0.5),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDarkMode
                      ? AppColors.cyan500.withOpacity(0.2)
                      : AppColors.cyan200,
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDarkMode
                      ? AppColors.cyan500.withOpacity(0.2)
                      : AppColors.cyan200,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppColors.cyan500, width: 2),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.red),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 16,
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Submit button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleResetPassword,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.transparent,
                shadowColor: AppColors.cyan500.withOpacity(0.3),
                elevation: 8,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Ink(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppColors.cyan500, AppColors.teal500],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: _isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'SEND RESET LINK',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Back to login link
          Center(
            child: GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Text(
                'Back to Sign In',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.cyan500,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessContent(bool isDarkMode) {
    return Column(
      children: [
        // Success icon
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: AppColors.success.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.check_circle_rounded,
            color: AppColors.success,
            size: 48,
          ),
        ),
        const SizedBox(height: 24),

        Text(
          'Check Your Email',
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.text(isDarkMode),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'We have sent a password reset link to:',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textSecondary(isDarkMode),
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          _emailController.text,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.cyan500,
          ),
        ),
        const SizedBox(height: 24),
        Text(
          "Didn't receive the email?\nCheck your spam folder or try again.",
          style: TextStyle(
            fontSize: 13,
            color: AppColors.textMuted(isDarkMode),
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),

        // Back to login button
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              backgroundColor: Colors.transparent,
              shadowColor: AppColors.cyan500.withOpacity(0.3),
              elevation: 8,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Ink(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.cyan500, AppColors.teal500],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Container(
                alignment: Alignment.center,
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: const Text(
                  'BACK TO SIGN IN',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Try again link
        GestureDetector(
          onTap: () => setState(() => _emailSent = false),
          child: Text(
            'Try with different email',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.textSecondary(isDarkMode),
            ),
          ),
        ),
      ],
    );
  }
}

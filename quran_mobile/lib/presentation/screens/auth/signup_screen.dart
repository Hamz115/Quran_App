import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../config/app_colors.dart';
import '../../providers/theme_provider.dart';
import '../../providers/auth_provider.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  String? _error;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) return;

    if (_passwordController.text != _confirmPasswordController.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await ref
          .read(authProvider.notifier)
          .signUp(
            email: _emailController.text.trim(),
            password: _passwordController.text,
            firstName: _firstNameController.text.trim(),
            lastName: _lastNameController.text.trim(),
          );
      // Navigation happens automatically via auth state
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
    final screenSize = MediaQuery.of(context).size;
    final isLargeScreen = screenSize.width > 600;

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: AppColors.appBackgroundGradient(isDarkMode),
        ),
        child: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                AppColors.deepTeal.withOpacity(isDarkMode ? 0.38 : 0.10),
                Colors.black.withOpacity(isDarkMode ? 0.22 : 0.03),
              ],
            ),
          ),
          child: Stack(
            children: [
              // Theme toggle
              Positioned(
                top: MediaQuery.of(context).padding.top + 8,
                right: 16,
                child: _buildThemeToggle(isDarkMode),
              ),

              // Back button
              Positioned(
                top: MediaQuery.of(context).padding.top + 8,
                left: 16,
                child: _buildBackButton(isDarkMode),
              ),

              // Main content
              SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      const SizedBox(height: 40),

                      // Quran verse
                      _buildQuranVerse(isDarkMode),

                      const SizedBox(height: 24),

                      // Main card
                      Container(
                        constraints: BoxConstraints(
                          maxWidth: isLargeScreen ? 800 : double.infinity,
                        ),
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
                        child: isLargeScreen
                            ? _buildLargeScreenLayout(isDarkMode)
                            : _buildSmallScreenLayout(isDarkMode),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Text(
            'إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا',
            style: GoogleFonts.amiri(
              fontSize: 20,
              height: 1.8,
              color: AppColors.slate300,
            ),
            textDirection: TextDirection.rtl,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            '"Indeed, this Quran guides to that which is most suitable and gives good tidings to the believers who do righteous deeds that they will have a great reward." - Al-Isra 17:9',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.slate400,
              fontStyle: FontStyle.italic,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildLargeScreenLayout(bool isDarkMode) {
    return Row(
      children: [
        // Decorative side
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(30),
                bottomLeft: Radius.circular(30),
              ),
            ),
            child: _buildDecorativePanel(),
          ),
        ),
        // Form side
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(40),
            child: _buildForm(isDarkMode),
          ),
        ),
      ],
    );
  }

  Widget _buildSmallScreenLayout(bool isDarkMode) {
    return Column(
      children: [
        // Decorative header
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 32),
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(30),
              topRight: Radius.circular(30),
            ),
          ),
          child: _buildDecorativePanel(compact: true),
        ),
        // Form
        Padding(
          padding: const EdgeInsets.all(24),
          child: _buildForm(isDarkMode),
        ),
      ],
    );
  }

  Widget _buildDecorativePanel({bool compact = false}) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: compact ? 60 : 100,
          height: compact ? 60 : 100,
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Icon(
            Icons.menu_book_rounded,
            color: Colors.white,
            size: compact ? 30 : 50,
          ),
        ),
        SizedBox(height: compact ? 12 : 24),
        Text(
          'Join Us!',
          style: TextStyle(
            fontSize: compact ? 20 : 28,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        if (!compact) ...[
          const SizedBox(height: 12),
          Text(
            'Start your Quran memorization\njourney today',
            style: TextStyle(
              fontSize: 16,
              color: Colors.white.withOpacity(0.9),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }

  Widget _buildForm(bool isDarkMode) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Create Account',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: AppColors.text(isDarkMode),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Join QuranTrack today',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary(isDarkMode),
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

          // Name fields
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _firstNameController,
                  label: 'First Name',
                  isDarkMode: isDarkMode,
                  validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField(
                  controller: _lastNameController,
                  label: 'Last Name',
                  isDarkMode: isDarkMode,
                  validator: (v) => v?.isEmpty ?? true ? 'Required' : null,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Email
          _buildTextField(
            controller: _emailController,
            label: 'Email',
            keyboardType: TextInputType.emailAddress,
            isDarkMode: isDarkMode,
            validator: (v) {
              if (v?.isEmpty ?? true) return 'Required';
              if (!v!.contains('@')) return 'Invalid email';
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Username
          _buildTextField(
            controller: _usernameController,
            label: 'Username',
            isDarkMode: isDarkMode,
            validator: (v) {
              if (v?.isEmpty ?? true) return 'Required';
              if (!RegExp(r'^[a-zA-Z0-9_]+$').hasMatch(v!)) {
                return 'Letters, numbers, underscores only';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),

          // Password fields
          Row(
            children: [
              Expanded(
                child: _buildTextField(
                  controller: _passwordController,
                  label: 'Password',
                  obscureText: _obscurePassword,
                  isDarkMode: isDarkMode,
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_off_rounded
                          : Icons.visibility_rounded,
                      size: 18,
                      color: isDarkMode
                          ? AppColors.slate400
                          : AppColors.slate500,
                    ),
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  ),
                  validator: (v) {
                    if (v?.isEmpty ?? true) return 'Required';
                    if (v!.length < 8) return '8+ chars';
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildTextField(
                  controller: _confirmPasswordController,
                  label: 'Confirm',
                  obscureText: _obscureConfirmPassword,
                  isDarkMode: isDarkMode,
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscureConfirmPassword
                          ? Icons.visibility_off_rounded
                          : Icons.visibility_rounded,
                      size: 18,
                      color: isDarkMode
                          ? AppColors.slate400
                          : AppColors.slate500,
                    ),
                    onPressed: () => setState(
                      () => _obscureConfirmPassword = !_obscureConfirmPassword,
                    ),
                  ),
                  validator: (v) {
                    if (v != _passwordController.text) return 'Must match';
                    return null;
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Sign up button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSignup,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.transparent,
                disabledBackgroundColor: Colors.grey.withOpacity(0.3),
                shadowColor: AppColors.cyan500.withOpacity(0.3),
                elevation: 8,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: Ink(
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(16),
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
                          'CREATE ACCOUNT',
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

          // Sign in link
          Center(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Already have an account? ',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary(isDarkMode),
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Text(
                    'Sign in',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.cyan500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required bool isDarkMode,
    bool obscureText = false,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
    Widget? suffixIcon,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary(isDarkMode),
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          validator: validator,
          style: TextStyle(fontSize: 14, color: AppColors.text(isDarkMode)),
          decoration: InputDecoration(
            isDense: true,
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: isDarkMode
                ? AppColors.darkInputBg
                : AppColors.lightInputBg,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: isDarkMode
                    ? AppColors.cyan500.withOpacity(0.2)
                    : AppColors.cyan200,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(
                color: isDarkMode
                    ? AppColors.cyan500.withOpacity(0.2)
                    : AppColors.cyan200,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide(color: AppColors.cyan500, width: 2),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: const BorderSide(color: Colors.red),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
          ),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';
import '../../../config/theme.dart';

/// A button with cyan-to-teal gradient styling.
/// Used throughout the app for primary actions.
class GradientButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final double? width;
  final EdgeInsets? padding;
  final bool useTeacherColors;

  const GradientButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.width,
    this.padding,
    this.useTeacherColors = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    final gradient = useTeacherColors
        ? AppColors.primaryGradient
        : const LinearGradient(
            colors: [AppColors.gold, AppColors.teal500],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          );

    return Container(
      width: width,
      decoration: BoxDecoration(
        gradient: onPressed != null && !isLoading ? gradient : null,
        color: onPressed == null || isLoading
            ? AppColors.textMuted(isDark).withOpacity(0.45)
            : null,
        borderRadius: BorderRadius.circular(16),
        boxShadow: onPressed != null && !isLoading
            ? [
                BoxShadow(
                  color: AppColors.cyan600.withOpacity(isDark ? 0.34 : 0.24),
                  blurRadius: 20,
                  offset: const Offset(0, 9),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isLoading ? null : onPressed,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding:
                padding ??
                const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
            child: isLoading
                ? const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (icon != null) ...[
                        Icon(icon, color: Colors.white, size: 20),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        text,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

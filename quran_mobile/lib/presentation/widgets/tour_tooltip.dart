import 'package:flutter/material.dart';
import '../../config/app_colors.dart';

/// Custom tooltip widget for the guided tour.
/// Used as the `contents` builder in tutorial_coach_mark TargetFocus.
class TourTooltip extends StatelessWidget {
  final String title;
  final String description;
  final int currentStep;
  final int totalSteps;
  final bool isDarkMode;
  final bool isLastStep;
  final bool isInteractive;
  final VoidCallback onNext;
  final VoidCallback onSkip;

  const TourTooltip({
    super.key,
    required this.title,
    required this.description,
    required this.currentStep,
    required this.totalSteps,
    required this.isDarkMode,
    required this.isLastStep,
    this.isInteractive = false,
    required this.onNext,
    required this.onSkip,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = isDarkMode ? AppColors.slate800 : Colors.white;
    final titleColor = isDarkMode ? Colors.white : AppColors.slate900;
    final descColor = isDarkMode ? AppColors.slate300 : AppColors.slate600;
    final borderColor = isDarkMode
        ? AppColors.slate700.withOpacity(0.5)
        : AppColors.slate200;
    final stepColor = isDarkMode ? AppColors.slate400 : AppColors.slate500;

    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: borderColor),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDarkMode ? 0.4 : 0.15),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Step ${currentStep + 1} of $totalSteps',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: stepColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: titleColor,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: descColor,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (!isLastStep)
                      TextButton(
                        onPressed: onSkip,
                        style: TextButton.styleFrom(
                          foregroundColor: isDarkMode
                              ? AppColors.slate400
                              : AppColors.slate500,
                        ),
                        child: const Text('Skip'),
                      )
                    else
                      const SizedBox.shrink(),
                    if (isInteractive)
                      Material(
                        color: isDarkMode
                            ? AppColors.slate700.withOpacity(0.5)
                            : AppColors.slate100,
                        borderRadius: BorderRadius.circular(10),
                        child: InkWell(
                          onTap: onNext,
                          borderRadius: BorderRadius.circular(10),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(
                                  Icons.touch_app_rounded,
                                  size: 16,
                                  color: AppColors.cyan500,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Try it',
                                  style: TextStyle(
                                    color: isDarkMode ? AppColors.slate300 : AppColors.slate600,
                                    fontWeight: FontWeight.w500,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      )
                    else
                      Container(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.cyan500, AppColors.teal500],
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: onNext,
                            borderRadius: BorderRadius.circular(10),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                                vertical: 10,
                              ),
                              child: Text(
                                isLastStep ? 'Finish' : 'Next',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

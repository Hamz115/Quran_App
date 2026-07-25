import 'package:flutter/material.dart';

import '../../config/app_colors.dart';
import '../../config/theme.dart';

class PremiumScaffoldBackground extends StatelessWidget {
  final Widget child;
  final bool useSafeArea;
  final EdgeInsets padding;

  const PremiumScaffoldBackground({
    super.key,
    required this.child,
    this.useSafeArea = true,
    this.padding = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    final content = Padding(padding: padding, child: child);

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: AppColors.appBackgroundGradient(isDark),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -72,
            right: -28,
            child: _AccentBand(
              width: 132,
              height: 310,
              color: AppColors.cyan500.withOpacity(isDark ? 0.10 : 0.08),
              angle: -0.18,
            ),
          ),
          Positioned(
            bottom: 72,
            left: -46,
            child: _AccentBand(
              width: 118,
              height: 260,
              color: AppColors.gold.withOpacity(isDark ? 0.08 : 0.10),
              angle: 0.22,
            ),
          ),
          useSafeArea ? SafeArea(child: content) : content,
        ],
      ),
    );
  }
}

class PremiumPageHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final IconData? icon;

  const PremiumPageHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          if (icon != null) ...[
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.cyan600.withOpacity(isDark ? 0.26 : 0.20),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.headlineMedium),
                if (subtitle != null) ...[
                  const SizedBox(height: 5),
                  Text(
                    subtitle!,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.textSecondary(isDark),
                    ),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const SizedBox(width: 12), trailing!],
        ],
      ),
    );
  }
}

class PremiumSheetFrame extends StatelessWidget {
  final Widget child;
  final double? height;

  const PremiumSheetFrame({super.key, required this.child, this.height});

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;

    return Container(
      height: height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [AppColors.nightCard, AppColors.nightSurface]
              : [Colors.white, AppColors.porcelain],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        border: Border(
          top: BorderSide(
            color: isDark
                ? AppColors.cyan500.withOpacity(0.20)
                : AppColors.cyan200.withOpacity(0.80),
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.42 : 0.14),
            blurRadius: 30,
            offset: const Offset(0, -12),
          ),
        ],
      ),
      child: child,
    );
  }
}

class PremiumEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String body;
  final Color? color;

  const PremiumEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.body,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    final accent = color ?? AppColors.primary(isDark);

    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 82,
            height: 82,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  accent.withOpacity(isDark ? 0.26 : 0.18),
                  AppColors.gold.withOpacity(isDark ? 0.12 : 0.18),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: accent.withOpacity(0.26)),
            ),
            child: Icon(icon, size: 38, color: accent),
          ),
          const SizedBox(height: 20),
          Text(
            title,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Text(
            body,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppColors.textSecondary(isDark),
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _AccentBand extends StatelessWidget {
  final double width;
  final double height;
  final Color color;
  final double angle;

  const _AccentBand({
    required this.width,
    required this.height,
    required this.color,
    required this.angle,
  });

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Transform.rotate(
        angle: angle,
        child: Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(28),
          ),
        ),
      ),
    );
  }
}

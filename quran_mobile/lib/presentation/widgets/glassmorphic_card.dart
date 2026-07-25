import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../config/app_colors.dart';

class GlassmorphicCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final Color? borderColor;
  final double borderRadius;
  final VoidCallback? onTap;
  final bool showBorder;
  final bool emphasized;

  const GlassmorphicCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderColor,
    this.borderRadius = 16,
    this.onTap,
    this.showBorder = true,
    this.emphasized = false,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;

    final radius = BorderRadius.circular(borderRadius);
    final card = AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      margin: margin,
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? [
                  AppColors.elevatedSurface(
                    true,
                  ).withOpacity(emphasized ? 0.94 : 0.82),
                  AppColors.darkCard.withOpacity(0.88),
                ]
              : [
                  Colors.white,
                  emphasized
                      ? AppColors.mist.withOpacity(0.68)
                      : AppColors.porcelain,
                ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: radius,
        border: showBorder
            ? Border.all(
                color:
                    borderColor ??
                    (isDark
                        ? AppColors.darkBorder.withOpacity(0.74)
                        : AppColors.lightBorder),
              )
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.28 : 0.08),
            blurRadius: emphasized ? 26 : 18,
            offset: Offset(0, emphasized ? 12 : 8),
          ),
          if (!isDark)
            BoxShadow(
              color: AppColors.cyan700.withOpacity(0.04),
              blurRadius: 20,
              offset: const Offset(0, 4),
            ),
        ],
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(color: AppColors.text(isDark)),
        child: child,
      ),
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        borderRadius: radius,
        child: InkWell(onTap: onTap, borderRadius: radius, child: card),
      );
    }

    return card;
  }
}

class PremiumIconBox extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double size;

  const PremiumIconBox({
    super.key,
    required this.icon,
    required this.color,
    this.size = 44,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: color.withOpacity(isDark ? 0.20 : 0.12),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(isDark ? 0.24 : 0.16)),
      ),
      child: Icon(icon, color: color, size: size * 0.48),
    );
  }
}

class PremiumDivider extends StatelessWidget {
  const PremiumDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    return Divider(
      height: 1,
      color: AppColors.border(isDark).withOpacity(isDark ? 0.62 : 0.72),
    );
  }
}

class PremiumPill extends StatelessWidget {
  final String label;
  final Color color;
  final bool selected;
  final VoidCallback? onTap;
  final IconData? icon;

  const PremiumPill({
    super.key,
    required this.label,
    required this.color,
    this.selected = false,
    this.onTap,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;
    final foreground = selected
        ? Colors.white
        : (isDark ? AppColors.darkText : AppColors.lightText);

    final pill = AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
      decoration: BoxDecoration(
        gradient: selected
            ? LinearGradient(
                colors: [color, Color.lerp(color, AppColors.teal600, 0.28)!],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: selected ? null : AppColors.softSurface(isDark),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: selected ? color.withOpacity(0.25) : AppColors.border(isDark),
        ),
        boxShadow: selected
            ? [
                BoxShadow(
                  color: color.withOpacity(isDark ? 0.26 : 0.18),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, color: foreground, size: 16),
            const SizedBox(width: 7),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: foreground,
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      return GestureDetector(onTap: onTap, child: pill);
    }
    return pill;
  }
}

class SectionCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? trailing;
  final EdgeInsets? padding;
  final Color? accentColor;

  const SectionCard({
    super.key,
    required this.title,
    this.subtitle,
    required this.child,
    this.trailing,
    this.padding,
    this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;

    return GlassmorphicCard(
      padding: padding ?? const EdgeInsets.all(20),
      borderColor: accentColor?.withOpacity(0.3),
      emphasized: accentColor != null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: accentColor ?? AppColors.text(isDark),
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle!,
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary(isDark),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  final Color? color;
  final bool smallText;
  final String? badge;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.color,
    this.smallText = false,
    this.badge,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDarkMode;

    return GlassmorphicCard(
      padding: const EdgeInsets.all(16),
      emphasized: color == AppColors.cyan500,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (icon != null)
                PremiumIconBox(
                  icon: icon!,
                  color: color ?? AppColors.emerald400,
                  size: 38,
                ),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.emerald500,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    badge!,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: smallText ? 16 : 28,
              fontWeight: FontWeight.w800,
              color: color ?? AppColors.text(isDark),
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary(isDark),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../../config/theme.dart';

class GlassmorphicCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final Color? borderColor;
  final double borderRadius;
  final VoidCallback? onTap;
  final bool showBorder;

  const GlassmorphicCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.borderColor,
    this.borderRadius = 16,
    this.onTap,
    this.showBorder = true,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      margin: margin,
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.slate800.withOpacity(0.5),
        borderRadius: BorderRadius.circular(borderRadius),
        border: showBorder
            ? Border.all(
                color: borderColor ?? AppTheme.slate700.withOpacity(0.5),
              )
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: card,
      );
    }

    return card;
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
    return GlassmorphicCard(
      padding: padding ?? const EdgeInsets.all(20),
      borderColor: accentColor?.withOpacity(0.3),
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
                        fontWeight: FontWeight.w600,
                        color: accentColor ?? AppTheme.slate100,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle!,
                        style: const TextStyle(
                          fontSize: 14,
                          color: AppTheme.slate400,
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

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.icon,
    this.color,
    this.smallText = false,
  });

  @override
  Widget build(BuildContext context) {
    return GlassmorphicCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null)
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (color ?? AppTheme.emerald500).withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: color ?? AppTheme.emerald400,
                size: 20,
              ),
            ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: smallText ? 16 : 28,
              fontWeight: FontWeight.bold,
              color: color ?? AppTheme.slate100,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.slate400,
            ),
          ),
        ],
      ),
    );
  }
}

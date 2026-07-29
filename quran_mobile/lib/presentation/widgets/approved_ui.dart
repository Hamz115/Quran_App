import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../config/app_colors.dart';

class ApprovedBrandHeader extends StatelessWidget {
  final String workspace;
  final String initials;

  const ApprovedBrandHeader({
    super.key,
    this.workspace = 'North Halaqah',
    required this.initials,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.navy,
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 18),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            const Icon(Icons.auto_stories, color: AppColors.gold, size: 34),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'QuranTrack',
                    style: GoogleFonts.cormorantGaramond(
                      color: AppColors.gold,
                      fontSize: 27,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    'TEACH  •  TRACK  •  TRANSFORM',
                    style: GoogleFonts.inter(
                      color: AppColors.goldSoft,
                      fontSize: 8,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.groups_outlined,
                      color: Colors.white,
                      size: 17,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      workspace,
                      style: const TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Row(
                  children: [
                    const Icon(
                      Icons.check_circle,
                      color: AppColors.emerald400,
                      size: 15,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'Synced just now',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.78),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(width: 12),
            Container(
              width: 46,
              height: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.gold, width: 1.5),
              ),
              child: Text(
                initials,
                style: GoogleFonts.cormorantGaramond(
                  color: AppColors.gold,
                  fontSize: 19,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ApprovedCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final Color? color;

  const ApprovedCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? AppColors.lightCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.goldBorder),
      ),
      child: child,
    );
  }
}

class ApprovedSectionTitle extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget? trailing;

  const ApprovedSectionTitle({
    super.key,
    required this.icon,
    required this.title,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: AppColors.goldMuted, size: 21),
        const SizedBox(width: 9),
        Expanded(
          child: Text(title, style: Theme.of(context).textTheme.titleLarge),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

class ApprovedPrimaryButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback? onPressed;

  const ApprovedPrimaryButton({
    super.key,
    required this.label,
    required this.icon,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, size: 20),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.emerald,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }
}

class ApprovedInitialsAvatar extends StatelessWidget {
  final String name;
  final double size;
  final bool navy;

  const ApprovedInitialsAvatar({
    super.key,
    required this.name,
    this.size = 48,
    this.navy = false,
  });

  @override
  Widget build(BuildContext context) {
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0])
        .join()
        .toUpperCase();

    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: navy ? AppColors.navy : AppColors.emeraldDark,
      ),
      child: Text(
        initials.isEmpty ? '?' : initials,
        style: GoogleFonts.cormorantGaramond(
          color: Colors.white,
          fontSize: size * 0.42,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class ApprovedStatusBadge extends StatelessWidget {
  final String label;
  final Color color;

  const ApprovedStatusBadge({
    super.key,
    required this.label,
    this.color = AppColors.emeraldDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(7),
        border: Border.all(color: color.withOpacity(0.24)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

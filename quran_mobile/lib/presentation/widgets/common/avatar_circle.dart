import 'package:flutter/material.dart';
import '../../../config/app_colors.dart';

/// A circular avatar with initials and role-based gradient.
/// Used in dashboard and user profile areas.
class AvatarCircle extends StatelessWidget {
  final String initials;
  final double size;
  final bool isTeacher;
  final double fontSize;

  const AvatarCircle({
    super.key,
    required this.initials,
    this.size = 56,
    this.isTeacher = true,
    this.fontSize = 20,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isTeacher
              ? [AppColors.cyan500, AppColors.teal500]
              : [AppColors.teal500, AppColors.cyan500],
        ),
        borderRadius: BorderRadius.circular(size * 0.3),
        boxShadow: [
          BoxShadow(
            color: (isTeacher ? AppColors.cyan500 : AppColors.teal500).withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(
        child: Text(
          initials.isNotEmpty ? initials : 'QT',
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}

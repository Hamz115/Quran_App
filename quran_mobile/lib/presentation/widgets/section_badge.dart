import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';

class SectionBadge extends StatelessWidget {
  final String type;
  final String text;
  final bool compact;

  const SectionBadge({
    super.key,
    required this.type,
    required this.text,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getSectionColor(type);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 8,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(compact ? 6 : 10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '${type[0].toUpperCase()}${type.substring(1)}:',
            style: TextStyle(
              fontSize: compact ? 11 : 13,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            text,
            style: TextStyle(
              fontSize: compact ? 11 : 13,
              color: color.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }
}

class SectionTab extends StatelessWidget {
  final String type;
  final String label;
  final int portionCount;
  final bool isSelected;
  final VoidCallback onTap;

  const SectionTab({
    super.key,
    required this.type,
    required this.label,
    this.portionCount = 1,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getSectionColor(type);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.2) : AppTheme.slate800,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color.withOpacity(0.5) : AppTheme.slate700,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: isSelected ? color : AppTheme.slate400,
              ),
            ),
            if (portionCount > 1) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isSelected ? color.withOpacity(0.3) : AppTheme.slate700,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '$portionCount',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? color : AppTheme.slate400,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class MistakeBadge extends StatelessWidget {
  final int errorCount;
  final String wordText;
  final String location;
  final VoidCallback? onTap;

  const MistakeBadge({
    super.key,
    required this.errorCount,
    required this.wordText,
    required this.location,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getMistakeColor(errorCount);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              wordText,
              style: GoogleFonts.amiri(
                fontSize: 18,
                color: color,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              location,
              style: TextStyle(
                fontSize: 11,
                color: color.withOpacity(0.7),
              ),
            ),
            if (errorCount > 1) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${errorCount}x',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../config/constants.dart';
import '../../../data/models/class_session.dart';
import '../../../data/models/assignment.dart';
import '../../providers/providers.dart';
import '../../widgets/glassmorphic_card.dart';
import '../classroom/classroom_screen.dart';
import 'create_class_screen.dart';

class ClassesScreen extends ConsumerStatefulWidget {
  const ClassesScreen({super.key});

  @override
  ConsumerState<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends ConsumerState<ClassesScreen> {
  int? _performanceDropdownId;
  int? _editingNotesId;
  final TextEditingController _notesController = TextEditingController();

  final List<String> _performanceOptions = [
    'Excellent',
    'Very Good',
    'Good',
    'Needs Work',
  ];

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final classesAsync = ref.watch(classesProvider);

    return Scaffold(
      backgroundColor: AppTheme.slate900,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateClassSheet(context),
        backgroundColor: AppTheme.emerald500,
        icon: const Icon(Icons.add_rounded),
        label: const Text('New Class'),
      ),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Classes',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.slate100,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Manage your teaching sessions',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.slate400,
                    ),
                  ),
                ],
              ),
            ),

            // Classes Table
            Expanded(
              child: classesAsync.when(
                data: (classes) {
                  if (classes.isEmpty) {
                    return _buildEmptyState();
                  }

                  return RefreshIndicator(
                    onRefresh: () async {
                      ref.read(classesProvider.notifier).loadClasses();
                    },
                    child: _buildMonthGroupedTable(classes),
                  );
                },
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.emerald400),
                ),
                error: (e, _) => Center(
                  child: Text('Error: $e', style: const TextStyle(color: AppTheme.error)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMonthGroupedTable(List<ClassSession> classes) {
    final grouped = _groupClassesByMonth(classes);
    final sortedMonths = grouped.keys.toList()
      ..sort((a, b) => b.compareTo(a)); // Newest months first

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Column(
        children: sortedMonths.map((monthKey) {
          final monthClasses = grouped[monthKey]!;
          return _buildMonthSection(monthKey, monthClasses, classes);
        }).toList(),
      ),
    );
  }

  Map<String, List<ClassSession>> _groupClassesByMonth(List<ClassSession> classes) {
    final grouped = <String, List<ClassSession>>{};
    final sortedClasses = [...classes]..sort((a, b) => b.date.compareTo(a.date));

    for (final cls in sortedClasses) {
      final parts = cls.date.split('-');
      if (parts.length >= 2) {
        final monthKey = '${parts[0]}-${parts[1]}';
        grouped.putIfAbsent(monthKey, () => []);
        grouped[monthKey]!.add(cls);
      }
    }
    return grouped;
  }

  String _getMonthLabel(String monthKey) {
    final parts = monthKey.split('-');
    if (parts.length < 2) return monthKey;

    final year = parts[0];
    final month = int.tryParse(parts[1]) ?? 1;

    const months = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return '${months[month]} $year';
  }

  int _getWeekNumber(String dateStr, List<ClassSession> allClasses) {
    if (allClasses.isEmpty) return 1;

    final sortedDates = allClasses.map((c) => DateTime.parse(c.date).millisecondsSinceEpoch).toList()
      ..sort();
    final firstClassDate = DateTime.fromMillisecondsSinceEpoch(sortedDates.first);
    final currentDate = DateTime.parse(dateStr);

    final diffDays = currentDate.difference(firstClassDate).inDays;
    return (diffDays ~/ 7) + 1;
  }

  Widget _buildMonthSection(String monthKey, List<ClassSession> monthClasses, List<ClassSession> allClasses) {
    final classCount = monthClasses.length;
    final classWord = classCount == 1 ? 'class' : 'classes';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: GlassmorphicCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Month Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.slate800.withOpacity(0.5),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _getMonthLabel(monthKey),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.emerald400,
                    ),
                  ),
                  Text(
                    '$classCount $classWord',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.slate400,
                    ),
                  ),
                ],
              ),
            ),

            // Table Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.slate800.withOpacity(0.3),
                border: Border(
                  bottom: BorderSide(color: AppTheme.slate700, width: 1),
                ),
              ),
              child: Row(
                children: [
                  _buildTableHeader('Wk', width: 30),
                  _buildTableHeader('Date', width: 55),
                  _buildTableHeader('Day', width: 35),
                  _buildTableHeader('Hifz', flex: 1),
                  _buildTableHeader('Sabqi', flex: 1),
                  _buildTableHeader('Manzil', flex: 1),
                  _buildTableHeader('Perf', width: 45),
                  _buildTableHeader('', width: 30), // Notes
                  const SizedBox(width: 24), // Delete
                ],
              ),
            ),

            // Table Rows
            ...monthClasses.asMap().entries.map((entry) {
              final index = entry.key;
              final classItem = entry.value;
              final isLast = index == monthClasses.length - 1;
              return _buildTableRow(classItem, allClasses, isLast);
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildTableHeader(String text, {double? width, int flex = 1}) {
    final child = Text(
      text,
      style: const TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.w600,
        color: AppTheme.slate400,
      ),
    );
    if (width != null) {
      return SizedBox(width: width, child: child);
    }
    return Expanded(flex: flex, child: child);
  }

  Widget _buildTableRow(ClassSession classItem, List<ClassSession> allClasses, bool isLast) {
    final weekNum = _getWeekNumber(classItem.date, allClasses);

    // Get all assignments by type
    final hifzAssignments = classItem.assignments.where((a) => a.type == 'hifz').toList();
    final sabqiAssignments = classItem.assignments.where((a) => a.type == 'sabqi').toList();
    final manzilAssignments = classItem.assignments.where((a) => a.type == 'revision' || a.type == 'manzil').toList();

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ClassroomScreen(classId: classItem.id!),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
        decoration: BoxDecoration(
          border: isLast ? null : Border(
            bottom: BorderSide(color: AppTheme.slate700.withOpacity(0.5), width: 1),
          ),
        ),
        child: Row(
          children: [
            // Week
            SizedBox(
              width: 30,
              child: Text(
                'W$weekNum',
                style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.slate500,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            // Date
            SizedBox(
              width: 55,
              child: Text(
                _formatDateShort(classItem.date),
                style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.slate300,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            // Day
            SizedBox(
              width: 35,
              child: Text(
                classItem.day.substring(0, 3),
                style: const TextStyle(
                  fontSize: 10,
                  color: AppTheme.slate400,
                ),
              ),
            ),
            // Hifz
            Expanded(
              child: _buildSurahCell(hifzAssignments, 'hifz'),
            ),
            // Sabqi
            Expanded(
              child: _buildSurahCell(sabqiAssignments, 'sabqi'),
            ),
            // Manzil
            Expanded(
              child: _buildSurahCell(manzilAssignments, 'manzil'),
            ),
            // Performance
            SizedBox(
              width: 45,
              child: _buildPerformanceCell(classItem),
            ),
            // Notes
            SizedBox(
              width: 30,
              child: _buildNotesCell(classItem),
            ),
            // Delete
            GestureDetector(
              onTap: () => _deleteClass(classItem.id!),
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(
                  Icons.close_rounded,
                  size: 14,
                  color: AppTheme.slate600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSurahCell(List<Assignment> assignments, String type) {
    if (assignments.isEmpty) {
      return const Text(
        '-',
        style: TextStyle(
          fontSize: 10,
          color: AppTheme.slate600,
        ),
      );
    }

    final color = AppTheme.getSectionColor(type);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: assignments.map((assignment) {
        String text = '';
        if (assignment.startSurah > 0 && assignment.startSurah <= 114) {
          text = AppConstants.surahNames[assignment.startSurah - 1] ?? '-';
          if (assignment.hasAyahRange) {
            text += ' ${assignment.startAyah}-${assignment.endAyah}';
          } else if (assignment.isMultiSurah && assignment.endSurah > 0 && assignment.endSurah <= 114) {
            final endName = AppConstants.surahNames[assignment.endSurah - 1] ?? '';
            text += '-$endName';
          }
        }
        return Text(
          text,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 10,
            color: color,
            fontWeight: FontWeight.w500,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildPerformanceCell(ClassSession classItem) {
    final isOpen = _performanceDropdownId == classItem.id;

    return GestureDetector(
      onTap: () {
        setState(() {
          _performanceDropdownId = isOpen ? null : classItem.id;
        });
      },
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
            decoration: BoxDecoration(
              color: _getPerformanceColor(classItem.performance).withOpacity(0.2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              _getPerformanceShort(classItem.performance),
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: _getPerformanceColor(classItem.performance),
              ),
            ),
          ),
          if (isOpen)
            Positioned(
              bottom: 20,
              left: -20,
              child: Material(
                color: Colors.transparent,
                child: Container(
                  width: 100,
                  decoration: BoxDecoration(
                    color: AppTheme.slate800,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.slate700),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: _performanceOptions.map((option) {
                      return InkWell(
                        onTap: () {
                          ref.read(classesProvider.notifier).updatePerformance(classItem.id!, option);
                          setState(() => _performanceDropdownId = null);
                        },
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          child: Text(
                            option,
                            style: TextStyle(
                              fontSize: 12,
                              color: _getPerformanceColor(option),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  String _getPerformanceShort(String? perf) {
    switch (perf) {
      case 'Excellent': return 'Exc';
      case 'Very Good': return 'VG';
      case 'Good': return 'Good';
      case 'Needs Work': return 'NW';
      default: return 'Set';
    }
  }

  Color _getPerformanceColor(String? perf) {
    switch (perf) {
      case 'Excellent': return AppTheme.emerald400;
      case 'Very Good': return const Color(0xFF14B8A6); // Teal
      case 'Good': return const Color(0xFFF59E0B); // Amber
      case 'Needs Work': return AppTheme.error;
      default: return AppTheme.slate400;
    }
  }

  Widget _buildNotesCell(ClassSession classItem) {
    final hasNotes = classItem.notes != null && classItem.notes!.isNotEmpty;

    return GestureDetector(
      onTap: () => _showNotesDialog(classItem),
      child: Icon(
        hasNotes ? Icons.note_rounded : Icons.note_add_outlined,
        size: 16,
        color: hasNotes ? AppTheme.mistake1 : AppTheme.slate600,
      ),
    );
  }

  void _showNotesDialog(ClassSession classItem) {
    _notesController.text = classItem.notes ?? '';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.slate800,
        title: Row(
          children: [
            const Icon(Icons.note_rounded, color: AppTheme.mistake1, size: 20),
            const SizedBox(width: 8),
            Text(
              'Notes - ${classItem.day}, ${_formatDateShort(classItem.date)}',
              style: const TextStyle(fontSize: 16),
            ),
          ],
        ),
        content: TextField(
          controller: _notesController,
          maxLines: 4,
          style: const TextStyle(color: AppTheme.slate100),
          decoration: InputDecoration(
            hintText: 'Add notes...',
            hintStyle: const TextStyle(color: AppTheme.slate500),
            filled: true,
            fillColor: AppTheme.slate900,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppTheme.slate700),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppTheme.slate700),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppTheme.emerald400),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final notes = _notesController.text.trim();
              ref.read(classesProvider.notifier).updateNotes(
                classItem.id!,
                notes.isEmpty ? null : notes,
              );
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.emerald500),
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  String _formatDateShort(String date) {
    final parts = date.split('-');
    if (parts.length >= 3) {
      return '${parts[2]}/${parts[1]}';
    }
    return date;
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppTheme.slate800,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.calendar_today_outlined,
              size: 40,
              color: AppTheme.slate500,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'No classes yet',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: AppTheme.slate200,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Start your first class to begin tracking progress',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.slate400,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showCreateClassSheet(context),
            icon: const Icon(Icons.add_rounded),
            label: const Text('Create First Class'),
          ),
        ],
      ),
    );
  }

  void _showCreateClassSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const CreateClassScreen(),
    );
  }

  void _deleteClass(int id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.slate800,
        title: const Text('Delete Class?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              ref.read(classesProvider.notifier).deleteClass(id);
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.error),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

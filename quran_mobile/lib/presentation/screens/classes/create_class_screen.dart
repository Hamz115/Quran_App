import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../config/app_colors.dart';
import '../../../config/constants.dart';
import '../../../data/quran_data.dart' show getJuzBoundary, pageStarts, totalPages, getPageForSurah, getLastPageForSurah;
import '../../providers/providers.dart';
import '../../providers/theme_provider.dart';
import '../../providers/report_provider.dart';
import '../classroom/classroom_screen.dart';

class CreateClassScreen extends ConsumerStatefulWidget {
  final String? studentId;

  const CreateClassScreen({super.key, this.studentId});

  @override
  ConsumerState<CreateClassScreen> createState() => _CreateClassScreenState();
}

class _CreateClassScreenState extends ConsumerState<CreateClassScreen> {
  DateTime _selectedDate = DateTime.now();
  final Map<String, bool> _sectionEnabled = {
    'hifz': true,
    'sabqi': true,
    'revision': true,
  };
  final Map<String, List<PortionData>> _portions = {
    'hifz': [PortionData(startSurah: 67, endSurah: 67)],
    'sabqi': [PortionData(startSurah: 93, endSurah: 96)],
    'revision': [PortionData(startSurah: 97, endSurah: 114)],
  };

  // Per-portion selection mode: 'surah' or 'juz'. Key = "type:index".
  final Map<String, String> _portionModes = {};
  // Per-portion selected juz. Key = "type:index".
  final Map<String, int?> _portionJuz = {};

  String _getPortionMode(String type, int index) =>
      _portionModes['$type:$index'] ?? 'surah';

  int? _getPortionSelectedJuz(String type, int index) =>
      _portionJuz['$type:$index'];

  bool _isCreating = false;

  @override
  void initState() {
    super.initState();
    _prefillFromPreviousClass();
  }

  /// Fetch previous class data and auto-fill portion fields.
  Future<void> _prefillFromPreviousClass() async {
    if (widget.studentId == null) return;
    try {
      final suggestions = await ref.read(suggestedPortionsProvider(widget.studentId!).future);
      if (!mounted) return;

      setState(() {
        if (suggestions.hifz != null) {
          _sectionEnabled['hifz'] = true;
          _portions['hifz'] = [
            PortionData(
              startSurah: suggestions.hifz!.startSurah,
              endSurah: suggestions.hifz!.endSurah,
              startAyah: suggestions.hifz!.startAyah,
              endAyah: suggestions.hifz!.endAyah,
            ),
          ];
        }
        if (suggestions.sabqi != null) {
          _sectionEnabled['sabqi'] = true;
          _portions['sabqi'] = [
            PortionData(
              startSurah: suggestions.sabqi!.startSurah,
              endSurah: suggestions.sabqi!.endSurah,
              startAyah: suggestions.sabqi!.startAyah,
              endAyah: suggestions.sabqi!.endAyah,
            ),
          ];
        }
        if (suggestions.manzil != null) {
          _sectionEnabled['revision'] = true;
          _portions['revision'] = [
            PortionData(
              startSurah: suggestions.manzil!.startSurah,
              endSurah: suggestions.manzil!.endSurah,
              startAyah: suggestions.manzil!.startAyah,
              endAyah: suggestions.manzil!.endAyah,
            ),
          ];
        }
      });
    } catch (_) {
      // Silently fall back to defaults if fetch fails
    }
  }

  @override
  Widget build(BuildContext context) {
    final surahsAsync = ref.watch(surahListProvider);
    final isDarkMode = ref.watch(themeProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: BoxDecoration(
        color: AppColors.surface(isDarkMode),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.textMuted(isDarkMode),
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'New Class',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text(isDarkMode),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Configure today\'s teaching session',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.textSecondary(isDarkMode),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                  color: AppColors.textSecondary(isDarkMode),
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: surahsAsync.when(
              data: (surahs) => SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Date selector
                    _buildDateSelector(isDarkMode),
                    const SizedBox(height: 24),

                    // Sections
                    Text(
                      'Portions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.text(isDarkMode),
                      ),
                    ),
                    const SizedBox(height: 12),

                    _buildSection('hifz', 'Hifz (New Memorization)', 'New verses to memorize', AppColors.hifzColor, surahs, isDarkMode),
                    const SizedBox(height: 12),
                    _buildSection('sabqi', 'Sabqi (Recent)', 'Recently memorized, needs reinforcement', AppColors.sabqiColor, surahs, isDarkMode),
                    const SizedBox(height: 12),
                    _buildSection('revision', 'Revision (Manzil)', 'Long-term revision', AppColors.revisionColor, surahs, isDarkMode),

                    const SizedBox(height: 100),
                  ],
                ),
              ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),

          // Footer
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface(isDarkMode),
              border: Border(top: BorderSide(color: AppColors.border(isDarkMode).withOpacity(0.5))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: BorderSide(color: AppColors.textMuted(isDarkMode)),
                    ),
                    child: Text('Cancel', style: TextStyle(color: AppColors.text(isDarkMode))),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isCreating ? null : _createClass,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppColors.cyan500,
                    ),
                    child: _isCreating
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Create Class'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateSelector(bool isDarkMode) {
    final dayName = AppConstants.daysOfWeek[_selectedDate.weekday % 7];

    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () => _selectDate(isDarkMode),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.background(isDarkMode),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border(isDarkMode)),
              ),
              child: Row(
                children: [
                  Icon(Icons.calendar_today_rounded, color: AppColors.textSecondary(isDarkMode), size: 20),
                  const SizedBox(width: 12),
                  Text(
                    '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}',
                    style: TextStyle(fontSize: 16, color: AppColors.text(isDarkMode)),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.background(isDarkMode).withOpacity(0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border(isDarkMode)),
            ),
            child: Text(
              dayName,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.text(isDarkMode)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSection(String type, String label, String description, Color color, List surahs, bool isDarkMode) {
    final isEnabled = _sectionEnabled[type]!;
    final portions = _portions[type]!;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: isEnabled ? color.withOpacity(0.1) : AppColors.background(isDarkMode).withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isEnabled ? color.withOpacity(0.3) : AppColors.border(isDarkMode),
          width: isEnabled ? 2 : 1,
        ),
      ),
      child: Column(
        children: [
          // Header
          InkWell(
            onTap: () => setState(() => _sectionEnabled[type] = !isEnabled),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: isEnabled ? color : AppColors.textSecondary(isDarkMode),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          description,
                          style: TextStyle(
                            fontSize: 12,
                            color: isEnabled ? AppColors.textSecondary(isDarkMode) : AppColors.textMuted(isDarkMode),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Switch(
                    value: isEnabled,
                    onChanged: (v) => setState(() => _sectionEnabled[type] = v),
                    activeColor: color,
                  ),
                ],
              ),
            ),
          ),

          // Portions
          if (isEnabled) ...[
            ...portions.asMap().entries.map((entry) {
              final index = entry.key;
              final portion = entry.value;

              final portionMode = _getPortionMode(type, index);
              final selectedJuz = _getPortionSelectedJuz(type, index);
              final isJuzMode = portionMode == 'juz';
              final isPageMode = portionMode == 'page';

              return Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.background(isDarkMode).withOpacity(0.5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border(isDarkMode).withOpacity(0.5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Portion ${index + 1}',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondary(isDarkMode)),
                        ),
                        const Spacer(),
                        if (portions.length > 1)
                          IconButton(
                            onPressed: () => setState(() {
                              portions.removeAt(index);
                              _portionModes.remove('$type:$index');
                              _portionJuz.remove('$type:$index');
                            }),
                            icon: const Icon(Icons.close_rounded, size: 18),
                            color: AppColors.textMuted(isDarkMode),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Mode selector: By Page / By Surah / By Juz
                    Row(
                      children: [
                        _ModeChip(
                          label: 'By Page',
                          isActive: isPageMode,
                          color: color,
                          isDarkMode: isDarkMode,
                          onTap: () => setState(() {
                            _portionModes['$type:$index'] = 'page';
                            portion.startPage = getPageForSurah(portion.startSurah);
                            portion.endPage = getLastPageForSurah(portion.endSurah);
                            portion.startAyah = null;
                            portion.endAyah = null;
                          }),
                        ),
                        const SizedBox(width: 8),
                        _ModeChip(
                          label: 'By Surah',
                          isActive: portionMode == 'surah',
                          color: color,
                          isDarkMode: isDarkMode,
                          onTap: () => setState(() {
                            _portionModes['$type:$index'] = 'surah';
                          }),
                        ),
                        const SizedBox(width: 8),
                        _ModeChip(
                          label: 'By Juz',
                          isActive: isJuzMode,
                          color: color,
                          isDarkMode: isDarkMode,
                          onTap: () => setState(() {
                            _portionModes['$type:$index'] = 'juz';
                          }),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Page inputs (shown when mode == 'page')
                    if (isPageMode) ...[
                      Row(
                        children: [
                          Expanded(
                            child: _buildPageInput(
                              'From Page',
                              portion.startPage,
                              (v) {
                                setState(() {
                                  portion.startPage = v;
                                  if (v != null && v >= 1 && v <= totalPages) {
                                    portion.startSurah = pageStarts[v - 1][0];
                                    if (portion.endPage != null && portion.endPage! < v) {
                                      portion.endPage = v;
                                      portion.endSurah = pageStarts[v - 1][0];
                                    }
                                  }
                                });
                              },
                              isDarkMode,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _buildPageInput(
                              'To Page',
                              portion.endPage,
                              (v) {
                                setState(() {
                                  portion.endPage = v;
                                  if (v != null && v >= 1 && v <= totalPages) {
                                    portion.endSurah = pageStarts[v - 1][0];
                                  }
                                });
                              },
                              isDarkMode,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                    ],
                    // Juz dropdown (shown when mode == 'juz')
                    if (isJuzMode) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: AppColors.surface(isDarkMode),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.textMuted(isDarkMode)),
                        ),
                        child: DropdownButton<int>(
                          value: selectedJuz,
                          hint: Text('Select Juz', style: TextStyle(color: AppColors.textMuted(isDarkMode))),
                          isExpanded: true,
                          dropdownColor: AppColors.surface(isDarkMode),
                          underline: const SizedBox(),
                          style: TextStyle(fontSize: 13, color: AppColors.text(isDarkMode)),
                          items: List.generate(30, (i) => DropdownMenuItem(
                            value: i + 1,
                            child: Text('Juz ${i + 1}'),
                          )),
                          onChanged: (juz) {
                            if (juz == null) return;
                            final boundary = getJuzBoundary(juz);
                            if (boundary != null) {
                              setState(() {
                                _portionJuz['$type:$index'] = juz;
                                portion.startSurah = boundary.startSurah;
                                portion.endSurah = boundary.endSurah;
                                portion.startAyah = boundary.startAyah;
                                portion.endAyah = boundary.endAyah;
                              });
                            }
                          },
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: _buildSurahDropdown(
                            'From Surah',
                            portion.startSurah,
                            surahs,
                            (isJuzMode || isPageMode) ? null : (v) => setState(() {
                              portion.startSurah = v;
                              portion.endSurah = v;
                            }),
                            isDarkMode,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildSurahDropdown(
                            'To Surah',
                            portion.endSurah,
                            surahs,
                            (isJuzMode || isPageMode) ? null : (v) => setState(() => portion.endSurah = v),
                            isDarkMode,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _buildAyahInput(
                            'From Ayah',
                            portion.startAyah,
                            (isJuzMode || isPageMode) ? null : (v) => setState(() => portion.startAyah = v),
                            isDarkMode,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildAyahInput(
                            'To Ayah',
                            portion.endAyah,
                            (isJuzMode || isPageMode) ? null : (v) => setState(() => portion.endAyah = v),
                            isDarkMode,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),

            // Add portion button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: OutlinedButton.icon(
                onPressed: () => setState(() {
                  portions.add(PortionData(startSurah: 67, endSurah: 67));
                }),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  side: BorderSide(color: color.withOpacity(0.5)),
                ),
                icon: Icon(Icons.add_rounded, color: color, size: 18),
                label: Text('Add Another Portion', style: TextStyle(color: color)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSurahDropdown(String label, int value, List surahs, Function(int)? onChanged, bool isDarkMode) {
    final isReadOnly = onChanged == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: AppColors.textMuted(isDarkMode))),
        const SizedBox(height: 4),
        Opacity(
          opacity: isReadOnly ? 0.6 : 1.0,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.surface(isDarkMode),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppColors.textMuted(isDarkMode)),
            ),
            child: IgnorePointer(
              ignoring: isReadOnly,
              child: DropdownButton<int>(
                value: value,
                isExpanded: true,
                dropdownColor: AppColors.surface(isDarkMode),
                underline: const SizedBox(),
                style: TextStyle(fontSize: 13, color: AppColors.text(isDarkMode)),
                items: surahs.map<DropdownMenuItem<int>>((s) {
                  return DropdownMenuItem(
                    value: s.number,
                    child: Text('${s.number}. ${s.englishName}', overflow: TextOverflow.ellipsis),
                  );
                }).toList(),
                onChanged: onChanged != null ? (v) => onChanged(v!) : null,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAyahInput(String label, int? value, Function(int?)? onChanged, bool isDarkMode) {
    final isReadOnly = onChanged == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: AppColors.textMuted(isDarkMode))),
        const SizedBox(height: 4),
        TextFormField(
          initialValue: value?.toString() ?? '',
          keyboardType: TextInputType.number,
          readOnly: isReadOnly,
          style: TextStyle(
            fontSize: 13,
            color: isReadOnly ? AppColors.textMuted(isDarkMode) : AppColors.text(isDarkMode),
          ),
          decoration: InputDecoration(
            hintText: 'All',
            hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            filled: true,
            fillColor: AppColors.surface(isDarkMode),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.textMuted(isDarkMode)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.textMuted(isDarkMode)),
            ),
          ),
          onChanged: onChanged != null ? (v) => onChanged(int.tryParse(v)) : null,
        ),
      ],
    );
  }

  Widget _buildPageInput(String label, int? value, Function(int?) onChanged, bool isDarkMode) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 11, color: AppColors.textMuted(isDarkMode))),
        const SizedBox(height: 4),
        TextFormField(
          initialValue: value?.toString() ?? '',
          keyboardType: TextInputType.number,
          style: TextStyle(fontSize: 13, color: AppColors.text(isDarkMode)),
          decoration: InputDecoration(
            hintText: '1–604',
            hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            filled: true,
            fillColor: AppColors.surface(isDarkMode),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.textMuted(isDarkMode)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: AppColors.textMuted(isDarkMode)),
            ),
          ),
          onChanged: (v) {
            final parsed = int.tryParse(v);
            if (parsed != null && parsed >= 1 && parsed <= totalPages) {
              onChanged(parsed);
            } else if (v.isEmpty) {
              onChanged(null);
            }
          },
        ),
      ],
    );
  }

  Future<void> _selectDate(bool isDarkMode) async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: isDarkMode
                ? ColorScheme.dark(
                    primary: AppColors.cyan500,
                    surface: AppColors.surface(true),
                  )
                : ColorScheme.light(
                    primary: AppColors.cyan600,
                    surface: AppColors.surface(false),
                  ),
          ),
          child: child!,
        );
      },
    );
    if (date != null) {
      setState(() => _selectedDate = date);
    }
  }

  Future<void> _createClass() async {
    // Collect assignments
    final assignments = <Map<String, dynamic>>[];

    for (final type in ['hifz', 'sabqi', 'revision']) {
      if (_sectionEnabled[type]!) {
        for (final portion in _portions[type]!) {
          assignments.add({
            'type': type,
            'start_surah': portion.startSurah,
            'end_surah': portion.endSurah,
            'start_ayah': portion.startAyah,
            'end_ayah': portion.endAyah,
          });
        }
      }
    }

    if (assignments.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one portion')),
      );
      return;
    }

    setState(() => _isCreating = true);

    try {
      final dayName = AppConstants.daysOfWeek[_selectedDate.weekday % 7];
      final dateStr = '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

      final newClass = await ref.read(classesProvider.notifier).createClass(
        date: dateStr,
        day: dayName,
        assignments: assignments,
        studentIds: widget.studentId != null ? [widget.studentId!] : [],
      );

      // Refresh the report so the new class appears
      ref.invalidate(studentReportProvider);

      if (mounted) {
        // Close the bottom sheet, then navigate into the new class
        final classId = kIsWeb
            ? (newClass.supabaseId ?? newClass.id.toString())
            : newClass.id.toString();
        Navigator.pop(context);
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ClassroomScreen(classId: classId),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCreating = false);
      }
    }
  }
}

class PortionData {
  int startSurah;
  int endSurah;
  int? startAyah;
  int? endAyah;
  int? startPage;
  int? endPage;

  PortionData({
    required this.startSurah,
    required this.endSurah,
    this.startAyah,
    this.endAyah,
    this.startPage,
    this.endPage,
  });
}

/// Toggle chip for "By Surah" / "By Juz" mode selection.
class _ModeChip extends StatelessWidget {
  final String label;
  final bool isActive;
  final Color color;
  final bool isDarkMode;
  final VoidCallback onTap;

  const _ModeChip({
    required this.label,
    required this.isActive,
    required this.color,
    required this.isDarkMode,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? color.withOpacity(0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive ? color.withOpacity(0.5) : AppColors.textMuted(isDarkMode),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
            color: isActive ? color : AppColors.textSecondary(isDarkMode),
          ),
        ),
      ),
    );
  }
}


import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/app_colors.dart';
import '../../../config/constants.dart';
import '../../../data/quran_data.dart'
    show
        getJuzBoundary,
        pageStarts,
        totalPages,
        getPageForSurah,
        getLastPageForSurah;
import '../../providers/providers.dart';
import '../../providers/theme_provider.dart';
import '../../providers/report_provider.dart';
import '../../widgets/glassmorphic_card.dart';
import '../../widgets/premium_scaffold.dart';
import '../classroom/classroom_screen.dart';
import '../../../core/services/tour_service.dart';

class CreateClassScreen extends ConsumerStatefulWidget {
  final String? studentId;

  const CreateClassScreen({super.key, this.studentId});

  @override
  ConsumerState<CreateClassScreen> createState() => _CreateClassScreenState();
}

class _CreateClassScreenState extends ConsumerState<CreateClassScreen> {
  String? _selectedStudentId;
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
    _selectedStudentId = widget.studentId;
    if (_selectedStudentId != null) {
      _prefillFromPreviousClass();
    }
  }

  /// Fetch previous class data and auto-fill portion fields.
  Future<void> _prefillFromPreviousClass() async {
    if (_selectedStudentId == null) return;
    try {
      final suggestions = await ref.read(
        suggestedPortionsProvider(_selectedStudentId!).future,
      );
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
    final studentsAsync = ref.watch(teacherStudentsProvider);

    return Scaffold(
      backgroundColor: AppColors.ivory,
      body: Column(
        children: [
          Container(
            color: AppColors.navy,
            padding: const EdgeInsets.fromLTRB(8, 8, 18, 14),
            child: SafeArea(
              bottom: false,
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      'New Session',
                      style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                            color: Colors.white,
                          ),
                    ),
                  ),
                  const Icon(
                    Icons.check_circle,
                    color: AppColors.emerald400,
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Synced just now',
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ],
              ),
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
                    // Student selector
                    Container(
                      key: TourService.studentSelectorKey,
                      child: _buildStudentSelector(studentsAsync, isDarkMode),
                    ),
                    const SizedBox(height: 16),

                    // Date selector
                    _buildDateSelector(isDarkMode),
                    const SizedBox(height: 24),

                    // Sections
                    Text(
                      key: TourService.portionsSectionKey,
                      'Portions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.text(isDarkMode),
                      ),
                    ),
                    const SizedBox(height: 12),

                    _buildSection(
                      'hifz',
                      'Hifz (New Memorization)',
                      'New verses to memorize',
                      AppColors.hifzColor,
                      surahs,
                      isDarkMode,
                    ),
                    const SizedBox(height: 12),
                    _buildSection(
                      'sabqi',
                      'Sabqi (Recent)',
                      'Recently memorized, needs reinforcement',
                      AppColors.sabqiColor,
                      surahs,
                      isDarkMode,
                    ),
                    const SizedBox(height: 12),
                    _buildSection(
                      'revision',
                      'Revision (Manzil)',
                      'Long-term revision',
                      AppColors.revisionColor,
                      surahs,
                      isDarkMode,
                    ),

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
              color: AppColors.lightCard,
              border: Border(
                top: BorderSide(
                  color: AppColors.border(isDarkMode).withOpacity(0.5),
                ),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDarkMode ? 0.28 : 0.08),
                  blurRadius: 18,
                  offset: const Offset(0, -8),
                ),
              ],
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
                    child: Text(
                      'Cancel',
                      style: TextStyle(color: AppColors.text(isDarkMode)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    key: TourService.createSessionKey,
                    onPressed: _isCreating ? null : _createClass,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppColors.emerald,
                    ),
                    child: _isCreating
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Create Session'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudentSelector(
    AsyncValue<List<({String id, String name})>> studentsAsync,
    bool isDarkMode,
  ) {
    return studentsAsync.when(
      data: (students) {
        if (students.isEmpty) {
          return GlassmorphicCard(
            padding: const EdgeInsets.all(16),
            child: Text(
              'No contacts yet. Add contacts from the dashboard first.',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textMuted(isDarkMode),
              ),
            ),
          );
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Reciter',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: AppColors.text(isDarkMode),
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: AppColors.softSurface(isDarkMode),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _selectedStudentId != null
                      ? AppColors.cyan500.withOpacity(0.5)
                      : AppColors.border(isDarkMode),
                  width: _selectedStudentId != null ? 2 : 1,
                ),
              ),
              child: DropdownButton<String>(
                value: _selectedStudentId,
                hint: Text(
                  'Select a reciter',
                  style: TextStyle(color: AppColors.textMuted(isDarkMode)),
                ),
                isExpanded: true,
                dropdownColor: AppColors.surface(isDarkMode),
                underline: const SizedBox(),
                style: TextStyle(
                  fontSize: 15,
                  color: AppColors.text(isDarkMode),
                ),
                items: students
                    .map(
                      (s) => DropdownMenuItem(
                        value: s.id,
                        child: Row(
                          children: [
                            Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: AppColors.cyan500.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(7),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                s.name.isNotEmpty
                                    ? s.name[0].toUpperCase()
                                    : '?',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.cyan500,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                s.name,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedStudentId = value);
                    _prefillFromPreviousClass();
                    if (TourService.isTourActive) {
                      TourService.completeInteraction();
                    }
                  }
                },
              ),
            ),
          ],
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Text(
        'Error loading contacts: $e',
        style: const TextStyle(color: AppColors.error),
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
                color: AppColors.softSurface(isDarkMode),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border(isDarkMode)),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.calendar_today_rounded,
                    color: AppColors.textSecondary(isDarkMode),
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Text(
                    '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}',
                    style: TextStyle(
                      fontSize: 16,
                      color: AppColors.text(isDarkMode),
                    ),
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
              color: AppColors.softSurface(isDarkMode),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border(isDarkMode)),
            ),
            child: Text(
              dayName,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: AppColors.text(isDarkMode),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSection(
    String type,
    String label,
    String description,
    Color color,
    List surahs,
    bool isDarkMode,
  ) {
    final isEnabled = _sectionEnabled[type]!;
    final portions = _portions[type]!;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        gradient: isEnabled
            ? LinearGradient(
                colors: [
                  color.withOpacity(isDarkMode ? 0.18 : 0.12),
                  AppColors.surface(
                    isDarkMode,
                  ).withOpacity(isDarkMode ? 0.82 : 0.96),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: isEnabled ? null : AppColors.softSurface(isDarkMode),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isEnabled
              ? color.withOpacity(0.3)
              : AppColors.border(isDarkMode),
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
                            color: isEnabled
                                ? color
                                : AppColors.textSecondary(isDarkMode),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          description,
                          style: TextStyle(
                            fontSize: 12,
                            color: isEnabled
                                ? AppColors.textSecondary(isDarkMode)
                                : AppColors.textMuted(isDarkMode),
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
                  color: AppColors.surface(
                    isDarkMode,
                  ).withOpacity(isDarkMode ? 0.76 : 0.9),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.border(isDarkMode).withOpacity(0.5),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Portion ${index + 1}',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary(isDarkMode),
                          ),
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
                            portion.startPage = getPageForSurah(
                              portion.startSurah,
                            );
                            portion.endPage = getLastPageForSurah(
                              portion.endSurah,
                            );
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
                                    if (portion.endPage != null &&
                                        portion.endPage! < v) {
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
                            child: _buildPageInput('To Page', portion.endPage, (
                              v,
                            ) {
                              setState(() {
                                portion.endPage = v;
                                if (v != null && v >= 1 && v <= totalPages) {
                                  portion.endSurah = pageStarts[v - 1][0];
                                }
                              });
                            }, isDarkMode),
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
                          color: AppColors.softSurface(isDarkMode),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.textMuted(isDarkMode),
                          ),
                        ),
                        child: DropdownButton<int>(
                          value: selectedJuz,
                          hint: Text(
                            'Select Juz',
                            style: TextStyle(
                              color: AppColors.textMuted(isDarkMode),
                            ),
                          ),
                          isExpanded: true,
                          dropdownColor: AppColors.surface(isDarkMode),
                          underline: const SizedBox(),
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.text(isDarkMode),
                          ),
                          items: List.generate(
                            30,
                            (i) => DropdownMenuItem(
                              value: i + 1,
                              child: Text('Juz ${i + 1}'),
                            ),
                          ),
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
                            (isJuzMode || isPageMode)
                                ? null
                                : (v) => setState(() {
                                    portion.startSurah = v;
                                    portion.endSurah = v;
                                    portion.startAyah = null;
                                    portion.endAyah = null;
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
                            (isJuzMode || isPageMode)
                                ? null
                                : (v) => setState(() {
                                    portion.endSurah = v;
                                    portion.endAyah = null;
                                  }),
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
                            (isJuzMode || isPageMode)
                                ? null
                                : (v) => setState(() => portion.startAyah = v),
                            isDarkMode,
                            fieldKey: ValueKey(
                              '${type}_${index}_startAyah_${portion.startSurah}',
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildAyahInput(
                            'To Ayah',
                            portion.endAyah,
                            (isJuzMode || isPageMode)
                                ? null
                                : (v) => setState(() => portion.endAyah = v),
                            isDarkMode,
                            fieldKey: ValueKey(
                              '${type}_${index}_endAyah_${portion.endSurah}',
                            ),
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
                label: Text(
                  'Add Another Portion',
                  style: TextStyle(color: color),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSurahDropdown(
    String label,
    int value,
    List surahs,
    Function(int)? onChanged,
    bool isDarkMode,
  ) {
    final isReadOnly = onChanged == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: AppColors.textMuted(isDarkMode),
          ),
        ),
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
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.text(isDarkMode),
                ),
                items: surahs.map<DropdownMenuItem<int>>((s) {
                  return DropdownMenuItem(
                    value: s.number,
                    child: Text(
                      '${s.number}. ${s.englishName}',
                      overflow: TextOverflow.ellipsis,
                    ),
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

  Widget _buildAyahInput(
    String label,
    int? value,
    Function(int?)? onChanged,
    bool isDarkMode, {
    Key? fieldKey,
  }) {
    final isReadOnly = onChanged == null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: AppColors.textMuted(isDarkMode),
          ),
        ),
        const SizedBox(height: 4),
        TextFormField(
          key: fieldKey,
          initialValue: value?.toString() ?? '',
          keyboardType: TextInputType.number,
          readOnly: isReadOnly,
          style: TextStyle(
            fontSize: 13,
            color: isReadOnly
                ? AppColors.textMuted(isDarkMode)
                : AppColors.text(isDarkMode),
          ),
          decoration: InputDecoration(
            hintText: 'All',
            hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
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
          onChanged: onChanged != null
              ? (v) => onChanged(int.tryParse(v))
              : null,
        ),
      ],
    );
  }

  Widget _buildPageInput(
    String label,
    int? value,
    Function(int?) onChanged,
    bool isDarkMode,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: AppColors.textMuted(isDarkMode),
          ),
        ),
        const SizedBox(height: 4),
        TextFormField(
          initialValue: value?.toString() ?? '',
          keyboardType: TextInputType.number,
          style: TextStyle(fontSize: 13, color: AppColors.text(isDarkMode)),
          decoration: InputDecoration(
            hintText: '1–604',
            hintStyle: TextStyle(color: AppColors.textMuted(isDarkMode)),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
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
        for (int i = 0; i < _portions[type]!.length; i++) {
          final portion = _portions[type]![i];
          final mode = _getPortionMode(type, i);

          int startSurah = portion.startSurah;
          int endSurah = portion.endSurah;
          int? startAyah = portion.startAyah;
          int? endAyah = portion.endAyah;

          // For "page" mode: convert page boundaries to exact surah:ayah
          if (mode == 'page' &&
              portion.startPage != null &&
              portion.endPage != null) {
            final sp = portion.startPage!;
            final ep = portion.endPage!;

            // Start: first ayah on startPage
            startSurah = pageStarts[sp - 1][0];
            startAyah = pageStarts[sp - 1][1];

            // End: last ayah on endPage = one before first ayah on endPage+1
            if (ep < totalPages) {
              final nextPageSurah =
                  pageStarts[ep][0]; // ep is 0-indexed for next page
              final nextPageAyah = pageStarts[ep][1];
              if (nextPageAyah > 1) {
                // Same surah continues onto next page
                endSurah = nextPageSurah;
                endAyah = nextPageAyah - 1;
              } else {
                // Next page starts a new surah at ayah 1
                // So end page's last ayah is the last ayah of the previous surah
                endSurah = nextPageSurah - 1;
                endAyah =
                    null; // null = last ayah of surah (handled by getPageRange)
              }
            } else {
              // Last page of the Quran
              endSurah = 114;
              endAyah = null;
            }
          }

          assignments.add({
            'type': type,
            'start_surah': startSurah,
            'end_surah': endSurah,
            'start_ayah': startAyah,
            'end_ayah': endAyah,
          });
        }
      }
    }

    if (_selectedStudentId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select a reciter')));
      return;
    }

    if (assignments.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one portion')),
      );
      return;
    }

    final navigator = Navigator.of(context);
    setState(() => _isCreating = true);

    try {
      final dayName = AppConstants.daysOfWeek[_selectedDate.weekday % 7];
      final dateStr =
          '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}';

      final newClass = await ref
          .read(classesProvider.notifier)
          .createClass(
            date: dateStr,
            day: dayName,
            assignments: assignments,
            studentIds: [_selectedStudentId!],
          );

      // Refresh the report so the new class appears
      ref.invalidate(studentReportProvider);

      if (mounted) {
        final classId = newClass.supabaseId ?? newClass.id.toString();

        if (TourService.isTourActive) {
          await TourService.saveTourClassId(classId);
          TourService.completeInteraction();
        }

        // Keep the NavigatorState before the async creation call. Using this
        // bottom-sheet BuildContext after popping it caused intermittent gray
        // screens until a back/refresh cycle.
        navigator.pop();
        await Future<void>.delayed(Duration.zero);
        await navigator.push(
          MaterialPageRoute(builder: (_) => ClassroomScreen(classId: classId)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
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
    return PremiumPill(
      label: label,
      color: color,
      selected: isActive,
      onTap: onTap,
    );
  }
}

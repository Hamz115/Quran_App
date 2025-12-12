import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../config/theme.dart';
import '../../../config/constants.dart';
import '../../providers/providers.dart';

class CreateClassScreen extends ConsumerStatefulWidget {
  const CreateClassScreen({super.key});

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

  bool _isCreating = false;

  @override
  Widget build(BuildContext context) {
    final surahsAsync = ref.watch(surahListProvider);

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: AppTheme.slate800,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.slate600,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'New Class',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.slate100,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Configure today\'s teaching session',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.slate400,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded),
                  color: AppTheme.slate400,
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
                    _buildDateSelector(),
                    const SizedBox(height: 24),

                    // Sections
                    const Text(
                      'Portions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.slate200,
                      ),
                    ),
                    const SizedBox(height: 12),

                    _buildSection('hifz', 'Hifz (New Memorization)', 'New verses to memorize', AppTheme.emerald400, surahs),
                    const SizedBox(height: 12),
                    _buildSection('sabqi', 'Sabqi (Recent)', 'Recently memorized, needs reinforcement', AppTheme.sabqiColor, surahs),
                    const SizedBox(height: 12),
                    _buildSection('revision', 'Revision (Manzil)', 'Long-term revision', AppTheme.revisionColor, surahs),

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
              color: AppTheme.slate800,
              border: Border(top: BorderSide(color: AppTheme.slate700.withOpacity(0.5))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: AppTheme.slate600),
                    ),
                    child: const Text('Cancel', style: TextStyle(color: AppTheme.slate300)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isCreating ? null : _createClass,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: AppTheme.emerald500,
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

  Widget _buildDateSelector() {
    final dayName = AppConstants.daysOfWeek[_selectedDate.weekday % 7];

    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: _selectDate,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.slate900,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.slate700),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_today_rounded, color: AppTheme.slate400, size: 20),
                  const SizedBox(width: 12),
                  Text(
                    '${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 16, color: AppTheme.slate100),
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
              color: AppTheme.slate900.withOpacity(0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.slate700),
            ),
            child: Text(
              dayName,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppTheme.slate300),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSection(String type, String label, String description, Color color, List surahs) {
    final isEnabled = _sectionEnabled[type]!;
    final portions = _portions[type]!;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: isEnabled ? color.withOpacity(0.1) : AppTheme.slate900.withOpacity(0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isEnabled ? color.withOpacity(0.3) : AppTheme.slate700,
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
                            color: isEnabled ? color : AppTheme.slate400,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          description,
                          style: TextStyle(
                            fontSize: 12,
                            color: isEnabled ? AppTheme.slate400 : AppTheme.slate500,
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

              return Container(
                margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.slate900.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.slate700.withOpacity(0.5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Portion ${index + 1}',
                          style: const TextStyle(fontSize: 12, color: AppTheme.slate400),
                        ),
                        const Spacer(),
                        if (portions.length > 1)
                          IconButton(
                            onPressed: () => setState(() => portions.removeAt(index)),
                            icon: const Icon(Icons.close_rounded, size: 18),
                            color: AppTheme.slate500,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _buildSurahDropdown(
                            'From Surah',
                            portion.startSurah,
                            surahs,
                            (v) => setState(() {
                              portion.startSurah = v;
                              portion.endSurah = v;
                            }),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildSurahDropdown(
                            'To Surah',
                            portion.endSurah,
                            surahs,
                            (v) => setState(() => portion.endSurah = v),
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
                            (v) => setState(() => portion.startAyah = v),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _buildAyahInput(
                            'To Ayah',
                            portion.endAyah,
                            (v) => setState(() => portion.endAyah = v),
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

  Widget _buildSurahDropdown(String label, int value, List surahs, Function(int) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.slate500)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: AppTheme.slate800,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppTheme.slate600),
          ),
          child: DropdownButton<int>(
            value: value,
            isExpanded: true,
            dropdownColor: AppTheme.slate800,
            underline: const SizedBox(),
            style: const TextStyle(fontSize: 13, color: AppTheme.slate100),
            items: surahs.map<DropdownMenuItem<int>>((s) {
              return DropdownMenuItem(
                value: s.number,
                child: Text('${s.number}. ${s.englishName}', overflow: TextOverflow.ellipsis),
              );
            }).toList(),
            onChanged: (v) => onChanged(v!),
          ),
        ),
      ],
    );
  }

  Widget _buildAyahInput(String label, int? value, Function(int?) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.slate500)),
        const SizedBox(height: 4),
        TextFormField(
          initialValue: value?.toString() ?? '',
          keyboardType: TextInputType.number,
          style: const TextStyle(fontSize: 13, color: AppTheme.slate100),
          decoration: InputDecoration(
            hintText: 'All',
            hintStyle: const TextStyle(color: AppTheme.slate500),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            filled: true,
            fillColor: AppTheme.slate800,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppTheme.slate600),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: AppTheme.slate600),
            ),
          ),
          onChanged: (v) => onChanged(int.tryParse(v)),
        ),
      ],
    );
  }

  Future<void> _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: AppTheme.emerald500,
              surface: AppTheme.slate800,
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

      await ref.read(classesProvider.notifier).createClass(
        date: dateStr,
        day: dayName,
        assignments: assignments,
      );

      if (mounted) {
        Navigator.pop(context);
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

  PortionData({
    required this.startSurah,
    required this.endSurah,
    this.startAyah,
    this.endAyah,
  });
}

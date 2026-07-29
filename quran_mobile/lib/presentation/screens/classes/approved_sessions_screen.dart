import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_colors.dart';
import '../../../config/constants.dart';
import '../../../data/models/class_session.dart';
import '../../providers/auth_provider.dart';
import '../../providers/providers.dart';
import '../../widgets/approved_ui.dart';
import '../classroom/classroom_screen.dart';
import '../reports/approved_reports_screen.dart';
import 'create_class_screen.dart';

class ApprovedSessionsScreen extends ConsumerStatefulWidget {
  const ApprovedSessionsScreen({super.key});

  @override
  ConsumerState<ApprovedSessionsScreen> createState() =>
      _ApprovedSessionsScreenState();
}

class _ApprovedSessionsScreenState
    extends ConsumerState<ApprovedSessionsScreen> {
  int _role = 0;
  int _filter = 0;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final classesAsync = _role == 0
        ? ref.watch(classesProvider)
        : ref.watch(enrolledClassesProvider);
    final names = ref.watch(classStudentNamesProvider).valueOrNull ?? const {};
    final initials = (user?.fullName ?? 'QuranTrack User')
        .split(' ')
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0])
        .join()
        .toUpperCase();

    return Scaffold(
      backgroundColor: AppColors.ivory,
      body: Column(
        children: [
          ApprovedBrandHeader(initials: initials),
          Expanded(
            child: RefreshIndicator(
              color: AppColors.emerald,
              onRefresh: () => ref.read(classesProvider.notifier).loadClasses(),
              child: CustomScrollView(
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Sessions',
                                style: Theme.of(context).textTheme.headlineLarge,
                              ),
                            ),
                            SizedBox(
                              width: 150,
                              child: ApprovedPrimaryButton(
                                label: 'New Session',
                                icon: Icons.add,
                                onPressed: _role == 0
                                    ? () => _showNewSession(context)
                                    : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerRight,
                          child: OutlinedButton.icon(
                            onPressed: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) =>
                                    const ApprovedReportsScreen(),
                              ),
                            ),
                            icon: const Icon(Icons.bar_chart, size: 18),
                            label: const Text('Reports & performance'),
                          ),
                        ),
                        const SizedBox(height: 18),
                        _SegmentedRole(
                          selected: _role,
                          onChanged: (value) => setState(() => _role = value),
                        ),
                        const SizedBox(height: 14),
                        _FilterBar(
                          selected: _filter,
                          onChanged: (value) => setState(() => _filter = value),
                        ),
                        const SizedBox(height: 18),
                        classesAsync.when(
                          loading: () => const Padding(
                            padding: EdgeInsets.all(60),
                            child: Center(
                              child: CircularProgressIndicator(
                                color: AppColors.emerald,
                              ),
                            ),
                          ),
                          error: (error, _) => ApprovedCard(
                            child: Text('Unable to load sessions: $error'),
                          ),
                          data: (sessions) => _SessionList(
                            sessions: _filtered(sessions),
                            names: names,
                            onTap: _openClass,
                          ),
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<ClassSession> _filtered(List<ClassSession> sessions) {
    if (_filter == 0) return sessions;
    if (_filter == 2) {
      return sessions
          .where((session) => session.performance == 'Needs Work')
          .toList();
    }
    final now = DateTime.now();
    return sessions.where((session) {
      final date = DateTime.tryParse(session.date);
      return date != null && now.difference(date).inDays <= 7;
    }).toList();
  }

  void _showNewSession(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const CreateClassScreen()),
    );
  }

  void _openClass(ClassSession session) {
    final id = session.supabaseId ?? session.id?.toString();
    if (id == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ClassroomScreen(classId: id)),
    );
  }
}

class _SegmentedRole extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onChanged;

  const _SegmentedRole({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return ApprovedCard(
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          _RoleButton(
            label: 'Listening (مستمع)',
            icon: Icons.headphones_outlined,
            selected: selected == 0,
            onTap: () => onChanged(0),
          ),
          _RoleButton(
            label: 'Reciting (قارئ)',
            icon: Icons.mic_none,
            selected: selected == 1,
            onTap: () => onChanged(1),
          ),
        ],
      ),
    );
  }
}

class _RoleButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _RoleButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          height: 48,
          decoration: BoxDecoration(
            color: selected ? AppColors.emerald : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 19,
                color: selected ? Colors.white : AppColors.ink,
              ),
              const SizedBox(width: 7),
              Flexible(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: selected ? Colors.white : AppColors.ink,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  final int selected;
  final ValueChanged<int> onChanged;

  const _FilterBar({required this.selected, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    const labels = ['All', 'This week', 'Needs attention'];
    return Row(
      children: List.generate(labels.length, (index) {
        final active = index == selected;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: index == labels.length - 1 ? 0 : 8),
            child: OutlinedButton(
              onPressed: () => onChanged(index),
              style: OutlinedButton.styleFrom(
                backgroundColor: active ? AppColors.emerald : Colors.transparent,
                foregroundColor: active ? Colors.white : AppColors.ink,
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
              ),
              child: Text(
                labels[index],
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11),
              ),
            ),
          ),
        );
      }),
    );
  }
}

class _SessionList extends StatelessWidget {
  final List<ClassSession> sessions;
  final Map<String, List<String>> names;
  final ValueChanged<ClassSession> onTap;

  const _SessionList({
    required this.sessions,
    required this.names,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (sessions.isEmpty) {
      return const ApprovedCard(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 36),
          child: Center(child: Text('No sessions match this filter.')),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ...sessions.map((session) {
          final assignment = session.assignments.firstOrNull;
          final name =
              names[session.supabaseId]?.firstOrNull ?? 'Recitation session';
          final portion = assignment == null
              ? 'No portion'
              : AppConstants.formatPortionLabel(
                  startSurah: assignment.startSurah,
                  endSurah: assignment.endSurah,
                  startAyah: assignment.startAyah,
                  endAyah: assignment.endAyah,
                );
          final performance = session.performance ?? 'Not rated';
          final needsAttention = performance == 'Needs Work';

          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: InkWell(
              onTap: () => onTap(session),
              borderRadius: BorderRadius.circular(12),
              child: ApprovedCard(
                child: Row(
                  children: [
                    ApprovedInitialsAvatar(
                      name: name,
                      navy: session.hashCode.isEven,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          Text(
                            '${session.day} • ${session.date}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$portion • ${assignment?.type.toUpperCase() ?? 'SESSION'}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    ApprovedStatusBadge(
                      label: needsAttention ? 'Needs review' : performance,
                      color: needsAttention
                          ? AppColors.amber600
                          : AppColors.emeraldDark,
                    ),
                    const Icon(
                      Icons.chevron_right,
                      color: AppColors.inkMuted,
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 8),
        ApprovedCard(
          child: Row(
            children: [
              const Icon(Icons.trending_up, color: AppColors.emerald),
              const SizedBox(width: 10),
              Text(
                'This week summary',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const Spacer(),
              Text('${sessions.length} sessions'),
            ],
          ),
        ),
      ],
    );
  }
}

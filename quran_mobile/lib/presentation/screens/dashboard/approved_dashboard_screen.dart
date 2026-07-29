import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_colors.dart';
import '../../../config/constants.dart';
import '../../../data/models/class_session.dart';
import '../../providers/auth_provider.dart';
import '../../providers/providers.dart';
import '../../providers/quran_page_provider.dart';
import '../../widgets/approved_ui.dart';
import '../classes/create_class_screen.dart';
import '../classroom/classroom_screen.dart';
import '../contacts/approved_contacts_screen.dart';
import '../reports/approved_reports_screen.dart';

class ApprovedDashboardScreen extends ConsumerWidget {
  const ApprovedDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final classes = ref.watch(classesProvider).valueOrNull ?? const <ClassSession>[];
    final contacts = ref.watch(teacherStudentsProvider).valueOrNull ?? const [];
    final names = ref.watch(classStudentNamesProvider).valueOrNull ?? const {};
    final stats = ref.watch(statsProvider).valueOrNull ?? const <String, dynamic>{};
    final topMistakes = ref.watch(topMistakesProvider).valueOrNull ?? const [];
    final currentPage = ref.watch(currentPageProvider);
    final initials = _initials(user?.fullName ?? 'QuranTrack User');

    return Scaffold(
      backgroundColor: AppColors.ivory,
      body: RefreshIndicator(
        color: AppColors.emerald,
        onRefresh: () async {
          await ref.read(classesProvider.notifier).loadClasses();
          ref.invalidate(teacherStudentsProvider);
          ref.invalidate(classStudentNamesProvider);
          ref.invalidate(statsProvider);
          ref.invalidate(topMistakesProvider);
        },
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: ApprovedBrandHeader(initials: initials),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 30),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Overview',
                          style: Theme.of(context).textTheme.headlineLarge,
                        ),
                      ),
                      SizedBox(
                        width: 150,
                        child: ApprovedPrimaryButton(
                          label: 'New Session',
                          icon: Icons.play_arrow_rounded,
                          onPressed: () => _showNewSession(context),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  _NextActionCard(
                    session: classes.firstOrNull,
                    names: names,
                    onStart: classes.isEmpty
                        ? () => _showNewSession(context)
                        : () => _openClass(context, classes.first),
                  ),
                  const SizedBox(height: 16),
                  InkWell(
                    onTap: () => _openReports(context),
                    child: _WeeklyProgressCard(
                      sessions: classes.length,
                      contacts: contacts.length,
                      mistakes:
                          (stats['totalMistakes'] as num?)?.toInt() ?? 0,
                    ),
                  ),
                  const SizedBox(height: 16),
                  InkWell(
                    onTap: () => _openContacts(context),
                    child: _ContactsCard(contacts: contacts),
                  ),
                  const SizedBox(height: 16),
                  _RecentSessionsCard(
                    sessions: classes.take(4).toList(),
                    names: names,
                    onTap: (session) => _openClass(context, session),
                  ),
                  const SizedBox(height: 16),
                  InkWell(
                    onTap: () => _openReports(context),
                    child: _InsightsCard(
                      repeated: topMistakes.length,
                      total:
                          (stats['totalMistakes'] as num?)?.toInt() ?? 0,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ApprovedCard(
                    child: Row(
                      children: [
                        const Icon(
                          Icons.auto_stories_outlined,
                          color: AppColors.goldMuted,
                          size: 30,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Last read',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Continue from page $currentPage',
                                style: Theme.of(context).textTheme.bodyMedium,
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: AppColors.inkMuted),
                      ],
                    ),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showNewSession(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const CreateClassScreen()),
    );
  }

  void _openClass(BuildContext context, ClassSession session) {
    final id = session.supabaseId ?? session.id?.toString();
    if (id == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ClassroomScreen(classId: id)),
    );
  }

  void _openContacts(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ApprovedContactsScreen()),
    );
  }

  void _openReports(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ApprovedReportsScreen()),
    );
  }

  static String _initials(String value) {
    return value
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .take(2)
        .map((part) => part[0])
        .join()
        .toUpperCase();
  }
}

class _NextActionCard extends StatelessWidget {
  final ClassSession? session;
  final Map<String, List<String>> names;
  final VoidCallback onStart;

  const _NextActionCard({
    required this.session,
    required this.names,
    required this.onStart,
  });

  @override
  Widget build(BuildContext context) {
    final assignment = session?.assignments.firstOrNull;
    final sessionId = session?.supabaseId;
    final contact = sessionId == null
        ? null
        : names[sessionId]?.firstOrNull;
    final name = contact ?? 'Choose a contact';
    final portion = assignment == null
        ? 'Create a listening or reciting session'
        : AppConstants.formatPortionLabel(
            startSurah: assignment.startSurah,
            endSurah: assignment.endSurah,
            startAyah: assignment.startAyah,
            endAyah: assignment.endAyah,
          );

    return ApprovedCard(
      child: Column(
        children: [
          const ApprovedSectionTitle(
            icon: Icons.auto_awesome_outlined,
            title: 'Today',
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              ApprovedInitialsAvatar(name: name, size: 56),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Next best action',
                      style: TextStyle(
                        color: AppColors.goldMuted,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(name, style: Theme.of(context).textTheme.titleLarge),
                    Text(
                      portion,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              ApprovedStatusBadge(
                label: session == null ? 'Ready' : 'Due today',
                color: AppColors.goldMuted,
              ),
            ],
          ),
          if (assignment != null) ...[
            const SizedBox(height: 14),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _Meta(icon: Icons.auto_stories_outlined, value: portion),
                _Meta(
                  icon: Icons.bookmark_border,
                  value: assignment.type.toUpperCase(),
                ),
                const _Meta(icon: Icons.format_list_bulleted, value: 'Individual'),
              ],
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ApprovedPrimaryButton(
              label: session == null ? 'New Session' : 'Start Session',
              icon: Icons.play_arrow_rounded,
              onPressed: onStart,
            ),
          ),
        ],
      ),
    );
  }
}

class _Meta extends StatelessWidget {
  final IconData icon;
  final String value;

  const _Meta({required this.icon, required this.value});

  @override
  Widget build(BuildContext context) {
    return Flexible(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppColors.goldMuted, size: 18),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: AppColors.ink),
            ),
          ),
        ],
      ),
    );
  }
}

class _WeeklyProgressCard extends StatelessWidget {
  final int sessions;
  final int contacts;
  final int mistakes;

  const _WeeklyProgressCard({
    required this.sessions,
    required this.contacts,
    required this.mistakes,
  });

  @override
  Widget build(BuildContext context) {
    return ApprovedCard(
      child: Column(
        children: [
          const ApprovedSectionTitle(
            icon: Icons.trending_up,
            title: 'This week’s progress',
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 44,
            child: CustomPaint(
              painter: _ProgressPainter(),
              child: const SizedBox.expand(),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _Stat(value: '$sessions', label: 'Sessions'),
              _Stat(value: '$contacts', label: 'Contacts'),
              _Stat(value: '$mistakes', label: 'Mistakes'),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProgressPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.emeraldDark
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    final points = <Offset>[
      Offset(0, size.height * .72),
      Offset(size.width * .17, size.height * .42),
      Offset(size.width * .34, size.height * .76),
      Offset(size.width * .51, size.height * .52),
      Offset(size.width * .68, size.height * .2),
      Offset(size.width * .84, size.height * .58),
      Offset(size.width, size.height * .28),
    ];
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    canvas.drawPath(path, paint);
    for (final point in points) {
      canvas.drawCircle(
        point,
        3.5,
        Paint()
          ..color = AppColors.ivory
          ..style = PaintingStyle.fill,
      );
      canvas.drawCircle(point, 3.5, paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _Stat extends StatelessWidget {
  final String value;
  final String label;

  const _Stat({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: Theme.of(context).textTheme.titleLarge),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _ContactsCard extends StatelessWidget {
  final List<({String id, String name})> contacts;

  const _ContactsCard({required this.contacts});

  @override
  Widget build(BuildContext context) {
    return ApprovedCard(
      child: Column(
        children: [
          const ApprovedSectionTitle(
            icon: Icons.people_outline,
            title: 'Contacts needing attention',
          ),
          const SizedBox(height: 8),
          if (contacts.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: Text('Add contacts to begin tracking recitation.'),
            )
          else
            ...contacts.take(3).map(
              (contact) => _CompactRow(
                name: contact.name,
                subtitle: 'Ready for the next recitation',
                status: 'Review',
              ),
            ),
        ],
      ),
    );
  }
}

class _RecentSessionsCard extends StatelessWidget {
  final List<ClassSession> sessions;
  final Map<String, List<String>> names;
  final ValueChanged<ClassSession> onTap;

  const _RecentSessionsCard({
    required this.sessions,
    required this.names,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ApprovedCard(
      child: Column(
        children: [
          const ApprovedSectionTitle(
            icon: Icons.schedule,
            title: 'Recent sessions',
          ),
          const SizedBox(height: 8),
          if (sessions.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 18),
              child: Text('No sessions yet.'),
            )
          else
            ...sessions.map((session) {
              final assignment = session.assignments.firstOrNull;
              final name =
                  names[session.supabaseId]?.firstOrNull ?? 'Recitation session';
              final portion = assignment == null
                  ? session.day
                  : AppConstants.formatPortionLabel(
                      startSurah: assignment.startSurah,
                      endSurah: assignment.endSurah,
                      startAyah: assignment.startAyah,
                      endAyah: assignment.endAyah,
                    );
              return InkWell(
                onTap: () => onTap(session),
                child: _CompactRow(
                  name: name,
                  subtitle: '$portion • ${session.performance ?? 'Not rated'}',
                  status: session.day,
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _CompactRow extends StatelessWidget {
  final String name;
  final String subtitle;
  final String status;

  const _CompactRow({
    required this.name,
    required this.subtitle,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 11),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.goldBorder)),
      ),
      child: Row(
        children: [
          ApprovedInitialsAvatar(name: name, size: 38),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: Theme.of(context).textTheme.titleMedium),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(status, style: Theme.of(context).textTheme.bodySmall),
          const Icon(Icons.chevron_right, size: 18, color: AppColors.inkMuted),
        ],
      ),
    );
  }
}

class _InsightsCard extends StatelessWidget {
  final int repeated;
  final int total;

  const _InsightsCard({required this.repeated, required this.total});

  @override
  Widget build(BuildContext context) {
    return ApprovedCard(
      child: Column(
        children: [
          const ApprovedSectionTitle(
            icon: Icons.lightbulb_outline,
            title: 'Recitation insights',
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _Insight(value: '$total', label: 'Mistakes'),
              _Insight(value: '$repeated', label: 'Repeated'),
              const _Insight(value: '—', label: 'Performance'),
            ],
          ),
        ],
      ),
    );
  }
}

class _Insight extends StatelessWidget {
  final String value;
  final String label;

  const _Insight({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: const BoxDecoration(
          border: Border(right: BorderSide(color: AppColors.goldBorder)),
        ),
        child: Column(
          children: [
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            Text(label, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

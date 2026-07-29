import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../config/app_colors.dart';
import '../../../data/models/student_report.dart';
import '../../providers/auth_provider.dart';
import '../../providers/providers.dart';
import '../../providers/report_provider.dart';
import '../../widgets/approved_ui.dart';
import '../mistakes/approved_mistakes_screen.dart';

class ApprovedReportsScreen extends ConsumerStatefulWidget {
  final String? initialContactId;

  const ApprovedReportsScreen({super.key, this.initialContactId});

  @override
  ConsumerState<ApprovedReportsScreen> createState() =>
      _ApprovedReportsScreenState();
}

class _ApprovedReportsScreenState
    extends ConsumerState<ApprovedReportsScreen> {
  String? _contactId;

  @override
  void initState() {
    super.initState();
    _contactId = widget.initialContactId;
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authProvider).user;
    final contactsAsync = ref.watch(teacherStudentsProvider);
    return Scaffold(
      backgroundColor: AppColors.ivory,
      body: Column(
        children: [
          ApprovedBrandHeader(initials: _initials(user?.fullName ?? 'QT')),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
              children: [
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back),
                    ),
                    Expanded(
                      child: Text(
                        'Reports',
                        style: Theme.of(context).textTheme.headlineLarge,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                contactsAsync.when(
                  loading: () => const LinearProgressIndicator(),
                  error: (error, _) => Text('Unable to load contacts: $error'),
                  data: (contacts) {
                    final selected = _contactId ??
                        (contacts.isEmpty ? null : contacts.first.id);
                    if (_contactId == null && selected != null) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) setState(() => _contactId = selected);
                      });
                    }
                    return DropdownButtonFormField<String>(
                      value: contacts.any((item) => item.id == selected)
                          ? selected
                          : null,
                      decoration: const InputDecoration(
                        labelText: 'Contact',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      items: contacts
                          .map(
                            (item) => DropdownMenuItem(
                              value: item.id,
                              child: Text(item.name),
                            ),
                          )
                          .toList(),
                      onChanged: (value) => setState(() => _contactId = value),
                    );
                  },
                ),
                const SizedBox(height: 16),
                if (_contactId == null)
                  const ApprovedCard(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 28),
                      child: Center(
                        child: Text('Add a contact to view reports.'),
                      ),
                    ),
                  )
                else
                  ref.watch(studentReportProvider(_contactId!)).when(
                        loading: () => const Padding(
                          padding: EdgeInsets.all(52),
                          child: Center(child: CircularProgressIndicator()),
                        ),
                        error: (error, _) => ApprovedCard(
                          child: Text('Unable to load report: $error'),
                        ),
                        data: (report) => _ReportBody(
                          report: report,
                          onMistakes: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ApprovedMistakesScreen(
                                report: report,
                              ),
                            ),
                          ),
                        ),
                      ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _initials(String value) => value
      .split(RegExp(r'\s+'))
      .where((part) => part.isNotEmpty)
      .take(2)
      .map((part) => part[0])
      .join()
      .toUpperCase();
}

class _ReportBody extends StatelessWidget {
  final StudentReport report;
  final VoidCallback onMistakes;

  const _ReportBody({required this.report, required this.onMistakes});

  @override
  Widget build(BuildContext context) {
    final summary = report.summary;
    return Column(
      children: [
        ApprovedCard(
          child: Row(
            children: [
              ApprovedInitialsAvatar(name: report.student.name, size: 54),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report.student.name,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    Text(
                      report.student.email,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const ApprovedStatusBadge(label: 'Listening'),
            ],
          ),
        ),
        const SizedBox(height: 14),
        ApprovedCard(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            children: [
              _Metric(value: '${summary.totalClasses}', label: 'Sessions'),
              _Metric(value: '${summary.totalMistakes}', label: 'Mistakes'),
              _Metric(value: '${summary.uniqueMistakes}', label: 'Unique'),
              _Metric(value: summary.avgPerformance, label: 'Average'),
            ],
          ),
        ),
        const SizedBox(height: 14),
        ApprovedCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const ApprovedSectionTitle(
                icon: Icons.show_chart,
                title: 'Performance trend',
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 150,
                child: CustomPaint(
                  painter: _TrendPainter(report.performanceTrend),
                  child: const SizedBox.expand(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        InkWell(
          onTap: onMistakes,
          child: ApprovedCard(
            child: Column(
              children: [
                const ApprovedSectionTitle(
                  icon: Icons.error_outline,
                  title: 'Mistakes needing review',
                  trailing: Icon(Icons.chevron_right),
                ),
                const SizedBox(height: 10),
                if (report.repeatedMistakes.isEmpty)
                  const Text('No repeated mistakes.')
                else
                  ...report.repeatedMistakes.take(4).map(
                        (mistake) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            '${mistake.surahName} ${mistake.ayahNumber}',
                          ),
                          subtitle: Text(
                            mistake.wordText,
                            textDirection: TextDirection.rtl,
                          ),
                          trailing: ApprovedStatusBadge(
                            label: '${mistake.errorCount}×',
                            color: AppColors.goldMuted,
                          ),
                        ),
                      ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        ApprovedCard(
          child: Column(
            children: [
              const ApprovedSectionTitle(
                icon: Icons.schedule,
                title: 'Recent session results',
              ),
              const SizedBox(height: 8),
              if (report.classes.isEmpty)
                const Text('No completed sessions.')
              else
                ...report.classes.take(4).map(
                      (session) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(session.day),
                        subtitle: Text(
                          '${session.date} • ${session.mistakeCount} mistakes',
                        ),
                        trailing: Text(session.performance ?? 'Not rated'),
                      ),
                    ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Metric extends StatelessWidget {
  final String value;
  final String label;

  const _Metric({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          FittedBox(
            child: Text(value, style: Theme.of(context).textTheme.titleLarge),
          ),
          Text(label, style: Theme.of(context).textTheme.bodySmall),
        ],
      ),
    );
  }
}

class _TrendPainter extends CustomPainter {
  final List<PerformanceDataPoint> points;

  _TrendPainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = AppColors.goldBorder
      ..strokeWidth = 1;
    for (var i = 0; i < 4; i++) {
      final y = size.height * i / 3;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    if (points.isEmpty) return;
    const scores = {
      'Needs Work': .3,
      'Good': .55,
      'Very Good': .78,
      'Excellent': .95,
    };
    final line = Paint()
      ..color = AppColors.emeraldDark
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke;
    final path = Path();
    for (var i = 0; i < points.length; i++) {
      final x = points.length == 1 ? size.width / 2 : size.width * i / (points.length - 1);
      final score = scores[points[i].performance] ?? .5;
      final y = size.height * (1 - score);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
      canvas.drawCircle(Offset(x, y), 4, Paint()..color = AppColors.emerald);
    }
    canvas.drawPath(path, line);
  }

  @override
  bool shouldRepaint(covariant _TrendPainter oldDelegate) =>
      oldDelegate.points != points;
}

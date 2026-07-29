import 'package:flutter/material.dart';

import '../../../config/app_colors.dart';
import '../../../data/models/student_report.dart';
import '../../widgets/approved_ui.dart';

class ApprovedMistakesScreen extends StatelessWidget {
  final StudentReport report;

  const ApprovedMistakesScreen({super.key, required this.report});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.ivory,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: Colors.white,
        title: const Text('Mistake Review'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            report.student.name,
            style: Theme.of(context).textTheme.headlineLarge,
          ),
          const SizedBox(height: 4),
          Text(
            '${report.summary.totalMistakes} mistakes • '
            '${report.summary.repeatedMistakes} repeated',
          ),
          const SizedBox(height: 18),
          if (report.repeatedMistakes.isEmpty)
            const ApprovedCard(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 30),
                child: Center(child: Text('No repeated mistakes to review.')),
              ),
            )
          else
            ...report.repeatedMistakes.map(
              (mistake) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: () => _showDetails(context, mistake),
                  child: ApprovedCard(
                    child: Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: AppColors.goldMuted.withOpacity(.1),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.goldBorder),
                          ),
                          child: Text(
                            '${mistake.errorCount}×',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ),
                        const SizedBox(width: 13),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${mistake.surahName} ${mistake.ayahNumber}',
                                style: Theme.of(context).textTheme.titleLarge,
                              ),
                              Text(
                                mistake.wordText,
                                textDirection: TextDirection.rtl,
                                style: const TextStyle(fontSize: 20),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          const SizedBox(height: 10),
          ApprovedCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const ApprovedSectionTitle(
                  icon: Icons.auto_stories_outlined,
                  title: 'Surahs needing attention',
                ),
                const SizedBox(height: 10),
                ...report.mistakesBySurah.take(8).map(
                      (surah) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(surah.surahName),
                        subtitle: LinearProgressIndicator(
                          value: (surah.totalMistakes / 10)
                              .clamp(0.0, 1.0)
                              .toDouble(),
                          color: AppColors.goldMuted,
                          backgroundColor: AppColors.ivoryWarm,
                        ),
                        trailing: Text('${surah.totalMistakes}'),
                      ),
                    ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showDetails(BuildContext context, RepeatedMistake mistake) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      backgroundColor: AppColors.ivory,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Mistake details',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 16),
              ApprovedCard(
                child: Column(
                  children: [
                    Text(
                      mistake.wordText,
                      textDirection: TextDirection.rtl,
                      style: const TextStyle(fontSize: 30),
                    ),
                    const SizedBox(height: 10),
                    Text('${mistake.surahName} ${mistake.ayahNumber}'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(
                  Icons.replay,
                  color: AppColors.goldMuted,
                ),
                title: const Text('Repeated occurrences'),
                trailing: Text('${mistake.errorCount}'),
              ),
              const Text(
                'Open the related session to review the mark in context on '
                'the verified Mushaf page.',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Student report Riverpod providers.
// Fetches report data from Supabase and applies filters.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../config/constants.dart';
import '../../core/supabase/schema_compat.dart';
import '../../data/models/student_report.dart';
import '../../core/services/report_helpers.dart';

/// Fetches the full student report from Supabase.
/// Mirrors web's supabase-api.ts:getStudentReport().
final studentReportProvider = FutureProvider.family<StudentReport, String>((ref, studentId) async {
  final supabase = Supabase.instance.client;

  // 1. Fetch student profile
  final profile = await supabase
      .from('profiles')
      .select('id, name, email, created_at')
      .eq('id', studentId)
      .single();

  // 2. Fetch classes via class_students join
  final classStudentsRaw = await withLegacySchemaFallback(
    () => supabase
        .from('class_reciters')
        .select('''
          class_id,
          classes (
            id, date, day, notes, performance, listener_id, teacher_id, is_published,
            assignments (*)
          )
        ''')
        .eq('reciter_id', studentId),
    () => supabase
        .from('class_students')
        .select('''
          class_id,
          classes (
            id, date, day, notes, performance, listener_id, teacher_id, is_published,
            assignments (*)
          )
        ''')
        .eq('student_id', studentId),
  );
  final classStudents = (classStudentsRaw as List?) ?? [];

  // 3. Fetch mistakes with occurrences
  final mistakesRaw = await withLegacySchemaFallback(
    () => supabase
        .from('mistakes')
        .select('*, mistake_occurrences(id, class_id, occurred_at)')
        .eq('reciter_id', studentId),
    () => supabase
        .from('mistakes')
        .select('*, mistake_occurrences(id, class_id, occurred_at)')
        .eq('student_id', studentId),
  );
  final mistakes = (mistakesRaw as List?) ?? [];

  // 4. Build per-class mistake mapping
  final Map<String, List<ClassMistake>> classMistakeMap = {};
  for (final m in mistakes) {
    final occurrences = (m['mistake_occurrences'] as List?) ?? [];
    for (final occ in occurrences) {
      final classId = occ['class_id']?.toString();
      if (classId == null || classId.isEmpty) continue;
      final mistake = ClassMistake(
        id: (m['id'] ?? '').toString(),
        surahNumber: m['surah_number'] as int? ?? 0,
        surahName: AppConstants.surahNames[m['surah_number'] as int? ?? 0] ?? 'Surah ${m['surah_number']}',
        ayahNumber: m['ayah_number'] as int? ?? 0,
        wordText: (m['word_text'] as String?) ?? '',
        errorCount: m['error_count'] as int? ?? 1,
      );
      classMistakeMap.putIfAbsent(classId, () => []).add(mistake);
    }
  }

  // 5. Build student info
  final student = StudentInfo(
    id: (profile['id'] ?? '').toString(),
    name: (profile['name'] as String?) ?? '',
    email: (profile['email'] as String?) ?? '',
    studentId: (profile['id'] as String?) ?? '',
    addedAt: (profile['created_at'] as String?) ?? '',
  );

  // 6. Build classes list with per-class mistakes
  final classes = classStudents.map<StudentClass>((cs) {
    final classData = cs['classes'] as Map<String, dynamic>?;
    final classId = (classData?['id'] ?? '').toString();
    final classMistakes = classMistakeMap[classId] ?? [];
    final assignmentsRaw = (classData?['assignments'] as List?) ?? [];

    return StudentClass(
      id: classId,
      date: (classData?['date'] as String?) ?? '',
      day: (classData?['day'] as String?) ?? '',
      notes: classData?['notes'] as String?,
      performance: classData?['performance'] as String?,
      assignments: assignmentsRaw
        .where((a) {
          final reciterId = a['reciter_id'] ?? a['student_id'];
          return reciterId == null || reciterId.toString() == studentId;
        })
        .map<ClassAssignment>((a) => ClassAssignment(
          type: (a['type'] as String?) ?? '',
          startSurah: a['start_surah'] as int? ?? 0,
          endSurah: a['end_surah'] as int? ?? 0,
          startAyah: a['start_ayah'] as int?,
          endAyah: a['end_ayah'] as int?,
          studentId: (a['reciter_id'] ?? a['student_id'])?.toString(),
        )).toList(),
      mistakes: classMistakes,
      mistakeCount: classMistakes.length,
    );
  }).toList();

  // 7. Calculate summary stats
  final totalMistakes = mistakes.length;
  final uniqueKeys = <String>{};
  for (final m in mistakes) {
    uniqueKeys.add('${m['surah_number']}-${m['ayah_number']}-${m['word_index']}');
  }
  final uniqueMistakes = uniqueKeys.length;
  final repeatedMistakesCount = mistakes.where((m) => (m['error_count'] as int? ?? 1) > 1).length;
  final totalClasses = classStudents.length;

  // Compute avg performance
  final perfScores = classes
      .map((c) => perfMap[c.performance ?? ''] ?? 0)
      .where((s) => s > 0)
      .toList();
  final avgPerfScore = perfScores.isNotEmpty
      ? (perfScores.reduce((a, b) => a + b) / perfScores.length).round()
      : 0;
  final avgPerformance = (avgPerfScore >= 0 && avgPerfScore < perfLabels.length)
      ? perfLabels[avgPerfScore]
      : 'N/A';

  final summary = ReportSummary(
    totalClasses: totalClasses,
    totalMistakes: totalMistakes,
    uniqueMistakes: uniqueMistakes,
    repeatedMistakes: repeatedMistakesCount,
    avgPerformance: avgPerformance,
  );

  // 8. Group mistakes by surah
  final Map<int, ({int total, Set<String> unique})> mistakesBySurahMap = {};
  for (final m in mistakes) {
    final surahNum = m['surah_number'] as int? ?? 0;
    final existing = mistakesBySurahMap[surahNum] ?? (total: 0, unique: <String>{});
    mistakesBySurahMap[surahNum] = (
      total: existing.total + 1,
      unique: existing.unique..add('${m['ayah_number']}-${m['word_index']}'),
    );
  }
  final mistakesBySurah = mistakesBySurahMap.entries.map((e) => MistakeBySurah(
    surahNumber: e.key,
    surahName: AppConstants.surahNames[e.key] ?? 'Surah ${e.key}',
    totalMistakes: e.value.total,
    uniqueMistakes: e.value.unique.length,
  )).toList()
    ..sort((a, b) => a.surahNumber.compareTo(b.surahNumber));

  // 9. Get repeated mistakes (error_count > 1)
  final repeatedMistakes = mistakes
      .where((m) => (m['error_count'] as int? ?? 1) > 1)
      .map((m) => RepeatedMistake(
        id: (m['id'] ?? '').toString(),
        surahNumber: m['surah_number'] as int? ?? 0,
        surahName: AppConstants.surahNames[m['surah_number'] as int? ?? 0] ?? 'Surah ${m['surah_number']}',
        ayahNumber: m['ayah_number'] as int? ?? 0,
        wordText: (m['word_text'] as String?) ?? '',
        errorCount: m['error_count'] as int? ?? 1,
      ))
      .toList()
    ..sort((a, b) => b.errorCount.compareTo(a.errorCount));

  // 10. Performance trend
  final performanceTrend = classes
      .where((c) => c.performance != null && c.performance!.isNotEmpty)
      .map((c) => PerformanceDataPoint(date: c.date, performance: c.performance!))
      .toList()
    ..sort((a, b) => a.date.compareTo(b.date));

  return StudentReport(
    student: student,
    summary: summary,
    classes: classes,
    mistakesBySurah: mistakesBySurah,
    repeatedMistakes: repeatedMistakes,
    performanceTrend: performanceTrend,
  );
});

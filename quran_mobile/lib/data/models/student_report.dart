/// Student report data models for the classes tab revamp.
/// Mirrors web's report-types.ts interfaces.

class StudentReport {
  final StudentInfo student;
  final ReportSummary summary;
  final List<StudentClass> classes;
  final List<MistakeBySurah> mistakesBySurah;
  final List<RepeatedMistake> repeatedMistakes;
  final List<PerformanceDataPoint> performanceTrend;

  const StudentReport({
    required this.student,
    required this.summary,
    required this.classes,
    required this.mistakesBySurah,
    required this.repeatedMistakes,
    required this.performanceTrend,
  });

  StudentReport copyWith({
    StudentInfo? student,
    ReportSummary? summary,
    List<StudentClass>? classes,
    List<MistakeBySurah>? mistakesBySurah,
    List<RepeatedMistake>? repeatedMistakes,
    List<PerformanceDataPoint>? performanceTrend,
  }) {
    return StudentReport(
      student: student ?? this.student,
      summary: summary ?? this.summary,
      classes: classes ?? this.classes,
      mistakesBySurah: mistakesBySurah ?? this.mistakesBySurah,
      repeatedMistakes: repeatedMistakes ?? this.repeatedMistakes,
      performanceTrend: performanceTrend ?? this.performanceTrend,
    );
  }
}

class StudentInfo {
  final String id;
  final String name;
  final String email;
  final String studentId;
  final String addedAt;

  const StudentInfo({
    required this.id,
    required this.name,
    required this.email,
    required this.studentId,
    required this.addedAt,
  });

  StudentInfo copyWith({
    String? id,
    String? name,
    String? email,
    String? studentId,
    String? addedAt,
  }) {
    return StudentInfo(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      studentId: studentId ?? this.studentId,
      addedAt: addedAt ?? this.addedAt,
    );
  }
}

class ReportSummary {
  final int totalClasses;
  final int totalMistakes;
  final int uniqueMistakes;
  final int repeatedMistakes;
  final String avgPerformance;

  const ReportSummary({
    required this.totalClasses,
    required this.totalMistakes,
    required this.uniqueMistakes,
    required this.repeatedMistakes,
    required this.avgPerformance,
  });

  ReportSummary copyWith({
    int? totalClasses,
    int? totalMistakes,
    int? uniqueMistakes,
    int? repeatedMistakes,
    String? avgPerformance,
  }) {
    return ReportSummary(
      totalClasses: totalClasses ?? this.totalClasses,
      totalMistakes: totalMistakes ?? this.totalMistakes,
      uniqueMistakes: uniqueMistakes ?? this.uniqueMistakes,
      repeatedMistakes: repeatedMistakes ?? this.repeatedMistakes,
      avgPerformance: avgPerformance ?? this.avgPerformance,
    );
  }
}

class StudentClass {
  final String id;
  final String date;
  final String day;
  final String? notes;
  final String? performance;
  final List<ClassAssignment> assignments;
  final List<ClassMistake> mistakes;
  final int mistakeCount;

  const StudentClass({
    required this.id,
    required this.date,
    required this.day,
    this.notes,
    this.performance,
    required this.assignments,
    required this.mistakes,
    required this.mistakeCount,
  });

  StudentClass copyWith({
    String? id,
    String? date,
    String? day,
    String? notes,
    String? performance,
    List<ClassAssignment>? assignments,
    List<ClassMistake>? mistakes,
    int? mistakeCount,
  }) {
    return StudentClass(
      id: id ?? this.id,
      date: date ?? this.date,
      day: day ?? this.day,
      notes: notes ?? this.notes,
      performance: performance ?? this.performance,
      assignments: assignments ?? this.assignments,
      mistakes: mistakes ?? this.mistakes,
      mistakeCount: mistakeCount ?? this.mistakeCount,
    );
  }
}

class ClassAssignment {
  final String type;
  final int startSurah;
  final int endSurah;
  final int? startAyah;
  final int? endAyah;

  const ClassAssignment({
    required this.type,
    required this.startSurah,
    required this.endSurah,
    this.startAyah,
    this.endAyah,
  });

  ClassAssignment copyWith({
    String? type,
    int? startSurah,
    int? endSurah,
    int? startAyah,
    int? endAyah,
  }) {
    return ClassAssignment(
      type: type ?? this.type,
      startSurah: startSurah ?? this.startSurah,
      endSurah: endSurah ?? this.endSurah,
      startAyah: startAyah ?? this.startAyah,
      endAyah: endAyah ?? this.endAyah,
    );
  }
}

class ClassMistake {
  final String id;
  final int surahNumber;
  final String surahName;
  final int ayahNumber;
  final String wordText;
  final int errorCount;

  const ClassMistake({
    required this.id,
    required this.surahNumber,
    required this.surahName,
    required this.ayahNumber,
    required this.wordText,
    required this.errorCount,
  });

  ClassMistake copyWith({
    String? id,
    int? surahNumber,
    String? surahName,
    int? ayahNumber,
    String? wordText,
    int? errorCount,
  }) {
    return ClassMistake(
      id: id ?? this.id,
      surahNumber: surahNumber ?? this.surahNumber,
      surahName: surahName ?? this.surahName,
      ayahNumber: ayahNumber ?? this.ayahNumber,
      wordText: wordText ?? this.wordText,
      errorCount: errorCount ?? this.errorCount,
    );
  }
}

class MistakeBySurah {
  final int surahNumber;
  final String surahName;
  final int totalMistakes;
  final int uniqueMistakes;

  const MistakeBySurah({
    required this.surahNumber,
    required this.surahName,
    required this.totalMistakes,
    required this.uniqueMistakes,
  });

  MistakeBySurah copyWith({
    int? surahNumber,
    String? surahName,
    int? totalMistakes,
    int? uniqueMistakes,
  }) {
    return MistakeBySurah(
      surahNumber: surahNumber ?? this.surahNumber,
      surahName: surahName ?? this.surahName,
      totalMistakes: totalMistakes ?? this.totalMistakes,
      uniqueMistakes: uniqueMistakes ?? this.uniqueMistakes,
    );
  }
}

class RepeatedMistake {
  final String id;
  final int surahNumber;
  final String surahName;
  final int ayahNumber;
  final String wordText;
  final int errorCount;

  const RepeatedMistake({
    required this.id,
    required this.surahNumber,
    required this.surahName,
    required this.ayahNumber,
    required this.wordText,
    required this.errorCount,
  });

  RepeatedMistake copyWith({
    String? id,
    int? surahNumber,
    String? surahName,
    int? ayahNumber,
    String? wordText,
    int? errorCount,
  }) {
    return RepeatedMistake(
      id: id ?? this.id,
      surahNumber: surahNumber ?? this.surahNumber,
      surahName: surahName ?? this.surahName,
      ayahNumber: ayahNumber ?? this.ayahNumber,
      wordText: wordText ?? this.wordText,
      errorCount: errorCount ?? this.errorCount,
    );
  }
}

class PerformanceDataPoint {
  final String date;
  final String performance;

  const PerformanceDataPoint({
    required this.date,
    required this.performance,
  });

  PerformanceDataPoint copyWith({
    String? date,
    String? performance,
  }) {
    return PerformanceDataPoint(
      date: date ?? this.date,
      performance: performance ?? this.performance,
    );
  }
}

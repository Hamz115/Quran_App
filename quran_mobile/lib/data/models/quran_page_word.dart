/// Represents a single word/glyph on a Quran page with QPC v2 rendering data.
class QuranPageWord {
  final int id;
  final int surah;
  final int ayah;
  final int word;
  final String text;
  final String textUthmani;
  final bool isEnd;

  const QuranPageWord({
    required this.id,
    required this.surah,
    required this.ayah,
    required this.word,
    required this.text,
    required this.textUthmani,
    required this.isEnd,
  });

  /// Safe int parse — SQLite can return int or String depending on column type.
  static int _toInt(dynamic value) {
    if (value is int) return value;
    if (value is String) return int.parse(value);
    return 0;
  }

  factory QuranPageWord.fromDbRow(Map<String, dynamic> row, bool isEnd) {
    return QuranPageWord(
      id: _toInt(row['id']),
      surah: _toInt(row['surah']),
      ayah: _toInt(row['ayah']),
      word: _toInt(row['word']),
      text: row['text'] as String,
      textUthmani: (row['text_uthmani'] ?? '') as String,
      isEnd: isEnd,
    );
  }

  bool get isAyahEnd => isEnd;
}

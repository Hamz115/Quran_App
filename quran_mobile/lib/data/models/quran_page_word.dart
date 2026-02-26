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

  factory QuranPageWord.fromDbRow(Map<String, dynamic> row, bool isEnd) {
    return QuranPageWord(
      id: row['id'] as int,
      surah: row['surah'] as int,
      ayah: row['ayah'] as int,
      word: row['word'] as int,
      text: row['text'] as String,
      textUthmani: row['text_uthmani'] as String,
      isEnd: isEnd,
    );
  }

  bool get isAyahEnd => isEnd;
}

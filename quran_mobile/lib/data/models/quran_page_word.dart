/// Represents a single word/glyph on a Quran page with QPC rendering data.
class QuranPageWord {
  final int id;
  final int surahNum;
  final int ayahNum;
  final int wordPosition;
  final String textUthmani;
  final String codeV1;
  final int lineNumber;
  final String charType; // "word" or "end" (ayah marker)

  const QuranPageWord({
    required this.id,
    required this.surahNum,
    required this.ayahNum,
    required this.wordPosition,
    required this.textUthmani,
    required this.codeV1,
    required this.lineNumber,
    required this.charType,
  });

  factory QuranPageWord.fromJson(Map<String, dynamic> json) {
    return QuranPageWord(
      id: json['id'] as int,
      surahNum: json['s'] as int,
      ayahNum: json['a'] as int,
      wordPosition: json['p'] as int,
      textUthmani: json['t'] as String,
      codeV1: json['c1'] as String,
      lineNumber: json['l'] as int,
      charType: json['ct'] as String,
    );
  }

  bool get isAyahEnd => charType == 'end';
  bool get isWord => charType == 'word';
}

import 'package:equatable/equatable.dart';

class Surah extends Equatable {
  final int number;
  final String name;
  final String englishName;
  final String englishNameTranslation;
  final int numberOfAyahs;
  final String revelationType;

  const Surah({
    required this.number,
    required this.name,
    required this.englishName,
    required this.englishNameTranslation,
    required this.numberOfAyahs,
    required this.revelationType,
  });

  factory Surah.fromMap(Map<String, dynamic> map) {
    return Surah(
      number: map['number'] as int,
      name: map['name'] as String,
      englishName: map['englishName'] as String,
      englishNameTranslation: map['englishNameTranslation'] as String? ?? '',
      numberOfAyahs: map['numberOfAyahs'] as int,
      revelationType: map['revelationType'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'number': number,
      'name': name,
      'englishName': englishName,
      'englishNameTranslation': englishNameTranslation,
      'numberOfAyahs': numberOfAyahs,
      'revelationType': revelationType,
    };
  }

  @override
  List<Object?> get props => [number, name, englishName, numberOfAyahs];
}

class Ayah extends Equatable {
  final int surahNumber;
  final int ayahNumber;
  final String text;

  const Ayah({
    required this.surahNumber,
    required this.ayahNumber,
    required this.text,
  });

  factory Ayah.fromMap(Map<String, dynamic> map) {
    return Ayah(
      surahNumber: map['surahNumber'] as int,
      ayahNumber: map['ayahNumber'] as int,
      text: map['text'] as String,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'surahNumber': surahNumber,
      'ayahNumber': ayahNumber,
      'text': text,
    };
  }

  // Get words from the ayah text
  List<String> get words => text.split(' ');

  @override
  List<Object?> get props => [surahNumber, ayahNumber, text];
}

class SurahWithAyahs {
  final Surah surah;
  final List<Ayah> ayahs;

  const SurahWithAyahs({
    required this.surah,
    required this.ayahs,
  });
}

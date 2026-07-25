import 'package:flutter_test/flutter_test.dart';
import 'package:quran_mobile/data/quran_data.dart';

void main() {
  group('Mushaf surah page boundaries', () {
    test('finds surahs that begin in the middle of a page', () {
      expect(getPageForSurah(5), 106);
      expect(getPageForSurah(11), 221);
      expect(getPageForSurah(61), 551);
      expect(getPageForSurah(114), 604);
    });

    test('includes a final ayah that falls on the following page', () {
      // Al-Muzzammil 73:20 is the only ayah of the surah on page 575.
      expect(getPageRange(startSurah: 73, endSurah: 73), (574, 575));

      // Al-Inshiqaq 84:25 is the only ayah of the surah on page 590.
      expect(getPageRange(startSurah: 84, endSurah: 84), (589, 590));
    });

    test('handles short surahs sharing the same page', () {
      expect(getPageRange(startSurah: 101, endSurah: 101), (600, 600));
      expect(getPageRange(startSurah: 109, endSurah: 111), (603, 603));
      expect(getPageRange(startSurah: 112, endSurah: 114), (604, 604));
    });

    test('keeps explicit ayah ranges precise', () {
      expect(
        getPageRange(
          startSurah: 73,
          endSurah: 73,
          startAyah: 1,
          endAyah: 19,
        ),
        (574, 574),
      );
      expect(
        getPageRange(
          startSurah: 73,
          endSurah: 73,
          startAyah: 1,
          endAyah: 20,
        ),
        (574, 575),
      );
    });
  });
}

/// Data models for Smart Suggestions feature.
/// Mirrors the web's SuggestedPortions interface at supabase-api.ts:695-714.

class SuggestedPortion {
  final int startSurah;
  final int endSurah;
  final int? startAyah;
  final int? endAyah;
  final String? surahName;
  final String? note;

  const SuggestedPortion({
    required this.startSurah,
    required this.endSurah,
    this.startAyah,
    this.endAyah,
    this.surahName,
    this.note,
  });
}

class SuggestedPortions {
  final SuggestedPortion? hifz;
  final SuggestedPortion? sabqi;
  final SuggestedPortion? manzil;
  final ({String id, String date, String day})? lastClass;

  const SuggestedPortions({
    this.hifz,
    this.sabqi,
    this.manzil,
    this.lastClass,
  });
}

// Quran Utilities — Juz boundaries, surah names, and helper functions

/** Centralized surah name mapping (1-114) */
export const surahNames: Record<number, string> = {
  1: 'Al-Fatihah', 2: 'Al-Baqarah', 3: 'Aal-Imran', 4: 'An-Nisa', 5: 'Al-Maidah',
  6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: "Ar-Ra'd", 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  21: 'Al-Anbiya', 22: 'Al-Hajj', 23: 'Al-Muminun', 24: 'An-Nur', 25: 'Al-Furqan',
  26: 'Ash-Shuara', 27: 'An-Naml', 28: 'Al-Qasas', 29: 'Al-Ankabut', 30: 'Ar-Rum',
  31: 'Luqman', 32: 'As-Sajdah', 33: 'Al-Ahzab', 34: 'Saba', 35: 'Fatir',
  36: 'Ya-Sin', 37: 'As-Saffat', 38: 'Sad', 39: 'Az-Zumar', 40: 'Ghafir',
  41: 'Fussilat', 42: 'Ash-Shura', 43: 'Az-Zukhruf', 44: 'Ad-Dukhan', 45: 'Al-Jathiyah',
  46: 'Al-Ahqaf', 47: 'Muhammad', 48: 'Al-Fath', 49: 'Al-Hujurat', 50: 'Qaf',
  51: 'Adh-Dhariyat', 52: 'At-Tur', 53: 'An-Najm', 54: 'Al-Qamar', 55: 'Ar-Rahman',
  56: 'Al-Waqiah', 57: 'Al-Hadid', 58: 'Al-Mujadila', 59: 'Al-Hashr', 60: 'Al-Mumtahanah',
  61: 'As-Saff', 62: 'Al-Jumuah', 63: 'Al-Munafiqun', 64: 'At-Taghabun', 65: 'At-Talaq',
  66: 'At-Tahrim', 67: 'Al-Mulk', 68: 'Al-Qalam', 69: 'Al-Haqqah', 70: 'Al-Maarij',
  71: 'Nuh', 72: 'Al-Jinn', 73: 'Al-Muzzammil', 74: 'Al-Muddaththir', 75: 'Al-Qiyamah',
  76: 'Al-Insan', 77: 'Al-Mursalat', 78: 'An-Naba', 79: 'An-Naziat', 80: 'Abasa',
  81: 'At-Takwir', 82: 'Al-Infitar', 83: 'Al-Mutaffifin', 84: 'Al-Inshiqaq', 85: 'Al-Buruj',
  86: 'At-Tariq', 87: 'Al-Ala', 88: 'Al-Ghashiyah', 89: 'Al-Fajr', 90: 'Al-Balad',
  91: 'Ash-Shams', 92: 'Al-Layl', 93: 'Ad-Duha', 94: 'Ash-Sharh', 95: 'At-Tin',
  96: 'Al-Alaq', 97: 'Al-Qadr', 98: 'Al-Bayyinah', 99: 'Az-Zalzalah', 100: 'Al-Adiyat',
  101: 'Al-Qariah', 102: 'At-Takathur', 103: 'Al-Asr', 104: 'Al-Humazah', 105: 'Al-Fil',
  106: 'Quraysh', 107: 'Al-Maun', 108: 'Al-Kawthar', 109: 'Al-Kafirun', 110: 'An-Nasr',
  111: 'Al-Masad', 112: 'Al-Ikhlas', 113: 'Al-Falaq', 114: 'An-Nas'
};

/** Juz boundary definition: start surah:ayah to end surah:ayah */
interface JuzBoundary {
  juz: number;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

/** All 30 Juz boundaries (Madani Mushaf standard) */
export const JUZ_BOUNDARIES: JuzBoundary[] = [
  { juz: 1,  startSurah: 1,  startAyah: 1,   endSurah: 2,   endAyah: 141 },
  { juz: 2,  startSurah: 2,  startAyah: 142,  endSurah: 2,   endAyah: 252 },
  { juz: 3,  startSurah: 2,  startAyah: 253,  endSurah: 3,   endAyah: 92 },
  { juz: 4,  startSurah: 3,  startAyah: 93,   endSurah: 4,   endAyah: 23 },
  { juz: 5,  startSurah: 4,  startAyah: 24,   endSurah: 4,   endAyah: 147 },
  { juz: 6,  startSurah: 4,  startAyah: 148,  endSurah: 5,   endAyah: 81 },
  { juz: 7,  startSurah: 5,  startAyah: 82,   endSurah: 6,   endAyah: 110 },
  { juz: 8,  startSurah: 6,  startAyah: 111,  endSurah: 7,   endAyah: 87 },
  { juz: 9,  startSurah: 7,  startAyah: 88,   endSurah: 8,   endAyah: 40 },
  { juz: 10, startSurah: 8,  startAyah: 41,   endSurah: 9,   endAyah: 92 },
  { juz: 11, startSurah: 9,  startAyah: 93,   endSurah: 11,  endAyah: 5 },
  { juz: 12, startSurah: 11, startAyah: 6,    endSurah: 12,  endAyah: 52 },
  { juz: 13, startSurah: 12, startAyah: 53,   endSurah: 14,  endAyah: 52 },
  { juz: 14, startSurah: 15, startAyah: 1,    endSurah: 16,  endAyah: 128 },
  { juz: 15, startSurah: 17, startAyah: 1,    endSurah: 18,  endAyah: 74 },
  { juz: 16, startSurah: 18, startAyah: 75,   endSurah: 20,  endAyah: 135 },
  { juz: 17, startSurah: 21, startAyah: 1,    endSurah: 22,  endAyah: 78 },
  { juz: 18, startSurah: 23, startAyah: 1,    endSurah: 25,  endAyah: 20 },
  { juz: 19, startSurah: 25, startAyah: 21,   endSurah: 27,  endAyah: 55 },
  { juz: 20, startSurah: 27, startAyah: 56,   endSurah: 29,  endAyah: 45 },
  { juz: 21, startSurah: 29, startAyah: 46,   endSurah: 33,  endAyah: 30 },
  { juz: 22, startSurah: 33, startAyah: 31,   endSurah: 36,  endAyah: 27 },
  { juz: 23, startSurah: 36, startAyah: 28,   endSurah: 39,  endAyah: 31 },
  { juz: 24, startSurah: 39, startAyah: 32,   endSurah: 41,  endAyah: 46 },
  { juz: 25, startSurah: 41, startAyah: 47,   endSurah: 45,  endAyah: 37 },
  { juz: 26, startSurah: 46, startAyah: 1,    endSurah: 51,  endAyah: 30 },
  { juz: 27, startSurah: 51, startAyah: 31,   endSurah: 57,  endAyah: 29 },
  { juz: 28, startSurah: 58, startAyah: 1,    endSurah: 66,  endAyah: 12 },
  { juz: 29, startSurah: 67, startAyah: 1,    endSurah: 77,  endAyah: 50 },
  { juz: 30, startSurah: 78, startAyah: 1,    endSurah: 114, endAyah: 6 },
];

/** Get the surah range (start/end surah numbers) for a given Juz */
export function getSurahRangeForJuz(juz: number): { startSurah: number; endSurah: number } | null {
  const boundary = JUZ_BOUNDARIES.find(b => b.juz === juz);
  if (!boundary) return null;
  return { startSurah: boundary.startSurah, endSurah: boundary.endSurah };
}

/** Get which Juz a surah primarily belongs to (based on where it starts) */
export function getJuzForSurah(surah: number): number {
  for (let i = JUZ_BOUNDARIES.length - 1; i >= 0; i--) {
    const b = JUZ_BOUNDARIES[i];
    if (surah >= b.startSurah) return b.juz;
  }
  return 1;
}

/** Check if a surah falls within a given Juz range */
export function isSurahInJuz(surah: number, juz: number): boolean {
  const boundary = JUZ_BOUNDARIES.find(b => b.juz === juz);
  if (!boundary) return false;
  return surah >= boundary.startSurah && surah <= boundary.endSurah;
}

/**
 * Format a portion/assignment label for display.
 * Handles same-surah ("At-Tawbah 93-100") and cross-surah ("At-Tawbah 93 - Yunus 5") cases.
 */
export function formatPortionLabel(a: { start_surah: number; end_surah: number; start_ayah?: number | null; end_ayah?: number | null }): string {
  const startName = surahNames[a.start_surah] || `Surah ${a.start_surah}`;
  const endName = surahNames[a.end_surah] || `Surah ${a.end_surah}`;

  if (a.start_surah === a.end_surah) {
    // Same surah
    if (!a.start_ayah) return startName;
    if (!a.end_ayah || a.end_ayah === a.start_ayah) return `${startName} ${a.start_ayah}`;
    return `${startName} ${a.start_ayah}-${a.end_ayah}`;
  }

  // Different surahs
  const startPart = a.start_ayah ? `${startName} ${a.start_ayah}` : startName;
  const endPart = a.end_ayah ? `${endName} ${a.end_ayah}` : endName;
  return `${startPart} - ${endPart}`;
}

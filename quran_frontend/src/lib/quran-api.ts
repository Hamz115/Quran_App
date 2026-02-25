// Quran API functions - Local FastAPI endpoints
// These stay local because Quran data is bundled with the app

const QURAN_API_BASE = 'http://localhost:8000/api';

// QPC v2 word data
export interface QuranPageWord {
  id: number;
  surah: number;
  ayah: number;
  word: number;           // position in ayah (1-based)
  text: string;           // QPC v2 glyph code(s)
  text_uthmani?: string;  // Arabic text (for char-level mistakes)
  is_end: boolean;        // true = ayah end marker
}

// QPC v2 line data
export interface QuranPageLine {
  line_number: number;
  line_type: 'ayah' | 'surah_name' | 'basmallah';
  is_centered: boolean;
  surah_number: number | null;
  words: QuranPageWord[];
}

// QPC v2 page data
export interface QuranPageData {
  page_number: number;
  lines: QuranPageLine[];
}

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export async function getSurahs(): Promise<Surah[]> {
  const res = await fetch(`${QURAN_API_BASE}/surahs`);
  if (!res.ok) throw new Error('Failed to fetch surahs');
  const data = await res.json();
  return data.data;
}

export async function getSurah(surahNumber: number): Promise<Surah> {
  const res = await fetch(`${QURAN_API_BASE}/surahs/${surahNumber}`);
  if (!res.ok) throw new Error('Failed to fetch surah');
  const data = await res.json();
  return data.data;
}

export async function getQuranPage(pageNumber: number): Promise<QuranPageData> {
  const res = await fetch(`${QURAN_API_BASE}/quran/page/${pageNumber}`);
  if (!res.ok) throw new Error('Failed to fetch page data');
  return res.json();
}

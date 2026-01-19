// Quran API functions - Local FastAPI endpoints
// These stay local because Quran data is bundled with the app

const QURAN_API_BASE = 'http://localhost:8000/api';

// QPC word data for a page
export interface QuranPageWord {
  id: number;
  s: number;    // surah
  a: number;    // ayah
  p: number;    // position in ayah
  t: string;    // text_uthmani
  c1: string;   // code_v1 (QPC glyph)
  c2: string;   // code_v2
  l: number;    // line_number (1-15)
  ct: string;   // char_type ('word' | 'end')
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

export async function getQuranPageWords(pageNumber: number): Promise<QuranPageWord[]> {
  const res = await fetch(`${QURAN_API_BASE}/quran/page/${pageNumber}`);
  if (!res.ok) throw new Error('Failed to fetch page words');
  const data = await res.json();
  return data.data;
}

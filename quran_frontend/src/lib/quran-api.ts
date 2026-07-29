// Quran reference data is exported as versioned static JSON. The same files are
// served by Vite locally and S3/CloudFront in the hosted web/PWA build, so Quran
// rendering never depends on a localhost backend or an always-on Mini PC service.
const QURAN_DATA_BASE = (import.meta.env.VITE_QURAN_DATA_BASE || '/quran-data/v1').replace(/\/$/, '');

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

async function fetchStaticJson<T>(path: string, label: string): Promise<T> {
  const response = await fetch(`${QURAN_DATA_BASE}/${path}`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Failed to load ${label} (${response.status})`);
  return response.json() as Promise<T>;
}

export async function getSurahs(): Promise<Surah[]> {
  const payload = await fetchStaticJson<{ data: Surah[] }>('surahs.json', 'surah metadata');
  return payload.data;
}

export async function getSurah(surahNumber: number): Promise<Surah> {
  const file = String(surahNumber).padStart(3, '0');
  const payload = await fetchStaticJson<{ data: Surah }>(`surahs/${file}.json`, `Surah ${surahNumber}`);
  return payload.data;
}

export async function getQuranPage(pageNumber: number): Promise<QuranPageData> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    throw new Error('Quran page must be between 1 and 604');
  }
  const file = String(pageNumber).padStart(3, '0');
  return fetchStaticJson<QuranPageData>(`pages/${file}.json`, `Quran page ${pageNumber}`);
}

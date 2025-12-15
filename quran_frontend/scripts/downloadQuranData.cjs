/**
 * Script to download word-by-word Quran data from Quran.com API
 * Downloads all 604 pages with: code_v1, line_number, word positions
 *
 * Run with: node scripts/downloadQuranData.js
 */

const fs = require('fs');
const path = require('path');

const TOTAL_PAGES = 604;
const OUTPUT_DIR = path.join(__dirname, '../src/data/quran-pages');
const DELAY_MS = 100; // Delay between requests to be nice to the API

async function fetchPage(pageNum) {
  const url = `https://api.quran.com/api/v4/verses/by_page/${pageNum}?words=true&word_fields=text_uthmani,code_v1,code_v2,line_number,position`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch page ${pageNum}: ${response.status}`);
  }

  const data = await response.json();

  // Transform to simpler structure
  const words = [];

  data.verses.forEach(verse => {
    const [surah, ayah] = verse.verse_key.split(':').map(Number);

    verse.words.forEach(word => {
      words.push({
        id: word.id,
        s: surah,           // surah number
        a: ayah,            // ayah number
        p: word.position,   // position in ayah
        t: word.text_uthmani,
        c1: word.code_v1,   // QPC v1 glyph
        c2: word.code_v2,   // QPC v2 glyph
        l: word.line_number, // line on page (1-15)
        ct: word.char_type_name // 'word' or 'end'
      });
    });
  });

  return words;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadAllPages() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Downloading ${TOTAL_PAGES} pages of Quran data...`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('');

  const allData = {};
  let totalWords = 0;

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    try {
      const words = await fetchPage(page);
      allData[page] = words;
      totalWords += words.length;

      // Save individual page file
      const pageFile = path.join(OUTPUT_DIR, `page_${page.toString().padStart(3, '0')}.json`);
      fs.writeFileSync(pageFile, JSON.stringify(words));

      // Progress
      if (page % 50 === 0 || page === TOTAL_PAGES) {
        console.log(`Downloaded ${page}/${TOTAL_PAGES} pages (${totalWords} words so far)`);
      }

      // Be nice to the API
      await sleep(DELAY_MS);

    } catch (error) {
      console.error(`Error on page ${page}:`, error.message);
      // Retry once
      await sleep(1000);
      try {
        const words = await fetchPage(page);
        allData[page] = words;
        totalWords += words.length;
        const pageFile = path.join(OUTPUT_DIR, `page_${page.toString().padStart(3, '0')}.json`);
        fs.writeFileSync(pageFile, JSON.stringify(words));
      } catch (retryError) {
        console.error(`Retry failed for page ${page}:`, retryError.message);
      }
    }
  }

  // Save combined file
  const combinedFile = path.join(OUTPUT_DIR, 'all_pages.json');
  fs.writeFileSync(combinedFile, JSON.stringify(allData));

  console.log('');
  console.log('=== Download Complete ===');
  console.log(`Total pages: ${TOTAL_PAGES}`);
  console.log(`Total words: ${totalWords}`);
  console.log(`Individual files: ${OUTPUT_DIR}/page_XXX.json`);
  console.log(`Combined file: ${combinedFile}`);

  // Generate TypeScript index file
  const indexContent = `// Auto-generated index for Quran page data
// Total: ${TOTAL_PAGES} pages, ${totalWords} words

export interface QuranWord {
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

export async function loadPage(pageNum: number): Promise<QuranWord[]> {
  const paddedPage = pageNum.toString().padStart(3, '0');
  const data = await import(\`./page_\${paddedPage}.json\`);
  return data.default;
}

export const TOTAL_PAGES = ${TOTAL_PAGES};
export const TOTAL_WORDS = ${totalWords};
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.ts'), indexContent);
  console.log(`TypeScript index: ${OUTPUT_DIR}/index.ts`);
}

// Run
downloadAllPages().catch(console.error);

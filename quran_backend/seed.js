const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'quran.db');

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i + 1}/${retries}...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function seed() {
  console.log('Creating database...');
  const db = new Database(DB_PATH);

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS surahs (
      number INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      englishName TEXT NOT NULL,
      englishNameTranslation TEXT,
      numberOfAyahs INTEGER NOT NULL,
      revelationType TEXT
    );

    CREATE TABLE IF NOT EXISTS ayahs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surahNumber INTEGER NOT NULL,
      ayahNumber INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (surahNumber) REFERENCES surahs(number),
      UNIQUE(surahNumber, ayahNumber)
    );

    CREATE INDEX IF NOT EXISTS idx_ayahs_surah ON ayahs(surahNumber);
  `);

  console.log('Fetching surah list from alquran.cloud...');
  const surahListData = await fetchWithRetry('https://api.alquran.cloud/v1/surah');
  const surahList = surahListData.data;

  console.log(`Found ${surahList.length} surahs. Starting download...\n`);

  const insertSurah = db.prepare(`
    INSERT OR REPLACE INTO surahs (number, name, englishName, englishNameTranslation, numberOfAyahs, revelationType)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAyah = db.prepare(`
    INSERT OR REPLACE INTO ayahs (surahNumber, ayahNumber, text)
    VALUES (?, ?, ?)
  `);

  for (const surah of surahList) {
    process.stdout.write(`Fetching Surah ${surah.number}/114: ${surah.englishName}... `);

    try {
      const surahData = await fetchWithRetry(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const data = surahData.data;

      // Insert surah
      insertSurah.run(
        data.number,
        data.name,
        data.englishName,
        data.englishNameTranslation,
        data.numberOfAyahs,
        data.revelationType
      );

      // Insert ayahs
      const insertMany = db.transaction((ayahs) => {
        for (const ayah of ayahs) {
          insertAyah.run(data.number, ayah.numberInSurah, ayah.text);
        }
      });
      insertMany(data.ayahs);

      console.log(`✓ (${data.numberOfAyahs} ayahs)`);

      // Small delay to be nice to the API
      await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.log(`✗ Error: ${err.message}`);
    }
  }

  // Verify
  const surahCount = db.prepare('SELECT COUNT(*) as count FROM surahs').get();
  const ayahCount = db.prepare('SELECT COUNT(*) as count FROM ayahs').get();

  console.log('\n========================================');
  console.log(`Done! Database saved to: ${DB_PATH}`);
  console.log(`Surahs: ${surahCount.count}`);
  console.log(`Ayahs: ${ayahCount.count}`);
  console.log('========================================');

  db.close();
}

seed().catch(console.error);

/**
 * Script to download QPC font files for offline use
 * Downloads all 604 page-specific fonts
 *
 * Run with: node scripts/downloadFonts.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const TOTAL_PAGES = 604;
const OUTPUT_DIR = path.join(__dirname, '../public/fonts/qpc');
const DELAY_MS = 50; // Delay between requests

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (res) => {
          res.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', reject);
      } else if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadAllFonts() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Downloading ${TOTAL_PAGES} QPC font files...`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('');

  let downloaded = 0;
  let failed = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const paddedPage = page.toString().padStart(3, '0');
    const filename = `QCF_P${paddedPage}.woff2`;
    const url = `https://cdn.jsdelivr.net/gh/mustafa0x/qpc-fonts@master/mushaf-woff2/${filename}`;
    const dest = path.join(OUTPUT_DIR, filename);

    // Skip if already exists
    if (fs.existsSync(dest)) {
      downloaded++;
      if (page % 100 === 0) {
        console.log(`Skipped ${page}/${TOTAL_PAGES} (already exists)`);
      }
      continue;
    }

    try {
      await downloadFile(url, dest);
      downloaded++;

      if (page % 50 === 0 || page === TOTAL_PAGES) {
        console.log(`Downloaded ${page}/${TOTAL_PAGES} fonts`);
      }

      await sleep(DELAY_MS);
    } catch (error) {
      console.error(`Failed to download page ${page}: ${error.message}`);
      failed.push(page);

      // Retry once
      await sleep(500);
      try {
        await downloadFile(url, dest);
        downloaded++;
        failed.pop();
      } catch (retryError) {
        console.error(`Retry failed for page ${page}`);
      }
    }
  }

  console.log('');
  console.log('=== Download Complete ===');
  console.log(`Downloaded: ${downloaded}/${TOTAL_PAGES}`);
  if (failed.length > 0) {
    console.log(`Failed: ${failed.join(', ')}`);
  }

  // Check total size
  let totalSize = 0;
  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const paddedPage = page.toString().padStart(3, '0');
    const filepath = path.join(OUTPUT_DIR, `QCF_P${paddedPage}.woff2`);
    if (fs.existsSync(filepath)) {
      totalSize += fs.statSync(filepath).size;
    }
  }
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

// Run
downloadAllFonts().catch(console.error);

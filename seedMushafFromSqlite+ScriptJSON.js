#!/usr/bin/env node

/**
 * seedMushafFromSqlite+ScriptJSON.js
 * 
 * Seeds Firestore with Mushaf (page-based) layout data by:
 * 1. Streaming the large uthmani.json to build word_index → "surah:ayah" mapping
 * 2. Reading qpc-v1-15-lines.db SQLite to get page/line layout
 * 3. Creating Firestore collections:
 *    - /mushafLayouts/{layoutCode}
 *    - /mushafLayouts/{layoutCode}/pages/{pageNumber}
 *    - /ayahToPage/{layoutCode}/{surahId}/{ayahNumber}
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, writeBatch } = require('firebase/firestore');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { chain } = require('stream-chain');
const { parser } = require('stream-json');
const { streamObject } = require('stream-json/streamers/StreamObject');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAG4Fcgfv69fKkLiqW9GrE72UHnVdHGwF4",
  authDomain: "manzil-8c263.firebaseapp.com",
  projectId: "manzil-8c263",
  storageBucket: "manzil-8c263.firebasestorage.app",
  messagingSenderId: "926563312491",
  appId: "1:926563312491:web:278e5313ee45568d13e22e",
  measurementId: "G-63PT3V3LVQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Constants
const LAYOUT_CODE = 'madani-15';
const LAYOUT_NAME = 'Madani 15-line';
const LAYOUT_TYPE = 'madani';
const LINES_PER_PAGE = 15;
const TOTAL_PAGES = 604;
const BATCH_SIZE = 500;

const SQLITE_PATH = path.join(__dirname, '..', 'qpc-v1-15-lines.db');
const UTHMANI_JSON_PATH = path.join(__dirname, '..', 'uthmani.json');

// Utility: Create batched writes to Firestore
class FirestoreBatcher {
  constructor(db, maxBatchSize = 500) {
    this.db = db;
    this.maxBatchSize = maxBatchSize;
    this.currentBatch = writeBatch(db);
    this.operationCount = 0;
    this.totalWrites = 0;
  }

  async write(docRef, data) {
    this.currentBatch.set(docRef, data);
    this.operationCount++;
    this.totalWrites++;

    if (this.operationCount >= this.maxBatchSize) {
      await this.commit();
    }
  }

  async commit() {
    if (this.operationCount > 0) {
      await this.currentBatch.commit();
      console.log(`✓ Committed batch of ${this.operationCount} writes (total: ${this.totalWrites})`);
      this.currentBatch = writeBatch(this.db);
      this.operationCount = 0;
    }
  }
}

// Step 1: Stream uthmani.json to build word index mapping
async function buildWordIndexMap() {
  console.log('\n📖 Step 1: Building word index → surah:ayah mapping...');
  console.log(`   Streaming from: ${UTHMANI_JSON_PATH}`);
  
  const wordIndexMap = new Map(); // word_index → "surah:ayah"
  let processedWords = 0;

  return new Promise((resolve, reject) => {
    const pipeline = chain([
      fs.createReadStream(UTHMANI_JSON_PATH),
      parser(),
      streamObject()
    ]);

    pipeline.on('data', ({ key, value }) => {
      // Each entry has key like "1:1:1" and value like { id: 1, surah: "1", ayah: "1", word: "1", ... }
      // The key format is "surah:ayah:word"
      // The value.id is the word_index we need
      const { id, surah, ayah } = value;
      
      if (id && surah && ayah) {
        const verseId = `${surah}:${ayah}`;
        wordIndexMap.set(id, verseId);
        processedWords++;
        
        if (processedWords % 10000 === 0) {
          process.stdout.write(`\r   Processed ${processedWords.toLocaleString()} words...`);
        }
      }
    });

    pipeline.on('end', () => {
      console.log(`\n   ✓ Built index map with ${wordIndexMap.size.toLocaleString()} word mappings`);
      resolve(wordIndexMap);
    });

    pipeline.on('error', (err) => {
      console.error('   ✗ Error streaming JSON:', err);
      reject(err);
    });
  });
}

// Step 2: Read SQLite and build page structure
function readMushafLayoutFromSQLite(wordIndexMap) {
  console.log('\n📚 Step 2: Reading Mushaf layout from SQLite...');
  console.log(`   Database: ${SQLITE_PATH}`);

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  
  // Query all lines from the database
  const query = `
    SELECT 
      page_number,
      line_number,
      first_word_id,
      last_word_id
    FROM pages
    ORDER BY page_number, line_number
  `;
  
  const rows = sqlite.prepare(query).all();
  console.log(`   ✓ Found ${rows.length.toLocaleString()} lines in database`);

  // Build page structure
  const pages = new Map(); // page_number → { lines: [], ayahRefs: Set, surahRefs: Set }
  const ayahToPageMap = new Map(); // "layoutCode:surah:ayah" → { page, lineIndex }

  for (const row of rows) {
    const { page_number, line_number, first_word_id, last_word_id } = row;
    
    if (!pages.has(page_number)) {
      pages.set(page_number, {
        page: page_number,
        lines: [],
        ayahRefs: new Set(),
        surahRefs: new Set()
      });
    }

    const pageData = pages.get(page_number);
    
    // Determine which ayahs appear on this line
    const ayahsOnLine = new Set();
    
    for (let wordId = first_word_id; wordId <= last_word_id; wordId++) {
      const verseId = wordIndexMap.get(wordId);
      if (verseId) {
        ayahsOnLine.add(verseId);
      }
    }

    const ayahArray = Array.from(ayahsOnLine);
    pageData.lines.push(ayahArray);
    
    // Update ayahRefs and surahRefs
    ayahArray.forEach(ayahRef => {
      pageData.ayahRefs.add(ayahRef);
      const [surahId] = ayahRef.split(':').map(Number);
      pageData.surahRefs.add(surahId);
      
      // Build ayahToPage mapping (only record first occurrence)
      const key = `${LAYOUT_CODE}:${ayahRef}`;
      if (!ayahToPageMap.has(key)) {
        ayahToPageMap.set(key, {
          page: page_number,
          lineIndex: pageData.lines.length - 1
        });
      }
    });
  }

  sqlite.close();
  console.log(`   ✓ Built ${pages.size} pages`);

  return { pages, ayahToPageMap };
}

// Step 3: Write to Firestore
async function writeToFirestore(pages, ayahToPageMap) {
  console.log('\n🔥 Step 3: Writing to Firestore...');
  
  const batcher = new FirestoreBatcher(db, BATCH_SIZE);
  const now = Date.now();

  // 3.1: Write layout metadata
  console.log('\n   Writing layout metadata...');
  const layoutRef = doc(db, 'mushafLayouts', LAYOUT_CODE);
  await batcher.write(layoutRef, {
    name: LAYOUT_NAME,
    type: LAYOUT_TYPE,
    linesPerPage: LINES_PER_PAGE,
    totalPages: TOTAL_PAGES,
    createdAt: now,
    updatedAt: now
  });

  // 3.2: Write pages
  console.log('   Writing pages...');
  let pageCount = 0;
  
  for (const [pageNumber, pageData] of pages) {
    const pageRef = doc(db, 'mushafLayouts', LAYOUT_CODE, 'pages', String(pageNumber));
    
    // Convert lines from nested arrays to array of comma-separated strings
    // Firestore doesn't support nested arrays
    const linesAsStrings = pageData.lines.map(lineArray => lineArray.join(','));
    
    await batcher.write(pageRef, {
      page: pageData.page,
      lines: linesAsStrings, // Now an array of strings instead of nested arrays
      ayahRefs: Array.from(pageData.ayahRefs),
      surahRefs: Array.from(pageData.surahRefs),
      createdAt: now,
      updatedAt: now
    });

    pageCount++;
    if (pageCount % 50 === 0) {
      process.stdout.write(`\r   Written ${pageCount}/${pages.size} pages...`);
    }
  }
  console.log(`\n   ✓ Written all ${pageCount} pages`);

  // 3.3: Write ayahToPage mappings
  console.log('\n   Writing ayah-to-page mappings...');
  let mappingCount = 0;
  
  for (const [key, value] of ayahToPageMap) {
    const [layoutCode, surahId, ayahNumber] = key.split(':');
    const mappingRef = doc(db, 'ayahToPage', layoutCode, surahId, ayahNumber);
    
    await batcher.write(mappingRef, {
      page: value.page,
      lineIndex: value.lineIndex,
      createdAt: now,
      updatedAt: now
    });

    mappingCount++;
    if (mappingCount % 500 === 0) {
      process.stdout.write(`\r   Written ${mappingCount.toLocaleString()} mappings...`);
    }
  }
  console.log(`\n   ✓ Written ${mappingCount.toLocaleString()} ayah-to-page mappings`);

  // Commit any remaining writes
  await batcher.commit();
  console.log('\n   ✓ All data committed to Firestore');
}

// Main execution
async function main() {
  console.log('🚀 Mushaf Layout Seeder');
  console.log('========================\n');
  
  try {
    // Verify files exist
    if (!fs.existsSync(SQLITE_PATH)) {
      throw new Error(`SQLite database not found: ${SQLITE_PATH}`);
    }
    if (!fs.existsSync(UTHMANI_JSON_PATH)) {
      throw new Error(`Uthmani JSON not found: ${UTHMANI_JSON_PATH}`);
    }

    const startTime = Date.now();

    // Step 1: Build word index map
    const wordIndexMap = await buildWordIndexMap();

    // Step 2: Read SQLite layout
    const { pages, ayahToPageMap } = readMushafLayoutFromSQLite(wordIndexMap);

    // Step 3: Write to Firestore
    await writeToFirestore(pages, ayahToPageMap);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Seeding completed successfully in ${duration}s!`);
    console.log('\nNext steps:');
    console.log('  1. Verify /mushafLayouts/madani-15/pages/604 exists');
    console.log('  2. Verify /ayahToPage/madani-15/114/1 resolves to page 604');
    console.log('  3. Build MushafViewer component to render pages');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };


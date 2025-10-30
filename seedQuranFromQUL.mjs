import { initializeApp } from 'firebase/app';
import { getFirestore, writeBatch, doc, collection } from 'firebase/firestore';
import { readFile } from 'fs/promises';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAG4Fcgfv69fKkLiqW9GrE72UHnVdHGwF4",
  authDomain: "manzil-8c263.firebaseapp.com",
  projectId: "manzil-8c263",
  storageBucket: "manzil-8c263.firebasestorage.app",
  messagingSenderId: "926563312491",
  appId: "1:926563312491:web:278e5313ee45568d13e22e",
  measurementId: "G-63PT3V3LVQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Surah metadata (hardcoded since we don't have surah_info.json)
const SURAH_INFO = [
  { id: 1, nameAr: "الفاتِحة", nameEn: "Al-Fatihah", revelationPlace: "Meccan", ayahCount: 7 },
  { id: 2, nameAr: "البَقَرَة", nameEn: "Al-Baqarah", revelationPlace: "Medinan", ayahCount: 286 },
  { id: 3, nameAr: "آل عِمرَان", nameEn: "Ali 'Imran", revelationPlace: "Medinan", ayahCount: 200 },
  { id: 4, nameAr: "النِّسَاء", nameEn: "An-Nisa", revelationPlace: "Medinan", ayahCount: 176 },
  { id: 5, nameAr: "المَائدة", nameEn: "Al-Ma'idah", revelationPlace: "Medinan", ayahCount: 120 },
  { id: 6, nameAr: "الأنعَام", nameEn: "Al-An'am", revelationPlace: "Meccan", ayahCount: 165 },
  { id: 7, nameAr: "الأعرَاف", nameEn: "Al-A'raf", revelationPlace: "Meccan", ayahCount: 206 },
  { id: 8, nameAr: "الأنفَال", nameEn: "Al-Anfal", revelationPlace: "Medinan", ayahCount: 75 },
  { id: 9, nameAr: "التوبَة", nameEn: "At-Tawbah", revelationPlace: "Medinan", ayahCount: 129 },
  { id: 10, nameAr: "يُونس", nameEn: "Yunus", revelationPlace: "Meccan", ayahCount: 109 },
  { id: 11, nameAr: "هُود", nameEn: "Hud", revelationPlace: "Meccan", ayahCount: 123 },
  { id: 12, nameAr: "يُوسُف", nameEn: "Yusuf", revelationPlace: "Meccan", ayahCount: 111 },
  { id: 13, nameAr: "الرَّعْد", nameEn: "Ar-Ra'd", revelationPlace: "Medinan", ayahCount: 43 },
  { id: 14, nameAr: "إبراهِيم", nameEn: "Ibrahim", revelationPlace: "Meccan", ayahCount: 52 },
  { id: 15, nameAr: "الحِجر", nameEn: "Al-Hijr", revelationPlace: "Meccan", ayahCount: 99 },
  { id: 16, nameAr: "النَّحل", nameEn: "An-Nahl", revelationPlace: "Meccan", ayahCount: 128 },
  { id: 17, nameAr: "الإسرَاء", nameEn: "Al-Isra", revelationPlace: "Meccan", ayahCount: 111 },
  { id: 18, nameAr: "الكهف", nameEn: "Al-Kahf", revelationPlace: "Meccan", ayahCount: 110 },
  { id: 19, nameAr: "مَريَم", nameEn: "Maryam", revelationPlace: "Meccan", ayahCount: 98 },
  { id: 20, nameAr: "طه", nameEn: "Taha", revelationPlace: "Meccan", ayahCount: 135 },
  { id: 21, nameAr: "الأنبيَاء", nameEn: "Al-Anbya", revelationPlace: "Meccan", ayahCount: 112 },
  { id: 22, nameAr: "الحَج", nameEn: "Al-Hajj", revelationPlace: "Medinan", ayahCount: 78 },
  { id: 23, nameAr: "المُؤمنون", nameEn: "Al-Mu'minun", revelationPlace: "Meccan", ayahCount: 118 },
  { id: 24, nameAr: "النُّور", nameEn: "An-Nur", revelationPlace: "Medinan", ayahCount: 64 },
  { id: 25, nameAr: "الفُرقان", nameEn: "Al-Furqan", revelationPlace: "Meccan", ayahCount: 77 },
  { id: 26, nameAr: "الشُّعَرَاء", nameEn: "Ash-Shu'ara", revelationPlace: "Meccan", ayahCount: 227 },
  { id: 27, nameAr: "النَّمل", nameEn: "An-Naml", revelationPlace: "Meccan", ayahCount: 93 },
  { id: 28, nameAr: "القَصَص", nameEn: "Al-Qasas", revelationPlace: "Meccan", ayahCount: 88 },
  { id: 29, nameAr: "العَنكبوت", nameEn: "Al-'Ankabut", revelationPlace: "Meccan", ayahCount: 69 },
  { id: 30, nameAr: "الرُّوم", nameEn: "Ar-Rum", revelationPlace: "Meccan", ayahCount: 60 },
  { id: 31, nameAr: "لقمَان", nameEn: "Luqman", revelationPlace: "Meccan", ayahCount: 34 },
  { id: 32, nameAr: "السَّجدَة", nameEn: "As-Sajdah", revelationPlace: "Meccan", ayahCount: 30 },
  { id: 33, nameAr: "الأحزَاب", nameEn: "Al-Ahzab", revelationPlace: "Medinan", ayahCount: 73 },
  { id: 34, nameAr: "سَبَأ", nameEn: "Saba", revelationPlace: "Meccan", ayahCount: 54 },
  { id: 35, nameAr: "فَاطِر", nameEn: "Fatir", revelationPlace: "Meccan", ayahCount: 45 },
  { id: 36, nameAr: "يس", nameEn: "Ya-Sin", revelationPlace: "Meccan", ayahCount: 83 },
  { id: 37, nameAr: "الصَّافات", nameEn: "As-Saffat", revelationPlace: "Meccan", ayahCount: 182 },
  { id: 38, nameAr: "ص", nameEn: "Sad", revelationPlace: "Meccan", ayahCount: 88 },
  { id: 39, nameAr: "الزُّمَر", nameEn: "Az-Zumar", revelationPlace: "Meccan", ayahCount: 75 },
  { id: 40, nameAr: "غَافِر", nameEn: "Ghafir", revelationPlace: "Meccan", ayahCount: 85 },
  { id: 41, nameAr: "فُصِّلَت", nameEn: "Fussilat", revelationPlace: "Meccan", ayahCount: 54 },
  { id: 42, nameAr: "الشُّورَى", nameEn: "Ash-Shuraa", revelationPlace: "Meccan", ayahCount: 53 },
  { id: 43, nameAr: "الزُّخرُف", nameEn: "Az-Zukhruf", revelationPlace: "Meccan", ayahCount: 89 },
  { id: 44, nameAr: "الدخَان", nameEn: "Ad-Dukhan", revelationPlace: "Meccan", ayahCount: 59 },
  { id: 45, nameAr: "الجَاثيَة", nameEn: "Al-Jathiyah", revelationPlace: "Meccan", ayahCount: 37 },
  { id: 46, nameAr: "الأحقاف", nameEn: "Al-Ahqaf", revelationPlace: "Meccan", ayahCount: 35 },
  { id: 47, nameAr: "محَمّد", nameEn: "Muhammad", revelationPlace: "Medinan", ayahCount: 38 },
  { id: 48, nameAr: "الفَتح", nameEn: "Al-Fath", revelationPlace: "Medinan", ayahCount: 29 },
  { id: 49, nameAr: "الحُجُرات", nameEn: "Al-Hujurat", revelationPlace: "Medinan", ayahCount: 18 },
  { id: 50, nameAr: "ق", nameEn: "Qaf", revelationPlace: "Meccan", ayahCount: 45 },
  { id: 51, nameAr: "الذَّاريَات", nameEn: "Adh-Dhariyat", revelationPlace: "Meccan", ayahCount: 60 },
  { id: 52, nameAr: "الطُّور", nameEn: "At-Tur", revelationPlace: "Meccan", ayahCount: 49 },
  { id: 53, nameAr: "النَّجْم", nameEn: "An-Najm", revelationPlace: "Meccan", ayahCount: 62 },
  { id: 54, nameAr: "القَمَر", nameEn: "Al-Qamar", revelationPlace: "Meccan", ayahCount: 55 },
  { id: 55, nameAr: "الرَّحمن", nameEn: "Ar-Rahman", revelationPlace: "Medinan", ayahCount: 78 },
  { id: 56, nameAr: "الوَاقِعَة", nameEn: "Al-Waqi'ah", revelationPlace: "Meccan", ayahCount: 96 },
  { id: 57, nameAr: "الحَديد", nameEn: "Al-Hadid", revelationPlace: "Medinan", ayahCount: 29 },
  { id: 58, nameAr: "المجَادلة", nameEn: "Al-Mujadila", revelationPlace: "Medinan", ayahCount: 22 },
  { id: 59, nameAr: "الحَشر", nameEn: "Al-Hashr", revelationPlace: "Medinan", ayahCount: 24 },
  { id: 60, nameAr: "الممتَحنَة", nameEn: "Al-Mumtahanah", revelationPlace: "Medinan", ayahCount: 13 },
  { id: 61, nameAr: "الصَّف", nameEn: "As-Saf", revelationPlace: "Medinan", ayahCount: 14 },
  { id: 62, nameAr: "الجُمُعَة", nameEn: "Al-Jumu'ah", revelationPlace: "Medinan", ayahCount: 11 },
  { id: 63, nameAr: "المنَافِقون", nameEn: "Al-Munafiqun", revelationPlace: "Medinan", ayahCount: 11 },
  { id: 64, nameAr: "التَّغَابُن", nameEn: "At-Taghabun", revelationPlace: "Medinan", ayahCount: 18 },
  { id: 65, nameAr: "الطَّلَاق", nameEn: "At-Talaq", revelationPlace: "Medinan", ayahCount: 12 },
  { id: 66, nameAr: "التَّحْريم", nameEn: "At-Tahrim", revelationPlace: "Medinan", ayahCount: 12 },
  { id: 67, nameAr: "المُلْك", nameEn: "Al-Mulk", revelationPlace: "Meccan", ayahCount: 30 },
  { id: 68, nameAr: "القَلَم", nameEn: "Al-Qalam", revelationPlace: "Meccan", ayahCount: 52 },
  { id: 69, nameAr: "الحَاقّة", nameEn: "Al-Haqqah", revelationPlace: "Meccan", ayahCount: 52 },
  { id: 70, nameAr: "المعَارج", nameEn: "Al-Ma'arij", revelationPlace: "Meccan", ayahCount: 44 },
  { id: 71, nameAr: "نُوح", nameEn: "Nuh", revelationPlace: "Meccan", ayahCount: 28 },
  { id: 72, nameAr: "الجِنّ", nameEn: "Al-Jinn", revelationPlace: "Meccan", ayahCount: 28 },
  { id: 73, nameAr: "المُزَّمِّل", nameEn: "Al-Muzzammil", revelationPlace: "Meccan", ayahCount: 20 },
  { id: 74, nameAr: "المدَّثِّر", nameEn: "Al-Muddaththir", revelationPlace: "Meccan", ayahCount: 56 },
  { id: 75, nameAr: "القِيَامَة", nameEn: "Al-Qiyamah", revelationPlace: "Meccan", ayahCount: 40 },
  { id: 76, nameAr: "الإنسَان", nameEn: "Al-Insan", revelationPlace: "Medinan", ayahCount: 31 },
  { id: 77, nameAr: "المُرسَلات", nameEn: "Al-Mursalat", revelationPlace: "Meccan", ayahCount: 50 },
  { id: 78, nameAr: "النّبأ", nameEn: "An-Naba", revelationPlace: "Meccan", ayahCount: 40 },
  { id: 79, nameAr: "النّازعات", nameEn: "An-Nazi'at", revelationPlace: "Meccan", ayahCount: 46 },
  { id: 80, nameAr: "عَبَس", nameEn: "Abasa", revelationPlace: "Meccan", ayahCount: 42 },
  { id: 81, nameAr: "التّكوير", nameEn: "At-Takwir", revelationPlace: "Meccan", ayahCount: 29 },
  { id: 82, nameAr: "الانفِطار", nameEn: "Al-Infitar", revelationPlace: "Meccan", ayahCount: 19 },
  { id: 83, nameAr: "المطفّفين", nameEn: "Al-Mutaffifin", revelationPlace: "Meccan", ayahCount: 36 },
  { id: 84, nameAr: "الانشِقاق", nameEn: "Al-Inshiqaq", revelationPlace: "Meccan", ayahCount: 25 },
  { id: 85, nameAr: "البرُوج", nameEn: "Al-Buruj", revelationPlace: "Meccan", ayahCount: 22 },
  { id: 86, nameAr: "الطّارق", nameEn: "At-Tariq", revelationPlace: "Meccan", ayahCount: 17 },
  { id: 87, nameAr: "الأعلى", nameEn: "Al-A'la", revelationPlace: "Meccan", ayahCount: 19 },
  { id: 88, nameAr: "الغَاشِية", nameEn: "Al-Ghashiyah", revelationPlace: "Meccan", ayahCount: 26 },
  { id: 89, nameAr: "الفَجر", nameEn: "Al-Fajr", revelationPlace: "Meccan", ayahCount: 30 },
  { id: 90, nameAr: "البَلَد", nameEn: "Al-Balad", revelationPlace: "Meccan", ayahCount: 20 },
  { id: 91, nameAr: "الشَّمس", nameEn: "Ash-Shams", revelationPlace: "Meccan", ayahCount: 15 },
  { id: 92, nameAr: "اللَّيل", nameEn: "Al-Layl", revelationPlace: "Meccan", ayahCount: 21 },
  { id: 93, nameAr: "الضُّحَى", nameEn: "Ad-Duhaa", revelationPlace: "Meccan", ayahCount: 11 },
  { id: 94, nameAr: "الشَّرْح", nameEn: "Ash-Sharh", revelationPlace: "Meccan", ayahCount: 8 },
  { id: 95, nameAr: "التِّين", nameEn: "At-Tin", revelationPlace: "Meccan", ayahCount: 8 },
  { id: 96, nameAr: "العَلَق", nameEn: "Al-Alaq", revelationPlace: "Meccan", ayahCount: 19 },
  { id: 97, nameAr: "القَدر", nameEn: "Al-Qadr", revelationPlace: "Meccan", ayahCount: 5 },
  { id: 98, nameAr: "البَيِّنَة", nameEn: "Al-Bayyinah", revelationPlace: "Medinan", ayahCount: 8 },
  { id: 99, nameAr: "الزَّلزَلة", nameEn: "Az-Zalzalah", revelationPlace: "Medinan", ayahCount: 8 },
  { id: 100, nameAr: "العَادِيات", nameEn: "Al-'Adiyat", revelationPlace: "Meccan", ayahCount: 11 },
  { id: 101, nameAr: "القَارِعَة", nameEn: "Al-Qari'ah", revelationPlace: "Meccan", ayahCount: 11 },
  { id: 102, nameAr: "التَّكاثُر", nameEn: "At-Takathur", revelationPlace: "Meccan", ayahCount: 8 },
  { id: 103, nameAr: "العَصر", nameEn: "Al-'Asr", revelationPlace: "Meccan", ayahCount: 3 },
  { id: 104, nameAr: "الهُمَزة", nameEn: "Al-Humazah", revelationPlace: "Meccan", ayahCount: 9 },
  { id: 105, nameAr: "الفِيل", nameEn: "Al-Fil", revelationPlace: "Meccan", ayahCount: 5 },
  { id: 106, nameAr: "قُرَيش", nameEn: "Quraysh", revelationPlace: "Meccan", ayahCount: 4 },
  { id: 107, nameAr: "المَاعون", nameEn: "Al-Ma'un", revelationPlace: "Meccan", ayahCount: 7 },
  { id: 108, nameAr: "الكَوثَر", nameEn: "Al-Kawthar", revelationPlace: "Meccan", ayahCount: 3 },
  { id: 109, nameAr: "الكَافِرُون", nameEn: "Al-Kafirun", revelationPlace: "Meccan", ayahCount: 6 },
  { id: 110, nameAr: "النَّصر", nameEn: "An-Nasr", revelationPlace: "Medinan", ayahCount: 3 },
  { id: 111, nameAr: "المَسَد", nameEn: "Al-Masad", revelationPlace: "Meccan", ayahCount: 5 },
  { id: 112, nameAr: "الإخلاص", nameEn: "Al-Ikhlas", revelationPlace: "Meccan", ayahCount: 4 },
  { id: 113, nameAr: "الفَلَق", nameEn: "Al-Falaq", revelationPlace: "Meccan", ayahCount: 5 },
  { id: 114, nameAr: "النَّاس", nameEn: "An-Nas", revelationPlace: "Meccan", ayahCount: 6 }
];

// Helper: Break text into letters array
function textToLetters(text) {
  // Remove whitespace and split into individual characters
  const cleanText = text.replace(/\s+/g, '');
  return Array.from(cleanText).map((ch, idx) => ({
    i: idx + 1,
    ch: ch
  }));
}

// Helper: Commit batch if it has operations
async function commitBatchIfNeeded(batch, operations, force = false, delayMs = 0) {
  if (operations.length >= 500 || (force && operations.length > 0)) {
    await batch.commit();
    console.log(`  📦 Committed batch with ${operations.length} operations`);
    
    // Add delay to avoid rate limiting
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    return { batch: writeBatch(db), operations: [] };
  }
  return { batch, operations };
}

async function seedQuran() {
  console.log('🕌 Starting Quran import from QUL data...\n');
  
  // Configuration
  const START_SURAH = parseInt(process.argv[2]) || 1;  // Allow starting from specific surah
  const BATCH_DELAY_MS = 800;  // 800ms delay between batches to avoid rate limits
  
  console.log(`⚙️  Configuration:`);
  console.log(`   - Starting from Surah: ${START_SURAH}`);
  console.log(`   - Batch delay: ${BATCH_DELAY_MS}ms\n`);

  // Load the uthmani.json file
  console.log('📖 Loading uthmani.json...');
  const quranData = JSON.parse(
    await readFile(new URL('../uthmani.json', import.meta.url), 'utf-8')
  );
  console.log(`✅ Loaded ${Object.keys(quranData).length} word entries\n`);

  // Group words by surah and ayah
  console.log('🔄 Organizing data by Surah and Ayah...');
  const surahs = {};
  
  for (const [key, wordData] of Object.entries(quranData)) {
    const surahNum = Number(wordData.surah);
    const ayahNum = Number(wordData.ayah);
    const wordNum = Number(wordData.word);

    if (!surahs[surahNum]) {
      surahs[surahNum] = {};
    }
    if (!surahs[surahNum][ayahNum]) {
      surahs[surahNum][ayahNum] = [];
    }

    surahs[surahNum][ayahNum].push({
      position: wordNum,
      text: wordData.text,
      id: wordData.id
    });
  }

  console.log(`✅ Organized into ${Object.keys(surahs).length} Surahs\n`);

  // Initialize batch
  let batch = writeBatch(db);
  let operations = [];
  let totalWrites = 0;

  // Process each Surah (starting from START_SURAH)
  for (let surahId = START_SURAH; surahId <= 114; surahId++) {
    const surahInfo = SURAH_INFO.find(s => s.id === surahId) || {
      id: surahId,
      nameAr: `سورة ${surahId}`,
      nameEn: `Surah ${surahId}`,
      revelationPlace: "Unknown",
      ayahCount: Object.keys(surahs[surahId] || {}).length
    };

    const ayahs = surahs[surahId] || {};
    const ayahCount = Object.keys(ayahs).length;

    console.log(`\n📚 Processing Surah ${surahId}: ${surahInfo.nameEn} (${ayahCount} ayahs)`);

    // Create Surah document
    const surahRef = doc(db, 'surahs', String(surahId));
    const surahDoc = {
      id: surahId,
      nameEn: surahInfo.nameEn,
      nameAr: surahInfo.nameAr,
      ayahCount: ayahCount,
      revelationPlace: surahInfo.revelationPlace,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    batch.set(surahRef, surahDoc, { merge: true });
    operations.push('surah');
    totalWrites++;

    // Check batch size after surah
    const result1 = await commitBatchIfNeeded(batch, operations, false, BATCH_DELAY_MS);
    batch = result1.batch;
    operations = result1.operations;

    // Process each Ayah in this Surah
    for (const [ayahNumStr, words] of Object.entries(ayahs).sort((a, b) => Number(a[0]) - Number(b[0]))) {
      const ayahNum = Number(ayahNumStr);
      
      // Sort words by position
      words.sort((a, b) => a.position - b.position);

      // Create Ayah document
      const ayahRef = doc(db, 'surahs', String(surahId), 'ayahs', String(ayahNum));
      const ayahDoc = {
        surahId: surahId,
        ayahNumber: ayahNum,
        wordCount: words.length,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      batch.set(ayahRef, ayahDoc, { merge: true });
      operations.push('ayah');
      totalWrites++;

      // Check batch size after ayah
      const result2 = await commitBatchIfNeeded(batch, operations, false, BATCH_DELAY_MS);
      batch = result2.batch;
      operations = result2.operations;

      // Process each Word in this Ayah
      for (const word of words) {
        const letters = textToLetters(word.text);

        const wordRef = doc(
          db,
          'surahs',
          String(surahId),
          'ayahs',
          String(ayahNum),
          'words',
          String(word.position)
        );

        const wordDoc = {
          id: word.position,
          surahId: surahId,
          ayahId: ayahNum,
          position: word.position,
          textArabic: word.text,
          textTransliterated: '', // We don't have transliteration data
          letters: letters,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        batch.set(wordRef, wordDoc, { merge: true });
        operations.push('word');
        totalWrites++;

        // Check batch size after word
        const result3 = await commitBatchIfNeeded(batch, operations, false, BATCH_DELAY_MS);
        batch = result3.batch;
        operations = result3.operations;
      }
    }

    console.log(`  ✅ Completed Surah ${surahId}: ${surahInfo.nameEn}`);
  }

  // Commit any remaining operations
  await commitBatchIfNeeded(batch, operations, true);

  console.log('\n' + '='.repeat(60));
  console.log('🎉 IMPORT COMPLETE!');
  console.log('='.repeat(60));
  console.log(`📊 Total writes: ${totalWrites}`);
  console.log(`📚 Surahs imported: ${114 - START_SURAH + 1} (${START_SURAH} to 114)`);
  console.log(`✨ All data successfully written to Firestore!`);
  console.log('='.repeat(60) + '\n');

  process.exit(0);
}

// Run the script
seedQuran().catch(error => {
  console.error('❌ Error during import:', error);
  process.exit(1);
});


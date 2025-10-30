#!/usr/bin/env node

// Seed Surah 112 (Al-Ikhlas) with Arabic text and words subcollection
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';

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

const SURAH_ID = 112;
const SURAH_COLLECTION = 'surahs';
const AYAH_SUBCOL = 'ayahs';
const WORDS_SUBCOL = 'words';

const surah112Doc = {
  id: SURAH_ID,
  nameEn: 'Al-Ikhlas',
  nameAr: 'الإخلاص',
  ayahCount: 4,
  revelationPlace: 'Meccan',
  manzil: 7,
  rukusCount: 1,
  hasAnySajdah: false,
  pages: [604],
  juz: [30],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// Ayah data with words
const ayahs = [
  {
    ayah: 1,
    textUthmani: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
    textTransliterated: 'qul huwa allahu ahad',
    words: [
      { i: 1, textArabic: 'قُلْ', textTransliterated: 'qul' },
      { i: 2, textArabic: 'هُوَ', textTransliterated: 'huwa' },
      { i: 3, textArabic: 'اللَّهُ', textTransliterated: 'allahu' },
      { i: 4, textArabic: 'أَحَدٌ', textTransliterated: 'ahad' }
    ]
  },
  {
    ayah: 2,
    textUthmani: 'اللَّهُ الصَّمَدُ',
    textTransliterated: 'allahu assamad',
    words: [
      { i: 1, textArabic: 'اللَّهُ', textTransliterated: 'allahu' },
      { i: 2, textArabic: 'الصَّمَدُ', textTransliterated: 'assamad' }
    ]
  },
  {
    ayah: 3,
    textUthmani: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
    textTransliterated: 'lam yalid walam yulad',
    words: [
      { i: 1, textArabic: 'لَمْ', textTransliterated: 'lam' },
      { i: 2, textArabic: 'يَلِدْ', textTransliterated: 'yalid' },
      { i: 3, textArabic: 'وَلَمْ', textTransliterated: 'walam' },
      { i: 4, textArabic: 'يُولَدْ', textTransliterated: 'yulad' }
    ]
  },
  {
    ayah: 4,
    textUthmani: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    textTransliterated: 'walam yakun lahu kufuwan ahad',
    words: [
      { i: 1, textArabic: 'وَلَمْ', textTransliterated: 'walam' },
      { i: 2, textArabic: 'يَكُن', textTransliterated: 'yakun' },
      { i: 3, textArabic: 'لَّهُ', textTransliterated: 'lahu' },
      { i: 4, textArabic: 'كُفُوًا', textTransliterated: 'kufuwan' },
      { i: 5, textArabic: 'أَحَدٌ', textTransliterated: 'ahad' }
    ]
  }
];

async function seedSurah112() {
  console.log('🌱 Seeding Surah 112 (Al-Ikhlas) with words...');

  try {
    // 1) Create/update surah doc
    await setDoc(doc(db, SURAH_COLLECTION, String(SURAH_ID)), surah112Doc, { merge: true });
    console.log('✅ Created surah document');

    // 2) Create ayahs subcollection and nested words
    for (const a of ayahs) {
      const ayahDoc = {
        surahId: SURAH_ID,
        ayahNumber: a.ayah,
        textUthmani: a.textUthmani,
        textTransliterated: a.textTransliterated,
        wordCount: a.words.length,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(
        doc(db, SURAH_COLLECTION, String(SURAH_ID), AYAH_SUBCOL, String(a.ayah)),
        ayahDoc,
        { merge: true }
      );
      console.log(`✅ Created ayah ${a.ayah}`);

      // Create words subcollection
      for (const word of a.words) {
        const wordDoc = {
          id: word.i,
          surahId: SURAH_ID,
          ayahNumber: a.ayah,
          position: word.i,
          textArabic: word.textArabic,
          textTransliterated: word.textTransliterated,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        await setDoc(
          doc(db, SURAH_COLLECTION, String(SURAH_ID), AYAH_SUBCOL, String(a.ayah), WORDS_SUBCOL, String(word.i)),
          wordDoc,
          { merge: true }
        );
      }
      console.log(`  ✅ Created ${a.words.length} words for ayah ${a.ayah}`);
    }

    console.log('🎉 Surah 112 (Al-Ikhlas) seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Surah 112:', error);
    process.exit(1);
  }
}

seedSurah112();


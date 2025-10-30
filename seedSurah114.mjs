#!/usr/bin/env node

// Seed Surah 114 (An-Nas) with transliterations and nested words→letters
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const SURAH_ID = 114;
const surah114Doc = {
  id: SURAH_ID,
  nameEn: 'An-Nas',
  nameAr: 'النَّاس',
  ayahCount: 6,
  revelationPlace: 'Meccan',
  manzil: 7,
  rukusCount: 1,
  hasAnySajdah: false,
  pages: [604],
  juz: [30],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

function w(i, textTransliterated) {
  return {
    i,
    textTransliterated,
    letters: Array.from(textTransliterated.replace(/\s+/g, ''), (ch, idx) => ({ i: idx + 1, ch }))
  };
}

const ayahs = [
  { ayah: 1, words: [w(1, 'qul'), w(2, 'aoodhu'), w(3, 'birabbi'), w(4, 'in-naas')] },
  { ayah: 2, words: [w(1, 'maliki'), w(2, 'in-naas')] },
  { ayah: 3, words: [w(1, 'ilaahi'), w(2, 'in-naas')] },
  { ayah: 4, words: [w(1, 'min'), w(2, 'sharr(i)'), w(3, 'il-waswaasi'), w(4, 'il-khannaas')] },
  { ayah: 5, words: [w(1, 'alladhi'), w(2, 'yuwaswisu'), w(3, 'fee'), w(4, 'sudoori'), w(5, 'in-naas')] },
  { ayah: 6, words: [w(1, 'minal'), w(2, 'jinnati'), w(3, 'wan-naas')] }
];

async function seed() {
  console.log('🌱 Seeding Surah 114 (An-Nas)...');
  await setDoc(doc(db, 'surahs', String(SURAH_ID)), surah114Doc, { merge: true });

  for (const a of ayahs) {
    const ayahDoc = {
      surahId: SURAH_ID,
      ayah: a.ayah,
      meta: { wordCount: a.words.length },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await setDoc(doc(db, 'surahs', String(SURAH_ID), 'ayahs', String(a.ayah)), ayahDoc, { merge: true });

    for (const word of a.words) {
      const wordDoc = {
        id: word.i,
        surahId: SURAH_ID,
        ayahId: a.ayah,
        position: word.i,
        textTransliterated: word.textTransliterated,
        letters: word.letters,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'surahs', String(SURAH_ID), 'ayahs', String(a.ayah), 'words', String(word.i)), wordDoc, { merge: true });
    }
  }
  console.log('✅ Done.');
}

seed().then(()=>process.exit(0)).catch((e)=>{console.error('❌ Failed:', e); process.exit(1);});



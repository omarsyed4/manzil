import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

// Data model for seeding Surah 114 (An-Nas) using transliterations only
type Letter = { i: number; ch: string };
type Word = { i: number; textTransliterated: string; letters: Letter[] };

const SURAH_ID = 114;

const surah114Doc = {
  id: SURAH_ID,
  nameEn: 'An-Nas',
  nameAr: 'النَّاس',
  ayahCount: 6,
  revelationPlace: 'Meccan' as const,
  manzil: 7,
  rukusCount: 1,
  hasAnySajdah: false,
  pages: [604],
  juz: [30],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// Transliteration-only ayahs with words→letters breakdown
const ayahs: { ayah: number; words: Word[] }[] = [
  {
    ayah: 1,
    words: [
      w(1, 'qul'),
      w(2, 'aoodhu'),
      w(3, 'birabbi'),
      w(4, 'in-naas')
    ]
  },
  {
    ayah: 2,
    words: [
      w(1, 'maliki'),
      w(2, 'in-naas')
    ]
  },
  {
    ayah: 3,
    words: [
      w(1, 'ilaahi'),
      w(2, 'in-naas')
    ]
  },
  {
    ayah: 4,
    words: [
      w(1, 'min'),
      w(2, 'sharr(i)'),
      w(3, 'il-waswaasi'),
      w(4, 'il-khannaas')
    ]
  },
  {
    ayah: 5,
    words: [
      w(1, 'alladhi'),
      w(2, 'yuwaswisu'),
      w(3, 'fee'),
      w(4, 'sudoori'),
      w(5, 'in-naas')
    ]
  },
  {
    ayah: 6,
    words: [
      w(1, 'minal'),
      w(2, 'jinnati'),
      w(3, 'wan-naas')
    ]
  }
];

function w(i: number, textTransliterated: string): Word {
  return {
    i,
    textTransliterated,
    letters: Array.from(textTransliterated.replace(/\s+/g, ''), (ch, idx) => ({ i: idx + 1, ch }))
  };
}

export async function seedSurah114(): Promise<void> {
  const SURAH_COLLECTION = 'surahs';
  const AYAH_SUBCOL = 'ayahs';
  const WORDS_SUBCOL = 'words';

  console.log('🌱 Seeding Surah 114 (An-Nas) with transliterations and words→letters...');

  // 1) Create/update surah doc
  await setDoc(doc(db, SURAH_COLLECTION, String(SURAH_ID)), surah114Doc, { merge: true });

  // 2) Create ayahs subcollection and nested words with letters map
  for (const a of ayahs) {
    const ayahDoc = {
      surahId: SURAH_ID,
      ayah: a.ayah,
      // Store minimal summary fields at ayah; words stored in subcollection
      meta: { wordCount: a.words.length },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await setDoc(doc(db, SURAH_COLLECTION, String(SURAH_ID), AYAH_SUBCOL, String(a.ayah)), ayahDoc, { merge: true });

    for (const word of a.words) {
      const wordDoc = {
        id: word.i,
        surahId: SURAH_ID,
        ayahId: a.ayah,
        position: word.i,
        textTransliterated: word.textTransliterated,
        letters: word.letters, // array of {i, ch}
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(
        doc(db, SURAH_COLLECTION, String(SURAH_ID), AYAH_SUBCOL, String(a.ayah), WORDS_SUBCOL, String(word.i)),
        wordDoc,
        { merge: true }
      );
    }
  }

  console.log('✅ Surah 114 (An-Nas) seeded successfully');
}



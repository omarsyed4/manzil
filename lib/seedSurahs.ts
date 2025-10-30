import { Surah, Ayah, Word } from '../types';

// Sample Surah data (Surah 78 - An-Naba)
export const sampleSurah78: Surah = {
  id: 78,
  name: 'النَّبَأ',
  nameTransliterated: 'An-Naba',
  ayahCount: 40,
  summary: 'The Great News - discusses the Day of Judgment and the resurrection',
  revealedWhen: 'Meccan',
  revealedWhere: 'Mecca',
  juz: 30,
  manzil: 7,
  pages: [582, 583],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// Sample Ayahs for Surah 78
export const sampleAyahs78: Omit<Ayah, 'id' | 'surahId'>[] = [
  {
    textUthmani: 'عَمَّ يَتَسَاءَلُونَ',
    textTransliterated: 'amma yatasaaaloon',
    wordCount: 2,
    audioUrl: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    textUthmani: 'عَنِ النَّبَإِ الْعَظِيمِ',
    textTransliterated: 'ani annabai alazeem',
    wordCount: 3,
    audioUrl: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    textUthmani: 'الَّذِي هُمْ فِيهِ مُخْتَلِفُونَ',
    textTransliterated: 'alladhi hum feehi mukhtalifoon',
    wordCount: 4,
    audioUrl: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// Sample Words for each Ayah
export const sampleWords78: { [ayahId: number]: Omit<Word, 'id' | 'ayahId' | 'surahId'>[] } = {
  1: [
    {
      text: 'عَمَّ',
      textTransliterated: 'amma',
      position: 1,
      expectedDuration: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'يَتَسَاءَلُونَ',
      textTransliterated: 'yatasaaaloon',
      position: 2,
      expectedDuration: 600,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  2: [
    {
      text: 'عَنِ',
      textTransliterated: 'ani',
      position: 1,
      expectedDuration: 300,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'النَّبَإِ',
      textTransliterated: 'annabai',
      position: 2,
      expectedDuration: 500,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'الْعَظِيمِ',
      textTransliterated: 'alazeem',
      position: 3,
      expectedDuration: 500,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  3: [
    {
      text: 'الَّذِي',
      textTransliterated: 'alladhi',
      position: 1,
      expectedDuration: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'هُمْ',
      textTransliterated: 'hum',
      position: 2,
      expectedDuration: 300,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'فِيهِ',
      textTransliterated: 'feehi',
      position: 3,
      expectedDuration: 350,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'مُخْتَلِفُونَ',
      textTransliterated: 'mukhtalifoon',
      position: 4,
      expectedDuration: 600,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ]
};

// Function to seed the database
export async function seedSurahsCollection(firebaseService: any) {
  try {
    console.log('Starting to seed surahs collection...');
    
    // Create the surah document
    await firebaseService.db
      .collection('surahs')
      .doc('78')
      .set(sampleSurah78);
    
    console.log('Created surah 78');
    
    // Create ayahs subcollection
    for (let i = 0; i < sampleAyahs78.length; i++) {
      const ayahData = {
        ...sampleAyahs78[i],
        id: i + 1,
        surahId: 78
      };
      
      await firebaseService.db
        .collection('surahs')
        .doc('78')
        .collection('ayahs')
        .doc((i + 1).toString())
        .set(ayahData);
      
      console.log(`Created ayah ${i + 1}`);
      
      // Create words subcollection for this ayah
      const words = sampleWords78[i + 1] || [];
      for (let j = 0; j < words.length; j++) {
        const wordData = {
          ...words[j],
          id: j + 1,
          ayahId: i + 1,
          surahId: 78
        };
        
        await firebaseService.db
          .collection('surahs')
          .doc('78')
          .collection('ayahs')
          .doc((i + 1).toString())
          .collection('words')
          .doc((j + 1).toString())
          .set(wordData);
      }
      
      console.log(`Created ${words.length} words for ayah ${i + 1}`);
    }
    
    console.log('Successfully seeded surahs collection!');
  } catch (error) {
    console.error('Error seeding surahs collection:', error);
    throw error;
  }
}

// Function to create additional sample surahs
export async function createSampleSurahs(firebaseService: any) {
  const sampleSurahs: Omit<Surah, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 1,
      name: 'الْفَاتِحَة',
      nameTransliterated: 'Al-Fatihah',
      ayahCount: 7,
      summary: 'The Opening - the most important chapter, recited in every prayer',
      revealedWhen: 'Meccan',
      revealedWhere: 'Mecca',
      juz: 1,
      manzil: 1,
      pages: [1, 1]
    },
    {
      id: 2,
      name: 'الْبَقَرَة',
      nameTransliterated: 'Al-Baqarah',
      ayahCount: 286,
      summary: 'The Cow - the longest chapter, contains many laws and guidance',
      revealedWhen: 'Medinan',
      revealedWhere: 'Medina',
      juz: 1,
      manzil: 1,
      pages: [2, 49]
    },
    {
      id: 112,
      name: 'الْإِخْلَاص',
      nameTransliterated: 'Al-Ikhlas',
      ayahCount: 4,
      summary: 'The Sincerity - describes the oneness of Allah',
      revealedWhen: 'Meccan',
      revealedWhere: 'Mecca',
      juz: 30,
      manzil: 7,
      pages: [604, 604]
    }
  ];

  for (const surah of sampleSurahs) {
    await firebaseService.db
      .collection('surahs')
      .doc(surah.id.toString())
      .set({
        ...surah,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
  }
  
  console.log(`Created ${sampleSurahs.length} additional sample surahs`);
}

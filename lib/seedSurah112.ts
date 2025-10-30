import { Surah, Ayah, Word } from '../types';

// Surah 112 - Al-Ikhlas (The Sincerity) - Perfect for testing
export const surah112: Surah = {
  id: 112,
  name: 'الْإِخْلَاص',
  nameTransliterated: 'Al-Ikhlas',
  ayahCount: 4,
  summary: 'The Sincerity - describes the oneness of Allah, one of the most important chapters',
  revealedWhen: 'Meccan',
  revealedWhere: 'Mecca',
  juz: 30,
  manzil: 7,
  pages: [604, 604],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// Complete ayahs for Surah 112 with transliterations
export const ayahs112: Omit<Ayah, 'id' | 'surahId'>[] = [
  {
    textUthmani: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
    textTransliterated: 'qul huwa allahu ahad',
    wordCount: 4,
    audioUrl: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    textUthmani: 'اللَّهُ الصَّمَدُ',
    textTransliterated: 'allahu assamad',
    wordCount: 2,
    audioUrl: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    textUthmani: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
    textTransliterated: 'lam yalid wa lam yoolad',
    wordCount: 4,
    audioUrl: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    textUthmani: 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ',
    textTransliterated: 'wa lam yakun lahu kufuwan ahad',
    wordCount: 5,
    audioUrl: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// Complete words for each ayah with detailed breakdown
export const words112: { [ayahId: number]: Omit<Word, 'id' | 'ayahId' | 'surahId'>[] } = {
  1: [
    {
      text: 'قُلْ',
      textTransliterated: 'qul',
      position: 1,
      expectedDuration: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'هُوَ',
      textTransliterated: 'huwa',
      position: 2,
      expectedDuration: 300,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'اللَّهُ',
      textTransliterated: 'allahu',
      position: 3,
      expectedDuration: 500,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'أَحَدٌ',
      textTransliterated: 'ahad',
      position: 4,
      expectedDuration: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  2: [
    {
      text: 'اللَّهُ',
      textTransliterated: 'allahu',
      position: 1,
      expectedDuration: 500,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'الصَّمَدُ',
      textTransliterated: 'assamad',
      position: 2,
      expectedDuration: 600,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  3: [
    {
      text: 'لَمْ',
      textTransliterated: 'lam',
      position: 1,
      expectedDuration: 300,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'يَلِدْ',
      textTransliterated: 'yalid',
      position: 2,
      expectedDuration: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'وَلَمْ',
      textTransliterated: 'wa lam',
      position: 3,
      expectedDuration: 350,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'يُولَدْ',
      textTransliterated: 'yoolad',
      position: 4,
      expectedDuration: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  4: [
    {
      text: 'وَلَمْ',
      textTransliterated: 'wa lam',
      position: 1,
      expectedDuration: 350,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'يَكُنْ',
      textTransliterated: 'yakun',
      position: 2,
      expectedDuration: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'لَهُ',
      textTransliterated: 'lahu',
      position: 3,
      expectedDuration: 300,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'كُفُوًا',
      textTransliterated: 'kufuwan',
      position: 4,
      expectedDuration: 500,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      text: 'أَحَدٌ',
      textTransliterated: 'ahad',
      position: 5,
      expectedDuration: 400,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ]
};

// Function to seed Surah 112 (Al-Ikhlas) - perfect for testing
export async function seedSurah112(firebaseService: any) {
  try {
    console.log('Starting to seed Surah 112 (Al-Ikhlas)...');
    
    // Create the surah document
    await firebaseService.db
      .collection('surahs')
      .doc('112')
      .set(surah112);
    
    console.log('✅ Created Surah 112 (Al-Ikhlas)');
    
    // Create ayahs subcollection
    for (let i = 0; i < ayahs112.length; i++) {
      const ayahData = {
        ...ayahs112[i],
        id: i + 1,
        surahId: 112
      };
      
      await firebaseService.db
        .collection('surahs')
        .doc('112')
        .collection('ayahs')
        .doc((i + 1).toString())
        .set(ayahData);
      
      console.log(`✅ Created ayah ${i + 1}: "${ayahs112[i].textTransliterated}"`);
      
      // Create words subcollection for this ayah
      const words = words112[i + 1] || [];
      for (let j = 0; j < words.length; j++) {
        const wordData = {
          ...words[j],
          id: j + 1,
          ayahId: i + 1,
          surahId: 112
        };
        
        await firebaseService.db
          .collection('surahs')
          .doc('112')
          .collection('ayahs')
          .doc((i + 1).toString())
          .collection('words')
          .doc((j + 1).toString())
          .set(wordData);
      }
      
      console.log(`✅ Created ${words.length} words for ayah ${i + 1}`);
    }
    
    console.log('🎉 Successfully seeded Surah 112 (Al-Ikhlas) with complete data!');
    console.log('📊 Summary:');
    console.log(`   - Surah: ${surah112.nameTransliterated}`);
    console.log(`   - Ayahs: ${ayahs112.length}`);
    console.log(`   - Total words: ${Object.values(words112).flat().length}`);
    console.log(`   - Perfect for testing Learn Mode!`);
    
  } catch (error) {
    console.error('❌ Error seeding Surah 112:', error);
    throw error;
  }
}

// Function to create additional essential surahs
export async function createEssentialSurahs(firebaseService: any) {
  const essentialSurahs: Omit<Surah, 'createdAt' | 'updatedAt'>[] = [
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
      id: 113,
      name: 'الْفَلَق',
      nameTransliterated: 'Al-Falaq',
      ayahCount: 5,
      summary: 'The Daybreak - seeking protection from evil',
      revealedWhen: 'Meccan',
      revealedWhere: 'Mecca',
      juz: 30,
      manzil: 7,
      pages: [604, 604]
    },
    {
      id: 114,
      name: 'النَّاس',
      nameTransliterated: 'An-Nas',
      ayahCount: 6,
      summary: 'The People - seeking protection from Satan',
      revealedWhen: 'Meccan',
      revealedWhere: 'Mecca',
      juz: 30,
      manzil: 7,
      pages: [604, 604]
    }
  ];

  for (const surah of essentialSurahs) {
    await firebaseService.db
      .collection('surahs')
      .doc(surah.id.toString())
      .set({
        ...surah,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
  }
  
  console.log(`✅ Created ${essentialSurahs.length} additional essential surahs`);
}

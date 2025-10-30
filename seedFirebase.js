#!/usr/bin/env node

/**
 * Firebase Seed Script for Manzil MVP
 * This script seeds Firebase with Surah An-Naba data
 * Run with: node scripts/seedFirebase.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, writeBatch } from 'firebase/firestore';

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

// Mock user ID for seeding
const MOCK_USER_ID = 'seed-user-123';

// Surah An-Naba data
const SURAH_AN_NABA = {
  id: 78,
  name: "An-Naba'",
  ayahCount: 40,
  juz: 30,
  manzil: 7,
  pages: [585, 586]
};

const AYAHS_AN_NABA = [
  { surah: 78, ayah: 1, textUthmani: 'عَمَّ يَتَسَآءَلُونَ', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078001.mp3', wordCount: 3 },
  { surah: 78, ayah: 2, textUthmani: 'عَنِ ٱلنَّبَإِ ٱلْعَظِيمِ', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078002.mp3', wordCount: 3 },
  { surah: 78, ayah: 3, textUthmani: 'ٱلَّذِى هُمْ فِيهِ مُخْتَلِفُونَ', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078003.mp3', wordCount: 4 },
  { surah: 78, ayah: 4, textUthmani: 'كَلَّا سَيَعْلَمُونَ', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078004.mp3', wordCount: 3 },
  { surah: 78, ayah: 5, textUthmani: 'ثُمَّ كَلَّا سَيَعْلَمُونَ', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078005.mp3', wordCount: 4 },
  { surah: 78, ayah: 6, textUthmani: 'أَلَمْ نَجْعَلِ ٱلْأَرْضَ مِهَٰدًا', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078006.mp3', wordCount: 5 },
  { surah: 78, ayah: 7, textUthmani: 'وَٱلْجِبَالَ أَوْتَادًا', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078007.mp3', wordCount: 3 },
  { surah: 78, ayah: 8, textUthmani: 'وَخَلَقْنَٰكُمْ أَزْوَٰجًا', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078008.mp3', wordCount: 3 },
  { surah: 78, ayah: 9, textUthmani: 'وَجَعَلْنَا نَوْمَكُمْ سُبَاتًا', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078009.mp3', wordCount: 3 },
  { surah: 78, ayah: 10, textUthmani: 'وَجَعَلْنَا ٱلَّيْلَ لِبَاسًا', audioUrl: 'https://verses.quran.com/Abdul_Basit_Murattal/mp3/078010.mp3', wordCount: 4 }
];

async function seedFirebase() {
  console.log('🌱 Starting Firebase seeding...');
  
  try {
    // 1. Create Surah
    console.log('📖 Creating Surah An-Naba...');
    await setDoc(doc(db, 'surahs', '78'), SURAH_AN_NABA);
    console.log('✅ Surah created');

    // 2. Create Ayahs
    console.log('📝 Creating Ayahs...');
    const batch = writeBatch(db);
    
    for (const ayah of AYAHS_AN_NABA) {
      const ayahRef = doc(collection(db, 'ayahs'));
      batch.set(ayahRef, ayah);
    }
    
    await batch.commit();
    console.log('✅ 10 Ayahs created');

    // 3. Create Plan
    console.log('📋 Creating Plan...');
    const plan = {
      userId: MOCK_USER_ID,
      surah: 78,
      newPerDay: 3,
      reviewCap: 20,
      ratioNewToReview: '1:3',
      startAyah: 1,
      targetDate: '2024-12-31',
      createdAt: Date.now()
    };
    
    const planRef = await addDoc(collection(db, 'plans'), plan);
    console.log('✅ Plan created with ID:', planRef.id);

    // 4. Create Cards
    console.log('🃏 Creating Cards...');
    const cardsBatch = writeBatch(db);
    const now = Date.now();
    
    // Learning cards (interval < 1)
    for (let i = 1; i <= 3; i++) {
      const cardRef = doc(collection(db, 'cards'));
      cardsBatch.set(cardRef, {
        userId: MOCK_USER_ID,
        type: 'ayah',
        surah: 78,
        ayah: i,
        ease: 2.5,
        stability: 0,
        interval: 0.1,
        dueAt: now - 1000,
        lastScore: 0,
        historyCount: 0,
        updatedAt: now
      });
    }

    // Review cards (interval >= 1)
    for (let i = 4; i <= 7; i++) {
      const cardRef = doc(collection(db, 'cards'));
      cardsBatch.set(cardRef, {
        userId: MOCK_USER_ID,
        type: 'ayah',
        surah: 78,
        ayah: i,
        ease: 2.5,
        stability: 1,
        interval: 1 + (i - 4),
        dueAt: now - (i - 4) * 24 * 60 * 60 * 1000,
        lastScore: 3,
        historyCount: 2,
        updatedAt: now
      });
    }

    // Transition card
    const transitionRef = doc(collection(db, 'cards'));
    cardsBatch.set(transitionRef, {
      userId: MOCK_USER_ID,
      type: 'transition',
      surah: 78,
      ayah: 0,
      ease: 2.5,
      stability: 1,
      interval: 2,
      dueAt: now - 2 * 24 * 60 * 60 * 1000,
      lastScore: 3,
      historyCount: 1,
      updatedAt: now
    });

    await cardsBatch.commit();
    console.log('✅ 8 Cards created (3 learning + 4 review + 1 transition)');

    // 5. Create Sample Attempts
    console.log('📊 Creating Sample Attempts...');
    const attemptsBatch = writeBatch(db);
    
    for (let i = 1; i <= 3; i++) {
      // Learn attempt
      const learnRef = doc(collection(db, 'attempts'));
      attemptsBatch.set(learnRef, {
        userId: MOCK_USER_ID,
        cardId: 'placeholder-card-id',
        surah: 78,
        ayah: i,
        mode: 'learn',
        rlMs: 15000,
        hesitations: 2,
        grade: 'Minor',
        ts: now - 2 * 24 * 60 * 60 * 1000
      });

      // Review attempt
      const reviewRef = doc(collection(db, 'attempts'));
      attemptsBatch.set(reviewRef, {
        userId: MOCK_USER_ID,
        cardId: 'placeholder-card-id',
        surah: 78,
        ayah: i,
        mode: 'review',
        rlMs: 8000,
        hesitations: 1,
        grade: 'Perfect',
        ts: now - 1 * 24 * 60 * 60 * 1000
      });
    }

    await attemptsBatch.commit();
    console.log('✅ 6 Sample attempts created');

    console.log('🎉 Firebase seeding complete!');
    console.log('📊 Summary:');
    console.log('  - 1 Surah (An-Naba)');
    console.log('  - 10 Ayahs');
    console.log('  - 1 Plan');
    console.log('  - 8 Cards (3 learning + 4 review + 1 transition)');
    console.log('  - 6 Sample attempts');
    console.log('');
    console.log('🔗 Check your Firebase Console to see the data!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedFirebase().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

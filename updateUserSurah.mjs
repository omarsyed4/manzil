#!/usr/bin/env node

/**
 * Update user's current learning session to a specific surah
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

const USER_ID = '4SFELm0NfgeqqKmVBH90tnpMq1i1';
const SURAH_ID = 69; // Al-Haqqa
const AYAH_ID = 1;

async function updateUserSession() {
  console.log('🔄 Updating user session...');
  console.log(`   User ID: ${USER_ID}`);
  console.log(`   Target: Surah ${SURAH_ID} (Al-Haqqa), Ayah ${AYAH_ID}`);
  
  try {
    // Get surah info
    const surahRef = doc(db, 'surahs', String(SURAH_ID));
    const surahSnap = await getDoc(surahRef);
    
    if (!surahSnap.exists()) {
      console.error(`❌ Surah ${SURAH_ID} not found in database`);
      console.log('💡 Make sure you\'ve run: npm run seed:quran');
      process.exit(1);
    }
    
    const surahData = surahSnap.data();
    console.log(`✓ Found surah: ${surahData.nameEn} (${surahData.nameAr})`);
    console.log(`   Total ayahs: ${surahData.ayahCount}`);
    
    // Update current session
    const sessionRef = doc(db, 'users', USER_ID, 'sessions', 'current-session');
    const sessionData = {
      surahId: SURAH_ID,
      ayahId: AYAH_ID,
      learnQueue: [1, 2, 3, 4], // First 4 ayahs to learn
      reviewQueue: [],
      isActive: true,
      currentPhase: 'learn',
      updatedAt: Date.now(),
      createdAt: Date.now()
    };
    
    await setDoc(sessionRef, sessionData, { merge: true });
    console.log('✓ Updated current-session document');
    
    // Also update user plan
    const planRef = doc(db, 'users', USER_ID, 'plan', 'plan');
    const planData = {
      surahId: SURAH_ID,
      startAyahId: AYAH_ID,
      updatedAt: Date.now()
    };
    
    await setDoc(planRef, planData, { merge: true });
    console.log('✓ Updated user plan');
    
    console.log('\n✨ Success! User session updated to:');
    console.log(`   📖 Surah: ${SURAH_ID} - ${surahData.nameEn}`);
    console.log(`   📄 Starting Ayah: ${AYAH_ID}`);
    console.log('\nReload your app to see the changes!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating user session:', error);
    process.exit(1);
  }
}

updateUserSession();


#!/usr/bin/env node

// Seed test user with proper session data structure
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { randomUUID } from 'crypto';

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

const USER_ID = 'hkTxlGC5iqVMBDSsjnUbsXaCWem1';

const testUserData = {
  id: USER_ID,
  userId: USER_ID,
  reciter: 'Maher Al Muaiqly',
  language: 'en',
  tajwidColors: false,
  baselineMsPerWord: 420,
  hesitationThresholdMs: 380,
  revealMode: 'mushaf-progressive',
  voiceOnsetMinMs: 120,
  maxWordsPerVoicedBlock: 2,
  wordLengthWeight: {},
  hasCompletedOnboarding: true,
  
  // Pace and performance metrics (NEW)
  paceMinutesPerAyah: 3.5, // Default: 3.5 minutes per ayah (will be updated after first session)
  reviewMinutesPerAyah: 1.5, // Default: 1.5 minutes per review ayah
  totalAyahsLearned: 0,
  totalSessionsCompleted: 0,
  averageAccuracy: 0, // 0-100, will be calculated from sessions
  
  // Progress tracking
  totalWordsLearned: 0,
  currentPosition: {
    surahId: 112,
    ayahNumber: 1
  },
  completedSurahs: [],
  completedPages: [],
  
  // Current session for today (2 ayahs to learn)
  currentSession: {
    sessionId: randomUUID(),
    status: 'not-started',
    surahId: 112,
    startedAt: null,
    completedAt: null,
    
    // Piles
    reviewPile: [], // No review for first-time user
    newPile: [
      { surahId: 112, ayahNumber: 1 },
      { surahId: 112, ayahNumber: 2 }
    ],
    learnedToday: [],
    
    // Metrics
    totalAyahs: 2,
    totalWords: 6, // Ayah 1: 4 words, Ayah 2: 2 words
    ayahsCompleted: 0,
    wordsCompleted: 0,
    
    // Tracking
    problemAreas: [],
    strugglingAyahs: []
  },
  
  createdAt: Date.now(),
  updatedAt: Date.now()
};

async function seedUserData() {
  try {
    console.log(`🌱 Seeding test user data for ${USER_ID}...`);
    
    await setDoc(doc(db, 'users', USER_ID), testUserData, { merge: true });
    
    console.log('✅ User data seeded successfully!');
    console.log('📊 Current session:', testUserData.currentSession);
    console.log('📝 New pile:', testUserData.currentSession.newPile);
    console.log('🎯 Current position:', testUserData.currentPosition);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding user data:', error);
    process.exit(1);
  }
}

seedUserData();


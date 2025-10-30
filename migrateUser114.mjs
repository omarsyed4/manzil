#!/usr/bin/env node

// Migration: rewrite users/{uid} to sessions/current-session for Surah 114
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

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

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/migrateUser114.mjs <UID>');
  process.exit(1);
}

async function migrate() {
  console.log(`🚀 Migrating user ${uid} to sessions/current-session for Surah 114...`);
  const userRef = doc(db, 'users', uid);

  // clear collections: plans, progress, attempts
  for (const name of ['plans', 'progress', 'attempts']) {
    const snap = await getDocs(collection(userRef, name));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`✓ Cleared ${name} (${snap.size})`);
    } else {
      console.log(`- ${name} empty`);
    }
  }

  // create sample history session
  const history = {
    startedAt: Date.now() - 24 * 60 * 60 * 1000,
    endedAt: Date.now() - 23 * 60 * 60 * 1000,
    surahId: 114,
    ayahsCovered: [1, 2],
    wordsPracticed: [
      { surahId: 114, ayahId: 1, wordId: 2 },
      { surahId: 114, ayahId: 2, wordId: 1 }
    ],
    notes: 'Initial warm-up session',
    createdAt: serverTimestamp()
  };
  await setDoc(doc(collection(userRef, 'sessions')), history);
  console.log('✓ Added sample historical session');

  const problemAreas = [
    { surahId: 114, ayahId: 1, wordId: 2, reason: 'hesitation' },
    { surahId: 114, ayahId: 4, wordId: 3, reason: 'pronunciation' },
    { surahId: 114, ayahId: 5, wordId: 5, reason: 'memory' }
  ];

  const nextUpPlan = {
    surahId: 114,
    sequence: [
      { ayahId: 1, kind: 'learn' },
      { ayahId: 2, kind: 'learn' },
      { ayahId: 3, kind: 'learn' },
      { ayahId: 4, kind: 'review' },
      { ayahId: 5, kind: 'review' },
      { ayahId: 6, kind: 'review' }
    ]
  };

  const currentSession = {
    label: 'Current Session — Surah An-Nas',
    isActive: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    surahId: 114,
    problemAreas,
    reviewQueue: problemAreas.map(p => ({ surahId: p.surahId, ayahId: p.ayahId, wordId: p.wordId })),
    nextUpPlan
  };

  await setDoc(doc(userRef, 'sessions', 'current-session'), currentSession, { merge: true });
  console.log('✅ Migration complete.');
}

migrate().then(()=>process.exit(0)).catch(e=>{console.error('❌ Migration failed:', e); process.exit(1);});



import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

type ProblemPointer = { surahId: number; ayahId: number; wordId?: number; reason: string };

export async function migrateUserToSurah114Plan(userId?: string): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) throw new Error('No signed-in user');

  const userRef = doc(db, 'users', uid);
  const sessionsCol = collection(userRef, 'sessions');

  // 1) Clear old subcollections we no longer want (plans, progress, attempts)
  const toClear = ['plans', 'progress', 'attempts'];
  for (const name of toClear) {
    const snap = await getDocs(collection(userRef, name));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }

  // 2) Create historical sessions placeholder (optional example)
  const historySession = {
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
  await setDoc(doc(sessionsCol), historySession);

  // 3) Build problem areas and current-session
  const problemAreas: ProblemPointer[] = [
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
    nextUpPlan,
    // When user masters a problem area, remove it from problemAreas and reviewQueue
  };

  await setDoc(doc(sessionsCol, 'current-session'), currentSession, { merge: true });
}

export async function clearCurrentSession(userId?: string): Promise<void> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) throw new Error('No signed-in user');
  await deleteDoc(doc(db, 'users', uid, 'sessions', 'current-session'));
}



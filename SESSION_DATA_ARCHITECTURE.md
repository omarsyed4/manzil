# Session Data Architecture - Complete Redesign

## Overview
Restructure Firestore to properly track user sessions with a current session map and historical sessions subcollection.

---

## Current Issues

1. **Session data scattered** - Sessions stored in random places
2. **No clear current session** - Hard to know what user should do next
3. **getSurahWithAyahs returning null** - User profile doesn't have proper session/progress data
4. **No session history** - Can't track past sessions or progress over time

---

## New Architecture

### Users Document Structure

```
/users/{userId}
├─ (Profile Fields)
│  ├─ id: string
│  ├─ userId: string
│  ├─ reciter: string
│  ├─ baselineMsPerWord: number
│  ├─ hasCompletedOnboarding: boolean
│  ├─ createdAt: timestamp
│  ├─ updatedAt: timestamp
│  │
├─ (Progress Tracking)
│  ├─ totalAyahsLearned: number
│  ├─ totalWordsLearned: number
│  ├─ currentPosition: {
│  │     surahId: number,
│  │     ayahNumber: number
│  │  }
│  ├─ completedSurahs: number[]
│  ├─ completedPages: number[]
│  │
├─ currentSession: {  ← NEW: Map field for active session
│     sessionId: string (UUID)
│     status: 'not-started' | 'in-progress' | 'completed'
│     surahId: number
│     startedAt: timestamp | null
│     completedAt: timestamp | null
│     
│     // Learning piles
│     reviewPile: LearnedAyah[]  // Yesterday's ayahs to review
│     newPile: AyahToLearn[]     // Today's new ayahs
│     learnedToday: LearnedAyah[] // Completed in this session
│     
│     // Metrics
│     totalAyahs: number
│     totalWords: number
│     ayahsCompleted: number
│     wordsCompleted: number
│     
│     // Problem tracking
│     problemAreas: ProblemArea[]
│     strugglingAyahs: { surahId: number, ayahNumber: number, attempts: number }[]
│  }
│  
└─ (Subcollections)
    └─ pastSessions/{sessionId}  ← NEW: Historical sessions
       ├─ sessionId: string
       ├─ surahId: number
       ├─ startedAt: timestamp
       ├─ completedAt: timestamp
       ├─ duration: number (milliseconds)
       ├─ reviewPile: LearnedAyah[]
       ├─ newPile: AyahToLearn[]
       ├─ learnedToday: LearnedAyah[]
       ├─ totalAyahs: number
       ├─ totalWords: number
       ├─ ayahsCompleted: number
       ├─ wordsCompleted: number
       ├─ problemAreas: ProblemArea[]
       ├─ strugglingAyahs: array
       ├─ overallAccuracy: number
       ├─ averageAttemptsPerAyah: number
       └─ consolidationCompleted: boolean
```

---

## Type Definitions

### Updated Types (src/types/index.ts)

```typescript
export interface AyahToLearn {
  surahId: number;
  ayahNumber: number;
}

export interface LearnedAyah {
  surahId: number;
  ayahNumber: number;
  completedAt: Date;
  masteryLevel: number; // 0-100
  attempts: number;
  accuracy: number; // Average accuracy across all stages
}

export interface ProblemArea {
  surahId: number;
  ayahNumber: number;
  stage: 'listen-shadow' | 'read-recite' | 'recall-memory' | 'transitions' | 'full-recitation';
  issue: string; // Description of the problem
  detectedAt: Date;
  resolved: boolean;
}

export interface CurrentSession {
  sessionId: string;
  status: 'not-started' | 'in-progress' | 'review-complete' | 'learn-complete' | 'all-complete';
  surahId: number;
  startedAt: Date | null;
  completedAt: Date | null;
  
  // Learning piles
  reviewPile: LearnedAyah[];
  newPile: AyahToLearn[];
  learnedToday: LearnedAyah[];
  
  // Metrics
  totalAyahs: number;
  totalWords: number;
  ayahsCompleted: number;
  wordsCompleted: number;
  
  // Problem tracking
  problemAreas: ProblemArea[];
  strugglingAyahs: { surahId: number; ayahNumber: number; attempts: number; }[];
}

export interface PastSession {
  sessionId: string;
  surahId: number;
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
  
  reviewPile: LearnedAyah[];
  newPile: AyahToLearn[];
  learnedToday: LearnedAyah[];
  
  totalAyahs: number;
  totalWords: number;
  ayahsCompleted: number;
  wordsCompleted: number;
  
  problemAreas: ProblemArea[];
  strugglingAyahs: { surahId: number; ayahNumber: number; attempts: number; }[];
  overallAccuracy: number;
  averageAttemptsPerAyah: number;
  consolidationCompleted: boolean;
}

export interface UserDocument {
  // Profile
  id: string;
  userId: string;
  reciter: string;
  baselineMsPerWord: number;
  hesitationThresholdMs: number;
  hasCompletedOnboarding: boolean;
  createdAt: number;
  updatedAt: number;
  
  // Progress
  totalAyahsLearned: number;
  totalWordsLearned: number;
  currentPosition: {
    surahId: number;
    ayahNumber: number;
  };
  completedSurahs: number[];
  completedPages: number[];
  
  // Current active session (map field)
  currentSession: CurrentSession;
}
```

---

## Session Lifecycle

### 1. Session Creation (First Time or New Day)

**Trigger**: User opens app, no active session exists or previous session is complete

**Function**: `createNewSession(userId: string, dailyAyahCount: number = 3)`

**Logic**:
```typescript
async function createNewSession(userId: string, dailyAyahCount: number = 3): Promise<CurrentSession> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const userData = userDoc.data() as UserDocument;
  
  // Get review pile (yesterday's learned ayahs)
  const reviewPile = await getYesterdayLearnedAyahs(userId);
  
  // Get new pile (next N ayahs from currentPosition)
  const newPile = await getNextAyahsToLearn(
    userData.currentPosition.surahId,
    userData.currentPosition.ayahNumber,
    dailyAyahCount
  );
  
  const session: CurrentSession = {
    sessionId: generateUUID(),
    status: 'not-started',
    surahId: userData.currentPosition.surahId,
    startedAt: null,
    completedAt: null,
    reviewPile,
    newPile,
    learnedToday: [],
    totalAyahs: reviewPile.length + newPile.length,
    totalWords: await calculateTotalWords(reviewPile, newPile),
    ayahsCompleted: 0,
    wordsCompleted: 0,
    problemAreas: [],
    strugglingAyahs: []
  };
  
  // Update user document with new currentSession
  await updateDoc(doc(db, 'users', userId), {
    currentSession: session,
    updatedAt: Date.now()
  });
  
  return session;
}
```

---

### 2. Session Start

**Trigger**: User clicks "Start Learning" on Today page

**Updates**:
```typescript
await updateDoc(doc(db, 'users', userId), {
  'currentSession.status': 'in-progress',
  'currentSession.startedAt': serverTimestamp(),
  updatedAt: Date.now()
});
```

---

### 3. Ayah Completion

**Trigger**: User completes recall-memory stage for an ayah

**Function**: `saveAyahCompletion(userId: string, ayahData: LearnedAyah)`

**Logic**:
```typescript
async function saveAyahCompletion(userId: string, ayahData: LearnedAyah) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const currentSession = userDoc.data().currentSession as CurrentSession;
  
  // Add to learnedToday
  const updatedLearnedToday = [...currentSession.learnedToday, ayahData];
  
  // Calculate words completed
  const ayahWordCount = await getAyahWordCount(ayahData.surahId, ayahData.ayahNumber);
  const updatedWordsCompleted = currentSession.wordsCompleted + ayahWordCount;
  
  // Update current session
  await updateDoc(userRef, {
    'currentSession.learnedToday': updatedLearnedToday,
    'currentSession.ayahsCompleted': updatedLearnedToday.length,
    'currentSession.wordsCompleted': updatedWordsCompleted,
    updatedAt: Date.now()
  });
  
  console.log('✅ Ayah completion saved to current session');
}
```

---

### 4. Session Completion

**Trigger**: User completes all ayahs (review + new) and connect-ayahs stage

**Function**: `completeSession(userId: string)`

**Logic**:
```typescript
async function completeSession(userId: string) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data() as UserDocument;
  const currentSession = userData.currentSession;
  
  // 1. Mark session as complete
  const completedSession: CurrentSession = {
    ...currentSession,
    status: 'all-complete',
    completedAt: new Date()
  };
  
  // 2. Calculate session metrics
  const duration = completedSession.startedAt && completedSession.completedAt
    ? completedSession.completedAt.getTime() - completedSession.startedAt.getTime()
    : 0;
    
  const totalAttempts = currentSession.learnedToday.reduce((sum, ayah) => sum + ayah.attempts, 0);
  const averageAccuracy = currentSession.learnedToday.reduce((sum, ayah) => sum + ayah.accuracy, 0) / currentSession.learnedToday.length;
  const averageAttemptsPerAyah = totalAttempts / currentSession.learnedToday.length;
  
  // 3. Create past session document
  const pastSession: PastSession = {
    ...completedSession,
    duration,
    overallAccuracy: averageAccuracy,
    averageAttemptsPerAyah,
    consolidationCompleted: false // Will be updated if consolidation is done
  };
  
  // Save to pastSessions subcollection
  await setDoc(
    doc(db, 'users', userId, 'pastSessions', currentSession.sessionId),
    pastSession
  );
  
  // 4. Update user's overall progress
  const newTotalAyahs = userData.totalAyahsLearned + currentSession.learnedToday.length;
  const newTotalWords = userData.totalWordsLearned + currentSession.wordsCompleted;
  
  // Update currentPosition to the last learned ayah + 1
  const lastLearned = currentSession.learnedToday[currentSession.learnedToday.length - 1];
  const newPosition = {
    surahId: lastLearned.surahId,
    ayahNumber: lastLearned.ayahNumber + 1
  };
  
  // 5. Create tomorrow's session
  const tomorrowSession = await createNewSession(userId, 3);
  
  // 6. Update user document
  await updateDoc(userRef, {
    totalAyahsLearned: newTotalAyahs,
    totalWordsLearned: newTotalWords,
    currentPosition: newPosition,
    currentSession: tomorrowSession,
    updatedAt: Date.now()
  });
  
  console.log('🎉 Session completed and saved to history!');
  console.log('📅 Tomorrow\'s session created');
}
```

---

## Service Functions

### File: `src/lib/sessionService.ts` (Update existing)

```typescript
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { CurrentSession, PastSession, LearnedAyah, AyahToLearn, ProblemArea } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Generate UUID for session IDs
export function generateUUID(): string {
  return uuidv4();
}

// Create a new daily session
export async function createNewSession(
  userId: string,
  dailyAyahCount: number = 3
): Promise<CurrentSession> {
  // Get user's current position
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userDoc.data();
  const currentPosition = userData.currentPosition || { surahId: 112, ayahNumber: 1 };
  
  // Get review pile (yesterday's learned ayahs from last session)
  const reviewPile = await getYesterdayLearnedAyahs(userId);
  
  // Get new pile (next N ayahs to learn)
  const newPile = await getNextAyahsToLearn(
    currentPosition.surahId,
    currentPosition.ayahNumber,
    dailyAyahCount
  );
  
  // Calculate total words
  const totalWords = await calculateTotalWords(reviewPile, newPile);
  
  const session: CurrentSession = {
    sessionId: generateUUID(),
    status: 'not-started',
    surahId: currentPosition.surahId,
    startedAt: null,
    completedAt: null,
    reviewPile,
    newPile,
    learnedToday: [],
    totalAyahs: reviewPile.length + newPile.length,
    totalWords,
    ayahsCompleted: 0,
    wordsCompleted: 0,
    problemAreas: [],
    strugglingAyahs: []
  };
  
  return session;
}

// Get yesterday's learned ayahs
async function getYesterdayLearnedAyahs(userId: string): Promise<LearnedAyah[]> {
  try {
    // Get the most recent past session
    const sessionsRef = collection(db, 'users', userId, 'pastSessions');
    const q = query(sessionsRef, orderBy('completedAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return []; // No previous sessions
    }
    
    const lastSession = snapshot.docs[0].data() as PastSession;
    return lastSession.learnedToday || [];
  } catch (error) {
    console.error('Error getting yesterday\'s ayahs:', error);
    return [];
  }
}

// Get next ayahs to learn
async function getNextAyahsToLearn(
  surahId: number,
  startingAyah: number,
  count: number
): Promise<AyahToLearn[]> {
  // For now, just return the next N ayahs in sequence
  // TODO: Handle surah boundaries, user preferences, etc.
  const ayahs: AyahToLearn[] = [];
  for (let i = 0; i < count; i++) {
    ayahs.push({
      surahId,
      ayahNumber: startingAyah + i
    });
  }
  return ayahs;
}

// Calculate total word count for ayahs
async function calculateTotalWords(
  reviewPile: LearnedAyah[],
  newPile: AyahToLearn[]
): Promise<number> {
  // TODO: Fetch actual word counts from Firestore
  // For now, estimate 5 words per ayah
  return (reviewPile.length + newPile.length) * 5;
}

// Save ayah completion
export async function saveAyahCompletion(
  userId: string,
  ayahData: LearnedAyah
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const currentSession = userDoc.data()?.currentSession as CurrentSession;
  
  if (!currentSession) {
    console.error('No current session found');
    return;
  }
  
  // Add to learnedToday
  const updatedLearnedToday = [...currentSession.learnedToday, ayahData];
  
  // Get word count for this ayah
  const ayahDoc = await getDoc(doc(db, 'surahs', String(ayahData.surahId), 'ayahs', String(ayahData.ayahNumber)));
  const wordCount = ayahDoc.data()?.wordCount || 0;
  
  // Update current session
  await updateDoc(userRef, {
    'currentSession.learnedToday': updatedLearnedToday,
    'currentSession.ayahsCompleted': updatedLearnedToday.length,
    'currentSession.wordsCompleted': currentSession.wordsCompleted + wordCount,
    updatedAt: Date.now()
  });
  
  console.log('✅ Ayah completion saved:', ayahData);
}

// Mark session as started
export async function startSession(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    'currentSession.status': 'in-progress',
    'currentSession.startedAt': new Date(),
    updatedAt: Date.now()
  });
}

// Complete session and archive
export async function completeSession(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  const currentSession = userData?.currentSession as CurrentSession;
  
  if (!currentSession) {
    console.error('No current session to complete');
    return;
  }
  
  // Mark as complete
  currentSession.status = 'all-complete';
  currentSession.completedAt = new Date();
  
  // Calculate metrics
  const duration = currentSession.startedAt && currentSession.completedAt
    ? currentSession.completedAt.getTime() - currentSession.startedAt.getTime()
    : 0;
  
  const totalAttempts = currentSession.learnedToday.reduce((sum, ayah) => sum + ayah.attempts, 0);
  const averageAccuracy = currentSession.learnedToday.reduce((sum, ayah) => sum + ayah.accuracy, 0) / currentSession.learnedToday.length;
  
  // Create past session record
  const pastSession: PastSession = {
    ...currentSession,
    duration,
    overallAccuracy: averageAccuracy,
    averageAttemptsPerAyah: totalAttempts / currentSession.learnedToday.length,
    consolidationCompleted: false
  };
  
  // Save to pastSessions
  await setDoc(
    doc(db, 'users', userId, 'pastSessions', currentSession.sessionId),
    pastSession
  );
  
  // Update user progress
  const newTotalAyahs = userData.totalAyahsLearned + currentSession.learnedToday.length;
  const newTotalWords = userData.totalWordsLearned + currentSession.wordsCompleted;
  
  const lastLearned = currentSession.learnedToday[currentSession.learnedToday.length - 1];
  const newPosition = {
    surahId: lastLearned.surahId,
    ayahNumber: lastLearned.ayahNumber + 1
  };
  
  // Create tomorrow's session
  const tomorrowSession = await createNewSession(userId, 3);
  
  // Update user document
  await updateDoc(userRef, {
    totalAyahsLearned: newTotalAyahs,
    totalWordsLearned: newTotalWords,
    currentPosition: newPosition,
    currentSession: tomorrowSession,
    updatedAt: Date.now()
  });
  
  console.log('🎉 Session completed!');
  console.log('📅 Tomorrow\'s session created');
}

// Get current active session
export async function getCurrentSession(userId: string): Promise<CurrentSession | null> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  return userDoc.data()?.currentSession || null;
}

// Add problem area
export async function addProblemArea(
  userId: string,
  problemArea: ProblemArea
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const currentSession = userDoc.data()?.currentSession as CurrentSession;
  
  const updatedProblems = [...currentSession.problemAreas, problemArea];
  
  await updateDoc(userRef, {
    'currentSession.problemAreas': updatedProblems,
    updatedAt: Date.now()
  });
}

// Mark ayah as struggling
export async function markAyahAsStruggling(
  userId: string,
  surahId: number,
  ayahNumber: number,
  attempts: number
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);
  const currentSession = userDoc.data()?.currentSession as CurrentSession;
  
  const existing = currentSession.strugglingAyahs.find(
    a => a.surahId === surahId && a.ayahNumber === ayahNumber
  );
  
  let updatedStruggling;
  if (existing) {
    updatedStruggling = currentSession.strugglingAyahs.map(a =>
      a.surahId === surahId && a.ayahNumber === ayahNumber
        ? { ...a, attempts }
        : a
    );
  } else {
    updatedStruggling = [
      ...currentSession.strugglingAyahs,
      { surahId, ayahNumber, attempts }
    ];
  }
  
  await updateDoc(userRef, {
    'currentSession.strugglingAyahs': updatedStruggling,
    updatedAt: Date.now()
  });
}
```

---

## Integration with LearnSession

### File: `src/pages/session/LearnSession.tsx`

**On Component Mount**:
```typescript
useEffect(() => {
  const initSession = async () => {
    setIsLoading(true);
    const userId = FirebaseService.getCurrentUserId();
    
    // Get or create current session
    let currentSession = await getCurrentSession(userId);
    if (!currentSession || currentSession.status === 'all-complete') {
      currentSession = await createNewSession(userId, 3);
    }
    
    setCurrentSessionData(currentSession);
    
    // Determine what to show
    if (currentSession.reviewPile.length > 0 && currentSession.status === 'not-started') {
      // Has review pile - start with review
      setShowReview(true);
      setAyahsToLearn(currentSession.reviewPile);
    } else if (currentSession.status === 'review-complete' || currentSession.reviewPile.length === 0) {
      // Review done or no review - start new learning
      setShowReview(false);
      setAyahsToLearn(currentSession.newPile.map(a => ({
        ayah: a.ayahNumber,
        surahId: a.surahId,
        // Fetch full data...
      })));
    }
    
    setIsLoading(false);
  };
  
  initSession();
}, []);
```

**When Ayah Mastered**:
```typescript
const handleAyahMastered = async (attempts: any[]) => {
  const userId = FirebaseService.getCurrentUserId();
  
  const ayahData: LearnedAyah = {
    surahId: currentAyah.surahId,
    ayahNumber: currentAyah.ayah,
    completedAt: new Date(),
    masteryLevel: 100,
    attempts: attempts.length,
    accuracy: 95 // Calculate from attempts
  };
  
  // Save to Firestore immediately
  await saveAyahCompletion(userId, ayahData);
  
  // Update local state
  const updated = [...learnedAyahsInSession, ayahData];
  setLearnedAyahsInSession(updated);
  
  // Check if should connect or continue
  const isLastAyah = (currentIndex + 1) >= ayahsToLearn.length;
  
  if (isLastAyah && updated.length > 1) {
    // Last ayah and multiple learned - connect them
    setShowConnectStage(true);
  } else {
    // More to learn - next ayah
    nextAyah();
  }
};
```

---

## Data Seeding for Testing

### Seed Script: `scripts/seedUserSession.mjs`

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = { /* ... */ };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USER_ID = 'hkTxlGC5iqVMBDSsjnUbsXaCWem1';

const testUserData = {
  id: USER_ID,
  userId: USER_ID,
  reciter: 'Maher Al Muaiqly',
  language: 'en',
  baselineMsPerWord: 420,
  hesitationThresholdMs: 380,
  revealMode: 'mushaf-progressive',
  voiceOnsetMinMs: 120,
  maxWordsPerVoicedBlock: 2,
  wordLengthWeight: {},
  hasCompletedOnboarding: true,
  
  // Progress
  totalAyahsLearned: 0,
  totalWordsLearned: 0,
  currentPosition: {
    surahId: 112,
    ayahNumber: 1
  },
  completedSurahs: [],
  completedPages: [],
  
  // Current session (first time user)
  currentSession: {
    sessionId: generateUUID(),
    status: 'not-started',
    surahId: 112,
    startedAt: null,
    completedAt: null,
    reviewPile: [], // No review for first session
    newPile: [
      { surahId: 112, ayahNumber: 1 },
      { surahId: 112, ayahNumber: 2 }
    ],
    learnedToday: [],
    totalAyahs: 2,
    totalWords: 10, // Estimated
    ayahsCompleted: 0,
    wordsCompleted: 0,
    problemAreas: [],
    strugglingAyahs: []
  },
  
  createdAt: Date.now(),
  updatedAt: Date.now()
};

async function seedUserData() {
  try {
    await setDoc(doc(db, 'users', USER_ID), testUserData, { merge: true });
    console.log('✅ User data seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding user data:', error);
    process.exit(1);
  }
}

seedUserData();
```

---

## Implementation Tasks

### Phase 1: Update Types & Service
1. Add new types to `src/types/index.ts`
2. Update `sessionService.ts` with all new functions
3. Create seed script for test user

### Phase 2: Update LearnSession
1. Read `currentSession` from user document on mount
2. Determine flow based on `reviewPile` and `newPile`
3. Call `saveAyahCompletion` when ayah is mastered
4. Call `completeSession` when all ayahs done

### Phase 3: Update UI Components
1. Today page - read from `currentSession` to show progress
2. Progress page - query `pastSessions` for history
3. Settings - allow changing daily ayah count

### Phase 4: Testing
1. Seed test user with proper session data
2. Test full flow: review → new → connect → complete
3. Verify tomorrow's session is created correctly
4. Test multi-day flow

---

## Benefits

1. ✅ **Clear session state** - Always know what user should do
2. ✅ **Persistent progress** - Data saved immediately, survives page refresh
3. ✅ **Historical tracking** - Can analyze past sessions
4. ✅ **Tomorrow's session ready** - User can immediately start next day
5. ✅ **Problem area tracking** - Identify and focus on weak spots
6. ✅ **Metrics & analytics** - Track accuracy, attempts, duration

---

## Next Steps

1. Should I create this comprehensive plan as an executable implementation?
2. Do you want me to seed your user document first so you can test the current system?
3. Or should I implement the full architecture redesign immediately?


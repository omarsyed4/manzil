# Complete Learn Mode Implementation Plan

## Date: October 28, 2025

---

## Current Critical Bugs

### Bug 1: Recall-Memory Double Transition Call
**Symptoms**: After reaching 100% in recall-memory, `showEncouragementAndProgress` is called twice:
1. First call: Decides to move to next ayah
2. Second call: Decides to connect ayahs (because now it's on a different ayah)

**Root Cause**: The auto-loop in recall-memory's `setStageProgress` callback is still running even after the transition is triggered.

**Log Evidence**:
```
🎉 [Recall Complete] Transitioning...
✅ [Transition] Ayah complete, moving to next ayah
[Immediately followed by]
🎉 [Recall Complete] Transitioning...
✅ [Transition] All ayahs complete! Moving to connect-ayahs stage
```

**Solution**: 
In `src/components/LearnAyahView.tsx`, the recall-memory transition at 100% should:
1. Stop the recognition immediately
2. Clear any pending timeouts
3. Set a flag to prevent the auto-loop from running
4. Only then call `showEncouragementAndProgress`

**Fix Location**: Lines 700-720 in `startSpeechRecognitionRecall`

---

### Bug 2: TransitionPractice Component Error
**Error**: `Cannot read properties of undefined (reading 'map')`

**Root Cause**: `FirebaseService.getAyah()` is returning `null` or `undefined`. The ayah data doesn't exist in Firestore or the fetch is failing.

**Solution**: 
1. Add null checks before accessing `.words`
2. Add error handling and user feedback
3. Consider using the ayah data that's already available in the parent component

**Fix Location**: `src/components/TransitionPractice.tsx`, lines 65-76

---

### Bug 3: Incorrect Session State Tracking
**Problem**: The `learnedAyahs` state in LearnAyahView is:
- Component-level (not persisted)
- Resets when component unmounts/remounts
- Not synchronized with the actual session progress

**Solution**: Use parent-level state management or Firestore to track learned ayahs.

---

## Architecture Changes Needed

### 1. Session-Level State Management

**Current Problem**: 
- LearnAyahView component handles one ayah at a time
- When user completes ayah and moves to next, component re-renders with new props
- `learnedAyahs` state is reset to `[]`
- No way to know which ayahs were already learned in this session

**Solution A (Simpler - Recommended)**:
Lift `learnedAyahs` state to parent component (`LearnSession.tsx`)
- Pass `learnedAyahs` and `onAyahComplete` callback as props to LearnAyahView
- Parent tracks all completed ayahs in the session
- When last ayah is complete, parent decides to show connect-ayahs

**Solution B (Complex)**:
Use Firestore to track session state in real-time
- Create session document when session starts
- Update `learnedAyahs` array in Firestore after each ayah
- Read from Firestore to determine flow

**Recommendation**: Use Solution A for now, implement Solution B later for persistence.

---

### 2. Connect-Ayahs Triggering Logic

**Current Approach** (WRONG):
```typescript
// In LearnAyahView after recall-memory complete
const isLastAyah = (currentAyahIndex + 1) >= totalAyahs;
if (isLastAyah && updatedLearnedAyahs.length > 1) {
  setStage('connect-ayahs');
}
```

**Problem**: `updatedLearnedAyahs` is always just the current ayah (because state resets on unmount)

**Correct Approach**:
```typescript
// In LearnSession.tsx (parent component)
const [learnedAyahsInSession, setLearnedAyahsInSession] = useState<LearnedAyah[]>([]);
const [showConnectStage, setShowConnectStage] = useState(false);

const handleAyahComplete = (ayahData: LearnedAyah) => {
  const updated = [...learnedAyahsInSession, ayahData];
  setLearnedAyahsInSession(updated);
  
  // Check if this was the last ayah
  if (currentAyahIndex + 1 >= totalAyahsForToday) {
    // Last ayah complete!
    if (updated.length >= 2) {
      // Multiple ayahs learned - trigger connect stage
      setShowConnectStage(true);
    } else {
      // Only 1 ayah learned - session complete
      handleSessionComplete(updated);
    }
  } else {
    // More ayahs to learn - move to next
    setCurrentAyahIndex(prev => prev + 1);
  }
};

// Render logic
{!showConnectStage ? (
  <LearnAyahView
    surah={currentSurah}
    ayah={currentAyah}
    onAyahComplete={handleAyahComplete}
    learnedAyahsInSession={learnedAyahsInSession}
    ...
  />
) : (
  <ConnectAyahsStage
    ayahs={learnedAyahsInSession}
    onComplete={() => handleSessionComplete(learnedAyahsInSession)}
  />
)}
```

---

### 3. Ayah-to-Ayah Transition Flow

**Desired Flow for 3 Ayahs**:

```
START SESSION (3 ayahs total)
│
├─ AYAH 1 (0 previously learned)
│   ├─ Intro (full)
│   ├─ Listen-Shadow → Read-Recite → Recall-Memory
│   └─ Complete → onAyahComplete(ayah1Data)
│       → Parent: learnedAyahsInSession = [ayah1]
│       → Parent: currentAyahIndex = 1
│       → Show LearnAyahView with Ayah 2
│
├─ AYAH 2 (1 previously learned)
│   ├─ Intro (simplified: "Ayah 2 of 3")
│   ├─ Listen-Shadow → Read-Recite → Recall-Memory
│   └─ Complete → onAyahComplete(ayah2Data)
│       → Parent: learnedAyahsInSession = [ayah1, ayah2]
│       → Parent: Set showConnectStage = true
│       → Show ConnectAyahsStage
│
├─ CONNECT AYAHS 1-2
│   ├─ TransitionPractice (ayah1→ayah2, 1 pair)
│   └─ FullRecitation (ayah1, ayah2 sequentially)
│   └─ Complete → Back to learning mode
│       → Parent: currentAyahIndex = 2
│       → Show LearnAyahView with Ayah 3
│
├─ AYAH 3 (2 previously learned)
│   ├─ Intro (simplified: "Ayah 3 of 3")
│   ├─ Listen-Shadow → Read-Recite → Recall-Memory
│   └─ Complete → onAyahComplete(ayah3Data)
│       → Parent: learnedAyahsInSession = [ayah1, ayah2, ayah3]
│       → Parent: isLastAyah = true
│       → Parent: Set showConnectStage = true
│       → Show ConnectAyahsStage
│
├─ CONNECT AYAHS 1-2-3 (FINAL)
│   ├─ TransitionPractice (ayah1→2, ayah2→3, 2 pairs)
│   └─ FullRecitation (all 3 sequentially)
│   └─ Complete → SESSION COMPLETE
│       → Create tomorrow's session document
│       → Save today's ayahs to review pile
│       → Load next 3 ayahs for tomorrow's new pile
│
END SESSION
```

---

## Implementation Plan

### Phase 1: Fix Critical Bugs (IMMEDIATE)

#### Task 1.1: Fix Recall-Memory Double Transition
**File**: `src/components/LearnAyahView.tsx`

**Current Code** (lines ~700-720):
```typescript
if (finalProgress >= 100) {
  console.log('🎉 [Recall Complete] Transitioning...');
  if (recognitionRecallRef.current) {
    recognitionRecallRef.current.stop();
  }
  setIsReciting(false);
  setTimeout(() => {
    showEncouragementAndProgress('recall-memory');
  }, 100);
  return 100;
} else {
  setTimeout(() => {
    console.log('🔄 [Auto-Loop] Ready for next attempt...');
    setIsWaitingForSpace(true);
    setTimeout(() => playReadyCue(), 200);
  }, 800);
  return finalProgress;
}
```

**Problem**: The `setTimeout` for auto-loop is still scheduled even after transition starts.

**Fix**: Use a ref to track if transition has started:
```typescript
const transitionStartedRef = useRef(false);

// In the transition block:
if (finalProgress >= 100) {
  console.log('🎉 [Recall Complete] Transitioning...');
  transitionStartedRef.current = true; // Set flag
  if (recognitionRecallRef.current) {
    recognitionRecallRef.current.stop();
  }
  setIsReciting(false);
  setTimeout(() => {
    showEncouragementAndProgress('recall-memory');
  }, 100);
  return 100;
} else {
  // Only schedule auto-loop if transition hasn't started
  if (!transitionStartedRef.current) {
    setTimeout(() => {
      if (!transitionStartedRef.current) { // Double check
        console.log('🔄 [Auto-Loop] Ready for next attempt...');
        setIsWaitingForSpace(true);
        setTimeout(() => playReadyCue(), 200);
      }
    }, 800);
  }
  return finalProgress;
}
```

**Same fix needed for Listen-Shadow and Read-Recite** to prevent any race conditions.

---

#### Task 1.2: Fix TransitionPractice Null Ayah Data
**File**: `src/components/TransitionPractice.tsx`

**Current Code** (lines 65-76):
```typescript
const fromAyahData = await FirebaseService.getAyah(fromAyah.surahId, fromAyah.ayahNumber);
const toAyahData = await FirebaseService.getAyah(toAyah.surahId, toAyah.ayahNumber);

if (!fromAyahData || !toAyahData) {
  console.error('❌ [TransitionPractice] Failed to fetch ayah data');
  continue;
}

const fromFullText = fromAyahData.words.map(w => w.textArabic).join(' ');
```

**Problem**: Even with the null check, if `fromAyahData.words` is undefined, it will crash.

**Fix**: Add defensive checks and better error handling:
```typescript
const fromAyahData = await FirebaseService.getAyah(fromAyah.surahId, fromAyah.ayahNumber);
const toAyahData = await FirebaseService.getAyah(toAyah.surahId, toAyah.ayahNumber);

if (!fromAyahData || !toAyahData) {
  console.error('❌ [TransitionPractice] Failed to fetch ayah data', { fromAyah, toAyah });
  continue;
}

if (!fromAyahData.words || !toAyahData.words) {
  console.error('❌ [TransitionPractice] Ayah data missing words', { fromAyahData, toAyahData });
  continue;
}

const fromFullText = fromAyahData.words.map(w => w.textArabic || '').join(' ');
const toFullText = toAyahData.words.map(w => w.textArabic || '').join(' ');
```

---

### Phase 2: Refactor Session State Management

#### Task 2.1: Lift State to LearnSession.tsx
**File**: `src/pages/session/LearnSession.tsx`

**New State Variables**:
```typescript
const [learnedAyahsInSession, setLearnedAyahsInSession] = useState<LearnedAyah[]>([]);
const [showConnectStage, setShowConnectStage] = useState(false);
const [ayahsToConnect, setAyahsToConnect] = useState<LearnedAyah[]>([]);
```

**New Callback**:
```typescript
const handleAyahComplete = useCallback((completedAyah: LearnedAyah) => {
  const updated = [...learnedAyahsInSession, completedAyah];
  setLearnedAyahsInSession(updated);
  
  console.log('📝 [Session] Ayah completed', {
    completedAyah,
    totalLearned: updated.length,
    currentIndex: currentAyahIndex,
    totalAyahs: ayahsForToday.length
  });
  
  // Check if this was the last ayah
  const isLastAyah = (currentAyahIndex + 1) >= ayahsForToday.length;
  
  if (isLastAyah) {
    // Last ayah complete!
    if (updated.length >= 2) {
      // Multiple ayahs learned - trigger connect stage
      console.log('🔗 [Session] Triggering connect stage for all learned ayahs');
      setAyahsToConnect(updated);
      setShowConnectStage(true);
    } else {
      // Only 1 ayah learned - session complete (no connections needed)
      console.log('✅ [Session] Single ayah complete - session done');
      handleSessionComplete(updated);
    }
  } else {
    // More ayahs to learn
    // Check if we should connect the ayahs learned so far
    if (updated.length >= 2) {
      // We have at least 2 ayahs - connect them before continuing
      console.log('🔗 [Session] Triggering connect stage for current learned ayahs');
      setAyahsToConnect(updated);
      setShowConnectStage(true);
    } else {
      // First ayah - just move to next
      console.log('➡️ [Session] Moving to next ayah');
      setCurrentAyahIndex(prev => prev + 1);
    }
  }
}, [learnedAyahsInSession, currentAyahIndex, ayahsForToday]);
```

---

#### Task 2.2: Update LearnAyahView Props
**File**: `src/components/LearnAyahView.tsx`

**Remove**:
- Internal `learnedAyahs` state
- Internal `connectMode` state
- Internal connect-ayahs stage logic

**New Props**:
```typescript
interface LearnAyahViewProps {
  // ... existing props ...
  onAyahComplete: (ayahData: LearnedAyah) => void; // Changed from onAyahMastered
  // Remove connect-ayahs related props - handled by parent
}
```

**Simplified Transition Logic**:
```typescript
else if (currentStage === 'recall-memory') {
  console.log('➡️ [Stage Transition] recall-memory → Complete!');
  
  // Create ayah completion data
  const completedAyah: LearnedAyah = {
    surahId: surah,
    ayahNumber: ayah,
    completedAt: new Date(),
    masteryLevel: 100
  };
  
  // Pass to parent - parent decides what to do next
  onAyahComplete(completedAyah);
}
```

---

#### Task 2.3: Create ConnectAyahsStage Component
**File**: `src/components/ConnectAyahsStage.tsx` (NEW)

**Purpose**: Standalone component that handles both transition practice and full recitation

**Props**:
```typescript
interface ConnectAyahsStageProps {
  ayahs: LearnedAyah[];
  onComplete: () => void;
}
```

**Implementation**:
```typescript
const ConnectAyahsStage: React.FC<ConnectAyahsStageProps> = ({ ayahs, onComplete }) => {
  const [mode, setMode] = useState<'transitions' | 'full-recitation'>('transitions');
  
  return (
    <div className="min-h-screen bg-dark-bg p-8">
      {mode === 'transitions' ? (
        <TransitionPractice
          ayahs={ayahs}
          onComplete={() => {
            console.log('✅ Transitions complete, moving to full recitation');
            setMode('full-recitation');
          }}
        />
      ) : (
        <FullRecitation
          ayahs={ayahs}
          onComplete={() => {
            console.log('🎉 All connections complete!');
            onComplete();
          }}
        />
      )}
    </div>
  );
};
```

---

#### Task 2.4: Update LearnSession Rendering Logic
**File**: `src/pages/session/LearnSession.tsx`

**Current**:
```typescript
return <LearnAyahView ... />;
```

**Updated**:
```typescript
{!showConnectStage ? (
  <LearnAyahView
    surah={currentSurah}
    ayah={currentAyah}
    onAyahComplete={handleAyahComplete}
    ...otherProps
  />
) : (
  <ConnectAyahsStage
    ayahs={ayahsToConnect}
    onComplete={handleConnectionComplete}
  />
)}
```

**New Handler**:
```typescript
const handleConnectionComplete = useCallback(() => {
  console.log('🎉 [Session] Connection stage complete');
  
  // Check if there are more ayahs to learn
  if (currentAyahIndex + 1 < ayahsForToday.length) {
    // More ayahs - reset and continue
    setShowConnectStage(false);
    setCurrentAyahIndex(prev => prev + 1);
  } else {
    // All ayahs complete - finalize session
    handleSessionComplete(learnedAyahsInSession);
  }
}, [currentAyahIndex, ayahsForToday, learnedAyahsInSession]);
```

---

### Phase 3: Session Persistence & Tomorrow's Session

#### Task 3.1: Create Session Document on Completion
**File**: `src/pages/session/LearnSession.tsx`

**Implementation**:
```typescript
const handleSessionComplete = async (completedAyahs: LearnedAyah[]) => {
  console.log('🎊 [Session] Complete! Creating tomorrow\'s session...');
  
  const userId = FirebaseService.getCurrentUserId();
  if (!userId) return;
  
  // Save today's completed ayahs
  const todaySessionId = generateUUID();
  const todaySession: SessionData = {
    sessionId: todaySessionId,
    userId,
    date: new Date(),
    reviewPile: [], // No review for today (first session)
    newPile: completedAyahs,
    learnedToday: completedAyahs,
    status: 'all-complete'
  };
  
  await saveSessionToUser(userId, todaySession);
  
  // Create tomorrow's session
  await createTomorrowSession(userId, completedAyahs);
  
  // Navigate to completion screen or dashboard
  navigate('/today'); // Or show completion modal
};
```

**Dependencies**: Uses functions from `src/lib/sessionService.ts` (already implemented)

---

#### Task 3.2: Load Review Pile on Session Start
**File**: `src/pages/session/LearnSession.tsx`

**On Component Mount**:
```typescript
useEffect(() => {
  const loadSession = async () => {
    const userId = FirebaseService.getCurrentUserId();
    if (!userId) return;
    
    const currentSession = await getCurrentSessionForUser(userId);
    
    if (currentSession && currentSession.reviewPile.length > 0) {
      // User has ayahs to review from yesterday
      setHasReviewPile(true);
      setReviewPileAyahs(currentSession.reviewPile);
      setNewPileAyahs(currentSession.newPile);
    } else {
      // New user or no review pile
      setHasReviewPile(false);
      // Load default new ayahs (next 3 from user's currentPosition)
      const newAyahs = await getNextAyahsToLearn(userId, 3);
      setNewPileAyahs(newAyahs);
    }
  };
  
  loadSession();
}, []);
```

**Flow**:
1. If `hasReviewPile`: Show review session first (same connect-ayahs flow)
2. After review complete: Move to new pile
3. Learn new ayahs → Connect new ayahs
4. Create tomorrow's session with today's new ayahs as review pile

---

### Phase 4: Consolidation System (PLANNED)

#### Consolidation Triggers

**When to Consolidate**:
1. **After completing a full Mushaf page** (15 lines)
2. **After completing a full Surah** (all ayahs)

**Consolidation Types**:
1. **Page Consolidation**: Recite entire page (15 lines) from memory
2. **Cumulative Surah Review**: Recite surah from beginning to current position

**Detection Logic**:
```typescript
const checkIfConsolidationNeeded = (completedAyah: LearnedAyah, userProgress: UserProgress): ConsolidationType | null => {
  // Check if this ayah completes a page
  const pageInfo = await getPageForAyah(completedAyah.surahId, completedAyah.ayahNumber);
  const ayahsOnPage = await getAyahsOnPage(pageInfo.page);
  const userCompletedOnPage = userProgress.completedAyahs.filter(a => 
    ayahsOnPage.some(p => p.surahId === a.surahId && p.ayahNumber === a.ayahNumber)
  );
  
  if (userCompletedOnPage.length === ayahsOnPage.length) {
    // Completed entire page!
    return {
      type: 'page',
      pageNumber: pageInfo.page,
      ayahs: ayahsOnPage
    };
  }
  
  // Check if this ayah completes a surah
  const surahInfo = await getSurahInfo(completedAyah.surahId);
  if (completedAyah.ayahNumber === surahInfo.totalAyahs) {
    // Completed entire surah!
    return {
      type: 'surah',
      surahId: completedAyah.surahId,
      ayahs: await getAllAyahsInSurah(completedAyah.surahId)
    };
  }
  
  return null; // No consolidation needed
};
```

**Consolidation Flow**:
```
User completes Ayah X
  ↓
Check if page complete
  ↓ YES
Show Page Consolidation:
  - Intro screen: "You've completed page Y! Let's consolidate."
  - Full page recitation from memory
  - Diagnostic: Identify weak spots
  - Remediation: Extra practice on weak ayahs
  - Final test: Perfect page recitation
  ↓
Continue to next session
```

**Storage**:
```typescript
interface UserProgress {
  userId: string;
  currentPosition: { surahId: number; ayahNumber: number };
  completedAyahs: LearnedAyah[];
  completedPages: number[];
  completedSurahs: number[];
  consolidationsDue: ConsolidationType[];
  // ... other fields
}
```

---

## Implementation Order

### Immediate (This Session):
1. ✅ Fix recall-memory double transition bug (add transition flag ref)
2. ✅ Fix TransitionPractice null ayah error (add defensive checks)
3. ✅ Lift learnedAyahsInSession state to LearnSession.tsx
4. ✅ Create ConnectAyahsStage component
5. ✅ Update LearnSession rendering logic
6. ✅ Test complete 3-ayah flow

### Next Session:
7. Implement session persistence (save to Firestore on completion)
8. Implement tomorrow's session creation
9. Implement review pile loading on session start
10. Test multi-day flow (Day 1 learn → Day 2 review + new)

### Future:
11. Plan consolidation detection logic
12. Implement page consolidation flow
13. Implement surah consolidation flow
14. Add consolidation scheduling to session management

---

## Files to Modify (Immediate)

### Critical Fixes:
1. `src/components/LearnAyahView.tsx`
   - Add transition flag refs to prevent double transitions
   - Remove internal learnedAyahs state
   - Change onAyahMastered to onAyahComplete
   - Remove connect-ayahs stage rendering (move to separate component)

2. `src/components/TransitionPractice.tsx`
   - Add defensive null checks for ayah data
   - Add error handling for Firestore fetch failures

3. `src/components/FullRecitation.tsx`
   - Add defensive null checks for ayah data
   - Add error handling for Firestore fetch failures

### Architecture Changes:
4. `src/pages/session/LearnSession.tsx`
   - Add learnedAyahsInSession state
   - Add showConnectStage state
   - Implement handleAyahComplete callback
   - Implement handleConnectionComplete callback
   - Update rendering logic (conditional: LearnAyahView vs ConnectAyahsStage)

5. `src/components/ConnectAyahsStage.tsx` (NEW)
   - Wrapper component for transition practice + full recitation
   - Manages mode switching between the two sub-stages

---

## Testing Strategy

### Test Scenario 1: Single Ayah Session
- User learns 1 ayah
- Complete recall-memory → Session complete (no connect stage)
- Tomorrow's session created with 1 ayah in review pile

### Test Scenario 2: Two Ayah Session
- User learns Ayah 1 → Complete
- Intro for Ayah 2
- User learns Ayah 2 → Complete
- Connect-Ayahs stage (1 transition pair + full recitation of 2)
- Session complete
- Tomorrow's session created with 2 ayahs in review pile

### Test Scenario 3: Three Ayah Session (FULL)
- User learns Ayah 1 → Complete → Intro for Ayah 2
- User learns Ayah 2 → Complete → Connect (1→2) → Intro for Ayah 3
- User learns Ayah 3 → Complete → Connect (1→2→3)
- Session complete
- Tomorrow's session created with 3 ayahs in review pile

### Test Scenario 4: Review + New (Day 2)
- User has 3 ayahs in review pile from yesterday
- Review session: Connect review ayahs (transitions + full)
- After review complete: Move to new pile (3 new ayahs)
- Learn new ayahs → Connect new ayahs
- Session complete
- Tomorrow's session: 3 ayahs in review pile (today's new becomes tomorrow's review)

---

## Consolidation Plan (Future Implementation)

### Data Structure:
```typescript
interface ConsolidationType {
  type: 'page' | 'surah';
  pageNumber?: number;
  surahId?: number;
  ayahs: LearnedAyah[];
  triggeredAt: Date;
  completed: boolean;
}

interface UserProgress {
  userId: string;
  currentPosition: { surahId: number; ayahNumber: number };
  totalAyahsLearned: number;
  completedPages: Set<number>; // Mushaf page numbers
  completedSurahs: Set<number>;
  pendingConsolidations: ConsolidationType[];
  lastConsolidationDate?: Date;
}
```

### Consolidation Flow Component:
```typescript
// src/components/ConsolidationFlow.tsx (FUTURE)
const ConsolidationFlow: React.FC<{
  consolidation: ConsolidationType;
  onComplete: () => void;
}> = ({ consolidation, onComplete }) => {
  // 1. Intro screen explaining consolidation
  // 2. Full recitation of all ayahs in scope (page or surah)
  // 3. Diagnostic analysis (which ayahs had errors)
  // 4. Remediation (extra practice on weak ayahs)
  // 5. Final test (perfect recitation)
  // 6. Mark consolidation complete
};
```

### Integration Points:
- After session complete, check `pendingConsolidations`
- If consolidations pending, show consolidation flow before finalizing
- Update user progress after consolidation complete
- Schedule next consolidation based on completion

---

## Summary of Changes

### Completed:
- ✅ Fixed 99.99% progress bug (34% increments)
- ✅ Removed perfect attempts complexity
- ✅ Fixed stage transition stale state bug
- ✅ Added audio cues
- ✅ Simplified ayah intros
- ✅ Implemented TransitionPractice (basic)
- ✅ Implemented FullRecitation (basic)

### To Fix Now:
- ⚠️ Recall-memory double transition (add flag ref)
- ⚠️ TransitionPractice null ayah error (defensive checks)
- ⚠️ Session state management (lift to parent)
- ⚠️ Create ConnectAyahsStage wrapper component
- ⚠️ Update LearnSession rendering logic

### Planned for Later:
- 📅 Session persistence to Firestore
- 📅 Tomorrow's session creation
- 📅 Review pile implementation
- 📅 Consolidation detection logic
- 📅 Consolidation flow components
- 📅 Multi-day testing

---

## Next Steps

1. Fix the two critical bugs (double transition, null ayah)
2. Refactor state management (lift to parent)
3. Test 3-ayah flow end-to-end
4. Once stable, implement session persistence
5. Then implement consolidation system


# Pace Tracking & Analytics System

## Overview

This document describes the comprehensive pace tracking and analytics system implemented in Manzil. The system intelligently tracks user performance, calculates personalized metrics, and provides actionable insights for optimal Quran memorization.

---

## Core Features

### 1. **Personalized Pace Metrics**

The system tracks two key pace metrics for each user:

- **`paceMinutesPerAyah`**: Average time (in minutes) to learn a new āyah
  - Default: 3.5 minutes
  - Updated after each session using exponential moving average (EMA)
  - Used to calculate accurate ETAs for learning new material

- **`reviewMinutesPerAyah`**: Average time (in minutes) to review an existing āyah
  - Default: 1.5 minutes
  - Separately tracked since reviews are faster than learning
  - Used to calculate accurate ETAs for review sessions

### 2. **Intelligent ETA Calculation**

**Before (Generic):**
```javascript
const estimatedMinutes = Math.round(
  (dueCount * 20 + totalWords * 2.5) / 60
);
```

**After (Personalized):**
```javascript
const estimatedMinutes = Math.round(
  (dueCount * pacePerReviewAyah) + (newTodayCount * pacePerNewAyah)
);
```

The new system:
- Uses user-specific pace metrics instead of generic estimates
- Adapts to each user's learning speed
- Provides increasingly accurate predictions over time
- Accounts for the difference between learning and reviewing

### 3. **Session Metrics Tracking**

After each session, the system calculates:

- **Total Duration**: Actual time spent from start to finish
- **New Āyāt Learned**: Number of new āyāt mastered
- **Review Āyāt Completed**: Number of āyāt reviewed
- **Average Accuracy**: Percentage accuracy across all attempts
- **Session-Specific Pace**: Real-time pace for this session

These metrics are:
1. Stored in the session document for historical analysis
2. Used to update the user's overall pace using EMA
3. Displayed in the Progress page for trend analysis

### 4. **Surah-Level SRS (Spaced Repetition System)**

Implements Anki-style spaced repetition for entire surahs:

**Mastery Levels:**
- **Learning** (< 7 days interval): Recently completed, frequent reviews
- **Young** (7-20 days interval): Basic retention established
- **Mature** (21-89 days interval): Strong retention
- **Mastered** (90+ days interval, 5+ reviews, 90%+ accuracy): Excellent long-term retention

**Algorithm:**
```javascript
// Performance-based interval adjustment
perfect:    ease +0.15, interval * ease
good:       ease +0.05, interval * ease
okay:       ease unchanged, interval * ease * 0.8
struggled:  ease -0.15, interval * 0.5
forgot:     ease -0.2, reset to 1 day
```

**Features:**
- Automatically schedules reviews before "forgetting point"
- Adjusts intervals based on performance
- Prevents both under-reviewing and over-reviewing
- Optimizes long-term retention

### 5. **Consolidation Day Detection**

The system automatically determines when a consolidation day is needed:

**Triggers:**
- 3+ surahs are currently due for review, OR
- 5+ surahs are due within the next 3 days

**Purpose:**
- Prevents memory decay
- Strengthens weak surahs before they're forgotten
- Maintains overall retention quality

---

## UI Updates

### Today Page Improvements

1. **Conditional Review Display**
   - Hides "Review" section when `reviewPile` is empty
   - Adjusts layout to show only "Learn" for new users
   - Session type changes from "Review → Learn → Memorize" to just "Learn → Memorize"

2. **Accurate ETA**
   - Displays personalized time estimate
   - Updates dynamically as user's pace improves
   - Shows realistic completion time

3. **Visual Improvements**
   - Responsive grid layout (3 cols → 2 cols when no reviews)
   - Cleaner information hierarchy
   - Better use of screen space

### Progress Page

A comprehensive analytics dashboard showing:

**Key Metrics:**
- Total āyāt learned
- Sessions completed
- Average accuracy
- Personal pace

**Quran Progress:**
- Overall completion percentage
- Estimated time to complete (days/years)
- Completed surahs count
- Āyāt remaining

**Pace Insights:**
- Learning pace vs review pace
- Performance trends
- Session history

**Upcoming Reviews:**
- Next 7 days of scheduled reviews
- Mastery level indicators
- Days until review

**AI Insights:**
- Personalized recommendations based on metrics
- Warnings for low accuracy
- Suggestions for pace optimization
- Consolidation reminders
- Positive reinforcement for good progress

---

## Data Architecture

### User Document Structure

```typescript
interface UserProfile {
  // ... existing fields ...
  
  // NEW: Pace and performance metrics
  paceMinutesPerAyah: number;        // e.g., 3.5
  reviewMinutesPerAyah: number;       // e.g., 1.5
  totalAyahsLearned: number;          // e.g., 0
  totalSessionsCompleted: number;     // e.g., 0
  averageAccuracy: number;            // e.g., 0 (0-100)
}
```

### Session Document Structure

```typescript
interface CurrentSession {
  // ... existing fields ...
  
  // NEW: Session-specific metrics
  paceMinutesPerAyah?: number;       // Pace for this session
  totalDurationMinutes?: number;      // Total time spent
  averageAccuracy?: number;           // Session accuracy
}
```

### Surah Review Document Structure

```typescript
interface SurahReview {
  surahId: number;
  completedAt: Date;
  lastReviewedAt: Date | null;
  nextReviewDue: Date;                // When to review next
  ease: number;                       // 2.5 default, like Anki
  interval: number;                   // Days between reviews
  reviewCount: number;                // Total reviews
  averageAccuracy: number;            // 0-100
  masteryLevel: 'learning' | 'young' | 'mature' | 'mastered';
}
```

Storage: `users/{userId}/surahReviews/{surahId}`

---

## Implementation Details

### 1. PaceTracker Service (`src/lib/paceTracker.ts`)

**Core Functions:**

- `calculateSessionMetrics()`: Analyzes session performance
- `updateUserPace()`: Updates user's overall pace using EMA
- `updateSessionMetrics()`: Stores metrics in session document
- `completeSession()`: Orchestrates all updates at session end
- `estimateQuranCompletionDays()`: Calculates completion time
- `estimateSurahCompletionDays()`: Per-surah estimates

**Exponential Moving Average (EMA):**
```javascript
const alpha = 0.3; // 30% weight to new data, 70% to history
newPace = (alpha * sessionPace) + ((1 - alpha) * currentPace);
```

This smooths out variations while still adapting to changes.

### 2. SurahSRS Service (`src/lib/surahSRS.ts`)

**Core Functions:**

- `initializeSurahReview()`: Called when surah is completed
- `updateSurahReview()`: Called after each surah review
- `getDueSurahs()`: Returns surahs that need review now
- `getUpcomingSurahs()`: Returns surahs due within N days
- `shouldScheduleConsolidation()`: Determines if consolidation needed
- `calculateSRS()`: Implements the SM-2 algorithm
- `determineMasteryLevel()`: Assigns mastery level

### 3. Integration Points

**LearnSession.tsx:**
```javascript
// On session completion
await PaceTracker.completeSession(userId, currentSession, startTime);

// On surah completion
await SurahSRS.initializeSurahReview(userId, surahId);
```

**Today.tsx:**
```javascript
// Calculate accurate ETA
const pacePerNewAyah = userProfile?.paceMinutesPerAyah || 3.5;
const pacePerReviewAyah = userProfile?.reviewMinutesPerAyah || 1.5;
const estimatedMinutes = Math.round(
  (dueCount * pacePerReviewAyah) + (newTodayCount * pacePerNewAyah)
);
```

---

## Future Enhancements

1. **Historical Trend Analysis**
   - Graph pace improvements over time
   - Identify optimal learning times
   - Track accuracy trends

2. **Smart Consolidation Scheduling**
   - Automatically schedule consolidation days
   - Integrate with user's calendar
   - Send reminders for due reviews

3. **Adaptive Learning**
   - Adjust session difficulty based on pace
   - Recommend optimal session lengths
   - Personalize learning strategies

4. **Gamification**
   - Achievements for pace milestones
   - Leaderboards (optional)
   - Streak tracking

5. **Advanced Analytics**
   - Time-of-day performance analysis
   - Problem area heatmaps
   - Retention curve visualization

---

## Testing & Validation

### Manual Testing Steps

1. **Seed Test Data:**
   ```bash
   node scripts/seedTestUser.mjs
   ```

2. **Complete a Learning Session:**
   - Start session from Today page
   - Learn 2-3 āyāt
   - Observe pace calculation in console

3. **Check Progress Page:**
   - Navigate to Progress
   - Verify metrics are displayed
   - Check ETA calculations

4. **Test Consolidation:**
   - Manually create multiple surah reviews
   - Verify consolidation detection
   - Check upcoming reviews list

### Console Logging

The system includes comprehensive logging:

```
⏱️ [ETA Calculation] {
  reviewCount: 0,
  newCount: 2,
  pacePerReview: 1.5,
  pacePerNew: 3.5,
  totalEstimate: 7,
  source: 'user-specific-pace'
}

📊 [PaceTracker] Session metrics calculated {
  totalDurationMinutes: 6.5,
  newAyahsLearned: 2,
  reviewAyahsCompleted: 0,
  averageAccuracy: 87,
  paceMinutesPerNewAyah: 3.25,
  paceMinutesPerReviewAyah: 1.5
}

✅ [PaceTracker] User pace updated {
  oldNewPace: 3.5,
  newNewPace: 3.4,
  oldReviewPace: 1.5,
  newReviewPace: 1.5,
  oldAccuracy: 0,
  newAccuracy: 87,
  sessionsCompleted: 1
}
```

---

## Benefits

1. **For Users:**
   - Realistic time estimates
   - Personalized learning experience
   - Clear progress tracking
   - Actionable insights
   - Optimal retention scheduling

2. **For the System:**
   - Data-driven decision making
   - Adaptive algorithms
   - Performance optimization
   - Quality control
   - Long-term engagement

3. **For Learning Outcomes:**
   - Better retention through SRS
   - Reduced burnout (accurate ETAs)
   - Improved accuracy (feedback loops)
   - Sustainable pace
   - Long-term success

---

## Summary

The pace tracking system transforms Manzil from a generic learning tool into a personalized memorization companion. By tracking individual pace, implementing intelligent scheduling, and providing actionable insights, the system helps users memorize the Quran more effectively and sustainably.

**Key Achievements:**
✅ Personalized pace metrics
✅ Accurate ETA calculations
✅ Surah-level SRS tracking
✅ Consolidation detection
✅ Comprehensive Progress page
✅ Data-driven insights
✅ Seamless integration

The foundation is now in place for advanced features like predictive analytics, adaptive learning, and intelligent scheduling.


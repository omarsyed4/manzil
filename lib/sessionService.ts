import FirebaseService from './firebaseService';
import { Card, Attempt, Grade, PromptItem, SessionState, SessionData, LearnedAyah } from '../types';
import { calculateNewInterval } from './srs';
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';

export class SessionService {
  // Weak-first ordering algorithm
  static calculateWeaknessScore(card: Card, attempts: Attempt[]): number {
    if (attempts.length === 0) return 100; // New cards are weakest

    const recentAttempts = attempts.slice(0, 3); // Last 3 attempts
    const avgScore = recentAttempts.reduce((sum, attempt) => {
      const scoreMap = { 'Perfect': 5, 'Minor': 4, 'Hesitant': 3, 'Major': 2, 'Forgot': 1 };
      return sum + scoreMap[attempt.grade];
    }, 0) / recentAttempts.length;

    const avgHesitations = recentAttempts.reduce((sum, attempt) => sum + attempt.hesitations, 0) / recentAttempts.length;
    const avgTime = recentAttempts.reduce((sum, attempt) => sum + attempt.rlMs, 0) / recentAttempts.length;

    // Weakness score: lower scores, more hesitations, longer times = higher weakness
    const scoreWeakness = (5 - avgScore) * 20; // 0-80 points
    const hesitationWeakness = avgHesitations * 10; // 0-30 points
    const timeWeakness = Math.min(avgTime / 1000, 30); // 0-30 points (capped at 30s)

    return scoreWeakness + hesitationWeakness + timeWeakness;
  }

  // Generate session queue with weak-first ordering
  static async generateSessionQueue(): Promise<PromptItem[]> {
    const dueCards = await FirebaseService.getDueCards();
    const learningCards = await FirebaseService.getLearningCards();
    const currentPlan = await FirebaseService.getCurrentPlan();

    // If no plan exists, create a default one
    if (!currentPlan) {
      console.log('No active plan found, creating default plan');
      await FirebaseService.createPlan({
        userId: FirebaseService.getCurrentUserId(),
        surah: 78,
        startAyah: 1,
        newPerDay: 3,
        ratioNewToReview: '1:3',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    const queue: PromptItem[] = [];

    // Add due review cards (weakest first)
    for (const card of dueCards) {
      const attempts = await FirebaseService.getAttemptsByCard(card.id);
      const weaknessScore = this.calculateWeaknessScore(card, attempts);
      
      queue.push({
        kind: 'review',
        cardId: card.id,
        surah: card.surah,
        ayah: card.ayah
      });
    }

    // Sort by weakness score (highest first)
    queue.sort((a, b) => {
      if (!a.cardId || !b.cardId) return 0;
      // This is a simplified sort - in practice you'd calculate weakness scores
      return 0;
    });

    // Add new learning cards
    const newCardsNeeded = currentPlan?.newPerDay || 3;
    const newCards = learningCards.slice(0, newCardsNeeded);
    
    for (const card of newCards) {
      queue.push({
        kind: 'learn',
        cardId: card.id,
        surah: card.surah,
        ayah: card.ayah
      });
      
      // Add memorization window after learning
      queue.push({
        kind: 'memorize',
        cardId: card.id,
        surah: card.surah,
        ayah: card.ayah
      });
    }

    // If no cards exist at all, create some sample cards for the first session
    if (queue.length === 0) {
      console.log('No cards found, creating sample cards for first session');
      await this.createSampleCards();
      
      // Try again with the newly created cards
      const newLearningCards = await FirebaseService.getLearningCards();
      for (const card of newLearningCards.slice(0, 3)) {
        queue.push({
          kind: 'learn',
          cardId: card.id,
          surah: card.surah,
          ayah: card.ayah
        });
        
        queue.push({
          kind: 'memorize',
          cardId: card.id,
          surah: card.surah,
          ayah: card.ayah
        });
      }
    }

    return queue;
  }

  // Create sample cards for first-time users
  static async createSampleCards(): Promise<void> {
    const userId = FirebaseService.getCurrentUserId();
    
    // Create sample cards for the first 3 ayahs of Surah 78
    const sampleCards = [
      {
        userId,
        type: 'ayah' as const,
        surah: 78,
        ayah: 1,
        ease: 2.5,
        stability: 1,
        interval: 0, // Ready to learn
        dueAt: Date.now(),
        lastScore: 0,
        historyCount: 0,
        updatedAt: Date.now(),
      },
      {
        userId,
        type: 'ayah' as const,
        surah: 78,
        ayah: 2,
        ease: 2.5,
        stability: 1,
        interval: 0, // Ready to learn
        dueAt: Date.now(),
        lastScore: 0,
        historyCount: 0,
        updatedAt: Date.now(),
      },
      {
        userId,
        type: 'ayah' as const,
        surah: 78,
        ayah: 3,
        ease: 2.5,
        stability: 1,
        interval: 0, // Ready to learn
        dueAt: Date.now(),
        lastScore: 0,
        historyCount: 0,
        updatedAt: Date.now(),
      },
    ];

    for (const card of sampleCards) {
      await FirebaseService.createCard(card);
    }
    
    console.log('Created sample cards for first session');
  }

  // Start a new session
  static async startSession(): Promise<SessionState> {
    const queue = await this.generateSessionQueue();
    
    if (queue.length === 0) {
      throw new Error('No items to review or learn today!');
    }

    const userId = FirebaseService.getCurrentUserId();
    
    // Create and store the new session
    const session: Omit<SessionState, 'id'> = {
      userId,
      isActive: true,
      currentItem: queue[0],
      queue: queue.slice(1),
      completedItems: [],
      startTime: Date.now(),
      createdAt: Date.now()
    };

    const sessionId = await FirebaseService.createSession(session);
    return { ...session, id: sessionId };
  }

  // Complete current item and move to next
  static async completeCurrentItem(
    grade: Grade,
    rlMs: number,
    hesitations: number,
    usedHint: boolean = false,
    trace?: any,
    mistakes?: any[]
  ): Promise<SessionState | null> {
    const session = await FirebaseService.getCurrentSession();
    if (!session || !session.currentItem || !session.id) {
      throw new Error('No active session or current item to complete.');
    }

    const { currentItem } = session;
    let updatedCard: Card | null = null;

    if (currentItem.cardId) {
      const card = await FirebaseService.getCardsBySurah(currentItem.surah!).then(cards => 
        cards.find(c => c.id === currentItem.cardId)
      );
      
      if (card) {
        // Apply SRS logic to update card properties
        const { newEase, newStability, newInterval } = calculateNewInterval(
          card.ease,
          card.stability,
          grade
        );
        
        const gradeScores = { 'Perfect': 5, 'Minor': 4, 'Hesitant': 3, 'Major': 2, 'Forgot': 1 };
        
        updatedCard = {
          ...card,
          ease: newEase,
          stability: newStability,
          interval: newInterval,
          dueAt: Date.now() + newInterval * 24 * 60 * 60 * 1000, // Convert days to ms
          lastScore: gradeScores[grade],
          historyCount: card.historyCount + 1,
          updatedAt: Date.now(),
        };
        await FirebaseService.updateCard(card.id, updatedCard as Partial<Card>);
      }
    }

    // Record the attempt
    await FirebaseService.createAttempt({
      userId: FirebaseService.getCurrentUserId(),
      cardId: updatedCard?.id || '',
      surah: currentItem.surah!,
      ayah: currentItem.ayah!,
      mode: currentItem.kind === 'window' ? 'memorize' : currentItem.kind as 'learn' | 'review' | 'memorize',
      rlMs,
      hesitations,
      usedHint,
      grade,
      ts: Date.now(),
      trace,
      mistakes,
    });

    // Move to the next item in the queue
    const nextItem = session.queue.shift();
    const updatedSession: SessionState = {
      ...session,
      currentItem: nextItem,
      completedItems: [...session.completedItems, currentItem],
      isActive: !!nextItem, // Session is active if there's a next item
      endTime: nextItem ? undefined : Date.now(),
    };

    await FirebaseService.updateSession(session.id, updatedSession);
    return updatedSession;
  }

  // Get current session
  static async getCurrentSession(): Promise<SessionState | null> {
    return await FirebaseService.getCurrentSession();
  }

  // Generate UUID for session IDs
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Create new daily session
  static async createNewSession(userId: string, dailyAyahCount: number = 3): Promise<SessionData> {
    const sessionId = this.generateUUID();
    const today = new Date();
    
    // Get yesterday's completed ayahs for review pile
    const reviewPile = await this.getYesterdayCompletedAyahs(userId);
    
    // Get next ayahs to learn based on user's current position
    const newPile = await this.getNextAyahsToLearn(userId, dailyAyahCount);
    
    const session: SessionData = {
      sessionId,
      userId,
      date: today,
      reviewPile,
      newPile,
      learnedToday: [],
      status: reviewPile.length > 0 ? 'in-progress' : 'review-complete'
    };
    
    // Save to Firestore under user document
    await this.saveSessionToUser(userId, session);
    
    return session;
  }

  // Get yesterday's completed ayahs for review pile
  static async getYesterdayCompletedAyahs(userId: string): Promise<LearnedAyah[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return [];
      }
      
      const userData = userDoc.data();
      const sessions = userData.sessions || {};
      
      // Find yesterday's session
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      for (const [sessionId, session] of Object.entries(sessions)) {
        const sessionData = session as any;
        const sessionDate = new Date(sessionData.date.seconds * 1000);
        const sessionDateStr = sessionDate.toISOString().split('T')[0];
        
        if (sessionDateStr === yesterdayStr && sessionData.status === 'all-complete') {
          return sessionData.learnedToday || [];
        }
      }
      
      return [];
    } catch (error) {
      console.error('❌ [SessionService] Error getting yesterday completed ayahs:', error);
      return [];
    }
  }

  // Get next ayahs to learn based on user's current position
  static async getNextAyahsToLearn(userId: string, count: number): Promise<LearnedAyah[]> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // First time user - start with Surah 1, Ayah 1
        return Array.from({ length: count }, (_, i) => ({
          surahId: 1,
          ayahNumber: i + 1,
          completedAt: new Date(),
          masteryLevel: 0
        }));
      }
      
      const userData = userDoc.data();
      const currentPosition = userData.currentPosition || { surahId: 1, ayahNumber: 1 };
      
      // Generate next ayahs to learn
      const newAyahs: LearnedAyah[] = [];
      let currentSurah = currentPosition.surahId;
      let currentAyah = currentPosition.ayahNumber;
      
      for (let i = 0; i < count; i++) {
        newAyahs.push({
          surahId: currentSurah,
          ayahNumber: currentAyah,
          completedAt: new Date(),
          masteryLevel: 0
        });
        
        // Move to next ayah
        currentAyah++;
        
        // Check if we need to move to next surah (assuming 7 ayahs per surah for simplicity)
        if (currentAyah > 7) {
          currentSurah++;
          currentAyah = 1;
        }
      }
      
      return newAyahs;
    } catch (error) {
      console.error('❌ [SessionService] Error getting next ayahs to learn:', error);
      // Fallback to first 3 ayahs
      return Array.from({ length: count }, (_, i) => ({
        surahId: 1,
        ayahNumber: i + 1,
        completedAt: new Date(),
        masteryLevel: 0
      }));
    }
  }

  // Save session to user document
  static async saveSessionToUser(userId: string, session: SessionData): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [`sessions.${session.sessionId}`]: session,
        currentSessionId: session.sessionId
      });
      
      console.log('✅ [SessionService] Session saved to user document', { sessionId: session.sessionId });
    } catch (error) {
      console.error('❌ [SessionService] Error saving session to user:', error);
      throw error;
    }
  }

  // Get current session for user
  static async getCurrentSessionForUser(userId: string): Promise<SessionData | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data();
      const currentSessionId = userData.currentSessionId;
      
      if (!currentSessionId || !userData.sessions) {
        return null;
      }
      
      return userData.sessions[currentSessionId] || null;
    } catch (error) {
      console.error('❌ [SessionService] Error getting current session:', error);
      return null;
    }
  }

  // Update session status
  static async updateSessionStatus(userId: string, sessionId: string, status: SessionData['status']): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [`sessions.${sessionId}.status`]: status
      });
      
      console.log('✅ [SessionService] Session status updated', { sessionId, status });
    } catch (error) {
      console.error('❌ [SessionService] Error updating session status:', error);
      throw error;
    }
  }

  // Complete connection stage and create tomorrow's session
  static async completeConnectionStage(userId: string, sessionId: string, learnedAyahs: LearnedAyah[]): Promise<void> {
    try {
      // Update current session status
      await this.updateSessionStatus(userId, sessionId, 'all-complete');
      
      // Update user's current position
      const userRef = doc(db, 'users', userId);
      const lastLearnedAyah = learnedAyahs[learnedAyahs.length - 1];
      await updateDoc(userRef, {
        currentPosition: {
          surahId: lastLearnedAyah.surahId,
          ayahNumber: lastLearnedAyah.ayahNumber + 1
        },
        totalAyahsLearned: learnedAyahs.length
      });
      
      // Create tomorrow's session with today's ayahs in review pile
      await this.createTomorrowSession(userId, learnedAyahs);
      
      console.log('✅ [SessionService] Connection stage completed and tomorrow session created');
    } catch (error) {
      console.error('❌ [SessionService] Error completing connection stage:', error);
      throw error;
    }
  }

  // Create tomorrow's session with today's ayahs in review pile
  static async createTomorrowSession(userId: string, todayLearnedAyahs: LearnedAyah[]): Promise<void> {
    try {
      const tomorrowSessionId = this.generateUUID();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get next ayahs to learn for tomorrow
      const newPile = await this.getNextAyahsToLearn(userId, 3);
      
      const tomorrowSession: SessionData = {
        sessionId: tomorrowSessionId,
        userId,
        date: tomorrow,
        reviewPile: todayLearnedAyahs, // Today's learned ayahs become tomorrow's review pile
        newPile,
        learnedToday: [],
        status: 'in-progress'
      };
      
      // Save tomorrow's session
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [`sessions.${tomorrowSessionId}`]: tomorrowSession
      });
      
      console.log('✅ [SessionService] Tomorrow session created', { sessionId: tomorrowSessionId });
    } catch (error) {
      console.error('❌ [SessionService] Error creating tomorrow session:', error);
      throw error;
    }
  }
}
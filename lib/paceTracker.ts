/**
 * Pace Tracking Service
 * 
 * Calculates and updates user pace metrics based on session performance.
 * Tracks how fast users learn new ayahs and review existing ones.
 */

import { db } from './firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { CurrentSession, UserProfile, LearnedAyah } from '../types';

export interface SessionMetrics {
  totalDurationMinutes: number;
  newAyahsLearned: number;
  reviewAyahsCompleted: number;
  averageAccuracy: number;
  paceMinutesPerNewAyah: number;
  paceMinutesPerReviewAyah: number;
}

export class PaceTracker {
  /**
   * Calculate session metrics based on session data
   */
  static calculateSessionMetrics(
    session: CurrentSession,
    startTime: Date,
    endTime: Date
  ): SessionMetrics {
    const durationMs = endTime.getTime() - startTime.getTime();
    const totalDurationMinutes = durationMs / (1000 * 60);
    
    const newAyahsLearned = session.newPile.length;
    const reviewAyahsCompleted = session.reviewPile.length;
    
    // Calculate pace per ayah type
    const totalAyahs = newAyahsLearned + reviewAyahsCompleted;
    
    // Default paces if no ayahs completed
    let paceMinutesPerNewAyah = 3.5;
    let paceMinutesPerReviewAyah = 1.5;
    
    if (totalAyahs > 0) {
      // Estimate based on total duration
      // Assume new ayahs take 2.5x longer than reviews
      // If only new: all time goes to new
      // If only reviews: all time goes to reviews
      // If mixed: weighted average
      
      if (newAyahsLearned > 0 && reviewAyahsCompleted === 0) {
        paceMinutesPerNewAyah = totalDurationMinutes / newAyahsLearned;
      } else if (reviewAyahsCompleted > 0 && newAyahsLearned === 0) {
        paceMinutesPerReviewAyah = totalDurationMinutes / reviewAyahsCompleted;
      } else if (newAyahsLearned > 0 && reviewAyahsCompleted > 0) {
        // Mixed session - use weighted calculation
        // Assume new ayahs take 2.5x longer than reviews
        const reviewWeight = 1.0;
        const newWeight = 2.5;
        
        const totalWeightedUnits = (reviewAyahsCompleted * reviewWeight) + (newAyahsLearned * newWeight);
        const minutesPerUnit = totalDurationMinutes / totalWeightedUnits;
        
        paceMinutesPerReviewAyah = minutesPerUnit * reviewWeight;
        paceMinutesPerNewAyah = minutesPerUnit * newWeight;
      }
    }
    
    // Calculate average accuracy from learned ayahs
    const learnedAyahs = session.learnedToday || [];
    const totalAccuracy = learnedAyahs.reduce((sum, ayah) => sum + (ayah.accuracy || 0), 0);
    const averageAccuracy = learnedAyahs.length > 0 ? totalAccuracy / learnedAyahs.length : 0;
    
    return {
      totalDurationMinutes,
      newAyahsLearned,
      reviewAyahsCompleted,
      averageAccuracy,
      paceMinutesPerNewAyah,
      paceMinutesPerReviewAyah
    };
  }
  
  /**
   * Update user profile with new pace metrics
   * Uses exponential moving average to smooth out variations
   */
  static async updateUserPace(
    userId: string,
    sessionMetrics: SessionMetrics
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error('❌ [PaceTracker] User document not found');
        return;
      }
      
      const userData = userDoc.data() as UserProfile;
      
      // Use exponential moving average (EMA) for smoothing
      // Alpha = 0.3 means new data has 30% weight, historical has 70%
      const alpha = 0.3;
      
      const currentNewPace = userData.paceMinutesPerAyah || 3.5;
      const currentReviewPace = userData.reviewMinutesPerAyah || 1.5;
      const currentAvgAccuracy = userData.averageAccuracy || 0;
      const currentTotalSessions = userData.totalSessionsCompleted || 0;
      const currentTotalAyahs = userData.totalAyahsLearned || 0;
      
      // Calculate new paces using EMA
      const newPacePerNewAyah = sessionMetrics.newAyahsLearned > 0
        ? (alpha * sessionMetrics.paceMinutesPerNewAyah) + ((1 - alpha) * currentNewPace)
        : currentNewPace;
      
      const newPacePerReviewAyah = sessionMetrics.reviewAyahsCompleted > 0
        ? (alpha * sessionMetrics.paceMinutesPerReviewAyah) + ((1 - alpha) * currentReviewPace)
        : currentReviewPace;
      
      // Calculate new average accuracy using cumulative average
      const totalAyahsProcessed = currentTotalSessions > 0 ? currentTotalAyahs : sessionMetrics.newAyahsLearned;
      const newAverageAccuracy = currentTotalSessions > 0
        ? ((currentAvgAccuracy * totalAyahsProcessed) + (sessionMetrics.averageAccuracy * sessionMetrics.newAyahsLearned)) / (totalAyahsProcessed + sessionMetrics.newAyahsLearned)
        : sessionMetrics.averageAccuracy;
      
      // Update user document
      await updateDoc(userRef, {
        paceMinutesPerAyah: Math.round(newPacePerNewAyah * 10) / 10, // Round to 1 decimal
        reviewMinutesPerAyah: Math.round(newPacePerReviewAyah * 10) / 10,
        averageAccuracy: Math.round(newAverageAccuracy),
        totalSessionsCompleted: currentTotalSessions + 1,
        totalAyahsLearned: currentTotalAyahs + sessionMetrics.newAyahsLearned,
        updatedAt: Date.now()
      });
      
      console.log('✅ [PaceTracker] User pace updated', {
        oldNewPace: currentNewPace,
        newNewPace: Math.round(newPacePerNewAyah * 10) / 10,
        oldReviewPace: currentReviewPace,
        newReviewPace: Math.round(newPacePerReviewAyah * 10) / 10,
        oldAccuracy: currentAvgAccuracy,
        newAccuracy: Math.round(newAverageAccuracy),
        sessionsCompleted: currentTotalSessions + 1
      });
      
    } catch (error) {
      console.error('❌ [PaceTracker] Error updating user pace:', error);
      throw error;
    }
  }
  
  /**
   * Update session with calculated metrics
   */
  static async updateSessionMetrics(
    userId: string,
    sessionId: string,
    metrics: SessionMetrics
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        'currentSession.paceMinutesPerAyah': Math.round(metrics.paceMinutesPerNewAyah * 10) / 10,
        'currentSession.totalDurationMinutes': Math.round(metrics.totalDurationMinutes),
        'currentSession.averageAccuracy': Math.round(metrics.averageAccuracy),
        'currentSession.completedAt': new Date(),
        updatedAt: Date.now()
      });
      
      console.log('✅ [PaceTracker] Session metrics updated', {
        sessionId,
        durationMinutes: Math.round(metrics.totalDurationMinutes),
        pacePerAyah: Math.round(metrics.paceMinutesPerNewAyah * 10) / 10,
        accuracy: Math.round(metrics.averageAccuracy)
      });
      
    } catch (error) {
      console.error('❌ [PaceTracker] Error updating session metrics:', error);
      throw error;
    }
  }
  
  /**
   * Complete session and update all pace metrics
   */
  static async completeSession(
    userId: string,
    session: CurrentSession,
    startTime: Date
  ): Promise<void> {
    const endTime = new Date();
    
    // Calculate metrics
    const metrics = this.calculateSessionMetrics(session, startTime, endTime);
    
    console.log('📊 [PaceTracker] Session metrics calculated', metrics);
    
    // Update session with metrics
    await this.updateSessionMetrics(userId, session.sessionId, metrics);
    
    // Update user's overall pace
    await this.updateUserPace(userId, metrics);
  }
  
  /**
   * Estimate completion time for entire Quran based on current pace
   */
  static estimateQuranCompletionDays(
    paceMinutesPerAyah: number,
    dailyCommitmentMinutes: number,
    ayahsRemaining: number
  ): number {
    const totalMinutesNeeded = ayahsRemaining * paceMinutesPerAyah;
    const daysNeeded = Math.ceil(totalMinutesNeeded / dailyCommitmentMinutes);
    return daysNeeded;
  }
  
  /**
   * Estimate completion time for a specific surah
   */
  static estimateSurahCompletionDays(
    paceMinutesPerAyah: number,
    dailyCommitmentMinutes: number,
    surahAyahCount: number
  ): number {
    return this.estimateQuranCompletionDays(paceMinutesPerAyah, dailyCommitmentMinutes, surahAyahCount);
  }
}


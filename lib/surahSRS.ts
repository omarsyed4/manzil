/**
 * Surah-Level Spaced Repetition System (SRS)
 * 
 * Implements Anki-style spaced repetition for entire surahs.
 * Schedules reviews to occur just before the user is likely to forget,
 * strengthening long-term retention.
 */

import { db } from './firebase';
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { SurahReview } from '../types';

export type ReviewPerformance = 'perfect' | 'good' | 'okay' | 'struggled' | 'forgot';

export class SurahSRS {
  /**
   * Initialize surah review tracking when user completes a surah
   */
  static async initializeSurahReview(
    userId: string,
    surahId: number
  ): Promise<void> {
    try {
      const surahReviewRef = doc(db, 'users', userId, 'surahReviews', String(surahId));
      
      const now = new Date();
      const initialReview: SurahReview = {
        surahId,
        completedAt: now,
        lastReviewedAt: null,
        nextReviewDue: this.calculateNextReviewDate(now, 1), // 1 day initial interval
        ease: 2.5, // Anki default
        interval: 1, // Start with 1 day
        reviewCount: 0,
        averageAccuracy: 100, // Assume perfect on initial completion
        masteryLevel: 'learning'
      };
      
      await setDoc(surahReviewRef, initialReview);
      
      console.log('✅ [SurahSRS] Initialized surah review', {
        surahId,
        nextReview: initialReview.nextReviewDue
      });
      
    } catch (error) {
      console.error('❌ [SurahSRS] Error initializing surah review:', error);
      throw error;
    }
  }
  
  /**
   * Update surah review after user completes a review session
   */
  static async updateSurahReview(
    userId: string,
    surahId: number,
    performance: ReviewPerformance,
    accuracy: number
  ): Promise<void> {
    try {
      const surahReviewRef = doc(db, 'users', userId, 'surahReviews', String(surahId));
      const surahReviewDoc = await getDoc(surahReviewRef);
      
      if (!surahReviewDoc.exists()) {
        console.error('❌ [SurahSRS] Surah review not found, initializing...');
        await this.initializeSurahReview(userId, surahId);
        return;
      }
      
      const currentReview = surahReviewDoc.data() as SurahReview;
      const now = new Date();
      
      // Calculate new ease and interval using modified Anki algorithm
      const { newEase, newInterval } = this.calculateSRS(
        currentReview.ease,
        currentReview.interval,
        performance
      );
      
      // Update average accuracy using exponential moving average
      const alpha = 0.3; // 30% weight to new data
      const newAvgAccuracy = (alpha * accuracy) + ((1 - alpha) * currentReview.averageAccuracy);
      
      // Determine mastery level based on interval and review count
      const masteryLevel = this.determineMasteryLevel(newInterval, currentReview.reviewCount + 1, newAvgAccuracy);
      
      // Calculate next review date
      const nextReviewDue = this.calculateNextReviewDate(now, newInterval);
      
      // Update the document
      await updateDoc(surahReviewRef, {
        lastReviewedAt: now,
        nextReviewDue,
        ease: newEase,
        interval: newInterval,
        reviewCount: currentReview.reviewCount + 1,
        averageAccuracy: newAvgAccuracy,
        masteryLevel
      });
      
      console.log('✅ [SurahSRS] Updated surah review', {
        surahId,
        performance,
        oldInterval: currentReview.interval,
        newInterval,
        nextReview: nextReviewDue,
        masteryLevel
      });
      
    } catch (error) {
      console.error('❌ [SurahSRS] Error updating surah review:', error);
      throw error;
    }
  }
  
  /**
   * Get all surahs due for review
   */
  static async getDueSurahs(userId: string): Promise<SurahReview[]> {
    try {
      const now = new Date();
      const surahReviewsRef = collection(db, 'users', userId, 'surahReviews');
      
      const q = query(
        surahReviewsRef,
        where('nextReviewDue', '<=', now),
        orderBy('nextReviewDue', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const dueSurahs = querySnapshot.docs.map(doc => doc.data() as SurahReview);
      
      console.log('📋 [SurahSRS] Found due surahs:', dueSurahs.length);
      
      return dueSurahs;
      
    } catch (error) {
      console.error('❌ [SurahSRS] Error getting due surahs:', error);
      return [];
    }
  }
  
  /**
   * Get surahs approaching their "forgetting point" (due within next 7 days)
   */
  static async getUpcomingSurahs(userId: string, daysAhead: number = 7): Promise<SurahReview[]> {
    try {
      const now = new Date();
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + daysAhead);
      
      const surahReviewsRef = collection(db, 'users', userId, 'surahReviews');
      
      const q = query(
        surahReviewsRef,
        where('nextReviewDue', '>', now),
        where('nextReviewDue', '<=', futureDate),
        orderBy('nextReviewDue', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const upcomingSurahs = querySnapshot.docs.map(doc => doc.data() as SurahReview);
      
      console.log(`📋 [SurahSRS] Surahs due in next ${daysAhead} days:`, upcomingSurahs.length);
      
      return upcomingSurahs;
      
    } catch (error) {
      console.error('❌ [SurahSRS] Error getting upcoming surahs:', error);
      return [];
    }
  }
  
  /**
   * Calculate new ease and interval using modified Anki SM-2 algorithm
   */
  private static calculateSRS(
    currentEase: number,
    currentInterval: number,
    performance: ReviewPerformance
  ): { newEase: number; newInterval: number } {
    let newEase = currentEase;
    let newInterval = currentInterval;
    
    switch (performance) {
      case 'perfect':
        // Ease +0.15, interval * ease
        newEase = Math.min(currentEase + 0.15, 3.5); // Cap at 3.5
        newInterval = Math.round(currentInterval * newEase);
        break;
        
      case 'good':
        // Ease +0.05, interval * ease
        newEase = Math.min(currentEase + 0.05, 3.5);
        newInterval = Math.round(currentInterval * newEase);
        break;
        
      case 'okay':
        // Ease unchanged, interval * ease * 0.8
        newEase = currentEase;
        newInterval = Math.round(currentInterval * newEase * 0.8);
        break;
        
      case 'struggled':
        // Ease -0.15, interval * 0.5
        newEase = Math.max(currentEase - 0.15, 1.3); // Floor at 1.3
        newInterval = Math.max(Math.round(currentInterval * 0.5), 1);
        break;
        
      case 'forgot':
        // Ease -0.2, reset to 1 day
        newEase = Math.max(currentEase - 0.2, 1.3);
        newInterval = 1; // Reset to 1 day
        break;
    }
    
    // Cap maximum interval at 180 days (6 months)
    newInterval = Math.min(newInterval, 180);
    
    return { newEase, newInterval };
  }
  
  /**
   * Calculate next review date based on interval
   */
  private static calculateNextReviewDate(fromDate: Date, intervalDays: number): Date {
    const nextDate = new Date(fromDate);
    nextDate.setDate(nextDate.getDate() + intervalDays);
    return nextDate;
  }
  
  /**
   * Determine mastery level based on interval, review count, and accuracy
   */
  private static determineMasteryLevel(
    interval: number,
    reviewCount: number,
    averageAccuracy: number
  ): SurahReview['masteryLevel'] {
    // Mastered: 90+ days interval, 5+ reviews, 90%+ accuracy
    if (interval >= 90 && reviewCount >= 5 && averageAccuracy >= 90) {
      return 'mastered';
    }
    
    // Mature: 21+ days interval, 3+ reviews
    if (interval >= 21 && reviewCount >= 3) {
      return 'mature';
    }
    
    // Young: 7+ days interval
    if (interval >= 7) {
      return 'young';
    }
    
    // Learning: everything else
    return 'learning';
  }
  
  /**
   * Get performance level from accuracy percentage
   */
  static getPerformanceFromAccuracy(accuracy: number): ReviewPerformance {
    if (accuracy >= 95) return 'perfect';
    if (accuracy >= 85) return 'good';
    if (accuracy >= 70) return 'okay';
    if (accuracy >= 50) return 'struggled';
    return 'forgot';
  }
  
  /**
   * Check if it's time for a consolidation day
   * Consolidation day = multiple surahs are due or approaching due date
   */
  static async shouldScheduleConsolidation(userId: string): Promise<{
    shouldConsolidate: boolean;
    dueSurahs: SurahReview[];
    upcomingSurahs: SurahReview[];
  }> {
    const dueSurahs = await this.getDueSurahs(userId);
    const upcomingSurahs = await this.getUpcomingSurahs(userId, 3); // Next 3 days
    
    // Schedule consolidation if:
    // 1. 3+ surahs are due, OR
    // 2. 5+ surahs are due within next 3 days
    const shouldConsolidate = dueSurahs.length >= 3 || (dueSurahs.length + upcomingSurahs.length) >= 5;
    
    return {
      shouldConsolidate,
      dueSurahs,
      upcomingSurahs
    };
  }
  
  /**
   * Get all surah reviews for a user (for analytics)
   */
  static async getAllSurahReviews(userId: string): Promise<SurahReview[]> {
    try {
      const surahReviewsRef = collection(db, 'users', userId, 'surahReviews');
      const querySnapshot = await getDocs(surahReviewsRef);
      
      return querySnapshot.docs.map(doc => doc.data() as SurahReview);
      
    } catch (error) {
      console.error('❌ [SurahSRS] Error getting all surah reviews:', error);
      return [];
    }
  }
}


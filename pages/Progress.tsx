import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserProfile, SurahReview } from '../types';
import { PaceTracker } from '../lib/paceTracker';
import { SurahSRS } from '../lib/surahSRS';

interface ProgressStats {
  totalAyahsLearned: number;
  totalSessionsCompleted: number;
  averageAccuracy: number;
  paceMinutesPerAyah: number;
  reviewMinutesPerAyah: number;
  completedSurahs: SurahReview[];
  upcomingReviews: SurahReview[];
  estimatedDaysToFinishQuran: number;
}

const Progress: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyCommitment, setDailyCommitment] = useState(15); // Default 15 minutes

  useEffect(() => {
    const loadProgressData = async () => {
      try {
        setIsLoading(true);
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          console.error('No user authenticated');
          navigate('/');
          return;
        }

        // Get user profile
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          console.error('User document not found');
          return;
        }
        
        const userData = userDocSnap.data() as UserProfile;
        setUserProfile(userData);

        // Get surah reviews
        const allSurahReviews = await SurahSRS.getAllSurahReviews(userId);
        const upcomingReviews = await SurahSRS.getUpcomingSurahs(userId, 7);
        
        // Calculate estimated days to finish Quran
        const totalAyahsInQuran = 6236;
        const ayahsRemaining = totalAyahsInQuran - (userData.totalAyahsLearned || 0);
        const estimatedDays = PaceTracker.estimateQuranCompletionDays(
          userData.paceMinutesPerAyah || 3.5,
          dailyCommitment,
          ayahsRemaining
        );
        
        setStats({
          totalAyahsLearned: userData.totalAyahsLearned || 0,
          totalSessionsCompleted: userData.totalSessionsCompleted || 0,
          averageAccuracy: userData.averageAccuracy || 0,
          paceMinutesPerAyah: userData.paceMinutesPerAyah || 3.5,
          reviewMinutesPerAyah: userData.reviewMinutesPerAyah || 1.5,
          completedSurahs: allSurahReviews,
          upcomingReviews,
          estimatedDaysToFinishQuran: estimatedDays
        });
        
      } catch (error) {
        console.error('Error loading progress data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgressData();
  }, [navigate, dailyCommitment]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-text-secondary">Loading progress data...</p>
        </div>
      </div>
    );
  }

  if (!stats || !userProfile) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-dark-text mb-2">No Progress Data</h1>
          <p className="text-dark-text-secondary mb-4">Start learning to see your progress!</p>
          <button onClick={() => navigate('/today')} className="btn-primary">
            Go to Today
          </button>
        </div>
      </div>
    );
  }

  const quranProgress = (stats.totalAyahsLearned / 6236) * 100;
  const yearsToComplete = Math.ceil(stats.estimatedDaysToFinishQuran / 365);

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-dark-text mb-1">Progress & Insights</h1>
          <p className="text-dark-text-secondary">Track your memorization journey</p>
        </header>

        {/* Key Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-surface-hover rounded-xl p-5 border border-dark-border">
            <div className="text-sm text-dark-text-secondary mb-1">Total Āyāt</div>
            <div className="text-3xl font-bold text-accent mb-1">{stats.totalAyahsLearned}</div>
            <div className="text-xs text-dark-text-muted">of 6,236 in Quran</div>
          </div>
          
          <div className="bg-dark-surface-hover rounded-xl p-5 border border-dark-border">
            <div className="text-sm text-dark-text-secondary mb-1">Sessions</div>
            <div className="text-3xl font-bold text-accent mb-1">{stats.totalSessionsCompleted}</div>
            <div className="text-xs text-dark-text-muted">completed</div>
          </div>
          
          <div className="bg-dark-surface-hover rounded-xl p-5 border border-dark-border">
            <div className="text-sm text-dark-text-secondary mb-1">Avg Accuracy</div>
            <div className="text-3xl font-bold text-easy mb-1">{stats.averageAccuracy}%</div>
            <div className="text-xs text-dark-text-muted">across all sessions</div>
          </div>
          
          <div className="bg-dark-surface-hover rounded-xl p-5 border border-dark-border">
            <div className="text-sm text-dark-text-secondary mb-1">Your Pace</div>
            <div className="text-3xl font-bold text-accent mb-1">{stats.paceMinutesPerAyah}m</div>
            <div className="text-xs text-dark-text-muted">per new āyah</div>
          </div>
        </section>

        {/* Quran Progress */}
        <section className="bg-dark-surface-hover rounded-2xl p-6 border border-dark-border mb-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Quran Progress</h2>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dark-text-secondary">Overall Completion</span>
              <span className="text-sm font-medium text-dark-text">{quranProgress.toFixed(2)}%</span>
            </div>
            <div className="h-3 bg-dark-surface rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${quranProgress}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-dark-surface rounded-xl p-4">
              <div className="text-xs text-dark-text-secondary mb-1">Estimated Time to Complete</div>
              <div className="text-xl font-bold text-accent">
                {stats.estimatedDaysToFinishQuran < 365 
                  ? `${stats.estimatedDaysToFinishQuran} days` 
                  : `${yearsToComplete} ${yearsToComplete === 1 ? 'year' : 'years'}`}
              </div>
              <div className="text-xs text-dark-text-muted mt-1">
                Based on {dailyCommitment}min/day
              </div>
            </div>
            
            <div className="bg-dark-surface rounded-xl p-4">
              <div className="text-xs text-dark-text-secondary mb-1">Completed Surahs</div>
              <div className="text-xl font-bold text-easy">{stats.completedSurahs.length}</div>
              <div className="text-xs text-dark-text-muted mt-1">of 114 total</div>
            </div>
            
            <div className="bg-dark-surface rounded-xl p-4">
              <div className="text-xs text-dark-text-secondary mb-1">Āyāt Remaining</div>
              <div className="text-xl font-bold text-dark-text">{6236 - stats.totalAyahsLearned}</div>
              <div className="text-xs text-dark-text-muted mt-1">to memorize</div>
            </div>
          </div>
        </section>

        {/* Pace Insights */}
        <section className="bg-dark-surface-hover rounded-2xl p-6 border border-dark-border mb-6">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Pace Insights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-dark-text mb-3">Learning Pace</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-dark-surface rounded-lg">
                  <span className="text-sm text-dark-text-secondary">New Āyāt</span>
                  <span className="text-lg font-semibold text-accent">{stats.paceMinutesPerAyah} min</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-surface rounded-lg">
                  <span className="text-sm text-dark-text-secondary">Review Āyāt</span>
                  <span className="text-lg font-semibold text-easy">{stats.reviewMinutesPerAyah} min</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-dark-text mb-3">Performance Metrics</h3>
              <div className="space-y-3">
                <div className="p-3 bg-dark-surface rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-dark-text-secondary">Accuracy Trend</span>
                    <span className="text-lg font-semibold text-easy">{stats.averageAccuracy}%</span>
                  </div>
                  <div className="h-2 bg-dark-surface-hover rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-easy transition-all duration-500"
                      style={{ width: `${stats.averageAccuracy}%` }}
                    />
                  </div>
                </div>
                
                <div className="p-3 bg-dark-surface rounded-lg">
                  <div className="text-sm text-dark-text-secondary mb-1">Sessions Completed</div>
                  <div className="text-2xl font-bold text-dark-text">{stats.totalSessionsCompleted}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Surah Reviews */}
        {stats.upcomingReviews.length > 0 && (
          <section className="bg-dark-surface-hover rounded-2xl p-6 border border-dark-border mb-6">
            <h2 className="text-lg font-semibold text-dark-text mb-4">Upcoming Reviews (Next 7 Days)</h2>
            
            <div className="space-y-2">
              {stats.upcomingReviews.map((review) => (
                <div 
                  key={review.surahId} 
                  className="flex items-center justify-between p-4 bg-dark-surface rounded-xl hover:bg-dark-bg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-bold">{review.surahId}</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-dark-text">Surah {review.surahId}</div>
                      <div className="text-xs text-dark-text-muted">
                        {review.masteryLevel === 'mastered' && '🏆 Mastered'}
                        {review.masteryLevel === 'mature' && '⭐ Mature'}
                        {review.masteryLevel === 'young' && '🌱 Young'}
                        {review.masteryLevel === 'learning' && '📚 Learning'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-dark-text">
                      {new Date(review.nextReviewDue).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-dark-text-secondary">
                      {Math.ceil((new Date(review.nextReviewDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section className="bg-dark-surface-hover rounded-2xl p-6 border border-dark-border">
          <h2 className="text-lg font-semibold text-dark-text mb-4">AI Insights & Recommendations</h2>
          
          <div className="space-y-3">
            {stats.averageAccuracy < 70 && (
              <div className="p-4 bg-medium/10 border border-medium/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="text-sm font-medium text-medium mb-1">Focus on Accuracy</div>
                    <div className="text-xs text-dark-text-secondary">
                      Your average accuracy is {stats.averageAccuracy}%. Try slowing down and focusing on proper pronunciation to build a stronger foundation.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {stats.paceMinutesPerAyah > 5 && (
              <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="text-sm font-medium text-accent mb-1">Optimize Your Pace</div>
                    <div className="text-xs text-dark-text-secondary">
                      You're averaging {stats.paceMinutesPerAyah} minutes per āyah. Consider shorter, more frequent sessions to improve retention and speed.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {stats.upcomingReviews.length >= 5 && (
              <div className="p-4 bg-easy/10 border border-easy/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="text-sm font-medium text-easy mb-1">Schedule Consolidation</div>
                    <div className="text-xs text-dark-text-secondary">
                      You have {stats.upcomingReviews.length} surahs due for review soon. Consider scheduling a consolidation day to strengthen your retention.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {stats.averageAccuracy >= 90 && stats.paceMinutesPerAyah < 4 && (
              <div className="p-4 bg-easy/10 border border-easy/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <div className="text-sm font-medium text-easy mb-1">Excellent Progress!</div>
                    <div className="text-xs text-dark-text-secondary">
                      You're maintaining {stats.averageAccuracy}% accuracy at {stats.paceMinutesPerAyah} min/āyah. Keep up the great work!
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Progress;

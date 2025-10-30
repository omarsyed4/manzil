import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FirebaseService from '../lib/firebaseService';
import { initializeDatabase, resetUserData } from '../lib/databaseUtils';
import { seedFatiha } from '../lib/seedFatiha';
import { AuthService } from '../lib/authService';
import AuthScreen from '../components/auth/AuthScreen';
import OnboardingFlow from '../components/OnboardingFlow';
import { UserPlan, UserProgress, CurrentSession, UserProfile } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, getDocs, collection, query, orderBy, addDoc, updateDoc } from 'firebase/firestore';

/**
 * Manzil — MVP Today Dashboard
 * Goals:
 *  - Zero choices: single "Start" to run Autopilot (Due → Learn → Memorize window)
 *  - Two buckets only: Due Review & New Today (no separate Memorize pile)
 *  - Optional Consolidation banner when overdue is heavy
 *  - Clean ETA + tiny progress summary
 */

const Today: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [currentSurahName, setCurrentSurahName] = useState<string>('');
  const [isNewSession, setIsNewSession] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Initialize Firebase data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // Initialize authentication
        console.log('🔐 Initializing authentication...');
        const user = await AuthService.initializeAuth();
        
        if (user) {
          console.log('✅ User authenticated:', user.email);
          setIsAuthenticated(true);
          
          // Check if user has completed onboarding
          const hasCompletedOnboarding = await FirebaseService.hasCompletedOnboarding();
          
          if (!hasCompletedOnboarding) {
            console.log('🔄 User needs onboarding');
            setNeedsOnboarding(true);
            setIsInitialized(true);
          } else {
            console.log('✅ User has completed onboarding, loading current session...');

            // Load currentSession from user document (map field, not subcollection)
            const uid = auth.currentUser?.uid;
            if (uid) {
              const userDocRef = doc(db, 'users', uid);
              const userDocSnap = await getDoc(userDocRef);
              
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const session = userData.currentSession as CurrentSession;
                
                // Store user profile for pace metrics
                setUserProfile(userData as UserProfile);
                
                if (session) {
                  console.log('📖 Loaded currentSession from user document:', session);
                  setCurrentSession(session);
                  
                  // Get surah name
                  const surahRef = doc(db, 'surahs', String(session.surahId));
                  const surahSnap = await getDoc(surahRef);
                  if (surahSnap.exists()) {
                    const surahData = surahSnap.data();
                    setCurrentSurahName(surahData.nameEn || `Surah ${session.surahId}`);
                  } else {
                    setCurrentSurahName(`Surah ${session.surahId}`);
                  }
                  
                  // Determine if new session (not started yet)
                  setIsNewSession(session.status === 'not-started');
                } else {
                  console.error('❌ No currentSession found in user document');
                }
              } else {
                console.error('❌ User document does not exist');
              }
            }

            setIsInitialized(true);
          }
        } else {
          console.log('❌ User not authenticated');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error initializing data:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  // Calculate values from currentSession
  const reviewPile = currentSession?.reviewPile || [];
  const newPile = currentSession?.newPile || [];
  const dueCount = reviewPile.length;
  const newTodayCount = newPile.length;
  const totalAyahs = currentSession?.totalAyahs || 0;
  const totalWords = currentSession?.totalWords || 0;
  
  // Calculate review range
  const reviewAyahNumbers = reviewPile.map(a => a.ayahNumber);
  const lastSessionAyahs = reviewAyahNumbers.length > 0 ? 
    `${Math.min(...reviewAyahNumbers)}-${Math.max(...reviewAyahNumbers)}` : 
    'None';

  // Calculate learning range for today
  const learnAyahNumbers = newPile.map(a => a.ayahNumber);
  const learningAyahs = learnAyahNumbers.length > 0 ?
    `${Math.min(...learnAyahNumbers)}-${Math.max(...learnAyahNumbers)}` :
    'None';

  // Determine if today is consolidation day
  const isConsolidationDay = dueCount >= 20;

  // Get problem areas from session
  const problemAreas = (currentSession?.problemAreas || [])
    .slice(0, 3)
    .map(p => `Āyah ${p.ayahNumber}`);

  // INTELLIGENT ETA CALCULATION based on user's pace metrics
  // Uses personalized pace tracking instead of generic estimates
  const pacePerNewAyah = userProfile?.paceMinutesPerAyah || 3.5; // Default 3.5 min per new ayah
  const pacePerReviewAyah = userProfile?.reviewMinutesPerAyah || 1.5; // Default 1.5 min per review ayah
  
  const estimatedMinutes = Math.round(
    (dueCount * pacePerReviewAyah) + (newTodayCount * pacePerNewAyah)
  );
  
  console.log('⏱️ [ETA Calculation]', {
    reviewCount: dueCount,
    newCount: newTodayCount,
    pacePerReview: pacePerReviewAyah,
    pacePerNew: pacePerNewAyah,
    totalEstimate: estimatedMinutes,
    source: userProfile ? 'user-specific-pace' : 'default-pace'
  });

  const handleStart = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid || !currentSession) {
        console.error('Cannot start session: no user or session data');
        return;
      }
      
      console.log('🚀 Starting session...');
      
      // Update currentSession status to 'in-progress' and set startedAt
      const userDocRef = doc(db, 'users', uid);
      await updateDoc(userDocRef, {
        'currentSession.status': 'in-progress',
        'currentSession.startedAt': new Date(),
        updatedAt: Date.now()
      });
      
      console.log('✅ Session marked as in-progress');
      
      // Navigate to session page
      navigate('/session');
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };



// Handle successful authentication
  const handleAuthSuccess = async () => {
    console.log('🎉 Authentication successful, reloading data...');
    // Instead of window.location.reload(), re-run the initialization
    setIsLoading(true);
    setIsAuthenticated(false);
    
    // Re-initialize the data
    try {
      const user = await AuthService.initializeAuth();
      if (user) {
        setIsAuthenticated(true);
        // Re-run the full initialization logic here
        // (copy the logic from the useEffect)
      }
    } catch (error) {
      console.error('Error re-initializing after auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show auth screen if not authenticated
  if (!isAuthenticated && !isLoading) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Show onboarding if user needs it
  if (needsOnboarding && !isLoading) {
    return <OnboardingFlow />;
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-dark-text mb-2">Loading...</h1>
            <p className="text-dark-text-secondary">Initializing your memorization data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-dark-text flex items-center gap-2">Today {isNewSession && (
            <span className="text-[10px] uppercase bg-accent/20 text-accent px-2 py-0.5 rounded">New</span>
          )}</h1>
          <p className="text-dark-text-secondary">
            {currentSurahName || 'Loading...'}
          </p>
        </header>

               {/* Hero CTA */}
               <section className="mb-6">
                 <div className="w-full rounded-2xl bg-dark-surface-hover p-6">
                 <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-dark-text-secondary mb-1">Today's Session</div>
                      <div className="text-xl font-medium text-dark-text">
                        {isConsolidationDay ? 'Consolidation Day' : 
                         dueCount > 0 ? 'Review → Learn → Memorize' : 'Learn → Memorize'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-dark-text-secondary">ETA</div>
                      <div className="text-lg font-medium text-accent">~{estimatedMinutes}m</div>
                    </div>
                  </div>

                  {/* Session Details - Hide review if empty */}
                   <div className={`grid grid-cols-1 ${dueCount > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-4`}>
                     {dueCount > 0 && (
                       <div className="bg-dark-surface rounded-xl p-3">
                         <div className="text-xs text-dark-text-secondary mb-1">Review Range</div>
                         <div className="text-sm font-medium text-dark-text">Āyāt {lastSessionAyahs}</div>
                       </div>
                     )}
                     <div className="bg-dark-surface rounded-xl p-3">
                       <div className="text-xs text-dark-text-secondary mb-1">Learning Range</div>
                       <div className="text-sm font-medium text-dark-text">Āyāt {learningAyahs}</div>
                     </div>
                     <div className="bg-dark-surface rounded-xl p-3">
                       <div className="text-xs text-dark-text-secondary mb-1">Session Type</div>
                       <div className="text-sm font-medium text-dark-text">
                         {isConsolidationDay ? 'Consolidation' : 'Mixed'}
                       </div>
                     </div>
                   </div>

                  <div className="flex items-center justify-between">
                    <div className="text-dark-text-secondary text-sm">
                      {currentSurahName} {dueCount > 0 && `• Review ${dueCount}`} • Learn {newTodayCount}
                    </div>
                    <button
                      onClick={handleStart}
                      className="px-4 py-2 rounded-lg bg-accent text-white hover:opacity-90 focus:outline-none"
                    >
                      Start Session
                    </button>
                  </div>

                   {/* Problem Areas */}
                   {problemAreas.length > 0 && (
                     <div className="mb-4">
                       <div className="text-xs text-dark-text-secondary mb-2">Priority Problem Areas</div>
                       <div className="flex flex-wrap gap-2">
                         {problemAreas.map((area, index) => (
                           <span 
                             key={index}
                             className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/30"
                           >
                             {area}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                 </div>
               </section>

        {/* Buckets - Hide review bucket if empty */}
        <section className={`grid grid-cols-1 ${dueCount > 0 ? 'md:grid-cols-2' : 'md:grid-cols-1 max-w-md mx-auto'} gap-4 mb-6`}>
          {/* Due Review - Only show if there are reviews */}
          {dueCount > 0 && (
            <div className="rounded-2xl p-6 bg-dark-surface-hover hover:bg-dark-surface focus:outline-none">
              <div className="text-sm text-dark-text-secondary mb-1">Due Review</div>
              <div className="flex items-end gap-3">
                <div className="text-4xl font-bold text-accent">{dueCount}</div>
                <div className="text-dark-text-secondary">items</div>
              </div>
              <div className="text-sm text-dark-text-secondary mt-2">Weak-first ordering • micro-drills</div>
            </div>
          )}

          {/* New Today (Learn + Memorize window) */}
          <div className="rounded-2xl p-6 bg-dark-surface-hover hover:bg-dark-surface focus:outline-none">
            <div className="text-sm text-dark-text-secondary mb-1">New Today</div>
            <div className="flex items-end gap-3">
              <div className="text-4xl font-bold text-accent">{newTodayCount}</div>
              <div className="text-dark-text-secondary">āyāt</div>
            </div>
            <div className="text-sm text-dark-text-secondary mt-2">Lead-in • shadow • mute • active recall</div>
          </div>
        </section>

        {/* Consolidation banner (conditional) */}
        {isConsolidationDay && (
          <section className="mb-6">
            <div className="rounded-xl border border-accent/40 bg-transparent p-4">
              <div className="text-dark-text">
                Today is a consolidation day. Focus on strengthening weak areas before learning new āyāt.
              </div>
            </div>
          </section>
        )}

        {/* Session Summary (compact KPI triplet) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-dark-surface-hover rounded-xl">
            <div className="text-2xl font-bold text-accent mb-1">{dueCount + newTodayCount}</div>
            <div className="text-sm text-dark-text-secondary">Total Items Today</div>
          </div>
          <div className="text-center p-4 bg-dark-surface-hover rounded-xl">
            <div className="text-2xl font-bold text-accent mb-1">~{estimatedMinutes}m</div>
            <div className="text-sm text-dark-text-secondary">Estimated Time</div>
          </div>
          <div className="text-center p-4 bg-dark-surface-hover rounded-xl">
            <div className="text-2xl font-bold text-accent mb-1">{currentSurahName}</div>
            <div className="text-sm text-dark-text-secondary">Current Surah</div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Today;

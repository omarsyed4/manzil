import React, { useState, useEffect } from 'react';
import { UserProfile, Ayah, TextToken, Surah, CurrentSession, AyahToLearn, LearnedAyah } from '../../types';
import FirebaseService from '../../lib/firebaseService';
import { TextTokenizer } from '../../lib/textTokenizer';
import LearnAyahView from '../../components/learn/LearnAyahView';
import LearnIntroFlow from '../../components/shared/LearnIntroFlow';
import { getAyahWords } from '../../lib/mushafService';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { PaceTracker } from '../../lib/paceTracker';
import { SurahSRS } from '../../lib/surahSRS';

interface LearnSessionProps {
  session: any; // TODO: Update to use new UserSession type
  onComplete: () => void;
}

const LearnSession: React.FC<LearnSessionProps> = ({ session, onComplete }) => {
  const [currentAyah, setCurrentAyah] = useState<Ayah | null>(null);
  const [ayahsToLearn, setAyahsToLearn] = useState<Ayah[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [textTokens, setTextTokens] = useState<TextToken[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [showLearnView, setShowLearnView] = useState(false);

  const loadLearningAyahs = async () => {
    try {
      console.log('🔄 [LearnSession] Starting data loading...');
      setIsLoading(true);
      const userId = FirebaseService.getCurrentUserId();
      console.log('🔄 [LearnSession] User ID:', userId);
      
      // Get user document with currentSession
      const userDocRef = await FirebaseService.getUserProfile();
      if (!userDocRef) {
        console.error('❌ [LearnSession] User profile not found');
        setIsLoading(false);
        return;
      }
      console.log('✅ [LearnSession] User profile loaded:', !!userDocRef);
      setUserProfile(userDocRef);
      
      // Get currentSession from user document  
      const userDocSnap = await getDoc(doc(db, 'users', userId));
      const currentSession = userDocSnap.data()?.currentSession as CurrentSession;
      
      if (!currentSession) {
        console.error('❌ [LearnSession] No current session found in user document');
        setIsLoading(false);
        return;
      }
      
      console.log('📖 [LearnSession] Loaded current session:', currentSession);
      
      // Build ayahs list from newPile (for now, ignoring reviewPile for simplicity)
      const ayahsToFetch = currentSession.newPile;
      console.log('🔄 [LearnSession] Ayahs to fetch:', ayahsToFetch);
      const ayahsData: Ayah[] = [];
      
      for (const ayahRef of ayahsToFetch) {
        // Fetch ayah document
        const ayahDoc = await FirebaseService.getAyah(ayahRef.surahId, ayahRef.ayahNumber);
        
        if (ayahDoc) {
          // If textUthmani is missing, fetch from words subcollection
          if (!ayahDoc.textUthmani) {
            const textFromWords = await getAyahWords(ayahRef.surahId, ayahRef.ayahNumber);
            ayahDoc.textUthmani = textFromWords || '';
          }
          
          ayahsData.push(ayahDoc);
          console.log(`✅ [LearnSession] Loaded ayah ${ayahRef.surahId}:${ayahRef.ayahNumber}`);
        } else {
          console.warn(`❌ [LearnSession] Ayah not found: ${ayahRef.surahId}:${ayahRef.ayahNumber}`);
        }
      }
      
      if (ayahsData.length === 0) {
        console.error('❌ [LearnSession] No ayah data could be loaded');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ [LearnSession] Loaded ayahs data:', ayahsData.length, 'ayahs');
      setAyahsToLearn(ayahsData);
      setCurrentAyah(ayahsData[0]);
      
      // Tokenize the first ayah
      if (ayahsData[0] && userDocRef) {
        console.log('🔄 [LearnSession] Tokenizing first ayah...');
        const tokens = TextTokenizer.tokenizeAyah(
          ayahsData[0].textTransliterated || '',
          userDocRef.baselineMsPerWord
        );
        console.log('✅ [LearnSession] Text tokens created:', tokens.length, 'tokens');
        setTextTokens(tokens);
      }
      
      console.log('✅ [LearnSession] Data loading complete');
      setIsLoading(false);
    } catch (error) {
      console.error('❌ [LearnSession] Error loading learning ayahs:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 [LearnSession] Component mounted, starting data load...');
    loadLearningAyahs();
  }, []);

  const nextAyah = () => {
    if (currentIndex < ayahsToLearn.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentAyah(ayahsToLearn[nextIndex]);
      
      // Tokenize the new ayah
      if (ayahsToLearn[nextIndex] && userProfile) {
        const tokens = TextTokenizer.tokenizeAyah(ayahsToLearn[nextIndex].textTransliterated || '', userProfile.baselineMsPerWord);
        setTextTokens(tokens);
      }
    } else {
      onComplete();
    }
  };

  const handleAyahMastered = async (attempts: any[]) => {
    console.log('Ayah mastered:', attempts);
    
    // Check if this is the last ayah
    const isLastAyah = currentIndex >= ayahsToLearn.length - 1;
    
    if (isLastAyah) {
      // Session complete - calculate and update pace metrics
      console.log('✅ [LearnSession] All ayahs completed, calculating pace metrics...');
      
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          console.error('❌ No user ID found');
          return;
        }
        
        // Get current session with start time
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const currentSession = userDocSnap.data().currentSession as CurrentSession;
          
          if (currentSession && currentSession.startedAt) {
            const startTime = currentSession.startedAt instanceof Date 
              ? currentSession.startedAt 
              : new Date(currentSession.startedAt);
            
            // Complete session and update pace metrics
            await PaceTracker.completeSession(userId, currentSession, startTime);
            
            // Check if user completed entire surah
            const surahId = currentSession.surahId;
            const completedAyahCount = currentSession.learnedToday?.length || 0;
            
            // Get total ayah count for this surah
            const surahRef = doc(db, 'surahs', String(surahId));
            const surahSnap = await getDoc(surahRef);
            
            if (surahSnap.exists()) {
              const surahData = surahSnap.data();
              const totalAyahsInSurah = surahData.ayahCount;
              
              // Check if surah is complete
              const userTotalAyahsLearned = (userProfile?.totalAyahsLearned || 0) + completedAyahCount;
              
              // Simple check: if we've learned all ayahs of this surah
              // (In production, you'd track this more precisely)
              if (completedAyahCount >= totalAyahsInSurah) {
                console.log('🎉 [LearnSession] Surah completed! Initializing SRS tracking...');
                await SurahSRS.initializeSurahReview(userId, surahId);
              }
            }
            
            // Update session status to complete
            await updateDoc(userDocRef, {
              'currentSession.status': 'all-complete',
              'currentSession.completedAt': new Date(),
              updatedAt: Date.now()
            });
            
            console.log('✅ [LearnSession] Session completed with pace metrics updated');
          }
        }
      } catch (error) {
        console.error('❌ [LearnSession] Error updating pace metrics:', error);
      }
    }
    
    // Move to next ayah or complete session
    nextAyah();
  };

  const handleNeedsExtraPractice = async (attempts: any[]) => {
    console.log('Ayah needs extra practice:', attempts);
    // For MVP, we'll still move to next ayah but mark it for review
    nextAyah();
  };

  const startLearning = () => {
    setShowIntro(false);
    setShowLearnView(true);
  };

  const skipIntro = () => {
    console.log('🔄 [LearnSession] Skip intro clicked');
    console.log('🔄 [LearnSession] Current state before skip:', {
      showIntro,
      showLearnView,
      currentAyah: !!currentAyah,
      userProfile: !!userProfile,
      textTokensLength: textTokens.length,
      isLoading
    });
    setShowIntro(false);
    setShowLearnView(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-text-secondary">Preparing learning session...</p>
        </div>
      </div>
    );
  }

  // Show intro flow first
  if (showIntro) {
    console.log('🔄 [LearnSession] Rendering intro flow');
    return <LearnIntroFlow onStart={startLearning} onSkip={skipIntro} />;
  }

  // Show LearnAyahView if learning is active
  console.log('🔄 [LearnSession] Checking learn view conditions:', {
    showLearnView,
    currentAyah: !!currentAyah,
    userProfile: !!userProfile,
    textTokensLength: textTokens.length,
    allConditionsMet: showLearnView && currentAyah && userProfile && textTokens.length > 0
  });

  if (showLearnView && currentAyah && userProfile && textTokens.length > 0) {
    console.log('🔄 [LearnSession] Rendering LearnAyahView');
    return (
      <LearnAyahView
        surah={currentAyah.surahId}
        ayah={currentAyah.ayah}
        ayahText={currentAyah.textUthmani || ''}
        textTokens={textTokens}
        baselineMsPerWord={userProfile.baselineMsPerWord}
        hesitationThresholdMs={userProfile.hesitationThresholdMs}
        currentAyahIndex={currentIndex}
        totalAyahs={ayahsToLearn.length}
        onAyahMastered={handleAyahMastered}
        onNeedsExtraPractice={handleNeedsExtraPractice}
      />
    );
  }

  console.log('🔄 [LearnSession] Returning fallback UI - no conditions met');
  
  // Fallback UI to show what's missing
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-accent text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold text-dark-text mb-4">Loading Learning Session</h2>
        <div className="space-y-2 text-sm text-dark-text-secondary">
          <div>Show Learn View: {showLearnView ? '✅' : '❌'}</div>
          <div>Current Ayah: {currentAyah ? '✅' : '❌'}</div>
          <div>User Profile: {userProfile ? '✅' : '❌'}</div>
          <div>Text Tokens: {textTokens.length > 0 ? `✅ (${textTokens.length})` : '❌'}</div>
          <div>Is Loading: {isLoading ? '✅' : '❌'}</div>
        </div>
        <div className="mt-6">
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary px-6 py-2"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};

export default LearnSession;
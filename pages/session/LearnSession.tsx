import React, { useState, useEffect } from 'react';
import { UserProfile, Ayah, TextToken, Surah, CurrentSession, AyahToLearn, LearnedAyah } from '../../types';
import FirebaseService from '../../lib/firebaseService';
import { TextTokenizer } from '../../lib/textTokenizer';
import LearnAyahView from '../../components/LearnAyahView';
import LearnIntroFlow from '../../components/LearnIntroFlow';
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
      setIsLoading(true);
      const userId = FirebaseService.getCurrentUserId();
      
      // Get user document with currentSession
      const userDocRef = await FirebaseService.getUserProfile();
      if (!userDocRef) {
        console.error('User profile not found');
        setIsLoading(false);
        return;
      }
      setUserProfile(userDocRef);
      
      // Get currentSession from user document  
      const userDocSnap = await getDoc(doc(db, 'users', userId));
      const currentSession = userDocSnap.data()?.currentSession as CurrentSession;
      
      if (!currentSession) {
        console.error('No current session found in user document');
        setIsLoading(false);
        return;
      }
      
      console.log('📖 Loaded current session:', currentSession);
      
      // Build ayahs list from newPile (for now, ignoring reviewPile for simplicity)
      const ayahsToFetch = currentSession.newPile;
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
        } else {
          console.warn(`Ayah not found: ${ayahRef.surahId}:${ayahRef.ayahNumber}`);
        }
      }
      
      if (ayahsData.length === 0) {
        console.error('No ayah data could be loaded');
        setIsLoading(false);
        return;
      }
      
      setAyahsToLearn(ayahsData);
      setCurrentAyah(ayahsData[0]);
      
      // Tokenize the first ayah
      if (ayahsData[0] && userDocRef) {
        const tokens = TextTokenizer.tokenizeAyah(
          ayahsData[0].textTransliterated || '',
          userDocRef.baselineMsPerWord
        );
        setTextTokens(tokens);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading learning ayahs:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
    return <LearnIntroFlow onStart={startLearning} onSkip={skipIntro} />;
  }

  // Show LearnAyahView if learning is active
  if (showLearnView && currentAyah && userProfile && textTokens.length > 0) {
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

  return null;
};

export default LearnSession;
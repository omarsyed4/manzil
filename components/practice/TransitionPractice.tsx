import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LearnedAyah } from '../types';
import { 
  createSpeechRecognition,
  calculateTextSimilarity,
  calculateWordAccuracy,
  generateHyperSpecificFeedback,
  getQualityFromSimilarity,
  isSpeechRecognitionSupported
} from '../lib/speechRecognitionService';
import { getAudioUrl } from '../lib/recitationService';
import { getAyahWords } from '../lib/mushafService';

interface TransitionPracticeProps {
  ayahs: LearnedAyah[];
  onComplete: () => void;
}

interface TransitionPair {
  fromAyah: LearnedAyah;
  toAyah: LearnedAyah;
  fromEnding: string; // Last 3-4 words of fromAyah
  toBeginning: string; // First 3-4 words of toAyah
  completed: boolean;
  perfectAttempts: number;
}

const TransitionPractice: React.FC<TransitionPracticeProps> = ({
  ayahs,
  onComplete
}) => {
  const [transitionPairs, setTransitionPairs] = useState<TransitionPair[]>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isReciting, setIsReciting] = useState(false);
  const [isWaitingForSpace, setIsWaitingForSpace] = useState(true);
  const [feedback, setFeedback] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [detailedFeedback, setDetailedFeedback] = useState<{
    feedback: string;
    mistakes: string[];
    wordAccuracy: number;
  } | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize transition pairs when component mounts
  useEffect(() => {
    if (ayahs.length < 2) {
      console.log('⚠️ [TransitionPractice] Not enough ayahs for transitions');
      onComplete();
      return;
    }

    const initializePairs = async () => {
      const pairs: TransitionPair[] = [];
      
      for (let i = 0; i < ayahs.length - 1; i++) {
        const fromAyah = ayahs[i];
        const toAyah = ayahs[i + 1];
        
        // Fetch ayah text from mushafService (words subcollection)
        const fromFullText = await getAyahWords(fromAyah.surahId, fromAyah.ayahNumber);
        const toFullText = await getAyahWords(toAyah.surahId, toAyah.ayahNumber);
        
        console.log('📖 [TransitionPractice] Fetched ayah text', {
          fromAyah: { surahId: fromAyah.surahId, ayahNumber: fromAyah.ayahNumber, hasText: !!fromFullText },
          toAyah: { surahId: toAyah.surahId, ayahNumber: toAyah.ayahNumber, hasText: !!toFullText }
        });
        
        if (!fromFullText || !toFullText) {
          console.error('❌ [TransitionPractice] Failed to fetch ayah text', { fromAyah, toAyah });
          continue;
        }
        
        // Extract last 3 words from previous ayah and first 3 words from next ayah
        const fromWords = fromFullText.split(' ').filter(w => w.trim());
        const toWords = toFullText.split(' ').filter(w => w.trim());
        
        const fromEnding = fromWords.slice(-3).join(' '); // Last 3 words
        const toBeginning = toWords.slice(0, 3).join(' '); // First 3 words
        
        pairs.push({
          fromAyah,
          toAyah,
          fromEnding,
          toBeginning,
          completed: false,
          perfectAttempts: 0
        });
      }
      
      setTransitionPairs(pairs);
      console.log('🔄 [TransitionPractice] Initialized with real ayah data', { pairsCount: pairs.length });
    };
    
    initializePairs();
  }, [ayahs, onComplete]);

  const playTransitionAudio = useCallback(async () => {
    if (currentPairIndex >= transitionPairs.length) return;
    
    const currentPair = transitionPairs[currentPairIndex];
    console.log('🔊 [TransitionPractice] Playing transition audio', {
      fromAyah: `${currentPair.fromAyah.surahId}:${currentPair.fromAyah.ayahNumber}`,
      toAyah: `${currentPair.toAyah.surahId}:${currentPair.toAyah.ayahNumber}`
    });

    try {
      // For now, we'll use a placeholder audio URL
      // In a real implementation, this would be the actual audio for the ayah ending
      const audioUrl = await getAudioUrl(currentPair.fromAyah.surahId, currentPair.fromAyah.ayahNumber);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.addEventListener('loadstart', () => setIsPlayingAudio(true));
      audio.addEventListener('canplay', () => {
        setIsPlayingAudio(true);
        audio.play();
      });
      audio.addEventListener('ended', () => {
        setIsPlayingAudio(false);
        console.log('🎵 [TransitionPractice] Audio finished, starting recognition...');
        // Automatically start recognition after audio ends
        setTimeout(() => {
          startTransitionRecognition();
        }, 500);
      });
      audio.addEventListener('error', (e) => {
        console.error('❌ [TransitionPractice] Audio error:', e);
        setIsPlayingAudio(false);
        setIsWaitingForSpace(true);
      });
      
    } catch (error) {
      console.error('❌ [TransitionPractice] Failed to load audio:', error);
      setIsPlayingAudio(false);
      setIsWaitingForSpace(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPairIndex, transitionPairs]);

  const startTransitionRecognition = useCallback(() => {
    if (currentPairIndex >= transitionPairs.length) return;
    
    const currentPair = transitionPairs[currentPairIndex];
    const expectedText = currentPair.toBeginning;
    
    console.log('🎤 [TransitionPractice] Starting recognition for transition', {
      expectedText,
      pairIndex: currentPairIndex
    });

    if (!isSpeechRecognitionSupported()) {
      console.error('❌ [TransitionPractice] Speech recognition not supported');
      return;
    }

    recognitionRef.current = createSpeechRecognition(
      expectedText,
      (transcript, similarity, qualityData) => {
        console.log('✅ [TransitionPractice] Recognition complete', {
          transcript,
          similarity: (similarity * 100).toFixed(1) + '%',
          quality: qualityData.quality
        });

        // Calculate word accuracy
        const expectedWords = expectedText.split(' ').filter(word => word.trim().length > 0);
        const wordAccuracy = calculateWordAccuracy(transcript, expectedWords);
        
        // Generate detailed feedback
        const detailed = generateHyperSpecificFeedback(transcript, expectedText, expectedWords);
        setDetailedFeedback(detailed);
        
        // Show feedback
        setFeedback(detailed.feedback);
        setShowFeedback(true);
        
        // Auto-hide feedback after 3 seconds
        setTimeout(() => {
          setShowFeedback(false);
          setDetailedFeedback(null);
        }, 3000);

        // Check if this is a perfect attempt (90%+ similarity and word accuracy)
        const isPerfect = similarity >= 0.90 && wordAccuracy >= 0.90;
        
        if (isPerfect) {
          console.log('🎯 [TransitionPractice] Perfect transition attempt!');
          
          // Update the current pair
          setTransitionPairs(prev => {
            const updated = [...prev];
            updated[currentPairIndex] = {
              ...updated[currentPairIndex],
              perfectAttempts: updated[currentPairIndex].perfectAttempts + 1
            };
            return updated;
          });
          
          // Check if this pair is complete (2 perfect attempts)
          const newPerfectAttempts = transitionPairs[currentPairIndex].perfectAttempts + 1;
          if (newPerfectAttempts >= 2) {
            console.log('✅ [TransitionPractice] Transition pair completed!');
            
            // Mark pair as completed
            setTransitionPairs(prev => {
              const updated = [...prev];
              updated[currentPairIndex] = {
                ...updated[currentPairIndex],
                completed: true
              };
              return updated;
            });
            
            // Move to next pair or complete
            setTimeout(() => {
              if (currentPairIndex + 1 < transitionPairs.length) {
                setCurrentPairIndex(prev => prev + 1);
                setIsWaitingForSpace(true);
                setFeedback('');
                setShowFeedback(false);
                setDetailedFeedback(null);
              } else {
                console.log('🎉 [TransitionPractice] All transitions completed!');
                onComplete();
              }
            }, 2000);
          } else {
            // Continue with same pair
            setTimeout(() => {
              setIsWaitingForSpace(true);
              setFeedback('');
              setShowFeedback(false);
              setDetailedFeedback(null);
            }, 2000);
          }
        } else {
          // Not perfect, continue with same pair
          setTimeout(() => {
            setIsWaitingForSpace(true);
            setFeedback('');
            setShowFeedback(false);
            setDetailedFeedback(null);
          }, 2000);
        }
        
        setIsReciting(false);
      },
      (error) => {
        console.error('❌ [TransitionPractice] Recognition error:', error);
        setIsReciting(false);
        setIsWaitingForSpace(true);
      }
    );

    recognitionRef.current.start();
    setIsReciting(true);
    setIsWaitingForSpace(false);
  }, [currentPairIndex, transitionPairs, onComplete]);

  const handleSpacebarPress = useCallback(() => {
    console.log('⌨️ [TransitionPractice] Spacebar pressed', {
      isPlayingAudio,
      isReciting,
      isWaitingForSpace,
      currentPairIndex
    });

    if (isPlayingAudio) {
      // Restart audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      playTransitionAudio();
    } else if (isReciting) {
      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsReciting(false);
      setIsWaitingForSpace(true);
    } else if (isWaitingForSpace && !isReciting) {
      // Play audio first, then recognition will start after audio ends
      playTransitionAudio();
    }
  }, [isPlayingAudio, isReciting, isWaitingForSpace, playTransitionAudio]);

  // Keyboard event listener
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        handleSpacebarPress();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleSpacebarPress]);

  // Calculate overall progress
  useEffect(() => {
    if (transitionPairs.length === 0) return;
    
    const completedPairs = transitionPairs.filter(pair => pair.completed).length;
    const progress = (completedPairs / transitionPairs.length) * 100;
    setOverallProgress(progress);
  }, [transitionPairs]);

  if (transitionPairs.length === 0) {
    return (
      <div className="text-center">
        <p className="text-dark-text-secondary">Loading transition pairs...</p>
      </div>
    );
  }

  const currentPair = transitionPairs[currentPairIndex];
  const completedPairs = transitionPairs.filter(pair => pair.completed).length;

  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-dark-text mb-2">
          Practice Transitions
        </h2>
        <p className="text-dark-text-secondary">
          Transition {currentPairIndex + 1} of {transitionPairs.length}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-dark-border rounded-full h-2 mb-4">
        <div 
          className="bg-accent h-2 rounded-full transition-all duration-300"
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      
      <div className="flex justify-between items-center mt-2 mb-6">
        <p className="text-xs text-dark-text-muted">
          Overall Progress
        </p>
        <p className="text-xs text-dark-text-secondary font-medium">
          {Math.round(overallProgress)}%
        </p>
      </div>

      {/* Current transition info */}
      <div className="bg-dark-surface-hover border border-dark-border rounded-xl p-6 mb-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-dark-text mb-4">
            From Ayah {currentPair.fromAyah.surahId}:{currentPair.fromAyah.ayahNumber} → To Ayah {currentPair.toAyah.surahId}:{currentPair.toAyah.ayahNumber}
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-dark-text-muted mb-2">You'll hear:</p>
            <p className="text-lg font-arabic text-dark-text" dir="rtl">
              {currentPair.fromEnding}
            </p>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-dark-text-muted mb-2">Then recite:</p>
            <p className="text-lg font-arabic text-dark-text" dir="rtl">
              {currentPair.toBeginning}
            </p>
          </div>
          
          <div className="text-sm text-dark-text-secondary">
            Perfect attempts: {currentPair.perfectAttempts}/2
          </div>
        </div>
      </div>

      {/* Feedback */}
      {showFeedback && detailedFeedback && (
        <div className="bg-dark-surface-hover border border-dark-border rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-dark-text">Feedback:</h4>
            <div className="text-xs text-dark-text-secondary">
              Word Accuracy: {(detailedFeedback.wordAccuracy * 100).toFixed(0)}%
            </div>
          </div>
          
          <p className="text-sm text-dark-text-secondary mb-3">
            {detailedFeedback.feedback}
          </p>
          
          {detailedFeedback.mistakes.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-medium mb-1">Review these:</h5>
              <div className="space-y-1">
                {detailedFeedback.mistakes.map((mistake, index) => (
                  <div key={index} className="text-xs text-medium">
                    • {mistake}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status indicators */}
      <div className="mt-8">
        <div className="h-10 flex items-center justify-center">
          {isPlayingAudio && (
            <div className="inline-flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm text-blue-500 font-medium">
                Playing ayah ending...
              </span>
            </div>
          )}
          
          {isWaitingForSpace && !isPlayingAudio && (
            <div className="inline-flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm text-accent font-medium">
                Press SPACE to {currentPair.perfectAttempts === 0 ? 'start' : 'try again'}
              </span>
            </div>
          )}
          
          {isReciting && (
            <div className="inline-flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-red-500 font-medium">
                Recording... Press SPACE to stop
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center">
        <p className="text-xs text-dark-text-muted">
          Press SPACE to play the ayah ending, then recite the beginning of the next ayah
        </p>
      </div>
    </div>
  );
};

export default TransitionPractice;

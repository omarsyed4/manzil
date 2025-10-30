import { useState, useEffect, useRef, useCallback } from 'react';
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

interface TransitionPair {
  fromAyah: LearnedAyah;
  toAyah: LearnedAyah;
  fromEnding: string;
  toBeginning: string;
  completed: boolean;
  perfectAttempts: number;
}

export const useTransitionPractice = (ayahs: LearnedAyah[], onComplete: () => void) => {
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

  // Initialize transition pairs
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
        
        try {
          const fromFullText = await getAyahWords(fromAyah.surahId, fromAyah.ayahNumber);
          const toFullText = await getAyahWords(toAyah.surahId, toAyah.ayahNumber);
          
          if (!fromFullText || !toFullText) {
            console.error('❌ [TransitionPractice] Failed to fetch ayah text', { fromAyah, toAyah });
            continue;
          }
          
          const fromWords = fromFullText.split(' ').filter(w => w.trim());
          const toWords = toFullText.split(' ').filter(w => w.trim());
          
          const fromEnding = fromWords.slice(-3).join(' ');
          const toBeginning = toWords.slice(0, 3).join(' ');
          
          pairs.push({
            fromAyah,
            toAyah,
            fromEnding,
            toBeginning,
            completed: false,
            perfectAttempts: 0
          });
        } catch (error) {
          console.error('❌ [TransitionPractice] Error fetching ayah text:', error);
        }
      }
      
      setTransitionPairs(pairs);
      console.log('🔄 [TransitionPractice] Initialized with real ayah data', { pairsCount: pairs.length });
    };
    
    initializePairs();
  }, [ayahs, onComplete]);

  // Update overall progress
  useEffect(() => {
    if (transitionPairs.length === 0) return;
    
    const completedPairs = transitionPairs.filter(pair => pair.completed).length;
    const progress = (completedPairs / transitionPairs.length) * 100;
    setOverallProgress(progress);
    
    if (completedPairs === transitionPairs.length) {
      onComplete();
    }
  }, [transitionPairs, onComplete]);

  // Play audio of previous ayah ending
  const playTransitionAudio = useCallback(async () => {
    if (currentPairIndex >= transitionPairs.length) return;
    
    const currentPair = transitionPairs[currentPairIndex];
    if (!currentPair) return;

    try {
      setIsPlayingAudio(true);
      const audioUrl = await getAudioUrl(currentPair.fromAyah.surahId, currentPair.fromAyah.ayahNumber);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.addEventListener('ended', () => {
        setIsPlayingAudio(false);
        setIsWaitingForSpace(true);
      });
      
      await audio.play();
    } catch (error) {
      console.error('❌ [TransitionPractice] Error playing audio:', error);
      setIsPlayingAudio(false);
    }
  }, [currentPairIndex, transitionPairs]);

  // Start speech recognition
  const startRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setFeedback('Speech recognition not supported');
      setShowFeedback(true);
      return;
    }

    const recognition = createSpeechRecognition();
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      handleRecognitionResult(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setFeedback('Recognition error. Please try again.');
      setShowFeedback(true);
    };

    recognition.start();
    setIsReciting(true);
    setIsWaitingForSpace(false);
  }, []);

  // Handle recognition result
  const handleRecognitionResult = useCallback((transcript: string) => {
    if (currentPairIndex >= transitionPairs.length) return;
    
    const currentPair = transitionPairs[currentPairIndex];
    if (!currentPair) return;

    const targetText = currentPair.toBeginning;
    const similarity = calculateTextSimilarity(transcript, targetText);
    const wordAccuracy = calculateWordAccuracy(transcript, targetText);
    const quality = getQualityFromSimilarity(similarity);
    
    const feedback = generateHyperSpecificFeedback(transcript, targetText, quality);
    
    setDetailedFeedback({
      feedback: feedback.feedback,
      mistakes: feedback.mistakes,
      wordAccuracy
    });
    
    setFeedback(feedback.feedback);
    setShowFeedback(true);
    
    // Check if attempt was perfect (90%+ accuracy)
    const isPerfect = wordAccuracy >= 0.9;
    
    if (isPerfect) {
      const newPairs = [...transitionPairs];
      newPairs[currentPairIndex].perfectAttempts += 1;
      
      if (newPairs[currentPairIndex].perfectAttempts >= 2) {
        newPairs[currentPairIndex].completed = true;
        setTransitionPairs(newPairs);
        
        // Move to next pair
        if (currentPairIndex + 1 < transitionPairs.length) {
          setCurrentPairIndex(prev => prev + 1);
        }
      } else {
        setTransitionPairs(newPairs);
      }
    }
    
    setIsReciting(false);
  }, [currentPairIndex, transitionPairs]);

  // Handle spacebar
  const handleSpacebar = useCallback(() => {
    if (isPlayingAudio) return;
    
    if (isWaitingForSpace) {
      startRecognition();
    } else if (isReciting) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsReciting(false);
    }
  }, [isPlayingAudio, isWaitingForSpace, isReciting, startRecognition]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const currentPair = transitionPairs[currentPairIndex] || null;
  const isComplete = overallProgress >= 100;

  return {
    // State
    transitionPairs,
    currentPair,
    currentPairIndex,
    isPlayingAudio,
    isReciting,
    isWaitingForSpace,
    feedback,
    showFeedback,
    detailedFeedback,
    overallProgress,
    isComplete,
    
    // Actions
    playTransitionAudio,
    handleSpacebar,
    setShowFeedback
  };
};

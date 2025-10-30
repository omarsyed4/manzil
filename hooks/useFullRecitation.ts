import { useState, useEffect, useRef, useCallback } from 'react';
import { LearnedAyah } from '../types';
import { 
  createContinuousSpeechRecognition,
  calculateTextSimilarity,
  calculateWordAccuracy,
  generateHyperSpecificFeedback,
  getQualityFromSimilarity,
  isSpeechRecognitionSupported
} from '../lib/speechRecognitionService';
import { getAyahWords } from '../lib/mushafService';

interface AyahProgress {
  ayah: LearnedAyah;
  text: string;
  completed: boolean;
  perfectAttempts: number;
  currentAccuracy: number;
}

export const useFullRecitation = (ayahs: LearnedAyah[], onComplete: () => void) => {
  const [ayahProgress, setAyahProgress] = useState<AyahProgress[]>([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
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
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);

  // Initialize ayah progress
  useEffect(() => {
    if (ayahs.length === 0) {
      onComplete();
      return;
    }

    const initializeProgress = async () => {
      const progress: AyahProgress[] = [];
      
      for (const ayah of ayahs) {
        try {
          const text = await getAyahWords(ayah.surahId, ayah.ayahNumber);
          if (text) {
            progress.push({
              ayah,
              text,
              completed: false,
              perfectAttempts: 0,
              currentAccuracy: 0
            });
          }
        } catch (error) {
          console.error('❌ [FullRecitation] Error fetching ayah text:', error);
        }
      }
      
      setAyahProgress(progress);
      console.log('🔄 [FullRecitation] Initialized with real ayah data', { ayahsCount: progress.length });
    };
    
    initializeProgress();
  }, [ayahs, onComplete]);

  // Update overall progress
  useEffect(() => {
    if (ayahProgress.length === 0) return;
    
    const completedAyahs = ayahProgress.filter(progress => progress.completed).length;
    const progress = (completedAyahs / ayahProgress.length) * 100;
    setOverallProgress(progress);
    
    if (completedAyahs === ayahProgress.length) {
      onComplete();
    }
  }, [ayahProgress, onComplete]);

  // Start speech recognition
  const startRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setFeedback('Speech recognition not supported');
      setShowFeedback(true);
      return;
    }

    const recognition = createContinuousSpeechRecognition();
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setCurrentTranscript(transcript);
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
    if (currentAyahIndex >= ayahProgress.length) return;
    
    const currentAyah = ayahProgress[currentAyahIndex];
    if (!currentAyah) return;

    const targetText = currentAyah.text;
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
    
    // Update ayah progress
    const newProgress = [...ayahProgress];
    newProgress[currentAyahIndex].currentAccuracy = wordAccuracy;
    
    // Check if attempt was perfect (90%+ accuracy)
    const isPerfect = wordAccuracy >= 0.9;
    
    if (isPerfect) {
      newProgress[currentAyahIndex].perfectAttempts += 1;
      
      if (newProgress[currentAyahIndex].perfectAttempts >= 2) {
        newProgress[currentAyahIndex].completed = true;
        setAyahProgress(newProgress);
        
        // Move to next ayah
        if (currentAyahIndex + 1 < ayahProgress.length) {
          setCurrentAyahIndex(prev => prev + 1);
        }
      } else {
        setAyahProgress(newProgress);
      }
    } else {
      setAyahProgress(newProgress);
    }
    
    setIsReciting(false);
  }, [currentAyahIndex, ayahProgress]);

  // Handle spacebar
  const handleSpacebar = useCallback(() => {
    if (isReciting) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsReciting(false);
    } else {
      startRecognition();
    }
  }, [isReciting, startRecognition]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const currentAyah = ayahProgress[currentAyahIndex] || null;
  const isComplete = overallProgress >= 100;

  return {
    // State
    ayahProgress,
    currentAyah,
    currentAyahIndex,
    isReciting,
    isWaitingForSpace,
    feedback,
    showFeedback,
    detailedFeedback,
    overallProgress,
    isComplete,
    currentTranscript,
    
    // Actions
    handleSpacebar,
    setShowFeedback
  };
};

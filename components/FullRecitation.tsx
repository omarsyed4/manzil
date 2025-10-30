import React, { useState, useEffect, useCallback, useRef } from 'react';
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

interface FullRecitationProps {
  ayahs: LearnedAyah[];
  onComplete: () => void;
}

interface AyahProgress {
  ayah: LearnedAyah;
  text: string; // Full ayah text
  currentWordIndex: number;
  isCompleted: boolean;
  accuracy: number;
  mistakes: string[];
}

const FullRecitation: React.FC<FullRecitationProps> = ({
  ayahs,
  onComplete
}) => {
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
  const [perfectAttempts, setPerfectAttempts] = useState(0);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  
  const recognitionRef = useRef<any>(null);

  // Initialize ayah progress when component mounts
  useEffect(() => {
    if (ayahs.length === 0) {
      console.log('⚠️ [FullRecitation] No ayahs provided');
      onComplete();
      return;
    }

    const initializeProgress = async () => {
      const progress: AyahProgress[] = [];
      
      for (const ayah of ayahs) {
        // Fetch ayah text from mushafService (words subcollection)
        const fullText = await getAyahWords(ayah.surahId, ayah.ayahNumber);
        
        console.log('📖 [FullRecitation] Fetched ayah text', {
          surahId: ayah.surahId,
          ayahNumber: ayah.ayahNumber,
          hasText: !!fullText,
          textLength: fullText?.length || 0
        });
        
        if (!fullText) {
          console.error('❌ [FullRecitation] Failed to fetch ayah text for', ayah);
          continue;
        }
        
        progress.push({
          ayah,
          text: fullText,
          currentWordIndex: 0,
          isCompleted: false,
          accuracy: 0,
          mistakes: []
        });
      }
      
      setAyahProgress(progress);
      console.log('🔄 [FullRecitation] Initialized with real ayah data', { ayahsCount: progress.length });
    };
    
    initializeProgress();
  }, [ayahs, onComplete]);

  const startFullRecitation = useCallback(() => {
    if (currentAyahIndex >= ayahProgress.length) return;
    
    const currentAyah = ayahProgress[currentAyahIndex];
    const expectedText = currentAyah.text;
    
    console.log('🎤 [FullRecitation] Starting full recitation', {
      ayahIndex: currentAyahIndex,
      expectedText,
      totalAyahs: ayahProgress.length
    });

    if (!isSpeechRecognitionSupported()) {
      console.error('❌ [FullRecitation] Speech recognition not supported');
      return;
    }

    recognitionRef.current = createContinuousSpeechRecognition(
      expectedText,
      (transcript, similarity, qualityData) => {
        console.log('✅ [FullRecitation] Recognition complete', {
          transcript,
          similarity: (similarity * 100).toFixed(1) + '%',
          quality: qualityData.quality,
          ayahIndex: currentAyahIndex
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
        
        // Auto-hide feedback after 4 seconds
        setTimeout(() => {
          setShowFeedback(false);
          setDetailedFeedback(null);
        }, 4000);

        // Update current ayah progress
        setAyahProgress(prev => {
          const updated = [...prev];
          updated[currentAyahIndex] = {
            ...updated[currentAyahIndex],
            accuracy: wordAccuracy,
            mistakes: detailed.mistakes
          };
          return updated;
        });

        // Check if this is a perfect attempt (90%+ similarity and word accuracy)
        const isPerfect = similarity >= 0.90 && wordAccuracy >= 0.90;
        
        if (isPerfect) {
          console.log('🎯 [FullRecitation] Perfect ayah attempt!');
          
          // Mark current ayah as completed
          setAyahProgress(prev => {
            const updated = [...prev];
            updated[currentAyahIndex] = {
              ...updated[currentAyahIndex],
              isCompleted: true
            };
            return updated;
          });
          
          // Move to next ayah or complete
          setTimeout(() => {
            if (currentAyahIndex + 1 < ayahProgress.length) {
              setCurrentAyahIndex(prev => prev + 1);
              setIsWaitingForSpace(true);
              setFeedback('');
              setShowFeedback(false);
              setDetailedFeedback(null);
              setCurrentTranscript('');
            } else {
              // All ayahs completed, check if we need more perfect attempts
              const newPerfectAttempts = perfectAttempts + 1;
              setPerfectAttempts(newPerfectAttempts);
              
              if (newPerfectAttempts >= 2) {
                console.log('🎉 [FullRecitation] All ayahs completed with 2 perfect attempts!');
                onComplete();
              } else {
                console.log('🔄 [FullRecitation] Restarting for perfect attempt', newPerfectAttempts + 1);
                // Reset for another full recitation
                setCurrentAyahIndex(0);
                setIsWaitingForSpace(true);
                setFeedback('');
                setShowFeedback(false);
                setDetailedFeedback(null);
                setCurrentTranscript('');
                
                // Reset all ayahs to incomplete
                setAyahProgress(prev => prev.map(ayah => ({ ...ayah, isCompleted: false })));
              }
            }
          }, 2000);
        } else {
          // Not perfect, continue with same ayah
          setTimeout(() => {
            setIsWaitingForSpace(true);
            setFeedback('');
            setShowFeedback(false);
            setDetailedFeedback(null);
            setCurrentTranscript('');
          }, 2000);
        }
        
        setIsReciting(false);
      },
      (error) => {
        console.error('❌ [FullRecitation] Recognition error:', error);
        setIsReciting(false);
        setIsWaitingForSpace(true);
      },
      // Interim results callback for real-time feedback
      (interimTranscript) => {
        setCurrentTranscript(interimTranscript);
      }
    );

    recognitionRef.current.start();
    setIsReciting(true);
    setIsWaitingForSpace(false);
  }, [currentAyahIndex, ayahProgress, perfectAttempts, onComplete]);

  const handleSpacebarPress = useCallback(() => {
    console.log('⌨️ [FullRecitation] Spacebar pressed', {
      isReciting,
      isWaitingForSpace,
      currentAyahIndex,
      perfectAttempts
    });

    if (isWaitingForSpace && !isReciting) {
      // Start full recitation
      startFullRecitation();
    } else if (isReciting) {
      // Stop recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsReciting(false);
      setIsWaitingForSpace(true);
    }
  }, [isReciting, isWaitingForSpace, startFullRecitation]);

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
    if (ayahProgress.length === 0) return;
    
    const completedAyahs = ayahProgress.filter(ayah => ayah.isCompleted).length;
    const progress = (completedAyahs / ayahProgress.length) * 100;
    setOverallProgress(progress);
  }, [ayahProgress]);

  if (ayahProgress.length === 0) {
    return (
      <div className="text-center">
        <p className="text-dark-text-secondary">Loading ayahs...</p>
      </div>
    );
  }

  const currentAyah = ayahProgress[currentAyahIndex];
  const completedAyahs = ayahProgress.filter(ayah => ayah.isCompleted).length;

  return (
    <div className="flex-1 flex flex-col justify-center">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-dark-text mb-2">
          Full Recitation
        </h2>
        <p className="text-dark-text-secondary">
          Recite all {ayahs.length} ayahs in sequence
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

      {/* Current ayah info */}
      <div className="bg-dark-surface-hover border border-dark-border rounded-xl p-6 mb-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-dark-text mb-4">
            Ayah {currentAyahIndex + 1} of {ayahProgress.length}
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-dark-text-muted mb-2">Recite:</p>
            <p className="text-lg font-arabic text-dark-text" dir="rtl">
              {currentAyah.text}
            </p>
          </div>
          
          <div className="text-sm text-dark-text-secondary">
            Perfect attempts: {perfectAttempts}/2
          </div>
        </div>
      </div>

      {/* Real-time transcript */}
      {currentTranscript && (
        <div className="bg-dark-surface-hover border border-dark-border rounded-xl p-4 mb-6">
          <h4 className="text-sm font-semibold text-dark-text mb-2">Current recitation:</h4>
          <p className="text-sm text-dark-text-secondary font-arabic" dir="rtl">
            {currentTranscript}
          </p>
        </div>
      )}

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

      {/* Ayah progress indicators */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-dark-text mb-3">Ayah Progress:</h4>
        <div className="flex flex-wrap gap-2">
          {ayahProgress.map((ayah, index) => (
            <div
              key={index}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                index === currentAyahIndex
                  ? 'bg-accent text-white'
                  : ayah.isCompleted
                  ? 'bg-easy text-white'
                  : 'bg-dark-border text-dark-text-secondary'
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Status indicators */}
      <div className="mt-8">
        <div className="h-10 flex items-center justify-center">
          {isWaitingForSpace && !isReciting && (
            <div className="inline-flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm text-accent font-medium">
                Press SPACE to {perfectAttempts === 0 ? 'start full recitation' : 'try again'}
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
          Recite all ayahs in sequence. You need 2 perfect full recitations to complete.
        </p>
      </div>
    </div>
  );
};

export default FullRecitation;

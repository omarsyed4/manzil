import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TextToken, LearnStage, ConnectMode, LearnedAyah, SessionData } from '../types';
import { useMicVad } from '../hooks/useMicVad';
import { useReciteOverlay } from '../hooks/useReciteOverlay';
import { getAudioUrl, getWordSegments, getWordAtTime, createAudioPlayer } from '../lib/recitationService';
import { 
  isSpeechRecognitionSupported, 
  createSpeechRecognition,
  createContinuousSpeechRecognition,
  normalizeArabicText,
  checkWordsSpoken,
  generateHyperSpecificFeedback,
  generateListenShadowFeedback,
  calculateWordAccuracy,
  calculateLetterAccuracy,
  getQualityFromSimilarity
} from '../lib/speechRecognitionService';
import TransitionPractice from './TransitionPractice';
import FullRecitation from './FullRecitation';

interface RecitationSegment {
  word: number;
  startMs: number;
  endMs: number;
}

interface LearnAyahViewProps {
  surah: number;
  ayah: number;
  ayahText: string;
  textTokens: TextToken[];
  baselineMsPerWord: number;
  hesitationThresholdMs: number;
  currentAyahIndex: number;
  totalAyahs: number;
  onAyahMastered: (attempts: any[]) => void;
  onNeedsExtraPractice: (attempts: any[]) => void;
}

// LearnStage type is now imported from types

const LearnAyahView: React.FC<LearnAyahViewProps> = ({
  surah,
  ayah,
  ayahText,
  textTokens,
  baselineMsPerWord,
  hesitationThresholdMs,
  currentAyahIndex,
  totalAyahs,
  onAyahMastered,
  onNeedsExtraPractice,
}) => {
  const [stage, setStage] = useState<LearnStage>('ayah-intro');
  const [connectMode, setConnectMode] = useState<ConnectMode>('transitions');
  const [learnedAyahs, setLearnedAyahs] = useState<LearnedAyah[]>([]);
  const [showTransliteration, setShowTransliteration] = useState(true);
  const [isReciting, setIsReciting] = useState(false);
  const [revealedWords, setRevealedWords] = useState<number>(-1);
  const [attemptCount, setAttemptCount] = useState(0);
  const [successfulAttempts, setSuccessfulAttempts] = useState(0);
  const [stageAttemptCount, setStageAttemptCount] = useState(0);
  const [stageSuccessfulAttempts, setStageSuccessfulAttempts] = useState(0);
  const [stageProgress, setStageProgress] = useState(0); // 0-100 for progress bar
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState('');
  const [isWaitingForSpace, setIsWaitingForSpace] = useState(true);
  const [currentWord, setCurrentWord] = useState<number>(-1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [wordSegments, setWordSegments] = useState<RecitationSegment[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 0.5 to 1.5
  const [showSettings, setShowSettings] = useState(false);
  const [useSpeechRecognition, setUseSpeechRecognition] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [recognizedWords, setRecognizedWords] = useState<boolean[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [showStrugglingWarning, setShowStrugglingWarning] = useState(false);
  const [detailedFeedback, setDetailedFeedback] = useState<{
    feedback: string;
    mistakes: string[];
    suggestions: string[];
    correctWords: string[];
    wordAccuracy: number;
  } | null>(null);
  const [perfectAttempts, setPerfectAttempts] = useState(0);
  const [consecutivePerfectAttempts, setConsecutivePerfectAttempts] = useState(0);
  const [previousWordAccuracy, setPreviousWordAccuracy] = useState<number>(0);
  const [showAccuracyAnimation, setShowAccuracyAnimation] = useState<{
    show: boolean;
    change: number;
    isPositive: boolean;
  }>({ show: false, change: 0, isPositive: false });
  const [feedbackTimeout, setFeedbackTimeout] = useState<NodeJS.Timeout | null>(null);
  const [missedChars, setMissedChars] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionReadReciteRef = useRef<any>(null);
  const recognitionRecallRef = useRef<any>(null);
  const transitionInProgressRef = useRef<boolean>(false); // Prevent double transitions
  const hasCalledTransitionRef = useRef<boolean>(false); // Track if transition function was called
  const REQUIRED_REPETITIONS = 3; // Number of successful repetitions to fill progress

  // Load audio and segments on mount
  useEffect(() => {
    async function loadAudio() {
      const url = await getAudioUrl(surah, ayah);
      const segments = await getWordSegments(surah, ayah);
      
      setAudioUrl(url);
      setWordSegments(segments);
    }
    
    loadAudio();

    // Check speech recognition support
    if (!isSpeechRecognitionSupported()) {
      console.warn('⚠️ [Speech Recognition] Not supported - falling back to VAD only');
      setUseSpeechRecognition(false);
    } else {
      console.log('✓ [Speech Recognition] Supported and enabled');
    }
  }, [surah, ayah]);

  // Encouragement messages
  const encouragementMessages = [
    'Mashallah! 🌟',
    "You're doing great!",
    'Keep it up! 💪',
    "You're on a roll!",
    'Excellent progress!',
    'Beautiful recitation! ✨'
  ];

  const getRandomEncouragement = () => {
    return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
  };

  // VAD hook for voice detection - must be defined before playAudio
  const { vadState, startListening, stopListening } = useMicVad();

  // Generate feedback message based on quality
  const generateFeedback = useCallback((similarity: number, quality: string): string => {
    if (similarity >= 0.95) {
      return 'Perfect! ✨';
    } else if (similarity >= 0.80) {
      return 'Great! 👍';
    } else if (similarity >= 0.60) {
      return 'Good';
    } else if (similarity >= 0.30) {
      return 'Keep trying';
    } else {
      return 'Try again';
    }
  }, []);

  // Show feedback temporarily
  const displayFeedback = useCallback((message: string, timeoutMs: number = 4000) => {
    setFeedbackMessage(message);
    setShowFeedback(true);
    
    // Clear existing timeout
    if (feedbackTimeout) {
      clearTimeout(feedbackTimeout);
    }
    
    // Auto-hide feedback after specified time
    const timeout = setTimeout(() => {
      setShowFeedback(false);
      setFeedbackMessage('');
    }, timeoutMs);
    
    setFeedbackTimeout(timeout);
  }, [feedbackTimeout]);

  // Start speech recognition for listen-shadow stage
  const startSpeechRecognition = useCallback(() => {
    console.log('🎤 [Speech Recognition] Initializing...');
    
    // Get expected text (Arabic without tashkeel for better matching)
    const expectedText = ayahText;
    
    recognitionRef.current = createSpeechRecognition(
      expectedText,
      (transcript, similarity, qualityData) => {
        // Speech recognition completed
        console.log('✅ [Speech Recognition Complete]', {
          transcript,
          similarity: similarity.toFixed(2),
          quality: qualityData.quality,
          progressIncrement: qualityData.progressIncrement
        });
        
        setIsReciting(false);
        
        // STRICT VALIDATION: Must have at least 70% letter accuracy to get points
        const letterAccuracy = calculateLetterAccuracy(transcript, ayahText);
        const qualityDataWithLetterAccuracy = getQualityFromSimilarity(similarity, letterAccuracy);
        
        // Generate hyper-specific feedback for listen-shadow
        const listenShadowFeedback = generateListenShadowFeedback(transcript, ayahText);
        setDetailedFeedback({
          feedback: listenShadowFeedback.feedback,
          mistakes: listenShadowFeedback.mistakes,
          suggestions: [], // No suggestions for listen-shadow
          correctWords: [], // Don't show correct characters
          wordAccuracy: listenShadowFeedback.letterAccuracy
        });
        setMissedChars(listenShadowFeedback.missedChars);
        
        // Show accuracy animation - only if we have a previous value to compare
        if (previousWordAccuracy > 0) {
          const accuracyChange = listenShadowFeedback.letterAccuracy - previousWordAccuracy;
          if (Math.abs(accuracyChange) > 0.01) { // Only show if change is significant
            setShowAccuracyAnimation({
              show: true,
              change: Math.abs(accuracyChange * 100),
              isPositive: accuracyChange > 0
            });
            
            setTimeout(() => {
              setShowAccuracyAnimation({ show: false, change: 0, isPositive: false });
            }, 2000);
          }
        }
        setPreviousWordAccuracy(listenShadowFeedback.letterAccuracy);
        
        if (letterAccuracy < 0.70) {
          console.warn('⚠️ [STRICT] Below 70% letter accuracy - NO POINTS', {
            letterAccuracy: (letterAccuracy * 100).toFixed(0) + '%',
            similarity: (similarity * 100).toFixed(0) + '%',
            message: 'Recitation too different from expected āyah'
          });
          
          displayFeedback(`Keep trying! Only ${(letterAccuracy * 100).toFixed(0)}% accuracy. Recite the correct āyah.`);
          
          // No progress added, but still auto-loop
          setTimeout(() => {
            console.log('🔄 [Auto-Loop] Playing audio again (no progress added)...');
            setIsWaitingForSpace(true);
            playAudio();
          }, 800);
          
          return; // Don't add progress
        }
        
        // Track attempts and successful attempts
        setAttemptCount(prev => prev + 1);
        setStageAttemptCount(prev => prev + 1);
        
        if (letterAccuracy >= 0.70) { // Consider 70%+ as successful
          setSuccessfulAttempts(prev => prev + 1);
          setStageSuccessfulAttempts(prev => prev + 1);
        }
        
        // Show feedback
        displayFeedback(listenShadowFeedback.feedback);
        
        // Add progress based on text similarity
        setStageProgress(prev => {
          const finalProgress = Math.min(prev + qualityDataWithLetterAccuracy.progressIncrement, 100);
          
          console.log('📈 [Progress Update]', {
            similarity: (similarity * 100).toFixed(0) + '%',
            letterAccuracy: (letterAccuracy * 100).toFixed(0) + '%',
            previous: prev,
            increment: qualityDataWithLetterAccuracy.progressIncrement,
            finalProgress,
            isComplete: finalProgress >= 100
          });
          
          console.log('🔍 [Listen-Shadow Transition Check]', {
            finalProgress,
            condition: finalProgress >= 100,
            willTransition: finalProgress >= 100 ? 'YES ✅' : 'NO ❌',
            blockingReason: finalProgress < 100 ? `Need ${(100 - finalProgress).toFixed(1)}% more progress` : 'None - should transition'
          });
          
          // Transition when we reach 100%
          if (finalProgress >= 100 && !hasCalledTransitionRef.current) {
            console.log('🎉 [Listen-Shadow] INITIATING TRANSITION to Read-Recite...');
            hasCalledTransitionRef.current = true; // Mark that we've called the transition
            transitionInProgressRef.current = true; // Set flag to prevent auto-loops
            // Stop any further recognition
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
            setIsReciting(false);
            // Immediately transition
            setTimeout(() => {
              showEncouragementAndProgress('listen-shadow');
              hasCalledTransitionRef.current = false; // Reset for next stage
            }, 100);
            return 100;
          } else if (finalProgress >= 100) {
            // Already transitioning, just return
            console.log('⏸️ [Listen-Shadow] Transition already called, skipping duplicate...');
            return finalProgress;
          } else {
            console.log('⏸️ [Listen-Shadow] NOT transitioning. User must continue.', {
              progressNeeded: (100 - finalProgress).toFixed(1) + '%'
            });
            // Continue auto-play cycle for next attempt
            setTimeout(() => {
              if (!transitionInProgressRef.current) { // Only if not transitioning
                console.log('🔄 [Auto-Loop] Playing audio again...');
                setIsWaitingForSpace(true);
                playAudio();
              }
            }, 800);
            return finalProgress;
          }
        });
      },
      (error) => {
        console.error('❌ [Speech Recognition] Error:', error);
        setIsReciting(false);
        setIsWaitingForSpace(true);
        
        // Fall back to VAD if speech recognition fails
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          console.warn('⚠️ [Fallback] Using VAD instead of speech recognition');
          setUseSpeechRecognition(false);
          startListening();
        }
      },
      () => {
        console.log('🛑 [Speech Recognition] Session ended');
      }
    );
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log('▶️ [Speech Recognition] Started');
      } catch (err) {
        console.error('❌ [Speech Recognition] Failed to start:', err);
        // Fall back to VAD
        setUseSpeechRecognition(false);
        startListening();
      }
    }
  }, [ayahText, startListening, generateFeedback, displayFeedback]);

  // Start speech recognition for read-recite stage (continuous mode)
  const startSpeechRecognitionReadRecite = useCallback(() => {
    console.log('🎤 [Read-Recite Speech Recognition] Initializing continuous mode...');
    
    const expectedText = ayahText;
    
    recognitionReadReciteRef.current = createContinuousSpeechRecognition(
      expectedText,
      (transcript, similarity, qualityData) => {
        console.log('✅ [Read-Recite Recognition Complete]', {
          transcript,
          similarity: similarity.toFixed(2),
          quality: qualityData.quality,
          progressIncrement: qualityData.progressIncrement
        });
        
        // Generate hyper-specific feedback
        const expectedWords = ayahText.split(' ').filter(word => word.trim().length > 0);
        const wordAccuracy = calculateWordAccuracy(transcript, expectedWords);
        const detailed = generateHyperSpecificFeedback(transcript, ayahText, expectedWords);
        setDetailedFeedback(detailed);
        
        // Track attempts and successful attempts
        setAttemptCount(prev => prev + 1);
        setStageAttemptCount(prev => prev + 1);
        
        if (wordAccuracy >= 0.70) { // Consider 70%+ as successful
          setSuccessfulAttempts(prev => prev + 1);
          setStageSuccessfulAttempts(prev => prev + 1);
        }
        
        // Calculate quality with word accuracy requirement
        const qualityDataWithAccuracy = getQualityFromSimilarity(similarity, wordAccuracy);
        
        // Show word accuracy animation
        const accuracyChange = wordAccuracy - previousWordAccuracy;
        if (Math.abs(accuracyChange) > 0.01) { // Only show if change is significant
          setShowAccuracyAnimation({
            show: true,
            change: Math.abs(accuracyChange * 100),
            isPositive: accuracyChange > 0
          });
          
          setTimeout(() => {
            setShowAccuracyAnimation({ show: false, change: 0, isPositive: false });
          }, 2000);
        }
        setPreviousWordAccuracy(wordAccuracy);
        
        // Show hyper-specific feedback
        displayFeedback(detailed.feedback);
        
        // Add positive encouragement for good attempts
        if (wordAccuracy >= 0.90) {
          setTimeout(() => displayFeedback('Perfect! Excellent recitation!'), 1000);
        } else if (wordAccuracy >= 0.75) {
          setTimeout(() => displayFeedback('Great job! Keep practicing!'), 1000);
        } else if (wordAccuracy >= 0.60) {
          setTimeout(() => displayFeedback('Good attempt! Almost there!'), 1000);
        }
        
        // Track attempts for struggling detection
        setAttemptCount(prev => prev + 1);
        
        console.log('📝 [Read-Recite Attempt]', {
          attemptNumber: stageAttemptCount + 1,
          timestamp: new Date().toISOString()
        });
        
        console.log('📊 [Read-Recite Metrics]', {
          similarity: (similarity * 100).toFixed(1) + '%',
          wordAccuracy: (wordAccuracy * 100).toFixed(1) + '%'
        });
        
        console.log('⬆️ [Read-Recite Progress Calculation]', {
          previousProgress: '[will be shown in setStageProgress]',
          progressIncrement: qualityDataWithAccuracy.progressIncrement,
          reason: qualityDataWithAccuracy.progressIncrement === 0 ? 'Below 70% accuracy threshold' : 'Valid progress'
        });
        
        // Add progress immediately
        setStageProgress(prev => {
          const finalProgress = Math.min(prev + qualityDataWithAccuracy.progressIncrement, 100);
          
          console.log('📈 [Read-Recite Progress Update]', {
            previousProgress: prev.toFixed(1) + '%',
            increment: '+' + qualityDataWithAccuracy.progressIncrement + '%',
            finalProgress: finalProgress.toFixed(1) + '%',
            isComplete: finalProgress >= 100
          });
          
          console.log('🔍 [Read-Recite Transition Check]', {
            finalProgress,
            condition: finalProgress >= 100,
            willTransition: finalProgress >= 100 ? 'YES ✅' : 'NO ❌',
            blockingReason: finalProgress < 100 ? `Need ${(100 - finalProgress).toFixed(1)}% more progress` : 'None - should transition'
          });
          
          // Check for struggling (5+ attempts with low progress)
          if (stageAttemptCount >= 5 && finalProgress < 50) {
            setShowStrugglingWarning(true);
          }
          
          // Transition when we reach 100%
          if (finalProgress >= 100 && !hasCalledTransitionRef.current) {
            console.log('🎉 [Read-Recite Complete] Transitioning...');
            hasCalledTransitionRef.current = true; // Mark that we've called the transition
            transitionInProgressRef.current = true; // Set flag to prevent auto-loops
            // Stop recognition before showing encouragement
            if (recognitionReadReciteRef.current) {
              recognitionReadReciteRef.current.stop();
            }
            setIsReciting(false);
            // Immediately transition
            setTimeout(() => {
              showEncouragementAndProgress('read-recite');
              hasCalledTransitionRef.current = false; // Reset for next stage
            }, 100);
            return 100;
          } else if (finalProgress >= 100) {
            // Already transitioning, just return
            console.log('⏸️ [Read-Recite] Transition already called, skipping duplicate...');
            return finalProgress;
          } else {
            // Continue for next attempt - NO AUDIO
            setTimeout(() => {
              if (!transitionInProgressRef.current) { // Only if not transitioning
                console.log('🔄 [Auto-Loop] Ready for next attempt...');
                setIsWaitingForSpace(true);
                // Play audio cue to indicate ready
                setTimeout(() => playReadyCue(), 200);
              }
            }, 800);
            return finalProgress;
          }
        });
      },
      (transcript, similarity) => {
        // Real-time interim feedback
        console.log('🔄 [Read-Recite Interim]', {
          transcript,
          similarity: similarity.toFixed(2)
        });
        setCurrentTranscript(transcript);
      },
      (error) => {
        console.error('❌ [Read-Recite Recognition] Error:', error);
        // Continuous mode handles restart automatically
      },
      () => {
        console.log('🛑 [Read-Recite Recognition] Session ended naturally');
        // Continuous mode automatically restarts - no manual restart needed
      }
    );
    
    if (recognitionReadReciteRef.current) {
      try {
        recognitionReadReciteRef.current.start();
        console.log('▶️ [Read-Recite Recognition] Started in continuous mode');
      } catch (err) {
        console.error('❌ [Read-Recite Recognition] Failed to start:', err);
      }
    }
  }, [ayahText, generateFeedback, displayFeedback]);

  // Audio playback with real recitation
  const playAudio = useCallback(() => {
    console.log('🔊 [Audio] Attempting to play', {
      hasAudioUrl: !!audioUrl,
      audioUrl,
      segmentCount: wordSegments.length,
      playbackSpeed,
      stage
    });

    if (!audioUrl) {
      console.warn('❌ [Audio] No audio URL available for', surah, ayah);
      return;
    }

    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    setAudioPlaying(true);
    setIsWaitingForSpace(false);
    setCurrentWord(-1);

    audioRef.current = createAudioPlayer(
      audioUrl,
      (currentTimeMs) => {
        // Update which word is being recited - INSTANT, no animation
        const wordIndex = getWordAtTime(wordSegments, currentTimeMs);
        if (wordIndex !== currentWord) {
          console.log(`🎵 [Word Highlight] Word ${wordIndex + 1} at ${currentTimeMs.toFixed(0)}ms`);
          setCurrentWord(wordIndex);
        }
      },
      () => {
        console.log('✓ [Audio Complete] Ended, auto-starting recording...');
        // Audio ended
        setAudioPlaying(false);
        setCurrentWord(-1);
        
        // After audio plays in listen-shadow, automatically start recording
        if (stage === 'listen-shadow') {
          console.log('🎙️ [Auto-Record] Starting microphone...');
          setIsReciting(true);
          
          // Use speech recognition if supported, otherwise fall back to VAD
          if (useSpeechRecognition) {
            startSpeechRecognition();
          } else {
            startListening().then(() => {
              console.log('✓ [Microphone] Successfully started listening (VAD fallback)');
            }).catch(err => {
              console.error('❌ [Microphone] Failed to start:', err);
            });
          }
        }
      }
    );

    // Set playback speed
    audioRef.current.playbackRate = playbackSpeed;
    console.log(`🎚️ [Playback Speed] Set to ${playbackSpeed}x`);

    audioRef.current.play()
      .then(() => {
        console.log('✓ [Audio] Playing successfully');
      })
      .catch(err => {
        console.error('❌ [Audio] Playback failed:', err);
        setAudioPlaying(false);
        setIsWaitingForSpace(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, wordSegments, stage, playbackSpeed, surah, ayah]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setAudioPlaying(false);
    setCurrentWord(-1);
    setIsWaitingForSpace(true);
  }, []);

  // Play a subtle audio cue to indicate it's time to recite
  const playReadyCue = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Subtle beep: 800Hz for 100ms
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      console.log('🔔 [Audio Cue] Ready beep played');
    } catch (err) {
      console.warn('⚠️ [Audio Cue] Failed to play:', err);
    }
  }, []);
  
  // Recall from Memory - Speech recognition with dynamic word reveal
  const startSpeechRecognitionRecall = useCallback(() => {
    console.log('🎤 [Recall Speech Recognition] Initializing continuous mode with dynamic word reveal...');
    
    const expectedText = ayahText;
    const expectedWords = ayahText.split(' ').filter(word => word.trim().length > 0);
    
    // Reset word tracking
    setRecognizedWords(new Array(expectedWords.length).fill(false));
    setRevealedWords(-1);
    
    recognitionRecallRef.current = createContinuousSpeechRecognition(
      expectedText,
      (transcript, similarity, qualityData) => {
        console.log('✅ [Recall Recognition Complete]', {
          transcript,
          similarity: similarity.toFixed(2),
          quality: qualityData.quality,
          progressIncrement: qualityData.progressIncrement
        });
        
        // Check which words were recognized
        const wordsSpoken = checkWordsSpoken(transcript, expectedWords);
        setRecognizedWords(wordsSpoken);
        
        // Show all words (user completed recitation)
        setRevealedWords(textTokens.length - 1);
        
        // Generate hyper-specific feedback
        const detailed = generateHyperSpecificFeedback(transcript, ayahText, expectedWords);
        setDetailedFeedback(detailed);
        
        // Calculate word accuracy and quality
        const wordAccuracy = detailed.wordAccuracy;
        const qualityDataWithAccuracy = getQualityFromSimilarity(similarity, wordAccuracy);
        
        // Show word accuracy animation
        const accuracyChange = wordAccuracy - previousWordAccuracy;
        if (Math.abs(accuracyChange) > 0.01) { // Only show if change is significant
          setShowAccuracyAnimation({
            show: true,
            change: Math.abs(accuracyChange * 100),
            isPositive: accuracyChange > 0
          });
          
          setTimeout(() => {
            setShowAccuracyAnimation({ show: false, change: 0, isPositive: false });
          }, 2000);
        }
        setPreviousWordAccuracy(wordAccuracy);
        
        // Track attempts and successful attempts
        setAttemptCount(prev => prev + 1);
        setStageAttemptCount(prev => prev + 1);
        
        console.log('📝 [Recall-Memory Attempt]', {
          attemptNumber: stageAttemptCount + 1,
          timestamp: new Date().toISOString()
        });
        
        if (wordAccuracy >= 0.70) { // Consider 70%+ as successful
          setSuccessfulAttempts(prev => prev + 1);
          setStageSuccessfulAttempts(prev => prev + 1);
        }
        
        console.log('📊 [Recall-Memory Metrics]', {
          similarity: (similarity * 100).toFixed(1) + '%',
          wordAccuracy: (wordAccuracy * 100).toFixed(1) + '%'
        });
        
        console.log('⬆️ [Recall-Memory Progress Calculation]', {
          previousProgress: '[will be shown in setStageProgress]',
          progressIncrement: qualityDataWithAccuracy.progressIncrement,
          reason: qualityDataWithAccuracy.progressIncrement === 0 ? 'Below 70% accuracy threshold' : 'Valid progress'
        });
        
        // Show hyper-specific feedback
        displayFeedback(detailed.feedback, 2000); // 2 seconds for Recall-Memory
        
        // Add progress based on text similarity
        setStageProgress(prev => {
          const finalProgress = Math.min(prev + qualityDataWithAccuracy.progressIncrement, 100);
          
          console.log('📈 [Recall-Memory Progress Update]', {
            previousProgress: prev.toFixed(1) + '%',
            increment: '+' + qualityDataWithAccuracy.progressIncrement + '%',
            finalProgress: finalProgress.toFixed(1) + '%',
            isComplete: finalProgress >= 100
          });
          
          console.log('🔍 [Recall-Memory Transition Check]', {
            finalProgress,
            condition: finalProgress >= 100,
            willTransition: finalProgress >= 100 ? 'YES ✅' : 'NO ❌',
            blockingReason: finalProgress < 100 ? `Need ${(100 - finalProgress).toFixed(1)}% more progress` : 'None - should transition'
          });
          
          // Transition when we reach 100%
          if (finalProgress >= 100 && !hasCalledTransitionRef.current) {
            console.log('🎉 [Recall Complete] Transitioning...');
            hasCalledTransitionRef.current = true; // Mark that we've called the transition
            transitionInProgressRef.current = true; // Set flag to prevent auto-loops
            // Stop recognition before showing encouragement
            if (recognitionRecallRef.current) {
              recognitionRecallRef.current.stop();
            }
            setIsReciting(false);
            // Immediately transition
            setTimeout(() => {
              showEncouragementAndProgress('recall-memory');
              hasCalledTransitionRef.current = false; // Reset for next stage
            }, 100);
            return 100;
          } else if (finalProgress >= 100) {
            // Already transitioning, just return
            console.log('⏸️ [Recall-Memory] Transition already called, skipping duplicate...');
            return finalProgress;
          } else {
            // Continue for next attempt - NO AUDIO
            setTimeout(() => {
              if (!transitionInProgressRef.current) { // Only if not transitioning
                console.log('🔄 [Auto-Loop] Ready for next attempt...');
                setIsWaitingForSpace(true);
                // Play audio cue to indicate ready
                setTimeout(() => playReadyCue(), 200);
              }
            }, 800);
            return finalProgress;
          }
        });
      },
      (transcript, similarity) => {
        // Real-time interim feedback and word reveal
        console.log('🔄 [Recall Interim]', {
          transcript,
          similarity: similarity.toFixed(2)
        });
        
        setCurrentTranscript(transcript);
        
        // Check which words are being recognized in real-time
        const wordsSpoken = checkWordsSpoken(transcript, expectedWords);
        setRecognizedWords(wordsSpoken);
        
        // Dynamically reveal words as they're recognized
        const lastRecognizedIndex = wordsSpoken.lastIndexOf(true);
        if (lastRecognizedIndex >= 0 && lastRecognizedIndex > revealedWords) {
          setRevealedWords(lastRecognizedIndex);
          console.log(`🎯 [Dynamic Reveal] Word ${lastRecognizedIndex + 1} revealed: "${expectedWords[lastRecognizedIndex]}"`);
        }
      },
      (error) => {
        console.error('❌ [Recall Recognition] Error:', error);
        // Continuous mode handles restart automatically
      },
      () => {
        console.log('🛑 [Recall Recognition] Session ended naturally');
        // Continuous mode automatically restarts - no manual restart needed
      }
    );
    
    if (recognitionRecallRef.current) {
      try {
        recognitionRecallRef.current.start();
        console.log('▶️ [Recall Recognition] Started in continuous mode');
      } catch (err) {
        console.error('❌ [Recall Recognition] Failed to start:', err);
      }
    }
  }, [ayahText, textTokens, generateFeedback, displayFeedback, revealedWords]);

  // Recite overlay hook for read-recite stage
  const reciteConfig = {
    profile: {
      baselineMsPerWord,
      hesitationThresholdMs,
      revealMode: 'mushaf-progressive' as const,
      voiceOnsetMinMs: 120,
      maxWordsPerVoicedBlock: 2,
      wordLengthWeight: {}
    },
    textTokens,
    onComplete: handleRecitationComplete
  };

  const { controller, startRecitation, stopRecitation } = useReciteOverlay(reciteConfig);

  function handleRecitationComplete(trace: any, mistakes: any[]) {
    setAttemptCount(prev => prev + 1);
    setIsReciting(false);
    setIsWaitingForSpace(true);
    
    // Count hesitations from trace
    const hesitations = trace?.words?.filter((w: any) => w.latencyToWord > hesitationThresholdMs).length || 0;
    const mistakeCount = mistakes?.length || 0;
    
    // Calculate dynamic progress based on quality
    // Perfect = 40%, Good = 30%, Fair = 20%, Poor = 10%
    let progressIncrement = 10;
    if (hesitations === 0 && mistakeCount === 0) {
      progressIncrement = 40; // Perfect
    } else if (hesitations <= 1 && mistakeCount <= 1) {
      progressIncrement = 30; // Good
    } else if (hesitations <= 2 && mistakeCount <= 2) {
      progressIncrement = 20; // Fair
    }

    setStageProgress(prev => {
      const newProgress = Math.min(prev + progressIncrement, 100);
      
      // Auto-progress to next stage when progress bar is full
      if (newProgress >= 100) {
        showEncouragementAndProgress(stage);
      }
      
      return newProgress;
    });
  }

  const showEncouragementAndProgress = (fromStage?: LearnStage) => {
    const currentStage = fromStage || stage;
    console.log('🎊 [Encouragement] Showing encouragement and progressing stage', { 
      currentStage,
      fromStageParam: fromStage,
      stateStage: stage,
      transitionInProgress: transitionInProgressRef.current
    });
    setEncouragementMessage(getRandomEncouragement());
    setShowEncouragement(true);
    
    setTimeout(() => {
      setShowEncouragement(false);
      // Reset transition flag for next stage
      transitionInProgressRef.current = false;
      
      // Progress to next stage
      if (currentStage === 'listen-shadow') {
        console.log('➡️ [Stage Transition] listen-shadow → read-recite');
        setStage('read-recite');
        setStageProgress(0);
        setAttemptCount(0);
        setStageAttemptCount(0);
        setStageSuccessfulAttempts(0);
        setIsWaitingForSpace(true);
      } else if (currentStage === 'read-recite') {
        console.log('➡️ [Stage Transition] read-recite → recall-memory');
        setStage('recall-memory');
        setRevealedWords(-1);
        setAttemptCount(0);
        setStageAttemptCount(0);
        setStageSuccessfulAttempts(0);
        setStageProgress(0);
        setIsWaitingForSpace(true);
        setDetailedFeedback(null);
        setShowStrugglingWarning(false);
        setPerfectAttempts(0);
      } else if (currentStage === 'recall-memory') {
        console.log('➡️ [Stage Transition] recall-memory → Checking if should connect ayahs...');
        
        // Add current ayah to learned list
        const currentLearned: LearnedAyah = {
          surahId: surah,
          ayahNumber: ayah,
          completedAt: new Date(),
          masteryLevel: 100
        };
        
        const updatedLearnedAyahs = [...learnedAyahs, currentLearned];
        setLearnedAyahs(updatedLearnedAyahs);
        
        // Check if this is the last ayah in today's session
        const isLastAyah = (currentAyahIndex + 1) >= totalAyahs;
        
        console.log('📊 [Recall-Memory Transition Decision]', {
          currentAyahIndex,
          totalAyahs,
          isLastAyah,
          learnedCount: updatedLearnedAyahs.length,
          shouldConnect: isLastAyah && updatedLearnedAyahs.length > 1
        });
        
        if (isLastAyah && updatedLearnedAyahs.length > 1) {
          // Last ayah AND we have multiple ayahs - start connection stage
          console.log('✅ [Transition] All ayahs complete! Moving to connect-ayahs stage');
          setStage('connect-ayahs');
          setConnectMode('transitions');
          setStageProgress(0);
          setIsWaitingForSpace(true);
        } else {
          // More ayahs to learn OR first ayah - move to next ayah
          console.log('✅ [Transition] Ayah complete, moving to next ayah');
          onAyahMastered([]);
        }
      } else if (currentStage === 'connect-ayahs') {
        console.log('🎯 [Stage Complete] connect-ayahs → all ayahs mastered!');
        // All ayahs mastered!
        onAyahMastered([]);
      }
    }, 2000);
  };

  const handleSpacebarPress = useCallback(() => {
    console.log('⌨️ [SPACEBAR PRESSED]', {
      stage,
      audioPlaying,
      isReciting,
      isWaitingForSpace,
      showEncouragement,
      usingSpeechRecognition: useSpeechRecognition
    });

    if (showEncouragement) {
      console.log('❌ [Blocked] Encouragement showing');
      return;
    }
    
    if (stage === 'listen-shadow') {
      if (audioPlaying) {
        console.log('🔄 [Action] Restarting audio');
        stopAudio();
        setTimeout(() => playAudio(), 100);
      } else if (isReciting) {
        console.log('🛑 [Action] Stopping recording');
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        stopListening();
        setIsReciting(false);
        setIsWaitingForSpace(true);
      } else {
        console.log('▶️ [Action] Playing audio');
        playAudio();
      }
    } else if (stage === 'read-recite') {
      if (isReciting) {
        console.log('🛑 [Action] Stopping continuous recording');
        if (recognitionReadReciteRef.current) {
          recognitionReadReciteRef.current.stop();
        }
        stopRecitation();
        setIsReciting(false);
        setIsWaitingForSpace(true);
        setCurrentWord(-1);
      } else {
        console.log('🎙️ [Action] Starting continuous recording mode with speech recognition');
        setIsReciting(true);
        setIsWaitingForSpace(false);
        setCurrentWord(-1);
        
        // Play ready cue before starting
        playReadyCue();
        
        if (useSpeechRecognition) {
          startSpeechRecognitionReadRecite();
        } else {
          startRecitation();
        }
      }
    } else if (stage === 'recall-memory') {
      if (isReciting) {
        console.log('🛑 [Action] Stopping recall recording');
        if (recognitionRecallRef.current) {
          recognitionRecallRef.current.stop();
        }
        stopListening();
        setIsReciting(false);
        setIsWaitingForSpace(true);
        setRevealedWords(-1);
      } else {
        console.log('🎙️ [Action] Starting recall recording with speech recognition');
        setRevealedWords(-1);
        setIsReciting(true);
        setIsWaitingForSpace(false);
        
        // Play ready cue before starting
        playReadyCue();
        
        if (useSpeechRecognition) {
          startSpeechRecognitionRecall();
        } else {
          startListening();
        }
      }
    }
  }, [stage, isWaitingForSpace, showEncouragement, audioPlaying, isReciting, playAudio, stopAudio, startRecitation, stopRecitation, startListening, stopListening, useSpeechRecognition, startSpeechRecognitionReadRecite, startSpeechRecognitionRecall, playReadyCue]);

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && stage !== 'ayah-intro') {
        e.preventDefault();
        handleSpacebarPress();
      } else if (e.code === 'ArrowLeft' && stage === 'read-recite' && showStrugglingWarning) {
        e.preventDefault();
        // Go back to listen-shadow stage
        console.log('⬅️ [Action] Going back to listen-shadow stage');
        setStage('listen-shadow');
        setStageProgress(0);
        setAttemptCount(0);
        setIsWaitingForSpace(true);
        setShowStrugglingWarning(false);
        setDetailedFeedback(null);
        
        // Stop current recognition
        if (recognitionReadReciteRef.current) {
          recognitionReadReciteRef.current.stop();
        }
        setIsReciting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSpacebarPress, stage, showStrugglingWarning]);

  // Handle listen-shadow recitation completion
  useEffect(() => {
    console.log('🎤 [VAD State]', {
      stage,
      isReciting,
      isListening: vadState.isListening,
      isVoiceDetected: vadState.isVoiceDetected,
      segmentCount: vadState.segments.length,
      currentSegment: vadState.currentSegment
    });

    if (stage === 'listen-shadow' && isReciting && vadState.isListening) {
      const segments = vadState.segments;
      
      console.log('🔊 [Listen-Shadow Recording]', {
        totalSegments: segments.length,
        isVoiceCurrentlyDetected: vadState.isVoiceDetected,
        segments: segments.map(s => ({
          duration: s.end - s.start,
          confidence: s.confidence
        }))
      });

      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        const timeSinceLastVoice = Date.now() - lastSegment.end;
        
        console.log('⏱️ [Silence Detection]', {
          timeSinceLastVoice,
          threshold: 1000,
          shouldComplete: timeSinceLastVoice > 1000 && !vadState.isVoiceDetected
        });
        
        // If 1 second of silence after speaking, consider it complete
        if (timeSinceLastVoice > 1000 && !vadState.isVoiceDetected) {
          console.log('✅ [Recitation Complete] Stopping and evaluating...');
          
          stopListening();
          setIsReciting(false);
          
          // Validate the recitation
          const hasVocalized = segments.length > 0;
          const totalVoiceDuration = segments.reduce((sum, seg) => sum + (seg.end - seg.start), 0);
          const avgConfidence = segments.reduce((sum, seg) => sum + seg.confidence, 0) / segments.length;
          
          console.log('📊 [Quality Analysis]', {
            hasVocalized,
            segmentCount: segments.length,
            totalVoiceDuration: `${totalVoiceDuration}ms`,
            avgConfidence,
            expectedWords: textTokens.length
          });
          
          // Quality scoring based on vocalization
          let quality: 'perfect' | 'good' | 'fair' | 'poor' = 'poor';
          let progressIncrement = 10;
          
          if (hasVocalized && totalVoiceDuration > 500) {
            if (segments.length >= textTokens.length && avgConfidence > 0.5) {
              quality = 'perfect';
              progressIncrement = 40;
            } else if (segments.length >= textTokens.length * 0.75) {
              quality = 'good';
              progressIncrement = 30;
            } else {
              quality = 'fair';
              progressIncrement = 20;
            }
          }
          
          console.log('🎯 [Progress Increment]', {
            quality,
            progressIncrement,
            reason: `${segments.length} segments, ${totalVoiceDuration}ms voice, ${avgConfidence.toFixed(2)} confidence`
          });
          
          // Add progress based on quality
          setStageProgress(prev => {
            const newProgress = Math.min(prev + progressIncrement, 100);
            console.log('📈 [Progress Update]', {
              previous: prev,
              increment: progressIncrement,
              new: newProgress,
              isComplete: newProgress >= 100
            });
            
            if (newProgress >= 100) {
              showEncouragementAndProgress('listen-shadow');
            }
            
            return newProgress;
          });
          
          // Auto-play audio again for next cycle (continuous loop)
          setTimeout(() => {
            console.log('🔄 [Auto-Loop] Playing audio again...');
            setIsWaitingForSpace(true);
            playAudio();
          }, 800);
        }
      }
    }
  }, [stage, isReciting, vadState, stopListening, playAudio, textTokens.length]);

  const handleBeginLearning = () => {
    setStage('listen-shadow');
    setStageProgress(0);
    setAttemptCount(0);
    setIsWaitingForSpace(true);
  };

  const handleSkipToNext = () => {
    onAyahMastered([]);
  };

  const handleTransitionComplete = () => {
    console.log('🔄 [Connect-Ayahs] Transition practice completed, moving to full recitation');
    setConnectMode('full-recitation');
    setStageProgress(0);
    setIsWaitingForSpace(true);
  };

  const handleConnectionComplete = () => {
    console.log('🎉 [Connect-Ayahs] Full connection completed!');
    onAyahMastered([]);
  };

  const getStageTitle = () => {
    switch (stage) {
      case 'ayah-intro':
        return 'New Āyah';
      case 'listen-shadow':
        return 'Listen & Shadow';
      case 'read-recite':
        return 'Read & Recite';
      case 'recall-memory':
        return 'Recall from Memory';
      case 'connect-ayahs':
        return connectMode === 'transitions' ? 'Practice Transitions' : 'Full Recitation';
    }
  };

  const getStageDescription = () => {
    switch (stage) {
      case 'ayah-intro':
        return 'Get familiar with this āyah before starting';
      case 'listen-shadow':
        return 'Listen to the recitation and repeat along';
      case 'read-recite':
        return 'Recite while reading the Arabic text';
      case 'recall-memory':
        return 'Recite from memory as words appear';
      case 'connect-ayahs':
        return connectMode === 'transitions' ? 'Practice smooth transitions between ayahs' : 'Recite all ayahs in sequence';
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      {/* Encouragement overlay */}
      {showEncouragement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-bg/90 backdrop-blur-sm">
          <div className="text-center animate-fade-in">
            <div className="text-6xl md:text-7xl font-bold text-accent mb-4 animate-pulse">
              {encouragementMessage}
            </div>
            <div className="text-dark-text-secondary">
              Moving to next stage...
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl w-full">
        {/* Progress header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-dark-surface border border-dark-border rounded-full px-4 py-2 mb-3">
            <span className="text-xs text-dark-text-secondary">
              Āyah {currentAyahIndex + 1} of {totalAyahs}
            </span>
            <span className="text-xs text-dark-text-muted">•</span>
            <span className="text-xs text-dark-text-secondary">
              {surah}:{ayah}
            </span>
          </div>
        </div>

        {/* Stage indicator */}
        {stage !== 'ayah-intro' && (
          <div className="text-center mb-6">
            {/* Stage progress dots */}
            <div className="inline-flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${stage === 'listen-shadow' ? 'bg-accent' : (stage === 'read-recite' || stage === 'recall-memory' || stage === 'connect-ayahs') ? 'bg-easy' : 'bg-dark-border'}`} />
              <div className="h-0.5 w-8 bg-dark-border" />
              <div className={`w-3 h-3 rounded-full ${stage === 'read-recite' ? 'bg-accent' : (stage === 'recall-memory' || stage === 'connect-ayahs') ? 'bg-easy' : 'bg-dark-border'}`} />
              <div className="h-0.5 w-8 bg-dark-border" />
              <div className={`w-3 h-3 rounded-full ${stage === 'recall-memory' ? 'bg-accent' : stage === 'connect-ayahs' ? 'bg-easy' : 'bg-dark-border'}`} />
              <div className="h-0.5 w-8 bg-dark-border" />
              <div className={`w-3 h-3 rounded-full ${stage === 'connect-ayahs' ? 'bg-accent' : 'bg-dark-border'}`} />
            </div>
            
            <h2 className="text-xl font-semibold text-dark-text mb-1">
              {getStageTitle()}
            </h2>
            <p className="text-sm text-dark-text-secondary">
              {stage === 'listen-shadow' && 'As you recite, the progress will build'}
              {stage === 'read-recite' && 'The better you recite, the more it will fill up'}
              {stage === 'recall-memory' && 'Recite from memory as words appear'}
            </p>
          </div>
        )}

        {/* Main content area - FIXED HEIGHT to prevent shifting */}
        <div className="bg-dark-surface rounded-2xl p-8 md:p-12 border border-dark-border mb-6 min-h-[400px] relative flex flex-col justify-center">
          {/* Settings button - Top right corner */}
          {stage === 'listen-shadow' && (
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-dark-text-secondary hover:text-dark-text transition-colors bg-dark-bg rounded-lg border border-dark-border"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              {/* Settings dropdown */}
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 bg-dark-surface border border-dark-border rounded-xl p-4 shadow-2xl z-10 w-64">
                  <h4 className="text-sm font-semibold text-dark-text mb-3">Playback Speed</h4>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between text-xs text-dark-text-secondary">
                      <span>0.5x (Slow)</span>
                      <span className="text-dark-text font-medium">{playbackSpeed.toFixed(1)}x</span>
                      <span>1.5x (Fast)</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPlaybackSpeed(0.75)}
                        className="flex-1 px-2 py-1 text-xs bg-dark-surface-hover rounded hover:bg-dark-bg transition-colors text-dark-text-secondary"
                      >
                        0.75x
                      </button>
                      <button
                        onClick={() => setPlaybackSpeed(1.0)}
                        className="flex-1 px-2 py-1 text-xs bg-dark-surface-hover rounded hover:bg-dark-bg transition-colors text-dark-text-secondary"
                      >
                        1.0x
                      </button>
                      <button
                        onClick={() => setPlaybackSpeed(1.25)}
                        className="flex-1 px-2 py-1 text-xs bg-dark-surface-hover rounded hover:bg-dark-bg transition-colors text-dark-text-secondary"
                      >
                        1.25x
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === 'ayah-intro' && (
            <div className="space-y-6">
              {/* Title */}
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-dark-text mb-2">
                  {getStageTitle()}
                </h2>
                <p className="text-dark-text-secondary">
                  Take a moment to familiarize yourself with this āyah
                </p>
              </div>

              {/* Arabic text */}
              <div className="text-center my-8">
                <p className="text-4xl md:text-5xl font-arabic text-dark-text leading-loose mb-4" dir="rtl">
                  {ayahText}
                </p>
                <p className="text-lg text-dark-text-secondary">
                  {textTokens.map(t => t.text).join(' ')}
                </p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-dark-surface-hover rounded-xl p-4 border border-dark-border text-center">
                  <div className="text-2xl font-semibold text-dark-text mb-1">{textTokens.length}</div>
                  <div className="text-sm text-dark-text-secondary">Words</div>
                </div>
                <div className="bg-dark-surface-hover rounded-xl p-4 border border-dark-border text-center">
                  <div className="text-2xl font-semibold text-dark-text mb-1">{surah}:{ayah}</div>
                  <div className="text-sm text-dark-text-secondary">Reference</div>
                </div>
              </div>

              {/* Info */}
              <div className="bg-dark-bg rounded-xl p-4 border border-dark-border max-w-lg mx-auto">
                {currentAyahIndex === 0 ? (
                  <p className="text-sm text-dark-text-secondary text-center">
                    You'll master this āyah through 3 stages: listening and repeating, reciting with text, and finally reciting from memory.
                  </p>
                ) : (
                  <p className="text-sm text-dark-text-secondary text-center">
                    Āyah {currentAyahIndex + 1} of {totalAyahs}. Let's master this one!
                  </p>
                )}
              </div>
            </div>
          )}

          {stage === 'listen-shadow' && (
            <div className="flex-1 flex flex-col justify-center">
              {/* Arabic text with INSTANT word highlighting during playback */}
              <div className="text-center mb-6">
                <p className="text-3xl md:text-4xl font-arabic text-dark-text leading-loose mb-4" dir="rtl">
                  {ayahText.split(' ').map((word, wordIndex) => (
                    <span key={wordIndex} className="inline-block ml-2">
                      {word.split('').map((char, charIndex) => (
                        <span
                          key={`${wordIndex}-${charIndex}`}
                          className={`${
                            missedChars.includes(char) ? 'text-medium bg-medium/20 px-1 rounded' : ''
                          }`}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  ))}
                </p>
                
                
                <p className="text-lg text-dark-text-secondary mb-6">
                  {textTokens.map(t => t.text).join(' ')}
                </p>

                {/* Hyper-specific feedback */}
                {detailedFeedback && (
                  <div className="bg-dark-surface-hover border border-dark-border rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-dark-text">Accuracy Feedback:</h4>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-dark-text-secondary">
                          Accuracy: {(detailedFeedback.wordAccuracy * 100).toFixed(0)}%
                        </div>
                        {showAccuracyAnimation.show && (
                          <div className={`text-xs font-bold animate-pulse ${
                            showAccuracyAnimation.isPositive ? 'text-easy' : 'text-medium'
                          }`}>
                            {showAccuracyAnimation.isPositive ? '+' : '-'}{showAccuracyAnimation.change.toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {detailedFeedback.mistakes.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-semibold text-medium mb-1">❌ What you missed:</h5>
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

                {/* Feedback message */}
                {showFeedback && (
                  <div className="mb-4 animate-fade-in">
                    <div className={`inline-block px-4 py-2 rounded-xl border ${
                      feedbackMessage.includes('Excellent') || feedbackMessage.includes('Perfect')
                        ? 'bg-easy/20 border-easy text-easy'
                        : feedbackMessage.includes('Great')
                        ? 'bg-accent/20 border-accent text-accent'
                        : 'bg-medium/20 border-medium text-medium'
                    }`}>
                      <span className="text-sm font-medium">{feedbackMessage}</span>
                    </div>
                  </div>
                )}

                {/* Status indicators - FIXED at bottom of tile */}
                <div className="mt-8">
                  {/* Reserved space - always present to prevent shifting */}
                  <div className="h-10 flex items-center justify-center">
                    {audioPlaying && (
                      <div className="inline-flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-4 py-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-sm text-dark-text-secondary">Playing recitation...</span>
                      </div>
                    )}
                    {isReciting && !audioPlaying && (
                      <div className="inline-flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-4 py-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm text-dark-text-secondary">Recording your recitation...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {stage === 'read-recite' && (
            <div className="space-y-6">
              {/* Struggling warning */}
              {showStrugglingWarning && (
                <div className="bg-medium/20 border border-medium rounded-xl p-4 mb-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-medium mb-2">
                      You're struggling with this āyah
                    </h3>
                    <p className="text-sm text-dark-text-secondary mb-3">
                      Give yourself a break and come back to it later. Practice the listen & shadow stage more.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => {
                          setStage('listen-shadow');
                          setStageProgress(0);
                          setAttemptCount(0);
                          setIsWaitingForSpace(true);
                          setShowStrugglingWarning(false);
                          setDetailedFeedback(null);
                          if (recognitionReadReciteRef.current) {
                            recognitionReadReciteRef.current.stop();
                          }
                          setIsReciting(false);
                        }}
                        className="px-4 py-2 bg-medium text-white rounded-lg hover:bg-medium/80 transition-colors"
                      >
                        Go Back to Listen & Shadow
                      </button>
                      <div className="text-xs text-dark-text-muted flex items-center">
                        Or press <kbd className="px-1 py-0.5 bg-dark-bg border border-dark-border rounded text-xs mx-1">←</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hyper-specific feedback */}
              {detailedFeedback && (
                <div className="bg-dark-surface-hover border border-dark-border rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-dark-text">Feedback:</h4>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-dark-text-secondary">
                        Word Accuracy: {(detailedFeedback.wordAccuracy * 100).toFixed(0)}%
                      </div>
                      {showAccuracyAnimation.show && (
                        <div className={`text-xs font-bold animate-pulse ${
                          showAccuracyAnimation.isPositive ? 'text-easy' : 'text-medium'
                        }`}>
                          {showAccuracyAnimation.isPositive ? '+' : '-'}{showAccuracyAnimation.change.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {detailedFeedback.mistakes.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-xs font-semibold text-medium mb-1">❌ Mistakes:</h5>
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

              {/* Recitation status indicator */}
              {!isReciting && isWaitingForSpace && (
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-sm text-accent font-medium">Press SPACE to recite</span>
                  </div>
                </div>
              )}

              {isReciting && (
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-red-500 font-medium">Recording... Press SPACE to stop</span>
                  </div>
                </div>
              )}

              {/* Arabic text with letter highlighting */}
              <div className="text-center mb-4">
                <p className="text-3xl md:text-4xl font-arabic text-dark-text leading-loose mb-4" dir="rtl">
                  {ayahText.split(' ').map((word, wordIndex) => (
                    <span key={wordIndex} className="inline-block ml-2">
                      {word.split('').map((char, charIndex) => (
                        <span
                          key={`${wordIndex}-${charIndex}`}
                          className={`${
                            detailedFeedback?.mistakes.some(mistake => 
                              mistake.includes(`"${char}"`) || mistake.includes(`Missing "${char}"`)
                            ) ? 'text-medium bg-medium/20 px-1 rounded' : ''
                          }`}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  ))}
                </p>
                <p className="text-lg text-dark-text-secondary">
                  {textTokens.map(t => t.text).join(' ')}
                </p>
              </div>
            </div>
          )}

          {stage === 'recall-memory' && (
            <div className="flex-1 flex flex-col justify-center">
              {/* Progressive word reveal with dynamic recognition */}
              <div className="text-center mb-6">
                <p className="text-3xl md:text-4xl font-arabic text-dark-text leading-loose mb-6" dir="rtl">
                  {/* Completely hidden - no text shown at all */}
                  <div className="invisible">
                    {ayahText.split(' ').map((word, index) => (
                      <span key={index} className="inline-block ml-2">
                        {word}
                      </span>
                    ))}
                  </div>
                </p>

                {/* Hyper-specific feedback */}
                {detailedFeedback && (
                  <div className="bg-dark-surface-hover border border-dark-border rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-semibold text-dark-text">Feedback:</h4>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-dark-text-secondary">
                          Word Accuracy: {(detailedFeedback.wordAccuracy * 100).toFixed(0)}%
                        </div>
                        {showAccuracyAnimation.show && (
                          <div className={`text-xs font-bold animate-pulse ${
                            showAccuracyAnimation.isPositive ? 'text-easy' : 'text-medium'
                          }`}>
                            {showAccuracyAnimation.isPositive ? '+' : '-'}{showAccuracyAnimation.change.toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Only show feedback for perfect or near-perfect attempts */}
                    {detailedFeedback.wordAccuracy >= 0.95 && detailedFeedback.mistakes.length === 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-easy text-center">
                          ✅ Perfect! You got it exactly right!
                        </div>
                      </div>
                    )}

                    {detailedFeedback.wordAccuracy >= 0.80 && detailedFeedback.wordAccuracy < 0.95 && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold text-easy text-center">
                          Great job! Just a few small mistakes.
                        </div>
                      </div>
                    )}

                    {/* Show mistakes - words they got wrong or said that aren't in ayah */}
                    {detailedFeedback.mistakes.length > 0 && (
                      <div className="mb-3">
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

                {/* No transcription or word counter display for Recall-Memory */}

                {/* Feedback message - side animation */}
                {showFeedback && (
                  <div className="fixed top-1/3 right-8 z-20 animate-slide-up">
                    <div className="px-3 py-2 rounded-lg border backdrop-blur-sm bg-dark-surface/80 border-dark-border">
                      <span className="text-sm text-dark-text-secondary">{feedbackMessage}</span>
                    </div>
                  </div>
                )}

                {/* Status indicators - FIXED at bottom of tile */}
                <div className="mt-8">
                  {/* Reserved space - always present */}
                  <div className="h-10 flex items-center justify-center">
                    {isReciting && (
                      <div className="inline-flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-4 py-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm text-dark-text-secondary">Recording your recitation...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar - shown for all learning stages */}
        {stage !== 'ayah-intro' && (
          <div className="mb-6">
            <div className="max-w-2xl mx-auto">
              <div className="h-3 bg-dark-surface-hover rounded-full overflow-hidden border border-dark-border">
                <div 
                  className="h-full bg-accent transition-all duration-500 ease-out"
                  style={{ width: `${stageProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-dark-text-muted">
                  Stage Progress
                </p>
                <p className="text-xs text-dark-text-secondary font-medium">
                  {Math.round(stageProgress)}%
                </p>
              </div>
              
              {/* Attempt Counter */}
              <div className="flex items-center justify-center gap-6 mt-3 text-xs">
                <div className="text-dark-text-muted">
                  Attempts: <span className="font-medium text-dark-text">{stageAttemptCount}</span>
                </div>
                <div className="text-dark-text-muted">
                  Successful: <span className="font-medium text-easy">{stageSuccessfulAttempts}</span>
                </div>
                <div className="text-dark-text-muted">
                  Success Rate: <span className="font-medium text-dark-text">
                    {stageAttemptCount > 0 ? Math.round((stageSuccessfulAttempts / stageAttemptCount) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connect-Ayahs Stage */}
        {stage === 'connect-ayahs' && (
          <div className="flex-1 flex flex-col justify-center">
            {connectMode === 'transitions' && (
              <TransitionPractice 
                ayahs={learnedAyahs}
                onComplete={handleTransitionComplete}
              />
            )}
            
            {connectMode === 'full-recitation' && (
              <FullRecitation
                ayahs={learnedAyahs}
                onComplete={handleConnectionComplete}
              />
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col items-center gap-4">
          {stage === 'ayah-intro' && (
            <button
              onClick={handleBeginLearning}
              className="btn-primary px-8 py-3"
            >
              Start Learning
            </button>
          )}

          {stage !== 'ayah-intro' && !audioPlaying && !isReciting && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-dark-surface-hover border border-dark-border rounded-xl">
                <kbd className="px-2 py-1 text-xs font-semibold text-dark-text bg-dark-bg border border-dark-border rounded">
                  SPACE
                </kbd>
                <span className="text-sm text-dark-text-secondary">
                  {stage === 'listen-shadow' && 'to play audio'}
                  {stage === 'read-recite' && (isReciting ? 'to stop recording' : 'to start reciting')}
                  {stage === 'recall-memory' && 'to recite from memory'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearnAyahView;

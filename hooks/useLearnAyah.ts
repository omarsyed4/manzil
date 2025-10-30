import { useState, useEffect, useRef, useCallback } from 'react';
import { getAudioUrl, getWordSegments, createAudioPlayer } from '../lib/recitationService';
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
import { useMicVad } from './useMicVad';

interface RecitationSegment {
  word: number;
  startMs: number;
  endMs: number;
}

interface UseLearnAyahProps {
  surah: number;
  ayah: number;
  textTokens: any[];
  baselineMsPerWord: number;
  hesitationThresholdMs: number;
  useSpeechRecognition: boolean;
}

export const useLearnAyah = ({
  surah,
  ayah,
  textTokens,
  baselineMsPerWord,
  hesitationThresholdMs,
  useSpeechRecognition
}: UseLearnAyahProps) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [wordSegments, setWordSegments] = useState<RecitationSegment[]>([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentWord, setCurrentWord] = useState<number>(-1);
  const [isReciting, setIsReciting] = useState(false);
  const [recognizedWords, setRecognizedWords] = useState<boolean[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [detailedFeedback, setDetailedFeedback] = useState<{
    feedback: string;
    mistakes: string[];
    suggestions: string[];
    correctWords: string[];
    wordAccuracy: number;
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionReadReciteRef = useRef<any>(null);
  const recognitionRecallRef = useRef<any>(null);
  const feedbackTimeout = useRef<NodeJS.Timeout | null>(null);

  const { vadState, startListening, stopListening } = useMicVad();

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
    } else {
      console.log('✓ [Speech Recognition] Supported and enabled');
    }
  }, [surah, ayah]);

  // Audio playback functions
  const playAudio = useCallback(async () => {
    if (!audioUrl || !wordSegments.length) return;

    try {
      setAudioPlaying(true);
      const audioPlayer = createAudioPlayer(audioUrl, {
        speed: playbackSpeed,
        onTimeUpdate: (currentTime: number) => {
          const currentSegment = wordSegments.find(
            segment => currentTime >= segment.startMs && currentTime <= segment.endMs
          );
          if (currentSegment) {
            setCurrentWord(currentSegment.word);
          }
        },
        onEnded: () => {
          setAudioPlaying(false);
          setCurrentWord(-1);
        }
      });

      audioRef.current = audioPlayer;
      await audioPlayer.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioPlaying(false);
    }
  }, [audioUrl, wordSegments, playbackSpeed]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioPlaying(false);
      setCurrentWord(-1);
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  // Speech recognition functions
  const startSpeechRecognition = useCallback((type: 'listen-shadow' | 'read-recite' | 'recall-memory') => {
    if (!useSpeechRecognition || !isSpeechRecognitionSupported()) return;

    const recognition = type === 'read-recite' || type === 'recall-memory' 
      ? createContinuousSpeechRecognition()
      : createSpeechRecognition();

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const normalizedTranscript = normalizeArabicText(transcript);
      setCurrentTranscript(normalizedTranscript);

      if (type === 'listen-shadow') {
        handleListenShadowResult(normalizedTranscript);
      } else if (type === 'read-recite') {
        handleReadReciteResult(normalizedTranscript);
      } else if (type === 'recall-memory') {
        handleRecallMemoryResult(normalizedTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.start();
    
    if (type === 'read-recite') {
      recognitionReadReciteRef.current = recognition;
    } else if (type === 'recall-memory') {
      recognitionRecallRef.current = recognition;
    } else {
      recognitionRef.current = recognition;
    }
  }, [useSpeechRecognition, textTokens, baselineMsPerWord, hesitationThresholdMs]);

  const stopSpeechRecognition = useCallback((type: 'listen-shadow' | 'read-recite' | 'recall-memory') => {
    const recognition = type === 'read-recite' 
      ? recognitionReadReciteRef.current
      : type === 'recall-memory'
      ? recognitionRecallRef.current
      : recognitionRef.current;

    if (recognition) {
      recognition.stop();
    }
  }, []);

  // Result handlers
  const handleListenShadowResult = useCallback((transcript: string) => {
    const feedback = generateListenShadowFeedback(transcript, textTokens);
    setFeedbackMessage(feedback);
    setShowFeedback(true);
  }, [textTokens]);

  const handleReadReciteResult = useCallback((transcript: string) => {
    const { wordAccuracy, letterAccuracy, quality } = checkWordsSpoken(
      transcript, 
      textTokens, 
      baselineMsPerWord, 
      hesitationThresholdMs
    );

    const similarity = getQualityFromSimilarity(quality);
    const feedback = generateHyperSpecificFeedback(transcript, textTokens, quality);
    
    setDetailedFeedback({
      feedback: feedback.feedback,
      mistakes: feedback.mistakes,
      suggestions: feedback.suggestions,
      correctWords: feedback.correctWords,
      wordAccuracy
    });

    setRecognizedWords(Array(textTokens.length).fill(false).map((_, i) => i < Math.floor(wordAccuracy * textTokens.length)));
    setFeedbackMessage(feedback.feedback);
    setShowFeedback(true);
  }, [textTokens, baselineMsPerWord, hesitationThresholdMs]);

  const handleRecallMemoryResult = useCallback((transcript: string) => {
    const { wordAccuracy, letterAccuracy, quality } = checkWordsSpoken(
      transcript, 
      textTokens, 
      baselineMsPerWord, 
      hesitationThresholdMs
    );

    const similarity = getQualityFromSimilarity(quality);
    const feedback = generateHyperSpecificFeedback(transcript, textTokens, quality);
    
    setDetailedFeedback({
      feedback: feedback.feedback,
      mistakes: feedback.mistakes,
      suggestions: feedback.suggestions,
      correctWords: feedback.correctWords,
      wordAccuracy
    });

    setRecognizedWords(Array(textTokens.length).fill(false).map((_, i) => i < Math.floor(wordAccuracy * textTokens.length)));
    setFeedbackMessage(feedback.feedback);
    setShowFeedback(true);
  }, [textTokens, baselineMsPerWord, hesitationThresholdMs]);

  // Feedback display
  const displayFeedback = useCallback((message: string, timeoutMs: number = 4000) => {
    setFeedbackMessage(message);
    setShowFeedback(true);
    
    if (feedbackTimeout.current) {
      clearTimeout(feedbackTimeout.current);
    }
    
    feedbackTimeout.current = setTimeout(() => {
      setShowFeedback(false);
      setFeedbackMessage('');
    }, timeoutMs);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (feedbackTimeout.current) {
        clearTimeout(feedbackTimeout.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (recognitionReadReciteRef.current) {
        recognitionReadReciteRef.current.stop();
      }
      if (recognitionRecallRef.current) {
        recognitionRecallRef.current.stop();
      }
    };
  }, []);

  return {
    // Audio state
    audioUrl,
    wordSegments,
    audioPlaying,
    playbackSpeed,
    currentWord,
    
    // Audio controls
    playAudio,
    stopAudio,
    setSpeed,
    
    // Speech recognition state
    isReciting,
    recognizedWords,
    currentTranscript,
    feedbackMessage,
    showFeedback,
    detailedFeedback,
    
    // Speech recognition controls
    startSpeechRecognition,
    stopSpeechRecognition,
    displayFeedback,
    
    // VAD
    vadState,
    startListening,
    stopListening
  };
};

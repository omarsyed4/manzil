import { useState, useCallback, useRef, useEffect } from 'react';
import { ReciteController, AlignmentTrace, WordTrace, MistakeLog, TextToken, Profile } from '../types';
import { useMicVad } from '../hooks/useMicVad';

interface ReciteOverlayConfig {
  profile: Profile;
  textTokens: TextToken[];
  onComplete: (trace: AlignmentTrace, mistakes: MistakeLog[]) => void;
}

export const useReciteOverlay = (config: ReciteOverlayConfig) => {
  const { profile, textTokens, onComplete } = config;
  
  const [revealIndex, setRevealIndex] = useState(-1);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [currentWordStart, setCurrentWordStart] = useState<number | undefined>();
  
  const wordTracesRef = useRef<WordTrace[]>([]);
  const mistakesRef = useRef<MistakeLog[]>([]);
  const lastVoicedBlockEndRef = useRef<number>(0);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const expectedEndTimeRef = useRef<number>(0);

  const vadConfig = {
    voiceOnsetMinMs: profile.voiceOnsetMinMs,
    silenceThresholdMs: profile.hesitationThresholdMs,
    noiseGateThreshold: 0.01,
    debounceMs: 50,
  };

  const { vadState, startListening, stopListening, clearSegments, getCurrentSegmentDuration, getSilenceDuration } = useMicVad(vadConfig);

  const calculateExpectedEndTime = useCallback(() => {
    const totalDuration = textTokens.reduce((sum, token) => sum + token.expectedDuration, 0);
    return startTime + totalDuration;
  }, [textTokens, startTime]);

  const startRecitation = useCallback(async () => {
    try {
      await startListening();
      setIsActive(true);
      setStartTime(Date.now());
      setRevealIndex(-1);
      wordTracesRef.current = [];
      mistakesRef.current = [];
      lastVoicedBlockEndRef.current = 0;
      expectedEndTimeRef.current = calculateExpectedEndTime();
      
      // Clear any existing silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      
    } catch (error) {
      console.error('Failed to start recitation:', error);
      throw error;
    }
  }, [startListening, calculateExpectedEndTime]);

  const stopRecitation = useCallback(() => {
    stopListening();
    setIsActive(false);
    
    // Build final trace
    const trace: AlignmentTrace = {
      words: wordTracesRef.current,
      boundary: {
        transitionPauseHigh: getSilenceDuration() > profile.hesitationThresholdMs,
        hintUsed: false, // TODO: Implement hint system
      },
    };
    
    onComplete(trace, mistakesRef.current);
  }, [stopListening, getSilenceDuration, profile.hesitationThresholdMs, onComplete]);

  const handleVoicedBlockStart = useCallback((timestamp: number) => {
    if (!isActive) return;
    
    const timeSinceStart = timestamp - startTime;
    
    // Calculate which word should be revealed based on timing
    let targetWordIndex = -1;
    let cumulativeTime = 0;
    
    for (let i = 0; i < textTokens.length; i++) {
      cumulativeTime += textTokens[i].expectedDuration;
      if (timeSinceStart <= cumulativeTime) {
        targetWordIndex = i;
        break;
      }
    }
    
    // Reveal the next unrevealed word
    if (targetWordIndex >= 0 && targetWordIndex > revealIndex) {
      setRevealIndex(targetWordIndex);
      setCurrentWordStart(timestamp);
      
      // Start tracking this word
      const wordTrace: WordTrace = {
        w: targetWordIndex,
        tStart: timestamp - startTime,
        tEnd: timestamp - startTime, // Will be updated when block ends
        matched: true, // Assume match for now
        latencyToWord: targetWordIndex === 0 ? timeSinceStart : timestamp - lastVoicedBlockEndRef.current,
        interPausePrev: targetWordIndex === 0 ? 0 : timestamp - lastVoicedBlockEndRef.current,
      };
      
      wordTracesRef.current.push(wordTrace);
    }
    
    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, [isActive, startTime, textTokens, revealIndex]);

  const handleVoicedBlockEnd = useCallback((timestamp: number) => {
    if (!isActive) return;
    
    lastVoicedBlockEndRef.current = timestamp;
    setCurrentWordStart(undefined);
    
    // Update the last word trace
    if (wordTracesRef.current.length > 0) {
      const lastTrace = wordTracesRef.current[wordTracesRef.current.length - 1];
      lastTrace.tEnd = timestamp - startTime;
    }
    
    // Set up silence timeout
    silenceTimeoutRef.current = setTimeout(() => {
      if (isActive) {
        // Check if we should end the recitation
        const silenceDuration = getSilenceDuration();
        if (silenceDuration > 1200) { // 1.2 seconds of silence
          stopRecitation();
        }
      }
    }, 1200);
  }, [isActive, startTime, getSilenceDuration, stopRecitation]);

  // Handle VAD state changes
  useEffect(() => {
    if (!isActive) return;
    
    if (vadState.isVoiceDetected && vadState.currentSegment) {
      handleVoicedBlockStart(vadState.currentSegment.start);
    } else if (!vadState.isVoiceDetected && vadState.segments.length > 0) {
      const lastSegment = vadState.segments[vadState.segments.length - 1];
      handleVoicedBlockEnd(lastSegment.end);
    }
  }, [vadState.isVoiceDetected, vadState.currentSegment, vadState.segments, isActive, handleVoicedBlockStart, handleVoicedBlockEnd]);

  // Auto-advance logic for rapid speakers
  useEffect(() => {
    if (!isActive || !currentWordStart) return;
    
    const currentWord = textTokens[revealIndex];
    if (!currentWord) return;
    
    const segmentDuration = getCurrentSegmentDuration();
    const expectedDuration = currentWord.expectedDuration;
    
    // If current segment is longer than expected and we have more words to reveal
    if (segmentDuration > expectedDuration && revealIndex < textTokens.length - 1) {
      const nextWordIndex = revealIndex + 1;
      const timeForNextWord = currentWordStart + expectedDuration;
      
      // Only advance if enough time has passed
      if (Date.now() >= timeForNextWord + profile.voiceOnsetMinMs) {
        setRevealIndex(nextWordIndex);
        
        // Add trace for the additional word
        const wordTrace: WordTrace = {
          w: nextWordIndex,
          tStart: timeForNextWord - startTime,
          tEnd: timeForNextWord - startTime,
          matched: true,
          latencyToWord: profile.voiceOnsetMinMs,
          interPausePrev: 0,
        };
        
        wordTracesRef.current.push(wordTrace);
      }
    }
  }, [isActive, currentWordStart, revealIndex, textTokens, getCurrentSegmentDuration, profile.voiceOnsetMinMs, startTime]);

  // Check for completion
  useEffect(() => {
    if (isActive && revealIndex >= textTokens.length - 1) {
      // All words revealed, end after a short delay
      setTimeout(() => {
        if (isActive) {
          stopRecitation();
        }
      }, 500);
    }
  }, [isActive, revealIndex, textTokens.length, stopRecitation]);

  const controller: ReciteController = {
    revealIndex,
    isActive,
    startTime,
    currentWordStart,
    onVoicedBlockStart: handleVoicedBlockStart,
    onVoicedBlockEnd: handleVoicedBlockEnd,
    onAttemptComplete: onComplete,
  };

  return {
    controller,
    startRecitation,
    stopRecitation,
    vadState,
    isComplete: revealIndex >= textTokens.length - 1,
  };
};

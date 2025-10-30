import { useState, useEffect, useRef, useCallback } from 'react';
import { VADState, VADSegment } from '../types';

interface VADConfig {
  voiceOnsetMinMs: number;
  silenceThresholdMs: number;
  noiseGateThreshold: number;
  debounceMs: number;
}

const DEFAULT_CONFIG: VADConfig = {
  voiceOnsetMinMs: 120,
  silenceThresholdMs: 450,
  noiseGateThreshold: 0.01,
  debounceMs: 50,
};

export const useMicVad = (config: Partial<VADConfig> = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [vadState, setVadState] = useState<VADState>({
    isListening: false,
    isVoiceDetected: false,
    segments: [],
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVoiceTimeRef = useRef<number>(0);
  const currentSegmentRef = useRef<VADSegment | null>(null);
  const silenceStartRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate RMS (Root Mean Square) for voice activity detection
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength) / 255; // Normalize to 0-1

    const now = Date.now();
    const isVoiceDetected = rms > mergedConfig.noiseGateThreshold;

    setVadState(prevState => {
      const newState = { ...prevState };

      if (isVoiceDetected && !prevState.isVoiceDetected) {
        // Voice onset detected
        lastVoiceTimeRef.current = now;
        
        if (!currentSegmentRef.current) {
          currentSegmentRef.current = {
            start: now,
            end: now,
            confidence: rms,
          };
        }
        
        newState.isVoiceDetected = true;
        newState.currentSegment = currentSegmentRef.current;
      } else if (!isVoiceDetected && prevState.isVoiceDetected) {
        // Voice offset detected
        if (currentSegmentRef.current) {
          currentSegmentRef.current.end = now;
          
          // Only add segment if it meets minimum duration
          const duration = currentSegmentRef.current.end - currentSegmentRef.current.start;
          if (duration >= mergedConfig.voiceOnsetMinMs) {
            newState.segments = [...prevState.segments, currentSegmentRef.current];
          }
          
          currentSegmentRef.current = null;
        }
        
        newState.isVoiceDetected = false;
        newState.currentSegment = undefined;
        silenceStartRef.current = now;
      } else if (isVoiceDetected && prevState.isVoiceDetected) {
        // Continue voice detection
        lastVoiceTimeRef.current = now;
        if (currentSegmentRef.current) {
          currentSegmentRef.current.end = now;
          currentSegmentRef.current.confidence = Math.max(currentSegmentRef.current.confidence, rms);
          newState.currentSegment = currentSegmentRef.current;
        }
      } else if (!isVoiceDetected && !prevState.isVoiceDetected) {
        // Continue silence
        const silenceDuration = now - silenceStartRef.current;
        if (silenceDuration > mergedConfig.silenceThresholdMs) {
          // Long silence detected - could trigger end of recitation
          // This will be handled by the parent component
        }
      }

      return newState;
    });

    if (vadState.isListening) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  }, [mergedConfig, vadState.isListening]);

  const startListening = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create analyser node
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;

      // Create microphone source
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);

      setVadState(prevState => ({
        ...prevState,
        isListening: true,
        segments: [],
        isVoiceDetected: false,
      }));

      // Start analysis loop
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }, [analyzeAudio]);

  const stopListening = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear refs
    analyserRef.current = null;
    microphoneRef.current = null;
    currentSegmentRef.current = null;

    setVadState(prevState => ({
      ...prevState,
      isListening: false,
      isVoiceDetected: false,
      currentSegment: undefined,
    }));
  }, []);

  const clearSegments = useCallback(() => {
    setVadState(prevState => ({
      ...prevState,
      segments: [],
    }));
  }, []);

  const getCurrentSegmentDuration = useCallback(() => {
    if (!currentSegmentRef.current) return 0;
    return Date.now() - currentSegmentRef.current.start;
  }, []);

  const getSilenceDuration = useCallback(() => {
    if (vadState.isVoiceDetected) return 0;
    return Date.now() - silenceStartRef.current;
  }, [vadState.isVoiceDetected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [stopListening]);

  return {
    vadState,
    startListening,
    stopListening,
    clearSegments,
    getCurrentSegmentDuration,
    getSilenceDuration,
    isSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  };
};

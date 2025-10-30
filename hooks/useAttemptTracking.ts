import { useState, useCallback } from 'react';

interface UseAttemptTrackingProps {
  requiredRepetitions?: number;
}

export const useAttemptTracking = ({ requiredRepetitions = 3 }: UseAttemptTrackingProps = {}) => {
  const [attemptCount, setAttemptCount] = useState(0);
  const [successfulAttempts, setSuccessfulAttempts] = useState(0);
  const [stageAttemptCount, setStageAttemptCount] = useState(0);
  const [stageSuccessfulAttempts, setStageSuccessfulAttempts] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);
  const [perfectAttempts, setPerfectAttempts] = useState(0);
  const [consecutivePerfectAttempts, setConsecutivePerfectAttempts] = useState(0);
  const [previousWordAccuracy, setPreviousWordAccuracy] = useState<number>(0);

  const recordAttempt = useCallback((isSuccessful: boolean, wordAccuracy: number = 0) => {
    setAttemptCount(prev => prev + 1);
    setStageAttemptCount(prev => prev + 1);

    if (isSuccessful) {
      setSuccessfulAttempts(prev => prev + 1);
      setStageSuccessfulAttempts(prev => prev + 1);
      
      if (wordAccuracy >= 0.95) {
        setPerfectAttempts(prev => prev + 1);
        setConsecutivePerfectAttempts(prev => prev + 1);
      } else {
        setConsecutivePerfectAttempts(0);
      }
    } else {
      setConsecutivePerfectAttempts(0);
    }

    // Update stage progress
    const newProgress = Math.min(100, (stageSuccessfulAttempts + (isSuccessful ? 1 : 0)) / requiredRepetitions * 100);
    setStageProgress(newProgress);

    setPreviousWordAccuracy(wordAccuracy);
  }, [stageSuccessfulAttempts, requiredRepetitions]);

  const resetStage = useCallback(() => {
    setStageAttemptCount(0);
    setStageSuccessfulAttempts(0);
    setStageProgress(0);
    setConsecutivePerfectAttempts(0);
  }, []);

  const resetAll = useCallback(() => {
    setAttemptCount(0);
    setSuccessfulAttempts(0);
    setStageAttemptCount(0);
    setStageSuccessfulAttempts(0);
    setStageProgress(0);
    setPerfectAttempts(0);
    setConsecutivePerfectAttempts(0);
    setPreviousWordAccuracy(0);
  }, []);

  const isStageComplete = stageSuccessfulAttempts >= requiredRepetitions;
  const successRate = stageAttemptCount > 0 ? (stageSuccessfulAttempts / stageAttemptCount) * 100 : 0;

  return {
    // Counts
    attemptCount,
    successfulAttempts,
    stageAttemptCount,
    stageSuccessfulAttempts,
    perfectAttempts,
    consecutivePerfectAttempts,
    previousWordAccuracy,
    
    // Progress
    stageProgress,
    isStageComplete,
    successRate,
    
    // Actions
    recordAttempt,
    resetStage,
    resetAll
  };
};

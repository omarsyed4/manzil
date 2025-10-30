import React, { useState, useEffect, useCallback } from 'react';
import { TextToken, LearnStage, ConnectMode, LearnedAyah } from '../../types';
import { useLearnAyah } from '../../hooks/useLearnAyah';
import { useAttemptTracking } from '../../hooks/useAttemptTracking';
import { getRandomEncouragement } from '../../lib/learnHelpers';

// Stage components
import AyahIntroStage from './stages/AyahIntroStage';
import ListenShadowStage from './stages/ListenShadowStage';
import ReadReciteStage from './stages/ReadReciteStage';
import RecallMemoryStage from './stages/RecallMemoryStage';

// Practice components
import TransitionPractice from '../practice/TransitionPractice';
import FullRecitation from '../recitation/FullRecitation';

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
  const [revealedWords, setRevealedWords] = useState<number>(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [useSpeechRecognition, setUseSpeechRecognition] = useState(true);
  const [showStrugglingWarning, setShowStrugglingWarning] = useState(false);
  const [showAccuracyAnimation, setShowAccuracyAnimation] = useState<{
    show: boolean;
    change: number;
    isPositive: boolean;
  }>({ show: false, change: 0, isPositive: false });

  // Custom hooks
  const {
    audioUrl,
    wordSegments,
    audioPlaying,
    playbackSpeed,
    currentWord,
    isReciting,
    recognizedWords,
    currentTranscript,
    feedbackMessage,
    showFeedback,
    detailedFeedback,
    playAudio,
    stopAudio,
    setSpeed,
    startSpeechRecognition,
    stopSpeechRecognition,
    displayFeedback,
    vadState,
    startListening,
    stopListening
  } = useLearnAyah({
    surah,
    ayah,
    textTokens,
    baselineMsPerWord,
    hesitationThresholdMs,
    useSpeechRecognition
  });

  const {
    attemptCount,
    successfulAttempts,
    stageAttemptCount,
    stageSuccessfulAttempts,
    stageProgress,
    isStageComplete,
    successRate,
    recordAttempt,
    resetStage,
    resetAll
  } = useAttemptTracking({ requiredRepetitions: 3 });

  // Stage progression logic
  const handleStageComplete = useCallback(() => {
    if (stage === 'ayah-intro') {
      setStage('listen-shadow');
    } else if (stage === 'listen-shadow') {
      setStage('read-recite');
      resetStage();
    } else if (stage === 'read-recite') {
      setStage('recall-memory');
      resetStage();
    } else if (stage === 'recall-memory') {
      // Ayah is mastered
      const masteredAyah: LearnedAyah = {
        surah,
        ayah,
        text: ayahText,
        masteredAt: new Date(),
        attempts: [] // TODO: Collect actual attempts
      };
      
      setLearnedAyahs(prev => [...prev, masteredAyah]);
      onAyahMastered([]);
      
      // Move to next ayah or connect mode
      if (currentAyahIndex + 1 < totalAyahs) {
        // Next ayah - this should be handled by parent
        setStage('ayah-intro');
        resetAll();
      } else {
        // All ayahs learned, move to connect mode
        setStage('connect-ayahs');
      }
    }
  }, [stage, surah, ayah, ayahText, currentAyahIndex, totalAyahs, onAyahMastered, resetStage, resetAll]);

  // Handle stage transitions
  const handleNext = useCallback(() => {
    if (isStageComplete) {
      handleStageComplete();
    }
  }, [isStageComplete, handleStageComplete]);

  // Speech recognition handlers
  const handleStartReciting = useCallback(() => {
    if (stage === 'read-recite') {
      startSpeechRecognition('read-recite');
    } else if (stage === 'recall-memory') {
      startSpeechRecognition('recall-memory');
    }
    setIsReciting(true);
  }, [stage, startSpeechRecognition]);

  const handleStopReciting = useCallback(() => {
    if (stage === 'read-recite') {
      stopSpeechRecognition('read-recite');
    } else if (stage === 'recall-memory') {
      stopSpeechRecognition('recall-memory');
    }
    setIsReciting(false);
  }, [stage, stopSpeechRecognition]);

  // Handle speech recognition results
  useEffect(() => {
    if (detailedFeedback && (stage === 'read-recite' || stage === 'recall-memory')) {
      const isSuccessful = detailedFeedback.wordAccuracy >= 0.6;
      recordAttempt(isSuccessful, detailedFeedback.wordAccuracy);
      
      if (isSuccessful) {
        displayFeedback(detailedFeedback.feedback, 3000);
      } else {
        displayFeedback(detailedFeedback.feedback, 5000);
      }
    }
  }, [detailedFeedback, stage, recordAttempt, displayFeedback]);

  // Handle struggling warning
  useEffect(() => {
    setShowStrugglingWarning(stageAttemptCount >= 5 && stageSuccessfulAttempts === 0);
  }, [stageAttemptCount, stageSuccessfulAttempts]);

  // Handle connect mode completion
  const handleConnectComplete = useCallback(() => {
    // All learning complete
    onNeedsExtraPractice([]);
  }, [onNeedsExtraPractice]);

  // Render stage components
  const renderStage = () => {
    switch (stage) {
      case 'ayah-intro':
        return (
          <AyahIntroStage
            surah={surah}
            ayah={ayah}
            ayahText={ayahText}
            textTokens={textTokens}
            currentAyahIndex={currentAyahIndex}
            totalAyahs={totalAyahs}
            onStartLearning={() => setStage('listen-shadow')}
          />
        );

      case 'listen-shadow':
        return (
          <ListenShadowStage
            surah={surah}
            ayah={ayah}
            ayahText={ayahText}
            textTokens={textTokens}
            currentAyahIndex={currentAyahIndex}
            totalAyahs={totalAyahs}
            showTransliteration={showTransliteration}
            onToggleTransliteration={() => setShowTransliteration(!showTransliteration)}
            audioPlaying={audioPlaying}
            currentWord={currentWord}
            playbackSpeed={playbackSpeed}
            onPlay={playAudio}
            onStop={stopAudio}
            onSpeedChange={setSpeed}
            onNext={handleNext}
          />
        );

      case 'read-recite':
        return (
          <ReadReciteStage
            surah={surah}
            ayah={ayah}
            ayahText={ayahText}
            textTokens={textTokens}
            currentAyahIndex={currentAyahIndex}
            totalAyahs={totalAyahs}
            showTransliteration={showTransliteration}
            onToggleTransliteration={() => setShowTransliteration(!showTransliteration)}
            audioPlaying={audioPlaying}
            playbackSpeed={playbackSpeed}
            onPlay={playAudio}
            onStop={stopAudio}
            onSpeedChange={setSpeed}
            isReciting={isReciting}
            recognizedWords={recognizedWords}
            currentTranscript={currentTranscript}
            feedbackMessage={feedbackMessage}
            showFeedback={showFeedback}
            detailedFeedback={detailedFeedback}
            stageProgress={stageProgress}
            stageAttemptCount={stageAttemptCount}
            stageSuccessfulAttempts={stageSuccessfulAttempts}
            onStartReciting={handleStartReciting}
            onStopReciting={handleStopReciting}
            onNext={handleNext}
            onShowFeedback={setShowFeedback}
          />
        );

      case 'recall-memory':
        return (
          <RecallMemoryStage
            surah={surah}
            ayah={ayah}
            ayahText={ayahText}
            textTokens={textTokens}
            currentAyahIndex={currentAyahIndex}
            totalAyahs={totalAyahs}
            showTransliteration={showTransliteration}
            onToggleTransliteration={() => setShowTransliteration(!showTransliteration)}
            audioPlaying={audioPlaying}
            playbackSpeed={playbackSpeed}
            onPlay={playAudio}
            onStop={stopAudio}
            onSpeedChange={setSpeed}
            isReciting={isReciting}
            recognizedWords={recognizedWords}
            currentTranscript={currentTranscript}
            feedbackMessage={feedbackMessage}
            showFeedback={showFeedback}
            detailedFeedback={detailedFeedback}
            stageProgress={stageProgress}
            stageAttemptCount={stageAttemptCount}
            stageSuccessfulAttempts={stageSuccessfulAttempts}
            revealedWords={revealedWords}
            onStartReciting={handleStartReciting}
            onStopReciting={handleStopReciting}
            onNext={handleNext}
            onShowFeedback={setShowFeedback}
          />
        );

      case 'connect-ayahs':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-dark-text mb-4">Connect Āyāt</h2>
              <p className="text-dark-text-secondary">
                Practice smooth transitions between consecutive āyāt
              </p>
            </div>
            <TransitionPractice
              ayahs={learnedAyahs}
              onComplete={handleConnectComplete}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      {renderStage()}
    </div>
  );
};

export default LearnAyahView;

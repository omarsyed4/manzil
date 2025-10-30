import React, { useState, useEffect } from 'react';
import StageHeader from '../shared/StageHeader';
import AudioControls from '../shared/AudioControls';
import ProgressBar from '../shared/ProgressBar';
import FeedbackDisplay from '../shared/FeedbackDisplay';
import { getRandomEncouragement } from '../../../lib/learnHelpers';

interface ReadReciteStageProps {
  surah: number;
  ayah: number;
  ayahText: string;
  textTokens: any[];
  currentAyahIndex: number;
  totalAyahs: number;
  showTransliteration: boolean;
  onToggleTransliteration: () => void;
  audioPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  isReciting: boolean;
  recognizedWords: boolean[];
  currentTranscript: string;
  feedbackMessage: string;
  showFeedback: boolean;
  detailedFeedback: any;
  stageProgress: number;
  stageAttemptCount: number;
  stageSuccessfulAttempts: number;
  onStartReciting: () => void;
  onStopReciting: () => void;
  onNext: () => void;
  onShowFeedback: (show: boolean) => void;
}

const ReadReciteStage: React.FC<ReadReciteStageProps> = ({
  surah,
  ayah,
  ayahText,
  textTokens,
  currentAyahIndex,
  totalAyahs,
  showTransliteration,
  onToggleTransliteration,
  audioPlaying,
  playbackSpeed,
  onPlay,
  onStop,
  onSpeedChange,
  isReciting,
  recognizedWords,
  currentTranscript,
  feedbackMessage,
  showFeedback,
  detailedFeedback,
  stageProgress,
  stageAttemptCount,
  stageSuccessfulAttempts,
  onStartReciting,
  onStopReciting,
  onNext,
  onShowFeedback
}) => {
  const [isWaitingForSpace, setIsWaitingForSpace] = useState(true);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState('');

  // Handle spacebar for recitation control
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (isWaitingForSpace) {
          setIsWaitingForSpace(false);
          onStartReciting();
        } else if (isReciting) {
          onStopReciting();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isWaitingForSpace, isReciting, onStartReciting, onStopReciting]);

  // Show encouragement when stage is complete
  useEffect(() => {
    if (stageProgress >= 100) {
      setShowEncouragement(true);
      setEncouragementMessage(getRandomEncouragement());
      setTimeout(() => setShowEncouragement(false), 3000);
    }
  }, [stageProgress]);

  return (
    <div className="max-w-4xl mx-auto">
      <StageHeader
        stage="read-recite"
        surah={surah}
        ayah={ayah}
        currentAyahIndex={currentAyahIndex}
        totalAyahs={totalAyahs}
        showTransliteration={showTransliteration}
        onToggleTransliteration={onToggleTransliteration}
      />

      <div className="bg-dark-surface border border-dark-border rounded-2xl p-8">
        {/* Audio controls */}
        <AudioControls
          audioPlaying={audioPlaying}
          playbackSpeed={playbackSpeed}
          onPlay={onPlay}
          onStop={onStop}
          onSpeedChange={onSpeedChange}
        />

        {/* Ayah text with recognition highlighting */}
        <div className="mb-8">
          <p className="text-3xl font-arabic text-dark-text leading-relaxed text-center">
            {textTokens.map((token, index) => (
              <span
                key={index}
                className={`transition-colors duration-200 ${
                  recognizedWords[index]
                    ? 'text-easy bg-easy/10 rounded px-1'
                    : 'text-dark-text'
                }`}
              >
                {token.text}
                {index < textTokens.length - 1 && ' '}
              </span>
            ))}
          </p>

          {/* Transliteration */}
          {showTransliteration && (
            <p className="text-lg text-dark-text-secondary text-center mt-4 leading-relaxed">
              {textTokens.map((token, index) => (
                <span key={index}>
                  {token.transliteration}
                  {index < textTokens.length - 1 && ' '}
                </span>
              ))}
            </p>
          )}
        </div>

        {/* Current transcript */}
        {currentTranscript && (
          <div className="bg-dark-bg border border-dark-border rounded-xl p-4 mb-6">
            <p className="text-sm text-dark-text-secondary mb-1">You said:</p>
            <p className="text-dark-text font-arabic text-lg">{currentTranscript}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="text-center mb-6">
          <p className="text-dark-text-secondary mb-4">
            Recite while looking at the Arabic text until you master it without hesitation
          </p>
          
          {isWaitingForSpace ? (
            <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
              <p className="text-dark-text mb-2">Press <kbd className="px-2 py-1 bg-dark-surface rounded text-sm">Space</kbd> to start reciting</p>
            </div>
          ) : isReciting ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 font-medium">Recording... Press <kbd className="px-2 py-1 bg-red-500/20 rounded text-sm">Space</kbd> to stop</p>
            </div>
          ) : (
            <div className="bg-easy/10 border border-easy/20 rounded-xl p-4">
              <p className="text-easy font-medium">Press <kbd className="px-2 py-1 bg-easy/20 rounded text-sm">Space</kbd> to try again</p>
            </div>
          )}
        </div>

        {/* Encouragement message */}
        {showEncouragement && (
          <div className="text-center mb-4">
            <div className="inline-block bg-easy/10 border border-easy/20 rounded-xl px-4 py-2">
              <p className="text-easy font-medium">{encouragementMessage}</p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <ProgressBar
          stageProgress={stageProgress}
          stageAttemptCount={stageAttemptCount}
          stageSuccessfulAttempts={stageSuccessfulAttempts}
        />

        {/* Next button */}
        {stageProgress >= 100 && (
          <div className="text-center">
            <button
              onClick={onNext}
              className="btn-primary px-8 py-3"
            >
              Continue to Recall from Memory
            </button>
          </div>
        )}

        {/* Feedback display */}
        <FeedbackDisplay
          showFeedback={showFeedback}
          feedbackMessage={feedbackMessage}
          detailedFeedback={detailedFeedback}
          onClose={() => onShowFeedback(false)}
        />
      </div>
    </div>
  );
};

export default ReadReciteStage;

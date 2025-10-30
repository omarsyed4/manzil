import React, { useState, useEffect } from 'react';
import StageHeader from '../shared/StageHeader';
import AudioControls from '../shared/AudioControls';
import { getRandomEncouragement } from '../../../lib/learnHelpers';

interface ListenShadowStageProps {
  surah: number;
  ayah: number;
  ayahText: string;
  textTokens: any[];
  currentAyahIndex: number;
  totalAyahs: number;
  showTransliteration: boolean;
  onToggleTransliteration: () => void;
  audioPlaying: boolean;
  currentWord: number;
  playbackSpeed: number;
  onPlay: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onNext: () => void;
}

const ListenShadowStage: React.FC<ListenShadowStageProps> = ({
  surah,
  ayah,
  ayahText,
  textTokens,
  currentAyahIndex,
  totalAyahs,
  showTransliteration,
  onToggleTransliteration,
  audioPlaying,
  currentWord,
  playbackSpeed,
  onPlay,
  onStop,
  onSpeedChange,
  onNext
}) => {
  const [isReady, setIsReady] = useState(false);
  const [showEncouragement, setShowEncouragement] = useState(false);
  const [encouragementMessage, setEncouragementMessage] = useState('');

  // Handle spacebar for ready state
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !audioPlaying) {
        event.preventDefault();
        if (isReady) {
          onNext();
        } else {
          setIsReady(true);
          setShowEncouragement(true);
          setEncouragementMessage(getRandomEncouragement());
          setTimeout(() => setShowEncouragement(false), 3000);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isReady, audioPlaying, onNext]);

  return (
    <div className="max-w-4xl mx-auto">
      <StageHeader
        stage="listen-shadow"
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

        {/* Ayah text with word highlighting */}
        <div className="mb-8">
          <p className="text-3xl font-arabic text-dark-text leading-relaxed text-center">
            {textTokens.map((token, index) => (
              <span
                key={index}
                className={`transition-colors duration-200 ${
                  currentWord === index
                    ? 'text-accent bg-accent/10 rounded px-1'
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

        {/* Instructions */}
        <div className="text-center mb-6">
          <p className="text-dark-text-secondary mb-4">
            Listen to the recitation and repeat along until you feel comfortable
          </p>
          
          {!isReady ? (
            <div className="bg-dark-bg border border-dark-border rounded-xl p-4">
              <p className="text-dark-text mb-2">Press <kbd className="px-2 py-1 bg-dark-surface rounded text-sm">Space</kbd> when ready to continue</p>
            </div>
          ) : (
            <div className="bg-easy/10 border border-easy/20 rounded-xl p-4">
              <p className="text-easy font-medium">Ready! Press <kbd className="px-2 py-1 bg-easy/20 rounded text-sm">Space</kbd> to continue</p>
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

        {/* Next button */}
        <div className="text-center">
          <button
            onClick={onNext}
            disabled={!isReady}
            className={`px-8 py-3 rounded-xl font-medium transition-colors ${
              isReady
                ? 'bg-accent text-dark-text hover:bg-accent/80'
                : 'bg-dark-surface text-dark-text-muted cursor-not-allowed'
            }`}
          >
            Continue to Read & Recite
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListenShadowStage;

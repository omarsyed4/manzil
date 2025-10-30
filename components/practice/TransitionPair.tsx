import React from 'react';

interface TransitionPairProps {
  fromAyah: {
    surahId: number;
    ayahNumber: number;
  };
  toAyah: {
    surahId: number;
    ayahNumber: number;
  };
  fromEnding: string;
  toBeginning: string;
  completed: boolean;
  perfectAttempts: number;
  isPlayingAudio: boolean;
  isReciting: boolean;
  isWaitingForSpace: boolean;
  feedback: string;
  showFeedback: boolean;
  detailedFeedback: {
    feedback: string;
    mistakes: string[];
    wordAccuracy: number;
  } | null;
  onPlayAudio: () => void;
  onSpacebar: () => void;
  onCloseFeedback: () => void;
}

const TransitionPair: React.FC<TransitionPairProps> = ({
  fromAyah,
  toAyah,
  fromEnding,
  toBeginning,
  completed,
  perfectAttempts,
  isPlayingAudio,
  isReciting,
  isWaitingForSpace,
  feedback,
  showFeedback,
  detailedFeedback,
  onPlayAudio,
  onSpacebar,
  onCloseFeedback
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-dark-text mb-4">Practice Transition</h2>
        <p className="text-dark-text-secondary">
          Practice smooth transitions between consecutive āyāt
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="text-center">
          <div className="text-lg font-semibold text-dark-text">{fromAyah.surahId}:{fromAyah.ayahNumber}</div>
          <div className="text-sm text-dark-text-secondary">Previous</div>
        </div>
        <div className="text-2xl text-dark-text-muted">→</div>
        <div className="text-center">
          <div className="text-lg font-semibold text-dark-text">{toAyah.surahId}:{toAyah.ayahNumber}</div>
          <div className="text-sm text-dark-text-secondary">Next</div>
        </div>
      </div>

      {/* Practice area */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-8">
        {/* Previous ayah ending */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Previous Āyah Ending:</h3>
          <div className="bg-dark-bg border border-dark-border rounded-xl p-6">
            <p className="text-2xl font-arabic text-dark-text text-center leading-relaxed">
              {fromEnding}
            </p>
          </div>
        </div>

        {/* Next ayah beginning */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Next Āyah Beginning:</h3>
          <div className="bg-dark-bg border border-dark-border rounded-xl p-6">
            <p className="text-2xl font-arabic text-dark-text text-center leading-relaxed">
              {toBeginning}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center mb-6">
          <p className="text-dark-text-secondary mb-4">
            Listen to the previous ayah ending, then recite the next ayah beginning
          </p>
          
          {isPlayingAudio ? (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-blue-400 font-medium">Playing audio...</p>
            </div>
          ) : isWaitingForSpace ? (
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

        {/* Progress */}
        <div className="text-center mb-6">
          <div className="text-sm text-dark-text-secondary mb-2">
            Perfect Attempts: {perfectAttempts}/2
          </div>
          <div className="w-full bg-dark-surface-hover rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(perfectAttempts / 2) * 100}%` }}
            />
          </div>
          {completed && (
            <div className="mt-2 text-easy font-medium">✓ Transition Complete!</div>
          )}
        </div>

        {/* Play audio button */}
        <div className="text-center">
          <button
            onClick={onPlayAudio}
            disabled={isPlayingAudio || isReciting}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              isPlayingAudio || isReciting
                ? 'bg-dark-surface text-dark-text-muted cursor-not-allowed'
                : 'bg-accent text-dark-text hover:bg-accent/80'
            }`}
          >
            {isPlayingAudio ? 'Playing...' : 'Play Previous Ending'}
          </button>
        </div>
      </div>

      {/* Feedback modal */}
      {showFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-dark-text">Feedback</h3>
              <button
                onClick={onCloseFeedback}
                className="text-dark-text-muted hover:text-dark-text transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-4">
              <p className="text-dark-text text-lg">{feedback}</p>
            </div>

            {detailedFeedback && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-sm text-dark-text-secondary mb-1">Word Accuracy</div>
                  <div className="text-2xl font-bold text-accent">
                    {Math.round(detailedFeedback.wordAccuracy * 100)}%
                  </div>
                </div>

                {detailedFeedback.mistakes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-dark-text mb-2">Mistakes:</h4>
                    <ul className="text-sm text-red-400 space-y-1">
                      {detailedFeedback.mistakes.map((mistake, index) => (
                        <li key={index}>• {mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={onCloseFeedback}
                className="btn-primary px-6 py-2"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransitionPair;

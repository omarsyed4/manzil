import React from 'react';

interface FeedbackDisplayProps {
  showFeedback: boolean;
  feedbackMessage: string;
  detailedFeedback?: {
    feedback: string;
    mistakes: string[];
    suggestions: string[];
    correctWords: string[];
    wordAccuracy: number;
  } | null;
  showAccuracyAnimation?: {
    show: boolean;
    change: number;
    isPositive: boolean;
  };
  onClose?: () => void;
}

const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({
  showFeedback,
  feedbackMessage,
  detailedFeedback,
  showAccuracyAnimation,
  onClose
}) => {
  if (!showFeedback) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-dark-text">Feedback</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-dark-text-muted hover:text-dark-text transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Main feedback message */}
        <div className="text-center mb-4">
          <p className="text-dark-text text-lg">{feedbackMessage}</p>
        </div>

        {/* Accuracy animation */}
        {showAccuracyAnimation?.show && (
          <div className={`text-center mb-4 text-lg font-semibold ${
            showAccuracyAnimation.isPositive ? 'text-easy' : 'text-red-500'
          }`}>
            {showAccuracyAnimation.isPositive ? '+' : ''}{showAccuracyAnimation.change}%
          </div>
        )}

        {/* Detailed feedback */}
        {detailedFeedback && (
          <div className="space-y-4">
            {/* Word accuracy */}
            <div className="text-center">
              <div className="text-sm text-dark-text-secondary mb-1">Word Accuracy</div>
              <div className="text-2xl font-bold text-accent">
                {Math.round(detailedFeedback.wordAccuracy * 100)}%
              </div>
            </div>

            {/* Mistakes */}
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

            {/* Suggestions */}
            {detailedFeedback.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-dark-text mb-2">Suggestions:</h4>
                <ul className="text-sm text-easy space-y-1">
                  {detailedFeedback.suggestions.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Correct words */}
            {detailedFeedback.correctWords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-dark-text mb-2">Correct Words:</h4>
                <div className="text-sm text-easy">
                  {detailedFeedback.correctWords.join(', ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Close button */}
        {onClose && (
          <div className="mt-6 text-center">
            <button
              onClick={onClose}
              className="btn-primary px-6 py-2"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackDisplay;

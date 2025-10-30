import React from 'react';

interface ConsolidationWarmUpProps {
  onContinue: () => void;
  onSkip: () => void;
}

const ConsolidationWarmUp: React.FC<ConsolidationWarmUpProps> = ({ onContinue, onSkip }) => {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-dark-text text-2xl font-medium">🏗️</span>
          </div>
          <h1 className="text-3xl font-semibold text-dark-text mb-2">Consolidation Day</h1>
          <p className="text-dark-text-secondary">
            Time to strengthen your foundation before moving forward
          </p>
        </div>

        {/* Consolidation Info */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border mb-6">
          <h2 className="text-xl font-medium text-dark-text mb-4">Today's Focus</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl">
              <h3 className="font-medium text-dark-text mb-2">Consolidation Goals</h3>
              <ul className="text-sm text-dark-text-secondary space-y-1">
                <li>• Master all previously learned āyāt</li>
                <li>• Eliminate hesitations and mistakes</li>
                <li>• Build confidence through repetition</li>
                <li>• Prepare for smooth progression</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <h3 className="font-medium text-dark-text mb-2">Session Structure</h3>
              <ul className="text-sm text-dark-text-secondary space-y-1">
                <li>• Review all weak āyāt until mastered</li>
                <li>• Practice full surah recitation</li>
                <li>• Focus on flow and connection</li>
                <li>• No new āyāt today</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Readiness Check */}
        <div className="bg-dark-surface-hover rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-2 bg-accent rounded-full" />
            <span className="text-dark-text font-medium">Are you ready?</span>
          </div>
          <div className="text-sm text-dark-text-secondary">
            This session will focus entirely on strengthening what you've already learned. 
            Take your time and focus on quality recitation.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={onSkip}
            className="btn-secondary px-6 py-3"
          >
            Skip Introduction
          </button>
          <button
            onClick={onContinue}
            className="btn-primary px-8 py-3 text-lg"
          >
            Start Consolidation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsolidationWarmUp;

import React from 'react';

interface WarmUpScreenProps {
  problemAreas: string[];
  onContinue: () => void;
  onSkip: () => void;
}

const WarmUpScreen: React.FC<WarmUpScreenProps> = ({ problemAreas, onContinue, onSkip }) => {
  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-dark-text text-2xl font-medium">🔥</span>
          </div>
          <h1 className="text-3xl font-semibold text-dark-text mb-2">Warm-Up</h1>
          <p className="text-dark-text-secondary">
            Let's strengthen your problem areas before we begin
          </p>
        </div>

        {/* Problem Areas */}
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border mb-6">
          <h2 className="text-xl font-medium text-dark-text mb-4">Focus Areas for Today</h2>
          
          {problemAreas.length > 0 ? (
            <div className="space-y-3">
              {problemAreas.map((area, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span className="text-dark-text font-medium">{area}</span>
                  <span className="text-red-400 text-sm">Needs attention</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-400 text-xl">✓</span>
              </div>
              <p className="text-dark-text-secondary">No specific problem areas identified</p>
              <p className="text-sm text-dark-text-secondary">You're doing great!</p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl">
            <h3 className="font-medium text-dark-text mb-2">Today's Strategy</h3>
            <ul className="text-sm text-dark-text-secondary space-y-1">
              <li>• Start with the weakest āyāt to build confidence</li>
              <li>• Focus on smooth recitation without hesitations</li>
              <li>• Take your time - quality over speed</li>
              <li>• We'll drill these areas until they're mastered</li>
            </ul>
          </div>
        </div>

        {/* Session Preview */}
        <div className="bg-dark-surface-hover rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-accent rounded-full" />
            <span className="text-dark-text font-medium">Session Flow</span>
          </div>
          <div className="text-sm text-dark-text-secondary">
            Review → Learn new āyāt → Memorization drills
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={onSkip}
            className="btn-secondary px-6 py-3"
          >
            Skip Warm-up
          </button>
          <button
            onClick={onContinue}
            className="btn-primary px-8 py-3 text-lg"
          >
            Let's Begin
          </button>
        </div>
      </div>
    </div>
  );
};

export default WarmUpScreen;

import React from 'react';
import { OnboardingData } from '../../types';

interface StartingPointStepProps {
  data: Partial<OnboardingData>;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const StartingPointStep: React.FC<StartingPointStepProps> = ({ data, onUpdate, onNext, onPrev }) => {
  const handleNext = () => {
    // Set default starting point for MVP
    onUpdate({
      startingPoint: {
        surah: 1, // Al-Fatihah
        startAyah: 1
      }
    });
    onNext();
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-dark-text mb-2">Starting Point</h2>
        <p className="text-dark-text-secondary">
          We'll start with Al-Fātiḥah (The Opening)
        </p>
      </div>

      <div className="space-y-8">
        {/* Coming Soon Message */}
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-dark-surface-hover rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-dark-text mb-4">Custom Starting Point Coming Soon</h3>
          <p className="text-dark-text-secondary mb-6 max-w-md mx-auto">
            We're working on allowing you to choose your own starting point. 
            For now, we'll begin with Al-Fātiḥah to get you started with your memorization journey.
          </p>
          <div className="bg-dark-surface-hover rounded-xl p-4 max-w-sm mx-auto">
            <div className="text-sm text-dark-text-secondary">
              <div className="font-medium text-dark-text mb-2">Starting Point:</div>
              <div>• Surah: Al-Fātiḥah (The Opening)</div>
              <div>• Starting from: Āyah 1</div>
              <div>• Total āyāt: 7</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onPrev}
          className="btn-secondary px-6 py-3"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="btn-primary px-6 py-3"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default StartingPointStep;

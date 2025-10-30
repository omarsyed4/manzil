import React from 'react';
import { OnboardingData } from '../../types';

interface DailyCommitmentStepProps {
  data: Partial<OnboardingData>;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const DailyCommitmentStep: React.FC<DailyCommitmentStepProps> = ({ data, onUpdate, onNext, onPrev }) => {
  const handleNext = () => {
    // Set default daily commitment for MVP
    onUpdate({
      dailyCommitment: {
        newPerDay: 4, // Default to 4 ayahs per day
        estimatedMinutes: 15 // ~15 minutes
      }
    });
    onNext();
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-dark-text mb-2">Daily Commitment</h2>
        <p className="text-dark-text-secondary">
          How much time can you give to Manzil each day?
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
          <h3 className="text-xl font-semibold text-dark-text mb-4">Custom Daily Commitment Coming Soon</h3>
          <p className="text-dark-text-secondary mb-6 max-w-md mx-auto">
            We're working on allowing you to customize your daily memorization goals. 
            For now, we'll start with a manageable 4 āyāt per day to help you build the habit.
          </p>
          <div className="bg-dark-surface-hover rounded-xl p-4 max-w-sm mx-auto">
            <div className="text-sm text-dark-text-secondary">
              <div className="font-medium text-dark-text mb-2">Daily Goal:</div>
              <div>• New āyāt: 4 per day</div>
              <div>• Estimated time: ~15 minutes</div>
              <div>• Perfect for busy schedules</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
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

export default DailyCommitmentStep;

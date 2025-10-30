import React, { useState } from 'react';
import { OnboardingData } from '../../types';

interface ReviewSettingsStepProps {
  data: Partial<OnboardingData>;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const ReviewSettingsStep: React.FC<ReviewSettingsStepProps> = ({ data, onUpdate, onNext, onPrev }) => {
  const handleNext = () => {
    // Set default review settings for MVP
    onUpdate({
      reviewSettings: {
        reviewStyle: 'weak-first',
        ratioNewToReview: '1:3'
      }
    });
    onNext();
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-dark-text mb-2">Review Settings</h2>
        <p className="text-dark-text-secondary">
          Choose how you'd like Manzil to review your memorization
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
          <h3 className="text-xl font-semibold text-dark-text mb-4">Review Settings Coming Soon</h3>
          <p className="text-dark-text-secondary mb-6 max-w-md mx-auto">
            We're working on customizable review settings and spaced repetition algorithms. 
            For now, we'll use the recommended settings to optimize your memorization.
          </p>
          <div className="bg-dark-surface-hover rounded-xl p-4 max-w-sm mx-auto">
            <div className="text-sm text-dark-text-secondary">
              <div className="font-medium text-dark-text mb-2">Review Settings:</div>
              <div>• Focus Style: Weak-first (Recommended)</div>
              <div>• Review Ratio: 1:3 (Balanced)</div>
              <div>• Spaced Repetition: Enabled</div>
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

export default ReviewSettingsStep;

import React from 'react';
import { OnboardingData } from '../../types';

interface WelcomeStepProps {
  data: Partial<OnboardingData>;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const WelcomeStep: React.FC<WelcomeStepProps> = ({ data, onUpdate, onNext }) => {
  const handleIntentSelect = (intent: 'new' | 'continuing') => {
    onUpdate({ intent });
  };

  const canProceed = data.intent !== undefined;

  return (
    <div className="text-center">
      {/* Logo */}
      <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
        <span className="text-dark-text text-3xl font-medium">م</span>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-semibold text-dark-text mb-4">
        Welcome to <span className="text-accent">Manzil</span>
      </h1>
      
      <p className="text-dark-text-secondary mb-8 text-lg">
        Let's help you start your journey to memorize the Qur'an.
      </p>

      {/* Intent Selection */}
      <div className="space-y-4 mb-8">
        <button
          onClick={() => handleIntentSelect('new')}
          className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
            data.intent === 'new'
              ? 'border-accent bg-accent/10 text-dark-text'
              : 'border-dark-border bg-dark-surface-hover text-dark-text-secondary hover:border-dark-text-secondary hover:text-dark-text'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              data.intent === 'new' ? 'border-accent bg-accent' : 'border-dark-border'
            }`}>
              {data.intent === 'new' && (
                <div className="w-2 h-2 bg-dark-text rounded-full" />
              )}
            </div>
            <div>
              <div className="font-medium text-lg">I'm starting fresh</div>
              <div className="text-sm opacity-80">Begin memorizing from the beginning</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleIntentSelect('continuing')}
          className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
            data.intent === 'continuing'
              ? 'border-accent bg-accent/10 text-dark-text'
              : 'border-dark-border bg-dark-surface-hover text-dark-text-secondary hover:border-dark-text-secondary hover:text-dark-text'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              data.intent === 'continuing' ? 'border-accent bg-accent' : 'border-dark-border'
            }`}>
              {data.intent === 'continuing' && (
                <div className="w-2 h-2 bg-dark-text rounded-full" />
              )}
            </div>
            <div>
              <div className="font-medium text-lg">I'm continuing</div>
              <div className="text-sm opacity-80">Resume from a surah I already know</div>
            </div>
          </div>
        </button>
      </div>

      {/* Continue Button */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        className="btn-primary text-lg px-8 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
};

export default WelcomeStep;

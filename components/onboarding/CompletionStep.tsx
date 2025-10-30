import React from 'react';
import { OnboardingData } from '../../types';

interface CompletionStepProps {
  data: OnboardingData;
  onComplete: () => void;
  onPrev: () => void;
  isLoading: boolean;
}

const CompletionStep: React.FC<CompletionStepProps> = ({ data, onComplete, onPrev, isLoading }) => {
  const getSurahName = (surahId: number) => {
    const surahNames: { [key: number]: string } = {
      1: "Al-Fātiḥah",
      2: "Al-Baqarah", 
      78: "An-Naba'"
    };
    return surahNames[surahId] || `Surah ${surahId}`;
  };

  const getReciterName = (reciterId: string) => {
    const reciterNames: { [key: string]: string } = {
      'mishari': 'Mishari Rashid Alafasy',
      'husary': 'Mahmoud Khalil Al-Husary',
      'afasy': 'Abdul Rahman Al-Afasy'
    };
    return reciterNames[reciterId] || reciterId;
  };

  return (
    <div className="text-center">
      {/* Success Icon */}
      <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-dark-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-3xl font-semibold text-dark-text mb-4">
        All Set!
      </h2>
      
      <p className="text-dark-text-secondary mb-8 text-lg">
        Your journey begins today. Here's your personalized plan:
      </p>

      {/* Plan Summary */}
      <div className="bg-dark-surface-hover rounded-xl p-6 mb-8 text-left">
        <h3 className="font-semibold text-dark-text mb-4">Your Plan Summary</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-dark-text-secondary">Starting Point:</span>
            <span className="text-dark-text font-medium">
              {getSurahName(data.startingPoint.surah)}, Āyah {data.startingPoint.startAyah}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dark-text-secondary">Daily Goal:</span>
            <span className="text-dark-text font-medium">
              {data.dailyCommitment.newPerDay} āyāt ({data.dailyCommitment.estimatedMinutes} min)
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dark-text-secondary">Review Style:</span>
            <span className="text-dark-text font-medium">
              {data.reviewSettings.reviewStyle === 'weak-first' ? 'Weak-first' : 'Page-run'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dark-text-secondary">Reciter:</span>
            <span className="text-dark-text font-medium">
              {getReciterName(data.preferences.reciter)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dark-text-secondary">Tajwīd Colors:</span>
            <span className="text-dark-text font-medium">
              {data.preferences.tajwidColors ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-dark-text-secondary">Language:</span>
            <span className="text-dark-text font-medium">
              {data.preferences.language === 'en' ? 'English' : 
               data.preferences.language === 'ur' ? 'Urdu' : 'العربية'}
            </span>
          </div>
        </div>
      </div>

      {/* Motivational Message */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-6 mb-8">
        <div className="text-dark-text font-medium mb-2">
          🕌 Ready to begin your memorization journey?
        </div>
        <div className="text-dark-text-secondary text-sm">
          Your first session is ready with {data.dailyCommitment.newPerDay} āyāt to memorize. 
          Manzil will guide you through each step with spaced repetition.
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onPrev}
          disabled={isLoading}
          className="btn-secondary px-6 py-3 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          disabled={isLoading}
          className="btn-primary px-8 py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-dark-text border-t-transparent rounded-full animate-spin" />
              Setting up...
            </div>
          ) : (
            'Start Session'
          )}
        </button>
      </div>
    </div>
  );
};

export default CompletionStep;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingData } from '../types';
import FirebaseService from '../lib/firebaseService';

// Step components
import WelcomeStep from './onboarding/WelcomeStep';
import PreferencesStep from './onboarding/PreferencesStep';
import StartingPointStep from './onboarding/StartingPointStep';
import DailyCommitmentStep from './onboarding/DailyCommitmentStep';
import ReviewSettingsStep from './onboarding/ReviewSettingsStep';
import CompletionStep from './onboarding/CompletionStep';

const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 6;

  const updateOnboardingData = (stepData: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsLoading(true);
      
      console.log('🔄 Completing onboarding...');
      console.log('📊 Onboarding data:', onboardingData);
      
      // Get current user ID
      const userId = FirebaseService.getCurrentUserId();
      console.log('👤 Current user ID:', userId);
      
      // Create user profile with onboarding data
      const userProfile = {
        id: 'profile',
        userId: userId,
        reciter: onboardingData.preferences?.reciter || 'mishari',
        tajwidColors: onboardingData.preferences?.tajwidColors || true,
        language: onboardingData.preferences?.language || 'en',
        baselineMsPerWord: 420,
        hesitationThresholdMs: 380,
        revealMode: 'mushaf-progressive' as const,
        voiceOnsetMinMs: 120,
        maxWordsPerVoicedBlock: 2,
        wordLengthWeight: {},
        hasCompletedOnboarding: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      console.log('👤 User profile to create:', userProfile);
      
      // Create user profile in Firebase
      console.log('🔥 Creating user profile in Firebase...');
      await FirebaseService.createUserProfile(userProfile);
      console.log('✅ User profile created');
      
      // Create user plan
      const userPlan = {
        id: 'plan',
        userId: userId,
        surahId: onboardingData.startingPoint?.surah || 1,
        startAyahId: onboardingData.startingPoint?.startAyah || 1,
        newPerDay: onboardingData.dailyCommitment?.newPerDay || 4,
        ratioNewToReview: onboardingData.reviewSettings?.ratioNewToReview || '1:3',
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      console.log('📋 User plan to create:', userPlan);
      
      console.log('🔥 Creating user plan in Firebase...');
      await FirebaseService.createUserPlan(userPlan);
      console.log('✅ User plan created');
      
      // Store onboarding data in localStorage for reference
      const mvpData = {
        preferences: onboardingData.preferences || {
          reciter: 'mishari',
          tajwidColors: true,
          language: 'en'
        },
        startingPoint: onboardingData.startingPoint || {
          surah: 1,
          startAyah: 1
        },
        dailyCommitment: onboardingData.dailyCommitment || {
          newPerDay: 4,
          estimatedMinutes: 15
        },
        reviewSettings: onboardingData.reviewSettings || {
          reviewStyle: 'weak-first',
          ratioNewToReview: '1:3'
        },
        completedAt: Date.now()
      };
      
      localStorage.setItem('manzil-onboarding-data', JSON.stringify(mvpData));
      
      console.log('✅ Onboarding completed successfully');
      
      // Navigate to Today page
      navigate('/today');
      
    } catch (error) {
      console.error('❌ Onboarding failed:', error);
      alert('Failed to complete onboarding. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <WelcomeStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <PreferencesStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <StartingPointStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 4:
        return (
          <DailyCommitmentStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 5:
        return (
          <ReviewSettingsStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 6:
        return (
          <CompletionStep
            data={onboardingData as OnboardingData}
            onComplete={completeOnboarding}
            onPrev={prevStep}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-text-secondary">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-dark-text-secondary">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="w-full bg-dark-surface rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="bg-dark-surface rounded-2xl p-8 border border-dark-border">
          {renderStep()}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;

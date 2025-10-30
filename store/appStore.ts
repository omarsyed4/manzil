import { create } from 'zustand';
import { SessionState, Plan, Card, Attempt, Profile } from '../types';

interface AppState {
  // Plan state
  currentPlan: Plan | null;
  
  // Session state
  session: SessionState;
  
  // Cards and attempts
  cards: Card[];
  attempts: Attempt[];
  
  // Actions
  setCurrentPlan: (plan: Plan | null) => void;
  setSession: (session: Partial<SessionState>) => void;
  addCard: (card: Card) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  addAttempt: (attempt: Attempt) => void;
  resetSession: () => void;
  loadOnboardingData: () => void;
}

const initialSessionState: SessionState = {
  userId: 'mvp-user-fallback',
  isActive: false,
  queue: [],
  completedItems: [],
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentPlan: null,
  session: initialSessionState,
  cards: [],
  attempts: [],
  
  // Actions
  setCurrentPlan: (plan) => set({ currentPlan: plan }),
  
  setSession: (sessionUpdates) => 
    set((state) => ({
      session: { ...state.session, ...sessionUpdates }
    })),
  
  addCard: (card) => 
    set((state) => ({
      cards: [...state.cards, card]
    })),
  
  updateCard: (cardId, updates) =>
    set((state) => ({
      cards: state.cards.map(card => 
        card.id === cardId ? { ...card, ...updates } : card
      )
    })),
  
  addAttempt: (attempt) =>
    set((state) => ({
      attempts: [...state.attempts, attempt]
    })),
  
  resetSession: () => set({ session: initialSessionState }),
  
  loadOnboardingData: () => {
    try {
      const storedData = localStorage.getItem('manzil-onboarding-data');
      if (storedData) {
        const onboardingData = JSON.parse(storedData);
        
        // Create a plan from onboarding data
        const plan: Plan = {
          id: `plan-${onboardingData.completedAt}`,
          userId: 'mvp-user-fallback',
          surah: onboardingData.startingPoint.surah,
          startAyah: onboardingData.startingPoint.startAyah,
          newPerDay: onboardingData.dailyCommitment.newPerDay,
          ratioNewToReview: onboardingData.reviewSettings.ratioNewToReview,
          targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
          createdAt: onboardingData.completedAt,
          updatedAt: onboardingData.completedAt,
        };
        
        set({ currentPlan: plan });
        console.log('✅ Loaded onboarding data and created plan:', plan);
      }
    } catch (error) {
      console.error('❌ Error loading onboarding data:', error);
    }
  },
}));

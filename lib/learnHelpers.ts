// Utility functions for learning components

export const encouragementMessages = [
  'Mashallah! 🌟',
  "You're doing great!",
  'Keep it up! 💪',
  "You're on a roll!",
  'Excellent progress!',
  'Beautiful recitation! ✨'
];

export const getRandomEncouragement = (): string => {
  return encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];
};

export const generateFeedback = (similarity: number, quality: string): string => {
  if (similarity >= 0.95) {
    return 'Perfect! ✨';
  } else if (similarity >= 0.80) {
    return 'Great! 👍';
  } else if (similarity >= 0.60) {
    return 'Good';
  } else if (similarity >= 0.30) {
    return 'Keep trying';
  } else {
    return 'Try again';
  }
};

export const shouldShowStrugglingWarning = (attemptCount: number, successfulAttempts: number): boolean => {
  return attemptCount >= 5 && successfulAttempts === 0;
};

export const calculateStageProgress = (
  stageAttemptCount: number,
  stageSuccessfulAttempts: number,
  requiredRepetitions: number = 3
): number => {
  if (stageAttemptCount === 0) return 0;
  return Math.min(100, (stageSuccessfulAttempts / requiredRepetitions) * 100);
};

export const validateStageCompletion = (
  stageSuccessfulAttempts: number,
  requiredRepetitions: number = 3
): boolean => {
  return stageSuccessfulAttempts >= requiredRepetitions;
};

export const getStageTitle = (stage: string): string => {
  switch (stage) {
    case 'ayah-intro':
      return 'New Āyah';
    case 'listen-shadow':
      return 'Listen & Shadow';
    case 'read-recite':
      return 'Read & Recite';
    case 'recall-memory':
      return 'Recall from Memory';
    case 'connect-ayahs':
      return 'Connect Āyāt';
    default:
      return 'Learning';
  }
};

export const getStageDescription = (stage: string): string => {
  switch (stage) {
    case 'ayah-intro':
      return 'Take a moment to familiarize yourself with this āyah';
    case 'listen-shadow':
      return 'Listen to the recitation and repeat along until you feel comfortable';
    case 'read-recite':
      return 'Recite while looking at the Arabic text until you master it without hesitation';
    case 'recall-memory':
      return 'Recite from memory as words appear to confirm you\'ve truly memorized it';
    case 'connect-ayahs':
      return 'Practice smooth transitions between consecutive āyāt';
    default:
      return '';
  }
};

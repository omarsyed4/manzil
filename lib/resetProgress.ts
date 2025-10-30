import { FirebaseService } from './firebaseService';

// Utility to reset user progress and start fresh
export const resetUserProgress = async () => {
  try {
    // Clear all existing sessions
    const sessions = await FirebaseService.getCurrentSession();
    if (sessions) {
      await FirebaseService.updateSession(sessions.id!, { isActive: false });
    }
    
    // Clear all existing cards for Surah 78
    const cards = await FirebaseService.getCardsBySurah(78);
    for (const card of cards) {
      await FirebaseService.deleteCard(card.id);
    }
    
    // Clear all existing attempts for Surah 78
    for (let ayah = 1; ayah <= 10; ayah++) {
      const attempts = await FirebaseService.getAttemptsBySurahAndAyah(78, ayah);
      for (const attempt of attempts) {
        await FirebaseService.deleteAttempt(attempt.id);
      }
    }
    
    console.log('User progress reset successfully');
    return true;
  } catch (error) {
    console.error('Error resetting user progress:', error);
    return false;
  }
};

import { seedSurah112, createEssentialSurahs } from './seedSurah112';
import FirebaseService from '../lib/firebaseService';

export async function initializeDatabase() {
  try {
    console.log('Initializing database with surahs collection...');
    
    // Seed Surah 112 (Al-Ikhlas) with complete ayahs and words
    await seedSurah112(FirebaseService);
    
    // Create additional essential surahs
    await createEssentialSurahs(FirebaseService);
    
    console.log('🎉 Database initialization complete!');
    console.log('📚 Ready to test Learn Mode with Surah 112 (Al-Ikhlas)');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return false;
  }
}

export async function resetUserData() {
  try {
    const userId = FirebaseService.getCurrentUserId();
    console.log('Resetting user data for:', userId);
    
    // Delete user-specific collections
    const collections = ['sessions', 'attempts', 'progress', 'plans', 'problemAreas'];
    
    for (const collection of collections) {
      const snapshot = await FirebaseService.db
        .collection('users')
        .doc(userId)
        .collection(collection)
        .get();
      
      const batch = FirebaseService.db.batch();
      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      
      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`Deleted ${snapshot.docs.length} documents from ${collection}`);
      }
    }
    
    // Reset user profile to defaults
    await FirebaseService.db.collection('users').doc(userId).delete();
    console.log('User profile reset');
    
    return true;
  } catch (error) {
    console.error('Error resetting user data:', error);
    return false;
  }
}

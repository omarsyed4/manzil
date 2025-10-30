import { seedSurah114 } from './seedSurah114';

export async function initializeDatabase() {
  try {
    console.log('Initializing database with Surah 114 (An-Nas)...');
    await seedSurah114();
    console.log('🎉 Database initialization complete!');
    console.log('📚 Ready to test with Surah 114 (An-Nas)');
    return true;
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    return false;
  }
}
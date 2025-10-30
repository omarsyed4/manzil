import { 
  Surah, 
  Ayah, 
  WordToken,
  Ruku,
  Sajdah,
  UserProfile, 
  UserSession, 
  UserAttempt, 
  UserProgress, 
  UserPlan,
  SurahReference,
  ProblemArea
} from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

class FirebaseService {
  static getCurrentUserId(): string {
    console.log('🔥 FirebaseService.getCurrentUserId - auth:', auth);
    console.log('🔥 FirebaseService.getCurrentUserId - auth.currentUser:', auth.currentUser);
    
    // Development mode: check for test user bypass
    if (process.env.NODE_ENV === 'development' && window.location.search.includes('testuser=true')) {
      console.log('🔥 [DEV] Using test user ID for Firebase service');
      return 'hkTxlGC5iqVMBDSsjnUbsXaCWem1';
    }
    
    const userId = auth.currentUser?.uid || 'anonymous';
    console.log('🔥 FirebaseService.getCurrentUserId - userId:', userId);
    return userId;
  }

  // Surahs Collection (Global, read-only for users)
  static async getSurah(surahId: number): Promise<Surah | null> {
    try {
      const docRef = doc(db, 'surahs', surahId.toString());
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: parseInt(docSnap.id), ...docSnap.data() } as Surah : null;
    } catch (error) {
      console.error('Error getting surah:', error);
      return null;
    }
  }

  static async getAllSurahs(): Promise<Surah[]> {
    try {
      const q = query(collection(db, 'surahs'), orderBy('id'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((docSnap) => ({ id: parseInt(docSnap.id), ...docSnap.data() } as Surah));
    } catch (error) {
      console.error('Error getting all surahs:', error);
      return [];
    }
  }

  // Ayahs Subcollection (within each surah)
  static async getAyah(surahId: number, ayahNumber: number): Promise<Ayah | null> {
    try {
      const docRef = doc(db, 'surahs', surahId.toString(), 'ayahs', ayahNumber.toString());
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as Ayah) : null;
  } catch (error) {
      console.error('Error getting ayah:', error);
      return null;
    }
  }

  static async getAyahs(surahId: number): Promise<Ayah[]> {
    try {
      const q = query(collection(db, 'surahs', surahId.toString(), 'ayahs'), orderBy('ayah'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as Ayah);
    } catch (error) {
      console.error('Error getting ayahs:', error);
      return [];
    }
  }

  // Rukus Subcollection (within each surah)
  static async getRukus(surahId: number): Promise<Ruku[]> {
    try {
      const q = query(collection(db, 'surahs', surahId.toString(), 'rukus'), orderBy('rukuIndex'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as Ruku);
    } catch (error) {
      console.error('Error getting rukus:', error);
      return [];
    }
  }

  // Sajdah Subcollection (within each surah)
  static async getSajdahs(surahId: number): Promise<Sajdah[]> {
    try {
      const q = query(collection(db, 'surahs', surahId.toString(), 'sajdah'), orderBy('ayah'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => d.data() as Sajdah);
    } catch (error) {
      console.error('Error getting sajdahs:', error);
      return [];
    }
  }

  // User-specific data (stored in user documents)
  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? ({ id: docSnap.id, userId, ...docSnap.data() } as UserProfile) : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  static async createUserProfile(profile: Omit<UserProfile, 'id'>): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      console.log('🔥 FirebaseService.createUserProfile - userId:', userId);
      console.log('🔥 FirebaseService.createUserProfile - profile:', profile);
      
      const docRef = doc(db, 'users', userId);
      console.log('🔥 FirebaseService.createUserProfile - docRef:', docRef);
      
      const profileData = {
        ...profile,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      console.log('🔥 FirebaseService.createUserProfile - profileData:', profileData);
      
      await setDoc(docRef, profileData);
      console.log('✅ FirebaseService.createUserProfile - Success!');
    } catch (error) {
      console.error('❌ FirebaseService.createUserProfile - Error:', error);
      throw error;
    }
  }

  static async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  static async markOnboardingCompleted(): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId);
      await updateDoc(docRef, { hasCompletedOnboarding: true, updatedAt: Date.now() });
    } catch (error) {
      console.error('Error marking onboarding as completed:', error);
      throw error;
    }
  }

  // User Sessions
  static async getUserSession(): Promise<UserSession | null> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(collection(db, 'users', userId, 'sessions'), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, userId, ...d.data() } as UserSession;
    } catch (error) {
      console.error('Error getting user session:', error);
      return null;
    }
  }

  static async createUserSession(session: Omit<UserSession, 'id'>): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = await addDoc(collection(db, 'users', userId, 'sessions'), {
        ...session,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return docRef.id as string;
    } catch (error) {
      console.error('Error creating user session:', error);
      throw error;
    }
  }

  static async updateUserSession(sessionId: string, updates: Partial<UserSession>): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'sessions', sessionId);
      await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    } catch (error) {
      console.error('Error updating user session:', error);
      throw error;
    }
  }

  // User Attempts
  static async createUserAttempt(attempt: Omit<UserAttempt, 'id'>): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = await addDoc(collection(db, 'users', userId, 'attempts'), {
        ...attempt,
        ts: Date.now()
      });
      return docRef.id as string;
    } catch (error) {
      console.error('Error creating user attempt:', error);
      throw error;
    }
  }

  static async getUserAttempts(surahId?: number, ayahId?: number): Promise<UserAttempt[]> {
    try {
      const userId = this.getCurrentUserId();
      let qRef = query(collection(db, 'users', userId, 'attempts'), orderBy('ts', 'desc'));
      if (surahId !== undefined) {
        qRef = query(qRef, where('surahId', '==', surahId));
      }
      if (ayahId !== undefined) {
        qRef = query(qRef, where('ayahId', '==', ayahId));
      }
      const snapshot = await getDocs(qRef);
      return snapshot.docs.map((d) => ({ id: d.id, userId, ...d.data() } as UserAttempt));
    } catch (error) {
      console.error('Error getting user attempts:', error);
      return [];
    }
  }

  // User Progress
  static async getUserProgress(surahId?: number, ayahId?: number): Promise<UserProgress[]> {
    try {
      const userId = this.getCurrentUserId();
      let qRef = query(collection(db, 'users', userId, 'progress'), orderBy('updatedAt', 'desc'));
      if (surahId !== undefined) {
        qRef = query(qRef, where('surahId', '==', surahId));
      }
      if (ayahId !== undefined) {
        qRef = query(qRef, where('ayahId', '==', ayahId));
      }
      const snapshot = await getDocs(qRef);
      return snapshot.docs.map((d) => ({ id: d.id, userId, ...d.data() } as UserProgress));
    } catch (error) {
      console.error('Error getting user progress:', error);
      return [];
    }
  }

  static async updateUserProgress(progressId: string, updates: Partial<UserProgress>): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId, 'progress', progressId);
      await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    } catch (error) {
      console.error('Error updating user progress:', error);
      throw error;
    }
  }

  // User Plans
  static async getUserPlan(): Promise<UserPlan | null> {
    try {
      const userId = this.getCurrentUserId();
      const qRef = query(collection(db, 'users', userId, 'plans'));
      const snapshot = await getDocs(qRef);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return { id: d.id, userId, ...d.data() } as UserPlan;
    } catch (error) {
      console.error('Error getting user plan:', error);
      return null;
    }
  }

  static async createUserPlan(plan: Omit<UserPlan, 'id'>): Promise<string> {
    try {
      const userId = this.getCurrentUserId();
      console.log('🔥 FirebaseService.createUserPlan - userId:', userId);
      console.log('🔥 FirebaseService.createUserPlan - plan:', plan);
      
      const planData = {
        ...plan,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      console.log('🔥 FirebaseService.createUserPlan - planData:', planData);
      
      const docRef = await addDoc(collection(db, 'users', userId, 'plans'), planData);
      console.log('✅ FirebaseService.createUserPlan - Success! docRef.id:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ FirebaseService.createUserPlan - Error:', error);
      throw error;
    }
  }

  // Problem Areas
  static async getUserProblemAreas(): Promise<ProblemArea[]> {
    try {
      const userId = this.getCurrentUserId();
      const qRef = query(collection(db, 'users', userId, 'problemAreas'), orderBy('lastOccurred', 'desc'));
      const snapshot = await getDocs(qRef);
      return snapshot.docs.map((d) => d.data() as ProblemArea);
    } catch (error) {
      console.error('Error getting user problem areas:', error);
      return [];
    }
  }

  static async addProblemArea(problemArea: ProblemArea): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const key = `${problemArea.surahId}-${problemArea.ayahId}-${problemArea.wordId || 'all'}-${problemArea.type}`;
      const docRef = doc(db, 'users', userId, 'problemAreas', key);
      await setDoc(docRef, { ...problemArea, lastOccurred: Date.now(), occurrenceCount: 1 }, { merge: true });
    } catch (error) {
      console.error('Error adding problem area:', error);
      throw error;
    }
  }

  // Utility methods for efficient lookups
  static async getSurahWithAyahs(surahId: number): Promise<{ surah: Surah; ayahs: Ayah[] } | null> {
    try {
      const [surah, ayahs] = await Promise.all([
        this.getSurah(surahId),
        this.getAyahs(surahId)
      ]);
      
      return surah ? { surah, ayahs } : null;
    } catch (error) {
      console.error('Error getting surah with ayahs:', error);
      return null;
    }
  }

  static async getAyahWithWords(surahId: number, ayahId: number): Promise<{ ayah: Ayah; words: Word[] } | null> {
    try {
      const [ayah, words] = await Promise.all([
        this.getAyah(surahId, ayahId),
        this.getWords(surahId, ayahId)
      ]);
      
      return ayah ? { ayah, words } : null;
    } catch (error) {
      console.error('Error getting ayah with words:', error);
      return null;
    }
  }

  // Helper method to create reference string
  static createReference(surahId: number, ayahId?: number, wordId?: number): string {
    let ref = `surah-${surahId}`;
    if (ayahId !== undefined) ref += `-ayah-${ayahId}`;
    if (wordId !== undefined) ref += `-word-${wordId}`;
    return ref;
  }

  // Helper method to parse reference string
  static parseReference(reference: string): SurahReference {
    const parts = reference.split('-');
    const result: SurahReference = { surahId: parseInt(parts[1]) };
    
    if (parts[2] === 'ayah' && parts[3]) {
      result.ayahId = parseInt(parts[3]);
    }
    if (parts[4] === 'word' && parts[5]) {
      result.wordId = parseInt(parts[5]);
    }
    
    return result;
  }

  // Legacy methods for compatibility (to be updated)
  static async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        return false;
      }
      const userData = docSnap.data();
      return userData?.hasCompletedOnboarding || false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  static async getCurrentPlan(): Promise<UserPlan | null> {
    return this.getUserPlan();
  }

  static async getDueCards(): Promise<UserProgress[]> {
    try {
      const userId = this.getCurrentUserId();
      const now = Date.now();

      const qRef = query(
        collection(db, 'users', userId, 'progress'),
        where('dueAt', '<=', now),
        orderBy('dueAt', 'asc')
      );
      const snapshot = await getDocs(qRef);
      return snapshot.docs.map((d) => ({ id: d.id, userId, ...d.data() } as UserProgress));
    } catch (error) {
      console.error('Error getting due cards:', error);
      return [];
    }
  }

  static async getLearningCards(): Promise<UserProgress[]> {
    try {
      const userId = this.getCurrentUserId();
      const qRef = query(
        collection(db, 'users', userId, 'progress'),
        where('ease', '==', 0),
        orderBy('createdAt', 'asc')
      );
      const snapshot = await getDocs(qRef);
      return snapshot.docs.map((d) => ({ id: d.id, userId, ...d.data() } as UserProgress));
    } catch (error) {
      console.error('Error getting learning cards:', error);
      return [];
    }
  }

  // --- Compatibility wrappers for SessionService ---
  static async createSession(session: Omit<UserSession, 'id'>): Promise<string> {
    return this.createUserSession(session);
  }

  static async getCurrentSession(): Promise<UserSession | null> {
    return this.getUserSession();
  }

  static async updateSession(sessionId: string, updates: Partial<UserSession>): Promise<void> {
    return this.updateUserSession(sessionId, updates);
  }

  static async createCard(card: any): Promise<string> {
    const userId = this.getCurrentUserId();
    const docRef = await addDoc(collection(db, 'users', userId, 'progress'), {
      ...card,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return docRef.id as string;
  }

  static async updateCard(cardId: string, updates: any): Promise<void> {
    const userId = this.getCurrentUserId();
    const docRef = doc(db, 'users', userId, 'progress', cardId);
    await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
  }

  static async getCardsBySurah(surah: number): Promise<any[]> {
    const userId = this.getCurrentUserId();
    const qRef = query(collection(db, 'users', userId, 'progress'), where('surah', '==', surah));
    const snapshot = await getDocs(qRef);
    return snapshot.docs.map((d) => ({ id: d.id, userId, ...d.data() }));
  }

  static async getAttemptsByCard(cardId: string): Promise<any[]> {
    const userId = this.getCurrentUserId();
    const qRef = query(collection(db, 'users', userId, 'attempts'), where('cardId', '==', cardId), orderBy('ts', 'desc'));
    const snapshot = await getDocs(qRef);
    return snapshot.docs.map((d) => ({ id: d.id, userId, ...d.data() }));
  }

  static async createAttempt(attempt: any): Promise<string> {
    return this.createUserAttempt(attempt);
  }
}

export default FirebaseService;
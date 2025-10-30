import { 
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export class AuthService {
  private static currentUser: User | null = null;
  private static authReady = false;
  private static listenerRegistered = false;
  private static authListeners: ((user: User | null) => void)[] = [];

  static async initializeAuth(): Promise<User | null> {
    return new Promise((resolve) => {
      if (this.authReady && this.listenerRegistered) {
        resolve(this.currentUser);
        return;
      }
      if (!this.listenerRegistered) {
        // Persistently listen for auth state changes
        onAuthStateChanged(auth, (user) => {
          this.currentUser = user;
          this.authReady = true;
          
          // Notify all listeners
          this.authListeners.forEach(listener => listener(user));
          
          console.log('🔐 Auth state changed:', user ? `Signed in as ${user.email}` : 'Signed out');
        });
        this.listenerRegistered = true;
      }
      // Resolve immediately with whatever we currently have (may be null on first load)
      resolve(this.currentUser);
    });
  }

  static async signInWithGoogle(): Promise<User> {
    try {
      console.log('🔐 Signing in with Google...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('✅ Google sign-in successful:', result.user.email);
      return result.user;
    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      throw error;
    }
  }

  static async signOut(): Promise<void> {
    try {
      console.log('🔐 Signing out...');
      await signOut(auth);
      console.log('✅ Sign-out successful');
    } catch (error) {
      console.error('❌ Sign-out failed:', error);
      throw error;
    }
  }

  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  static isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  static getUserId(): string {
    if (!this.currentUser) {
      throw new Error('User not authenticated');
    }
    return this.currentUser.uid;
  }

  static getUserEmail(): string | null {
    return this.currentUser?.email || null;
  }

  static getUserDisplayName(): string | null {
    return this.currentUser?.displayName || null;
  }

  static getUserPhotoURL(): string | null {
    return this.currentUser?.photoURL || null;
  }

  // Add listener for auth state changes
  static onAuthStateChanged(listener: (user: User | null) => void): () => void {
    this.authListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(listener);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }
}

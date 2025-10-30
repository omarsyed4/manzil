import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CurrentSession } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Session components
import LearnSession from './session/LearnSession';

const Session: React.FC = () => {
  const navigate = useNavigate();
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        
        // Get user ID with test user bypass support
        let userId = auth.currentUser?.uid;
        
        // Development mode: check for test user bypass
        if (process.env.NODE_ENV === 'development' && window.location.search.includes('testuser=true')) {
          console.log('🔐 [DEV] Using test user ID for Session');
          userId = 'hkTxlGC5iqVMBDSsjnUbsXaCWem1';
        }
        
        if (!userId) {
          console.error('❌ No user authenticated');
          navigate('/');
          return;
        }

        // Load currentSession from user document (NOT from old SessionService)
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
          console.error('❌ User document not found');
          navigate('/today');
          return;
        }
        
        const userData = userDocSnap.data();
        const session = userData.currentSession as CurrentSession;
        
        if (!session) {
          console.error('❌ No currentSession found in user document');
          navigate('/today');
          return;
        }
        
        // Verify session is in progress
        if (session.status === 'not-started') {
          console.error('❌ Session not started yet');
          navigate('/today');
          return;
        }
        
        console.log('✅ Loaded current session from user document:', session);
        setCurrentSession(session);

      } catch (error) {
        console.error('❌ Error initializing session:', error);
        navigate('/today');
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [navigate]);

  const handleSessionComplete = () => {
    navigate('/today');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-text-secondary">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-dark-text mb-2">No Active Session</h1>
          <p className="text-dark-text-secondary mb-4">Please start a session from the Today page</p>
          <button onClick={() => navigate('/today')} className="btn-primary">
            Go to Today
          </button>
        </div>
      </div>
    );
  }

  // Directly render LearnSession - no warmup/review phases for MVP
  return (
    <div className="min-h-screen bg-dark-bg">
      <LearnSession
        session={currentSession}
        onComplete={handleSessionComplete}
      />
    </div>
  );
};

export default Session;
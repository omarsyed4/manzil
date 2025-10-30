import React, { useState, useEffect } from 'react';
import { SessionState, Grade } from '../../types';
import { SessionService } from '../../lib/sessionService';
import FirebaseService from '../../lib/firebaseService';

interface ReviewSessionProps {
  session: SessionState;
  onComplete: () => void;
  onSessionComplete: () => void;
}

const ReviewSession: React.FC<ReviewSessionProps> = ({ session, onComplete, onSessionComplete }) => {
  const [currentCard, setCurrentCard] = useState<any>(null);
  const [isReciting, setIsReciting] = useState(false);
  const [recitationStart, setRecitationStart] = useState<number>(0);
  const [hesitations, setHesitations] = useState(0);
  const [showGrading, setShowGrading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session.currentItem?.cardId) {
      loadCurrentCard();
    }
  }, [session.currentItem]);

  const loadCurrentCard = async () => {
    if (!session.currentItem?.cardId) return;
    
    try {
      const cards = await FirebaseService.getCardsBySurah(session.currentItem.surah!);
      const card = cards.find(c => c.id === session.currentItem!.cardId);
      setCurrentCard(card);
    } catch (error) {
      console.error('Error loading card:', error);
    }
  };

  const startRecitation = () => {
    setIsReciting(true);
    setRecitationStart(Date.now());
    setHesitations(0);
  };

  const recordHesitation = () => {
    setHesitations(prev => prev + 1);
  };

  const finishRecitation = () => {
    setIsReciting(false);
    setShowGrading(true);
  };

  const submitGrade = async (grade: Grade) => {
    try {
      setIsLoading(true);
      
      const rlMs = Date.now() - recitationStart;
      
      await SessionService.completeCurrentItem(grade, rlMs, hesitations);
      
      // Check if session is complete
      const updatedSession = await SessionService.getCurrentSession();
      if (!updatedSession?.isActive) {
        onSessionComplete();
      } else {
        // Move to next item
        setCurrentCard(null);
        setShowGrading(false);
        setIsReciting(false);
        setHesitations(0);
        
        // Load next card
        if (updatedSession.currentItem?.cardId) {
          await loadCurrentCard();
        } else {
          // No more review items, move to learn phase
          onComplete();
        }
      }
    } catch (error) {
      console.error('Error submitting grade:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-text-secondary">Loading āyah...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Session Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-dark-text mb-2">Review Session</h1>
          <p className="text-dark-text-secondary">
            Recite āyah {currentCard.ayah} from {session.currentItem?.surah}
          </p>
        </div>

        {/* Arabic Text */}
        <div className="bg-dark-surface rounded-2xl p-8 border border-dark-border mb-6">
          <div className="text-center">
            <div className="text-3xl font-arabic text-dark-text mb-4 leading-relaxed">
              {currentCard.textUthmani || 'عَمَّ يَتَسَاءَلُونَ'} {/* Fallback text */}
            </div>
            <div className="text-sm text-dark-text-secondary">
              Āyah {currentCard.ayah} • Surah {currentCard.surah}
            </div>
          </div>
        </div>

        {/* Recitation Controls */}
        {!isReciting && !showGrading && (
          <div className="text-center">
            <button
              onClick={startRecitation}
              className="btn-primary text-lg px-8 py-4"
            >
              Start Recitation
            </button>
            <p className="text-sm text-dark-text-secondary mt-4">
              Take your time and recite clearly
            </p>
          </div>
        )}

        {/* Recitation Interface */}
        {isReciting && (
          <div className="text-center">
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-6 mb-6">
              <div className="text-dark-text font-medium mb-2">Reciting...</div>
              <div className="text-sm text-dark-text-secondary">
                Hesitations: {hesitations}
              </div>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={recordHesitation}
                className="btn-secondary px-6 py-3"
              >
                Record Hesitation
              </button>
              <button
                onClick={finishRecitation}
                className="btn-primary px-6 py-3"
              >
                Finish Recitation
              </button>
            </div>
          </div>
        )}

        {/* Grading Interface */}
        {showGrading && (
          <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
            <h3 className="text-lg font-medium text-dark-text mb-4 text-center">
              How did you do?
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { grade: 'Perfect' as Grade, label: 'Perfect', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { grade: 'Minor' as Grade, label: 'Minor', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
                { grade: 'Hesitant' as Grade, label: 'Hesitant', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
                { grade: 'Major' as Grade, label: 'Major', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
              ].map(({ grade, label, color }) => (
                <button
                  key={grade}
                  onClick={() => submitGrade(grade)}
                  disabled={isLoading}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${color} hover:opacity-80 disabled:opacity-50`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-xs opacity-80">
                    {grade === 'Perfect' && 'No mistakes'}
                    {grade === 'Minor' && 'Small errors'}
                    {grade === 'Hesitant' && 'Some hesitation'}
                    {grade === 'Major' && 'Many mistakes'}
                  </div>
                </button>
              ))}
            </div>

            {isLoading && (
              <div className="text-center mt-4">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSession;

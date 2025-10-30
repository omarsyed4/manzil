import React, { useState, useEffect } from 'react';
import { ReciteController, TextToken, AlignmentTrace, MistakeLog } from '../types';

interface MushafOverlayProps {
  ayahText: string;
  textTokens: TextToken[];
  controller: ReciteController;
  tajwidColors?: boolean;
  onComplete?: (trace: AlignmentTrace, mistakes: MistakeLog[]) => void;
  startRecitation?: () => Promise<void>;
  stopRecitation?: () => void;
}

const MushafOverlay: React.FC<MushafOverlayProps> = ({
  ayahText,
  textTokens,
  controller,
  tajwidColors = false,
  onComplete,
  startRecitation,
  stopRecitation,
}) => {
  const [revealedWords, setRevealedWords] = useState<Set<number>>(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  // Update revealed words when controller changes
  useEffect(() => {
    if (controller.revealIndex >= 0) {
      setRevealedWords(prev => {
        const newSet = new Set(prev);
        for (let i = 0; i <= controller.revealIndex; i++) {
          newSet.add(i);
        }
        return newSet;
      });
    }
  }, [controller.revealIndex]);

  // Handle completion
  useEffect(() => {
    if (controller.isActive && controller.revealIndex >= textTokens.length - 1) {
      // All words revealed, trigger completion after animation
      setTimeout(() => {
        if (onComplete) {
          // Create a basic trace for now
          const trace: AlignmentTrace = {
            words: textTokens.map((token, index) => ({
              w: index,
              tStart: index * 400, // Placeholder timing
              tEnd: (index + 1) * 400,
              matched: true,
              latencyToWord: index === 0 ? 200 : 100,
              interPausePrev: index === 0 ? 0 : 100,
            })),
            boundary: {
              transitionPauseHigh: false,
              hintUsed: false,
            },
          };
          
          onComplete(trace, []);
        }
      }, 1000);
    }
  }, [controller.isActive, controller.revealIndex, textTokens.length, textTokens, onComplete]);

  const renderWord = (token: TextToken, index: number) => {
    const isRevealed = revealedWords.has(index);
    const isCurrent = index === controller.revealIndex;
    
    return (
      <span
        key={index}
        className={`
          inline-block transition-all duration-300 ease-out
          ${isRevealed 
            ? 'opacity-100 text-dark-text' 
            : 'opacity-35 text-dark-text-secondary'
          }
          ${isCurrent ? 'scale-105' : ''}
          ${tajwidColors ? 'font-arabic-tajwid' : 'font-arabic'}
        `}
        style={{
          transitionDelay: isRevealed && !revealedWords.has(index - 1) ? '150ms' : '0ms',
        }}
      >
        {token.text}
        {index < textTokens.length - 1 && ' '}
      </span>
    );
  };

  const getProgressPercentage = () => {
    if (textTokens.length === 0) return 0;
    return Math.round(((controller.revealIndex + 1) / textTokens.length) * 100);
  };

  const getCurrentWordCount = () => {
    return Math.max(0, controller.revealIndex + 1);
  };

  // Show loading state if no text tokens
  if (textTokens.length === 0) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-text-secondary">Preparing transliterated text...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Minimal HUD */}
        <div className="flex justify-between items-center mb-8">
          {/* Timer dot */}
          <div className="flex items-center gap-2">
            <div className={`
              w-3 h-3 rounded-full transition-colors duration-200
              ${controller.isActive 
                ? (controller.currentWordStart ? 'bg-green-400 animate-pulse' : 'bg-yellow-400')
                : 'bg-gray-400'
              }
            `} />
            <span className="text-sm text-dark-text-secondary">
              {controller.isActive ? 'Recording' : 'Ready'}
            </span>
          </div>

          {/* Progress chip */}
          <div className="bg-dark-surface border border-dark-border rounded-full px-4 py-2">
            <span className="text-sm text-dark-text">
              {getCurrentWordCount()}/{textTokens.length} words
            </span>
          </div>

          {/* Hint icon (placeholder) */}
          <button className="text-dark-text-secondary hover:text-dark-text transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Mushaf Text Card */}
        <div className="bg-dark-surface rounded-2xl p-8 border border-dark-border mb-6">
          <div className="text-center">
            {/* Transliterated Text */}
            <div className="text-3xl font-body text-dark-text mb-6 leading-relaxed min-h-[120px] flex items-center justify-center">
              <div className="max-w-4xl">
                {textTokens.map((token, index) => renderWord(token, index))}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-dark-surface-hover rounded-full h-2 mb-4">
              <div 
                className="bg-accent h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>

            {/* Status Text */}
            <div className="text-sm text-dark-text-secondary">
              {controller.isActive ? (
                <span className="text-accent">Reciting...</span>
              ) : (
                <span>Ready to recite</span>
              )}
            </div>
          </div>
        </div>

        {/* Instructions and Controls */}
        <div className="text-center">
          <div className="bg-dark-surface-hover rounded-xl p-4 max-w-2xl mx-auto mb-6">
            <p className="text-sm text-dark-text-secondary mb-4">
              {controller.isActive ? (
                <>Speak clearly and the words will appear as you recite them. Take your time.</>
              ) : (
                <>Click "Start Recitation" to begin. Words will appear as you speak them.</>
              )}
            </p>
            
            {!controller.isActive && startRecitation && (
              <button
                onClick={async () => {
                  try {
                    await startRecitation();
                  } catch (error) {
                    console.error('Failed to start recitation:', error);
                    alert('Failed to access microphone. Please check your permissions.');
                  }
                }}
                className="btn-primary px-8 py-3 text-lg"
              >
                Start Recitation
              </button>
            )}
            
            {controller.isActive && stopRecitation && (
              <button
                onClick={stopRecitation}
                className="btn-secondary px-6 py-2"
              >
                Stop Recitation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MushafOverlay;

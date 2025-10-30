import React from 'react';

interface AyahRecitationItemProps {
  surahId: number;
  ayahNumber: number;
  text: string;
  completed: boolean;
  perfectAttempts: number;
  currentAccuracy: number;
  isActive: boolean;
  isReciting: boolean;
}

const AyahRecitationItem: React.FC<AyahRecitationItemProps> = ({
  surahId,
  ayahNumber,
  text,
  completed,
  perfectAttempts,
  currentAccuracy,
  isActive,
  isReciting
}) => {
  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 ${
      isActive
        ? 'border-accent bg-accent/5'
        : completed
        ? 'border-easy bg-easy/5'
        : 'border-dark-border bg-dark-surface'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            completed
              ? 'bg-easy text-white'
              : isActive
              ? 'bg-accent text-dark-text'
              : 'bg-dark-surface-hover text-dark-text-secondary'
          }`}>
            {completed ? '✓' : ayahNumber}
          </div>
          <div>
            <div className="font-semibold text-dark-text">
              {surahId}:{ayahNumber}
            </div>
            <div className="text-sm text-dark-text-secondary">
              {completed ? 'Complete' : isActive ? 'Current' : 'Pending'}
            </div>
          </div>
        </div>
        
        {/* Progress indicators */}
        <div className="flex items-center gap-4">
          {completed && (
            <div className="text-sm text-easy font-medium">
              {perfectAttempts}/2 perfect
            </div>
          )}
          {currentAccuracy > 0 && (
            <div className="text-sm text-dark-text-secondary">
              {Math.round(currentAccuracy * 100)}% accuracy
            </div>
          )}
        </div>
      </div>

      {/* Ayah text */}
      <div className="mb-3">
        <p className={`text-lg font-arabic leading-relaxed ${
          isActive && isReciting
            ? 'text-accent'
            : completed
            ? 'text-easy'
            : 'text-dark-text'
        }`}>
          {text}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-dark-surface-hover rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            completed
              ? 'bg-easy'
              : isActive
              ? 'bg-accent'
              : 'bg-dark-border'
          }`}
          style={{ 
            width: completed 
              ? '100%' 
              : `${Math.min(100, (perfectAttempts / 2) * 100)}%` 
          }}
        />
      </div>

      {/* Status text */}
      <div className="mt-2 text-xs text-dark-text-muted">
        {completed
          ? '✓ Completed'
          : isActive
          ? isReciting
            ? '🎤 Recording...'
            : 'Ready to recite'
          : 'Waiting...'
        }
      </div>
    </div>
  );
};

export default AyahRecitationItem;

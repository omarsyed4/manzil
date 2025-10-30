import React from 'react';
import { getStageTitle, getStageDescription } from '../../../lib/learnHelpers';

interface StageHeaderProps {
  stage: string;
  surah: number;
  ayah: number;
  currentAyahIndex: number;
  totalAyahs: number;
  showTransliteration?: boolean;
  onToggleTransliteration?: () => void;
}

const StageHeader: React.FC<StageHeaderProps> = ({
  stage,
  surah,
  ayah,
  currentAyahIndex,
  totalAyahs,
  showTransliteration,
  onToggleTransliteration
}) => {
  return (
    <div className="text-center mb-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-sm text-dark-text-secondary">
          Āyah {currentAyahIndex + 1} of {totalAyahs}
        </span>
        <span className="text-dark-text-muted">•</span>
        <span className="text-sm text-dark-text-secondary">
          {surah}:{ayah}
        </span>
      </div>

      {/* Stage title and description */}
      <h2 className="text-xl font-semibold text-dark-text mb-2">
        {getStageTitle(stage)}
      </h2>
      <p className="text-dark-text-secondary mb-4">
        {getStageDescription(stage)}
      </p>

      {/* Transliteration toggle */}
      {onToggleTransliteration && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onToggleTransliteration}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              showTransliteration
                ? 'bg-accent text-dark-text'
                : 'bg-dark-surface text-dark-text-secondary hover:text-dark-text'
            }`}
          >
            {showTransliteration ? 'Hide' : 'Show'} Transliteration
          </button>
        </div>
      )}
    </div>
  );
};

export default StageHeader;

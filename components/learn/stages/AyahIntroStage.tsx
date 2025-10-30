import React from 'react';
import StageHeader from '../shared/StageHeader';

interface AyahIntroStageProps {
  surah: number;
  ayah: number;
  ayahText: string;
  textTokens: any[];
  currentAyahIndex: number;
  totalAyahs: number;
  onStartLearning: () => void;
}

const AyahIntroStage: React.FC<AyahIntroStageProps> = ({
  surah,
  ayah,
  ayahText,
  textTokens,
  currentAyahIndex,
  totalAyahs,
  onStartLearning
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      <StageHeader
        stage="ayah-intro"
        surah={surah}
        ayah={ayah}
        currentAyahIndex={currentAyahIndex}
        totalAyahs={totalAyahs}
      />

      <div className="bg-dark-surface border border-dark-border rounded-2xl p-8 text-center">
        {/* Ayah text */}
        <div className="mb-8">
          <p className="text-3xl font-arabic text-dark-text leading-relaxed mb-4">
            {ayahText}
          </p>
        </div>

        {/* Word count and reference */}
        <div className="flex justify-center items-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{textTokens.length}</div>
            <div className="text-sm text-dark-text-secondary">Words</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-dark-text">{surah}:{ayah}</div>
            <div className="text-sm text-dark-text-secondary">Reference</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-dark-text-secondary mb-8 max-w-2xl mx-auto">
          You'll master this āyah through 3 stages: listening and repeating, reciting with text, and finally reciting from memory.
        </p>

        {/* Start button */}
        <button
          onClick={onStartLearning}
          className="btn-primary px-8 py-3 text-lg"
        >
          Start Learning
        </button>
      </div>
    </div>
  );
};

export default AyahIntroStage;

import React from 'react';

interface ProgressBarProps {
  stageProgress: number;
  stageAttemptCount: number;
  stageSuccessfulAttempts: number;
  show?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  stageProgress,
  stageAttemptCount,
  stageSuccessfulAttempts,
  show = true
}) => {
  if (!show) return null;

  const successRate = stageAttemptCount > 0 ? Math.round((stageSuccessfulAttempts / stageAttemptCount) * 100) : 0;

  return (
    <div className="mb-6">
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="h-3 bg-dark-surface-hover rounded-full overflow-hidden border border-dark-border">
          <div 
            className="h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${stageProgress}%` }}
          />
        </div>
        
        {/* Progress text */}
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-dark-text-muted">
            Stage Progress
          </p>
          <p className="text-xs text-dark-text-secondary font-medium">
            {Math.round(stageProgress)}%
          </p>
        </div>
        
        {/* Attempt counter */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs">
          <div className="text-dark-text-muted">
            Attempts: <span className="font-medium text-dark-text">{stageAttemptCount}</span>
          </div>
          <div className="text-dark-text-muted">
            Successful: <span className="font-medium text-easy">{stageSuccessfulAttempts}</span>
          </div>
          <div className="text-dark-text-muted">
            Success Rate: <span className="font-medium text-dark-text">
              {successRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

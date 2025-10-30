import React from 'react';

interface AudioControlsProps {
  audioPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}

const AudioControls: React.FC<AudioControlsProps> = ({
  audioPlaying,
  playbackSpeed,
  onPlay,
  onStop,
  onSpeedChange,
  disabled = false
}) => {
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      {/* Play/Stop button */}
      <button
        onClick={audioPlaying ? onStop : onPlay}
        disabled={disabled}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          audioPlaying
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-accent hover:bg-accent/80 text-dark-text'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {audioPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Speed controls */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-dark-text-secondary">Speed:</span>
        <div className="flex gap-1">
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => onSpeedChange(speed)}
              disabled={disabled}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                playbackSpeed === speed
                  ? 'bg-accent text-dark-text'
                  : 'bg-dark-surface text-dark-text-secondary hover:text-dark-text'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioControls;

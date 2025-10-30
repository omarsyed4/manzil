import React from 'react';

interface MushafControlsProps {
  currentPage: number;
  totalPages: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  zoomLevel: number;
  isLoading?: boolean;
}

const MushafControls: React.FC<MushafControlsProps> = ({
  currentPage,
  totalPages,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  zoomLevel,
  isLoading = false
}) => {
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (page >= 1 && page <= totalPages) {
      onGoToPage(page);
    }
  };

  return (
    <div className="mushaf-controls bg-dark-surface border border-dark-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviousPage}
            disabled={currentPage <= 1 || isLoading}
            className="btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-dark-text-secondary">Page</span>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={handlePageInputChange}
              disabled={isLoading}
              className="w-16 px-2 py-1 text-center border border-dark-border rounded bg-dark-bg text-dark-text disabled:opacity-50"
            />
            <span className="text-sm text-dark-text-secondary">of {totalPages}</span>
          </div>
          
          <button
            onClick={onNextPage}
            disabled={currentPage >= totalPages || isLoading}
            className="btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onZoomOut}
            disabled={isLoading}
            className="btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zoom Out
          </button>
          
          <span className="text-sm text-dark-text-secondary min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          
          <button
            onClick={onZoomIn}
            disabled={isLoading}
            className="btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Zoom In
          </button>
          
          <button
            onClick={onResetZoom}
            disabled={isLoading}
            className="btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-dark-text-secondary">
            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        )}
      </div>
    </div>
  );
};

export default MushafControls;

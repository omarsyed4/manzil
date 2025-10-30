/**
 * Mushaf.tsx
 * 
 * Page wrapper for the MushafViewer component
 * Handles routing params and navigation
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MushafViewer from '../components/mushaf/MushafViewer';

const Mushaf: React.FC = () => {
  const { surahId } = useParams<{ surahId: string }>();
  const navigate = useNavigate();

  const handlePageChange = (page: number) => {
    // Optional: Update URL with current page for bookmarking
    // navigate(`/mushaf/${surahId}?page=${page}`, { replace: true });
  };

  // Handle Escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/library');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Back button - integrated into mushaf theme */}
      <div className="fixed top-4 left-4 z-30">
        <button
          onClick={() => navigate('/library')}
          className="flex items-center gap-2 px-3 py-2 bg-dark-surface/95 backdrop-blur-sm border border-dark-border rounded-xl hover:bg-dark-surface-hover transition-colors text-dark-text-secondary hover:text-dark-text"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm">Library</span>
        </button>
      </div>

      <MushafViewer
        layoutCode="madani-15"
        startSurahId={surahId ? parseInt(surahId) : undefined}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default Mushaf;


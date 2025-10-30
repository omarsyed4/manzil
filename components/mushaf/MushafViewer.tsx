import React, { useState, useEffect, useCallback } from 'react';
import {
  getMushafLayout,
  getMushafPage,
  getPageForAyah,
  getLineText,
  preloadAdjacentPages,
  getSurahName
} from '../../lib/mushafService';
import type { MushafLayout, MushafPage } from '../../types';
import MushafPage from './MushafPage';
import MushafControls from './MushafControls';

interface MushafViewerProps {
  layoutCode?: string;
  startSurahId?: number;
  startAyah?: number;
  startPage?: number;
  onPageChange?: (page: number) => void;
}

export const MushafViewer: React.FC<MushafViewerProps> = ({
  layoutCode = 'madani-15',
  startSurahId,
  startAyah,
  startPage,
  onPageChange
}) => {
  const [layout, setLayout] = useState<MushafLayout | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageData, setPageData] = useState<MushafPage | null>(null);
  const [lineTexts, setLineTexts] = useState<string[]>([]);
  const [surahHeaders, setSurahHeaders] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Initialize: Load layout and resolve starting page
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      setError(null);

      try {
        const layoutData = await getMushafLayout(layoutCode);
        if (!layoutData) {
          setError('Failed to load Mushaf layout');
          return;
        }
        setLayout(layoutData);

        let pageToLoad = startPage || 1;

        if (!startPage && startSurahId && startAyah) {
          const mapping = await getPageForAyah(layoutCode, startSurahId, startAyah);
          if (mapping) {
            pageToLoad = mapping.page;
          }
        } else if (!startPage && startSurahId) {
          const mapping = await getPageForAyah(layoutCode, startSurahId, 1);
          if (mapping) {
            pageToLoad = mapping.page;
          }
        }

        setCurrentPage(pageToLoad);
      } catch (err) {
        console.error('Error initializing MushafViewer:', err);
        setError('Failed to initialize Mushaf viewer');
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [layoutCode, startSurahId, startAyah, startPage]);

  // Load page data whenever currentPage changes
  useEffect(() => {
    async function loadPage() {
      if (!layout) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await getMushafPage(layoutCode, currentPage);
        if (!data) {
          setError(`Failed to load page ${currentPage}`);
          return;
        }

        setPageData(data);

        // Load line texts
        const texts = await Promise.all(
          data.lines.map((_, lineIndex) => getLineText(layoutCode, currentPage, lineIndex))
        );
        setLineTexts(texts);

        // Load surah headers
        const headers = new Map<number, string>();
        for (const line of data.lines) {
          if (line.surahHeader) {
            const name = await getSurahName(line.surahHeader);
            if (name) {
              headers.set(line.surahHeader, name);
            }
          }
        }
        setSurahHeaders(headers);

        // Preload adjacent pages
        preloadAdjacentPages(layoutCode, currentPage);

        onPageChange?.(currentPage);
      } catch (err) {
        console.error('Error loading page:', err);
        setError(`Failed to load page ${currentPage}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [layout, currentPage, layoutCode, onPageChange]);

  // Navigation handlers
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (layout && currentPage < layout.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, layout]);

  const handleGoToPage = useCallback((page: number) => {
    if (layout && page >= 1 && page <= layout.totalPages) {
      setCurrentPage(page);
    }
  }, [layout]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.1, 2.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1.0);
  }, []);

  // Ayah click handler
  const handleAyahClick = useCallback((surahId: number, ayahNumber: number) => {
    console.log(`Clicked on ayah ${surahId}:${ayahNumber}`);
    // TODO: Implement ayah click functionality
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-dark-text mb-2">Error Loading Mushaf</h2>
          <p className="text-dark-text-secondary mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-6 py-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !pageData) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-text-secondary">Loading Mushaf...</p>
        </div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-dark-text mb-2">No Page Data</h2>
          <p className="text-dark-text-secondary">Unable to load the requested page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg p-6">
      <div className="max-w-6xl mx-auto">
        {/* Controls */}
        <MushafControls
          currentPage={currentPage}
          totalPages={layout?.totalPages || 1}
          onPreviousPage={handlePreviousPage}
          onNextPage={handleNextPage}
          onGoToPage={handleGoToPage}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          zoomLevel={zoomLevel}
          isLoading={isLoading}
        />

        {/* Mushaf page */}
        <div 
          className="mushaf-container"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          <MushafPage
            pageData={pageData}
            lineTexts={lineTexts}
            surahHeaders={surahHeaders}
            onAyahClick={handleAyahClick}
          />
        </div>
      </div>
    </div>
  );
};

export default MushafViewer;

/**
 * MushafViewer.tsx
 * 
 * Component for rendering Mushaf (page-based Qur'an) layout
 * Displays the Qur'an exactly as it appears in a printed Madani 15-line Mushaf
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getMushafLayout,
  getMushafPage,
  getPageForAyah,
  getLineText,
  preloadAdjacentPages,
  getSurahName
} from '../lib/mushafService';
import type { MushafLayout, MushafPage } from '../types';

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

  // Initialize: Load layout and resolve starting page
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch layout metadata
        const layoutData = await getMushafLayout(layoutCode);
        if (!layoutData) {
          setError('Failed to load Mushaf layout');
          return;
        }
        setLayout(layoutData);

        // Resolve which page to start on
        let pageToLoad = startPage || 1;

        if (!startPage && startSurahId && startAyah) {
          const mapping = await getPageForAyah(layoutCode, startSurahId, startAyah);
          if (mapping) {
            pageToLoad = mapping.page;
          }
        } else if (!startPage && startSurahId) {
          // Default to first ayah if only surah is provided
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

        // Fetch text for each line and track surah headers
        const texts: string[] = [];
        const headers = new Map<number, string>();
        let lastSurahId: number | null = null;

        for (let i = 0; i < data.lines.length; i++) {
          const lineString = data.lines[i];
          // Split comma-separated ayah refs
          const lineAyahs = lineString.split(',').filter(a => a.length > 0);
          
          // Check if this line starts a new surah
          if (lineAyahs.length > 0) {
            const [surahId] = lineAyahs[0].split(':').map(Number);
            if (lastSurahId !== surahId) {
              const surahName = await getSurahName(surahId);
              if (surahName) {
                headers.set(i, surahName);
              }
              lastSurahId = surahId;
            }
          }
          
          const lineText = await getLineText(lineAyahs);
          texts.push(lineText);
        }
        
        setLineTexts(texts);
        setSurahHeaders(headers);

        // Preload adjacent pages for smoother navigation
        preloadAdjacentPages(layoutCode, currentPage, layout.totalPages);

        // Notify parent of page change
        if (onPageChange) {
          onPageChange(currentPage);
        }
      } catch (err) {
        console.error('Error loading page:', err);
        setError('Failed to load page content');
      } finally {
        setIsLoading(false);
      }
    }

    loadPage();
  }, [currentPage, layout, layoutCode, onPageChange]);

  // Navigation handlers
  const goToNextPage = useCallback(() => {
    if (layout && currentPage < layout.totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, layout]);

  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const goToPage = useCallback((page: number) => {
    if (layout && page >= 1 && page <= layout.totalPages) {
      setCurrentPage(page);
    }
  }, [layout]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goToPreviousPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPreviousPage]);

  // Touch/swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNextPage();
    } else if (isRightSwipe) {
      goToPreviousPage();
    }
  };

  // Render loading state
  if (isLoading && !pageData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-dark-text-secondary">Loading Mushaf...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <div className="text-center max-w-md p-6 bg-dark-surface rounded-2xl border border-dark-border">
          <div className="text-hard mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-dark-text mb-2">Error Loading Mushaf</h3>
          <p className="text-dark-text-secondary">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn-primary"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Minimal top navigation bar */}
      <div className="sticky top-0 z-20 bg-dark-surface/95 backdrop-blur-sm border-b border-dark-border">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          {/* Page info */}
          <div className="flex items-center gap-4">
            <div className="text-dark-text-secondary text-sm">
              <span className="text-dark-text font-medium">{currentPage}</span>
              <span className="mx-1">/</span>
              <span>{layout?.totalPages || 604}</span>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="p-2 text-dark-text-secondary hover:text-dark-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={goToNextPage}
              disabled={!!(layout && currentPage === layout.totalPages)}
              className="p-2 text-dark-text-secondary hover:text-dark-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mushaf Page Content */}
      <div
        className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Page container with Mushaf styling */}
        <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 md:p-10 relative">
          {/* Page number indicator - traditional mushaf style */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <div className="bg-dark-bg border border-dark-border rounded-full px-4 py-1">
              <span className="text-xs text-dark-text-secondary font-mono">{currentPage}</span>
            </div>
          </div>

          {/* Lines of Quranic text */}
          <div className="space-y-3 md:space-y-4 mt-8">
            {lineTexts.map((lineText, index) => (
              <React.Fragment key={index}>
                {/* Surah header */}
                {surahHeaders.has(index) && (
                  <div className="my-6 py-4 border-y border-dark-border">
                    <div className="text-center">
                      {/* Bismillah decoration */}
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-medina-green to-transparent opacity-30"></div>
                        <svg className="w-5 h-5 text-medina-green opacity-60" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-medina-green to-transparent opacity-30"></div>
                      </div>
                      
                      {/* Surah name */}
                      <h2 className="text-lg md:text-xl text-dark-text font-arabic mb-2">
                        {surahHeaders.get(index)}
                      </h2>
                      
                      {/* Bismillah (except for Surah 9) */}
                      {!surahHeaders.get(index)?.includes('التوبة') && (
                        <p className="text-2xl md:text-3xl text-dark-text font-arabic mt-3">
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Quranic text line */}
                <div className="text-right">
                  <p
                    dir="rtl"
                    className="text-2xl md:text-3xl lg:text-4xl leading-loose font-arabic text-dark-text"
                    style={{
                      lineHeight: '2.2',
                      fontWeight: 400,
                      letterSpacing: '0.02em'
                    }}
                  >
                    {lineText || '...'}
                  </p>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Loading indicator for page content */}
          {isLoading && pageData && (
            <div className="absolute inset-0 bg-dark-surface/75 backdrop-blur-sm flex items-center justify-center rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
          )}
        </div>

        {/* Bottom navigation - keyboard shortcuts hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-dark-text-muted">
            Use arrow keys or swipe to navigate • Press Esc to go back
          </p>
        </div>
      </div>
    </div>
  );
};

export default MushafViewer;


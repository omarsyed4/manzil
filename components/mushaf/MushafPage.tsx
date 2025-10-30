import React from 'react';
import { MushafPage as MushafPageType } from '../../types';

interface MushafPageProps {
  pageData: MushafPageType;
  lineTexts: string[];
  surahHeaders: Map<number, string>;
  onAyahClick?: (surahId: number, ayahNumber: number) => void;
}

const MushafPage: React.FC<MushafPageProps> = ({
  pageData,
  lineTexts,
  surahHeaders,
  onAyahClick
}) => {
  const renderLine = (lineIndex: number) => {
    const line = pageData.lines[lineIndex];
    const lineText = lineTexts[lineIndex] || '';
    
    if (!line) return null;

    return (
      <div
        key={lineIndex}
        className="mushaf-line"
        style={{
          height: `${line.height}px`,
          marginBottom: `${line.marginBottom}px`,
          paddingLeft: `${line.paddingLeft}px`,
          paddingRight: `${line.paddingRight}px`,
          textAlign: line.textAlign as any,
          fontSize: `${line.fontSize}px`,
          lineHeight: line.lineHeight,
          fontFamily: 'Amiri, serif'
        }}
      >
        {/* Surah header */}
        {line.surahHeader && (
          <div className="surah-header mb-2">
            <div className="text-center">
              <div className="inline-block bg-accent/10 text-accent px-4 py-2 rounded-lg font-semibold">
                {surahHeaders.get(line.surahHeader) || `Surah ${line.surahHeader}`}
              </div>
            </div>
          </div>
        )}

        {/* Ayah markers */}
        {line.ayahs.map((ayah, ayahIndex) => (
          <span
            key={ayahIndex}
            className="ayah-marker"
            style={{
              position: 'relative',
              display: 'inline-block',
              marginRight: '8px'
            }}
            onClick={() => onAyahClick?.(ayah.surahId, ayah.ayahNumber)}
          >
            <span className="ayah-number">
              {ayah.ayahNumber}
            </span>
          </span>
        ))}

        {/* Line text */}
        <span className="line-text font-arabic text-dark-text">
          {lineText}
        </span>
      </div>
    );
  };

  return (
    <div className="mushaf-page bg-white border border-gray-200 shadow-lg">
      {/* Page header */}
      <div className="page-header text-center py-2 border-b border-gray-200">
        <span className="text-sm text-gray-600">Page {pageData.pageNumber}</span>
      </div>

      {/* Page content */}
      <div className="page-content p-4">
        {pageData.lines.map((_, lineIndex) => renderLine(lineIndex))}
      </div>

      {/* Page footer */}
      <div className="page-footer text-center py-2 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {pageData.surahRange.start} - {pageData.surahRange.end}
        </span>
      </div>
    </div>
  );
};

export default MushafPage;

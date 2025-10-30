import { TextToken } from '../types';

export interface Segment {
  start: number;
  end: number;
  words: TextToken[];
  estimatedDuration: number;
}

export interface SegmentationResult {
  segments: Segment[];
  superSegments: number[][]; // Optional when long ayahs need grouping
}

// Waqf marks for splitting
const WAQF_MARKS = ['ۘ', 'ۚ', 'ۛ', 'ۗ', 'ۙ', 'ۖ', 'ۜ', 'ۡ', 'ۢ', 'ۣ', 'ۤ', 'ۥ', 'ۦ', 'ۧ', 'ۨ', '۩'];

// Lone particles that should merge with adjacent content words
const LONE_PARTICLES = new Set([
  'wa', 'fa', 'thumma', 'fi', 'min', 'ila', 'ala', 'an', 'ma', 'bi', 'ka', 'li', 'hu', 'hi', 'ha'
]);

export class Segmenter {
  static segmentAyah(
    textTokens: TextToken[], 
    waqfMarks: string[] = [], 
    baselineMsPerWord: number = 420
  ): SegmentationResult {
    if (textTokens.length === 0) {
      return { segments: [], superSegments: [] };
    }

    // For transliterated text, we'll use simple word-based segmentation
    // since waqf marks are typically Arabic-specific
    const segments = this.createSegmentsFromTokens(textTokens, baselineMsPerWord);
    
    // Check if we need super-segments for very long ayahs
    const superSegments = this.createSuperSegments(segments);
    
    return { segments, superSegments };
  }

  private static createSegmentsFromTokens(
    tokens: TextToken[], 
    baselineMsPerWord: number
  ): Segment[] {
    const segments: Segment[] = [];
    let currentStart = 0;
    let currentWords: TextToken[] = [];
    let currentDuration = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const wordDuration = token.expectedDuration;
      
      // Check if adding this word would exceed limits
      const wouldExceedWordLimit = currentWords.length >= 6;
      const wouldExceedDurationLimit = currentDuration + wordDuration > 3500;
      
      // Check if this is a lone particle that should merge with next word
      const isLoneParticle = LONE_PARTICLES.has(token.text.toLowerCase());
      const shouldMergeWithNext = isLoneParticle && i < tokens.length - 1;
      
      // If we hit limits or this is a good breaking point, finalize current segment
      if ((wouldExceedWordLimit || wouldExceedDurationLimit) && currentWords.length >= 3) {
        segments.push({
          start: currentStart,
          end: currentStart + currentWords.length,
          words: [...currentWords],
          estimatedDuration: currentDuration
        });
        
        currentStart += currentWords.length;
        currentWords = [];
        currentDuration = 0;
      }
      
      // Add current word to segment
      currentWords.push(token);
      currentDuration += wordDuration;
      
      // If this is a lone particle and we should merge with next, continue
      if (shouldMergeWithNext) {
        continue;
      }
      
      // If we have 3+ words and this is a good stopping point, consider ending segment
      if (currentWords.length >= 3 && this.isGoodStoppingPoint(token, i, tokens)) {
        segments.push({
          start: currentStart,
          end: currentStart + currentWords.length,
          words: [...currentWords],
          estimatedDuration: currentDuration
        });
        
        currentStart += currentWords.length;
        currentWords = [];
        currentDuration = 0;
      }
    }
    
    // Add remaining words as final segment
    if (currentWords.length > 0) {
      segments.push({
        start: currentStart,
        end: currentStart + currentWords.length,
        words: [...currentWords],
        estimatedDuration: currentDuration
      });
    }
    
    return segments;
  }

  private static isGoodStoppingPoint(
    token: TextToken, 
    index: number, 
    allTokens: TextToken[]
  ): boolean {
    // For transliterated text, we'll use simple heuristics
    const word = token.text.toLowerCase();
    
    // Stop after certain connecting words
    const connectingWords = ['wa', 'fa', 'thumma', 'summa'];
    if (connectingWords.includes(word)) {
      return true;
    }
    
    // Stop after longer words (likely content words)
    if (word.length >= 5) {
      return true;
    }
    
    // Stop every 4-5 words for natural breaks
    if (index > 0 && index % 4 === 0) {
      return true;
    }
    
    return false;
  }

  private static createSuperSegments(segments: Segment[]): number[][] {
    // For very long ayahs (6+ segments), group into super-segments
    if (segments.length <= 6) {
      return [];
    }
    
    const superSegments: number[][] = [];
    
    // Group segments into pairs
    for (let i = 0; i < segments.length - 1; i += 2) {
      if (i + 1 < segments.length) {
        superSegments.push([i, i + 1]);
      } else {
        superSegments.push([i]);
      }
    }
    
    return superSegments;
  }

  static getSegmentText(segment: Segment): string {
    return segment.words.map(w => w.text).join(' ');
  }

  static getWindowText(leftSegment: Segment, rightSegment: Segment): string {
    const leftText = this.getSegmentText(leftSegment);
    const rightText = this.getSegmentText(rightSegment);
    return `${leftText} ${rightText}`;
  }

  static estimateSegmentDuration(segment: Segment): number {
    return segment.words.reduce((total, word) => total + word.expectedDuration, 0);
  }
}

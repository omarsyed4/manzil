import { TextToken, Grade, AlignmentTrace, MistakeLog } from '../types';
import { Segmenter, Segment, SegmentationResult } from './segmenter';

export type Target =
  | { kind: 'segment'; idx: number }
  | { kind: 'window'; left: number; right: number }
  | { kind: 'ayah' };

export interface Attempt {
  surah: number;
  ayah: number;
  target: Target;
  rlMs: number;
  hesitations: number;
  usedHint?: boolean;
  grade: Grade;
  trace?: AlignmentTrace;
  ts: number;
}

export interface LearnPhase {
  type: 'familiarize' | 'build_segments' | 'cumulative';
  currentSegment?: number;
  currentWindow?: { left: number; right: number };
  attempts: Attempt[];
  isComplete: boolean;
}

export interface LearnController {
  startAyah(surah: number, ayah: number): Promise<void>;
  onAttemptComplete: (data: Attempt) => void;
  getCurrentPhase(): LearnPhase;
  getSegmentation(): SegmentationResult;
}

export class LearnRoutineRunner {
  private currentPhase: LearnPhase;
  private segmentation: SegmentationResult;
  private surah: number;
  private ayah: number;
  private textTokens: TextToken[];
  private baselineMsPerWord: number;
  private hesitationThresholdMs: number;
  private maxAttemptsPerAyah: number = 10;
  private attemptCount: number = 0;

  constructor(
    textTokens: TextToken[],
    baselineMsPerWord: number = 420,
    hesitationThresholdMs: number = 380
  ) {
    this.textTokens = textTokens;
    this.baselineMsPerWord = baselineMsPerWord;
    this.hesitationThresholdMs = hesitationThresholdMs;
    
    // Initialize segmentation
    this.segmentation = Segmenter.segmentAyah(textTokens, [], baselineMsPerWord);
    
    // Initialize first phase
    this.currentPhase = {
      type: 'familiarize',
      attempts: [],
      isComplete: false
    };
  }

  async startAyah(surah: number, ayah: number): Promise<void> {
    this.surah = surah;
    this.ayah = ayah;
    this.attemptCount = 0;
    
    // Start with familiarize phase
    this.currentPhase = {
      type: 'familiarize',
      attempts: [],
      isComplete: false
    };
  }

  recordAttempt(attempt: Attempt): void {
    this.currentPhase.attempts.push(attempt);
    this.attemptCount++;
    
    // Check if phase is complete based on grade
    this.checkPhaseCompletion(attempt);
  }

  private checkPhaseCompletion(attempt: Attempt): void {
    const grade = attempt.grade;
    
    switch (this.currentPhase.type) {
      case 'familiarize':
        // Skip to cumulative if Perfect/Minor, otherwise go to build_segments
        if (grade === 'Perfect' || grade === 'Minor') {
          this.currentPhase.isComplete = true;
          this.advanceToPhase('cumulative');
        } else {
          this.currentPhase.isComplete = true;
          this.advanceToPhase('build_segments');
        }
        break;
        
      case 'build_segments':
        // Check if all segments are mastered
        if (this.areAllSegmentsMastered()) {
          this.currentPhase.isComplete = true;
          this.advanceToPhase('cumulative');
        }
        break;
        
      case 'cumulative':
        // Check if ayah is mastered
        if (grade === 'Perfect' || grade === 'Minor' || grade === 'Hesitant') {
          this.currentPhase.isComplete = true;
        } else if (this.attemptCount >= this.maxAttemptsPerAyah) {
          // Mark as needs extra practice
          this.currentPhase.isComplete = true;
        }
        break;
    }
  }

  private areAllSegmentsMastered(): boolean {
    // Check if all segments have at least Minor grade
    const segmentAttempts = this.currentPhase.attempts.filter(
      a => a.target.kind === 'segment'
    );
    
    const masteredSegments = new Set<number>();
    segmentAttempts.forEach(attempt => {
      if (attempt.target.kind === 'segment' && 
          (attempt.grade === 'Perfect' || attempt.grade === 'Minor')) {
        masteredSegments.add(attempt.target.idx);
      }
    });
    
    return masteredSegments.size >= this.segmentation.segments.length;
  }

  private advanceToPhase(phaseType: 'build_segments' | 'cumulative'): void {
    this.currentPhase = {
      type: phaseType,
      attempts: [],
      isComplete: false
    };
    
    if (phaseType === 'build_segments') {
      // Start with first segment
      this.currentPhase.currentSegment = 0;
    }
  }

  getCurrentPhase(): LearnPhase {
    return this.currentPhase;
  }

  getSegmentation(): SegmentationResult {
    return this.segmentation;
  }

  getNextTarget(): Target | null {
    if (this.currentPhase.isComplete) {
      return null;
    }

    switch (this.currentPhase.type) {
      case 'familiarize':
        return { kind: 'ayah' };
        
      case 'build_segments':
        return this.getNextSegmentTarget();
        
      case 'cumulative':
        return { kind: 'ayah' };
        
      default:
        return null;
    }
  }

  private getNextSegmentTarget(): Target | null {
    const currentSegment = this.currentPhase.currentSegment || 0;
    const segments = this.segmentation.segments;
    
    if (currentSegment >= segments.length) {
      return null;
    }
    
    // Check if current segment is mastered
    const segmentAttempts = this.currentPhase.attempts.filter(
      a => a.target.kind === 'segment' && a.target.idx === currentSegment
    );
    
    const hasMasteredSegment = segmentAttempts.some(
      a => a.grade === 'Perfect' || a.grade === 'Minor'
    );
    
    if (!hasMasteredSegment) {
      // Need to master current segment
      return { kind: 'segment', idx: currentSegment };
    }
    
    // Current segment is mastered, check if we need to do window practice
    if (currentSegment < segments.length - 1) {
      const windowAttempts = this.currentPhase.attempts.filter(
        a => a.target.kind === 'window' && 
             a.target.left === currentSegment && 
             a.target.right === currentSegment + 1
      );
      
      const hasMasteredWindow = windowAttempts.some(
        a => a.grade === 'Perfect' || a.grade === 'Minor' || a.grade === 'Hesitant'
      );
      
      if (!hasMasteredWindow) {
        // Need to practice window
        this.currentPhase.currentWindow = { 
          left: currentSegment, 
          right: currentSegment + 1 
        };
        return { kind: 'window', left: currentSegment, right: currentSegment + 1 };
      }
    }
    
    // Move to next segment
    this.currentPhase.currentSegment = currentSegment + 1;
    return this.getNextSegmentTarget();
  }

  calculateGrade(
    target: Target,
    rlMs: number,
    hesitations: number,
    usedHint: boolean,
    coverage: number
  ): Grade {
    const expectedRL = this.calculateExpectedRL(target);
    
    // Perfect: RL < 0.6×expected && H = 0 && coverage = 1.0
    if (rlMs < 0.6 * expectedRL && hesitations === 0 && coverage === 1.0 && !usedHint) {
      return 'Perfect';
    }
    
    // Minor: RL < 0.9×expected && H ≤ 1
    if (rlMs < 0.9 * expectedRL && hesitations <= 1 && !usedHint) {
      return 'Minor';
    }
    
    // Hesitant: RL 0.9–1.3× or H 2–3
    if ((rlMs >= 0.9 * expectedRL && rlMs <= 1.3 * expectedRL) || 
        (hesitations >= 2 && hesitations <= 3)) {
      return 'Hesitant';
    }
    
    // Major: RL > 1.3× or H ≥ 4 or usedHint
    if (rlMs > 1.3 * expectedRL || hesitations >= 4 || usedHint) {
      return 'Major';
    }
    
    // Default to Major for edge cases
    return 'Major';
  }

  private calculateExpectedRL(target: Target): number {
    let wordCount = 0;
    
    switch (target.kind) {
      case 'segment':
        wordCount = this.segmentation.segments[target.idx]?.words.length || 0;
        break;
      case 'window':
        const leftWords = this.segmentation.segments[target.left]?.words.length || 0;
        const rightWords = this.segmentation.segments[target.right]?.words.length || 0;
        wordCount = leftWords + rightWords;
        break;
      case 'ayah':
        wordCount = this.textTokens.length;
        break;
    }
    
    return this.baselineMsPerWord * wordCount;
  }

  isAyahMastered(): boolean {
    return this.currentPhase.type === 'cumulative' && this.currentPhase.isComplete;
  }

  needsExtraPractice(): boolean {
    return this.attemptCount >= this.maxAttemptsPerAyah && !this.isAyahMastered();
  }

  getAttemptCount(): number {
    return this.attemptCount;
  }
}

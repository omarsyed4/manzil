// Core data types for Manzil MVP with centralized surahs collection

export interface Surah {
  id: number;                 // Surah number (1-based)
  nameEn: string;
  nameAr: string;
  ayahCount: number;
  revelationPlace: "Meccan" | "Madinan";
  manzil?: number;            // 1..7 (traditional division)
  rukusCount?: number;
  hasAnySajdah?: boolean;     // any sajdah in this surah?
  pages?: number[];           // Mushaf page numbers (optional)
  juz?: number[];             // Juz indices (if spans multiple)
  createdAt: number;
  updatedAt: number;
}

export interface WordToken {
  i: number;          // 1-based word index within the ayah
  text: string;       // Uthmānī word
  // Optional fields for future expansion:
  // root?: string;
  // tajwidTags?: string[];    // e.g., ["ikhfa", "idgham"]
  // glyphWidth?: number;      // layout hint for mushaf rendering
}

export interface Ayah {
  surahId: number;
  ayah: number;                      // 1-based within surah
  textUthmani?: string;              // full ayah text (optional in MVP)
  textTransliterated?: string;        // transliterated text for learning
  words: WordToken[];                // lowest-level tokens
  rukuIndex?: number;                // 1-based ruku index inside surah
  page?: number;                     // Mushaf page number (optional)
  hasSajdah?: boolean;
  audio?: {
    reciter?: string;                // e.g., "mishari"
    url?: string;                    // will be filled later / CDN
  };
  // Traces/metadata reserved for later alignment or display
  meta?: {
    wordCount: number;
    needsContent?: boolean;          // true if placeholder stub
  };
  createdAt: number;
  updatedAt: number;
}

export interface Ruku {
  rukuIndex: number;       // 1-based inside this surah
  startAyah: number;       // inclusive
  endAyah: number;         // inclusive
}

export interface Sajdah {
  ayah: number;            // ayah where sajdah occurs
  obligatory: boolean;     // some surahs have recommended/mandatory opinions
}

// User-specific data (stored in user documents)
export interface UserProfile {
  id: string;
  userId: string;
  reciter: string;
  tajwidColors: boolean;
  language: string;
  baselineMsPerWord: number;
  hesitationThresholdMs: number;
  revealMode: 'mushaf-progressive' | 'traditional';
  voiceOnsetMinMs: number;
  maxWordsPerVoicedBlock: number;
  wordLengthWeight: Record<string, number>;
  hasCompletedOnboarding: boolean;
  
  // Pace and performance metrics
  paceMinutesPerAyah: number; // Average minutes to learn one ayah
  reviewMinutesPerAyah: number; // Average minutes to review one ayah
  totalAyahsLearned: number;
  totalSessionsCompleted: number;
  averageAccuracy: number; // 0-100
  
  createdAt: number;
  updatedAt: number;
}

export interface UserSession {
  id: string;
  userId: string;
  isActive: boolean;
  currentPhase: 'learn' | 'review' | 'memorize';
  currentSurahId: number;
  currentAyahId: number;
  currentWordId?: number;
  queue: SessionItem[];
  completedItems: SessionItem[];
  startTime?: number;
  endTime?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SessionItem {
  type: 'ayah' | 'word' | 'transition';
  surahId: number;
  ayahId: number;
  wordId?: number;
  priority: number; // Higher = more important
  dueAt: number;
}

export interface UserAttempt {
  id: string;
  userId: string;
  surahId: number;
  ayahId: number;
  wordId?: number;
  mode: 'learn' | 'review' | 'memorize';
  rlMs: number;
  hesitations: number;
  usedHint: boolean;
  grade: Grade;
  trace?: AlignmentTrace;
  mistakes?: MistakeLog[];
  ts: number;
}

export interface UserProgress {
  id: string;
  userId: string;
  surahId: number;
  ayahId: number;
  wordId?: number;
  ease: number;
  stability: number;
  interval: number; // Days between reviews
  dueAt: number;
  lastScore: number;
  historyCount: number;
  problemAreas: string[]; // Array of problem area identifiers
  updatedAt: number;
}

export interface UserPlan {
  id: string;
  userId: string;
  surahId: number;
  startAyahId: number;
  newPerDay: number;
  ratioNewToReview: string;
  targetDate: string;
  createdAt: number;
  updatedAt: number;
}

// Reference types for efficient lookups
export interface SurahReference {
  surahId: number;
  ayahId?: number;
  wordId?: number;
}

export interface ProblemArea {
  surahId: number;
  ayahId: number;
  wordId?: number;
  type: 'pronunciation' | 'timing' | 'memory' | 'transition';
  severity: 'low' | 'medium' | 'high';
  lastOccurred: number;
  occurrenceCount: number;
}

export interface TextToken {
  text: string;
  index: number;
  length: number;
  isLigature: boolean;
  expectedDuration: number; // Expected duration in ms based on word length
}

export type Grade = 'Perfect' | 'Minor' | 'Hesitant' | 'Major' | 'Forgot';

// Learn Mode types
export type LearnStage = 
  | 'ayah-intro' 
  | 'listen-shadow' 
  | 'read-recite' 
  | 'recall-memory'
  | 'connect-ayahs'; // NEW

export type ConnectMode = 'transitions' | 'full-recitation';

export interface LearnedAyah {
  surahId: number;
  ayahNumber: number;
  completedAt: Date;
  masteryLevel: number; // 0-100
  attempts?: number;
  accuracy?: number;
}

export interface AyahToLearn {
  surahId: number;
  ayahNumber: number;
}

export interface ProblemArea {
  surahId: number;
  ayahNumber: number;
  stage: 'listen-shadow' | 'read-recite' | 'recall-memory' | 'transitions' | 'full-recitation';
  issue: string;
  detectedAt: Date;
  resolved: boolean;
}

// Surah-level SRS tracking (Anki-style spaced repetition for entire surahs)
export interface SurahReview {
  surahId: number;
  completedAt: Date;
  lastReviewedAt: Date | null;
  nextReviewDue: Date; // When this surah should be reviewed again
  ease: number; // 2.5 default, like Anki
  interval: number; // Days between reviews
  reviewCount: number; // How many times reviewed
  averageAccuracy: number; // 0-100
  masteryLevel: 'learning' | 'young' | 'mature' | 'mastered'; // Like Anki card types
}

export interface CurrentSession {
  sessionId: string;
  status: 'not-started' | 'in-progress' | 'review-complete' | 'learn-complete' | 'all-complete';
  surahId: number;
  startedAt: Date | null;
  completedAt: Date | null;
  reviewPile: LearnedAyah[];
  newPile: AyahToLearn[];
  learnedToday: LearnedAyah[];
  totalAyahs: number;
  totalWords: number;
  ayahsCompleted: number;
  wordsCompleted: number;
  problemAreas: ProblemArea[];
  strugglingAyahs: { surahId: number; ayahNumber: number; attempts: number; }[];
  
  // Pace metrics for this session
  paceMinutesPerAyah?: number; // Calculated pace after completion
  totalDurationMinutes?: number; // Total session duration
  averageAccuracy?: number; // Average accuracy for this session
}

export interface SessionData {
  sessionId: string; // Random UUID
  userId: string;
  date: Date;
  reviewPile: LearnedAyah[]; // Yesterday's learned ayahs
  newPile: LearnedAyah[]; // Today's new ayahs to learn
  learnedToday: LearnedAyah[]; // Ayahs completed in this session
  status: 'in-progress' | 'review-complete' | 'learn-complete' | 'all-complete';
}

export type Target =
  | { kind: 'segment'; idx: number }
  | { kind: 'window'; left: number; right: number }
  | { kind: 'ayah' };

export interface LearnPhase {
  type: 'familiarize' | 'build_segments' | 'cumulative';
  currentSegment?: number;
  currentWindow?: { left: number; right: number };
  attempts: Attempt[];
  isComplete: boolean;
}

export interface Segment {
  start: number;
  end: number;
  words: TextToken[];
  estimatedDuration: number;
}

export interface SegmentationResult {
  segments: Segment[];
  superSegments: number[][];
}

// Voice Activity Detection types
export interface VADSegment {
  start: number;
  end: number;
  confidence: number;
}

export interface VADState {
  isListening: boolean;
  isVoiceDetected: boolean;
  segments: VADSegment[];
  currentSegment?: VADSegment;
}

// Recite Overlay types
export interface ReciteController {
  isActive: boolean;
  revealIndex: number;
  currentWordStart?: boolean;
  startTime?: number;
}

// Legacy types for compatibility (to be removed)
export interface Attempt {
  id: string;
  userId: string;
  cardId: string;
  surah: number;
  ayah: number;
  mode: 'learn' | 'review' | 'memorize';
  rlMs: number;
  hesitations: number;
  usedHint: boolean;
  grade: Grade;
  ts: number;
  trace?: AlignmentTrace;
  mistakes?: MistakeLog[];
}

export interface AlignmentTrace {
  words: WordTrace[];
  boundary: BoundaryFlags;
}

export interface WordTrace {
  w: number; // Word index
  tStart: number; // Start time in ms
  tEnd: number; // End time in ms
  matched: boolean; // Confidence that this segment corresponds to expected word
  latencyToWord: number; // Time from cue end to first phoneme
  interPausePrev: number; // Silence between words
  flags?: string[]; // Additional flags like 'hesitation'
}

export interface BoundaryFlags {
  transitionPauseHigh: boolean;
  hintUsed: boolean;
}

export interface MistakeLog {
  w: number; // Word index
  type: 'skip' | 'insert' | 'order' | 'pron' | 'tajwid';
}

// Constants for onboarding and preferences
export const DAILY_COMMITMENT_OPTIONS = [
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '20', label: '20 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' }
];

export const RECITER_OPTIONS = [
  { value: 'Alafasy', label: 'Mishary Rashid Alafasy' },
  { value: 'Sudais', label: 'Abdul Rahman Al-Sudais' },
  { value: 'Shuraim', label: 'Saud Al-Shuraim' },
  { value: 'Maher', label: 'Maher Al Mueaqly' },
  { value: 'Hudhaify', label: 'Ali Al-Hudhaify' }
];

export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
  { value: 'ur', label: 'اردو' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'fr', label: 'Français' }
];

// Onboarding flow types
export interface OnboardingData {
  intent: 'new' | 'continuing';
  preferences: {
    reciter: string;
    tajwidColors: boolean;
    language: string;
  };
  startingPoint: {
    surah: number;
    startAyah: number;
  };
  dailyCommitment: {
    newPerDay: number;
    estimatedMinutes: number;
  };
  reviewSettings: {
    reviewStyle: 'weak-first' | 'page-run';
    ratioNewToReview: string;
  };
}

// Mushaf (Page-based layout) types
export interface MushafLayout {
  name: string;
  type: string;
  linesPerPage: number;
  totalPages: number;
  createdAt: number;
  updatedAt: number;
}

export interface MushafPage {
  page: number;
  lines: string[]; // Array of lines, each line is comma-separated ayah refs like "114:1,114:2"
  ayahRefs: string[]; // All unique ayah refs on this page
  surahRefs: number[]; // All unique surah IDs on this page
  createdAt: number;
  updatedAt: number;
}

export interface AyahToPage {
  page: number;
  lineIndex: number;
  createdAt: number;
  updatedAt: number;
}
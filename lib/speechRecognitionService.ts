/**
 * speechRecognitionService.ts
 * 
 * Service for Arabic speech recognition and text validation
 */

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

/**
 * Check if speech recognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

/**
 * Normalize Arabic text for comparison
 * Removes tashkeel (diacritics) and normalizes characters
 */
export function normalizeArabicText(text: string): string {
  return text
    // Remove tashkeel (diacritics)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize alef variants
    .replace(/[أإآ]/g, 'ا')
    // Normalize teh marbuta
    .replace(/ة/g, 'ه')
    // Remove extra spaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Calculate similarity between two Arabic texts
 * Returns a score from 0 (completely different) to 1 (perfect match)
 */
export function calculateTextSimilarity(recognized: string, expected: string): number {
  const normalizedRecognized = normalizeArabicText(recognized);
  const normalizedExpected = normalizeArabicText(expected);
  
  console.log('📝 [Text Comparison]', {
    recognized: normalizedRecognized,
    expected: normalizedExpected
  });
  
  // Exact match after normalization
  if (normalizedRecognized === normalizedExpected) {
    return 1.0;
  }
  
  // Calculate Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(normalizedRecognized, normalizedExpected);
  const maxLength = Math.max(normalizedRecognized.length, normalizedExpected.length);
  const similarity = 1 - (distance / maxLength);
  
  console.log('📊 [Similarity Score]', {
    distance,
    maxLength,
    similarity: similarity.toFixed(2),
    percentage: `${(similarity * 100).toFixed(0)}%`
  });
  
  return Math.max(0, similarity);
}

/**
 * Levenshtein distance algorithm
 * Calculates minimum edits needed to transform one string to another
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Convert similarity score to quality grade with word accuracy requirement
 * STRICT: Must have at least 70% word accuracy AND 30% similarity to get any points
 * MAX: 33.33% per attempt to ensure exactly 3 perfect attempts needed
 */
export function getQualityFromSimilarity(similarity: number, wordAccuracy?: number): {
  quality: 'perfect' | 'good' | 'fair' | 'poor';
  progressIncrement: number;
} {
  // STRICT: Below 30% similarity = no points at all
  if (similarity < 0.30) {
    console.warn('⚠️ [Strict Validation] Below 30% similarity - NO POINTS');
    return { quality: 'poor', progressIncrement: 0 };
  }
  
  // STRICT: Below 70% word accuracy = no points (even if similarity is high)
  if (wordAccuracy !== undefined && wordAccuracy < 0.70) {
    console.warn('⚠️ [Strict Validation] Below 70% word accuracy - NO POINTS', {
      wordAccuracy: (wordAccuracy * 100).toFixed(0) + '%',
      similarity: (similarity * 100).toFixed(0) + '%'
    });
    return { quality: 'poor', progressIncrement: 0 };
  }
  
  // STRICT: Maximum 34% per attempt (ensures 100% on 3rd perfect attempt)
  if (similarity >= 0.95 && (wordAccuracy === undefined || wordAccuracy >= 0.95)) {
    return { quality: 'perfect', progressIncrement: 34 }; // 34 + 34 + 34 = 102 (capped at 100)
  } else if (similarity >= 0.90 && (wordAccuracy === undefined || wordAccuracy >= 0.90)) {
    return { quality: 'good', progressIncrement: 20 }; // Reduced points
  } else if (similarity >= 0.80 && (wordAccuracy === undefined || wordAccuracy >= 0.80)) {
    return { quality: 'fair', progressIncrement: 10 }; // Reduced points
  } else {
    // 70-79% = minimal points
    return { quality: 'poor', progressIncrement: 5 }; // Minimal points
  }
}

/**
 * Create and configure speech recognition instance
 */
export function createSpeechRecognition(
  expectedText: string,
  onResult: (transcript: string, similarity: number, quality: any) => void,
  onError?: (error: string) => void,
  onEnd?: () => void,
  options?: {
    continuous?: boolean;
    interimResults?: boolean;
    onInterimResult?: (transcript: string, similarity: number) => void;
  }
): SpeechRecognition | null {
  if (!isSpeechRecognitionSupported()) {
    console.error('❌ [Speech Recognition] Not supported in this browser');
    return null;
  }

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognitionAPI();
  
  // Configure for Arabic Quranic recitation
  recognition.lang = 'ar-SA'; // Arabic (Saudi Arabia)
  recognition.continuous = options?.continuous ?? false; // Allow continuous mode
  recognition.interimResults = options?.interimResults ?? false; // Allow interim results
  recognition.maxAlternatives = 3; // Get top 3 alternatives
  
  console.log('🎙️ [Speech Recognition] Created', {
    lang: recognition.lang,
    continuous: recognition.continuous,
    interimResults: recognition.interimResults,
    expectedText
  });
  
  recognition.onstart = () => {
    console.log('✓ [Speech Recognition] Started listening');
  };
  
  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const results = event.results[event.resultIndex];
    const alternatives: string[] = [];
    let bestMatch = { transcript: '', confidence: 0, similarity: 0 };
    
    // Check all alternatives
    for (let i = 0; i < results.length; i++) {
      const alternative = results[i];
      alternatives.push(alternative.transcript);
      
      const similarity = calculateTextSimilarity(alternative.transcript, expectedText);
      
      console.log(`🎯 [Alternative ${i + 1}]`, {
        transcript: alternative.transcript,
        confidence: alternative.confidence.toFixed(2),
        similarity: similarity.toFixed(2),
        isFinal: results.isFinal
      });
      
      if (similarity > bestMatch.similarity) {
        bestMatch = {
          transcript: alternative.transcript,
          confidence: alternative.confidence,
          similarity
        };
      }
    }
    
    // Handle interim results for real-time feedback
    if (!results.isFinal && options?.onInterimResult) {
      console.log('🔄 [Interim Result]', {
        transcript: bestMatch.transcript,
        similarity: bestMatch.similarity.toFixed(2)
      });
      options.onInterimResult(bestMatch.transcript, bestMatch.similarity);
      return; // Don't process interim results as final
    }
    
    const qualityData = getQualityFromSimilarity(bestMatch.similarity);
    
    console.log('✅ [Best Match]', {
      transcript: bestMatch.transcript,
      confidence: bestMatch.confidence.toFixed(2),
      similarity: bestMatch.similarity.toFixed(2),
      quality: qualityData.quality,
      progressIncrement: qualityData.progressIncrement,
      isFinal: results.isFinal
    });
    
    onResult(bestMatch.transcript, bestMatch.similarity, qualityData);
  };
  
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    console.error('❌ [Speech Recognition] Error:', event.error, event.message);
    if (onError) {
      onError(event.error);
    }
  };
  
  recognition.onend = () => {
    console.log('🛑 [Speech Recognition] Ended');
    if (onEnd) {
      onEnd();
    }
  };
  
  return recognition;
}

/**
 * Create continuous speech recognition for read-recite and recall-memory stages
 * Automatically restarts after each result and provides real-time feedback
 */
export function createContinuousSpeechRecognition(
  expectedText: string,
  onResult: (transcript: string, similarity: number, quality: any) => void,
  onInterimResult?: (transcript: string, similarity: number) => void,
  onError?: (error: string) => void,
  onEnd?: () => void
): SpeechRecognition | null {
  return createSpeechRecognition(
    expectedText,
    onResult,
    onError,
    onEnd,
    {
      continuous: true,
      interimResults: true,
      onInterimResult
    }
  );
}

/**
 * Calculate letter/character accuracy percentage
 * Returns a score from 0 to 1 based on character-level similarity
 */
export function calculateLetterAccuracy(
  recognizedText: string,
  expectedText: string
): number {
  const normalizedRecognized = normalizeArabicText(recognizedText);
  const normalizedExpected = normalizeArabicText(expectedText);
  
  // Remove spaces for character-level comparison
  const recognizedChars = normalizedRecognized.replace(/\s+/g, '');
  const expectedChars = normalizedExpected.replace(/\s+/g, '');
  
  // More precise character-by-character comparison
  let correctChars = 0;
  const maxLength = Math.max(recognizedChars.length, expectedChars.length);
  
  for (let i = 0; i < maxLength; i++) {
    const expectedChar = expectedChars[i] || '';
    const recognizedChar = recognizedChars[i] || '';
    
    if (expectedChar && recognizedChar && expectedChar === recognizedChar) {
      correctChars++;
    }
  }
  
  const accuracy = correctChars / expectedChars.length;
  
  console.log('📊 [Letter Accuracy]', {
    recognizedChars,
    expectedChars,
    correctChars,
    totalExpectedChars: expectedChars.length,
    accuracy: (accuracy * 100).toFixed(0) + '%'
  });
  
  return accuracy;
}

/**
 * Calculate word accuracy percentage
 * Returns a score from 0 to 1 based on how many expected words were recognized
 * Handles both Arabic and English text properly
 */
export function calculateWordAccuracy(
  recognizedText: string,
  expectedWords: string[]
): number {
  const normalizedRecognized = normalizeArabicText(recognizedText);
  const normalizedExpectedWords = expectedWords.map(word => normalizeArabicText(word));
  
  let correctWords = 0;
  const recognizedWords = normalizedRecognized.split(' ').filter(w => w.length > 0);
  
  // Track which recognized words have been matched
  const matchedRecognizedWords = new Set<number>();
  
  for (let i = 0; i < normalizedExpectedWords.length; i++) {
    const expectedWord = normalizedExpectedWords[i];
    
    // Find best match among unmatched recognized words
    let bestMatch = { index: -1, similarity: 0 };
    
    for (let j = 0; j < recognizedWords.length; j++) {
      if (matchedRecognizedWords.has(j)) continue;
      
      const recognizedWord = recognizedWords[j];
      const similarity = calculateTextSimilarity(expectedWord, recognizedWord);
      
      if (similarity > bestMatch.similarity && similarity > 0.6) { // 60% similarity threshold
        bestMatch = { index: j, similarity };
      }
    }
    
    if (bestMatch.index >= 0) {
      correctWords++;
      matchedRecognizedWords.add(bestMatch.index);
    }
  }
  
  const accuracy = correctWords / expectedWords.length;
  console.log('📊 [Word Accuracy]', {
    correctWords,
    totalWords: expectedWords.length,
    accuracy: (accuracy * 100).toFixed(0) + '%',
    recognizedWords: recognizedWords.length,
    matchedWords: matchedRecognizedWords.size
  });
  
  return accuracy;
}

/**
 * Generate hyper-specific feedback about exact mistakes
 * Shows character-by-character and word-by-word analysis
 */
export function generateHyperSpecificFeedback(
  recognizedText: string,
  expectedText: string,
  expectedWords: string[]
): {
  feedback: string;
  mistakes: string[];
  suggestions: string[];
  correctWords: string[];
  wordAccuracy: number;
} {
  const normalizedRecognized = normalizeArabicText(recognizedText);
  const normalizedExpected = normalizeArabicText(expectedText);
  const normalizedExpectedWords = expectedWords.map(word => normalizeArabicText(word));
  
  const mistakes: string[] = [];
  const suggestions: string[] = [];
  const correctWords: string[] = [];
  
  // Calculate word accuracy
  const wordAccuracy = calculateWordAccuracy(recognizedText, expectedWords);
  
  // Split recognized text into words
  const recognizedWords = normalizedRecognized.split(' ').filter(w => w.length > 0);
  
  // Track which expected words have been matched
  const matchedExpectedWords = new Set<number>();
  const matchedRecognizedWords = new Set<number>();
  
  // First pass: find exact matches
  for (let i = 0; i < normalizedExpectedWords.length; i++) {
    const expectedWord = normalizedExpectedWords[i];
    for (let j = 0; j < recognizedWords.length; j++) {
      if (matchedRecognizedWords.has(j)) continue;
      
      const recognizedWord = recognizedWords[j];
      if (expectedWord === recognizedWord) {
        correctWords.push(expectedWord);
        matchedExpectedWords.add(i);
        matchedRecognizedWords.add(j);
        break;
      }
    }
  }
  
  // Second pass: find partial matches for unmatched expected words
  for (let i = 0; i < normalizedExpectedWords.length; i++) {
    if (matchedExpectedWords.has(i)) continue;
    
    const expectedWord = normalizedExpectedWords[i];
    let bestMatch = { index: -1, similarity: 0 };
    
    for (let j = 0; j < recognizedWords.length; j++) {
      if (matchedRecognizedWords.has(j)) continue;
      
      const recognizedWord = recognizedWords[j];
      const similarity = calculateTextSimilarity(expectedWord, recognizedWord);
      
      if (similarity > bestMatch.similarity && similarity > 0.5) {
        bestMatch = { index: j, similarity };
      }
    }
    
    if (bestMatch.index >= 0) {
      const recognizedWord = recognizedWords[bestMatch.index];
      const charMistakes = analyzeCharacterDifferences(expectedWord, recognizedWord);
      if (charMistakes.length > 0) {
        mistakes.push(`"${expectedWord}" → "${recognizedWord}": ${charMistakes.join(', ')}`);
      } else {
        mistakes.push(`"${expectedWord}" pronounced as "${recognizedWord}"`);
      }
      matchedExpectedWords.add(i);
      matchedRecognizedWords.add(bestMatch.index);
    } else {
      mistakes.push(`Missing word: "${expectedWord}"`);
    }
  }
  
  // Find extra words (recognized words that weren't matched to expected words)
  for (let j = 0; j < recognizedWords.length; j++) {
    if (!matchedRecognizedWords.has(j)) {
      mistakes.push(`Extra word: "${recognizedWords[j]}"`);
    }
  }
  
  // Generate specific suggestions
  if (wordAccuracy < 0.7) {
    suggestions.push(`You need at least 70% word accuracy. You got ${(wordAccuracy * 100).toFixed(0)}%`);
  }
  
  if (correctWords.length > 0) {
    suggestions.push(`Correct words: "${correctWords.join('", "')}"`);
  }
  
  if (mistakes.length > 0) {
    suggestions.push(`Focus on the specific mistakes listed above`);
  }
  
  // Character-level analysis for Arabic-specific issues
  const commonMistakes = analyzeArabicMistakes(normalizedRecognized, normalizedExpected);
  if (commonMistakes.length > 0) {
    mistakes.push(...commonMistakes);
    suggestions.push(`Pay attention to Arabic letter pronunciation`);
  }
  
  let feedback = '';
  if (wordAccuracy >= 0.95 && mistakes.length === 0) {
    feedback = 'Perfect! All words and characters correct.';
  } else if (wordAccuracy >= 0.7) {
    feedback = `Good attempt! ${(wordAccuracy * 100).toFixed(0)}% word accuracy.`;
  } else {
    feedback = `Keep trying! Only ${(wordAccuracy * 100).toFixed(0)}% word accuracy. Recite the correct āyah.`;
  }
  
  return { feedback, mistakes, suggestions, correctWords, wordAccuracy };
}

/**
 * Generate hyper-specific feedback for listen-shadow stage
 * Focuses on letter/character accuracy and pronunciation
 */
export function generateListenShadowFeedback(
  recognizedText: string,
  expectedText: string
): {
  feedback: string;
  mistakes: string[];
  missedChars: string[];
  letterAccuracy: number;
} {
  const normalizedRecognized = normalizeArabicText(recognizedText);
  const normalizedExpected = normalizeArabicText(expectedText);
  
  const mistakes: string[] = [];
  const missedChars: string[] = [];
  
  // Calculate letter accuracy
  const letterAccuracy = calculateLetterAccuracy(recognizedText, expectedText);
  
  // Remove spaces for character-level comparison
  const recognizedChars = normalizedRecognized.replace(/\s+/g, '');
  const expectedChars = normalizedExpected.replace(/\s+/g, '');
  
  // Character-by-character analysis - only track mistakes
  const maxLength = Math.max(recognizedChars.length, expectedChars.length);
  
  for (let i = 0; i < maxLength; i++) {
    const expectedChar = expectedChars[i] || '';
    const recognizedChar = recognizedChars[i] || '';
    
    if (expectedChar && recognizedChar) {
      if (expectedChar !== recognizedChar) {
        missedChars.push(expectedChar);
        mistakes.push(`Pronounced "${recognizedChar}" instead of "${expectedChar}"`);
      }
    } else if (expectedChar && !recognizedChar) {
      missedChars.push(expectedChar);
      mistakes.push(`Missing "${expectedChar}"`);
    } else if (!expectedChar && recognizedChar) {
      mistakes.push(`Extra "${recognizedChar}"`);
    }
  }
  
  // Arabic-specific pronunciation mistakes
  const arabicMistakes = analyzeArabicMistakes(normalizedRecognized, normalizedExpected);
  mistakes.push(...arabicMistakes);
  
  // Determine if we should show detailed feedback or generic message
  const totalExpectedChars = expectedChars.length;
  const mistakeRatio = mistakes.length / totalExpectedChars;
  
  // If more than 30% of characters are mistakes, show generic feedback
  if (mistakeRatio > 0.3) {
    return {
      feedback: 'You got many letters wrong. Please recite the correct āyah.',
      mistakes: ['Too many mistakes - please try reciting the āyah correctly'],
      missedChars: [],
      letterAccuracy
    };
  }
  
  let feedback = '';
  if (letterAccuracy >= 0.85 && mistakes.length === 0) {
    feedback = 'Perfect! All characters correct.';
  } else if (letterAccuracy >= 0.7) {
    feedback = `Good attempt! ${(letterAccuracy * 100).toFixed(0)}% accuracy.`;
  } else {
    feedback = `Keep trying! Only ${(letterAccuracy * 100).toFixed(0)}% accuracy.`;
  }
  
  return { feedback, mistakes, missedChars, letterAccuracy };
}

/**
 * Analyze character-by-character differences between two words
 */
function analyzeCharacterDifferences(expected: string, recognized: string): string[] {
  const mistakes: string[] = [];
  const maxLength = Math.max(expected.length, recognized.length);
  
  for (let i = 0; i < maxLength; i++) {
    const expectedChar = expected[i] || '';
    const recognizedChar = recognized[i] || '';
    
    if (expectedChar !== recognizedChar) {
      if (expectedChar && recognizedChar) {
        mistakes.push(`Character ${i + 1}: "${expectedChar}" → "${recognizedChar}"`);
      } else if (expectedChar) {
        mistakes.push(`Missing character ${i + 1}: "${expectedChar}"`);
      } else {
        mistakes.push(`Extra character ${i + 1}: "${recognizedChar}"`);
      }
    }
  }
  
  return mistakes;
}

/**
 * Analyze Arabic-specific pronunciation mistakes
 */
function analyzeArabicMistakes(recognized: string, expected: string): string[] {
  const mistakes: string[] = [];
  
  // Common Arabic letter confusions
  const commonConfusions = [
    { from: 'ض', to: 'ظ', name: 'Daad vs Dhaa' },
    { from: 'ص', to: 'س', name: 'Saad vs Seen' },
    { from: 'ط', to: 'ت', name: 'Taa vs Taa marbuta' },
    { from: 'ق', to: 'ك', name: 'Qaaf vs Kaaf' },
    { from: 'ع', to: 'أ', name: 'Ayn vs Hamza' },
    { from: 'غ', to: 'خ', name: 'Ghayn vs Khaa' },
  ];
  
  for (const confusion of commonConfusions) {
    if (recognized.includes(confusion.from) && expected.includes(confusion.to)) {
      mistakes.push(`Check ${confusion.name} pronunciation`);
    }
    if (recognized.includes(confusion.to) && expected.includes(confusion.from)) {
      mistakes.push(`Check ${confusion.name} pronunciation`);
    }
  }
  
  return mistakes;
}

/**
 * Check if specific words were said
 * Returns array of which words matched
 */
export function checkWordsSpoken(
  recognizedText: string,
  expectedWords: string[]
): boolean[] {
  const normalizedRecognized = normalizeArabicText(recognizedText);
  
  return expectedWords.map(word => {
    const normalizedWord = normalizeArabicText(word);
    return normalizedRecognized.includes(normalizedWord);
  });
}


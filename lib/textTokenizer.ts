import { TextToken } from '../types';

// English word patterns for transliterated Arabic text
const ENGLISH_WORD_PATTERN = /[a-zA-Z]+/g;

// Common short particles that get shorter duration (transliterated)
const SHORT_PARTICLES = new Set([
  'wa', 'fi', 'min', 'ila', 'ala', 'an', 'ma', 'bi', 'ka', 'li', 'hu', 'hatha', 'hathihi', 'dhalika', 'tilka'
]);

// Common long words that get longer duration (transliterated)
const LONG_WORDS = new Set([
  'arrahman', 'arraheem', 'almalik', 'alqudus', 'assalam', 'almumin', 'almuhaymin', 'alaziz', 'aljabbar', 'almutakabbir'
]);

export class TextTokenizer {
  static tokenizeAyah(text: string, baselineMsPerWord: number = 420): TextToken[] {
    const tokens: TextToken[] = [];
    let match;
    let index = 0;

    // Find all English words (transliterated Arabic)
    while ((match = ENGLISH_WORD_PATTERN.exec(text)) !== null) {
      const word = match[0].toLowerCase();
      const startIndex = match.index;
      
      // Skip if this word was already processed
      if (startIndex < index) continue;

      // Calculate expected duration based on word characteristics
      const expectedDuration = this.calculateExpectedDuration(word, baselineMsPerWord);

      tokens.push({
        text: word,
        index: startIndex,
        length: word.length,
        isLigature: false, // No ligatures in transliterated text
        expectedDuration,
      });

      index = startIndex + word.length;
    }

    return tokens;
  }

  private static calculateExpectedDuration(word: string, baselineMsPerWord: number): number {
    let multiplier = 1.0;

    // Short particles get shorter duration
    if (SHORT_PARTICLES.has(word)) {
      multiplier = 0.7;
    }
    // Long words get longer duration
    else if (LONG_WORDS.has(word)) {
      multiplier = 1.2;
    }
    // Adjust based on word length
    else if (word.length <= 2) {
      multiplier = 0.8;
    } else if (word.length >= 6) {
      multiplier = 1.1;
    }

    // Apply character count weighting
    const lengthWeight = Math.max(0.5, Math.min(1.5, word.length / 4));
    
    return Math.round(baselineMsPerWord * multiplier * lengthWeight);
  }

  static splitIntoTokens(text: string): string[] {
    const tokens: string[] = [];
    let match;

    while ((match = ENGLISH_WORD_PATTERN.exec(text)) !== null) {
      tokens.push(match[0].toLowerCase());
    }

    return tokens;
  }

  static getWordCount(text: string): number {
    return this.splitIntoTokens(text).length;
  }

  static isTransliteratedText(text: string): boolean {
    return ENGLISH_WORD_PATTERN.test(text);
  }

  static validateTokens(tokens: TextToken[], originalText: string): boolean {
    const reconstructedText = tokens.map(t => t.text).join(' ');
    const originalWords = this.splitIntoTokens(originalText);
    const tokenWords = this.splitIntoTokens(reconstructedText);
    
    return originalWords.length === tokenWords.length;
  }
}

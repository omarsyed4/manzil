import React, { useState, useEffect } from 'react';
import { Attempt, TextToken } from '../types';
import { FirebaseService } from '../lib/firebaseService';
import { TextTokenizer } from '../lib/textTokenizer';

interface ReviewFeedbackProps {
  surah: number;
  ayah: number;
  ayahText: string;
  onClose: () => void;
}

interface WeakWord {
  index: number;
  text: string;
  hesitationCount: number;
  avgLatency: number;
  skipCount: number;
  weaknessScore: number;
}

const ReviewFeedback: React.FC<ReviewFeedbackProps> = ({
  surah,
  ayah,
  ayahText,
  onClose,
}) => {
  const [weakWords, setWeakWords] = useState<WeakWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [textTokens, setTextTokens] = useState<TextToken[]>([]);

  useEffect(() => {
    loadWeakWords();
  }, [surah, ayah]);

  const loadWeakWords = async () => {
    try {
      setIsLoading(true);
      
      // Tokenize the ayah text
      const tokens = TextTokenizer.tokenizeAyah(ayahText);
      setTextTokens(tokens);
      
      // Get all attempts for this ayah
      const attempts = await FirebaseService.getAttemptsBySurahAndAyah(surah, ayah);
      
      // Analyze attempts to find weak words
      const wordAnalysis = analyzeWordWeakness(attempts, tokens);
      setWeakWords(wordAnalysis);
      
    } catch (error) {
      console.error('Error loading weak words:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeWordWeakness = (attempts: Attempt[], tokens: TextToken[]): WeakWord[] => {
    const wordStats = new Map<number, {
      hesitationCount: number;
      totalLatency: number;
      skipCount: number;
      attemptCount: number;
    }>();

    // Initialize stats for each word
    tokens.forEach((_, index) => {
      wordStats.set(index, {
        hesitationCount: 0,
        totalLatency: 0,
        skipCount: 0,
        attemptCount: 0,
      });
    });

    // Analyze each attempt
    attempts.forEach(attempt => {
      if (!attempt.trace) return;
      
      attempt.trace.words.forEach(wordTrace => {
        const stats = wordStats.get(wordTrace.w);
        if (!stats) return;
        
        stats.attemptCount++;
        stats.totalLatency += wordTrace.latencyToWord;
        
        if (wordTrace.flags?.includes('hesitation')) {
          stats.hesitationCount++;
        }
      });

      // Count skips (words not in trace)
      const tracedWordIndices = new Set(attempt.trace.words.map(w => w.w));
      tokens.forEach((_, index) => {
        if (!tracedWordIndices.has(index)) {
          const stats = wordStats.get(index);
          if (stats) {
            stats.skipCount++;
          }
        }
      });
    });

    // Calculate weakness scores and create WeakWord objects
    const weakWords: WeakWord[] = [];
    wordStats.forEach((stats, index) => {
      if (stats.attemptCount === 0) return;
      
      const avgLatency = stats.totalLatency / stats.attemptCount;
      const hesitationRate = stats.hesitationCount / stats.attemptCount;
      const skipRate = stats.skipCount / stats.attemptCount;
      
      // Calculate weakness score (0-100, higher = weaker)
      const weaknessScore = Math.round(
        (hesitationRate * 40) + 
        (skipRate * 30) + 
        (Math.min(avgLatency / 1000, 1) * 30)
      );
      
      if (weaknessScore > 20) { // Only show words with significant weakness
        weakWords.push({
          index,
          text: tokens[index].text,
          hesitationCount: stats.hesitationCount,
          avgLatency,
          skipCount: stats.skipCount,
          weaknessScore,
        });
      }
    });

    // Sort by weakness score (most weak first)
    return weakWords.sort((a, b) => b.weaknessScore - a.weaknessScore);
  };

  const getWeaknessColor = (score: number) => {
    if (score >= 70) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (score >= 50) return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
    if (score >= 30) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
  };

  const getWeaknessLabel = (score: number) => {
    if (score >= 70) return 'Very Weak';
    if (score >= 50) return 'Weak';
    if (score >= 30) return 'Moderate';
    return 'Minor';
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-dark-surface rounded-2xl p-6 border border-dark-border">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-dark-text-secondary">Analyzing your progress...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-dark-surface rounded-2xl border border-dark-border max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-dark-border">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-dark-text mb-2">Review Feedback</h2>
              <p className="text-dark-text-secondary">
                Āyah {ayah} • Surah {surah} • Focus on these areas
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-dark-text-secondary hover:text-dark-text transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {weakWords.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-dark-text mb-2">Excellent Progress!</h3>
              <p className="text-dark-text-secondary">
                No significant weak spots detected. Keep up the great work!
              </p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6">
                <h3 className="font-medium text-dark-text mb-2">Focus Areas</h3>
                <p className="text-sm text-dark-text-secondary">
                  We've identified {weakWords.length} word{weakWords.length !== 1 ? 's' : ''} that need extra attention 
                  based on your recitation patterns. Practice these words with extra care.
                </p>
              </div>

              {/* Weak Words List */}
              <div className="space-y-4">
                {weakWords.map((word, index) => (
                  <div key={index} className="bg-dark-surface-hover rounded-xl p-4 border border-dark-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-arabic text-dark-text">
                          {word.text}
                        </div>
                        <div className={`px-3 py-1 rounded-lg border text-sm ${getWeaknessColor(word.weaknessScore)}`}>
                          {getWeaknessLabel(word.weaknessScore)}
                        </div>
                      </div>
                      <div className="text-right text-sm text-dark-text-secondary">
                        <div>Score: {word.weaknessScore}/100</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-dark-text-secondary">Hesitations</div>
                        <div className="text-dark-text font-medium">{word.hesitationCount}</div>
                      </div>
                      <div>
                        <div className="text-dark-text-secondary">Avg. Latency</div>
                        <div className="text-dark-text font-medium">{Math.round(word.avgLatency)}ms</div>
                      </div>
                      <div>
                        <div className="text-dark-text-secondary">Skips</div>
                        <div className="text-dark-text font-medium">{word.skipCount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Practice Tips */}
              <div className="mt-6 bg-dark-surface-hover rounded-xl p-4">
                <h4 className="font-medium text-dark-text mb-2">Practice Tips</h4>
                <ul className="text-sm text-dark-text-secondary space-y-1">
                  <li>• Focus on the words marked as "Very Weak" first</li>
                  <li>• Practice transitions between difficult words</li>
                  <li>• Take your time with pronunciation</li>
                  <li>• Use the audio playback to hear correct pronunciation</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-dark-border">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="btn-secondary px-6 py-2"
            >
              Close
            </button>
            <button
              onClick={() => {
                // TODO: Start targeted practice session
                console.log('Start targeted practice');
              }}
              className="btn-primary px-6 py-2"
            >
              Practice These Words
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewFeedback;

import { Grade } from '../types';

// Simple SRS implementation for Manzil MVP
export function calculateNewInterval(
  currentEase: number,
  currentStability: number,
  grade: Grade
): { newEase: number; newStability: number; newInterval: number } {
  // Grade mapping to scores
  const gradeScores = {
    'Perfect': 5,
    'Minor': 4,
    'Hesitant': 3,
    'Major': 2,
    'Forgot': 1
  };

  const score = gradeScores[grade];
  
  // Update ease factor
  let newEase = currentEase;
  if (score >= 4) {
    newEase = Math.min(currentEase + 0.1, 2.6);
  } else if (score <= 2) {
    newEase = Math.max(currentEase - 0.2, 1.3);
  }

  // Update stability
  let newStability = currentStability;
  if (score >= 4) {
    newStability = Math.min(currentStability * 1.2, 10);
  } else if (score <= 2) {
    newStability = Math.max(currentStability * 0.8, 0.1);
  }

  // Calculate new interval
  let newInterval = 0;
  if (score >= 4) {
    newInterval = Math.max(currentStability * newEase, 1);
  } else if (score === 3) {
    newInterval = Math.max(currentStability * 0.5, 0.5);
  } else {
    newInterval = 0.1; // Reset to learning phase
  }

  return {
    newEase,
    newStability,
    newInterval
  };
}

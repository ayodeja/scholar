import type { MasteryState } from "@/lib/types";

/**
 * Recomputes a concept's mastery state from real evidence: consecutive
 * correct answers/reviews vs. how long it's been since the last one. This
 * is intentionally simple (v1 spaced-repetition heuristic) but every input
 * is a real recorded event — never a random or hardcoded number.
 */
export function nextMasteryState(params: {
  currentState: MasteryState;
  wasCorrect: boolean;
  correctStreak: number;
  daysSinceLastReview: number | null;
}): { state: MasteryState; correctStreak: number; nextReviewInDays: number } {
  const { wasCorrect, correctStreak, daysSinceLastReview } = params;

  if (!wasCorrect) {
    return { state: "learning", correctStreak: 0, nextReviewInDays: 1 };
  }

  const newStreak = correctStreak + 1;

  // A previously strong concept that hasn't been touched in a while is
  // "at risk" even though the last recorded answer was correct.
  if (daysSinceLastReview !== null && daysSinceLastReview > 21 && newStreak < 4) {
    return { state: "at_risk", correctStreak: newStreak, nextReviewInDays: 1 };
  }

  if (newStreak >= 5) return { state: "mastered", correctStreak: newStreak, nextReviewInDays: 14 };
  if (newStreak >= 3) return { state: "strong", correctStreak: newStreak, nextReviewInDays: 7 };
  return { state: "learning", correctStreak: newStreak, nextReviewInDays: 2 };
}

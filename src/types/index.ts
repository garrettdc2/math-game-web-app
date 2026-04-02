/**
 * Shared type definitions for the math-game-web-app.
 *
 * IMPORTANT: Math engine types (Grade, Operation, DisplayToken, Problem,
 * GradeConfig, NumberRange, ProblemTypeConfig) are the single source of truth
 * from `@/lib/math/types`. Re-exported here for convenience so consumers can
 * import everything from `@/types`.
 */

// Re-export math engine types as the single source of truth
export type {
  Grade,
  Operation,
  DisplayToken,
  Problem,
  GradeConfig,
  NumberRange,
  ProblemTypeConfig,
} from "@/lib/math/types";

export { ALL_GRADES } from "@/lib/math/types";

/** Alias for backwards compatibility — prefer ALL_GRADES */
export { ALL_GRADES as GRADES } from "@/lib/math/types";

// ---- App-specific types (not in math engine) ----

import type { Grade } from "@/lib/math/types";

/** User profile extending Supabase auth user */
export interface Profile {
  id: string;
  displayName: string;
  selectedGrade: Grade | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A completed game round score record */
export interface Score {
  id: string;
  userId: string;
  grade: Grade;
  score: number;
  streak: number;
  problemsCorrect: number;
  problemsTotal: number;
  createdAt: string;
}

/** Leaderboard entry (aggregated from scores) */
export interface LeaderboardEntry {
  userId: string;
  grade: Grade;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  totalCorrect: number;
  totalProblems: number;
  bestStreak: number;
  gamesPlayed: number;
  rank: number;
}

/** Game session state */
export interface GameSession {
  grade: Grade;
  currentProblem: import("@/lib/math/types").Problem | null;
  score: number;
  streak: number;
  bestStreak: number;
  problemsCorrect: number;
  problemsTotal: number;
  isActive: boolean;
  startedAt: string | null;
}

/** Celebration event types */
export type CelebrationEvent =
  | "correct_answer"
  | "streak_5"
  | "streak_10"
  | "streak_15"
  | "level_complete";

/** Feedback state after answering */
export interface FeedbackState {
  isCorrect: boolean;
  correctAnswer: string;
  userAnswer: string;
  celebration: CelebrationEvent | null;
}

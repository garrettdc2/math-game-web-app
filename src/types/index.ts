/** Grade levels K through 12 */
export type Grade =
  | "K"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12";

/** All available grade levels */
export const GRADES: Grade[] = [
  "K",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

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

/** Math operations supported by the problem engine */
export type Operation =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "counting"
  | "fractions"
  | "decimals"
  | "ratios"
  | "algebra"
  | "geometry";

/** A display token for rendering math problems (3D or 2D) */
export interface DisplayToken {
  type: "number" | "symbol" | "variable" | "fraction";
  value: string;
  /** Position hint for 3D layout */
  position?: { x: number; y: number; z: number };
}

/** A generated math problem */
export interface Problem {
  id: string;
  question: string;
  correctAnswer: string;
  operands: number[];
  operation: Operation;
  displayTokens: DisplayToken[];
  difficulty: number;
}

/** Configuration for problem generation per grade */
export interface GradeConfig {
  grade: Grade;
  label: string;
  operations: Operation[];
  numberRange: { min: number; max: number };
  allowNegatives: boolean;
  allowDecimals: boolean;
  problemTypes: string[];
}

/** Game session state */
export interface GameSession {
  grade: Grade;
  currentProblem: Problem | null;
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

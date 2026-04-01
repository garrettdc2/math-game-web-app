'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { generateProblem } from '@/lib/math/problemGenerator';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  useCelebration,
  type CelebrationState,
  type CelebrationEventType,
} from '@/hooks/useCelebration';

// ---------------------------------------------------------------------------
// Problem type — compatible with both lib/math/types and types/index
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameProblem = Record<string, any> & {
  id: string;
  question: string;
  correctAnswer: number | string;
  operands: number[];
  displayTokens: any[];
  difficulty?: number;
  gradeLevel?: string;
  topic?: string;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedbackKind = 'correct' | 'incorrect' | null;

export interface GameState {
  /** The current math problem being displayed. */
  currentProblem: GameProblem | null;
  /** The selected grade level for this session. */
  grade: string;
  /** Cumulative score for this session. */
  score: number;
  /** Current consecutive-correct streak. */
  streak: number;
  /** Best streak achieved during this session. */
  bestStreak: number;
  /** Number of problems answered correctly. */
  problemsCorrect: number;
  /** Total number of problems attempted. */
  problemsTotal: number;
  /** Whether the game session is actively running. */
  isActive: boolean;
  /** Feedback state after the most recent answer. */
  feedback: FeedbackKind;
  /** Whether we are waiting for the feedback animation to finish. */
  showingFeedback: boolean;
  /** Celebration state (confetti, milestones). */
  celebration: CelebrationState;
  /** Elapsed seconds since session start. */
  elapsedSeconds: number;
  /** Whether a score is currently being saved to the database. */
  isSaving: boolean;
}

export interface UseGameStateReturn extends GameState {
  /** Start a new game session for the given grade. */
  startSession: (grade: string) => void;
  /** Submit an answer for the current problem. */
  submitAnswer: (answer: string) => void;
  /** Advance to the next problem (called after feedback clears). */
  nextProblem: () => void;
  /** End the current session and persist the score. */
  endSession: () => Promise<void>;
  /** Dismiss the celebration overlay manually. */
  dismissCelebration: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Points awarded per correct answer. Bonus points scale with streak. */
function pointsForCorrect(streak: number, difficulty: number): number {
  const base = 10 * difficulty;
  const streakBonus = Math.floor(streak / 3) * 5;
  return base + streakBonus;
}

/** How long (ms) to show correct/incorrect feedback before auto-advancing. */
const FEEDBACK_DURATION_MS = 1500;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameState(): UseGameStateReturn {
  const { user } = useAuth();
  const { state: celebration, trigger: triggerCelebration, dismiss: dismissCelebration } = useCelebration();

  const [grade, setGrade] = useState<string>('');
  const [currentProblem, setCurrentProblem] = useState<GameProblem | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [problemsCorrect, setProblemsCorrect] = useState(0);
  const [problemsTotal, setProblemsTotal] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  // -------------------------------------------------------------------------
  // Timer
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (isActive) {
      sessionStartRef.current = Date.now();
      timerInterval.current = setInterval(() => {
        if (sessionStartRef.current) {
          setElapsedSeconds(Math.floor((Date.now() - sessionStartRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [isActive]);

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Start a new session
  // -------------------------------------------------------------------------

  const startSession = useCallback(
    (selectedGrade: string) => {
      // Reset all state
      setGrade(selectedGrade);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setProblemsCorrect(0);
      setProblemsTotal(0);
      setFeedback(null);
      setShowingFeedback(false);
      setElapsedSeconds(0);
      setIsActive(true);

      // Generate the first problem
      try {
        const problem = generateProblem(selectedGrade as never) as unknown as GameProblem;
        setCurrentProblem(problem);
      } catch {
        // Graceful fallback if grade config is missing
        setCurrentProblem(null);
      }
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Generate next problem
  // -------------------------------------------------------------------------

  const nextProblem = useCallback(() => {
    if (!grade) return;
    setFeedback(null);
    setShowingFeedback(false);

    try {
      const problem = generateProblem(grade as never) as unknown as GameProblem;
      setCurrentProblem(problem);
    } catch {
      setCurrentProblem(null);
    }
  }, [grade]);

  // -------------------------------------------------------------------------
  // Submit answer
  // -------------------------------------------------------------------------

  const submitAnswer = useCallback(
    (answer: string) => {
      if (!currentProblem || showingFeedback || !isActive) return;

      const trimmed = answer.trim();
      if (!trimmed) return;

      // Evaluate correctness: compare as numbers if possible, else strings
      const correctAnswer = currentProblem.correctAnswer;
      let isCorrect = false;

      if (typeof correctAnswer === 'number') {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed)) {
          // Allow small floating-point tolerance
          isCorrect = Math.abs(parsed - correctAnswer) < 0.01;
        }
      } else {
        // String comparison (case-insensitive, trimmed)
        const expected = String(correctAnswer).trim().toLowerCase();
        isCorrect = trimmed.toLowerCase() === expected;

        // Also try numeric comparison for string answers that are numbers
        const parsedExpected = parseFloat(expected);
        const parsedAnswer = parseFloat(trimmed);
        if (!isNaN(parsedExpected) && !isNaN(parsedAnswer)) {
          isCorrect = isCorrect || Math.abs(parsedAnswer - parsedExpected) < 0.01;
        }
      }

      setProblemsTotal((prev) => prev + 1);

      if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak((prev) => Math.max(prev, newStreak));
        setProblemsCorrect((prev) => prev + 1);
        setScore((prev) => prev + pointsForCorrect(newStreak, currentProblem.difficulty ?? 1));
        setFeedback('correct');

        // Trigger celebration events
        triggerCelebration('correct');

        // Check for streak milestones
        if (newStreak === 5) triggerCelebration('streak_5');
        else if (newStreak === 10) triggerCelebration('streak_10');
        else if (newStreak === 15) triggerCelebration('streak_15');
      } else {
        setStreak(0);
        setFeedback('incorrect');
        triggerCelebration('incorrect');
      }

      setShowingFeedback(true);

      // Auto-advance after feedback duration
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => {
        nextProblem();
      }, FEEDBACK_DURATION_MS);
    },
    [currentProblem, showingFeedback, isActive, streak, triggerCelebration, nextProblem],
  );

  // -------------------------------------------------------------------------
  // End session — persist score to Supabase
  // -------------------------------------------------------------------------

  const endSession = useCallback(async () => {
    if (!isActive) return;

    setIsActive(false);

    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }

    // Persist score if user is authenticated and they answered at least one problem
    if (user && problemsTotal > 0) {
      setIsSaving(true);
      try {
        const supabase = createClient();
        await supabase.from('scores').insert({
          user_id: user.id,
          grade,
          score,
          streak: bestStreak,
          problems_correct: problemsCorrect,
          problems_total: problemsTotal,
        });
      } catch {
        // Silently handle — the score can be lost on network errors.
        // A future enhancement could add offline persistence.
      } finally {
        setIsSaving(false);
      }
    }
  }, [isActive, user, problemsTotal, grade, score, bestStreak, problemsCorrect]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    currentProblem,
    grade,
    score,
    streak,
    bestStreak,
    problemsCorrect,
    problemsTotal,
    isActive,
    feedback,
    showingFeedback,
    celebration,
    elapsedSeconds,
    isSaving,
    startSession,
    submitAnswer,
    nextProblem,
    endSession,
    dismissCelebration,
  };
}

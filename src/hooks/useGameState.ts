'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Grade, Problem } from '@/lib/math/types';
import { generateProblem, checkAnswer } from '@/lib/math/problemGenerator';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import {
  useCelebration,
  type CelebrationState,
  type CelebrationEventType,
} from '@/hooks/useCelebration';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeedbackKind = 'correct' | 'incorrect' | null;

export interface GameState {
  /** The current math problem being displayed. */
  currentProblem: Problem | null;
  /** The selected grade level for this session. */
  grade: Grade | null;
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
  /** Error message when score saving fails, or null. */
  saveError: string | null;
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
function pointsForCorrect(streak: number): number {
  const base = 10;
  const streakBonus = Math.floor(streak / 3) * 5;
  return base + streakBonus;
}

/** How long (ms) to show correct/incorrect feedback before auto-advancing. */
const FEEDBACK_DURATION_MS = 1500;

/** All valid grade strings for runtime validation. */
const VALID_GRADES = new Set<string>([
  'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
]);

/** Validate and cast a string to the Grade type. Returns null if invalid. */
function toGrade(value: string): Grade | null {
  return VALID_GRADES.has(value) ? (value as Grade) : null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGameState(): UseGameStateReturn {
  const { user } = useAuth();
  const { state: celebration, trigger: triggerCelebration, dismiss: dismissCelebration } = useCelebration();

  const [grade, setGrade] = useState<Grade | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
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
  const [saveError, setSaveError] = useState<string | null>(null);

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
      const validGrade = toGrade(selectedGrade);
      if (!validGrade) return;

      // Reset all state
      setGrade(validGrade);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setProblemsCorrect(0);
      setProblemsTotal(0);
      setFeedback(null);
      setShowingFeedback(false);
      setElapsedSeconds(0);
      setIsActive(true);
      setSaveError(null);

      // Generate the first problem
      try {
        const problem = generateProblem(validGrade);
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
      const problem = generateProblem(grade);
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

      // Parse user's answer as a number
      const parsed = parseFloat(trimmed);
      // Use the problem's own tolerance for comparison (e.g. 0 for integers,
      // 0.01 for decimals, 0.5 for geometry/trig). Falls back to 0.01 if
      // tolerance is somehow missing.
      const isCorrect = !isNaN(parsed) && checkAnswer(currentProblem, parsed);

      setProblemsTotal((prev) => prev + 1);

      if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setBestStreak((prev) => Math.max(prev, newStreak));
        setProblemsCorrect((prev) => prev + 1);
        setScore((prev) => prev + pointsForCorrect(newStreak));
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
    setSaveError(null);

    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }

    // Persist score if user is authenticated and they answered at least one problem
    if (user && problemsTotal > 0 && grade) {
      setIsSaving(true);
      try {
        const supabase = createClient();
        const row: Database['public']['Tables']['scores']['Insert'] = {
          user_id: user.id,
          grade,
          score,
          streak: bestStreak,
          problems_correct: problemsCorrect,
          problems_total: problemsTotal,
        };
        // NOTE: The Supabase client generic resolution has a known issue with
        // @supabase/ssr 0.5.x + supabase-js 2.101 that causes Insert to resolve
        // to `never`. We explicitly type `row` above and cast here to work around.
        const { error } = await (supabase.from('scores') as unknown as {
          insert: (values: typeof row) => Promise<{ error: { message: string } | null }>;
        }).insert(row);
        if (error) {
          setSaveError('Failed to save your score. Please try again later.');
        }
      } catch {
        setSaveError('Network error — your score could not be saved.');
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
    saveError,
    startSession,
    submitAnswer,
    nextProblem,
    endSession,
    dismissCelebration,
  };
}

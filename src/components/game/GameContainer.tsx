'use client';

import { useCallback } from 'react';
import { useWebGPU } from '@/hooks/useWebGPU';
import { useGameState } from '@/hooks/useGameState';
import ProblemDisplay3D from '@/components/game/ProblemDisplay3D';
import ProblemDisplay2D from '@/components/game/ProblemDisplay2D';
import AnswerInput from '@/components/game/AnswerInput';
import FeedbackOverlay from '@/components/game/FeedbackOverlay';
import GameHUD from '@/components/game/GameHUD';
import CelebrationManager from '@/components/celebrations/CelebrationManager';
import GradeSelector, { type GradeLevel } from '@/components/shared/GradeSelector';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GameContainer — orchestrates the full game play UI.
 *
 * Manages two screens:
 * 1. **Pre-game**: Grade selection prompt (if no grade is selected yet).
 * 2. **In-game**: HUD + problem display (3D or 2D) + answer input + feedback
 *    overlay + celebration effects.
 *
 * The 3D/2D display mode is determined automatically by the `useWebGPU` hook:
 * - WebGPU or WebGL → `ProblemDisplay3D`
 * - Neither → `ProblemDisplay2D`
 */
export default function GameContainer() {
  const { renderMode, loading: gpuLoading } = useWebGPU();
  const game = useGameState();

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleGradeSelect = useCallback(
    (grade: GradeLevel) => {
      game.startSession(grade);
    },
    [game],
  );

  const handleEndSession = useCallback(async () => {
    await game.endSession();
  }, [game]);

  // -------------------------------------------------------------------------
  // Pre-game screen — grade selection
  // -------------------------------------------------------------------------

  if (!game.isActive) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Post-session summary */}
        {game.problemsTotal > 0 && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-6 text-center">
            <h2 className="mb-4 text-2xl font-bold text-white">
              Session Complete!
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-sm text-gray-400">Final Score</div>
                <div className="text-2xl font-bold text-purple-400">
                  {game.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Accuracy</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {game.problemsTotal > 0
                    ? Math.round(
                        (game.problemsCorrect / game.problemsTotal) * 100,
                      )
                    : 0}
                  %
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Best Streak</div>
                <div className="text-2xl font-bold text-amber-400">
                  {game.bestStreak}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Problems</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {game.problemsCorrect}/{game.problemsTotal}
                </div>
              </div>
            </div>
            {game.isSaving && (
              <p className="mt-3 text-sm text-gray-500">Saving score...</p>
            )}
          </div>
        )}

        {/* Grade selection */}
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-white">
            {game.problemsTotal > 0 ? 'Play Again?' : 'Choose Your Grade'}
          </h2>
          <p className="mb-6 text-gray-400">
            Select a grade level to start solving math problems.
          </p>
          <GradeSelector onSelect={handleGradeSelect} />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // In-game screen
  // -------------------------------------------------------------------------

  const use3D = renderMode !== '2d' && !gpuLoading;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
      {/* HUD */}
      <GameHUD
        score={game.score}
        streak={game.streak}
        problemsCorrect={game.problemsCorrect}
        problemsTotal={game.problemsTotal}
        elapsedSeconds={game.elapsedSeconds}
        onEndSession={handleEndSession}
      />

      {/* Problem Display */}
      {game.currentProblem ? (
        <>
          {/* Question text for accessibility / context */}
          <div className="text-center">
            <span className="inline-block rounded-lg bg-white/5 px-4 py-1.5 text-sm text-gray-400">
              {(game.currentProblem.topic ?? 'math').replace(/_/g, ' ')} — Difficulty{' '}
              {game.currentProblem.difficulty ?? 1}/5
            </span>
          </div>

          {/* 3D or 2D renderer */}
          {gpuLoading ? (
            <div className="flex h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 sm:h-[400px]">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
            </div>
          ) : use3D ? (
            <ProblemDisplay3D
              tokens={game.currentProblem.displayTokens}
              answered={game.showingFeedback}
              feedback={game.feedback}
            />
          ) : (
            <ProblemDisplay2D
              tokens={game.currentProblem.displayTokens}
              answered={game.showingFeedback}
              feedback={game.feedback}
            />
          )}

          {/* Feedback Overlay */}
          <FeedbackOverlay
            feedback={game.feedback}
            correctAnswer={game.currentProblem.correctAnswer}
          />

          {/* Answer Input */}
          <AnswerInput
            onSubmit={game.submitAnswer}
            disabled={game.showingFeedback}
            resetKey={game.currentProblem.id}
          />
        </>
      ) : (
        <div className="flex h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <p className="text-gray-500">
            Unable to generate problems for this grade level.
          </p>
        </div>
      )}

      {/* Celebration Effects */}
      <CelebrationManager
        celebration={game.celebration}
        onMilestoneDismiss={game.dismissCelebration}
      />
    </div>
  );
}

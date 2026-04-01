'use client';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GameHUDProps {
  /** Cumulative score for this session. */
  score: number;
  /** Current consecutive-correct streak. */
  streak: number;
  /** Number of problems answered correctly. */
  problemsCorrect: number;
  /** Total number of problems attempted. */
  problemsTotal: number;
  /** Elapsed seconds since session start. */
  elapsedSeconds: number;
  /** Callback to end the session. */
  onEndSession: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GameHUD — Heads-Up Display showing live game stats during a play session.
 *
 * Displays:
 * - Score with animated counting feel
 * - Current streak (with fire emoji at 5+)
 * - Accuracy percentage
 * - Timer
 * - End Session button
 *
 * Responsive: collapses to a compact row on small screens.
 */
export default function GameHUD({
  score,
  streak,
  problemsCorrect,
  problemsTotal,
  elapsedSeconds,
  onEndSession,
}: GameHUDProps) {
  const accuracy =
    problemsTotal > 0
      ? Math.round((problemsCorrect / problemsTotal) * 100)
      : 0;

  const streakLabel =
    streak >= 15
      ? `${streak} 🌟`
      : streak >= 10
        ? `${streak} ⚡`
        : streak >= 5
          ? `${streak} 🔥`
          : String(streak);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm sm:px-6">
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {/* Score */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Score
          </span>
          <span className="text-lg font-bold text-purple-400 tabular-nums sm:text-xl">
            {score.toLocaleString()}
          </span>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Streak
          </span>
          <span
            className={`text-lg font-bold tabular-nums sm:text-xl ${
              streak >= 5 ? 'text-amber-400' : 'text-white'
            }`}
          >
            {streakLabel}
          </span>
        </div>

        {/* Accuracy */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Accuracy
          </span>
          <span className="text-lg font-bold text-emerald-400 tabular-nums sm:text-xl">
            {accuracy}%
          </span>
        </div>

        {/* Progress */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Problems
          </span>
          <span className="text-lg font-bold text-cyan-400 tabular-nums sm:text-xl">
            {problemsCorrect}/{problemsTotal}
          </span>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            Time
          </span>
          <span className="text-lg font-bold text-gray-300 tabular-nums sm:text-xl">
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* End Session Button */}
      <button
        onClick={onEndSession}
        className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
      >
        End Session
      </button>
    </div>
  );
}

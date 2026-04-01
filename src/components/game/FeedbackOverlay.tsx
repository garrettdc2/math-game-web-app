'use client';

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FeedbackOverlayProps {
  /** The type of feedback to show, or null when idle. */
  feedback: 'correct' | 'incorrect' | null;
  /** The correct answer to display when the user is wrong. */
  correctAnswer?: string | number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FeedbackOverlay — displays immediate visual feedback after the user
 * submits an answer.
 *
 * - **Correct**: Green checkmark with "Correct!" message and a subtle pulse.
 * - **Incorrect**: Red X with "Incorrect" message and the correct answer.
 *
 * Animates in/out with scale + opacity transitions. Uses Tailwind only
 * (no external CSS files).
 */
export default function FeedbackOverlay({
  feedback,
  correctAnswer,
}: FeedbackOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (feedback) {
      setVisible(true);
    } else {
      // Small delay to allow exit animation
      const timer = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  if (!visible && !feedback) return null;

  const isCorrect = feedback === 'correct';

  return (
    <div
      className={`flex flex-col items-center gap-2 py-4 transition-all duration-300 ${
        feedback ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
      }`}
      role="status"
      aria-live="assertive"
    >
      {/* Icon */}
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          isCorrect
            ? 'bg-green-500/20 text-green-400'
            : 'bg-red-500/20 text-red-400'
        }`}
      >
        {isCorrect ? (
          <svg
            className="h-8 w-8 animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </div>

      {/* Message */}
      <p
        className={`text-xl font-bold ${
          isCorrect ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {isCorrect ? 'Correct!' : 'Incorrect'}
      </p>

      {/* Show correct answer on wrong response */}
      {!isCorrect && correctAnswer !== undefined && (
        <p className="text-sm text-gray-400">
          The answer was{' '}
          <span className="font-semibold text-white">{String(correctAnswer)}</span>
        </p>
      )}
    </div>
  );
}

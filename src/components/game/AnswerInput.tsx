'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnswerInputProps {
  /** Called when the user submits their answer. */
  onSubmit: (answer: string) => void;
  /** Whether input is disabled (e.g. during feedback animation). */
  disabled?: boolean;
  /** Clear the input field when this key changes (new problem). */
  resetKey?: string | number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AnswerInput — a responsive answer submission form for the math game.
 *
 * Features:
 * - Auto-focuses on mount and when a new problem appears
 * - Submits on Enter key or button click
 * - Supports numeric and text input (for complex answer types)
 * - Mobile-friendly with `inputMode="decimal"` for numeric keyboard
 * - Visual disabled state during feedback
 */
export default function AnswerInput({
  onSubmit,
  disabled = false,
  resetKey,
}: AnswerInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear and re-focus when resetKey changes (new problem loaded)
  useEffect(() => {
    setValue('');
    if (!disabled) {
      // Small delay to ensure the DOM has updated
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [resetKey, disabled]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && !disabled) {
        onSubmit(trimmed);
      }
    },
    [value, disabled, onSubmit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed && !disabled) {
          onSubmit(trimmed);
        }
      }
    },
    [value, disabled, onSubmit],
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={disabled ? '...' : 'Your answer'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`w-full rounded-xl border bg-white/5 px-5 py-3.5 text-center text-lg font-semibold text-white placeholder-gray-500 outline-none transition-all ${
              disabled
                ? 'cursor-not-allowed border-white/5 opacity-50'
                : 'border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20'
            }`}
            aria-label="Answer input"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={`flex-shrink-0 rounded-xl px-6 py-3.5 text-base font-semibold transition-all ${
            disabled || !value.trim()
              ? 'cursor-not-allowed bg-gray-700 text-gray-500'
              : 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 active:scale-95'
          }`}
          aria-label="Submit answer"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}

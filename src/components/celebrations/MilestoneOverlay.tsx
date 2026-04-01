'use client';

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MilestoneOverlayProps {
  /** Whether the overlay should be visible. */
  show: boolean;
  /** The message to display (includes emoji). */
  message: string;
  /** Called when the exit animation finishes. */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A full-screen translucent overlay that displays milestone / achievement
 * messages with an animated entrance and exit.
 *
 * Uses Tailwind CSS classes + inline keyframe animations so no external
 * CSS file is required.
 */
export default function MilestoneOverlay({
  show,
  message,
  onDismiss,
}: MilestoneOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);

  // Enter
  useEffect(() => {
    if (show) {
      setVisible(true);
      setAnimatingOut(false);
    } else if (visible) {
      // Begin exit animation
      setAnimatingOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setAnimatingOut(false);
        onDismiss?.();
      }, 500); // match exit animation duration
      return () => clearTimeout(timer);
    }
  }, [show, visible, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      aria-live="polite"
      role="status"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-500 ${
          animatingOut ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Message card */}
      <div
        className={`relative flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-purple-600/90 to-indigo-700/90 px-10 py-8 shadow-2xl backdrop-blur-md ${
          animatingOut ? 'animate-milestone-exit' : 'animate-milestone-enter'
        }`}
      >
        <span className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-lg text-center leading-tight">
          {message}
        </span>

        {/* Decorative pulsing ring */}
        <span className="absolute -inset-2 rounded-3xl border-2 border-white/30 animate-ping-slow" />
      </div>

      {/* Inline keyframes — rendered once, deduped by the browser. */}
      <style jsx>{`
        @keyframes milestone-enter {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(30px);
          }
          60% {
            opacity: 1;
            transform: scale(1.08) translateY(-5px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
        @keyframes milestone-exit {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) translateY(-40px);
          }
        }
        @keyframes ping-slow {
          0% {
            opacity: 0.6;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1.15);
          }
        }
        .animate-milestone-enter {
          animation: milestone-enter 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-milestone-exit {
          animation: milestone-exit 0.5s ease-in forwards;
        }
        .animate-ping-slow {
          animation: ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}

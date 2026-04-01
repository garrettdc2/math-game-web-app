'use client';

import { useCallback, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CelebrationEventType =
  | 'correct'
  | 'incorrect'
  | 'streak_5'
  | 'streak_10'
  | 'streak_15'
  | 'level_complete';

export interface CelebrationEvent {
  type: CelebrationEventType;
  timestamp: number;
}

export interface CelebrationState {
  /** Whether a celebration is currently active (visual effects visible). */
  isActive: boolean;
  /** The current/most-recent celebration event, or null when idle. */
  currentEvent: CelebrationEvent | null;
  /** Whether the milestone overlay is currently showing. */
  showMilestone: boolean;
  /** Message displayed in the milestone overlay. */
  milestoneMessage: string;
}

interface UseCelebrationReturn {
  state: CelebrationState;
  /** Fire a celebration event — triggers visuals + sound. */
  trigger: (type: CelebrationEventType) => void;
  /** Manually dismiss the current celebration. */
  dismiss: () => void;
}

// ---------------------------------------------------------------------------
// Milestone helpers
// ---------------------------------------------------------------------------

const MILESTONE_EVENTS: Set<CelebrationEventType> = new Set([
  'streak_5',
  'streak_10',
  'streak_15',
  'level_complete',
]);

function milestoneMessage(type: CelebrationEventType): string {
  switch (type) {
    case 'streak_5':
      return '🔥 5 in a row! Keep it up!';
    case 'streak_10':
      return '⚡ 10 streak! You\'re on fire!';
    case 'streak_15':
      return '🌟 15 streak! Unstoppable!';
    case 'level_complete':
      return '🏆 Level Complete! Amazing work!';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Durations (ms)
// ---------------------------------------------------------------------------

/** How long the confetti / feedback overlay stays visible. */
const CELEBRATION_DURATION_MS = 2000;
/** How long the milestone overlay stays visible. */
const MILESTONE_DURATION_MS = 3000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCelebration(): UseCelebrationReturn {
  const [state, setState] = useState<CelebrationState>({
    isActive: false,
    currentEvent: null,
    showMilestone: false,
    milestoneMessage: '',
  });

  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    if (milestoneTimer.current) clearTimeout(milestoneTimer.current);

    setState({
      isActive: false,
      currentEvent: null,
      showMilestone: false,
      milestoneMessage: '',
    });
  }, []);

  const trigger = useCallback(
    (type: CelebrationEventType) => {
      // Clear any running timers from a previous celebration.
      if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
      if (milestoneTimer.current) clearTimeout(milestoneTimer.current);

      const event: CelebrationEvent = { type, timestamp: Date.now() };
      const isMilestone = MILESTONE_EVENTS.has(type);

      setState({
        isActive: true,
        currentEvent: event,
        showMilestone: isMilestone,
        milestoneMessage: isMilestone ? milestoneMessage(type) : '',
      });

      // Auto-dismiss celebration visual after duration.
      celebrationTimer.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          isActive: false,
          currentEvent: null,
        }));
      }, CELEBRATION_DURATION_MS);

      // Auto-dismiss milestone overlay (slightly longer).
      if (isMilestone) {
        milestoneTimer.current = setTimeout(() => {
          setState((prev) => ({
            ...prev,
            showMilestone: false,
            milestoneMessage: '',
          }));
        }, MILESTONE_DURATION_MS);
      }
    },
    [],
  );

  return { state, trigger, dismiss };
}

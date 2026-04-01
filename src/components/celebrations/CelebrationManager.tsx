'use client';

import { useEffect, useRef } from 'react';
import ConfettiEffect from '@/components/celebrations/ConfettiEffect';
import MilestoneOverlay from '@/components/celebrations/MilestoneOverlay';
import { playSound } from '@/lib/audio/sounds';
import type { CelebrationEventType, CelebrationState } from '@/hooks/useCelebration';

// ---------------------------------------------------------------------------
// Map celebration events → sound names
// ---------------------------------------------------------------------------

function soundForEvent(
  type: CelebrationEventType,
): 'correct' | 'incorrect' | 'milestone' | null {
  switch (type) {
    case 'correct':
      return 'correct';
    case 'incorrect':
      return 'incorrect';
    case 'streak_5':
    case 'streak_10':
    case 'streak_15':
    case 'level_complete':
      return 'milestone';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CelebrationManagerProps {
  /** Celebration state from the `useCelebration` hook. */
  celebration: CelebrationState;
  /** Called when the milestone overlay finishes its exit animation. */
  onMilestoneDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Orchestrates all celebration effects.
 *
 * Drop this component anywhere in the game UI tree and pass in the state
 * from `useCelebration()`.  It handles:
 *
 * 1. **Confetti** — visual particle bursts on correct answers & milestones.
 * 2. **Milestone overlay** — animated message for streak / level achievements.
 * 3. **Sound effects** — plays the appropriate sound via howler.js.
 *
 * This component does not own any celebration state — it is fully driven by
 * props, making it easy to test and integrate.
 */
export default function CelebrationManager({
  celebration,
  onMilestoneDismiss,
}: CelebrationManagerProps) {
  const triggerCounter = useRef(0);
  const lastEventTimestamp = useRef<number>(0);

  // Play sound whenever a new celebration event fires.
  useEffect(() => {
    const event = celebration.currentEvent;
    if (!event) return;
    if (event.timestamp === lastEventTimestamp.current) return; // dedupe

    lastEventTimestamp.current = event.timestamp;
    triggerCounter.current += 1;

    const soundName = soundForEvent(event.type);
    if (soundName) {
      playSound(soundName);
    }
  }, [celebration.currentEvent]);

  const eventType: CelebrationEventType | null =
    celebration.currentEvent?.type ?? null;

  return (
    <>
      {/* Confetti particles (correct answers + milestones, not incorrect) */}
      <ConfettiEffect
        eventType={eventType !== 'incorrect' ? eventType : null}
        triggerKey={triggerCounter.current}
      />

      {/* Milestone achievement overlay */}
      <MilestoneOverlay
        show={celebration.showMilestone}
        message={celebration.milestoneMessage}
        onDismiss={onMilestoneDismiss}
      />
    </>
  );
}

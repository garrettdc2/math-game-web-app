'use client';

import { useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type { CelebrationEventType } from '@/hooks/useCelebration';

// ---------------------------------------------------------------------------
// Confetti presets per event type
// ---------------------------------------------------------------------------

function fireCorrectConfetti(): void {
  // A modest burst from the bottom-center.
  confetti({
    particleCount: 60,
    spread: 55,
    origin: { y: 0.7 },
    colors: ['#22c55e', '#4ade80', '#86efac'], // greens
    disableForReducedMotion: true,
  });
}

function fireStreakConfetti(intensity: 'medium' | 'high' | 'extreme'): void {
  const counts: Record<typeof intensity, number> = {
    medium: 100,
    high: 150,
    extreme: 250,
  };

  const count = counts[intensity];

  // Left burst
  confetti({
    particleCount: Math.floor(count / 2),
    angle: 60,
    spread: 70,
    origin: { x: 0, y: 0.6 },
    colors: ['#facc15', '#f59e0b', '#fb923c', '#ef4444', '#8b5cf6'],
    disableForReducedMotion: true,
  });

  // Right burst
  confetti({
    particleCount: Math.floor(count / 2),
    angle: 120,
    spread: 70,
    origin: { x: 1, y: 0.6 },
    colors: ['#facc15', '#f59e0b', '#fb923c', '#ef4444', '#8b5cf6'],
    disableForReducedMotion: true,
  });
}

function fireLevelCompleteConfetti(): void {
  // Big celebration — three waves.
  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0.4,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#facc15', '#22d3ee', '#a78bfa', '#f472b6', '#34d399'],
    disableForReducedMotion: true,
  };

  const shoot = (delay: number, particleCount: number) => {
    setTimeout(() => {
      confetti({
        ...defaults,
        particleCount,
        origin: { x: Math.random() * 0.4 + 0.3, y: Math.random() * 0.3 + 0.2 },
      });
    }, delay);
  };

  shoot(0, 80);
  shoot(200, 60);
  shoot(400, 80);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ConfettiEffectProps {
  eventType: CelebrationEventType | null;
  /** Incremented each time a new celebration fires — ensures re-trigger. */
  triggerKey: number;
}

export default function ConfettiEffect({ eventType, triggerKey }: ConfettiEffectProps) {
  const lastKey = useRef<number>(-1);

  const fire = useCallback((type: CelebrationEventType) => {
    switch (type) {
      case 'correct':
        fireCorrectConfetti();
        break;
      case 'streak_5':
        fireStreakConfetti('medium');
        break;
      case 'streak_10':
        fireStreakConfetti('high');
        break;
      case 'streak_15':
        fireStreakConfetti('extreme');
        break;
      case 'level_complete':
        fireLevelCompleteConfetti();
        break;
      // 'incorrect' intentionally has no confetti.
      default:
        break;
    }
  }, []);

  useEffect(() => {
    if (eventType && triggerKey !== lastKey.current) {
      lastKey.current = triggerKey;
      fire(eventType);
    }
  }, [eventType, triggerKey, fire]);

  // canvas-confetti manages its own <canvas>; nothing to render here.
  return null;
}

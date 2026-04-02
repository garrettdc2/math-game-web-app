'use client';

/**
 * Audio / Sound-effect manager.
 *
 * Uses howler.js for cross-browser audio playback.  All sounds are lazily
 * loaded — the Howl instance is only created the first time the sound is
 * requested — which keeps the initial bundle small and respects browser
 * autoplay policies (sounds will only play after a user gesture).
 */

import { Howl } from 'howler';

// ---------------------------------------------------------------------------
// Sound registry
// ---------------------------------------------------------------------------

export type SoundName = 'correct' | 'incorrect' | 'milestone';

interface SoundDef {
  src: string[];
  volume: number;
}

const SOUND_DEFS: Record<SoundName, SoundDef> = {
  correct: {
    src: ['/sounds/correct.wav', '/sounds/correct.mp3'],
    volume: 0.6,
  },
  incorrect: {
    src: ['/sounds/incorrect.wav', '/sounds/incorrect.mp3'],
    volume: 0.4,
  },
  milestone: {
    src: ['/sounds/milestone.wav', '/sounds/milestone.mp3'],
    volume: 0.8,
  },
};

// ---------------------------------------------------------------------------
// Lazy-loaded Howl cache
// ---------------------------------------------------------------------------

const howlCache = new Map<SoundName, Howl>();

function getHowl(name: SoundName): Howl {
  let howl = howlCache.get(name);
  if (!howl) {
    const def = SOUND_DEFS[name];
    howl = new Howl({
      src: def.src,
      volume: def.volume,
      preload: false, // only load when first played
      html5: true,    // better mobile compatibility
    });
    howlCache.set(name, howl);
  }
  return howl;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Whether the user has opted-in to sounds (default: true). */
let _soundEnabled = true;

/**
 * Play a named sound effect.
 *
 * The first call for each sound triggers the lazy download.  Subsequent
 * calls reuse the cached Howl instance.  No-ops silently when sounds are
 * disabled or when called before a user gesture (browser blocks autoplay).
 */
export function playSound(name: SoundName): void {
  if (!_soundEnabled) return;

  try {
    const howl = getHowl(name);
    howl.play();
  } catch {
    // Silently swallow — e.g. if the file 404s or autoplay is blocked.
  }
}

/** Enable or disable all sound effects globally. */
export function setSoundEnabled(enabled: boolean): void {
  _soundEnabled = enabled;

  // When muting, stop all currently playing sounds.
  if (!enabled) {
    howlCache.forEach((howl) => howl.stop());
  }
}

/** Returns whether sounds are currently enabled. */
export function isSoundEnabled(): boolean {
  return _soundEnabled;
}

/**
 * Preload all sounds (call after a user gesture to avoid autoplay issues).
 * This is optional — sounds will lazy-load on first play regardless.
 */
export function preloadAllSounds(): void {
  (Object.keys(SOUND_DEFS) as SoundName[]).forEach((name) => {
    const howl = getHowl(name);
    if (howl.state() === 'unloaded') {
      howl.load();
    }
  });
}

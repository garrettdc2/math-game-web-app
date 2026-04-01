// The sounds module caches Howl instances at module level, so we need
// to isolate each test by resetting the module registry.

let playSound: typeof import('../sounds').playSound;
let setSoundEnabled: typeof import('../sounds').setSoundEnabled;
let isSoundEnabled: typeof import('../sounds').isSoundEnabled;
let preloadAllSounds: typeof import('../sounds').preloadAllSounds;

const mockPlay = jest.fn();
const mockStop = jest.fn();
const mockLoad = jest.fn();
const mockState = jest.fn().mockReturnValue('unloaded');

jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation(() => ({
    play: mockPlay,
    stop: mockStop,
    load: mockLoad,
    state: mockState,
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockState.mockReturnValue('unloaded');

  // Re-import the module fresh to reset the cache
  jest.resetModules();
  // Re-apply the mock after reset
  jest.mock('howler', () => ({
    Howl: jest.fn().mockImplementation(() => ({
      play: mockPlay,
      stop: mockStop,
      load: mockLoad,
      state: mockState,
    })),
  }));

  const mod = require('../sounds');
  playSound = mod.playSound;
  setSoundEnabled = mod.setSoundEnabled;
  isSoundEnabled = mod.isSoundEnabled;
  preloadAllSounds = mod.preloadAllSounds;
});

describe('sounds', () => {
  describe('isSoundEnabled / setSoundEnabled', () => {
    it('returns true by default', () => {
      expect(isSoundEnabled()).toBe(true);
    });

    it('can be disabled', () => {
      setSoundEnabled(false);
      expect(isSoundEnabled()).toBe(false);
    });

    it('can be re-enabled', () => {
      setSoundEnabled(false);
      setSoundEnabled(true);
      expect(isSoundEnabled()).toBe(true);
    });

    it('stops all sounds when disabled', () => {
      // Play a sound first to create a Howl instance in cache
      playSound('correct');
      jest.clearAllMocks();

      setSoundEnabled(false);
      expect(mockStop).toHaveBeenCalled();
    });
  });

  describe('playSound', () => {
    it('plays a sound when enabled', () => {
      playSound('correct');
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });

    it('does not play when sounds are disabled', () => {
      setSoundEnabled(false);
      jest.clearAllMocks();
      playSound('correct');
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('creates Howl instances with correct paths', () => {
      const { Howl } = require('howler');

      playSound('correct');
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/sounds/correct.mp3'],
          volume: 0.6,
        }),
      );

      playSound('incorrect');
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/sounds/incorrect.mp3'],
          volume: 0.4,
        }),
      );

      playSound('milestone');
      expect(Howl).toHaveBeenCalledWith(
        expect.objectContaining({
          src: ['/sounds/milestone.mp3'],
          volume: 0.8,
        }),
      );
    });

    it('reuses cached Howl on subsequent calls', () => {
      const { Howl } = require('howler');

      playSound('correct');
      playSound('correct');
      playSound('correct');

      // Howl constructor called only once for 'correct'
      expect(Howl).toHaveBeenCalledTimes(1);
      expect(mockPlay).toHaveBeenCalledTimes(3);
    });

    it('swallows errors from play() gracefully', () => {
      mockPlay.mockImplementationOnce(() => {
        throw new Error('Autoplay blocked');
      });
      expect(() => playSound('correct')).not.toThrow();
    });
  });

  describe('preloadAllSounds', () => {
    it('creates and loads all three sounds', () => {
      const { Howl } = require('howler');

      preloadAllSounds();

      expect(Howl).toHaveBeenCalledTimes(3);
      expect(mockLoad).toHaveBeenCalledTimes(3);
    });

    it('does not reload already loaded sounds', () => {
      mockState.mockReturnValue('loaded');
      preloadAllSounds();

      expect(mockLoad).not.toHaveBeenCalled();
    });
  });
});

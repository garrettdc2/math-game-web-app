import { renderHook, act } from '@testing-library/react';
import { useCelebration, type CelebrationEventType } from '../useCelebration';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useCelebration', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useCelebration());
    expect(result.current.state.isActive).toBe(false);
    expect(result.current.state.currentEvent).toBeNull();
    expect(result.current.state.showMilestone).toBe(false);
    expect(result.current.state.milestoneMessage).toBe('');
  });

  describe('trigger', () => {
    it('activates celebration for "correct" event', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('correct'));

      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.currentEvent?.type).toBe('correct');
      expect(result.current.state.showMilestone).toBe(false);
    });

    it('activates celebration for "incorrect" event', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('incorrect'));

      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.currentEvent?.type).toBe('incorrect');
      expect(result.current.state.showMilestone).toBe(false);
    });

    it.each<[CelebrationEventType, string]>([
      ['streak_5', '🔥 5 in a row! Keep it up!'],
      ['streak_10', '⚡ 10 streak! You\'re on fire!'],
      ['streak_15', '🌟 15 streak! Unstoppable!'],
      ['level_complete', '🏆 Level Complete! Amazing work!'],
    ])('shows milestone overlay for "%s" with correct message', (type, expectedMsg) => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger(type));

      expect(result.current.state.isActive).toBe(true);
      expect(result.current.state.showMilestone).toBe(true);
      expect(result.current.state.milestoneMessage).toBe(expectedMsg);
    });

    it('records timestamp on event', () => {
      const before = Date.now();
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('correct'));
      const after = Date.now();

      const ts = result.current.state.currentEvent?.timestamp ?? 0;
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('auto-dismiss timings', () => {
    it('auto-dismisses celebration visual after 2000ms', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('correct'));

      expect(result.current.state.isActive).toBe(true);

      act(() => jest.advanceTimersByTime(2000));

      expect(result.current.state.isActive).toBe(false);
      expect(result.current.state.currentEvent).toBeNull();
    });

    it('auto-dismisses milestone overlay after 3000ms', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('streak_5'));

      expect(result.current.state.showMilestone).toBe(true);

      act(() => jest.advanceTimersByTime(3000));

      expect(result.current.state.showMilestone).toBe(false);
      expect(result.current.state.milestoneMessage).toBe('');
    });

    it('non-milestone events do not show milestone overlay', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('correct'));

      // Even after waiting, milestone should never appear
      expect(result.current.state.showMilestone).toBe(false);
      act(() => jest.advanceTimersByTime(5000));
      expect(result.current.state.showMilestone).toBe(false);
    });
  });

  describe('dismiss', () => {
    it('manually dismisses an active celebration', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('streak_10'));

      expect(result.current.state.isActive).toBe(true);

      act(() => result.current.dismiss());

      expect(result.current.state.isActive).toBe(false);
      expect(result.current.state.currentEvent).toBeNull();
      expect(result.current.state.showMilestone).toBe(false);
      expect(result.current.state.milestoneMessage).toBe('');
    });

    it('is safe to call when no celebration is active', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.dismiss());
      expect(result.current.state.isActive).toBe(false);
    });
  });

  describe('rapid re-triggering', () => {
    it('replaces a running celebration with a new one', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('correct'));
      const firstTimestamp = result.current.state.currentEvent?.timestamp;

      // Trigger again immediately
      act(() => {
        jest.advanceTimersByTime(500);
        result.current.trigger('streak_5');
      });

      expect(result.current.state.currentEvent?.type).toBe('streak_5');
      expect(result.current.state.showMilestone).toBe(true);
    });

    it('clears old timers when re-triggered', () => {
      const { result } = renderHook(() => useCelebration());
      act(() => result.current.trigger('correct'));

      // Re-trigger before auto-dismiss
      act(() => {
        jest.advanceTimersByTime(1500);
        result.current.trigger('correct');
      });

      // The first timer's 2000ms has passed, but the celebration should still be active
      // because the second trigger reset it
      act(() => jest.advanceTimersByTime(600));
      expect(result.current.state.isActive).toBe(true);

      // After the full 2000ms from second trigger
      act(() => jest.advanceTimersByTime(1400));
      expect(result.current.state.isActive).toBe(false);
    });
  });
});

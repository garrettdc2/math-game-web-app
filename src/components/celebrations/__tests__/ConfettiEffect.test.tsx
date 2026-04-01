import { render } from '@testing-library/react';
import { act } from 'react';
import ConfettiEffect from '@/components/celebrations/ConfettiEffect';

// ---------------------------------------------------------------------------
// Mock canvas-confetti
// ---------------------------------------------------------------------------

const mockConfetti = jest.fn();
jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockConfetti(...args),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfettiEffect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders null (no DOM elements)', () => {
    const { container } = render(<ConfettiEffect eventType={null} triggerKey={0} />);
    expect(container.innerHTML).toBe('');
  });

  it("fires confetti on 'correct' event", () => {
    render(<ConfettiEffect eventType="correct" triggerKey={1} />);
    expect(mockConfetti).toHaveBeenCalledTimes(1);
    expect(mockConfetti).toHaveBeenCalledWith(
      expect.objectContaining({ particleCount: 60 }),
    );
  });

  it("fires confetti on 'streak_5' event", () => {
    render(<ConfettiEffect eventType="streak_5" triggerKey={2} />);
    // Left + right burst
    expect(mockConfetti).toHaveBeenCalledTimes(2);
  });

  it("fires confetti on 'streak_10' event", () => {
    render(<ConfettiEffect eventType="streak_10" triggerKey={3} />);
    expect(mockConfetti).toHaveBeenCalledTimes(2);
  });

  it("fires confetti on 'streak_15' event", () => {
    render(<ConfettiEffect eventType="streak_15" triggerKey={4} />);
    expect(mockConfetti).toHaveBeenCalledTimes(2);
  });

  it("fires confetti on 'level_complete' event (3 waves via setTimeout)", () => {
    render(<ConfettiEffect eventType="level_complete" triggerKey={5} />);

    // First wave fires immediately (setTimeout 0)
    act(() => { jest.advanceTimersByTime(0); });
    // Second wave at 200ms
    act(() => { jest.advanceTimersByTime(200); });
    // Third wave at 400ms
    act(() => { jest.advanceTimersByTime(400); });

    expect(mockConfetti).toHaveBeenCalledTimes(3);
  });

  it('does not fire confetti when eventType is null', () => {
    render(<ConfettiEffect eventType={null} triggerKey={6} />);
    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it('does not fire confetti for same triggerKey (deduplication)', () => {
    const { rerender } = render(<ConfettiEffect eventType="correct" triggerKey={7} />);
    expect(mockConfetti).toHaveBeenCalledTimes(1);

    mockConfetti.mockClear();
    rerender(<ConfettiEffect eventType="correct" triggerKey={7} />);
    expect(mockConfetti).not.toHaveBeenCalled();
  });
});

import { render } from '@testing-library/react';
import CelebrationManager from '@/components/celebrations/CelebrationManager';
import type { CelebrationState, CelebrationEventType } from '@/hooks/useCelebration';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPlaySound = jest.fn();
jest.mock('@/lib/audio/sounds', () => ({
  playSound: (...args: unknown[]) => mockPlaySound(...args),
}));

jest.mock('@/components/celebrations/ConfettiEffect', () => {
  const MockConfettiEffect = (props: { eventType: CelebrationEventType | null; triggerKey: number }) => (
    <div data-testid="confetti-effect" data-event-type={props.eventType ?? 'null'} />
  );
  MockConfettiEffect.displayName = 'MockConfettiEffect';
  return { __esModule: true, default: MockConfettiEffect };
});

jest.mock('@/components/celebrations/MilestoneOverlay', () => {
  const MockMilestoneOverlay = (props: { show: boolean; message: string; onDismiss?: () => void }) => (
    <div
      data-testid="milestone-overlay"
      data-show={String(props.show)}
      data-message={props.message}
      data-has-on-dismiss={String(!!props.onDismiss)}
      onClick={props.onDismiss}
    />
  );
  MockMilestoneOverlay.displayName = 'MockMilestoneOverlay';
  return { __esModule: true, default: MockMilestoneOverlay };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function idleState(): CelebrationState {
  return {
    isActive: false,
    currentEvent: null,
    showMilestone: false,
    milestoneMessage: '',
  };
}

function stateWithEvent(type: CelebrationEventType, timestamp = Date.now()): CelebrationState {
  return {
    isActive: true,
    currentEvent: { type, timestamp },
    showMilestone: false,
    milestoneMessage: '',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CelebrationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crash with idle celebration state', () => {
    const { container } = render(
      <CelebrationManager celebration={idleState()} />,
    );
    expect(container).toBeTruthy();
  });

  it("plays 'correct' sound on correct event", () => {
    render(<CelebrationManager celebration={stateWithEvent('correct', 1)} />);
    expect(mockPlaySound).toHaveBeenCalledWith('correct');
  });

  it("plays 'incorrect' sound on incorrect event", () => {
    render(<CelebrationManager celebration={stateWithEvent('incorrect', 2)} />);
    expect(mockPlaySound).toHaveBeenCalledWith('incorrect');
  });

  it.each<[CelebrationEventType]>([
    ['streak_5'],
    ['streak_10'],
    ['streak_15'],
    ['level_complete'],
  ])("plays 'milestone' sound on %s event", (eventType) => {
    render(
      <CelebrationManager celebration={stateWithEvent(eventType, Date.now() + Math.random())} />,
    );
    expect(mockPlaySound).toHaveBeenCalledWith('milestone');
  });

  it('does not play sound for duplicate event (same timestamp)', () => {
    const ts = 999;
    const celebration = stateWithEvent('correct', ts);

    const { rerender } = render(<CelebrationManager celebration={celebration} />);
    expect(mockPlaySound).toHaveBeenCalledTimes(1);

    mockPlaySound.mockClear();
    rerender(<CelebrationManager celebration={{ ...celebration }} />);
    expect(mockPlaySound).not.toHaveBeenCalled();
  });

  it("does not pass 'incorrect' eventType to ConfettiEffect (passes null)", () => {
    const { getByTestId } = render(
      <CelebrationManager celebration={stateWithEvent('incorrect', 10)} />,
    );
    expect(getByTestId('confetti-effect').getAttribute('data-event-type')).toBe('null');
  });

  it('passes correct eventType to ConfettiEffect for non-incorrect events', () => {
    const { getByTestId } = render(
      <CelebrationManager celebration={stateWithEvent('correct', 20)} />,
    );
    expect(getByTestId('confetti-effect').getAttribute('data-event-type')).toBe('correct');
  });

  it('passes milestone state to MilestoneOverlay', () => {
    const celebration: CelebrationState = {
      isActive: true,
      currentEvent: { type: 'streak_5', timestamp: 30 },
      showMilestone: true,
      milestoneMessage: '5 in a row!',
    };

    const { getByTestId } = render(<CelebrationManager celebration={celebration} />);
    const overlay = getByTestId('milestone-overlay');
    expect(overlay.getAttribute('data-show')).toBe('true');
    expect(overlay.getAttribute('data-message')).toBe('5 in a row!');
  });

  it('passes onMilestoneDismiss to MilestoneOverlay', () => {
    const dismiss = jest.fn();
    const { getByTestId } = render(
      <CelebrationManager celebration={idleState()} onMilestoneDismiss={dismiss} />,
    );
    expect(getByTestId('milestone-overlay').getAttribute('data-has-on-dismiss')).toBe('true');
  });
});

import { render, screen, act } from '@testing-library/react';
import MilestoneOverlay from '../MilestoneOverlay';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe('MilestoneOverlay', () => {
  it('renders nothing when show is false', () => {
    const { container } = render(
      <MilestoneOverlay show={false} message="Test" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the message when show is true', () => {
    render(<MilestoneOverlay show={true} message="🔥 5 in a row!" />);
    expect(screen.getByText('🔥 5 in a row!')).toBeInTheDocument();
  });

  it('has aria-live="polite" for screen readers', () => {
    render(<MilestoneOverlay show={true} message="Test" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onDismiss after exit animation when show changes to false', () => {
    const onDismiss = jest.fn();
    const { rerender } = render(
      <MilestoneOverlay show={true} message="Test" onDismiss={onDismiss} />,
    );

    // Switch to hidden
    rerender(
      <MilestoneOverlay show={false} message="Test" onDismiss={onDismiss} />,
    );

    // onDismiss called after 500ms exit animation
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(500));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('remains visible during exit animation', () => {
    const { rerender } = render(
      <MilestoneOverlay show={true} message="Leaving" />,
    );
    rerender(<MilestoneOverlay show={false} message="Leaving" />);

    // Should still be visible during 500ms exit
    expect(screen.getByText('Leaving')).toBeInTheDocument();

    act(() => jest.advanceTimersByTime(500));
    // After animation, should be gone
    expect(screen.queryByText('Leaving')).not.toBeInTheDocument();
  });

  it('handles rapid show/hide toggling', () => {
    const { rerender } = render(
      <MilestoneOverlay show={false} message="Toggle" />,
    );

    // Show
    rerender(<MilestoneOverlay show={true} message="Toggle" />);
    expect(screen.getByText('Toggle')).toBeInTheDocument();

    // Hide immediately
    rerender(<MilestoneOverlay show={false} message="Toggle" />);
    act(() => jest.advanceTimersByTime(500));

    // Show again
    rerender(<MilestoneOverlay show={true} message="Toggle" />);
    expect(screen.getByText('Toggle')).toBeInTheDocument();
  });
});

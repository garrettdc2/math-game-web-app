import { render, screen } from '@testing-library/react';
import FeedbackOverlay from '../FeedbackOverlay';

describe('FeedbackOverlay', () => {
  it('renders nothing when feedback is null', () => {
    const { container } = render(<FeedbackOverlay feedback={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays "Correct!" for correct feedback', () => {
    render(<FeedbackOverlay feedback="correct" />);
    expect(screen.getByText('Correct!')).toBeInTheDocument();
  });

  it('displays "Incorrect" for incorrect feedback', () => {
    render(<FeedbackOverlay feedback="incorrect" />);
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
  });

  it('shows the correct answer when incorrect and correctAnswer is provided', () => {
    render(<FeedbackOverlay feedback="incorrect" correctAnswer={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/The answer was/)).toBeInTheDocument();
  });

  it('does not show correct answer text when feedback is correct', () => {
    render(<FeedbackOverlay feedback="correct" correctAnswer={42} />);
    expect(screen.queryByText(/The answer was/)).not.toBeInTheDocument();
  });

  it('handles string correctAnswer', () => {
    render(<FeedbackOverlay feedback="incorrect" correctAnswer="3/4" />);
    expect(screen.getByText('3/4')).toBeInTheDocument();
  });

  it('has role="status" and aria-live="assertive" for accessibility', () => {
    render(<FeedbackOverlay feedback="correct" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'assertive');
  });

  it('applies green styling for correct feedback', () => {
    render(<FeedbackOverlay feedback="correct" />);
    const text = screen.getByText('Correct!');
    expect(text.className).toContain('text-green-400');
  });

  it('applies red styling for incorrect feedback', () => {
    render(<FeedbackOverlay feedback="incorrect" />);
    const text = screen.getByText('Incorrect');
    expect(text.className).toContain('text-red-400');
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import GameHUD from '../GameHUD';

describe('GameHUD', () => {
  const defaultProps = {
    score: 1500,
    streak: 7,
    problemsCorrect: 15,
    problemsTotal: 20,
    elapsedSeconds: 125,
    onEndSession: jest.fn(),
  };

  beforeEach(() => {
    defaultProps.onEndSession.mockClear();
  });

  it('renders all stat labels', () => {
    render(<GameHUD {...defaultProps} />);
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Problems')).toBeInTheDocument();
    expect(screen.getByText('Time')).toBeInTheDocument();
  });

  it('displays formatted score', () => {
    render(<GameHUD {...defaultProps} />);
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('formats time as M:SS', () => {
    render(<GameHUD {...defaultProps} />);
    // 125 seconds = 2:05
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('displays 0:00 for zero elapsed seconds', () => {
    render(<GameHUD {...defaultProps} elapsedSeconds={0} />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('calculates accuracy percentage', () => {
    render(<GameHUD {...defaultProps} />);
    // 15/20 = 75%
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows 0% accuracy when no problems attempted', () => {
    render(
      <GameHUD {...defaultProps} problemsCorrect={0} problemsTotal={0} />,
    );
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays problems ratio', () => {
    render(<GameHUD {...defaultProps} />);
    expect(screen.getByText('15/20')).toBeInTheDocument();
  });

  describe('streak emojis', () => {
    it('shows fire emoji at streak 5+', () => {
      render(<GameHUD {...defaultProps} streak={5} />);
      expect(screen.getByText(/5 🔥/)).toBeInTheDocument();
    });

    it('shows lightning emoji at streak 10+', () => {
      render(<GameHUD {...defaultProps} streak={10} />);
      expect(screen.getByText(/10 ⚡/)).toBeInTheDocument();
    });

    it('shows star emoji at streak 15+', () => {
      render(<GameHUD {...defaultProps} streak={15} />);
      expect(screen.getByText(/15 🌟/)).toBeInTheDocument();
    });

    it('shows plain number below streak 5', () => {
      render(<GameHUD {...defaultProps} streak={3} />);
      expect(screen.queryByText(/🔥/)).not.toBeInTheDocument();
      expect(screen.queryByText(/⚡/)).not.toBeInTheDocument();
      expect(screen.queryByText(/🌟/)).not.toBeInTheDocument();
    });
  });

  it('calls onEndSession when End Session button is clicked', () => {
    render(<GameHUD {...defaultProps} />);
    fireEvent.click(screen.getByText('End Session'));
    expect(defaultProps.onEndSession).toHaveBeenCalledTimes(1);
  });
});

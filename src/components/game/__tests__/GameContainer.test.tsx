import { render, screen, fireEvent } from '@testing-library/react';
import GameContainer from '../GameContainer';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseWebGPU = jest.fn();
jest.mock('@/hooks/useWebGPU', () => ({
  useWebGPU: () => mockUseWebGPU(),
}));

const mockUseGameState = jest.fn();
jest.mock('@/hooks/useGameState', () => ({
  useGameState: () => mockUseGameState(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, loading: false }),
}));

jest.mock('@/components/game/ProblemDisplay3D', () => {
  return function MockProblemDisplay3D() {
    return <div data-testid="problem-display-3d">ProblemDisplay3D</div>;
  };
});

jest.mock('@/components/game/ProblemDisplay2D', () => {
  return function MockProblemDisplay2D() {
    return <div data-testid="problem-display-2d">ProblemDisplay2D</div>;
  };
});

jest.mock('@/components/game/AnswerInput', () => {
  return function MockAnswerInput() {
    return <div data-testid="answer-input">AnswerInput</div>;
  };
});

jest.mock('@/components/game/FeedbackOverlay', () => {
  return function MockFeedbackOverlay() {
    return <div data-testid="feedback-overlay">FeedbackOverlay</div>;
  };
});

jest.mock('@/components/game/GameHUD', () => {
  return function MockGameHUD() {
    return <div data-testid="game-hud">GameHUD</div>;
  };
});

jest.mock('@/components/celebrations/CelebrationManager', () => {
  return function MockCelebrationManager() {
    return <div data-testid="celebration-manager">CelebrationManager</div>;
  };
});

jest.mock('@/components/shared/GradeSelector', () => {
  return function MockGradeSelector({ onSelect }: { onSelect: (g: string) => void }) {
    return (
      <div data-testid="grade-selector">
        <button onClick={() => onSelect('3')}>Grade 3</button>
        <button onClick={() => onSelect('5')}>Grade 5</button>
      </div>
    );
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseInactiveState() {
  return {
    currentProblem: null,
    grade: null,
    score: 0,
    streak: 0,
    bestStreak: 0,
    problemsCorrect: 0,
    problemsTotal: 0,
    isActive: false,
    feedback: null,
    showingFeedback: false,
    celebration: { isActive: false, currentEvent: null, showMilestone: false, milestoneMessage: '' },
    elapsedSeconds: 0,
    isSaving: false,
    saveError: null,
    startSession: jest.fn(),
    submitAnswer: jest.fn(),
    nextProblem: jest.fn(),
    endSession: jest.fn(),
    dismissCelebration: jest.fn(),
  };
}

function baseActiveState() {
  return {
    ...baseInactiveState(),
    isActive: true,
    grade: '3',
    currentProblem: {
      id: 'p1',
      question: '3 + 4',
      correctAnswer: 7,
      operands: [3, 4],
      displayTokens: [
        { type: 'number' as const, value: 3 },
        { type: 'symbol' as const, symbol: '+' },
        { type: 'number' as const, value: 4 },
      ],
      operation: 'addition',
      grade: '3',
      tolerance: 0,
      hint: 'Add the numbers',
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GameContainer', () => {
  beforeEach(() => {
    mockUseWebGPU.mockReturnValue({ renderMode: '2d', loading: false });
    mockUseGameState.mockReturnValue(baseInactiveState());
  });

  // ---- Pre-game screen ---------------------------------------------------

  it('renders grade selection when not active', () => {
    render(<GameContainer />);
    expect(screen.getByTestId('grade-selector')).toBeInTheDocument();
  });

  it('shows "Choose Your Grade" heading', () => {
    render(<GameContainer />);
    expect(screen.getByText('Choose Your Grade')).toBeInTheDocument();
  });

  // ---- Post-session summary ----------------------------------------------

  it('shows score, accuracy, best streak, and problems when problemsTotal > 0', () => {
    mockUseGameState.mockReturnValue({
      ...baseInactiveState(),
      score: 1500,
      problemsCorrect: 8,
      problemsTotal: 10,
      bestStreak: 5,
    });

    render(<GameContainer />);

    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('8/10')).toBeInTheDocument();
  });

  it('shows "Play Again?" heading after a session', () => {
    mockUseGameState.mockReturnValue({
      ...baseInactiveState(),
      problemsTotal: 5,
      problemsCorrect: 3,
    });

    render(<GameContainer />);
    expect(screen.getByText('Play Again?')).toBeInTheDocument();
  });

  // ---- In-game screen ----------------------------------------------------

  it('renders GameHUD when active', () => {
    mockUseGameState.mockReturnValue(baseActiveState());
    render(<GameContainer />);
    expect(screen.getByTestId('game-hud')).toBeInTheDocument();
  });

  it('renders ProblemDisplay2D when renderMode is "2d"', () => {
    mockUseWebGPU.mockReturnValue({ renderMode: '2d', loading: false });
    mockUseGameState.mockReturnValue(baseActiveState());
    render(<GameContainer />);
    expect(screen.getByTestId('problem-display-2d')).toBeInTheDocument();
  });

  it('renders ProblemDisplay3D when renderMode is "webgl"', () => {
    mockUseWebGPU.mockReturnValue({ renderMode: 'webgl', loading: false });
    mockUseGameState.mockReturnValue(baseActiveState());
    render(<GameContainer />);
    expect(screen.getByTestId('problem-display-3d')).toBeInTheDocument();
  });

  it('renders AnswerInput when active with a problem', () => {
    mockUseGameState.mockReturnValue(baseActiveState());
    render(<GameContainer />);
    expect(screen.getByTestId('answer-input')).toBeInTheDocument();
  });

  it('renders FeedbackOverlay', () => {
    mockUseGameState.mockReturnValue(baseActiveState());
    render(<GameContainer />);
    expect(screen.getByTestId('feedback-overlay')).toBeInTheDocument();
  });

  it('renders CelebrationManager', () => {
    mockUseGameState.mockReturnValue(baseActiveState());
    render(<GameContainer />);
    expect(screen.getByTestId('celebration-manager')).toBeInTheDocument();
  });

  // ---- Edge cases --------------------------------------------------------

  it('shows loading spinner when GPU detection is in progress', () => {
    mockUseWebGPU.mockReturnValue({ renderMode: '2d', loading: true });
    mockUseGameState.mockReturnValue(baseActiveState());

    const { container } = render(<GameContainer />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows "Unable to generate problems" when currentProblem is null and session is active', () => {
    mockUseGameState.mockReturnValue({
      ...baseActiveState(),
      currentProblem: null,
    });

    render(<GameContainer />);
    expect(
      screen.getByText('Unable to generate problems for this grade level.'),
    ).toBeInTheDocument();
  });

  // ---- Interactions ------------------------------------------------------

  it('calls game.startSession when a grade is selected', () => {
    const state = baseInactiveState();
    mockUseGameState.mockReturnValue(state);

    render(<GameContainer />);
    fireEvent.click(screen.getByText('Grade 3'));

    expect(state.startSession).toHaveBeenCalledWith('3');
  });

  it('shows "Saving score..." when isSaving is true', () => {
    mockUseGameState.mockReturnValue({
      ...baseInactiveState(),
      problemsTotal: 5,
      problemsCorrect: 3,
      isSaving: true,
    });

    render(<GameContainer />);
    expect(screen.getByText('Saving score...')).toBeInTheDocument();
  });
});

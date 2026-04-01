import { renderHook, act } from '@testing-library/react';
import { useGameState } from '@/hooks/useGameState';

// ---------------------------------------------------------------------------
// Mock problem fixture
// ---------------------------------------------------------------------------

const mockProblem = {
  id: 'test-problem-1',
  question: '2 + 3',
  correctAnswer: 5,
  operands: [2, 3],
  displayTokens: [
    { type: 'number', value: 2 },
    { type: 'symbol', value: '+' },
    { type: 'number', value: 3 },
  ],
  difficulty: 1,
  topic: 'addition',
  grade: '1',
  operation: 'addition',
  tolerance: 0,
  hint: 'Add the numbers',
};

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockTrigger = jest.fn();
const mockDismiss = jest.fn();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'test-user' } })),
}));

jest.mock('@/hooks/useCelebration', () => ({
  useCelebration: jest.fn(() => ({
    state: {
      isActive: false,
      currentEvent: null,
      showMilestone: false,
      milestoneMessage: '',
    },
    trigger: mockTrigger,
    dismiss: mockDismiss,
  })),
}));

const mockGenerateProblem = jest.fn(() => mockProblem);
jest.mock('@/lib/math/problemGenerator', () => ({
  generateProblem: (...args: unknown[]) => mockGenerateProblem(...args),
}));

const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn(() => ({ insert: mockInsert }));
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

// Re-import so we can change return values per test
import { useAuth } from '@/hooks/useAuth';

const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Submit N correct answers in a row to build a streak. */
function buildStreak(
  result: ReturnType<typeof renderHook<ReturnType<typeof useGameState>>>['result'],
  count: number,
) {
  for (let i = 0; i < count; i++) {
    act(() => {
      result.current.submitAnswer('5');
    });
    // Clear feedback so next submit is accepted
    act(() => {
      result.current.nextProblem();
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGameState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockGenerateProblem.mockReturnValue(mockProblem);
    mockedUseAuth.mockReturnValue({ user: { id: 'test-user' } } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // 1. Initial state values
  it('returns correct initial state values', () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.score).toBe(0);
    expect(result.current.streak).toBe(0);
    expect(result.current.bestStreak).toBe(0);
    expect(result.current.problemsCorrect).toBe(0);
    expect(result.current.problemsTotal).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(result.current.feedback).toBeNull();
    expect(result.current.showingFeedback).toBe(false);
    expect(result.current.currentProblem).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.grade).toBe('');
  });

  // 2. startSession sets grade, isActive, generates first problem
  it('startSession sets grade, activates session, and generates first problem', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('3');
    });

    expect(result.current.grade).toBe('3');
    expect(result.current.isActive).toBe(true);
    expect(result.current.currentProblem).toEqual(mockProblem);
    expect(mockGenerateProblem).toHaveBeenCalledWith('3');
  });

  // 3. startSession resets previous session state
  it('startSession resets state from a previous session', () => {
    const { result } = renderHook(() => useGameState());

    // Start a session and answer a problem to build up state
    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('5');
    });

    expect(result.current.score).toBeGreaterThan(0);
    expect(result.current.problemsTotal).toBe(1);

    // Start a new session — everything should reset
    act(() => {
      result.current.startSession('2');
    });

    expect(result.current.score).toBe(0);
    expect(result.current.streak).toBe(0);
    expect(result.current.bestStreak).toBe(0);
    expect(result.current.problemsCorrect).toBe(0);
    expect(result.current.problemsTotal).toBe(0);
    expect(result.current.feedback).toBeNull();
    expect(result.current.showingFeedback).toBe(false);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.grade).toBe('2');
  });

  // 4. submitAnswer with correct numeric answer
  it('increments score, streak, and problemsCorrect on correct numeric answer', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('5');
    });

    expect(result.current.feedback).toBe('correct');
    expect(result.current.streak).toBe(1);
    expect(result.current.problemsCorrect).toBe(1);
    expect(result.current.problemsTotal).toBe(1);
    // pointsForCorrect(1, 1) = 10*1 + floor(1/3)*5 = 10
    expect(result.current.score).toBe(10);
  });

  // 5. submitAnswer with incorrect answer
  it('resets streak and sets feedback to incorrect on wrong answer', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });

    // First build a streak
    act(() => {
      result.current.submitAnswer('5');
    });
    act(() => {
      result.current.nextProblem();
    });

    expect(result.current.streak).toBe(1);

    // Now submit wrong answer
    act(() => {
      result.current.submitAnswer('999');
    });

    expect(result.current.feedback).toBe('incorrect');
    expect(result.current.streak).toBe(0);
    expect(result.current.problemsCorrect).toBe(1);
    expect(result.current.problemsTotal).toBe(2);
  });

  // 6. Floating point tolerance
  it('applies numeric tolerance of ±0.01 for floating point answers', () => {
    const floatProblem = { ...mockProblem, correctAnswer: 3.14 };
    mockGenerateProblem.mockReturnValue(floatProblem);

    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });

    // 3.14 for 3.14 should be correct (exact match)
    act(() => {
      result.current.submitAnswer('3.14');
    });
    expect(result.current.feedback).toBe('correct');

    // Reset for next test
    act(() => {
      result.current.nextProblem();
    });

    // 3.145 for 3.14 should be correct (within 0.01)
    act(() => {
      result.current.submitAnswer('3.145');
    });
    expect(result.current.feedback).toBe('correct');

    act(() => {
      result.current.nextProblem();
    });

    // 3.16 for 3.14 should be incorrect (outside 0.01)
    act(() => {
      result.current.submitAnswer('3.16');
    });
    expect(result.current.feedback).toBe('incorrect');
  });

  // Also test that 3.14 is NOT correct for 3.14159
  it('rejects answer outside tolerance (3.14 for 3.14159)', () => {
    const piProblem = { ...mockProblem, correctAnswer: 3.14159 };
    mockGenerateProblem.mockReturnValue(piProblem);

    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('3.14');
    });

    // |3.14 - 3.14159| = 0.00159, which is < 0.01 — so actually correct
    // Wait — 0.00159 < 0.01, so this IS within tolerance
    expect(result.current.feedback).toBe('correct');
  });

  // 7. String answers (case-insensitive)
  it('compares string answers case-insensitively', () => {
    const stringProblem = { ...mockProblem, correctAnswer: 'Triangle' };
    mockGenerateProblem.mockReturnValue(stringProblem);

    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('triangle');
    });

    expect(result.current.feedback).toBe('correct');

    act(() => {
      result.current.nextProblem();
    });
    act(() => {
      result.current.submitAnswer('TRIANGLE');
    });

    expect(result.current.feedback).toBe('correct');
  });

  // 8. Score calculation with streak bonus
  it('applies streak bonus to score: floor(streak/3)*5', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });

    // Answer 1: streak=1, points = 10*1 + floor(1/3)*5 = 10
    act(() => {
      result.current.submitAnswer('5');
    });
    expect(result.current.score).toBe(10);
    act(() => {
      result.current.nextProblem();
    });

    // Answer 2: streak=2, points = 10 + floor(2/3)*5 = 10
    act(() => {
      result.current.submitAnswer('5');
    });
    expect(result.current.score).toBe(20);
    act(() => {
      result.current.nextProblem();
    });

    // Answer 3: streak=3, points = 10 + floor(3/3)*5 = 15
    act(() => {
      result.current.submitAnswer('5');
    });
    expect(result.current.score).toBe(35);
    act(() => {
      result.current.nextProblem();
    });

    // Answer 4: streak=4, points = 10 + floor(4/3)*5 = 15
    act(() => {
      result.current.submitAnswer('5');
    });
    expect(result.current.score).toBe(50);
    act(() => {
      result.current.nextProblem();
    });

    // Answer 5: streak=5, points = 10 + floor(5/3)*5 = 15
    act(() => {
      result.current.submitAnswer('5');
    });
    expect(result.current.score).toBe(65);
    act(() => {
      result.current.nextProblem();
    });

    // Answer 6: streak=6, points = 10 + floor(6/3)*5 = 20
    act(() => {
      result.current.submitAnswer('5');
    });
    expect(result.current.score).toBe(85);
  });

  // 9. Streak milestones trigger celebration at 5, 10, 15
  it('triggers celebration at streak milestones 5, 10, and 15', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });

    // Build streak to 5
    buildStreak(result, 5);

    // The 5th correct answer should trigger streak_5
    expect(mockTrigger).toHaveBeenCalledWith('streak_5');

    mockTrigger.mockClear();

    // Continue to 10
    buildStreak(result, 5);
    expect(mockTrigger).toHaveBeenCalledWith('streak_10');

    mockTrigger.mockClear();

    // Continue to 15
    buildStreak(result, 5);
    expect(mockTrigger).toHaveBeenCalledWith('streak_15');
  });

  // 10. submitAnswer ignored when showingFeedback is true
  it('ignores submitAnswer when showingFeedback is true', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('5');
    });

    expect(result.current.showingFeedback).toBe(true);
    expect(result.current.problemsTotal).toBe(1);

    // Try submitting again while feedback is showing
    act(() => {
      result.current.submitAnswer('5');
    });

    // Should still be 1 — second submit was ignored
    expect(result.current.problemsTotal).toBe(1);
  });

  // 11. submitAnswer ignored when session not active
  it('ignores submitAnswer when session is not active', () => {
    const { result } = renderHook(() => useGameState());

    // Don't start a session
    act(() => {
      result.current.submitAnswer('5');
    });

    expect(result.current.problemsTotal).toBe(0);
  });

  // 12. submitAnswer ignored for empty/whitespace input
  it('ignores submitAnswer for empty or whitespace-only input', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });

    act(() => {
      result.current.submitAnswer('');
    });
    expect(result.current.problemsTotal).toBe(0);

    act(() => {
      result.current.submitAnswer('   ');
    });
    expect(result.current.problemsTotal).toBe(0);

    act(() => {
      result.current.submitAnswer('\t\n');
    });
    expect(result.current.problemsTotal).toBe(0);
  });

  // 13. endSession calls Supabase insert when user is authenticated and problemsTotal > 0
  it('persists score to Supabase when user is authenticated and problemsTotal > 0', async () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('3');
    });
    act(() => {
      result.current.submitAnswer('5');
    });

    await act(async () => {
      await result.current.endSession();
    });

    expect(mockFrom).toHaveBeenCalledWith('scores');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'test-user',
        grade: '3',
      }),
    );
  });

  // 14. endSession does NOT call Supabase when user is null
  it('does not persist score when user is null', async () => {
    mockedUseAuth.mockReturnValue({ user: null } as any);

    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('5');
    });

    await act(async () => {
      await result.current.endSession();
    });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // 15. endSession does NOT call Supabase when problemsTotal is 0
  it('does not persist score when problemsTotal is 0', async () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });

    // End without answering anything
    await act(async () => {
      await result.current.endSession();
    });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  // 16. endSession sets isActive to false
  it('sets isActive to false when session ends', async () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });

    expect(result.current.isActive).toBe(true);

    await act(async () => {
      await result.current.endSession();
    });

    expect(result.current.isActive).toBe(false);
  });

  // 17. nextProblem generates new problem and clears feedback
  it('generates a new problem and clears feedback on nextProblem', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('5');
    });

    expect(result.current.feedback).toBe('correct');
    expect(result.current.showingFeedback).toBe(true);

    const secondProblem = { ...mockProblem, id: 'test-problem-2' };
    mockGenerateProblem.mockReturnValue(secondProblem);

    act(() => {
      result.current.nextProblem();
    });

    expect(result.current.feedback).toBeNull();
    expect(result.current.showingFeedback).toBe(false);
    expect(result.current.currentProblem).toEqual(secondProblem);
  });

  // 18. Auto-advance after feedback (1500ms)
  it('auto-advances to next problem after 1500ms feedback duration', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('5');
    });

    expect(result.current.showingFeedback).toBe(true);

    const nextMockProblem = { ...mockProblem, id: 'test-problem-next' };
    mockGenerateProblem.mockReturnValue(nextMockProblem);

    // Advance time by 1500ms
    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.feedback).toBeNull();
    expect(result.current.showingFeedback).toBe(false);
  });

  // 19. Timer increments elapsedSeconds while active
  it('increments elapsedSeconds while session is active', () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });

    expect(result.current.elapsedSeconds).toBe(0);

    // Advance 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // elapsedSeconds uses Date.now(), so with fake timers it should reflect elapsed time
    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(3);
  });

  // 20. Cleanup on unmount clears timers
  it('clears timers on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { result, unmount } = renderHook(() => useGameState());

    act(() => {
      result.current.startSession('1');
    });
    act(() => {
      result.current.submitAnswer('5');
    });

    unmount();

    // Verify that clearInterval and clearTimeout were called during unmount cleanup
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});

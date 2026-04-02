import { renderHook, act, waitFor } from '@testing-library/react';
import { useLeaderboard } from '@/hooks/useLeaderboard';

// ---------------------------------------------------------------------------
// Mock fixtures — matches the leaderboard view shape
// ---------------------------------------------------------------------------

const mockLeaderboardData = [
  {
    user_id: 'u1',
    grade: '1',
    display_name: 'Alice',
    avatar_url: null,
    total_score: 150,
    total_correct: 12,
    total_problems: 15,
    best_streak: 5,
    games_played: 2,
    rank: 1,
  },
  {
    user_id: 'u2',
    grade: '1',
    display_name: 'Bob',
    avatar_url: 'https://example.com/bob.png',
    total_score: 120,
    total_correct: 10,
    total_problems: 14,
    best_streak: 3,
    games_played: 1,
    rank: 2,
  },
];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLimit = jest.fn().mockResolvedValue({ data: mockLeaderboardData, error: null });
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetMocks() {
  mockFrom.mockClear();
  mockSelect.mockClear();
  mockEq.mockClear();
  mockOrder.mockClear();
  mockLimit.mockClear();
  mockLimit.mockResolvedValue({ data: mockLeaderboardData, error: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLeaderboard', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('starts with isLoading true, empty entries, and no error', () => {
    mockLimit.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLeaderboard());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('queries the leaderboard view instead of scores table', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('leaderboard');
    expect(mockSelect).toHaveBeenCalledWith('*');
  });

  it('fetches leaderboard entries from the view correctly', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const alice = result.current.entries.find((e) => e.userId === 'u1');
    const bob = result.current.entries.find((e) => e.userId === 'u2');

    expect(alice).toBeDefined();
    expect(alice!.totalScore).toBe(150);
    expect(alice!.gamesPlayed).toBe(2);
    expect(alice!.rank).toBe(1);
    expect(alice!.displayName).toBe('Alice');

    expect(bob).toBeDefined();
    expect(bob!.totalScore).toBe(120);
    expect(bob!.gamesPlayed).toBe(1);
    expect(bob!.rank).toBe(2);
    expect(bob!.avatarUrl).toBe('https://example.com/bob.png');
  });

  it('preserves rank from the database view', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries[0].rank).toBe(1);
    expect(result.current.entries[1].rank).toBe(2);
  });

  it('maps all view fields to LeaderboardEntry', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const entry = result.current.entries[0];
    expect(entry).toEqual({
      userId: 'u1',
      grade: '1',
      displayName: 'Alice',
      avatarUrl: null,
      totalScore: 150,
      totalCorrect: 12,
      totalProblems: 15,
      bestStreak: 5,
      gamesPlayed: 2,
      rank: 1,
    });
  });

  it('defaults selectedGrade to "1" when no initialGrade provided', async () => {
    const { result } = renderHook(() => useLeaderboard());

    expect(result.current.selectedGrade).toBe('1');

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockEq).toHaveBeenCalledWith('grade', '1');
  });

  it('uses initialGrade option when provided', async () => {
    const { result } = renderHook(() => useLeaderboard({ initialGrade: '5' }));

    expect(result.current.selectedGrade).toBe('5');

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockEq).toHaveBeenCalledWith('grade', '5');
  });

  it('setSelectedGrade triggers a re-fetch', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callCountBefore = mockFrom.mock.calls.length;

    act(() => {
      result.current.setSelectedGrade('3');
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom.mock.calls.length).toBeGreaterThan(callCountBefore);
    expect(mockEq).toHaveBeenCalledWith('grade', '3');
  });

  it('handles query error by setting error message and emptying entries', async () => {
    mockLimit.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe('Database connection failed');
    expect(result.current.entries).toEqual([]);
  });

  it('handles empty result set', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('uses "Anonymous" for null display_name', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          user_id: 'u3',
          grade: '1',
          display_name: null,
          avatar_url: null,
          total_score: 80,
          total_correct: 5,
          total_problems: 8,
          best_streak: 2,
          games_played: 1,
          rank: 1,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries[0].displayName).toBe('Anonymous');
  });

  it('refresh() re-fetches data', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callCountBefore = mockFrom.mock.calls.length;

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom.mock.calls.length).toBeGreaterThan(callCountBefore);
  });

  it('respects limit option', async () => {
    const { result } = renderHook(() => useLeaderboard({ limit: 5 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockLimit).toHaveBeenCalledWith(5);
  });

  it('handles null values from the view gracefully', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          user_id: null,
          grade: null,
          display_name: null,
          avatar_url: null,
          total_score: null,
          total_correct: null,
          total_problems: null,
          best_streak: null,
          games_played: null,
          rank: null,
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const entry = result.current.entries[0];
    expect(entry.userId).toBe('');
    expect(entry.displayName).toBe('Anonymous');
    expect(entry.totalScore).toBe(0);
    expect(entry.gamesPlayed).toBe(0);
    expect(entry.rank).toBe(0);
  });
});

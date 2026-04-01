import { renderHook, act, waitFor } from '@testing-library/react';
import { useLeaderboard } from '@/hooks/useLeaderboard';

// ---------------------------------------------------------------------------
// Mock fixtures
// ---------------------------------------------------------------------------

const mockScoresData = [
  { user_id: 'u1', score: 100, profiles: { display_name: 'Alice', avatar_url: null } },
  { user_id: 'u1', score: 50, profiles: { display_name: 'Alice', avatar_url: null } },
  { user_id: 'u2', score: 120, profiles: { display_name: 'Bob', avatar_url: 'https://example.com/bob.png' } },
];

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLimit = jest.fn().mockResolvedValue({ data: mockScoresData, error: null });
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
  mockLimit.mockResolvedValue({ data: mockScoresData, error: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useLeaderboard', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('starts with isLoading true, empty entries, and no error', () => {
    // Use a never-resolving promise so loading stays true
    mockLimit.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useLeaderboard());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('fetches and aggregates scores correctly', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // u1: 100 + 50 = 150, u2: 120
    const alice = result.current.entries.find((e) => e.userId === 'u1');
    const bob = result.current.entries.find((e) => e.userId === 'u2');

    expect(alice).toBeDefined();
    expect(alice!.totalScore).toBe(150);
    expect(bob).toBeDefined();
    expect(bob!.totalScore).toBe(120);
  });

  it('ranks entries by totalScore descending', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries[0].userId).toBe('u1');
    expect(result.current.entries[0].rank).toBe(1);
    expect(result.current.entries[1].userId).toBe('u2');
    expect(result.current.entries[1].rank).toBe(2);
  });

  it('counts gamesPlayed correctly', async () => {
    const { result } = renderHook(() => useLeaderboard());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const alice = result.current.entries.find((e) => e.userId === 'u1');
    const bob = result.current.entries.find((e) => e.userId === 'u2');

    expect(alice!.gamesPlayed).toBe(2);
    expect(bob!.gamesPlayed).toBe(1);
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
        { user_id: 'u3', score: 80, profiles: { display_name: null, avatar_url: null } },
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

    // limit * 10 is passed to the query
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});

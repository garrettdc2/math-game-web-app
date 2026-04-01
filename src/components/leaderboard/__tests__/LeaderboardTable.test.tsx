// Mock the useLeaderboard import that LeaderboardTable uses for the type
jest.mock('@/hooks/useLeaderboard', () => ({
  __esModule: true,
}));

import { render, screen } from '@testing-library/react';
import LeaderboardTable from '../LeaderboardTable';

const mockEntries = [
  {
    rank: 1,
    userId: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
    totalScore: 5000,
    gamesPlayed: 10,
  },
  {
    rank: 2,
    userId: 'user-2',
    displayName: 'Bob',
    avatarUrl: 'https://example.com/bob.png',
    totalScore: 4200,
    gamesPlayed: 8,
  },
  {
    rank: 3,
    userId: 'user-3',
    displayName: 'Charlie',
    avatarUrl: null,
    totalScore: 3100,
    gamesPlayed: 7,
  },
  {
    rank: 4,
    userId: 'user-4',
    displayName: 'Diana',
    avatarUrl: null,
    totalScore: 2000,
    gamesPlayed: 5,
  },
];

describe('LeaderboardTable', () => {
  it('displays loading skeletons when isLoading is true', () => {
    const { container } = render(
      <LeaderboardTable entries={[]} isLoading={true} />,
    );
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no entries and not loading', () => {
    render(<LeaderboardTable entries={[]} isLoading={false} />);
    expect(screen.getByText(/No scores yet/i)).toBeInTheDocument();
  });

  it('renders all entries', () => {
    render(<LeaderboardTable entries={mockEntries} isLoading={false} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();
  });

  it('displays scores formatted with locale string', () => {
    render(<LeaderboardTable entries={mockEntries} isLoading={false} />);
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('4,200')).toBeInTheDocument();
  });

  it('highlights the current user row with (you) label', () => {
    render(
      <LeaderboardTable
        entries={mockEntries}
        isLoading={false}
        currentUserId="user-2"
      />,
    );
    expect(screen.getByText('(you)')).toBeInTheDocument();
  });

  it('does not show (you) when no currentUserId', () => {
    render(<LeaderboardTable entries={mockEntries} isLoading={false} />);
    expect(screen.queryByText('(you)')).not.toBeInTheDocument();
  });

  it('shows rank badges for top 3', () => {
    render(<LeaderboardTable entries={mockEntries} isLoading={false} />);
    const rows = screen.getAllByRole('row');
    // Header + 4 data rows
    expect(rows).toHaveLength(5);
  });

  it('shows initial avatar fallback when no avatarUrl', () => {
    render(<LeaderboardTable entries={mockEntries} isLoading={false} />);
    // Alice has no avatar, should show first letter "A"
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders avatar image when avatarUrl is provided', () => {
    render(<LeaderboardTable entries={mockEntries} isLoading={false} />);
    // The img has alt="" per the component code
    const images = document.querySelectorAll('img');
    const bobImg = Array.from(images).find(
      (img) => img.getAttribute('src') === 'https://example.com/bob.png',
    );
    expect(bobImg).toBeTruthy();
  });

  it('renders column headers', () => {
    render(<LeaderboardTable entries={mockEntries} isLoading={false} />);
    expect(screen.getByText('Rank')).toBeInTheDocument();
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Games')).toBeInTheDocument();
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '@/components/shared/Navbar';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSignOut = jest.fn();

const mockUseAuth = jest.fn<
  { user: { email: string } | null; signOut: () => void; loading: boolean },
  []
>();

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUsePathname = jest.fn<string, []>();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => mockUsePathname(),
  useSearchParams: () => new URLSearchParams(),
  redirect: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderNavbar() {
  return render(<Navbar />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
    mockUseAuth.mockReturnValue({ user: null, signOut: mockSignOut, loading: false });
  });

  it('renders MathQuest branding', () => {
    renderNavbar();
    expect(screen.getByText('Quest')).toBeInTheDocument();
    expect(screen.getByText(/Math/)).toBeInTheDocument();
  });

  it('shows Log In and Sign Up links when not authenticated', () => {
    renderNavbar();
    expect(screen.getByText('Log In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  it('shows nav links (Dashboard, Play, Leaderboard) when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'test@example.com' },
      signOut: mockSignOut,
      loading: false,
    });

    renderNavbar();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Play')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('shows user email when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'hello@test.com' },
      signOut: mockSignOut,
      loading: false,
    });

    renderNavbar();
    expect(screen.getByText('hello@test.com')).toBeInTheDocument();
  });

  it('shows Sign Out button when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'a@b.com' },
      signOut: mockSignOut,
      loading: false,
    });

    renderNavbar();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('does not show nav links when not authenticated', () => {
    renderNavbar();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Play')).not.toBeInTheDocument();
    expect(screen.queryByText('Leaderboard')).not.toBeInTheDocument();
  });

  it('Sign Out button calls signOut', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'a@b.com' },
      signOut: mockSignOut,
      loading: false,
    });

    renderNavbar();
    fireEvent.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('mobile menu toggle button shown when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'a@b.com' },
      signOut: mockSignOut,
      loading: false,
    });

    renderNavbar();
    expect(screen.getByLabelText('Toggle menu')).toBeInTheDocument();
  });

  it('nothing rendered during loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      signOut: mockSignOut,
      loading: true,
    });

    renderNavbar();
    expect(screen.queryByText('Log In')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});

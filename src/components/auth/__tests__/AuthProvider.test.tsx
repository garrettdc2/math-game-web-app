import { render, screen, act, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { AuthProvider, AuthContext, AuthContextValue } from '../AuthProvider';

// --- Mock Supabase client ---

const mockUnsubscribe = jest.fn();
let authStateCallback: ((event: string, session: any) => void) | null = null;

const mockSupabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
    }),
    onAuthStateChange: jest.fn((cb: any) => {
      authStateCallback = cb;
      return {
        data: {
          subscription: { unsubscribe: mockUnsubscribe },
        },
      };
    }),
    signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
    signUp: jest.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            display_name: 'Test User',
            selected_grade: '3',
            avatar_url: null,
          },
        }),
      }),
    }),
  }),
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// --- Test helper component ---

function TestConsumer() {
  const ctx = useContext(AuthContext);
  if (!ctx) return <div>no context</div>;
  return (
    <div>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="user">{ctx.user ? ctx.user.id : 'null'}</span>
      <span data-testid="session">{ctx.session ? 'active' : 'null'}</span>
      <span data-testid="profile">
        {ctx.profile ? ctx.profile.display_name : 'null'}
      </span>
      <button data-testid="sign-in" onClick={() => ctx.signInWithEmail('a@b.com', 'pass123')}>
        sign in
      </button>
      <button data-testid="sign-up" onClick={() => ctx.signUpWithEmail('a@b.com', 'pass123', 'New User')}>
        sign up
      </button>
      <button data-testid="google" onClick={() => ctx.signInWithGoogle()}>
        google
      </button>
      <button data-testid="sign-out" onClick={() => ctx.signOut()}>
        sign out
      </button>
    </div>
  );
}

// --- Fixtures ---

const mockUser = { id: 'user-123', email: 'a@b.com' } as any;
const mockSession = { user: mockUser, access_token: 'tok' } as any;

// --- Tests ---

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateCallback = null;
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });
  });

  it('renders children', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <div data-testid="child">Hello</div>
        </AuthProvider>,
      );
    });

    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides loading=true initially then false after init', async () => {
    let resolveGetSession: (v: any) => void;
    mockSupabase.auth.getSession.mockReturnValue(
      new Promise((r) => {
        resolveGetSession = r;
      }),
    );

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    await act(async () => {
      resolveGetSession!({ data: { session: null } });
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('provides user and session after getSession resolves', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user-123');
      expect(screen.getByTestId('session')).toHaveTextContent('active');
    });
  });

  it('fetches profile after session init', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(screen.getByTestId('profile')).toHaveTextContent('Test User');
    });
  });

  it('signInWithEmail calls signInWithPassword with correct args', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    await act(async () => {
      screen.getByTestId('sign-in').click();
    });

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass123',
    });
  });

  it('signInWithEmail throws error on failure', async () => {
    const authError = new Error('Invalid credentials');
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      error: authError,
    });

    // Use a consumer that captures the error
    let caughtError: Error | null = null;
    function ErrorCatchConsumer() {
      const ctx = useContext(AuthContext);
      if (!ctx) return null;
      return (
        <button
          data-testid="sign-in-err"
          onClick={async () => {
            try {
              await ctx.signInWithEmail('a@b.com', 'wrong');
            } catch (e) {
              caughtError = e as Error;
            }
          }}
        >
          sign in
        </button>
      );
    }

    await act(async () => {
      render(
        <AuthProvider>
          <ErrorCatchConsumer />
        </AuthProvider>,
      );
    });

    await act(async () => {
      screen.getByTestId('sign-in-err').click();
    });

    expect(caughtError).toBe(authError);
  });

  it('signUpWithEmail calls signUp with display_name in metadata', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    await act(async () => {
      screen.getByTestId('sign-up').click();
    });

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass123',
      options: {
        data: { display_name: 'New User' },
      },
    });
  });

  it('signInWithGoogle calls signInWithOAuth with google provider', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    await act(async () => {
      screen.getByTestId('google').click();
    });

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/auth/callback'),
      },
    });
  });

  it('signOut clears user, session, and profile', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
    });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('profile')).toHaveTextContent('Test User');
    });

    // Simulate the auth state change that would occur after signOut
    await act(async () => {
      screen.getByTestId('sign-out').click();
    });

    // signOut calls supabase.auth.signOut and clears profile
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();

    // Simulate auth state change event for sign out
    await act(async () => {
      authStateCallback?.('SIGNED_OUT', null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('session')).toHaveTextContent('null');
      expect(screen.getByTestId('profile')).toHaveTextContent('null');
    });
  });

  it('unsubscribes from auth state change on unmount', async () => {
    let unmount: () => void;

    await act(async () => {
      const result = render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>,
      );
      unmount = result.unmount;
    });

    await act(async () => {
      unmount();
    });

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

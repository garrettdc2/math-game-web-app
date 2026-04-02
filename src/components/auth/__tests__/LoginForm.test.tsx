import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../LoginForm';

// --- Mocks ---

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}));

const mockSignInWithEmail = jest.fn().mockResolvedValue(undefined);
const mockSignInWithGoogle = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signInWithEmail: mockSignInWithEmail,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

describe('LoginForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithEmail.mockResolvedValue(undefined);
    mockSignInWithGoogle.mockResolvedValue(undefined);
  });

  it('renders email input, password input, and submit button', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in$/i })).toBeInTheDocument();
  });

  it('renders "Sign in with Google" button', () => {
    render(<LoginForm />);

    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('renders link to sign up page', () => {
    render(<LoginForm />);

    const link = screen.getByRole('link', { name: /create one/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/auth/signup');
  });

  it('submits form and calls signInWithEmail with entered values', async () => {
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in$/i }));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('redirects to /dashboard on successful login', async () => {
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in$/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error message on login failure', async () => {
    mockSignInWithEmail.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows "Signing in..." while submitting', async () => {
    let resolveSignIn: () => void;
    mockSignInWithEmail.mockReturnValue(
      new Promise<void>((r) => {
        resolveSignIn = r;
      }),
    );

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in$/i }));

    expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();

    // Resolve to avoid act warnings
    await waitFor(async () => {
      resolveSignIn!();
    });
  });

  it('Google button calls signInWithGoogle', async () => {
    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
  });

  it('shows Google error message on failure', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('Google auth failed'));

    render(<LoginForm />);

    await user.click(screen.getByRole('button', { name: /sign in with google/i }));

    await waitFor(() => {
      expect(screen.getByText('Google auth failed')).toBeInTheDocument();
    });
  });
});

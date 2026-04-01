import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupForm from '../SignupForm';

// --- Mocks ---

const mockSignUpWithEmail = jest.fn().mockResolvedValue(undefined);
const mockSignInWithGoogle = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signUpWithEmail: mockSignUpWithEmail,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

describe('SignupForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUpWithEmail.mockResolvedValue(undefined);
    mockSignInWithGoogle.mockResolvedValue(undefined);
  });

  it('renders all four inputs and submit button', () => {
    render(<SignupForm />);

    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), 'Test');
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'different');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it('shows error when password is less than 6 characters', async () => {
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), 'Test');
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), '12345');
    await user.type(screen.getByLabelText(/confirm password/i), '12345');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });

    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it('shows error when display name is empty or whitespace', async () => {
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), '   ');
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/display name is required/i)).toBeInTheDocument();
    });

    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it('calls signUpWithEmail on valid submission', async () => {
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUpWithEmail).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Test User',
      );
    });
  });

  it('shows success screen with email after signup', async () => {
    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('shows error on signUpWithEmail failure', async () => {
    mockSignUpWithEmail.mockRejectedValue(new Error('Email already registered'));

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.type(screen.getByLabelText(/confirm password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });

  it('Google button calls signInWithGoogle', async () => {
    render(<SignupForm />);

    await user.click(screen.getByRole('button', { name: /sign up with google/i }));

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });
  });

  it('renders link to login page', () => {
    render(<SignupForm />);

    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/auth/login');
  });
});

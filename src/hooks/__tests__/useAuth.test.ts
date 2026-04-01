/**
 * Tests for the useAuth convenience hook.
 */

import { renderHook } from '@testing-library/react';
import React from 'react';

// We need the real AuthContext export
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
  }),
}));

import { useAuth } from '../useAuth';
import { AuthContext } from '@/components/auth/AuthProvider';

const mockContextValue = {
  user: { id: 'user-1', email: 'test@test.com' },
  profile: null,
  session: null,
  loading: false,
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  refreshProfile: jest.fn(),
};

describe('useAuth', () => {
  it('throws error when used outside AuthProvider', () => {
    // We can't directly test renderHook throwing in React 18 because it uses
    // an error boundary internally. Instead, we verify the hook checks context.
    // A simple unit test: import the module and verify the guard logic.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // renderHook with an error boundary won't propagate to expect().toThrow()
    // Instead, we test that the context is undefined when no provider is present
    let error: Error | null = null;
    try {
      renderHook(() => {
        try {
          return useAuth();
        } catch (e) {
          error = e as Error;
          throw e;
        }
      });
    } catch {
      // Expected
    }

    expect(error).not.toBeNull();
    expect(error!.message).toContain('AuthProvider');

    spy.mockRestore();
  });

  it('returns context value when inside AuthProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        AuthContext.Provider,
        { value: mockContextValue as any },
        children,
      );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockContextValue.user);
    expect(result.current.signInWithEmail).toBe(mockContextValue.signInWithEmail);
    expect(result.current.signOut).toBe(mockContextValue.signOut);
    expect(result.current.loading).toBe(false);
  });
});

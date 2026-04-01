/**
 * Tests for the OAuth callback route handler.
 */

jest.mock('next/server', () => {
  const _redirect = jest.fn((url: any) => ({
    status: 307,
    headers: new Map([['location', url.toString()]]),
  }));

  class FakeNextRequest {
    url: string;
    nextUrl: any;
    constructor(url: any) {
      this.nextUrl = typeof url === 'string' ? new URL(url) : url;
      this.url = this.nextUrl.toString();
    }
  }

  return {
    __esModule: true,
    NextRequest: FakeNextRequest,
    NextResponse: {
      redirect: _redirect,
    },
  };
});

// Create the mock inside the factory to avoid hoisting issues
const _mockExchange = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: (...args: any[]) => _mockExchange(...args),
      },
    }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { NextResponse, NextRequest } = require('next/server');

import { GET } from '../route';

function createCallbackRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost:3000/auth/callback');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('OAuth callback route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  it('redirects to /auth/login when error param is present', async () => {
    const req = createCallbackRequest({ error: 'access_denied' });
    await GET(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const url = NextResponse.redirect.mock.calls[0][0];
    expect(url.pathname).toBe('/auth/login');
    expect(url.searchParams.get('error')).toBe('oauth_error');
  });

  it('exchanges code for session when code param is present', async () => {
    _mockExchange.mockResolvedValue({ error: null });

    const req = createCallbackRequest({ code: 'auth-code-123' });
    await GET(req);

    expect(_mockExchange).toHaveBeenCalledWith('auth-code-123');
  });

  it('redirects to /dashboard on successful code exchange', async () => {
    _mockExchange.mockResolvedValue({ error: null });

    const req = createCallbackRequest({ code: 'valid-code' });
    await GET(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const url = NextResponse.redirect.mock.calls[0][0];
    expect(url.pathname).toBe('/dashboard');
  });

  it('redirects to /auth/login on code exchange failure', async () => {
    _mockExchange.mockResolvedValue({
      error: { message: 'Code exchange failed' },
    });

    const req = createCallbackRequest({ code: 'invalid-code' });
    await GET(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const url = NextResponse.redirect.mock.calls[0][0];
    expect(url.pathname).toBe('/auth/login');
    expect(url.searchParams.get('error')).toBe('oauth_error');
  });

  it('redirects to /dashboard when no code or error params', async () => {
    const req = createCallbackRequest({});
    await GET(req);

    expect(NextResponse.redirect).toHaveBeenCalled();
    const url = NextResponse.redirect.mock.calls[0][0];
    expect(url.pathname).toBe('/dashboard');
    expect(_mockExchange).not.toHaveBeenCalled();
  });
});

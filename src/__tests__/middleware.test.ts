/**
 * Tests for Next.js auth middleware.
 */

const mockGetUser = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

jest.mock('next/server', () => {
  const _redirect = jest.fn((url: any) => ({
    status: 307,
    headers: new Map([['location', url.toString()]]),
  }));
  const _next = jest.fn(() => ({
    status: 200,
    headers: new Map(),
    cookies: { set: jest.fn() },
  }));

  class FakeNextRequest {
    nextUrl: any;
    cookies: any;
    url: string;
    constructor(url: any) {
      const parsed = typeof url === 'string' ? new URL(url) : url;
      // Provide a clone method on nextUrl, as middleware calls nextUrl.clone()
      this.nextUrl = Object.assign(new URL(parsed.toString()), {
        clone: () => new URL(parsed.toString()),
      });
      this.url = this.nextUrl.toString();
      this.cookies = {
        getAll: () => [],
        set: jest.fn(),
      };
    }
  }

  return {
    __esModule: true,
    NextRequest: FakeNextRequest,
    NextResponse: {
      next: _next,
      redirect: _redirect,
    },
  };
});

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { NextResponse, NextRequest } = require('next/server');

import { middleware, config } from '../middleware';

function createRequest(path: string) {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    NextResponse.next.mockImplementation(() => ({
      status: 200,
      headers: new Map(),
      cookies: { set: jest.fn() },
    }));
  });

  describe('protected routes — unauthenticated', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
    });

    it('redirects /dashboard to /auth/login with redirectTo', async () => {
      const req = createRequest('/dashboard');
      await middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const url: URL = NextResponse.redirect.mock.calls[0][0];
      expect(url.pathname).toBe('/auth/login');
      expect(url.searchParams.get('redirectTo')).toBe('/dashboard');
    });

    it('redirects /play to /auth/login', async () => {
      const req = createRequest('/play');
      await middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const url: URL = NextResponse.redirect.mock.calls[0][0];
      expect(url.pathname).toBe('/auth/login');
    });

    it('redirects /leaderboard to /auth/login', async () => {
      const req = createRequest('/leaderboard');
      await middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const url: URL = NextResponse.redirect.mock.calls[0][0];
      expect(url.pathname).toBe('/auth/login');
    });
  });

  describe('protected routes — authenticated', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@test.com' } },
      });
    });

    it('allows /dashboard through', async () => {
      const req = createRequest('/dashboard');
      await middleware(req);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('allows /play through', async () => {
      const req = createRequest('/play');
      await middleware(req);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('allows /leaderboard through', async () => {
      const req = createRequest('/leaderboard');
      await middleware(req);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('auth routes — authenticated user redirected', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });
    });

    it('redirects /auth/login to /dashboard', async () => {
      const req = createRequest('/auth/login');
      await middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const url: URL = NextResponse.redirect.mock.calls[0][0];
      expect(url.pathname).toBe('/dashboard');
    });

    it('redirects /auth/signup to /dashboard', async () => {
      const req = createRequest('/auth/signup');
      await middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const url: URL = NextResponse.redirect.mock.calls[0][0];
      expect(url.pathname).toBe('/dashboard');
    });
  });

  describe('auth routes — unauthenticated passes through', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
    });

    it('allows /auth/login through', async () => {
      const req = createRequest('/auth/login');
      await middleware(req);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it('allows /auth/signup through', async () => {
      const req = createRequest('/auth/signup');
      await middleware(req);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('unprotected routes', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
    });

    it('allows / through', async () => {
      const req = createRequest('/');
      await middleware(req);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('config', () => {
    it('exports a matcher pattern', () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher).toHaveLength(1);
    });
  });
});

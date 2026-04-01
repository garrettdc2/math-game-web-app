import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error');

  // Handle OAuth error redirects from the provider
  if (errorParam) {
    console.error('OAuth provider error:', errorParam);
    return NextResponse.redirect(
      new URL('/auth/login?error=oauth_error', requestUrl.origin),
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('OAuth callback error:', error.message);
      return NextResponse.redirect(
        new URL('/auth/login?error=oauth_error', requestUrl.origin),
      );
    }
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}

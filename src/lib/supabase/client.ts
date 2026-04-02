import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Creates a Supabase client for browser-side usage.
 *
 * NOTE: The `Database` generic is intentionally omitted here because
 * `@supabase/ssr` v0.5's `createBrowserClient` has a type resolution
 * incompatibility with the generated Database interface that causes
 * downstream query types to resolve to `never`. The server client
 * (`server.ts`) does use the `Database` generic successfully via
 * `createServerClient`. This should be revisited when upgrading
 * `@supabase/ssr` to a version with corrected type inference.
 */
export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local. See .env.local.example for details.'
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

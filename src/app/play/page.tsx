'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import GameContainer from '@/components/game/GameContainer';

/**
 * /play — Game play page.
 *
 * Protected route: redirects to login if not authenticated.
 * Renders the GameContainer which handles grade selection and gameplay.
 */
export default function PlayPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
      </div>
    );
  }

  // Not authenticated — will redirect
  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <GameContainer />
    </div>
  );
}

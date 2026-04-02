'use client';

import { useEffect, useState } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { type Grade } from '@/types';
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable';
import GradeFilter from '@/components/leaderboard/GradeFilter';
import { createClient } from '@/lib/supabase/client';

export default function LeaderboardPage() {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [userGrade, setUserGrade] = useState<Grade | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch the current user's profile to get their selected grade and user ID
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setCurrentUserId(user.id);

          const { data: profile } = await supabase
            .from('profiles')
            .select('selected_grade')
            .eq('id', user.id)
            .single() as { data: { selected_grade: string | null } | null };

          if (profile?.selected_grade) {
            setUserGrade(profile.selected_grade as Grade);
          }
        }
      } catch {
        // Silently handle — user may not be logged in
      } finally {
        setInitialized(true);
      }
    }

    loadUserProfile();
  }, []);

  const {
    entries,
    selectedGrade,
    setSelectedGrade,
    isLoading,
    error,
    refresh,
  } = useLeaderboard({
    initialGrade: userGrade ?? '1',
  });

  // Once we know the user's grade, sync it to the hook
  useEffect(() => {
    if (userGrade && initialized) {
      setSelectedGrade(userGrade);
    }
  }, [userGrade, initialized, setSelectedGrade]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Leaderboard
          </h1>
          <p className="mt-2 text-gray-400">
            See how you rank against other players in your grade.
          </p>
        </div>

        {/* Grade Filter */}
        <div className="mb-6">
          <GradeFilter
            selectedGrade={selectedGrade}
            onGradeChange={setSelectedGrade}
          />
        </div>

        {/* Grade Label */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-200">
            Grade {selectedGrade} Rankings
          </h2>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-sm">
            <p className="font-medium">Failed to load leaderboard</p>
            <p className="mt-1 text-red-400">{error}</p>
            <button
              onClick={refresh}
              className="mt-2 text-red-300 underline hover:text-red-200 text-xs"
            >
              Try again
            </button>
          </div>
        )}

        {/* Leaderboard Table */}
        <LeaderboardTable
          entries={entries}
          isLoading={isLoading}
          currentUserId={currentUserId}
        />

        {/* Footer info */}
        {!isLoading && entries.length > 0 && (
          <p className="mt-4 text-center text-xs text-gray-600">
            Showing top {entries.length} players for Grade {selectedGrade}
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type Grade = 'K' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalScore: number;
  gamesPlayed: number;
}

interface UseLeaderboardOptions {
  initialGrade?: Grade;
  limit?: number;
}

interface UseLeaderboardReturn {
  entries: LeaderboardEntry[];
  selectedGrade: Grade;
  setSelectedGrade: (grade: Grade) => void;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLeaderboard(
  options: UseLeaderboardOptions = {}
): UseLeaderboardReturn {
  const { initialGrade = '1', limit = 50 } = options;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<Grade>(initialGrade);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Aggregate scores by user for the selected grade, join with profiles
      // for display name and avatar. Uses a raw query via rpc or a composed
      // query depending on what the DB supports.
      const { data, error: queryError } = await supabase
        .from('scores')
        .select(`
          user_id,
          score,
          profiles!inner(display_name, avatar_url)
        `)
        .eq('grade', selectedGrade)
        .order('score', { ascending: false })
        .limit(limit * 10); // Fetch extra rows for aggregation

      if (queryError) {
        throw new Error(queryError.message);
      }

      // Aggregate scores per user on the client side
      const aggregated = new Map<
        string,
        {
          displayName: string;
          avatarUrl: string | null;
          totalScore: number;
          gamesPlayed: number;
        }
      >();

      for (const row of data ?? []) {
        const userId = row.user_id as string;
        const profile = row.profiles as unknown as {
          display_name: string;
          avatar_url: string | null;
        };
        const score = row.score as number;

        const existing = aggregated.get(userId);
        if (existing) {
          existing.totalScore += score;
          existing.gamesPlayed += 1;
        } else {
          aggregated.set(userId, {
            displayName: profile.display_name ?? 'Anonymous',
            avatarUrl: profile.avatar_url ?? null,
            totalScore: score,
            gamesPlayed: 1,
          });
        }
      }

      // Sort by total score descending and assign ranks
      const sorted = Array.from(aggregated.entries())
        .sort((a, b) => b[1].totalScore - a[1].totalScore)
        .slice(0, limit);

      const ranked: LeaderboardEntry[] = sorted.map(([userId, info], index) => ({
        rank: index + 1,
        userId,
        displayName: info.displayName,
        avatarUrl: info.avatarUrl,
        totalScore: info.totalScore,
        gamesPlayed: info.gamesPlayed,
      }));

      setEntries(ranked);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setError(message);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGrade, limit]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    entries,
    selectedGrade,
    setSelectedGrade,
    isLoading,
    error,
    refresh: fetchLeaderboard,
  };
}

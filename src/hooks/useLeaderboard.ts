'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type Grade, type LeaderboardEntry } from '@/types';

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

      // Query the leaderboard view directly — it already aggregates scores
      // with rank per grade via the SQL view in 002_create_scores.sql
      const { data, error: queryError } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('grade', selectedGrade)
        .order('rank', { ascending: true })
        .limit(limit);

      if (queryError) {
        throw new Error(queryError.message);
      }

      const ranked: LeaderboardEntry[] = (data ?? []).map((row) => ({
        userId: row.user_id ?? '',
        grade: (row.grade ?? selectedGrade) as Grade,
        displayName: row.display_name ?? 'Anonymous',
        avatarUrl: row.avatar_url ?? null,
        totalScore: row.total_score ?? 0,
        totalCorrect: row.total_correct ?? 0,
        totalProblems: row.total_problems ?? 0,
        bestStreak: row.best_streak ?? 0,
        gamesPlayed: Number(row.games_played ?? 0),
        rank: Number(row.rank ?? 0),
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

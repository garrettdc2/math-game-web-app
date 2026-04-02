'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { type Grade } from '@/types';
import GradeSelector from '@/components/shared/GradeSelector';
import { createClient } from '@/lib/supabase/client';

interface UserStats {
  totalScore: number;
  gamesPlayed: number;
  bestStreak: number;
  problemsCorrect: number;
  problemsTotal: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [savingGrade, setSavingGrade] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Load user profile and stats
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const supabase = createClient();

      // Fetch profile for saved grade
      const { data: profile } = await supabase
        .from('profiles')
        .select('selected_grade')
        .eq('id', user.id)
        .single();

      if (profile?.selected_grade) {
        setSelectedGrade(profile.selected_grade as Grade);
      }

      // Fetch aggregated stats
      const { data: scores } = await supabase
        .from('scores')
        .select('score, streak, problems_correct, problems_total')
        .eq('user_id', user.id);

      if (scores && scores.length > 0) {
        setStats({
          totalScore: scores.reduce((sum, s) => sum + s.score, 0),
          gamesPlayed: scores.length,
          bestStreak: Math.max(...scores.map((s) => s.streak)),
          problemsCorrect: scores.reduce(
            (sum, s) => sum + s.problems_correct,
            0
          ),
          problemsTotal: scores.reduce(
            (sum, s) => sum + s.problems_total,
            0
          ),
        });
      } else {
        setStats({
          totalScore: 0,
          gamesPlayed: 0,
          bestStreak: 0,
          problemsCorrect: 0,
          problemsTotal: 0,
        });
      }

      setStatsLoading(false);
    };

    loadData();
  }, [user]);

  const handleGradeSelect = async (grade: Grade) => {
    setSelectedGrade(grade);
    setSavingGrade(true);

    if (user) {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({ selected_grade: grade })
        .eq('id', user.id);
    }

    setSavingGrade(false);
  };

  const handleStartPlaying = () => {
    if (selectedGrade) {
      router.push('/play');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const accuracy =
    stats && stats.problemsTotal > 0
      ? Math.round((stats.problemsCorrect / stats.problemsTotal) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back
          {user.email ? `, ${user.email.split('@')[0]}` : ''}!
        </h1>
        <p className="mt-2 text-gray-400">
          Select your grade level and start solving math problems.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Total Score',
            value: statsLoading ? '...' : stats?.totalScore.toLocaleString(),
            color: 'text-purple-400',
          },
          {
            label: 'Games Played',
            value: statsLoading ? '...' : stats?.gamesPlayed,
            color: 'text-cyan-400',
          },
          {
            label: 'Best Streak',
            value: statsLoading ? '...' : stats?.bestStreak,
            color: 'text-amber-400',
          },
          {
            label: 'Accuracy',
            value: statsLoading ? '...' : `${accuracy}%`,
            color: 'text-emerald-400',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm text-gray-400">{stat.label}</div>
            <div className={`mt-1 text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Grade Selection */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Choose Your Grade Level</h2>
        <GradeSelector
          selectedGrade={selectedGrade}
          onSelect={handleGradeSelect}
        />
        {savingGrade && (
          <p className="mt-2 text-sm text-gray-500">Saving...</p>
        )}
      </div>

      {/* Start Playing CTA */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-8 text-center">
        {selectedGrade ? (
          <>
            <h3 className="text-xl font-semibold">
              Ready to play{' '}
              <span className="text-purple-400">
                {selectedGrade === 'K'
                  ? 'Kindergarten'
                  : `Grade ${selectedGrade}`}
              </span>{' '}
              math?
            </h3>
            <button
              onClick={handleStartPlaying}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
            >
              Start Playing
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </>
        ) : (
          <p className="text-gray-400">
            Select a grade level above to get started.
          </p>
        )}
      </div>
    </div>
  );
}

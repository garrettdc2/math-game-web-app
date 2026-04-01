'use client';

import { type LeaderboardEntry } from '@/hooks/useLeaderboard';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  currentUserId?: string;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 font-bold text-sm">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-400/20 text-gray-300 font-bold text-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 font-bold text-sm">
        3
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 text-gray-500 font-medium text-sm">
      {rank}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="w-8 h-8 bg-gray-700 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-700 rounded-full" />
          <div className="h-4 bg-gray-700 rounded w-32" />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="h-4 bg-gray-700 rounded w-16 ml-auto" />
      </td>
      <td className="px-4 py-3 text-right hidden sm:table-cell">
        <div className="h-4 bg-gray-700 rounded w-12 ml-auto" />
      </td>
    </tr>
  );
}

export default function LeaderboardTable({
  entries,
  isLoading,
  currentUserId,
}: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-xl bg-gray-900/50 border border-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Player
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Score
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28 hidden sm:table-cell">
                Games
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl bg-gray-900/50 border border-gray-800 p-12 text-center">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-gray-400 text-lg font-medium">No scores yet for this grade</p>
        <p className="text-gray-600 text-sm mt-1">Be the first to play and claim the top spot!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-gray-900/50 border border-gray-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
              Rank
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Player
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
              Score
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28 hidden sm:table-cell">
              Games
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {entries.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
            return (
              <tr
                key={entry.userId}
                className={`
                  transition-colors duration-150
                  ${isCurrentUser ? 'bg-indigo-950/30 border-l-2 border-l-indigo-500' : 'hover:bg-gray-800/50'}
                `}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {entry.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`font-medium ${
                        isCurrentUser ? 'text-indigo-300' : 'text-gray-200'
                      }`}
                    >
                      {entry.displayName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-indigo-400 font-normal">(you)</span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-white font-semibold tabular-nums">
                    {entry.totalScore.toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right hidden sm:table-cell">
                  <span className="text-gray-400 tabular-nums">{entry.gamesPlayed}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

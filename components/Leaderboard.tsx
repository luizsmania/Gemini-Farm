import React, { useState, useEffect } from 'react';
import { Trophy, Coins, TrendingUp, Star, Crown, Medal, Award } from 'lucide-react';
import { LeaderboardEntry } from '../types';
import { fetchLeaderboard } from '../services/leaderboardService';
import { Button } from './Button';

interface LeaderboardProps {
  currentUsername?: string;
}

type LeaderboardCategory = 'coins' | 'level' | 'prestige' | 'total_harvested';

export const Leaderboard: React.FC<LeaderboardProps> = ({ currentUsername }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [category, setCategory] = useState<LeaderboardCategory>('coins');
  const [loading, setLoading] = useState(false);
  const [playerRank, setPlayerRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [category]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaderboard(category, 100);
      setLeaderboard(data);
      
      if (currentUsername) {
        const player = data.find(entry => entry.username === currentUsername);
        setPlayerRank(player ? player.rank : null);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-slate-400 font-bold">#{rank}</span>;
  };

  const formatScore = (score: number, cat: LeaderboardCategory) => {
    switch (cat) {
      case 'coins':
        return `${score.toLocaleString()} coins`;
      case 'level':
        return `Level ${score}`;
      case 'prestige':
        return `Prestige ${score}`;
      case 'total_harvested':
        return `${score.toLocaleString()} crops`;
      default:
        return score.toLocaleString();
    }
  };

  const categories: { id: LeaderboardCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'coins', label: 'Wealth', icon: <Coins size={16} /> },
    { id: 'level', label: 'Level', icon: <TrendingUp size={16} /> },
    { id: 'prestige', label: 'Prestige', icon: <Star size={16} /> },
    { id: 'total_harvested', label: 'Harvests', icon: <Trophy size={16} /> },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-200 flex items-center gap-2">
          <Trophy size={20} className="sm:w-6 sm:h-6" /> Leaderboard
        </h2>
        {playerRank && (
          <div className="text-xs sm:text-sm text-emerald-400 font-semibold">
            Your Rank: #{playerRank}
          </div>
        )}
      </div>

      {/* Category Selector */}
      <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            variant={category === cat.id ? 'primary' : 'secondary'}
            size="sm"
            className="flex items-center gap-1 sm:gap-2 whitespace-nowrap flex-shrink-0 text-[10px] sm:text-xs"
          >
            <span className="w-3 h-3 sm:w-4 sm:h-4">{cat.icon}</span>
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Leaderboard List */}
      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center text-slate-400 py-8">No players found</div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = entry.username === currentUsername;
            return (
              <div
                key={`${entry.username}-${index}`}
                className={`
                  bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border transition-all
                  ${isCurrentUser ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/5'}
                  ${entry.rank <= 3 ? 'ring-2 ring-opacity-50' : ''}
                  ${entry.rank === 1 ? 'ring-yellow-400' : entry.rank === 2 ? 'ring-gray-300' : entry.rank === 3 ? 'ring-amber-600' : ''}
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm sm:text-base ${isCurrentUser ? 'text-emerald-400' : 'text-slate-200'} truncate`}>
                        {entry.username}
                        {isCurrentUser && <span className="ml-1.5 sm:ml-2 text-[10px] sm:text-xs">(You)</span>}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                        Level {entry.level}
                        {entry.prestigeLevel > 0 && (
                          <span className="ml-1.5 sm:ml-2 text-purple-400">
                            ⭐ Prestige {entry.prestigeLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="font-bold text-emerald-400 text-sm sm:text-base md:text-lg">
                      {formatScore(entry.score, category)}
                    </div>
                    {entry.rank <= 3 && (
                      <div className="text-[9px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                        {entry.rank === 1 ? '🥇 Champion' : entry.rank === 2 ? '🥈 Runner-up' : '🥉 Third Place'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={loadLeaderboard}
          disabled={loading}
          variant="secondary"
          size="sm"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
};



import React from 'react';
import { Button } from './Button';
import { Sparkles, TrendingUp, Crown } from 'lucide-react';

interface PrestigePanelProps {
  level: number;
  prestigeLevel: number;
  prestigePoints: number;
  canPrestige: boolean;
  onPrestige: () => void;
  stats: {
    totalEarned: number;
    totalHarvested: number;
    playTime: number;
    missionsCompleted: number;
  };
}

export const PrestigePanel: React.FC<PrestigePanelProps> = ({
  level,
  prestigeLevel,
  prestigePoints,
  canPrestige,
  onPrestige,
  stats
}) => {
  const requiredLevel = 50 + (prestigeLevel * 10);
  const bonusMultiplier = 1 + (prestigeLevel * 0.1); // 10% per prestige

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 rounded-3xl p-6 border border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="text-yellow-400" size={24} />
          <h2 className="text-2xl font-bold text-purple-100">Prestige System</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-purple-200">Current Prestige Level</span>
              <span className="text-2xl font-bold text-yellow-400">{prestigeLevel}</span>
            </div>
            <div className="text-sm text-purple-300">
              +{(bonusMultiplier - 1) * 100}% to all XP and Coins
            </div>
          </div>

          <div className="bg-black/30 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-purple-200">Prestige Points</span>
              <span className="text-xl font-bold text-purple-400">{prestigePoints}</span>
            </div>
            <div className="text-xs text-purple-300 mt-1">
              Use points to unlock permanent upgrades
            </div>
          </div>

          {level >= requiredLevel && (
            <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 rounded-xl p-4 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-yellow-400" size={20} />
                <span className="font-bold text-yellow-100">Ready to Prestige!</span>
              </div>
              <p className="text-sm text-yellow-200 mb-3">
                Reset your progress for permanent bonuses. You'll keep prestige level and unlockable upgrades.
              </p>
              <Button
                onClick={onPrestige}
                variant="primary"
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
              >
                Prestige Now
              </Button>
            </div>
          )}

          {level < requiredLevel && (
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="text-slate-400 text-sm">
                Reach level {requiredLevel} to unlock prestige
              </div>
              <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-500"
                  style={{ width: `${(level / requiredLevel) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 rounded-xl p-4">
        <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
          <TrendingUp size={18} />
          Lifetime Stats
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-slate-400">Total Earned</div>
            <div className="text-yellow-400 font-bold">{stats.totalEarned.toLocaleString()} coins</div>
          </div>
          <div>
            <div className="text-slate-400">Total Harvested</div>
            <div className="text-emerald-400 font-bold">{stats.totalHarvested.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-slate-400">Play Time</div>
            <div className="text-blue-400 font-bold">{Math.floor(stats.playTime / 3600)}h</div>
          </div>
          <div>
            <div className="text-slate-400">Missions</div>
            <div className="text-purple-400 font-bold">{stats.missionsCompleted}</div>
          </div>
        </div>
      </div>
    </div>
  );
};


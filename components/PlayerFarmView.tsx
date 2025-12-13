import React, { useState, useEffect } from 'react';
import { X, Coins, Star, Trophy, Target, TrendingUp, Loader2, Eye } from 'lucide-react';
import { GameState, Plot as PlotType } from '../types';
import { Plot } from './Plot';
import { Decoration } from './Decoration';
import { GRID_SIZE, CROPS, BUILDINGS } from '../constants';

interface PlayerFarmViewProps {
  username: string;
  onClose: () => void;
}

interface PlayerPublicState {
  username: string;
  createdAt: number;
  level: number;
  coins: number;
  xp: number;
  prestigeLevel: number;
  prestigePoints: number;
  plots: PlotType[];
  decorations: any[];
  statistics: GameState['statistics'];
  inventory: Record<string, number>;
  harvested: Record<string, number>;
  missions: any[];
  achievements: any[];
}

export const PlayerFarmView: React.FC<PlayerFarmViewProps> = ({ username, onClose }) => {
  const [playerState, setPlayerState] = useState<PlayerPublicState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'farm' | 'stats'>('farm');

  useEffect(() => {
    loadPlayerState();
  }, [username]);

  const loadPlayerState = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/get-player-state?username=${encodeURIComponent(username)}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setPlayerState(result.data);
      } else {
        setError(result.error || 'Failed to load player data');
      }
    } catch (err) {
      console.error('Error loading player state:', err);
      setError('Failed to load player farm');
    } finally {
      setLoading(false);
    }
  };

  const renderGrid = () => {
    if (!playerState) return null;

    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const plot = playerState.plots.find(p => p.x === x && p.y === y);
        const groundDecorations = playerState.decorations.filter(d => d.x === x && d.y === y && d.layer === 'ground');
        const overlayDecorations = playerState.decorations.filter(d => d.x === x && d.y === y && d.layer === 'overlay');

        cells.push(
          <div
            key={`${x}-${y}`}
            data-grid-cell={`${x}-${y}`}
            className="relative aspect-square"
          >
            {/* Ground decorations */}
            {groundDecorations.map(decor => (
              <Decoration key={decor.id} decoration={decor} />
            ))}

            {/* Plot */}
            {plot ? (
              <Plot
                plot={plot}
                selectedSeedId={null}
                selectedBuildingId={null}
                onMouseDown={() => {}}
                onMouseEnter={() => {}}
                onInteractBuilding={() => {}}
                isEditMode={false}
              />
            ) : (
              <div className="w-full h-full bg-slate-800/30 rounded-xl border border-slate-700/50" />
            )}

            {/* Overlay decorations */}
            {overlayDecorations.map(decor => (
              <Decoration key={decor.id} decoration={decor} />
            ))}
          </div>
        );
      }
    }
    return cells;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-lg p-6 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <div className="text-slate-300">Loading {username}'s farm...</div>
        </div>
      </div>
    );
  }

  if (error || !playerState) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Error</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="text-slate-300 mb-4">{error || 'Player not found'}</div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const completedMissions = playerState.missions.filter(m => m?.completed).length;
  const totalMissions = playerState.missions.filter(m => m?.unlocked).length;
  const unlockedAchievements = playerState.achievements.filter(a => a?.unlocked).length;
  const totalAchievements = playerState.achievements.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-xl font-bold text-white">{playerState.username}'s Farm</h2>
              <div className="text-sm text-slate-400">
                Level {playerState.level}
                {playerState.prestigeLevel > 0 && (
                  <span className="ml-2 text-purple-400">⭐ Prestige {playerState.prestigeLevel}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('farm')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'farm'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Farm
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'stats'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Statistics
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'farm' && (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-2 max-w-2xl mx-auto">
                {renderGrid()}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Basic Stats */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3">Basic Stats</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center gap-2">
                      <Coins size={16} /> Coins
                    </span>
                    <span className="text-white font-bold">{playerState.coins.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 flex items-center gap-2">
                      <Star size={16} /> XP
                    </span>
                    <span className="text-white font-bold">{playerState.xp.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Plots Owned</span>
                    <span className="text-white font-bold">{playerState.plots.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Decorations</span>
                    <span className="text-white font-bold">{playerState.decorations.length}</span>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-bold text-white mb-3">Progress</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Target size={16} /> Missions
                      </span>
                      <span className="text-white font-bold">{completedMissions} / {totalMissions}</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${totalMissions > 0 ? (completedMissions / totalMissions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 flex items-center gap-2">
                        <Trophy size={16} /> Achievements
                      </span>
                      <span className="text-white font-bold">{unlockedAchievements} / {totalAchievements}</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{ width: `${totalAchievements > 0 ? (unlockedAchievements / totalAchievements) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {playerState.statistics && (
                <div className="bg-slate-700/50 rounded-lg p-4 md:col-span-2">
                  <h3 className="text-lg font-bold text-white mb-3">Statistics</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-slate-400">Total Earned</div>
                      <div className="text-white font-bold">{playerState.statistics.totalEarned?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Total Spent</div>
                      <div className="text-white font-bold">{playerState.statistics.totalSpent?.toLocaleString() || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Buildings Built</div>
                      <div className="text-white font-bold">{playerState.statistics.buildingsBuilt || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Quests Completed</div>
                      <div className="text-white font-bold">{playerState.statistics.questsCompleted || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Missions Completed</div>
                      <div className="text-white font-bold">{playerState.statistics.missionsCompleted || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Highest Level</div>
                      <div className="text-white font-bold">{playerState.statistics.levelReached || 1}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};




import React from 'react';
import { Quest } from '../types';
import { CROPS } from '../constants';
import { ScrollText, Timer, Trophy, Sparkles } from 'lucide-react';
import { Button } from './Button';

interface QuestBoardProps {
  quest: Quest | null;
  loading: boolean;
  onRequestQuest: () => void;
}

export const QuestBoard: React.FC<QuestBoardProps> = ({ quest, loading, onRequestQuest }) => {
  if (!quest) {
    return (
        <div className="h-full bg-[#1a1c2e]/60 border border-slate-700/50 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center gap-4">
            <div className="p-3 bg-slate-800/50 rounded-full">
                <ScrollText className="text-slate-500" size={24} />
            </div>
            <div>
                <h3 className="text-slate-200 font-bold">No Active Orders</h3>
                <p className="text-xs text-slate-500 max-w-[200px] mx-auto mt-1">Complete special orders to earn massive XP and Coin rewards.</p>
            </div>
            <Button onClick={onRequestQuest} disabled={loading} size="sm" variant="secondary" className="mt-2 bg-slate-700 hover:bg-slate-600 text-white">
                {loading ? <span className="flex items-center gap-2"><Sparkles size={14} className="animate-spin"/> Finding...</span> : "Check Board"}
            </Button>
        </div>
    );
  }

  const crop = CROPS[quest.cropId];
  const progress = (quest.currentAmount / quest.targetAmount) * 100;
  const timeLeft = Math.max(0, Math.floor((quest.expiresAt - Date.now()) / 1000));
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="h-full bg-gradient-to-br from-amber-950/40 to-[#1a1c2e] border border-amber-600/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden group shadow-lg">
        {/* Background glow */}
        <div className="absolute -top-6 sm:-top-10 -right-6 sm:-right-10 w-24 h-24 sm:w-32 sm:h-32 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start relative z-10 mb-3 sm:mb-4 gap-2">
            <div className="flex gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-500/10 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl border border-amber-500/20 shadow-sm flex-shrink-0">
                    {crop.emoji}
                 </div>
                 <div className="min-w-0 flex-1">
                     <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                        <span className="bg-amber-500/20 text-amber-300 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded border border-amber-500/20">URGENT</span>
                     </div>
                     <h3 className="font-bold text-amber-50 text-sm sm:text-base md:text-lg leading-tight">{quest.title}</h3>
                     <p className="text-[10px] sm:text-xs text-amber-200/60 mt-0.5 sm:mt-1">{quest.description}</p>
                 </div>
            </div>
        </div>

        <div className="space-y-2 sm:space-y-3 relative z-10 mt-auto">
            <div className="flex justify-between items-end gap-2">
                <div className="text-[10px] sm:text-xs font-bold text-amber-200/80 min-w-0">
                    <span className="text-white text-base sm:text-lg">{quest.currentAmount}</span> / {quest.targetAmount} {crop.name}
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 text-amber-400 font-mono text-xs sm:text-sm font-bold bg-amber-950/30 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-amber-500/10">
                        <Timer size={12} className="sm:w-[14px] sm:h-[14px]" />
                        {minutes}:{seconds.toString().padStart(2, '0')}
                    </div>
                </div>
            </div>
            
            <div className="h-2 sm:h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 pt-2 border-t border-white/5 mt-2 flex-wrap">
                <Trophy size={12} className="sm:w-[14px] sm:h-[14px] text-amber-300" />
                <span className="text-[10px] sm:text-xs font-bold text-amber-100">Reward:</span>
                <span className="text-[10px] sm:text-xs text-amber-300">{quest.rewardCoins} Coins</span>
                <span className="text-[10px] sm:text-xs text-slate-500">•</span>
                <span className="text-[10px] sm:text-xs text-blue-300">{quest.rewardXp} XP</span>
            </div>
        </div>
    </div>
  );
};

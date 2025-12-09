
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
    <div className="h-full bg-gradient-to-br from-amber-950/40 to-[#1a1c2e] border border-amber-600/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
        {/* Background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex justify-between items-start relative z-10 mb-4">
            <div className="flex gap-4">
                 <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-2xl border border-amber-500/20 shadow-sm">
                    {crop.emoji}
                 </div>
                 <div>
                     <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/20">URGENT</span>
                     </div>
                     <h3 className="font-bold text-amber-50 text-lg leading-tight">{quest.title}</h3>
                     <p className="text-xs text-amber-200/60 mt-1">{quest.description}</p>
                 </div>
            </div>
        </div>

        <div className="space-y-3 relative z-10 mt-auto">
            <div className="flex justify-between items-end">
                <div className="text-xs font-bold text-amber-200/80">
                    <span className="text-white text-lg">{quest.currentAmount}</span> / {quest.targetAmount} {crop.name}
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1.5 text-amber-400 font-mono text-sm font-bold bg-amber-950/30 px-2 py-1 rounded-lg border border-amber-500/10">
                        <Timer size={14} />
                        {minutes}:{seconds.toString().padStart(2, '0')}
                    </div>
                </div>
            </div>
            
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-2">
                <Trophy size={14} className="text-amber-300" />
                <span className="text-xs font-bold text-amber-100">Reward:</span>
                <span className="text-xs text-amber-300">{quest.rewardCoins} Coins</span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs text-blue-300">{quest.rewardXp} XP</span>
            </div>
        </div>
    </div>
  );
};

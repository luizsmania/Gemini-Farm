
import React from 'react';
import { MarketTrend } from '../types';
import { CROPS } from '../constants';
import { BrainCircuit, Loader2, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { Button } from './Button';

interface MarketAnalystProps {
  trend: MarketTrend | null;
  loading: boolean;
  onRefresh: () => void;
  cooldown: number; // seconds remaining
}

export const MarketAnalyst: React.FC<MarketAnalystProps> = ({ trend, loading, onRefresh, cooldown }) => {
  const trendingCrop = trend?.cropId ? CROPS[trend.cropId] : null;

  return (
    <div className="h-full bg-gradient-to-br from-indigo-900/30 to-[#1a1c2e] rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-indigo-500/20 relative overflow-hidden flex flex-col justify-between">
      
      {/* Decorative BG */}
      <div className="absolute -top-8 sm:-top-12 -right-8 sm:-right-12 w-32 h-32 sm:w-48 sm:h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 opacity-20 pointer-events-none text-indigo-400">
        <BrainCircuit size={32} className="sm:w-12 sm:h-12" />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-indigo-500/20 rounded-lg">
                <Sparkles className="text-indigo-300 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-indigo-100 font-bold text-base sm:text-lg">Market Forecast</h3>
        </div>

        {!trend && !loading && (
            <div className="py-3 sm:py-4 text-indigo-200/60 text-xs sm:text-sm leading-relaxed">
               The market is currently stable. Request an AI analysis to discover potential price spikes!
            </div>
        )}

        {loading && (
            <div className="py-4 sm:py-6 flex flex-col items-center justify-center text-indigo-300 gap-2 sm:gap-3">
              <Loader2 className="animate-spin w-6 h-6 sm:w-8 sm:h-8 opacity-70" />
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest opacity-70">Analyzing Data...</span>
            </div>
        )}

        {trend && trendingCrop && !loading && (
            <div className="bg-indigo-950/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-indigo-500/20 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                <div className="flex items-center gap-2 sm:gap-4 relative z-10">
                    <div className="text-2xl sm:text-3xl md:text-4xl filter drop-shadow-md grayscale-[0.2] group-hover:grayscale-0 transition-all scale-90 group-hover:scale-100 duration-300 flex-shrink-0">
                        {trendingCrop.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-emerald-300 font-bold flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg flex-wrap">
                            {trendingCrop.name} <span className="text-emerald-400 bg-emerald-400/10 px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-xs border border-emerald-400/20">+{Math.round((trend.multiplier - 1) * 100)}%</span>
                        </p>
                        <p className="text-[10px] sm:text-xs text-indigo-200/80 mt-0.5 sm:mt-1 italic leading-tight">"{trend.description}"</p>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
          <Button 
            onClick={onRefresh} 
            disabled={loading || cooldown > 0}
            variant="ghost"
            fullWidth
            className={`
                border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-200 transition-all
                ${cooldown > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]'}
            `}
          >
            {loading ? "Thinking..." : cooldown > 0 ? (
                <span className="flex items-center gap-2 font-mono"><Loader2 size={14} className="animate-spin"/> {cooldown}s</span>
            ) : (
                <span className="flex items-center gap-2"><Zap size={16} className="text-yellow-300 fill-yellow-300" /> Predict Trends</span>
            )}
          </Button>
      </div>
    </div>
  );
};

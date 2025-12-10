
import React, { useState } from 'react';
import { CropId, BuildingId, DecorationId } from '../types';
import { CROPS, BUILDINGS, DECORATIONS, PLOT_COST_BASE, PLOT_COST_MULTIPLIER, MAX_PLOTS, SPRINKLER_COST } from '../constants';
import { Button } from './Button';
import { Coins, Sprout, Factory, Waves, LandPlot, ArrowUpCircle, Flower } from 'lucide-react';
import { safePreventDefault } from '../utils/eventHelpers';

interface ShopProps {
  coins: number;
  level: number;
  plotCount: number;
  inventory: Record<CropId, number>; // Add inventory prop
  onBuySeed: (cropId: CropId, amount: number) => void;
  onBuyBuilding: (buildingId: BuildingId) => void;
  onBuyDecoration: (decorationId: DecorationId) => void;
  onBuySprinkler: () => void;
  onBuyPlot: () => void;
}

export const Shop: React.FC<ShopProps> = ({ 
  coins, level, plotCount, inventory, onBuySeed, onBuyBuilding, onBuyDecoration, onBuySprinkler, onBuyPlot 
}) => {
  const [activeCategory, setActiveCategory] = useState<'seeds' | 'buildings' | 'decor'>('seeds');
  
  const nextPlotCost = Math.floor(PLOT_COST_BASE * Math.pow(PLOT_COST_MULTIPLIER, plotCount - 6));
  const isMaxPlots = plotCount >= MAX_PLOTS;

  return (
    <div className="pb-20 space-y-8">
      
      {/* Upgrades Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Land Expansion */}
        <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900/50 rounded-3xl p-6 border border-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <ArrowUpCircle size={120} />
            </div>
            <h3 className="font-bold text-indigo-100 flex items-center gap-2">
                <LandPlot className="text-indigo-400" size={18} /> New Plot
            </h3>
            <p className="text-indigo-200/60 text-xs mt-1 mb-4">Current: {plotCount} Plots</p>
            <Button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onBuyPlot();
                }}
                onTouchEnd={(e) => {
                    safePreventDefault(e);
                    if (!isMaxPlots && coins >= nextPlotCost) {
                        onBuyPlot();
                    }
                }}
                disabled={isMaxPlots || coins < nextPlotCost}
                variant={isMaxPlots ? "ghost" : "primary"}
                className="w-full text-xs touch-manipulation"
            >
                {isMaxPlots ? "Max Size" : `${nextPlotCost} Coins`}
            </Button>
        </div>

        {/* Sprinkler Upgrade */}
        <div className="bg-gradient-to-r from-cyan-900/50 to-slate-900/50 rounded-3xl p-6 border border-cyan-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Waves size={120} />
            </div>
            <h3 className="font-bold text-cyan-100 flex items-center gap-2">
                <Waves className="text-cyan-400" size={18} /> Buy Sprinkler
            </h3>
            <p className="text-cyan-200/60 text-xs mt-1 mb-4">Auto-waters 1 plot forever.</p>
            <Button 
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onBuySprinkler();
                }}
                onTouchEnd={(e) => {
                    safePreventDefault(e);
                    if (coins >= SPRINKLER_COST) {
                        onBuySprinkler();
                    }
                }}
                disabled={coins < SPRINKLER_COST}
                variant="success"
                className="w-full text-xs bg-cyan-600 hover:bg-cyan-500 touch-manipulation"
            >
                {SPRINKLER_COST} Coins
            </Button>
        </div>
      </section>

      {/* Categories */}
      <div className="flex gap-4 border-b border-white/10 pb-1 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveCategory('seeds')}
            className={`pb-2 px-2 text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeCategory === 'seeds' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500'}`}
          >
            <Sprout size={16} /> Seeds
          </button>
          <button 
            onClick={() => setActiveCategory('buildings')}
            className={`pb-2 px-2 text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeCategory === 'buildings' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
          >
            <Factory size={16} /> Buildings
          </button>
          <button 
            onClick={() => setActiveCategory('decor')}
            className={`pb-2 px-2 text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeCategory === 'decor' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-slate-500'}`}
          >
            <Flower size={16} /> Decor
          </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCategory === 'seeds' && Object.values(CROPS).map((crop) => {
                const isLocked = level < crop.unlockLevel;
                return (
                    <div key={crop.id} className={`bg-[#1e293b]/60 backdrop-blur-md rounded-2xl p-5 border transition-all ${isLocked ? 'border-slate-700 opacity-70' : 'border-white/5 hover:border-emerald-500/30'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div className={`w-12 h-12 rounded-xl ${crop.color} flex items-center justify-center text-2xl`}>{crop.emoji}</div>
                            <div className="text-right">
                                <div className="text-emerald-400 font-bold">{crop.buyPrice} <Coins size={12} className="inline"/></div>
                                {isLocked && <div className="text-red-400 text-[10px] font-bold">Lvl {crop.unlockLevel}</div>}
                            </div>
                        </div>
                        <h4 className="font-bold text-slate-200">{crop.name}</h4>
                        <p className="text-xs text-slate-500 mb-2 h-8">{crop.description}</p>
                        <div className="mb-3 text-xs text-emerald-400 font-semibold">
                          In stock: {inventory[crop.id] || 0}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                disabled={isLocked || coins < crop.buyPrice} 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onBuySeed(crop.id, 1);
                                }}
                                onTouchEnd={(e) => {
                                    safePreventDefault(e);
                                    if (!isLocked && coins >= crop.buyPrice) {
                                        onBuySeed(crop.id, 1);
                                    }
                                }}
                                className="touch-manipulation"
                            >
                                x1
                            </Button>
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                disabled={isLocked || coins < crop.buyPrice*5} 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onBuySeed(crop.id, 5);
                                }}
                                onTouchEnd={(e) => {
                                    safePreventDefault(e);
                                    if (!isLocked && coins >= crop.buyPrice*5) {
                                        onBuySeed(crop.id, 5);
                                    }
                                }}
                                className="touch-manipulation"
                            >
                                x5
                            </Button>
                        </div>
                    </div>
                );
          })}

          {activeCategory === 'buildings' && Object.values(BUILDINGS).map((b) => {
                 const isLocked = level < b.unlockLevel;
                 return (
                    <div key={b.id} className={`bg-[#1e293b]/60 backdrop-blur-md rounded-2xl p-5 border transition-all ${isLocked ? 'border-slate-700 opacity-70' : 'border-white/5 hover:border-blue-500/30'}`}>
                         <div className="flex justify-between items-start mb-2">
                            <div className="w-12 h-12 bg-blue-900/50 rounded-xl flex items-center justify-center text-2xl border border-blue-500/20">{b.emoji}</div>
                            <div className="text-right">
                                <div className="text-amber-400 font-bold">{b.cost} <Coins size={12} className="inline"/></div>
                                {isLocked && <div className="text-red-400 text-[10px] font-bold">Lvl {b.unlockLevel}</div>}
                            </div>
                        </div>
                        <h4 className="font-bold text-slate-200">{b.name}</h4>
                        <p className="text-xs text-slate-500 mb-4 h-8">{b.description}</p>
                        <Button 
                            fullWidth 
                            size="sm" 
                            disabled={isLocked || coins < b.cost}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onBuyBuilding(b.id);
                            }}
                            onTouchEnd={(e) => {
                                safePreventDefault(e);
                                if (!isLocked && coins >= b.cost) {
                                    onBuyBuilding(b.id);
                                }
                            }}
                            className={`touch-manipulation ${isLocked ? "" : "bg-blue-600 hover:bg-blue-500"}`}
                        >
                            Build
                        </Button>
                    </div>
                 );
          })}

          {activeCategory === 'decor' && Object.values(DECORATIONS).map((d) => (
               <div key={d.id} className={`bg-[#1e293b]/60 backdrop-blur-md rounded-2xl p-5 border border-white/5 hover:border-pink-500/30 transition-all`}>
                    <div className="flex justify-between items-start mb-2">
                       <div className="w-12 h-12 bg-pink-900/30 rounded-xl flex items-center justify-center text-2xl border border-pink-500/20">{d.emoji}</div>
                       <div className="text-right">
                           <div className="text-amber-400 font-bold">{d.cost} <Coins size={12} className="inline"/></div>
                       </div>
                   </div>
                   <h4 className="font-bold text-slate-200">{d.name}</h4>
                   <p className="text-xs text-slate-500 mb-4 h-8">{d.description}</p>
                   <Button 
                       fullWidth 
                       size="sm" 
                       disabled={coins < d.cost}
                       onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           onBuyDecoration(d.id);
                       }}
                       onTouchEnd={(e) => {
                           safePreventDefault(e);
                           if (coins >= d.cost) {
                               onBuyDecoration(d.id);
                           }
                       }}
                       className="bg-pink-600 hover:bg-pink-500 touch-manipulation"
                   >
                       Buy
                   </Button>
               </div>
          ))}
      </div>
    </div>
  );
};


import React, { useEffect, useState } from 'react';
import { Plot as PlotType, CropId, BuildingId } from '../types';
import { CROPS, BUILDINGS } from '../constants';
import { Sprout, Check, Droplets, Shovel, Settings, Factory, Waves } from 'lucide-react';

interface PlotProps {
  plot: PlotType;
  selectedSeedId: CropId | null;
  selectedBuildingId: BuildingId | null;
  onMouseDown: (plotId: number) => void;
  onMouseEnter: (plotId: number) => void;
  onInteractBuilding: (plotId: number) => void;
  isEditMode: boolean;
}

export const Plot: React.FC<PlotProps> = ({ 
  plot, 
  selectedSeedId, 
  selectedBuildingId,
  onMouseDown, 
  onMouseEnter,
  onInteractBuilding,
  isEditMode
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (plot.status === 'growing' && plot.plantedAt && plot.cropId) {
      const crop = CROPS[plot.cropId];
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - plot.plantedAt!;
        const percent = Math.min((elapsed / crop.growTimeMs) * 100, 100);
        setProgress(percent);
      }, 100);
      return () => clearInterval(interval);
    }

    if (plot.status === 'building' && plot.plantedAt && plot.buildingId && typeof plot.processingRecipeIdx === 'number') {
      const building = BUILDINGS[plot.buildingId];
      const recipe = building.recipes[plot.processingRecipeIdx];
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - plot.plantedAt!;
        const percent = Math.min((elapsed / recipe.processTimeMs) * 100, 100);
        setProgress(percent);
      }, 100);
      return () => clearInterval(interval);
    }
    
    setProgress(0);
  }, [plot.status, plot.plantedAt, plot.cropId, plot.buildingId, plot.processingRecipeIdx]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isEditMode) {
        onMouseDown(plot.id);
        return;
    }
    if (plot.status === 'building') {
      onInteractBuilding(plot.id);
    } else {
      onMouseDown(plot.id);
    }
  };

  const isDry = plot.status === 'growing' && !plot.isWatered && !plot.hasSprinkler;
  const building = plot.buildingId ? BUILDINGS[plot.buildingId] : null;

  return (
    <div 
      onMouseDown={handleMouseDown}
      onMouseEnter={() => plot.status !== 'building' && !isEditMode && onMouseEnter(plot.id)}
      className={`
        w-full h-full rounded-xl relative group transition-all duration-300 select-none cursor-pointer
        shadow-sm border
        ${isEditMode ? 'ring-2 ring-yellow-400 animate-pulse' : ''}
        ${plot.status === 'empty' 
            ? 'bg-[#3d342b] border-[#54483b] hover:border-emerald-500/50' 
            : plot.status === 'building'
                ? 'bg-slate-800 border-slate-600'
                : plot.isWatered 
                    ? 'bg-[#2a241e] border-[#3d342b]' // Wet
                    : 'bg-[#5c5042] border-[#6b5d4d]' // Dry
        }
      `}
    >
        {/* Sprinkler Overlay */}
        {plot.hasSprinkler && (
            <div className="absolute top-0.5 left-0.5 z-20 text-blue-400 opacity-80">
                <Waves size={12} />
            </div>
        )}

        {/* Hover Hints */}
        {!isEditMode && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-white/5 transition-colors z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
              {plot.status === 'empty' && selectedSeedId && !selectedBuildingId && (
                  <div className="text-white/50 animate-pulse"><Sprout size={24} /></div>
              )}
              {plot.status === 'empty' && selectedBuildingId && (
                  <div className="text-blue-400/80 animate-pulse"><Factory size={24} /></div>
              )}
              {plot.status === 'growing' && !plot.isWatered && !plot.hasSprinkler && (
                  <div className="bg-blue-500/20 p-1.5 rounded-full backdrop-blur-sm border border-blue-500/50 text-blue-300">
                      <Droplets size={16} />
                  </div>
              )}
              {plot.status === 'ready' && (
                  <div className="bg-emerald-500/20 p-1.5 rounded-full backdrop-blur-sm border border-emerald-500/50 text-emerald-300">
                      <Shovel size={16} />
                  </div>
              )}
          </div>
        )}

        {/* Content */}
        <div className="relative w-full h-full p-1 flex flex-col items-center justify-center z-10">
            {/* CROP */}
            {plot.status !== 'building' && plot.cropId && (
                <>
                    {/* Water Indicator */}
                    {isDry && !isEditMode && (
                        <div className="absolute top-0 right-0 z-30 animate-bounce bg-blue-500 shadow-lg shadow-blue-500/50 p-0.5 rounded-full border border-blue-300">
                            <Droplets size={8} className="text-white" fill="currentColor" />
                        </div>
                    )}

                    {plot.status === 'growing' && (
                        <div className="w-full h-full relative flex items-center justify-center">
                            <div className={`transition-all duration-500 transform origin-bottom ${plot.isWatered ? '' : 'grayscale-[0.5] opacity-80'}`}
                                 style={{ transform: `scale(${0.3 + (progress / 100) * 0.7})` }}>
                                <Sprout className={`w-8 h-8 ${plot.isWatered ? 'text-emerald-400' : 'text-emerald-700'}`} strokeWidth={2.5} />
                            </div>
                            <div className="absolute bottom-1 inset-x-2 h-0.5 bg-black/30 rounded-full overflow-hidden">
                                <div className={`h-full ${plot.isWatered ? 'bg-emerald-500' : 'bg-yellow-600'}`} style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    {plot.status === 'ready' && (
                         <div className="animate-bounce-gentle relative">
                             <div className="text-3xl filter drop-shadow-2xl">{CROPS[plot.cropId].emoji}</div>
                             <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-[#2a241e]">
                                <Check size={8} strokeWidth={4} />
                             </div>
                         </div>
                    )}
                </>
            )}

            {/* BUILDING */}
            {plot.status === 'building' && building && (
                <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <div className="text-3xl mb-1">{building.emoji}</div>
                    
                    {plot.plantedAt ? (
                         <div className="w-full px-2">
                            {plot.readyToHarvestProduct ? (
                                <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 animate-bounce">
                                    <Check size={12} />
                                </div>
                            ) : (
                                <div className="h-1 bg-slate-700 rounded-full overflow-hidden mt-1">
                                    <div className="h-full bg-blue-400" style={{ width: `${progress}%` }} />
                                </div>
                            )}
                         </div>
                    ) : (
                        <div className="absolute top-1 right-1">
                            <Settings size={10} className="text-slate-500 animate-spin-slow" />
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
  );
};

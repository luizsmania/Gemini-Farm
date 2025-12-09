import React, { useState, useEffect, useMemo } from 'react';
import { Plot } from './components/Plot';
import { Shop } from './components/Shop';
import { Decoration } from './components/Decoration';
import { MarketAnalyst } from './components/MarketAnalyst';
import { QuestBoard } from './components/QuestBoard';
import { AuthScreen } from './components/AuthScreen';
import { checkSession, logoutUser } from './services/authService';
import { 
  GameState, CropId, MarketTrend, Weather, Season, Plot as PlotType, 
  BuildingId, ItemId, ProductId, MerchantOffer, User, DecorationId, EditDragItem 
} from './types';
import { 
  CROPS, PRODUCTS, BUILDINGS, INITIAL_PLOTS, MAX_PLOTS, INITIAL_COINS, 
  INITIAL_INVENTORY, INITIAL_HARVESTED, PLOT_COST_BASE, 
  PLOT_COST_MULTIPLIER, SEASON_DURATION_MS, SPRINKLER_COST, GRID_SIZE, DECORATIONS, XP_TO_LEVEL_UP 
} from './constants';
import { fetchMarketTrend, fetchQuest, negotiateTrade } from './services/geminiService';
import { 
  Coins, Sprout, Store, TrendingUp, X, LogOut, MessageCircle, 
  LayoutGrid, MousePointer2, Move, Star, Loader2
} from 'lucide-react';
import { Button } from './components/Button';

type Tab = 'field' | 'shop' | 'market';
type DragAction = 'plant' | 'harvest' | 'water' | null;

const getTotalItemCount = (state: GameState, id: ItemId) => {
    return (state.inventory[id] || 0) + (state.harvested[id] || 0);
};

const checkLevelUp = (currentXp: number, currentLevel: number): number => {
    let lvl = currentLevel;
    // Simple loop to handle multiple level ups at once
    while (currentXp >= XP_TO_LEVEL_UP(lvl)) {
        lvl++;
    }
    return lvl;
};

const DEFAULT_GAME_STATE: GameState = {
    coins: INITIAL_COINS,
    xp: 0,
    level: 1,
    inventory: { ...INITIAL_INVENTORY },
    harvested: { ...INITIAL_HARVESTED },
    plots: [], 
    decorations: [],
    activeQuest: null,
    weather: 'sunny',
    season: 'spring',
    nextSeasonAt: Date.now() + SEASON_DURATION_MS
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [gameState, setGameState] = useState<GameState>(DEFAULT_GAME_STATE);
  const [activeTab, setActiveTab] = useState<Tab>('field');
  
  // Tools
  const [selectedSeed, setSelectedSeed] = useState<CropId | null>(CropId.WHEAT);
  const [selectedBuildingToPlace, setSelectedBuildingToPlace] = useState<BuildingId | null>(null);
  const [selectedDecorationToPlace, setSelectedDecorationToPlace] = useState<DecorationId | null>(null);
  const [placingSprinkler, setPlacingSprinkler] = useState(false);
  
  // Edit Mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editDragItem, setEditDragItem] = useState<EditDragItem | null>(null);

  // Farming Interactions
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<DragAction>(null);

  // AI & Market
  const [marketTrend, setMarketTrend] = useState<MarketTrend | null>(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendCooldown, setTrendCooldown] = useState(0);
  const [loadingQuest, setLoadingQuest] = useState(false);

  // NPC
  const [merchantOffer, setMerchantOffer] = useState<MerchantOffer | null>(null);
  const [isMerchantOpen, setIsMerchantOpen] = useState(false);
  const [merchantChat, setMerchantChat] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [merchantInput, setMerchantInput] = useState('');
  const [merchantLoading, setMerchantLoading] = useState(false);

  // UI
  const [showBuildingMenu, setShowBuildingMenu] = useState<number | null>(null);

  // Auth
  useEffect(() => {
    const sessionUser = checkSession();
    if (sessionUser) setCurrentUser(sessionUser);
    setAuthChecked(true);
  }, []);

  // Load & Migrate Data
  useEffect(() => {
    if (currentUser) {
        const saveKey = `gemini_farm_save_${currentUser.username}`;
        try {
            const saved = localStorage.getItem(saveKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                
                // MIGRATION LOGIC
                let plots = parsed.plots || [];
                // If plots are old format (no x,y), lay them out on grid
                if (plots.length > 0 && typeof plots[0].x === 'undefined') {
                    plots = plots.map((p: any, i: number) => ({
                        ...p,
                        x: i % GRID_SIZE,
                        y: Math.floor(i / GRID_SIZE)
                    }));
                }
                
                setGameState({
                    ...DEFAULT_GAME_STATE,
                    ...parsed,
                    inventory: { ...DEFAULT_GAME_STATE.inventory, ...parsed.inventory },
                    harvested: { ...DEFAULT_GAME_STATE.harvested, ...parsed.harvested },
                    decorations: parsed.decorations || [],
                    plots: plots.map((p: any) => ({
                        ...p,
                        isWatered: p.isWatered ?? false,
                        hasSprinkler: p.hasSprinkler ?? false,
                        status: p.status === 'building' ? 'building' : p.status
                    }))
                });
            } else {
                // Initialize default plots in a grid for new users
                const initialPlots: PlotType[] = [];
                for (let i = 0; i < INITIAL_PLOTS; i++) {
                    initialPlots.push({
                        id: i,
                        x: i % 3 + 1, 
                        y: Math.floor(i / 3) + 1,
                        status: 'empty',
                        cropId: null,
                        buildingId: null,
                        plantedAt: null,
                        isWatered: false,
                        hasSprinkler: false
                    });
                }
                setGameState({ ...DEFAULT_GAME_STATE, plots: initialPlots });
            }
        } catch (e) {
            console.error("Save load error", e);
            setGameState(DEFAULT_GAME_STATE);
        }
    }
  }, [currentUser]);

  // Save Data
  useEffect(() => {
    if (currentUser) {
        const saveKey = `gemini_farm_save_${currentUser.username}`;
        localStorage.setItem(saveKey, JSON.stringify(gameState));
    }
  }, [gameState, currentUser]);

  // Game Loop
  useEffect(() => {
    if (!currentUser) return;
    const TICK_RATE = 500;
    const interval = setInterval(() => {
      const now = Date.now();
      
      setGameState(prev => {
        let hasChanges = false;
        let newPlots = [...prev.plots];
        let newWeather = prev.weather;
        let newSeason = prev.season;
        let newNextSeasonAt = prev.nextSeasonAt;

        // Season
        if (now > prev.nextSeasonAt) {
            const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
            const idx = seasons.indexOf(prev.season);
            newSeason = seasons[(idx + 1) % 4];
            newNextSeasonAt = now + SEASON_DURATION_MS;
            hasChanges = true;
        }

        // Weather
        if (Math.random() < 0.001) {
            const weathers: Weather[] = ['sunny', 'sunny', 'sunny', 'rainy', 'drought'];
            newWeather = weathers[Math.floor(Math.random() * weathers.length)];
            hasChanges = true;
        }

        // Plots logic (Growth / Processing)
        newPlots = newPlots.map(plot => {
          if (plot.hasSprinkler && !plot.isWatered) return { ...plot, isWatered: true };
          if (newWeather === 'rainy' && !plot.isWatered) return { ...plot, isWatered: true };

          if (plot.status === 'growing' && plot.plantedAt && plot.cropId) {
            const crop = CROPS[plot.cropId];
            if (!plot.isWatered && !plot.hasSprinkler) { hasChanges = true; return { ...plot, plantedAt: plot.plantedAt + TICK_RATE }; }
            const speedMultiplier = crop.seasonAffinity === newSeason ? 2 : 1;
            if (speedMultiplier > 1) plot.plantedAt -= TICK_RATE; 
            
            if (now - plot.plantedAt >= crop.growTimeMs) {
              hasChanges = true;
              return { ...plot, status: 'ready' as const };
            }
          }

          if (plot.status === 'building' && plot.plantedAt && plot.buildingId && typeof plot.processingRecipeIdx === 'number' && !plot.readyToHarvestProduct) {
              const building = BUILDINGS[plot.buildingId];
              const recipe = building.recipes[plot.processingRecipeIdx];
              if (now - plot.plantedAt >= recipe.processTimeMs) {
                  hasChanges = true;
                  return { ...plot, readyToHarvestProduct: true };
              }
          }
          return plot;
        });

        // Quest Expiration
        let newQuest = prev.activeQuest;
        if (newQuest && now > newQuest.expiresAt) { newQuest = null; hasChanges = true; }

        if (!hasChanges) return prev;
        return { ...prev, plots: newPlots, activeQuest: newQuest, weather: newWeather, season: newSeason, nextSeasonAt: newNextSeasonAt };
      });

      if (marketTrend && now > marketTrend.expiresAt) setMarketTrend(null);
    }, TICK_RATE);
    return () => clearInterval(interval);
  }, [marketTrend, currentUser]);

  // Merchant Spawn Loop
  useEffect(() => {
      if (!currentUser) return;
      const interval = setInterval(() => {
          if (!merchantOffer && Math.random() < 0.1) { 
              const items = [...Object.keys(CROPS), ...Object.keys(PRODUCTS)];
              const randomItem = items[Math.floor(Math.random() * items.length)] as ItemId;
              const count = Math.floor(Math.random() * 5) + 3;
              const itemData = CROPS[randomItem as CropId] || PRODUCTS[randomItem as ProductId];
              
              setMerchantOffer({
                  wantedItem: randomItem,
                  amount: count,
                  baseValue: itemData.baseSellPrice * count,
                  merchantName: ["Traveler Tom", "Merchant Mary", "Gourmet Gary"][Math.floor(Math.random()*3)],
                  personality: ["greedy", "desperate", "fancy"][Math.floor(Math.random()*3)]
              });
          }
      }, 10000);
      return () => clearInterval(interval);
  }, [merchantOffer, currentUser]);

  const handleLogout = () => { logoutUser(); setCurrentUser(null); setGameState(DEFAULT_GAME_STATE); };

  // --- Grid Interaction Logic ---

  // 1. Mouse Down (Start Drag or Click)
  const handleGridMouseDown = (x: number, y: number) => {
    // A. Edit Mode Drag Start
    if (isEditMode) {
        const plot = gameState.plots.find(p => p.x === x && p.y === y);
        if (plot) {
            setEditDragItem({ type: 'plot', id: plot.id, startX: x, startY: y });
            return;
        }
        const decor = gameState.decorations.find(d => d.x === x && d.y === y);
        if (decor) {
            setEditDragItem({ type: 'decoration', id: decor.id, startX: x, startY: y });
            return;
        }
        return;
    }

    // B. Farming Mode Interaction
    const plot = gameState.plots.find(p => p.x === x && p.y === y);
    
    // B1. Place Decoration (if tool selected)
    if (selectedDecorationToPlace && !plot) {
         // Check if occupied by another decoration
         const occupied = gameState.decorations.some(d => d.x === x && d.y === y);
         if (!occupied) {
             const decorData = DECORATIONS[selectedDecorationToPlace];
             if (gameState.coins >= decorData.cost) {
                 setGameState(prev => ({
                     ...prev,
                     coins: prev.coins - decorData.cost,
                     decorations: [...prev.decorations, { id: Math.random().toString(), x, y, typeId: selectedDecorationToPlace }]
                 }));
                 setSelectedDecorationToPlace(null);
             }
         }
         return;
    }
    
    // B2. Plot Actions
    if (plot) {
        handleMouseDownPlot(plot.id);
    }
  };

  // 2. Mouse Up (End Drag / Drop)
  const handleGridMouseUp = (x: number, y: number) => {
      // A. Farming Mode Drag End
      if (!isEditMode) {
          setIsDragging(false);
          setDragAction(null);
          return;
      }

      // B. Edit Mode Drop
      if (isEditMode && editDragItem) {
          const targetX = x;
          const targetY = y;
          
          // Check if target is occupied
          const isPlotHere = gameState.plots.some(p => p.x === targetX && p.y === targetY && p.id !== editDragItem.id);
          const isDecorHere = gameState.decorations.some(d => d.x === targetX && d.y === targetY && d.id !== editDragItem.id);

          if (!isPlotHere && !isDecorHere) {
               // Execute Move
               setGameState(prev => {
                   if (editDragItem.type === 'plot') {
                       return { ...prev, plots: prev.plots.map(p => p.id === editDragItem.id ? { ...p, x: targetX, y: targetY } : p) };
                   } else {
                       return { ...prev, decorations: prev.decorations.map(d => d.id === editDragItem.id ? { ...d, x: targetX, y: targetY } : d) };
                   }
               });
          }
          setEditDragItem(null);
      }
  };
  
  // 3. Mouse Enter (Dragging over tiles)
  const handleGridMouseEnter = (x: number, y: number) => {
      // Farming Drag Action
      if (!isEditMode && isDragging && dragAction) {
          const plot = gameState.plots.find(p => p.x === x && p.y === y);
          if (plot) handleMouseEnterPlot(plot.id);
      }
  };


  // --- Plot Actions ---

  const handleInteractPlot = (plotId: number) => {
      if (isEditMode) return;
      const plot = gameState.plots.find(p => p.id === plotId);
      if (!plot) return;

      // Building placement
      if (selectedBuildingToPlace && plot.status === 'empty') {
            const building = BUILDINGS[selectedBuildingToPlace];
            if (gameState.coins >= building.cost) {
                setGameState(prev => ({
                    ...prev,
                    coins: prev.coins - building.cost,
                    plots: prev.plots.map(p => p.id === plotId ? { ...p, status: 'building', buildingId: selectedBuildingToPlace, isWatered: false } : p)
                }));
                setSelectedBuildingToPlace(null);
            }
            return;
      }

      // Sprinkler
      if (placingSprinkler && !plot.hasSprinkler) {
           if (gameState.coins >= SPRINKLER_COST) {
               setGameState(prev => ({
                   ...prev,
                   coins: prev.coins - SPRINKLER_COST,
                   plots: prev.plots.map(p => p.id === plotId ? { ...p, hasSprinkler: true, isWatered: true } : p)
               }));
               setPlacingSprinkler(false);
           }
           return;
      }

      // Standard actions
      if (plot.status === 'ready') handleHarvest(plotId);
      else if (plot.status === 'growing' && !plot.isWatered) handleWater(plotId);
      else if (plot.status === 'empty') handlePlant(plotId);
  };

  const handlePlant = (plotId: number) => {
      if (!selectedSeed || gameState.inventory[selectedSeed] <= 0) return;
      setGameState(prev => ({
          ...prev,
          plots: prev.plots.map(p => p.id === plotId && p.status === 'empty' ? { ...p, status: 'growing', cropId: selectedSeed, plantedAt: Date.now(), isWatered: false } : p),
          inventory: { ...prev.inventory, [selectedSeed]: prev.inventory[selectedSeed] - 1 }
      }));
  };

  const handleHarvest = (plotId: number) => {
    setGameState(prev => {
        const plot = prev.plots.find(p => p.id === plotId);
        if (!plot || plot.status !== 'ready' || !plot.cropId) return prev;
        
        const crop = CROPS[plot.cropId];
        let newActiveQuest = prev.activeQuest;
        let bonusCoins = 0;
        let bonusXp = 0;

        if (newActiveQuest && newActiveQuest.cropId === crop.id) {
             const newAmount = newActiveQuest.currentAmount + 1;
             newActiveQuest = { ...newActiveQuest, currentAmount: newAmount };
             if (newAmount >= newActiveQuest.targetAmount) {
                 bonusCoins = newActiveQuest.rewardCoins;
                 bonusXp = newActiveQuest.rewardXp;
                 newActiveQuest = null; // Complete
             }
        }

        const newXp = prev.xp + crop.xpReward + bonusXp;
        const newLevel = checkLevelUp(newXp, prev.level);

        return {
            ...prev,
            xp: newXp,
            level: newLevel,
            coins: prev.coins + bonusCoins,
            harvested: { ...prev.harvested, [crop.id]: (prev.harvested[crop.id]||0) + 1 },
            plots: prev.plots.map(p => p.id === plotId ? { ...p, status: 'empty', cropId: null, plantedAt: null, isWatered: false } : p),
            activeQuest: newActiveQuest
        };
    });
  };

  const handleWater = (plotId: number) => {
      setGameState(prev => ({
          ...prev,
          plots: prev.plots.map(p => p.id === plotId && p.status === 'growing' ? { ...p, isWatered: true } : p)
      }));
  };

  const handleSell = (item: ItemId, amount: number, price: number) => {
      setGameState(prev => {
          const currentCount = prev.harvested[item] || 0;
          if (currentCount < amount) return prev;
          
          const xpGain = 5 * amount;
          const newXp = prev.xp + xpGain;
          const newLevel = checkLevelUp(newXp, prev.level);

          return {
              ...prev,
              coins: prev.coins + (price * amount),
              xp: newXp,
              level: newLevel,
              harvested: { ...prev.harvested, [item]: currentCount - amount }
          };
      });
  };

  // --- Farm Interactions Helper ---
  // (We manually wire dragging logic since HTML5 drag isn't great for this "paint" style interaction)
  const handleMouseDownPlot = (plotId: number) => {
      const plot = gameState.plots.find(p => p.id === plotId);
      if (!plot) return;

      let action: DragAction = null;
      if (plot.status === 'ready') action = 'harvest';
      else if (plot.status === 'growing' && !plot.isWatered && !plot.hasSprinkler) action = 'water';
      else if (plot.status === 'empty' && selectedSeed && !selectedBuildingToPlace && !placingSprinkler) action = 'plant';
      
      if (action) {
          setIsDragging(true);
          setDragAction(action);
          handleInteractPlot(plotId);
      } else {
          handleInteractPlot(plotId); 
      }
  };

  const handleMouseEnterPlot = (plotId: number) => {
      if (!isDragging || !dragAction || isEditMode) return;
      const plot = gameState.plots.find(p => p.id === plotId);
      if (!plot) return;
      
      if (dragAction === 'harvest' && plot.status === 'ready') handleHarvest(plotId);
      if (dragAction === 'water' && plot.status === 'growing' && !plot.isWatered) handleWater(plotId);
      if (dragAction === 'plant' && plot.status === 'empty') handlePlant(plotId);
  };

  // --- Global Mouse Up ---
  useEffect(() => {
    const handleWindowMouseUp = () => { setIsDragging(false); setDragAction(null); };
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, []);

  // --- Render Grid ---
  const renderGrid = useMemo(() => {
      const cells = [];
      for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
              const plot = gameState.plots.find(p => p.x === x && p.y === y);
              const decor = gameState.decorations.find(d => d.x === x && d.y === y);
              
              // Are we dragging THIS item?
              const isBeingDragged = isEditMode && editDragItem && 
                                     ((editDragItem.type === 'plot' && plot?.id === editDragItem.id) || 
                                      (editDragItem.type === 'decoration' && decor?.id === editDragItem.id));
              
              // Is this a valid drop target? (Empty)
              const isValidDrop = isEditMode && editDragItem && !plot && !decor;

              cells.push(
                  <div 
                    key={`${x}-${y}`} 
                    onMouseDown={() => handleGridMouseDown(x, y)}
                    onMouseUp={() => handleGridMouseUp(x, y)}
                    onMouseEnter={() => handleGridMouseEnter(x, y)}
                    className={`
                        aspect-square rounded-xl relative transition-all border select-none
                        ${isBeingDragged ? 'opacity-50 scale-90 ring-4 ring-yellow-400 z-50' : ''}
                        ${isValidDrop ? 'bg-emerald-500/20 border-emerald-500/50 cursor-copy' : 'bg-slate-800/30 border-white/5'}
                        ${!plot && !decor && !isEditMode ? 'hover:bg-slate-800/50 cursor-pointer' : ''}
                        ${isEditMode && (plot || decor) ? 'cursor-grab active:cursor-grabbing hover:border-yellow-400/50' : ''}
                    `}
                  >
                      {/* Decoration Layer */}
                      {decor && (
                          <div className="absolute inset-0 z-10 pointer-events-none">
                                <Decoration 
                                    decoration={decor} 
                                    onMouseDown={() => {}}
                                    isDraggable={isEditMode}
                                />
                          </div>
                      )}

                      {/* Plot Layer */}
                      {plot && (
                          <div className="absolute inset-0 z-20">
                              <Plot 
                                plot={plot}
                                selectedSeedId={selectedSeed}
                                selectedBuildingId={selectedBuildingToPlace}
                                onMouseDown={() => {}} // Handled by parent div for unify
                                onMouseEnter={() => {}} // Handled by parent div
                                onInteractBuilding={(id) => setShowBuildingMenu(id)}
                                isEditMode={isEditMode}
                              />
                              {isEditMode && (
                                  <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                                      <Move className="text-yellow-400 opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              );
          }
      }
      return cells;
  }, [gameState.plots, gameState.decorations, isEditMode, editDragItem, selectedSeed, selectedBuildingToPlace, isDragging, dragAction, selectedDecorationToPlace]);


  if (!authChecked) return null;
  if (!currentUser) return <AuthScreen onSuccess={setCurrentUser} />;

  return (
    <div className={`min-h-screen text-slate-100 font-sans pb-32 transition-colors duration-1000 overflow-x-hidden
        ${gameState.weather === 'rainy' ? 'bg-slate-900' : gameState.weather === 'drought' ? 'bg-[#2c1a12]' : 'bg-[#111827]'}
    `}>
        {/* Overlays */}
        {gameState.weather === 'rainy' && <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 z-0" />}

        {/* --- Header --- */}
        <header className="fixed top-0 inset-x-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/5 shadow-lg">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                        <Sprout className="text-white" size={24} />
                    </div>
                    <div className="hidden sm:block">
                        <h1 className="font-bold text-lg">Gemini Farm</h1>
                        <div className="flex items-center gap-2 text-xs opacity-70">
                           <span className="flex items-center gap-1 uppercase font-bold text-emerald-400">{gameState.season}</span>
                           <span>•</span>
                           <span className="flex items-center gap-1 uppercase">{gameState.weather}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-white/10 shadow-inner">
                        <Coins className="text-amber-400" size={18} />
                        <span className="font-bold font-mono text-amber-100">{gameState.coins.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                         <div className="hidden sm:flex flex-col items-end">
                            <span className="text-xs font-bold text-emerald-400">{currentUser.username}</span>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500 font-bold">Lvl {gameState.level}</span>
                                <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500" 
                                        style={{ width: `${Math.min(100, (gameState.xp / XP_TO_LEVEL_UP(gameState.level)) * 100)}%` }} 
                                    />
                                </div>
                            </div>
                         </div>
                         <button onClick={handleLogout} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 rounded-full transition-colors">
                            <LogOut size={16} />
                         </button>
                    </div>
                </div>
            </div>
             <div className="max-w-5xl mx-auto px-4 flex gap-6 overflow-x-auto no-scrollbar">
                {[ { id: 'field', label: 'Farm', icon: LayoutGrid }, { id: 'shop', label: 'Shop', icon: Store }, { id: 'market', label: 'Market', icon: TrendingUp } ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`relative py-3 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <tab.icon size={16} /> {tab.label}
                        {activeTab === tab.id && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />}
                    </button>
                ))}
            </div>
        </header>

        {/* --- Main Content --- */}
        <main className="max-w-5xl mx-auto px-4 pt-36 pb-8 relative z-10">
            {merchantOffer && !isMerchantOpen && (
                <div className="fixed right-4 bottom-24 z-50 animate-bounce">
                    <button onClick={() => setIsMerchantOpen(true)} className="bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-full shadow-lg border-2 border-white/20">
                        <MessageCircle size={24} /><div className="absolute -top-2 -right-2 bg-red-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">!</div>
                    </button>
                </div>
            )}

            {activeTab === 'field' && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <MarketAnalyst trend={marketTrend} loading={loadingTrend} onRefresh={async () => {
                            if (loadingTrend || trendCooldown > 0) return;
                            setLoadingTrend(true);
                            const t = await fetchMarketTrend(gameState.coins);
                            if (t) { setMarketTrend(t); setTrendCooldown(60); }
                            setLoadingTrend(false);
                        }} cooldown={trendCooldown} />
                        <QuestBoard quest={gameState.activeQuest} loading={loadingQuest} onRequestQuest={async () => {
                            if (loadingQuest || gameState.activeQuest) return;
                            setLoadingQuest(true);
                            const q = await fetchQuest(gameState.level);
                            if (q) setGameState(p => ({ ...p, activeQuest: q }));
                            setLoadingQuest(false);
                        }} />
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                            Field Layout 
                            {isEditMode && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30">Edit Mode Active</span>}
                        </h2>
                        <Button size="sm" variant={isEditMode ? "primary" : "secondary"} onClick={() => { setIsEditMode(!isEditMode); setEditDragItem(null); }}
                             className={isEditMode ? "bg-yellow-600 hover:bg-yellow-500 border-yellow-400" : ""}
                        >
                             {isEditMode ? <><X size={16} className="mr-2"/> Done Editing</> : <><MousePointer2 size={16} className="mr-2"/> Edit Layout</>}
                        </Button>
                    </div>

                    <div className={`bg-[#1a2233]/50 border border-white/5 rounded-3xl p-6 shadow-2xl backdrop-blur-sm overflow-x-auto transition-all ${isEditMode ? 'ring-2 ring-yellow-500/30' : ''}`}>
                        {isEditMode && <p className="text-center text-xs text-yellow-200/50 mb-4 animate-pulse">Drag and drop items to move them</p>}
                        <div className="min-w-[300px] grid grid-cols-6 gap-2 sm:gap-3 mx-auto select-none" style={{ maxWidth: '600px' }}>
                            {renderGrid}
                        </div>
                    </div>

                    {/* Inventory Bar */}
                    {!isEditMode && (
                      <div className="fixed bottom-6 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
                          <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex gap-2 pointer-events-auto overflow-x-auto max-w-full no-scrollbar">
                              {/* Cancel Tools */}
                              {(selectedBuildingToPlace || placingSprinkler || selectedDecorationToPlace) && (
                                  <button onClick={() => { setSelectedBuildingToPlace(null); setPlacingSprinkler(false); setSelectedDecorationToPlace(null); }} 
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500 text-red-300 rounded-xl min-w-max hover:bg-red-600/30 transition-colors">
                                      <X size={16}/> Cancel Placement
                                  </button>
                              )}
                              
                              {/* Hint for placement */}
                              {(selectedDecorationToPlace || selectedBuildingToPlace || placingSprinkler) && (
                                  <div className="flex items-center px-4 text-emerald-400 text-xs font-bold animate-pulse">
                                      Tap a tile to place
                                  </div>
                              )}

                              {!selectedBuildingToPlace && !placingSprinkler && !selectedDecorationToPlace && Object.values(CROPS).map(crop => {
                                  const count = gameState.inventory[crop.id] || 0;
                                  if (gameState.level < crop.unlockLevel && count === 0) return null;
                                  return (
                                      <button
                                          key={crop.id}
                                          onClick={() => setSelectedSeed(crop.id)}
                                          className={`relative flex flex-col items-center p-2 rounded-xl min-w-[70px] border transition-all active:scale-95 ${selectedSeed === crop.id ? 'bg-emerald-600/20 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                                      >
                                          <span className="text-2xl mb-1 filter drop-shadow-md">{crop.emoji}</span>
                                          <span className="text-[10px] font-bold uppercase text-slate-400">{crop.name}</span>
                                          <div className="absolute -top-2 -right-1 bg-slate-900 border border-slate-700 text-white text-[10px] px-1.5 rounded-full shadow-sm">{count}</div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                    )}
                </>
            )}

            {activeTab === 'shop' && (
                <Shop 
                    coins={gameState.coins} 
                    level={gameState.level} 
                    plotCount={gameState.plots.length}
                    onBuySeed={(id, amt) => {
                         const cost = CROPS[id].buyPrice * amt;
                         if (gameState.coins >= cost) setGameState(p => ({ ...p, coins: p.coins - cost, inventory: { ...p.inventory, [id]: (p.inventory[id]||0) + amt } }));
                    }}
                    onBuyBuilding={(id) => { setSelectedBuildingToPlace(id); setActiveTab('field'); }}
                    onBuyDecoration={(id) => { setSelectedDecorationToPlace(id); setActiveTab('field'); }}
                    onBuySprinkler={() => { setPlacingSprinkler(true); setActiveTab('field'); }}
                    onBuyPlot={() => {
                         const cost = Math.floor(PLOT_COST_BASE * Math.pow(PLOT_COST_MULTIPLIER, gameState.plots.length - 6));
                         if (gameState.coins >= cost && gameState.plots.length < MAX_PLOTS) {
                             // Find first empty spot in grid
                             let found = false;
                             let newX = 0, newY = 0;
                             for(let y=0; y<GRID_SIZE; y++) {
                                 for(let x=0; x<GRID_SIZE; x++) {
                                     if(!gameState.plots.some(p => p.x === x && p.y === y)) {
                                         newX = x; newY = y; found = true; break;
                                     }
                                 }
                                 if(found) break;
                             }
                             if(found) {
                                 setGameState(p => ({ ...p, coins: p.coins - cost, plots: [...p.plots, { id: Date.now(), x: newX, y: newY, status: 'empty', cropId: null, buildingId: null, plantedAt: null, isWatered: false, hasSprinkler: false }] }));
                             }
                         }
                    }}
                />
            )}

            {activeTab === 'market' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[...Object.values(CROPS), ...Object.values(PRODUCTS)].map(item => {
                         const count = (gameState.harvested[item.id] || 0);
                         const isTrending = marketTrend?.cropId === item.id;
                         const price = isTrending ? Math.floor(item.baseSellPrice * marketTrend!.multiplier) : item.baseSellPrice;
                         
                         if (count === 0) return null;

                         return (
                            <div key={item.id} className="bg-slate-800/50 rounded-xl p-4 border border-white/5 flex justify-between items-center hover:bg-slate-800/80 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="text-3xl filter drop-shadow-md">{item.emoji}</div>
                                    <div>
                                        <div className="font-bold text-slate-200">{item.name}</div>
                                        <div className="text-xs text-slate-400">In Stock: {count}</div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                     <div className={`font-mono font-bold ${isTrending ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`}>
                                         {price} <Coins size={12} className="inline"/>
                                         {isTrending && <span className="ml-1 text-[10px] bg-emerald-500/20 px-1 rounded">HOT</span>}
                                     </div>
                                     <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleSell(item.id, 1, price)}>Sell 1</Button>
                                        <Button size="sm" variant="secondary" onClick={() => handleSell(item.id, count, price)}>Sell All ({count})</Button>
                                     </div>
                                </div>
                            </div>
                         )
                     })}
                 </div>
            )}
        </main>

        {/* Building Menu (Simplified) */}
        {showBuildingMenu !== null && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                 <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md relative shadow-2xl">
                     <button onClick={() => setShowBuildingMenu(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={24}/></button>
                     {(() => {
                        const plot = gameState.plots.find(p => p.id === showBuildingMenu);
                        if (!plot || !plot.buildingId) return null;
                        const building = BUILDINGS[plot.buildingId];
                        return (
                            <>
                                <div className="text-center mb-6">
                                    <div className="text-4xl mb-2">{building.emoji}</div>
                                    <h2 className="text-xl font-bold text-slate-200">{building.name}</h2>
                                    <p className="text-sm text-slate-400">{building.description}</p>
                                </div>
                                <div className="space-y-4">
                                    {building.recipes.map((recipe, idx) => {
                                        const inputItem = CROPS[recipe.input];
                                        const outputItem = PRODUCTS[recipe.output];
                                        const canCraft = (gameState.harvested[recipe.input] || 0) >= recipe.inputCount;
                                        
                                        return (
                                            <div key={idx} className="bg-slate-800 p-4 rounded-xl flex items-center justify-between border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-2xl">{outputItem.emoji}</div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-200">{outputItem.name}</div>
                                                        <div className="text-xs text-slate-400 flex items-center gap-1">
                                                            Requires: {recipe.inputCount} {inputItem.emoji}
                                                            <span className={canCraft ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                                                                (Have: {gameState.harvested[recipe.input] || 0})
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button size="sm" disabled={!canCraft || plot.processingRecipeIdx !== undefined} onClick={() => {
                                                     setGameState(prev => {
                                                        const idx = prev.plots.findIndex(p => p.id === plot.id);
                                                        const newPlots = [...prev.plots];
                                                        newPlots[idx] = { ...plot, processingRecipeIdx: idx, plantedAt: Date.now(), readyToHarvestProduct: false };
                                                        return { ...prev, harvested: { ...prev.harvested, [recipe.input]: prev.harvested[recipe.input] - recipe.inputCount }, plots: newPlots };
                                                    });
                                                    setShowBuildingMenu(null);
                                                }}>Craft</Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        );
                    })()}
                 </div>
            </div>
        )}

        {/* Merchant Modal */}
        {isMerchantOpen && merchantOffer && (
             <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                 <div className="bg-[#1e293b] w-full max-w-lg rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                     {/* Header */}
                     <div className="bg-amber-950/30 p-6 border-b border-white/5 flex justify-between items-center">
                         <div>
                             <h2 className="text-xl font-bold text-amber-100">{merchantOffer.merchantName}</h2>
                             <p className="text-xs text-amber-400/60 uppercase tracking-widest">{merchantOffer.personality} Trader</p>
                         </div>
                         <button onClick={() => setIsMerchantOpen(false)} className="text-slate-500 hover:text-white"><X /></button>
                     </div>

                     {/* Chat Area */}
                     <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#111827]">
                         <div className="bg-amber-900/20 p-4 rounded-2xl rounded-tl-none border border-amber-500/10 text-amber-100 text-sm">
                             I'm looking for <span className="font-bold text-white">{merchantOffer.amount} {merchantOffer.wantedItem}s</span>. 
                             I'll offer you <span className="font-bold text-amber-400">{merchantOffer.baseValue} Coins</span>.
                         </div>
                         {merchantChat.map((msg, i) => (
                             <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-700 text-slate-200 rounded-tl-none'}`}>
                                     {msg.text}
                                 </div>
                             </div>
                         ))}
                         {merchantLoading && <div className="text-xs text-slate-500 animate-pulse flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> Merchant is thinking...</div>}
                     </div>

                     {/* Input Area */}
                     <div className="p-4 bg-slate-800 border-t border-white/5">
                         <div className="flex gap-2">
                             <input 
                                value={merchantInput}
                                onChange={e => setMerchantInput(e.target.value)}
                                placeholder="Counter offer?"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 text-white"
                             />
                             <Button onClick={async () => {
                                 if (!merchantOffer || !merchantInput.trim()) return;
                                 const userMsg = merchantInput;
                                 setMerchantChat(prev => [...prev, { role: 'user', text: userMsg }]);
                                 setMerchantInput('');
                                 setMerchantLoading(true);
                                 const result = await negotiateTrade(merchantOffer, userMsg, merchantChat.map(c => `${c.role === 'user' ? 'Player' : 'Merchant'}: ${c.text}`));
                                 setMerchantChat(prev => [...prev, { role: 'model', text: result.reply }]);
                                 setMerchantLoading(false);
                                 if (result.accepted) {
                                      setGameState(prev => {
                                          if (getTotalItemCount(prev, merchantOffer.wantedItem) < merchantOffer.amount) return prev;
                                          const newHarvested = { ...prev.harvested };
                                          if ((newHarvested[merchantOffer.wantedItem] || 0) >= merchantOffer.amount) newHarvested[merchantOffer.wantedItem] -= merchantOffer.amount;
                                          else return prev;
                                          return { ...prev, coins: prev.coins + result.finalPrice, harvested: newHarvested };
                                      });
                                      setTimeout(() => { setMerchantOffer(null); setIsMerchantOpen(false); setMerchantChat([]); }, 2000);
                                 }
                             }} disabled={merchantLoading || !merchantInput.trim()}>
                                 Send
                             </Button>
                         </div>
                         <div className="mt-2 flex justify-between">
                            <Button size="sm" variant="danger" onClick={() => { setIsMerchantOpen(false); setMerchantOffer(null); }}>Reject</Button>
                            <Button size="sm" variant="success" onClick={() => { setMerchantInput("I accept."); }}>Accept</Button>
                         </div>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default App;
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plot } from './components/Plot';
import { Shop } from './components/Shop';
import { Decoration } from './components/Decoration';
import { MarketAnalyst } from './components/MarketAnalyst';
import { QuestBoard } from './components/QuestBoard';
import { AuthScreen } from './components/AuthScreen';
import { AdminPanel } from './components/AdminPanel';
import { checkSession, logoutUser, getUserInfo } from './services/authService';
import { websocketService } from './services/websocketService';
import { 
  GameState, CropId, MarketTrend, Weather, Season, Plot as PlotType, 
  BuildingId, ItemId, ProductId, MerchantOffer, User, DecorationId, EditDragItem, ParticleEffect
} from './types';
import { 
  CROPS, PRODUCTS, BUILDINGS, INITIAL_PLOTS, MAX_PLOTS, INITIAL_COINS, 
  INITIAL_INVENTORY, INITIAL_HARVESTED, PLOT_COST_BASE, 
  PLOT_COST_MULTIPLIER, SEASON_DURATION_MS, SPRINKLER_COST, GRID_SIZE, DECORATIONS, XP_TO_LEVEL_UP,
  COMBO_DECAY_TIME, COMBO_MULTIPLIER_MAX, PRESTIGE_REQUIRED_LEVEL, PRESTIGE_LEVEL_INCREMENT,
  PRESTIGE_POINTS_PER_LEVEL, RESEARCH_TREE
} from './constants';
import { fetchMarketTrend, fetchQuest, negotiateTrade } from './services/geminiService';
import { 
  initializeMissions, initializeAchievements, initializeStatistics, 
  checkMissionProgress, checkAchievementProgress, checkDailyChallengeProgress,
  generateDailyChallenge
} from './services/missionService';
import { 
  Coins, Sprout, Store, TrendingUp, X, LogOut, MessageCircle, 
  LayoutGrid, MousePointer2, Move, Star, Loader2, Trophy, Target, Calendar, Droplets, CheckCircle, Shield
} from 'lucide-react';
import { Button } from './components/Button';
import { Notification, NotificationItem } from './components/Notification';
import { FloatingText, FloatingTextItem } from './components/FloatingText';
import { QuestReward } from './components/QuestReward';
import { ParticleEffects } from './components/ParticleEffects';
import { WeatherEffects } from './components/WeatherEffects';
import { PrestigePanel } from './components/PrestigePanel';
import { MobileNav } from './components/MobileNav';

type Tab = 'field' | 'shop' | 'market' | 'missions' | 'achievements';
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

const createDefaultGameState = (): GameState => ({
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
    nextSeasonAt: Date.now() + SEASON_DURATION_MS,
    missions: initializeMissions(),
    achievements: initializeAchievements(),
    statistics: initializeStatistics(),
    dailyChallenge: null,
    lastDailyChallengeReset: Date.now(),
    // New mechanics
    prestigeLevel: 0,
    prestigePoints: 0,
    cropMastery: {} as Record<CropId, number>,
    researchTree: {},
    automationLevel: 0,
    comboBonus: 1,
    lastComboTime: 0
});

const DEFAULT_GAME_STATE = createDefaultGameState();

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
  
  // Mobile: Show/hide Market Analyst and Quest Board
  const [showMarketAnalyst, setShowMarketAnalyst] = useState(false);
  const [showQuestBoard, setShowQuestBoard] = useState(false);

  // NPC
  const [merchantOffer, setMerchantOffer] = useState<MerchantOffer | null>(null);
  const [isMerchantOpen, setIsMerchantOpen] = useState(false);
  const [merchantChat, setMerchantChat] = useState<{role: 'user'|'model', text: string}[]>([]);
  const [merchantInput, setMerchantInput] = useState('');
  const [merchantLoading, setMerchantLoading] = useState(false);

  // UI
  const [showBuildingMenu, setShowBuildingMenu] = useState<number | null>(null);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  
  // Notifications & Animations
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [particles, setParticles] = useState<ParticleEffect[]>([]);
  const [lastLevel, setLastLevel] = useState(1);
  const [questReward, setQuestReward] = useState<{ coins: number; xp: number } | null>(null);

  // Helper functions for notifications and animations
  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => {
      // If notification has a groupKey, try to merge with existing notification
      if (notification.groupKey) {
        const existingIndex = prev.findIndex(n => n.groupKey === notification.groupKey && n.type === notification.type);
        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const newCount = (existing.count || 1) + 1;
          const newNotifications = [...prev];
          newNotifications[existingIndex] = {
            ...existing,
            count: newCount,
            // Keep original title - the Notification component will show the count badge
            title: notification.title.replace(/\sx\d+$/, ''),
            duration: notification.duration || existing.duration || 3000, // Use longer duration for grouped notifications
            // Reset timer by updating id
            id: Math.random().toString(36).substr(2, 9)
          };
          // Limit to maximum 5 notifications
          return newNotifications.slice(-5);
        }
      }
      
      const newNotifications = [...prev, { ...notification, id, count: 1 }];
      // Limit to maximum 5 notifications
      return newNotifications.slice(-5);
    });
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showFloatingText = (text: Omit<FloatingText, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setFloatingTexts(prev => [...prev, { ...text, id }]);
  };

  const removeFloatingText = (id: string) => {
    setFloatingTexts(prev => prev.filter(t => t.id !== id));
  };

  const addParticle = (particle: Omit<ParticleEffect, 'id' | 'createdAt'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setParticles(prev => [...prev, { ...particle, id, createdAt: Date.now() }]);
  };

  const removeParticle = (id: string) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  };

  // Auth
  useEffect(() => {
    const sessionUser = checkSession();
    if (sessionUser) setCurrentUser(sessionUser);
    setAuthChecked(true);
  }, []);

  // WebSocket: Connect and listen for real-time updates
  useEffect(() => {
    if (!currentUser) {
      websocketService.disconnect();
      return;
    }

    // Connect WebSocket (silently fails if server not available)
    websocketService.connect(currentUser).catch((error) => {
      // Silently handle - game works fine without WebSocket
      // Only log in development
      if (import.meta.env.DEV) {
        console.info('WebSocket not available, game continues without real-time sync');
      }
    });

    // Listen for game state updates from WebSocket
    const unsubscribeGameState = websocketService.on('gameStateUpdate', (update: { username: string; gameState: GameState; version: number }) => {
      if (update.username === currentUser.username) {
        console.log('Received real-time game state update from another device');
        
        // Merge with current state safely - ensure all required properties exist
        setGameState(prev => {
          // Create a safe merge that preserves nested objects and arrays
          const serverState = update.gameState;
          
          // Ensure missions and achievements are arrays, not null/undefined
          const safeMissions = Array.isArray(serverState.missions) 
            ? serverState.missions 
            : (prev.missions || initializeMissions());
          
          const safeAchievements = Array.isArray(serverState.achievements)
            ? serverState.achievements
            : (prev.achievements || initializeAchievements());
          
          const mergedState: GameState = {
            ...createDefaultGameState(), // Start with defaults to ensure all properties exist
            ...prev, // Preserve current state
            ...serverState, // Apply server update
            // Ensure nested objects are properly merged
            inventory: { ...prev.inventory, ...(serverState.inventory || {}) },
            harvested: { ...prev.harvested, ...(serverState.harvested || {}) },
            plots: Array.isArray(serverState.plots) ? serverState.plots : prev.plots,
            decorations: Array.isArray(serverState.decorations) ? serverState.decorations : prev.decorations,
            missions: safeMissions,
            achievements: safeAchievements,
            statistics: {
              ...initializeStatistics(),
              ...prev.statistics,
              ...(serverState.statistics || {}),
            },
            // Preserve UI-related state that shouldn't be synced
            activeQuest: serverState.activeQuest !== undefined ? serverState.activeQuest : prev.activeQuest,
            dailyChallenge: serverState.dailyChallenge !== undefined ? serverState.dailyChallenge : prev.dailyChallenge,
          };
          
          return mergedState;
        });

        showNotification({
          type: 'info',
          title: 'Game Updated',
          message: 'Your game has been synced from another device',
          duration: 3000,
          groupKey: 'game-sync', // Group all sync notifications together
        });
      }
    });

    // Listen for notifications
    const unsubscribeNotification = websocketService.on('notification', (data: { type: string; message: string; data?: any }) => {
      showNotification({
        type: data.type as any || 'info',
        message: data.message,
        duration: 3000,
      });
    });

    // Listen for connection status
    const unsubscribeStatus = websocketService.on('authenticated', (data: { success: boolean; message?: string }) => {
      if (data.success) {
        console.log('WebSocket authenticated successfully');
      }
    });

    return () => {
      unsubscribeGameState();
      unsubscribeNotification();
      unsubscribeStatus();
    };
  }, [currentUser]);

  // Load & Migrate Data
  useEffect(() => {
    if (currentUser) {
        setIsLoadingSave(true);
        const loadData = async () => {
            try {
                const { loadGameState, saveGameState, checkForUpdates } = await import('./services/databaseService');
                
                // Get stored metadata from localStorage
                const metadataKey = `gemini_farm_metadata_${currentUser.username}`;
                const storedMetadata = localStorage.getItem(metadataKey);
                let lastKnownVersion: number | undefined;
                let lastKnownUpdatedAt: number | undefined;
                
                if (storedMetadata) {
                    try {
                        const meta = JSON.parse(storedMetadata);
                        lastKnownVersion = meta.version;
                        lastKnownUpdatedAt = meta.updatedAt;
                    } catch (e) {
                        console.error('Error parsing stored metadata:', e);
                    }
                }
                
                // Check for updates on server
                const updateCheck = await checkForUpdates(currentUser.username, lastKnownVersion, lastKnownUpdatedAt);
                
                let parsed: { gameState: any; metadata?: any } | null = null;
                
                // If there are updates, load from server
                if (updateCheck.hasUpdates) {
                    console.log('Updates available on server, loading...');
                    parsed = await loadGameState(currentUser.username);
                    
                    // Store metadata if we got it
                    if (parsed?.metadata) {
                        localStorage.setItem(metadataKey, JSON.stringify(parsed.metadata));
                    }
                } else {
                    // Try to load from database first
                    parsed = await loadGameState(currentUser.username);
                    
                    // Store metadata if we got it
                    if (parsed?.metadata) {
                        localStorage.setItem(metadataKey, JSON.stringify(parsed.metadata));
                    }
                    
                    // Fallback to localStorage if database doesn't have data
                    if (!parsed) {
                        const saveKey = `gemini_farm_save_${currentUser.username}`;
                        const saved = localStorage.getItem(saveKey);
                        if (saved) {
                            const localState = JSON.parse(saved);
                            parsed = { gameState: localState };
                            // Migrate to database
                            if (localState) {
                                const saveResult = await saveGameState(currentUser.username, localState);
                                if (saveResult.metadata) {
                                    localStorage.setItem(metadataKey, JSON.stringify(saveResult.metadata));
                                }
                            }
                        }
                    }
                }
                
                if (parsed?.gameState) {
                    const parsedState = parsed.gameState;
                    // MIGRATION LOGIC
                    let plots = parsedState.plots || [];
                    // If plots are old format (no x,y), lay them out on grid
                    if (plots.length > 0 && typeof plots[0].x === 'undefined') {
                        plots = plots.map((p: any, i: number) => ({
                            ...p,
                            x: i % GRID_SIZE,
                            y: Math.floor(i / GRID_SIZE)
                        }));
                    }
                    
                    setGameState({
                        ...createDefaultGameState(),
                        ...parsedState,
                        inventory: { ...INITIAL_INVENTORY, ...parsedState.inventory },
                        harvested: { ...INITIAL_HARVESTED, ...parsedState.harvested },
                        decorations: (parsedState.decorations || []).map((d: any) => ({
                            ...d,
                            layer: d.layer || (DECORATIONS[d.typeId]?.type === 'walkable' ? 'ground' : 'overlay')
                        })),
                        plots: plots.map((p: any) => ({
                            ...p,
                            isWatered: p.isWatered ?? false,
                            hasSprinkler: p.hasSprinkler ?? false,
                            status: p.status === 'building' ? 'building' : p.status
                        })),
                        missions: parsedState.missions || initializeMissions(),
                        achievements: parsedState.achievements || initializeAchievements(),
                        statistics: {
                            ...initializeStatistics(),
                            ...parsedState.statistics,
                            plotsOwned: parsedState.statistics?.plotsOwned || parsedState.plots?.length || 0,
                            totalPrestiges: parsedState.statistics?.totalPrestiges || 0,
                            maxCombo: parsedState.statistics?.maxCombo || 0,
                            perfectSeasons: parsedState.statistics?.perfectSeasons || 0
                        },
                        dailyChallenge: parsedState.dailyChallenge || null,
                        lastDailyChallengeReset: parsedState.lastDailyChallengeReset || Date.now(),
                        // New mechanics with defaults
                        prestigeLevel: parsedState.prestigeLevel || 0,
                        prestigePoints: parsedState.prestigePoints || 0,
                        cropMastery: parsedState.cropMastery || {},
                        researchTree: parsedState.researchTree || {},
                        automationLevel: parsedState.automationLevel || 0,
                        comboBonus: parsedState.comboBonus || 1,
                        lastComboTime: parsedState.lastComboTime || 0
                    });
                    
                    // Show notification if updates were loaded
                    if (updateCheck.hasUpdates) {
                        showNotification({
                            type: 'info',
                            message: 'Your game has been updated with the latest save from the server!',
                        });
                    }
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
                    const newState = createDefaultGameState();
                    newState.plots = initialPlots;
                    newState.dailyChallenge = generateDailyChallenge();
                    setGameState(newState);
                    
                    // Save initial state to database
                    const saveResult = await saveGameState(currentUser.username, newState);
                    if (saveResult.metadata) {
                        const metadataKey = `gemini_farm_metadata_${currentUser.username}`;
                        localStorage.setItem(metadataKey, JSON.stringify(saveResult.metadata));
                    }
                }
            } catch (e) {
                console.error("Save load error", e);
                setGameState(createDefaultGameState());
            } finally {
                setIsLoadingSave(false);
            }
        };
        
        loadData();
    }
  }, [currentUser]);

  // Save Data - Improved with immediate save for important changes
  const saveGameStateToServer = React.useRef<{ timeoutId: NodeJS.Timeout | null }>({ timeoutId: null });
  
  const forceSave = React.useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const { saveGameState } = await import('./services/databaseService');
      const saveResult = await saveGameState(currentUser.username, gameState);
      
      if (saveResult.success) {
        setLastSaveTime(Date.now());
        
        // Store metadata if we got it
        if (saveResult.metadata) {
          const metadataKey = `gemini_farm_metadata_${currentUser.username}`;
          localStorage.setItem(metadataKey, JSON.stringify(saveResult.metadata));
          
          // Send update via WebSocket for real-time sync
          if (websocketService.isConnected()) {
            websocketService.sendGameStateUpdate(gameState, saveResult.metadata.version);
          }
        }
        
        // Also save to localStorage as backup
        const saveKey = `gemini_farm_save_${currentUser.username}`;
        localStorage.setItem(saveKey, JSON.stringify(gameState));
        console.log('Game state saved successfully');
      }
    } catch (e) {
      console.error("Failed to save game state:", e);
      // Fallback to localStorage
      try {
        const saveKey = `gemini_farm_save_${currentUser.username}`;
        localStorage.setItem(saveKey, JSON.stringify(gameState));
        setLastSaveTime(Date.now());
        console.log('Saved to localStorage as backup');
      } catch (localError) {
        console.error("Failed to save to localStorage:", localError);
      }
    }
  }, [gameState, currentUser]);

  // Auto-save with debounce (but shorter delay)
  useEffect(() => {
    if (currentUser && !isLoadingSave) {
      // Clear previous timeout
      if (saveGameStateToServer.current.timeoutId) {
        clearTimeout(saveGameStateToServer.current.timeoutId);
      }
      
      // Save after 500ms of no changes (reduced from 1000ms)
      saveGameStateToServer.current.timeoutId = setTimeout(() => {
        forceSave();
      }, 500);
      
      return () => {
        if (saveGameStateToServer.current.timeoutId) {
          clearTimeout(saveGameStateToServer.current.timeoutId);
        }
      };
    }
  }, [gameState, currentUser, isLoadingSave, forceSave]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentUser) {
        // Synchronous save to localStorage as last resort
        try {
          const saveKey = `gemini_farm_save_${currentUser.username}`;
          localStorage.setItem(saveKey, JSON.stringify(gameState));
        } catch (e) {
          console.error('Failed to save on unload:', e);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

        // Combo decay
        let newComboBonus = prev.comboBonus;
        let newLastComboTime = prev.lastComboTime;
        if (now - prev.lastComboTime > COMBO_DECAY_TIME && prev.comboBonus > 1) {
          newComboBonus = 1;
          hasChanges = true;
        }

        // Automation: Auto-harvest ready crops
        let autoHarvested = false;
        if (prev.automationLevel > 0 && prev.researchTree['auto_harvest_1']) {
          newPlots = newPlots.map(plot => {
            if (plot.status === 'ready' && plot.cropId && Math.random() < (prev.automationLevel * 0.2)) {
              autoHarvested = true;
              hasChanges = true;
              // Trigger harvest logic (simplified for automation)
              const crop = CROPS[plot.cropId];
              const baseXp = Math.floor(crop.xpReward * (1 + (prev.prestigeLevel * 0.1)));
              // Note: Full automation would require calling handleHarvest, but that's complex
              // For now, we just mark it as harvested in a simplified way
              return { ...plot, status: 'empty', cropId: null, plantedAt: null, isWatered: false };
            }
            return plot;
          });
        }

        // Quest Expiration
        let newQuest = prev.activeQuest;
        if (newQuest && now > newQuest.expiresAt) { newQuest = null; hasChanges = true; }

        if (!hasChanges && !autoHarvested) return prev;
        return { 
          ...prev, 
          plots: newPlots, 
          activeQuest: newQuest, 
          weather: newWeather, 
          season: newSeason, 
          nextSeasonAt: newNextSeasonAt,
          comboBonus: newComboBonus,
          lastComboTime: newLastComboTime
        };
      });

      if (marketTrend && now > marketTrend.expiresAt) setMarketTrend(null);
    }, TICK_RATE);
    return () => clearInterval(interval);
  }, [marketTrend, currentUser]);

  // Mission & Achievement Progress Checking
  useEffect(() => {
    if (!currentUser) return;
    
    const now = Date.now();
    
    setGameState(prev => {
      const { updatedMissions, completedMissions } = checkMissionProgress(prev.missions, prev);
      const { updatedAchievements, completedAchievements } = checkAchievementProgress(prev.achievements, prev);
      
      let newCoins = prev.coins;
      let newXp = prev.xp;
      let newLevel = prev.level;
      let newStatistics = { ...prev.statistics };
      
      // Reward completed missions
      completedMissions.forEach(mission => {
        newCoins += mission.rewardCoins;
        newXp += mission.rewardXp;
        newStatistics.missionsCompleted += 1;
        
        // Show mission completion notification
        showNotification({
          type: 'mission',
          title: `Mission Complete: ${mission.title}`,
          message: `+${mission.rewardCoins} coins, +${mission.rewardXp} XP`,
          duration: 1000
        });
      });
      
      // Reward completed achievements
      completedAchievements.forEach(achievement => {
        newCoins += achievement.rewardCoins;
        newXp += achievement.rewardXp;
        
        // Show achievement unlock notification
        showNotification({
          type: 'achievement',
          title: `Achievement Unlocked!`,
          message: `${achievement.icon} ${achievement.title}`,
          icon: <span className="text-2xl">{achievement.icon}</span>,
          duration: 1000
        });
      });
      
      if (newXp !== prev.xp) {
        newLevel = checkLevelUp(newXp, prev.level);
        
        // Check for level up
        if (newLevel > prev.level) {
          const levelDiff = newLevel - prev.level;
          showNotification({
            type: 'level',
            title: `Level Up!`,
            message: `Reached Level ${newLevel}!`,
            duration: 4000
          });
          
          // Show floating level text in center
          showFloatingText({
            type: 'level',
            value: newLevel,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
          });
        }
      }
      
      // Check daily challenge
      let dailyChallenge = prev.dailyChallenge;
      const shouldResetDaily = !dailyChallenge || (now - prev.lastDailyChallengeReset > 24 * 60 * 60 * 1000);
      
      if (shouldResetDaily) {
        dailyChallenge = generateDailyChallenge();
      } else if (dailyChallenge) {
        dailyChallenge = checkDailyChallengeProgress(dailyChallenge, prev);
        if (dailyChallenge && dailyChallenge.completed && !prev.dailyChallenge?.completed) {
          // First time completing - show notification
          showNotification({
            type: 'achievement',
            title: 'Daily Challenge Complete!',
            message: `+${Math.round((dailyChallenge.rewardMultiplier - 1) * 100)}% bonus active!`,
            duration: 1000
          });
        }
      }
      
      return {
        ...prev,
        coins: newCoins,
        xp: newXp,
        level: newLevel,
        missions: updatedMissions,
        achievements: updatedAchievements,
        statistics: {
          ...newStatistics,
          levelReached: Math.max(newStatistics.levelReached, newLevel)
        },
        dailyChallenge,
        lastDailyChallengeReset: shouldResetDaily ? now : prev.lastDailyChallengeReset
      };
    });
  }, [gameState.statistics, gameState.level, currentUser]);

  // Track quest completion
  useEffect(() => {
    if (gameState.activeQuest === null) {
      setGameState(prev => {
        if (prev.activeQuest !== null) {
          return {
            ...prev,
            statistics: {
              ...prev.statistics,
              questsCompleted: prev.statistics.questsCompleted + 1
            }
          };
        }
        return prev;
      });
    }
  }, [gameState.activeQuest]);

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

  const handleLogout = async () => {
    // Save game state before logging out
    if (currentUser) {
      try {
        const { saveGameState } = await import('./services/databaseService');
        await saveGameState(currentUser.username, gameState);
        console.log('Game state saved before logout');
      } catch (error) {
        console.error('Error saving before logout:', error);
        // Still save to localStorage as backup
        try {
          const saveKey = `gemini_farm_save_${currentUser.username}`;
          localStorage.setItem(saveKey, JSON.stringify(gameState));
        } catch (e) {
          console.error('Failed to save to localStorage:', e);
        }
      }
    }
    logoutUser();
    setCurrentUser(null);
    setGameState(createDefaultGameState());
  };

  // --- Grid Interaction Logic ---

  // 1. Mouse Down (Start Drag or Click)
  const handleGridMouseDown = (x: number, y: number, event?: React.MouseEvent | React.TouchEvent) => {
    // Prevent default for touch events and prevent scrolling
    if (event && 'touches' in event) {
      event.preventDefault();
      event.stopPropagation();
      // Prevent body scroll during drag
      document.body.classList.add('dragging');
    }
    
    // A. Edit Mode Drag Start
    if (isEditMode) {
        const plot = gameState.plots.find(p => p.x === x && p.y === y);
        if (plot) {
            setEditDragItem({ type: 'plot', id: plot.id, startX: x, startY: y });
            return;
        }
        // Check for decorations at this position (any layer)
        const decor = gameState.decorations.find(d => d.x === x && d.y === y);
        if (decor) {
            setEditDragItem({ type: 'decoration', id: decor.id, startX: x, startY: y });
            return;
        }
        return;
    }

    // B. Farming Mode Interaction
    const plot = gameState.plots.find(p => p.x === x && p.y === y);
    
    // B1. Place Decoration (if tool selected) - Decorations can be placed anywhere, even on plots
    if (selectedDecorationToPlace) {
         const decorData = DECORATIONS[selectedDecorationToPlace];
         if (gameState.coins >= decorData.cost) {
             // Determine layer based on decoration type
             const layer = decorData.type === 'walkable' ? 'ground' : 'overlay';
             setGameState(prev => ({
                 ...prev,
                 coins: prev.coins - decorData.cost,
                 decorations: [...prev.decorations, { 
                     id: Math.random().toString(), 
                     x, 
                     y, 
                     typeId: selectedDecorationToPlace,
                     layer
                 }],
                 statistics: {
                     ...prev.statistics,
                     decorationsPlaced: prev.statistics.decorationsPlaced + 1,
                     totalSpent: prev.statistics.totalSpent + decorData.cost
                 }
             }));
             setSelectedDecorationToPlace(null);
         }
         return;
    }
    
    // B2. Plot Actions
    if (plot) {
        handleMouseDownPlot(plot.id);
    }
  };

  // 2. Mouse Up (End Drag / Drop)
  const handleGridMouseUp = (x: number, y: number, event?: React.MouseEvent | React.TouchEvent) => {
      // Prevent default for touch events
      if (event && 'touches' in event) {
        event.preventDefault();
        event.stopPropagation();
      }
      // Remove dragging class to restore scrolling
      if (event && 'touches' in event) {
        document.body.classList.remove('dragging');
      }
      
      // A. Farming Mode Drag End
      if (!isEditMode) {
          setIsDragging(false);
          setDragAction(null);
          lastProcessedPlotRef.current = null;
          lastProcessedTimeRef.current = 0;
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
               showNotification({
                 type: 'success',
                 title: `Built ${building.name}`,
                 message: `${building.emoji} Ready to use!`,
                 duration: 1000
               });

                setGameState(prev => ({
                    ...prev,
                    coins: prev.coins - building.cost,
                    plots: prev.plots.map(p => p.id === plotId ? { ...p, status: 'building', buildingId: selectedBuildingToPlace, isWatered: false } : p),
                    statistics: {
                        ...prev.statistics,
                        buildingsBuilt: prev.statistics.buildingsBuilt + 1,
                        totalSpent: prev.statistics.totalSpent + building.cost
                    }
                }));
                setSelectedBuildingToPlace(null);
                // Force immediate save after important purchase
                setTimeout(() => forceSave(), 100);
            }
            return;
      }

      // Sprinkler
      if (placingSprinkler && !plot.hasSprinkler) {
           if (gameState.coins >= SPRINKLER_COST) {
               showNotification({
                 type: 'success',
                 title: 'Sprinkler Installed',
                 message: '💧 Auto-watering active!',
                 duration: 1000
               });

               setGameState(prev => ({
                   ...prev,
                   coins: prev.coins - SPRINKLER_COST,
                   plots: prev.plots.map(p => p.id === plotId ? { ...p, hasSprinkler: true, isWatered: true } : p)
               }));
               setPlacingSprinkler(false);
               // Force immediate save after important purchase
               setTimeout(() => forceSave(), 100);
           }
           return;
      }

      // Standard actions - we'll pass event through the handlers
      // Note: We'll need to track mouse position for floating text
      if (plot.status === 'ready') handleHarvest(plotId);
      else if (plot.status === 'growing' && !plot.isWatered) handleWater(plotId);
      else if (plot.status === 'empty') handlePlant(plotId);
  };

  const handlePlant = (plotId: number) => {
      if (!selectedSeed || gameState.inventory[selectedSeed] <= 0) return;
      
      const crop = CROPS[selectedSeed];
      
      // Play sound
      import('./services/soundService').then(({ soundService }) => {
        soundService.plant();
      });

      // Only show notification if not dragging (to reduce spam during drag planting)
      if (!isDragging) {
        showNotification({
          type: 'success',
          title: `Planted ${crop.name}`,
          message: `${crop.emoji}`,
          duration: 800,
          groupKey: `plant-${selectedSeed}`
        });
      }

      setGameState(prev => {
          const newState = {
              ...prev,
              plots: prev.plots.map(p => p.id === plotId && p.status === 'empty' ? { ...p, status: 'growing', cropId: selectedSeed, plantedAt: Date.now(), isWatered: false } : p),
              inventory: { ...prev.inventory, [selectedSeed]: prev.inventory[selectedSeed] - 1 },
              statistics: {
                  ...prev.statistics,
                  cropsPlanted: prev.statistics.cropsPlanted + 1
              }
          };
          
          // Force immediate save after planting to sync via WebSocket
          // Use setTimeout to ensure state is updated before saving
          setTimeout(async () => {
              if (currentUser) {
                  try {
                      const { saveGameState } = await import('./services/databaseService');
                      const saveResult = await saveGameState(currentUser.username, newState);
                      
                      if (saveResult.success && saveResult.metadata) {
                          // Send update via WebSocket for real-time sync
                          if (websocketService.isConnected()) {
                              websocketService.sendGameStateUpdate(newState, saveResult.metadata.version);
                              console.log('Planted seed - state saved and sent via WebSocket');
                          }
                      }
                  } catch (error) {
                      console.error('Error saving after planting:', error);
                  }
              }
          }, 200);
          
          return newState;
      });
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
                 
                 // Show special quest reward animation (dopamine hit!)
                 setQuestReward({ coins: bonusCoins, xp: bonusXp });
             }
        }

        // Combo system
        const now = Date.now();
        let newComboBonus = prev.comboBonus;
        let newLastComboTime = prev.lastComboTime;
        
        if (now - prev.lastComboTime < COMBO_DECAY_TIME) {
          newComboBonus = Math.min(prev.comboBonus + 0.1, COMBO_MULTIPLIER_MAX);
          newLastComboTime = now;
        } else {
          newComboBonus = 1.1;
          newLastComboTime = now;
        }

        // Mastery system
        const masteryLevel = prev.cropMastery[crop.id] || 0;
        const masteryXp = Math.floor(crop.xpReward * 0.1);

        // Research & prestige bonuses
        const prestigeBonus = 1 + (prev.prestigeLevel * 0.1);
        const researchBonus = prev.researchTree['mastery_boost'] ? 1.25 : 1;

        // Calculate rewards with bonuses
        const baseXp = crop.xpReward;
        const totalXp = Math.floor((baseXp + bonusXp) * newComboBonus * prestigeBonus * researchBonus);
        const newXp = prev.xp + totalXp;
        const newLevel = checkLevelUp(newXp, prev.level);

        // Update mastery
        const newCropMastery = { ...prev.cropMastery };
        const currentMasteryXp = (newCropMastery[crop.id] || 0) + masteryXp;
        const newMasteryLevel = Math.floor(currentMasteryXp / 100);
        newCropMastery[crop.id] = currentMasteryXp;
        
        // Play sound
        import('./services/soundService').then(({ soundService }) => {
          soundService.harvest();
        });

        // Particle effects (will be positioned by Plot component)
        const plotElement = document.querySelector(`[data-plot-id="${plotId}"]`) as HTMLElement;
        const rect = plotElement?.getBoundingClientRect();
        if (rect) {
          const particleX = rect.left + rect.width / 2;
          const particleY = rect.top + rect.height / 2;
          
          addParticle({
            type: 'harvest',
            x: particleX,
            y: particleY,
            value: newComboBonus > 1.5 ? 2 : 1
          });
          
          addParticle({
            type: 'xp',
            x: particleX,
            y: particleY - 20,
            value: totalXp
          });

          if (newComboBonus >= 2) {
            addParticle({
              type: 'combo',
              x: particleX,
              y: particleY - 40,
              value: Math.floor(newComboBonus)
            });
          }
        }

        // Show harvest notification
        if (!(bonusCoins > 0 && bonusXp > 0)) {
          showNotification({
            type: 'success',
            title: `Harvested ${crop.name}${newComboBonus > 1.5 ? ` x${Math.floor(newComboBonus)}` : ''}`,
            message: `${crop.emoji} +${totalXp} XP`,
            duration: 1000,
            groupKey: `harvest-${crop.id}`
          });
        }

        // Check for level up
        if (newLevel > prev.level) {
          setTimeout(() => {
            import('./services/soundService').then(({ soundService }) => {
              soundService.levelUp();
            });
            showNotification({
              type: 'level',
              title: `Level Up!`,
              message: `Reached Level ${newLevel}!`,
              duration: 1000
            });
          }, 500);
        }

        // Mastery level up
        if (newMasteryLevel > masteryLevel) {
          showNotification({
            type: 'success',
            title: `Mastery Level Up!`,
            message: `${crop.name} Mastery ${newMasteryLevel}`,
            duration: 2000
          });
        }
        
        // Update statistics
        const newTotalHarvested = { ...prev.statistics.totalHarvested };
        newTotalHarvested[crop.id] = (newTotalHarvested[crop.id] || 0) + 1;

        const newState = {
            ...prev,
            xp: newXp,
            level: newLevel,
            coins: prev.coins + bonusCoins,
            harvested: { ...prev.harvested, [crop.id]: (prev.harvested[crop.id]||0) + 1 },
            plots: prev.plots.map(p => p.id === plotId ? { ...p, status: 'empty', cropId: null, plantedAt: null, isWatered: false } : p),
            activeQuest: newActiveQuest,
            comboBonus: newComboBonus,
            lastComboTime: newLastComboTime,
            cropMastery: newCropMastery,
            statistics: {
                ...prev.statistics,
                totalHarvested: newTotalHarvested,
                levelReached: Math.max(prev.statistics.levelReached, newLevel),
                maxCombo: Math.max(prev.statistics.maxCombo || 0, Math.floor(newComboBonus))
            }
        };
        
        // Force immediate save after harvest to sync via WebSocket
        // Use setTimeout to ensure state is updated before saving
        setTimeout(async () => {
            if (currentUser) {
                try {
                    const { saveGameState } = await import('./services/databaseService');
                    const saveResult = await saveGameState(currentUser.username, newState);
                    
                    if (saveResult.success && saveResult.metadata) {
                        // Send update via WebSocket for real-time sync
                        if (websocketService.isConnected()) {
                            websocketService.sendGameStateUpdate(newState, saveResult.metadata.version);
                            console.log('Harvested crop - state saved and sent via WebSocket');
                        }
                    }
                } catch (error) {
                    console.error('Error saving after harvest:', error);
                }
            }
        }, 200);
        
        return newState;
    });
  };

  const handleWater = (plotId: number) => {
      const plot = gameState.plots.find(p => p.id === plotId);
      if (!plot || plot.status !== 'growing' || plot.isWatered) return;

      // Play sound
      import('./services/soundService').then(({ soundService }) => {
        soundService.water();
      });

      // Only show notification if not dragging (to reduce spam during drag watering)
      if (!isDragging) {
        showNotification({
          type: 'info',
          title: 'Watered',
          message: '💧',
          duration: 800,
          groupKey: 'water' // Group all watering notifications
        });
      }

      setGameState(prev => ({
          ...prev,
          plots: prev.plots.map(p => p.id === plotId && p.status === 'growing' ? { ...p, isWatered: true } : p)
      }));
  };

  const handleSell = (item: ItemId, amount: number, price: number) => {
      setGameState(prev => {
          const currentCount = prev.harvested[item] || 0;
          if (currentCount < amount) return prev;
          
          const totalEarned = price * amount;
          const xpGain = 3 * amount; // Reduced from 5
          const newXp = prev.xp + xpGain;
          const newLevel = checkLevelUp(newXp, prev.level);

          // Show notification
          const itemName = CROPS[item as CropId]?.name || PRODUCTS[item as ProductId]?.name || 'Item';
          showNotification({
            type: 'success',
            title: `Sold ${itemName}`,
            message: `+${totalEarned} coins, +${xpGain} XP`,
            duration: 1000,
            groupKey: `sell-${item}` // Group by item type
          });

          // Check for level up
          if (newLevel > prev.level) {
            setTimeout(() => {
              showNotification({
                type: 'level',
                title: `Level Up!`,
                message: `Reached Level ${newLevel}!`,
                duration: 1000
              });
            }, 500);
          }

          return {
              ...prev,
              coins: prev.coins + totalEarned,
              xp: newXp,
              level: newLevel,
              harvested: { ...prev.harvested, [item]: currentCount - amount },
              statistics: {
                  ...prev.statistics,
                  totalEarned: prev.statistics.totalEarned + totalEarned,
                  highestCoins: Math.max(prev.statistics.highestCoins, prev.coins + totalEarned),
                  levelReached: Math.max(prev.statistics.levelReached, newLevel)
              }
          };
      });
  };

  // --- Farm Interactions Helper ---
  // (We manually wire dragging logic since HTML5 drag isn't great for this "paint" style interaction)
  const handleMouseDownPlot = (plotId: number, event?: React.MouseEvent | React.TouchEvent) => {
      const plot = gameState.plots.find(p => p.id === plotId);
      if (!plot) return;
      
      // Prevent default to avoid scrolling on mobile
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      let action: DragAction = null;
      if (plot.status === 'ready') action = 'harvest';
      else if (plot.status === 'growing' && !plot.isWatered && !plot.hasSprinkler) action = 'water';
      else if (plot.status === 'empty' && selectedSeed && !selectedBuildingToPlace && !placingSprinkler) action = 'plant';
      
      if (action) {
          // Perform the action immediately on first touch/click
          handleInteractPlot(plotId);
          // Then set up drag for subsequent tiles
          setIsDragging(true);
          setDragAction(action);
          lastProcessedPlotRef.current = plotId;
          lastProcessedTimeRef.current = Date.now();
      } else {
          handleInteractPlot(plotId); 
      }
  };

  const handleMouseEnterPlot = (plotId: number) => {
      if (!isDragging || !dragAction || isEditMode) return;
      const plot = gameState.plots.find(p => p.id === plotId);
      if (!plot) return;
      
      // Prevent duplicate actions on the same plot within 100ms
      const now = Date.now();
      if (lastProcessedPlotRef.current === plotId && (now - lastProcessedTimeRef.current) < 100) {
          return;
      }
      
      lastProcessedPlotRef.current = plotId;
      lastProcessedTimeRef.current = now;
      
      if (dragAction === 'harvest' && plot.status === 'ready') handleHarvest(plotId);
      if (dragAction === 'water' && plot.status === 'growing' && !plot.isWatered && !plot.hasSprinkler) handleWater(plotId);
      if (dragAction === 'plant' && plot.status === 'empty') handlePlant(plotId);
  };
  
  const handleTouchMove = (plotId: number, event: React.TouchEvent) => {
      if (!isDragging || !dragAction || isEditMode) return;
      event.preventDefault();
      event.stopPropagation();
      const plot = gameState.plots.find(p => p.id === plotId);
      if (!plot) return;
      
      if (dragAction === 'harvest' && plot.status === 'ready') handleHarvest(plotId);
      if (dragAction === 'water' && plot.status === 'growing' && !plot.isWatered && !plot.hasSprinkler) handleWater(plotId);
      if (dragAction === 'plant' && plot.status === 'empty') handlePlant(plotId);
  };
  
  // Track last processed plot to prevent duplicate actions during drag
  const lastProcessedPlotRef = useRef<number | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);

  // --- Global Mouse/Touch Up ---
  useEffect(() => {
    const handleWindowUp = (e: MouseEvent | TouchEvent) => {
      // Remove dragging class to restore scrolling
      document.body.classList.remove('dragging');
      
      // Don't interfere with button clicks or other interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="button"]') || target.closest('input') || target.closest('textarea')) {
        return;
      }
      setIsDragging(false); 
      setDragAction(null);
      lastProcessedPlotRef.current = null;
      lastProcessedTimeRef.current = 0;
    };
    const handleTouchCancel = () => {
      document.body.classList.remove('dragging');
      setIsDragging(false);
      setDragAction(null);
      lastProcessedPlotRef.current = null;
      lastProcessedTimeRef.current = 0;
    };
    window.addEventListener('mouseup', handleWindowUp);
    window.addEventListener('touchend', handleWindowUp, { passive: false });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    return () => {
      window.removeEventListener('mouseup', handleWindowUp);
      window.removeEventListener('touchend', handleWindowUp);
      window.removeEventListener('touchcancel', handleTouchCancel);
      document.body.classList.remove('dragging');
    };
  }, []);

  // Close account info on outside click
  useEffect(() => {
    if (!showAccountInfo) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-account-info]')) {
        setShowAccountInfo(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showAccountInfo]);

  // --- Render Grid ---
  const renderGrid = useMemo(() => {
      const cells = [];
      for (let y = 0; y < GRID_SIZE; y++) {
          for (let x = 0; x < GRID_SIZE; x++) {
              const plot = gameState.plots.find(p => p.x === x && p.y === y);
              const groundDecorations = gameState.decorations.filter(d => d.x === x && d.y === y && d.layer === 'ground');
              const overlayDecorations = gameState.decorations.filter(d => d.x === x && d.y === y && d.layer === 'overlay');
              
              // Are we dragging THIS item?
              const isBeingDragged = isEditMode && editDragItem && 
                                     ((editDragItem.type === 'plot' && plot?.id === editDragItem.id) || 
                                      (editDragItem.type === 'decoration' && gameState.decorations.some(d => d.id === editDragItem.id && d.x === x && d.y === y)));
              
              // Is this a valid drop target? (Empty plot slot)
              const isValidDrop = isEditMode && editDragItem && !plot;

              cells.push(
                  <div 
                    key={`${x}-${y}`} 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleGridMouseDown(x, y, e);
                    }}
                    onMouseUp={(e) => {
                      e.preventDefault();
                      handleGridMouseUp(x, y, e);
                    }}
                    onMouseEnter={() => handleGridMouseEnter(x, y)}
                    onTouchStart={(e) => {
                      // Wrap in try-catch to handle passive listener errors
                      try {
                        e.preventDefault();
                        e.stopPropagation();
                      } catch (err) {
                        // Ignore if preventDefault fails (passive listener)
                      }
                      handleGridMouseDown(x, y, e);
                    }}
                    onTouchEnd={(e) => {
                      try {
                        e.preventDefault();
                        e.stopPropagation();
                      } catch (err) {
                        // Ignore if preventDefault fails (passive listener)
                      }
                      handleGridMouseUp(x, y, e);
                    }}
                    onTouchMove={(e) => {
                      // Only prevent default if we're actually dragging/interacting
                      // Wrap in try-catch to handle passive listener errors
                      if (isDragging || isEditMode) {
                        try {
                          e.preventDefault();
                          e.stopPropagation();
                        } catch (err) {
                          // Ignore if preventDefault fails (passive listener)
                        }
                      }
                      
                      // Handle edit mode drag
                      if (isEditMode && editDragItem) {
                        const touch = e.touches[0];
                        if (touch) {
                          const element = document.elementFromPoint(touch.clientX, touch.clientY);
                          if (element) {
                            const cell = element.closest('[data-grid-cell]');
                            if (cell) {
                              const cellId = cell.getAttribute('data-grid-cell');
                              if (cellId) {
                                const [cx, cy] = cellId.split('-').map(Number);
                                // Update drag item position for visual feedback
                                if (editDragItem.startX !== cx || editDragItem.startY !== cy) {
                                  // Visual feedback is handled by isValidDrop in render
                                }
                              }
                            }
                          }
                        }
                        return;
                      }
                      
                      // Handle farming drag actions
                      if (!isDragging || !dragAction) return;
                      const touch = e.touches[0];
                      if (touch) {
                        const element = document.elementFromPoint(touch.clientX, touch.clientY);
                        if (element) {
                          const cell = element.closest('[data-grid-cell]');
                          if (cell) {
                            const cellId = cell.getAttribute('data-grid-cell');
                            if (cellId) {
                              const [cx, cy] = cellId.split('-').map(Number);
                              const plot = gameState.plots.find(p => p.x === cx && p.y === cy);
                              if (plot) {
                                handleMouseEnterPlot(plot.id);
                              } else {
                                handleGridMouseEnter(cx, cy);
                              }
                            }
                          }
                        }
                      }
                    }}
                    data-grid-cell={`${x}-${y}`}
                    className={`touch-manipulation
                        aspect-square rounded-lg relative transition-all border-2 select-none
                        ${isBeingDragged ? 'opacity-50 scale-90 ring-4 ring-yellow-400 z-50' : ''}
                        ${isValidDrop ? 'bg-emerald-500/20 border-emerald-500/50 cursor-copy' : plot ? 'border-slate-600/30' : 'border-slate-700/20 bg-slate-800/20'}
                        ${!plot && !isEditMode && selectedSeed ? 'hover:bg-emerald-500/10 hover:border-emerald-500/30 cursor-pointer active:bg-emerald-500/20' : ''}
                        ${isEditMode && plot ? 'cursor-grab active:cursor-grabbing hover:border-yellow-400/50' : ''}
                        ${plot && plot.status === 'ready' ? 'ring-2 ring-emerald-500/50' : ''}
                        ${isDragging && dragAction ? 'touch-none' : ''}
                    `}
                    style={{ touchAction: isDragging && dragAction ? 'none' : 'manipulation' }}
                  >
                      {/* Ground Layer Decorations (under plots) */}
                      {groundDecorations.map(decor => (
                          <div key={decor.id} className="absolute inset-0 z-5 pointer-events-none opacity-60">
                                <Decoration 
                                    decoration={decor} 
                                    onMouseDown={() => {}}
                                    isDraggable={isEditMode}
                                />
                          </div>
                      ))}

                      {/* Plot Layer */}
                      {plot && (
                          <div className="absolute inset-0 z-10">
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

                      {/* Overlay Layer Decorations (above plots) */}
                      {overlayDecorations.map(decor => (
                          <div key={decor.id} className="absolute inset-0 z-30 pointer-events-none">
                                <Decoration 
                                    decoration={decor} 
                                    onMouseDown={() => {}}
                                    isDraggable={isEditMode}
                                />
                          </div>
                      ))}

                      {/* Planting Hint */}
                      {!plot && !isEditMode && selectedSeed && (
                          <div className="absolute inset-0 z-5 flex items-center justify-center pointer-events-none opacity-30">
                              <div className="text-2xl">{CROPS[selectedSeed].emoji}</div>
                          </div>
                      )}
                  </div>
              );
          }
      }
      return cells;
  }, [gameState.plots, gameState.decorations, isEditMode, editDragItem, selectedSeed, selectedBuildingToPlace, isDragging, dragAction, selectedDecorationToPlace]);


  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-400" size={32} />
      </div>
    );
  }
  if (!currentUser) return <AuthScreen onSuccess={setCurrentUser} />;
  
  if (isLoadingSave) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-emerald-400 mx-auto mb-4" size={32} />
          <p className="text-slate-400">Loading your farm...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-slate-100 font-sans pb-32 md:pb-24 transition-colors duration-1000 overflow-x-hidden relative
        ${gameState.weather === 'rainy' ? 'bg-slate-900' : gameState.weather === 'drought' ? 'bg-[#2c1a12]' : 'bg-[#111827]'}
    `}>
        {/* Weather Effects */}
        <WeatherEffects weather={gameState.weather} season={gameState.season} />
        
        {/* Particle Effects */}
        <ParticleEffects particles={particles} onRemove={removeParticle} />
        
        {/* Overlays */}
        {gameState.weather === 'rainy' && <div className="fixed inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10 z-0" />}

        {/* --- Header --- */}
        <header className="fixed top-0 inset-x-0 z-40 bg-black/60 backdrop-blur-xl border-b border-white/5 shadow-lg safe-area-top">
            <div className="max-w-5xl mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20 flex-shrink-0">
                        <Sprout className="text-white" size={20} />
                    </div>
                    <div className="hidden xs:block">
                        <h1 className="font-bold text-base sm:text-lg">Gemini Farm</h1>
                        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs opacity-70">
                           <span className="flex items-center gap-1 uppercase font-bold text-emerald-400">{gameState.season}</span>
                           <span className="hidden sm:inline">•</span>
                           <span className="flex items-center gap-1 uppercase">{gameState.weather}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex items-center gap-1 sm:gap-2 bg-slate-800/80 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10 shadow-inner">
                        <Coins className="text-amber-400" size={16} />
                        <span className="font-bold font-mono text-amber-100 text-xs sm:text-sm">{gameState.coins.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 pl-2 sm:pl-4 border-l border-white/10 relative" data-account-info>
                         {/* Mobile: Show level and XP bar */}
                         <div className="flex sm:hidden items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold">Lvl {gameState.level}</span>
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500" 
                                    style={{ width: `${Math.min(100, (gameState.xp / XP_TO_LEVEL_UP(gameState.level)) * 100)}%` }} 
                                />
                            </div>
                         </div>
                         
                         {/* Desktop: Show full account info */}
                         <div className="hidden sm:flex flex-col items-end">
                            <button 
                                onClick={() => setShowAccountInfo(!showAccountInfo)}
                                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                                {currentUser.username}
                            </button>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500 font-bold">Lvl {gameState.level}</span>
                                <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500" 
                                        style={{ width: `${Math.min(100, (gameState.xp / XP_TO_LEVEL_UP(gameState.level)) * 100)}%` }} 
                                    />
                                </div>
                            </div>
                            {lastSaveTime && (
                                <span className="text-[9px] text-slate-600 mt-0.5 hidden md:block">
                                    Saved {Math.floor((Date.now() - lastSaveTime) / 1000)}s ago
                                </span>
                            )}
                         </div>
                         {showAccountInfo && (
                            <div className="absolute top-12 right-0 bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-4 shadow-2xl z-50 min-w-[180px] sm:min-w-[200px]">
                                {(() => {
                                    const userInfo = getUserInfo(currentUser.username);
                                    return (
                                        <>
                                            <div className="mb-3 pb-3 border-b border-slate-700">
                                                <div className="text-sm font-bold text-slate-200">{currentUser.username}</div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    Member since {new Date(currentUser.createdAt).toLocaleDateString()}
                                                </div>
                                                {userInfo?.lastLoginAt && (
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        Last login: {new Date(userInfo.lastLoginAt).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 space-y-1">
                                                <div>Progress is automatically saved</div>
                                                <div className="text-emerald-400">Your farm data is secure</div>
                                            </div>
                                            {currentUser.isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        setShowAccountInfo(false);
                                                        setShowAdminPanel(true);
                                                    }}
                                                    className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-semibold"
                                                >
                                                    <Shield size={14} />
                                                    Admin Panel
                                                </button>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                         )}
                         {currentUser.isAdmin && (
                            <button 
                                onClick={() => setShowAdminPanel(true)} 
                                className="p-1.5 sm:p-2 bg-slate-800 hover:bg-emerald-500/20 text-emerald-400 rounded-full transition-colors" 
                                title="Admin Panel"
                            >
                                <Shield size={14} />
                            </button>
                         )}
                         <button onClick={handleLogout} className="p-1.5 sm:p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 rounded-full transition-colors" title="Logout">
                            <LogOut size={14} />
                         </button>
                    </div>
                </div>
            </div>
             {/* Desktop tabs - hidden on mobile */}
             <div className="hidden md:flex max-w-5xl mx-auto px-2 sm:px-4 gap-1 sm:gap-6 overflow-x-auto no-scrollbar pb-1">
                {[ 
                  { id: 'field', label: 'Farm', icon: LayoutGrid }, 
                  { id: 'shop', label: 'Shop', icon: Store }, 
                  { id: 'market', label: 'Market', icon: TrendingUp },
                  { id: 'missions', label: 'Missions', icon: Target },
                  { id: 'achievements', label: 'Achievements', icon: Trophy }
                ].map((tab) => {
                  // Show badge for missions/achievements with completions
                  let badge = null;
                  if (tab.id === 'missions') {
                    const completedCount = gameState.missions.filter(m => m.completed).length;
                    const totalUnlocked = gameState.missions.filter(m => m.unlocked).length;
                    if (completedCount > 0) {
                      badge = <span className="ml-1 text-[10px] sm:text-xs bg-emerald-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full">{completedCount}/{totalUnlocked}</span>;
                    }
                  } else if (tab.id === 'achievements') {
                    const unlockedCount = gameState.achievements.filter(a => a.unlocked).length;
                    if (unlockedCount > 0) {
                      badge = <span className="ml-1 text-[10px] sm:text-xs bg-amber-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full">{unlockedCount}</span>;
                    }
                  }
                  
                  const handleTabClick = (e: React.MouseEvent | React.TouchEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(tab.id as Tab);
                  };
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={handleTabClick}
                      onTouchEnd={handleTabClick}
                      className={`relative py-3 sm:py-3 px-3 sm:px-0 text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 transition-all whitespace-nowrap touch-manipulation min-w-[60px] sm:min-w-0 rounded-lg sm:rounded-none active:scale-95 ${
                        activeTab === tab.id 
                          ? 'text-emerald-400 bg-emerald-500/10 sm:bg-transparent' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 sm:hover:bg-transparent'
                      }`}
                    >
                      <tab.icon size={20} className="sm:w-[14px] sm:h-[14px]" /> 
                      <span className="hidden xs:inline text-[10px] sm:text-sm">{tab.label}</span> 
                      {badge}
                      {activeTab === tab.id && <div className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] hidden sm:block" />}
                      {activeTab === tab.id && <div className="absolute inset-0 rounded-lg border-2 border-emerald-400/50 sm:hidden pointer-events-none" />}
                    </button>
                  );
                })}
            </div>
        </header>

        {/* --- Main Content --- */}
        <main className="max-w-5xl mx-auto px-4 pt-20 md:pt-36 pb-8 relative z-10">
            {merchantOffer && !isMerchantOpen && (
                <div className="fixed right-4 bottom-24 z-50 animate-bounce">
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsMerchantOpen(true);
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsMerchantOpen(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-full shadow-lg border-2 border-white/20 touch-manipulation"
                    >
                        <MessageCircle size={24} /><div className="absolute -top-2 -right-2 bg-red-500 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">!</div>
                    </button>
                </div>
            )}

            {activeTab === 'field' && (
                <>
                    {/* Desktop: Show Market Analyst and Quest Board side by side */}
                    <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                    
                    {/* Mobile: Quick access buttons for Market Analyst and Quest Board */}
                    <div className="lg:hidden flex gap-2 mb-3">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowMarketAnalyst(!showMarketAnalyst);
                                setShowQuestBoard(false);
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowMarketAnalyst(!showMarketAnalyst);
                                setShowQuestBoard(false);
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all touch-manipulation ${
                                showMarketAnalyst 
                                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                                    : 'bg-slate-800/50 border-white/10 text-slate-300'
                            }`}
                        >
                            <TrendingUp size={16} className="inline mr-2" />
                            <span className="text-xs font-bold">Forecast</span>
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowQuestBoard(!showQuestBoard);
                                setShowMarketAnalyst(false);
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowQuestBoard(!showQuestBoard);
                                setShowMarketAnalyst(false);
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all touch-manipulation ${
                                showQuestBoard 
                                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                                    : 'bg-slate-800/50 border-white/10 text-slate-300'
                            }`}
                        >
                            <Target size={16} className="inline mr-2" />
                            <span className="text-xs font-bold">Orders</span>
                        </button>
                    </div>
                    
                    {/* Mobile: Show Market Analyst or Quest Board when toggled */}
                    {showMarketAnalyst && (
                        <div className="lg:hidden mb-3">
                            <MarketAnalyst trend={marketTrend} loading={loadingTrend} onRefresh={async () => {
                                if (loadingTrend || trendCooldown > 0) return;
                                setLoadingTrend(true);
                                const t = await fetchMarketTrend(gameState.coins);
                                if (t) { setMarketTrend(t); setTrendCooldown(60); }
                                setLoadingTrend(false);
                            }} cooldown={trendCooldown} />
                        </div>
                    )}
                    {showQuestBoard && (
                        <div className="lg:hidden mb-3">
                            <QuestBoard quest={gameState.activeQuest} loading={loadingQuest} onRequestQuest={async () => {
                                if (loadingQuest || gameState.activeQuest) return;
                                setLoadingQuest(true);
                                const q = await fetchQuest(gameState.level);
                                if (q) setGameState(p => ({ ...p, activeQuest: q }));
                                setLoadingQuest(false);
                            }} />
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-2 sm:mb-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold text-slate-200 flex items-center gap-2">
                                Farm Field
                                {isEditMode && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded border border-yellow-500/30">Edit Mode</span>}
                            </h2>
                            <p className="text-xs text-slate-400 mt-1 hidden sm:block">
                                {gameState.plots.length} plots • {gameState.decorations.length} decorations
                            </p>
                        </div>
                        <Button 
                            size="sm" 
                            variant={isEditMode ? "primary" : "secondary"} 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsEditMode(!isEditMode);
                                setEditDragItem(null);
                            }}
                            onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsEditMode(!isEditMode);
                                setEditDragItem(null);
                            }}
                            className={`touch-manipulation ${isEditMode ? "bg-yellow-600 hover:bg-yellow-500 border-yellow-400" : ""}`}
                        >
                             {isEditMode ? <><X size={16} className="mr-2"/> Done</> : <><MousePointer2 size={16} className="mr-2"/> Edit</>}
                        </Button>
                    </div>

                    {/* Quick Plant Toolbar */}
                    {!isEditMode && selectedSeed && (
                        <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-wrap">
                                <span className="text-emerald-400 font-bold">Selected:</span>
                                <span className="text-xl sm:text-2xl">{CROPS[selectedSeed].emoji}</span>
                                <span className="text-slate-200">{CROPS[selectedSeed].name}</span>
                                <span className="text-slate-400 text-[10px] sm:text-xs ml-auto hidden sm:inline">
                                    Click empty plots to plant • Drag to plant multiple
                                </span>
                                <span className="text-slate-400 text-[10px] sm:hidden ml-auto">
                                    Tap to plant
                                </span>
                            </div>
                        </div>
                    )}

                    <div className={`bg-gradient-to-br from-[#1a2233] to-[#0f172a] border border-white/10 rounded-3xl p-2 sm:p-6 shadow-2xl backdrop-blur-sm overflow-x-auto transition-all ${isEditMode ? 'ring-2 ring-yellow-500/30' : ''}`}>
                        {isEditMode && (
                            <div className="text-center text-xs text-yellow-200/70 mb-4 pb-3 border-b border-yellow-500/20">
                                <p className="animate-pulse">💡 Drag plots to rearrange • Decorations can overlap plots</p>
                            </div>
                        )}
                        <div className="min-w-[300px] grid grid-cols-6 gap-1.5 sm:gap-3 mx-auto select-none max-w-[700px] touch-none">
                            {renderGrid}
                        </div>
                    </div>

                    {/* Enhanced Toolbar */}
                    {!isEditMode && (
                      <div className="fixed bottom-4 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
                          <div className="bg-[#0f172a]/98 backdrop-blur-xl border-2 border-white/20 p-3 rounded-2xl shadow-2xl flex flex-col gap-2 pointer-events-auto max-w-4xl w-full">
                              {/* Cancel Tools */}
                              {(selectedBuildingToPlace || placingSprinkler || selectedDecorationToPlace) && (
                                  <div className="flex items-center gap-2">
                                      <button 
                                          onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setSelectedBuildingToPlace(null);
                                              setPlacingSprinkler(false);
                                              setSelectedDecorationToPlace(null);
                                          }}
                                          onTouchEnd={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setSelectedBuildingToPlace(null);
                                              setPlacingSprinkler(false);
                                              setSelectedDecorationToPlace(null);
                                          }}
                                          className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500 text-red-300 rounded-xl hover:bg-red-600/30 transition-colors touch-manipulation"
                                      >
                                          <X size={16}/> Cancel
                                      </button>
                                      <div className="flex items-center px-4 text-emerald-400 text-xs font-bold animate-pulse">
                                          Click on the field to place
                                      </div>
                                  </div>
                              )}

                              {/* Seeds Selection */}
                              {!selectedBuildingToPlace && !placingSprinkler && !selectedDecorationToPlace && (
                                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                      <div className="text-xs text-slate-400 font-bold px-2 whitespace-nowrap">Seeds:</div>
                                      {Object.values(CROPS).map(crop => {
                                          const count = gameState.inventory[crop.id] || 0;
                                          const isLocked = gameState.level < crop.unlockLevel && count === 0;
                                          if (isLocked) return null;
                                          return (
                                              <button
                                                  key={crop.id}
                                                  onClick={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setSelectedSeed(crop.id);
                                                  }}
                                                  onTouchEnd={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setSelectedSeed(crop.id);
                                                  }}
                                                  className={`relative flex flex-col items-center p-2.5 rounded-xl min-w-[75px] border-2 transition-all active:scale-95 touch-manipulation ${
                                                      selectedSeed === crop.id 
                                                          ? 'bg-emerald-600/30 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105' 
                                                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                                  } ${count === 0 ? 'opacity-50' : ''}`}
                                                  title={`${crop.name} - ${count} available`}
                                              >
                                                  <span className="text-3xl mb-1 filter drop-shadow-lg">{crop.emoji}</span>
                                                  <span className="text-[10px] font-bold uppercase text-slate-300">{crop.name}</span>
                                                  {count > 0 && (
                                                      <div className="absolute -top-1 -right-1 bg-emerald-500 border-2 border-[#0f172a] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                                                          {count}
                                                      </div>
                                                  )}
                                                  {count === 0 && (
                                                      <div className="absolute inset-0 flex items-center justify-center">
                                                          <div className="bg-black/50 rounded-full p-1">
                                                              <X size={12} className="text-red-400"/>
                                                          </div>
                                                      </div>
                                                  )}
                                              </button>
                                          );
                                      })}
                                  </div>
                              )}
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
                    inventory={gameState.inventory}
                    onBuySeed={(id, amt) => {
                         const cost = CROPS[id].buyPrice * amt;
                         if (gameState.coins >= cost) {
                             setGameState(p => ({ ...p, coins: p.coins - cost, inventory: { ...p.inventory, [id]: (p.inventory[id]||0) + amt } }));
                             // Force immediate save after purchase
                             setTimeout(() => forceSave(), 100);
                         }
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
                                 const newPlot = { id: Date.now(), x: newX, y: newY, status: 'empty' as const, cropId: null, buildingId: null, plantedAt: null, isWatered: false, hasSprinkler: false };
                                 setGameState(p => ({ 
                                     ...p, 
                                     coins: p.coins - cost, 
                                     plots: [...p.plots, newPlot],
                                     statistics: {
                                         ...p.statistics,
                                         plotsOwned: Math.max(p.statistics.plotsOwned || 0, p.plots.length + 1)
                                     }
                                 }));
                                 
                                 // Force immediate save after important purchase
                                 setTimeout(() => forceSave(), 100);
                                 
                                 // Show notification
                                 showNotification({
                                     type: 'success',
                                     title: 'Plot Purchased!',
                                     message: `New plot added for ${cost} coins`,
                                     duration: 2000
                                 });
                             } else {
                                 // Show warning if no space found
                                 showNotification({
                                     type: 'warning',
                                     title: 'No Space',
                                     message: 'Could not find an empty spot for the new plot',
                                     duration: 2000
                                 });
                             }
                         } else {
                             // Show warning if can't afford or max plots
                             if (gameState.plots.length >= MAX_PLOTS) {
                                 showNotification({
                                     type: 'warning',
                                     title: 'Max Plots Reached',
                                     message: `You've reached the maximum of ${MAX_PLOTS} plots`,
                                     duration: 2000
                                 });
                             } else if (gameState.coins < cost) {
                                 showNotification({
                                     type: 'warning',
                                     title: 'Not Enough Coins',
                                     message: `You need ${cost} coins but only have ${gameState.coins}`,
                                     duration: 2000
                                 });
                             }
                         }
                    }}
                />
            )}

            {activeTab === 'market' && (
                 <div className="space-y-4 relative z-10">
                     <div className="mb-4">
                         <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2 mb-2">
                             <TrendingUp size={24} /> Market
                         </h2>
                         <p className="text-sm text-slate-400">Sell your harvested crops and products</p>
                     </div>
                     
                     {(() => {
                         const itemsToSell = [...Object.values(CROPS), ...Object.values(PRODUCTS)].filter(item => {
                             const count = (gameState.harvested[item.id] || 0);
                             return count > 0;
                         });

                         if (itemsToSell.length === 0) {
                             return (
                                 <div className="bg-slate-800/50 rounded-xl p-8 border border-white/5 text-center">
                                     <TrendingUp size={48} className="mx-auto mb-4 text-slate-500 opacity-50" />
                                     <h3 className="text-lg font-bold text-slate-300 mb-2">No Items to Sell</h3>
                                     <p className="text-sm text-slate-400 mb-4">
                                         Harvest some crops first, then come back to sell them!
                                     </p>
                                     <Button 
                                         onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             setActiveTab('field');
                                         }}
                                         onTouchEnd={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             setActiveTab('field');
                                         }}
                                         variant="primary"
                                         className="touch-manipulation"
                                     >
                                         Go to Farm
                                     </Button>
                                 </div>
                             );
                         }

                         return (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {itemsToSell.map(item => {
                                     const count = (gameState.harvested[item.id] || 0);
                                     const isTrending = marketTrend?.cropId === item.id;
                                     const price = isTrending && marketTrend ? Math.floor(item.baseSellPrice * marketTrend.multiplier) : item.baseSellPrice;
                                     
                                     const handleSellOne = (e: React.MouseEvent | React.TouchEvent) => {
                                         e.preventDefault();
                                         e.stopPropagation();
                                         handleSell(item.id, 1, price);
                                     };
                                     
                                     const handleSellAll = (e: React.MouseEvent | React.TouchEvent) => {
                                         e.preventDefault();
                                         e.stopPropagation();
                                         handleSell(item.id, count, price);
                                     };
                                     
                                     return (
                                        <div key={item.id} className="bg-slate-800/50 rounded-xl p-4 border border-white/5 hover:bg-slate-800/80 transition-colors">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-3xl filter drop-shadow-md flex-shrink-0">{item.emoji}</div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-200">{item.name}</div>
                                                        <div className="text-xs text-slate-400">In Stock: {count}</div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:items-end gap-2">
                                                     <div className={`font-mono font-bold text-sm sm:text-base ${isTrending ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`}>
                                                         {price} <Coins size={12} className="inline"/>
                                                         {isTrending && <span className="ml-1 text-[10px] bg-emerald-500/20 px-1 rounded">HOT</span>}
                                                     </div>
                                                     <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                                        <Button 
                                                            size="sm" 
                                                            onClick={handleSellOne}
                                                            onTouchEnd={handleSellOne}
                                                            className="w-full sm:w-auto touch-manipulation"
                                                        >
                                                            Sell 1
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="secondary" 
                                                            onClick={handleSellAll}
                                                            onTouchEnd={handleSellAll}
                                                            className="w-full sm:w-auto touch-manipulation"
                                                        >
                                                            Sell All ({count})
                                                        </Button>
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                     );
                                 })}
                             </div>
                         );
                     })()}
                 </div>
            )}

            {activeTab === 'missions' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                            <Target size={24} /> Missions
                        </h2>
                        <div className="text-sm text-slate-400">
                            Completed: {gameState.missions.filter(m => m.completed).length} / {gameState.missions.filter(m => m.unlocked).length}
                        </div>
                    </div>

                    {gameState.dailyChallenge && (
                        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar size={20} className="text-purple-400" />
                                <h3 className="font-bold text-purple-300">Daily Challenge</h3>
                            </div>
                            <p className="text-sm text-slate-300 mb-2">{gameState.dailyChallenge.description}</p>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="h-full bg-purple-500 transition-all"
                                        style={{ width: `${Math.min(100, (gameState.dailyChallenge.current / gameState.dailyChallenge.target) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-400">
                                    {gameState.dailyChallenge.current} / {gameState.dailyChallenge.target}
                                </span>
                            </div>
                            {gameState.dailyChallenge?.completed && (
                                <div className="text-xs text-emerald-400 font-bold">✓ Completed! +{Math.round((gameState.dailyChallenge.rewardMultiplier - 1) * 100)}% bonus active</div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gameState.missions
                            .filter(m => m.unlocked)
                            .map(mission => (
                                <div 
                                    key={mission.id}
                                    className={`bg-slate-800/50 rounded-xl p-4 border transition-all ${
                                        mission.completed 
                                            ? 'border-emerald-500/50 bg-emerald-900/10' 
                                            : 'border-white/5 hover:border-white/10'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-200">{mission.title}</h3>
                                            <p className="text-xs text-slate-400 mt-1">{mission.description}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-bold ${
                                            mission.tier === 1 ? 'bg-blue-500/20 text-blue-300' :
                                            mission.tier === 2 ? 'bg-green-500/20 text-green-300' :
                                            mission.tier === 3 ? 'bg-yellow-500/20 text-yellow-300' :
                                            mission.tier === 4 ? 'bg-orange-500/20 text-orange-300' :
                                            'bg-red-500/20 text-red-300'
                                        }`}>
                                            Tier {mission.tier}
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all ${
                                                        mission.completed ? 'bg-emerald-500' : 'bg-slate-600'
                                                    }`}
                                                    style={{ width: `${Math.min(100, (mission.current / mission.target) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-400">
                                                {mission.current} / {mission.target}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-xs">
                                            <span className="text-amber-400 flex items-center gap-1">
                                                <Coins size={12} /> {mission.rewardCoins}
                                            </span>
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <Star size={12} /> {mission.rewardXp} XP
                                            </span>
                                        </div>
                                        {mission.completed && (
                                            <span className="text-emerald-400 text-xs font-bold">✓ Completed</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {activeTab === 'achievements' && (
                <div className="space-y-6">
                    {/* Prestige Panel */}
                    {gameState.level >= (PRESTIGE_REQUIRED_LEVEL + (gameState.prestigeLevel * PRESTIGE_LEVEL_INCREMENT)) && (
                        <PrestigePanel
                            level={gameState.level}
                            prestigeLevel={gameState.prestigeLevel}
                            prestigePoints={gameState.prestigePoints}
                            canPrestige={gameState.level >= (PRESTIGE_REQUIRED_LEVEL + (gameState.prestigeLevel * PRESTIGE_LEVEL_INCREMENT))}
                            onPrestige={() => {
                                const requiredLevel = PRESTIGE_REQUIRED_LEVEL + (gameState.prestigeLevel * PRESTIGE_LEVEL_INCREMENT);
                                if (gameState.level >= requiredLevel) {
                                    const prestigePointsEarned = gameState.level * PRESTIGE_POINTS_PER_LEVEL;
                                    setGameState(prev => ({
                                        ...createDefaultGameState(),
                                        prestigeLevel: prev.prestigeLevel + 1,
                                        prestigePoints: prev.prestigePoints + prestigePointsEarned,
                                        researchTree: prev.researchTree, // Keep research
                                        cropMastery: prev.cropMastery, // Keep mastery
                                        statistics: {
                                            ...prev.statistics,
                                            totalPrestiges: (prev.statistics.totalPrestiges || 0) + 1
                                        }
                                    }));
                                    addParticle({
                                        type: 'prestige',
                                        x: window.innerWidth / 2,
                                        y: window.innerHeight / 2,
                                    });
                                    showNotification({
                                        type: 'level',
                                        title: 'Prestige!',
                                        message: `Gained ${prestigePointsEarned} prestige points!`,
                                        duration: 3000
                                    });
                                }
                            }}
                            stats={{
                                totalEarned: gameState.statistics.totalEarned,
                                totalHarvested: Object.values(gameState.statistics.totalHarvested).reduce((a, b) => a + b, 0),
                                playTime: gameState.statistics.playTime,
                                missionsCompleted: gameState.statistics.missionsCompleted
                            }}
                        />
                    )}

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
                            <Trophy size={24} /> Achievements
                        </h2>
                        <div className="text-sm text-slate-400">
                            Unlocked: {gameState.achievements.filter(a => a.unlocked).length} / {gameState.achievements.length}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gameState.achievements.map(achievement => (
                            <div 
                                key={achievement.id}
                                className={`bg-slate-800/50 rounded-xl p-4 border transition-all ${
                                    achievement.unlocked 
                                        ? 'border-amber-500/50 bg-amber-900/10' 
                                        : 'border-white/5 opacity-60'
                                }`}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="text-3xl">{achievement.icon}</div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-200">{achievement.title}</h3>
                                        <p className="text-xs text-slate-400 mt-1">{achievement.description}</p>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="flex-1 bg-slate-900 rounded-full h-2 overflow-hidden">
                                            <div 
                                                className={`h-full transition-all ${
                                                    achievement.unlocked ? 'bg-amber-500' : 'bg-slate-600'
                                                }`}
                                                style={{ width: `${Math.min(100, (achievement.current / achievement.requirement) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {achievement.current} / {achievement.requirement}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-xs">
                                        <span className="text-amber-400 flex items-center gap-1">
                                            <Coins size={12} /> {achievement.rewardCoins}
                                        </span>
                                        <span className="text-emerald-400 flex items-center gap-1">
                                            <Star size={12} /> {achievement.rewardXp} XP
                                        </span>
                                    </div>
                                    {achievement.unlocked && (
                                        <span className="text-amber-400 text-xs font-bold">✓ Unlocked</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
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

        {/* Quest Reward Animation */}
        {questReward && (
          <QuestReward
            coins={questReward.coins}
            xp={questReward.xp}
            onComplete={() => setQuestReward(null)}
          />
        )}

        {/* Admin Panel */}
        {showAdminPanel && currentUser && currentUser.isAdmin && (
          <AdminPanel
            currentUsername={currentUser.username}
            onClose={() => setShowAdminPanel(false)}
          />
        )}

        {/* Notification Container */}
        <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {notifications.slice(0, 5).map(notification => (
            <div key={notification.id} className="pointer-events-auto">
              <NotificationItem
                notification={notification}
                onClose={() => removeNotification(notification.id)}
              />
            </div>
          ))}
        </div>

        {/* Floating Text Container */}
        <div className="fixed inset-0 z-[90] pointer-events-none">
          {floatingTexts.map(text => (
            <FloatingTextItem
              key={text.id}
              text={text}
              onComplete={() => removeFloatingText(text.id)}
            />
          ))}
        </div>

        {/* Mobile Navigation */}
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;

export enum CropId {
  WHEAT = 'wheat',
  CORN = 'corn',
  CARROT = 'carrot',
  TOMATO = 'tomato',
  PUMPKIN = 'pumpkin',
  GEMINI_FRUIT = 'gemini_fruit'
}

export enum ProductId {
  FLOUR = 'flour',
  BREAD = 'bread',
  POPCORN = 'popcorn',
  KETCHUP = 'ketchup',
  PUMPKIN_PIE = 'pumpkin_pie',
  STAR_JAM = 'star_jam'
}

export enum BuildingId {
  WINDMILL = 'windmill',
  BAKERY = 'bakery',
  SNACK_SHACK = 'snack_shack'
}

export enum DecorationId {
  FENCE_WOOD = 'fence_wood',
  PATH_STONE = 'path_stone',
  SCARECROW = 'scarecrow',
  SHRUB = 'shrub',
  FOUNTAIN = 'fountain'
}

export type ItemId = CropId | ProductId;

export interface User {
  username: string;
  createdAt: number;
}

export interface CropData {
  id: CropId;
  name: string;
  emoji: string;
  description: string;
  buyPrice: number;
  baseSellPrice: number;
  growTimeMs: number;
  color: string;
  unlockLevel: number;
  xpReward: number;
  seasonAffinity: Season;
}

export interface ProductData {
  id: ProductId;
  name: string;
  emoji: string;
  baseSellPrice: number;
  description: string;
}

export interface BuildingData {
  id: BuildingId;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  unlockLevel: number;
  recipes: {
    input: CropId;
    inputCount: number;
    output: ProductId;
    processTimeMs: number;
  }[];
}

export interface DecorationData {
  id: DecorationId;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  type: 'obstacle' | 'walkable'; // Walkable items (paths) sit under player/plots logic visually, but for now we just treat them as grid items
}

export type PlotStatus = 'empty' | 'growing' | 'ready' | 'building';

export interface Plot {
  id: number;
  x: number;
  y: number;
  status: PlotStatus;
  cropId: CropId | null;
  buildingId: BuildingId | null;
  plantedAt: number | null; 
  processingRecipeIdx?: number;
  readyToHarvestProduct?: boolean;
  isWatered: boolean;
  hasSprinkler: boolean;
}

export interface Decoration {
  id: string; // Unique instance ID
  x: number; // Grid position (can overlap with plots)
  y: number; // Grid position (can overlap with plots)
  typeId: DecorationId;
  layer: 'ground' | 'overlay'; // ground = under plots, overlay = above plots
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  cropId: CropId;
  targetAmount: number;
  currentAmount: number;
  rewardCoins: number;
  rewardXp: number;
  expiresAt: number;
}

export type Weather = 'sunny' | 'rainy' | 'drought';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface GameState {
  coins: number;
  xp: number;
  level: number;
  inventory: Record<string, number>; 
  harvested: Record<string, number>; 
  plots: Plot[];
  decorations: Decoration[];
  activeQuest: Quest | null;
  weather: Weather;
  season: Season;
  nextSeasonAt: number;
  missions: Mission[];
  achievements: Achievement[];
  statistics: Statistics;
  dailyChallenge: DailyChallenge | null;
  lastDailyChallengeReset: number;
  // New mechanics
  prestigeLevel: number;
  prestigePoints: number;
  cropMastery: Record<CropId, number>; // Mastery level per crop
  researchTree: Record<string, boolean>; // Unlocked research
  automationLevel: number; // 0-5, affects auto-harvesting
  comboBonus: number; // Current combo multiplier
  lastComboTime: number; // Timestamp for combo decay
}

export interface MarketTrend {
  cropId: CropId | null;
  multiplier: number;
  description: string;
  expiresAt: number;
}

export interface MerchantOffer {
  wantedItem: ItemId;
  amount: number;
  baseValue: number;
  merchantName: string;
  personality: string;
}

export interface EditDragItem {
  type: 'plot' | 'decoration';
  id: number | string;
  startX: number;
  startY: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'harvest' | 'sell' | 'level' | 'build' | 'earn' | 'collect';
  target: number;
  current: number;
  rewardCoins: number;
  rewardXp: number;
  itemId?: string; // For harvest/sell/collect missions
  buildingId?: BuildingId; // For build missions
  tier: number; // 1-5 difficulty
  completed: boolean;
  unlocked: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  current: number;
  rewardCoins: number;
  rewardXp: number;
  unlocked: boolean;
  category: 'harvest' | 'money' | 'level' | 'buildings' | 'decorations' | 'special';
}

export interface Statistics {
  totalHarvested: Record<string, number>;
  totalEarned: number;
  totalSpent: number;
  cropsPlanted: number;
  buildingsBuilt: number;
  decorationsPlaced: number;
  questsCompleted: number;
  missionsCompleted: number;
  playTime: number; // in seconds
  levelReached: number;
  highestCoins: number;
  plotsOwned: number;
  totalPrestiges: number;
  maxCombo: number;
  perfectSeasons: number; // Seasons with 100% harvest rate
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'harvest' | 'sell' | 'earn';
  target: number;
  current: number;
  rewardMultiplier: number; // Bonus XP/coins multiplier
  expiresAt: number;
  completed: boolean;
}

export interface ResearchNode {
  id: string;
  name: string;
  description: string;
  cost: number; // Prestige points
  unlocks: string[];
  category: 'efficiency' | 'automation' | 'mastery' | 'prestige';
}

export interface ParticleEffect {
  id: string;
  type: 'coin' | 'xp' | 'harvest' | 'combo' | 'prestige';
  x: number;
  y: number;
  value?: number;
  createdAt: number;
}
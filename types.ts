
// Legacy crop types (keeping for backward compatibility during transition)
export enum CropId {
  WHEAT = 'wheat',
  CORN = 'corn',
  CARROT = 'carrot',
  TOMATO = 'tomato',
  PUMPKIN = 'pumpkin',
  GEMINI_FRUIT = 'gemini_fruit',
  STRAWBERRY = 'strawberry',
  POTATO = 'potato',
  LETTUCE = 'lettuce',
  PEPPER = 'pepper',
  EGGPLANT = 'eggplant',
  WATERMELON = 'watermelon',
  BLUEBERRY = 'blueberry',
  APPLE = 'apple'
}

// Cryptocurrency types
export enum CryptoId {
  BTC = 'btc',
  ETH = 'eth',
  LTC = 'ltc',
  DOGE = 'doge',
  SOL = 'sol',
  ADA = 'ada',
  DOT = 'dot',
  LINK = 'link',
  GEM = 'gem'
}

export enum ProductId {
  FLOUR = 'flour',
  BREAD = 'bread',
  POPCORN = 'popcorn',
  KETCHUP = 'ketchup',
  PUMPKIN_PIE = 'pumpkin_pie',
  STAR_JAM = 'star_jam',
  JAM = 'jam',
  CHIPS = 'chips',
  SALAD = 'salad',
  JUICE = 'juice',
  PICKLES = 'pickles',
  SAUCE = 'sauce',
  SMOOTHIE = 'smoothie',
  CIDER = 'cider'
}

export enum BuildingId {
  WINDMILL = 'windmill',
  BAKERY = 'bakery',
  SNACK_SHACK = 'snack_shack',
  JUICE_BAR = 'juice_bar',
  PRESERVERY = 'preservery',
  FRIED_FOOD_STAND = 'fried_food_stand',
  SALAD_BAR = 'salad_bar',
  CIDER_MILL = 'cider_mill'
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
  isAdmin?: boolean;
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

// Cryptocurrency data structure
export interface CryptoData {
  id: CryptoId;
  symbol: string;
  name: string;
  emoji: string;
  description: string;
  basePrice: number; // Starting/base price in USD
  volatility: number; // 0-1 scale, how much price fluctuates
  trendPeriod: number; // How long trends last (ms)
  marketCapTier: 'large' | 'mid' | 'small' | 'micro'; // Affects price movements
  color: string; // Color theme for UI
  unlockLevel: number;
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
  // Crypto portfolio (new)
  cryptoPortfolio?: CryptoPortfolio;
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

export interface LeaderboardEntry {
  username: string;
  rank: number;
  score: number;
  level: number;
  coins: number;
  prestigeLevel: number;
  category: 'coins' | 'level' | 'prestige' | 'total_harvested';
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

// Crypto market types
export interface PriceHistory {
  timestamp: number;
  price: number;
  volume: number;
}

export interface CryptoMarketState {
  cryptoId: CryptoId;
  currentPrice: number;
  priceHistory: PriceHistory[]; // Last 1000 data points
  trendDirection: number; // -1 to 1, negative = down, positive = up
  trendStrength: number; // 0 to 1
  eventMultiplier: number; // 1.0 = normal, >1.0 = pump, <1.0 = dump
  eventEndsAt: number | null; // When event multiplier expires
}

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit' | 'stop_limit';

export interface Order {
  id: string;
  cryptoId: CryptoId;
  type: OrderType;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number; // For limit/stop orders
  stopPrice?: number; // For stop orders
  executedPrice?: number;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  createdAt: number;
  executedAt?: number;
}

export interface CryptoPosition {
  cryptoId: CryptoId;
  quantity: number;
  averageBuyPrice: number;
  totalInvested: number;
  firstBoughtAt: number;
  lastBoughtAt: number;
}

export interface CryptoPortfolio {
  cashBalance: number; // USD
  positions: Record<CryptoId, CryptoPosition>; // Holdings
  orders: Order[]; // Pending orders
  totalValue: number; // Current portfolio value (cash + crypto)
  totalInvested: number; // Total money invested
  totalProfit: number; // Total profit/loss
}
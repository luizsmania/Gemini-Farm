
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
  x: number;
  y: number;
  typeId: DecorationId;
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

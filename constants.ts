
import { CropData, CropId, ProductData, ProductId, BuildingData, BuildingId, Season, DecorationId, DecorationData } from './types';

export const CROPS: Record<CropId, CropData> = {
  [CropId.WHEAT]: {
    id: CropId.WHEAT,
    name: 'Wheat',
    emoji: '🌾',
    description: 'A staple grain. Grows quickly.',
    buyPrice: 5,
    baseSellPrice: 8,
    growTimeMs: 3000,
    color: 'bg-yellow-200',
    unlockLevel: 1,
    xpReward: 5,
    seasonAffinity: 'spring'
  },
  [CropId.CORN]: {
    id: CropId.CORN,
    name: 'Corn',
    emoji: '🌽',
    description: 'Golden and sweet. Moderate growth.',
    buyPrice: 15,
    baseSellPrice: 28,
    growTimeMs: 8000,
    color: 'bg-yellow-400',
    unlockLevel: 2,
    xpReward: 12,
    seasonAffinity: 'summer'
  },
  [CropId.CARROT]: {
    id: CropId.CARROT,
    name: 'Carrot',
    emoji: '🥕',
    description: 'Crunchy root vegetable.',
    buyPrice: 40,
    baseSellPrice: 85,
    growTimeMs: 15000,
    color: 'bg-orange-400',
    unlockLevel: 4,
    xpReward: 25,
    seasonAffinity: 'spring'
  },
  [CropId.TOMATO]: {
    id: CropId.TOMATO,
    name: 'Tomato',
    emoji: '🍅',
    description: 'Juicy and red. Takes time to ripen.',
    buyPrice: 100,
    baseSellPrice: 220,
    growTimeMs: 30000,
    color: 'bg-red-500',
    unlockLevel: 6,
    xpReward: 60,
    seasonAffinity: 'summer'
  },
  [CropId.PUMPKIN]: {
    id: CropId.PUMPKIN,
    name: 'Pumpkin',
    emoji: '🎃',
    description: 'Huge autumn favorite. Slow to grow.',
    buyPrice: 250,
    baseSellPrice: 600,
    growTimeMs: 60000,
    color: 'bg-orange-600',
    unlockLevel: 9,
    xpReward: 150,
    seasonAffinity: 'autumn'
  },
  [CropId.GEMINI_FRUIT]: {
    id: CropId.GEMINI_FRUIT,
    name: 'Gemini Fruit',
    emoji: '✨',
    description: 'A glowing, mysterious fruit powered by AI.',
    buyPrice: 1000,
    baseSellPrice: 2500,
    growTimeMs: 120000,
    color: 'bg-purple-500',
    unlockLevel: 12,
    xpReward: 500,
    seasonAffinity: 'winter'
  }
};

export const PRODUCTS: Record<ProductId, ProductData> = {
  [ProductId.FLOUR]: { id: ProductId.FLOUR, name: 'Flour', emoji: '🥡', baseSellPrice: 40, description: 'Ground wheat.' },
  [ProductId.BREAD]: { id: ProductId.BREAD, name: 'Bread', emoji: '🍞', baseSellPrice: 150, description: 'Freshly baked.' },
  [ProductId.POPCORN]: { id: ProductId.POPCORN, name: 'Popcorn', emoji: '🍿', baseSellPrice: 80, description: 'Buttery snack.' },
  [ProductId.KETCHUP]: { id: ProductId.KETCHUP, name: 'Ketchup', emoji: '🥫', baseSellPrice: 450, description: 'Tomato sauce.' },
  [ProductId.PUMPKIN_PIE]: { id: ProductId.PUMPKIN_PIE, name: 'Pumpkin Pie', emoji: '🥧', baseSellPrice: 1500, description: 'Holiday treat.' },
  [ProductId.STAR_JAM]: { id: ProductId.STAR_JAM, name: 'Star Jam', emoji: '🍯', baseSellPrice: 6000, description: 'Cosmic delight.' }
};

export const BUILDINGS: Record<BuildingId, BuildingData> = {
  [BuildingId.WINDMILL]: {
    id: BuildingId.WINDMILL,
    name: 'Windmill',
    emoji: '🌬️',
    description: 'Process Wheat into Flour.',
    cost: 500,
    unlockLevel: 3,
    recipes: [
      { input: CropId.WHEAT, inputCount: 3, output: ProductId.FLOUR, processTimeMs: 10000 }
    ]
  },
  [BuildingId.BAKERY]: {
    id: BuildingId.BAKERY,
    name: 'Bakery',
    emoji: '🏠',
    description: 'Bake Bread and Pies.',
    cost: 2000,
    unlockLevel: 7,
    recipes: [
      { input: CropId.WHEAT, inputCount: 5, output: ProductId.BREAD, processTimeMs: 20000 },
      { input: CropId.PUMPKIN, inputCount: 2, output: ProductId.PUMPKIN_PIE, processTimeMs: 45000 }
    ]
  },
  [BuildingId.SNACK_SHACK]: {
    id: BuildingId.SNACK_SHACK,
    name: 'Snack Shack',
    emoji: '🏪',
    description: 'Make quick snacks.',
    cost: 1200,
    unlockLevel: 5,
    recipes: [
      { input: CropId.CORN, inputCount: 2, output: ProductId.POPCORN, processTimeMs: 15000 },
      { input: CropId.TOMATO, inputCount: 3, output: ProductId.KETCHUP, processTimeMs: 25000 }
    ]
  }
};

export const DECORATIONS: Record<DecorationId, DecorationData> = {
  [DecorationId.FENCE_WOOD]: { id: DecorationId.FENCE_WOOD, name: 'Wood Fence', emoji: '🪜', description: 'Rustic boundary.', cost: 50, type: 'obstacle' },
  [DecorationId.PATH_STONE]: { id: DecorationId.PATH_STONE, name: 'Stone Path', emoji: '🪨', description: 'Walkway.', cost: 25, type: 'walkable' },
  [DecorationId.SCARECROW]: { id: DecorationId.SCARECROW, name: 'Scarecrow', emoji: '🎎', description: 'Keeps birds away.', cost: 200, type: 'obstacle' },
  [DecorationId.SHRUB]: { id: DecorationId.SHRUB, name: 'Shrub', emoji: '🌳', description: 'Nice greenery.', cost: 100, type: 'obstacle' },
  [DecorationId.FOUNTAIN]: { id: DecorationId.FOUNTAIN, name: 'Fountain', emoji: '⛲', description: 'Fancy water feature.', cost: 1000, type: 'obstacle' },
};

export const GRID_SIZE = 6;
export const MAX_PLOTS = 36; // 6x6 grid
export const INITIAL_PLOTS = 6;
export const PLOT_COST_BASE = 100;
export const PLOT_COST_MULTIPLIER = 1.5;
export const SPRINKLER_COST = 500;

export const INITIAL_COINS = 50;

export const INITIAL_INVENTORY: Record<string, number> = {
  [CropId.WHEAT]: 5,
  [CropId.CORN]: 0,
  [CropId.CARROT]: 0,
  [CropId.TOMATO]: 0,
  [CropId.PUMPKIN]: 0,
  [CropId.GEMINI_FRUIT]: 0,
};

export const INITIAL_HARVESTED: Record<string, number> = {
  [CropId.WHEAT]: 0,
  [CropId.CORN]: 0,
  [CropId.CARROT]: 0,
  [CropId.TOMATO]: 0,
  [CropId.PUMPKIN]: 0,
  [CropId.GEMINI_FRUIT]: 0,
  [ProductId.FLOUR]: 0,
  [ProductId.BREAD]: 0,
  [ProductId.POPCORN]: 0,
  [ProductId.KETCHUP]: 0,
  [ProductId.PUMPKIN_PIE]: 0,
  [ProductId.STAR_JAM]: 0,
};

export const XP_TO_LEVEL_UP = (level: number) => Math.floor(100 * Math.pow(1.5, level - 1));

export const SEASON_DURATION_MS = 1000 * 60 * 5;

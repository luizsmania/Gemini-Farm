
import { CropData, CropId, ProductData, ProductId, BuildingData, BuildingId, Season, DecorationId, DecorationData, Mission, Achievement } from './types';

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
    xpReward: 3, // Reduced from 5
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
    xpReward: 8, // Reduced from 12
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
    xpReward: 15, // Reduced from 25
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
    xpReward: 35, // Reduced from 60
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
    xpReward: 80, // Reduced from 150
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
    xpReward: 200, // Reduced from 500
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
export const PLOT_COST_BASE = 150; // Increased from 100
export const PLOT_COST_MULTIPLIER = 1.8; // Increased from 1.5
export const SPRINKLER_COST = 750; // Increased from 500

// New mechanics constants
export const COMBO_DECAY_TIME = 5000; // ms before combo resets
export const COMBO_MULTIPLIER_MAX = 5; // Max combo multiplier
export const COMBO_THRESHOLD = 3; // Actions needed to start combo

export const PRESTIGE_REQUIRED_LEVEL = 50; // Base level required
export const PRESTIGE_LEVEL_INCREMENT = 10; // Extra levels per prestige
export const PRESTIGE_POINTS_PER_LEVEL = 1; // Points earned per level at prestige

export const MASTERY_XP_REQUIREMENT = 100; // XP needed per mastery level
export const MASTERY_BONUS_PER_LEVEL = 0.05; // 5% bonus per mastery level

export const AUTOMATION_UNLOCK_LEVEL = 25; // Level to unlock automation
export const AUTOMATION_COST_BASE = 10000; // Base cost for automation upgrade

export const INITIAL_COINS = 30; // Reduced from 50

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

export const XP_TO_LEVEL_UP = (level: number) => Math.floor(150 * Math.pow(1.8, level - 1)); // Much harder progression

export const SEASON_DURATION_MS = 1000 * 60 * 5;

// Research tree definitions
export const RESEARCH_TREE: Array<{
  id: string;
  name: string;
  description: string;
  cost: number;
  unlocks: string[];
  category: 'efficiency' | 'automation' | 'mastery' | 'prestige';
}> = [
  {
    id: 'fast_growth',
    name: 'Fast Growth',
    description: '+10% crop growth speed',
    cost: 5,
    unlocks: [],
    category: 'efficiency'
  },
  {
    id: 'better_yield',
    name: 'Better Yield',
    description: '+15% crop yield',
    cost: 8,
    unlocks: [],
    category: 'efficiency'
  },
  {
    id: 'auto_harvest_1',
    name: 'Auto-Harvest I',
    description: 'Automatically harvest ready crops',
    cost: 15,
    unlocks: [],
    category: 'automation'
  },
  {
    id: 'auto_plant',
    name: 'Auto-Plant',
    description: 'Auto-plant last used seed in empty plots',
    cost: 20,
    unlocks: ['auto_harvest_1'],
    category: 'automation'
  },
  {
    id: 'mastery_boost',
    name: 'Mastery Boost',
    description: '+25% mastery XP gain',
    cost: 10,
    unlocks: [],
    category: 'mastery'
  },
  {
    id: 'prestige_multiplier',
    name: 'Prestige Power',
    description: '+5% per prestige level (stacking)',
    cost: 25,
    unlocks: [],
    category: 'prestige'
  }
];

// Mission and Achievement Definitions

export const INITIAL_MISSIONS: Mission[] = [
  // Tier 1 - Beginner
  {
    id: 'harvest_10_wheat',
    title: 'First Harvest',
    description: 'Harvest 10 Wheat',
    type: 'harvest',
    target: 10,
    current: 0,
    rewardCoins: 50,
    rewardXp: 25,
    itemId: CropId.WHEAT,
    tier: 1,
    completed: false,
    unlocked: true
  },
  {
    id: 'earn_100',
    title: 'First Earnings',
    description: 'Earn 100 coins total',
    type: 'earn',
    target: 100,
    current: 0,
    rewardCoins: 30,
    rewardXp: 20,
    tier: 1,
    completed: false,
    unlocked: true
  },
  {
    id: 'level_3',
    title: 'Growing Strong',
    description: 'Reach level 3',
    type: 'level',
    target: 3,
    current: 1,
    rewardCoins: 100,
    rewardXp: 50,
    tier: 1,
    completed: false,
    unlocked: true
  },
  // Tier 2 - Intermediate
  {
    id: 'harvest_50_crops',
    title: 'Busy Farmer',
    description: 'Harvest 50 crops total',
    type: 'harvest',
    target: 50,
    current: 0,
    rewardCoins: 200,
    rewardXp: 100,
    tier: 2,
    completed: false,
    unlocked: false
  },
  {
    id: 'build_windmill',
    title: 'Industrial Revolution',
    description: 'Build your first Windmill',
    type: 'build',
    target: 1,
    current: 0,
    rewardCoins: 150,
    rewardXp: 75,
    buildingId: BuildingId.WINDMILL,
    tier: 2,
    completed: false,
    unlocked: false
  },
  {
    id: 'earn_1000',
    title: 'Making Money',
    description: 'Earn 1000 coins total',
    type: 'earn',
    target: 1000,
    current: 0,
    rewardCoins: 300,
    rewardXp: 150,
    tier: 2,
    completed: false,
    unlocked: false
  },
  // Tier 3 - Advanced
  {
    id: 'level_10',
    title: 'Expert Farmer',
    description: 'Reach level 10',
    type: 'level',
    target: 10,
    current: 1,
    rewardCoins: 500,
    rewardXp: 250,
    tier: 3,
    completed: false,
    unlocked: false
  },
  {
    id: 'harvest_200_crops',
    title: 'Harvest Master',
    description: 'Harvest 200 crops total',
    type: 'harvest',
    target: 200,
    current: 0,
    rewardCoins: 400,
    rewardXp: 200,
    tier: 3,
    completed: false,
    unlocked: false
  },
  {
    id: 'build_all',
    title: 'Master Builder',
    description: 'Build all 3 building types',
    type: 'build',
    target: 3,
    current: 0,
    rewardCoins: 1000,
    rewardXp: 500,
    tier: 3,
    completed: false,
    unlocked: false
  },
  // Tier 4 - Expert
  {
    id: 'level_20',
    title: 'Legendary Farmer',
    description: 'Reach level 20',
    type: 'level',
    target: 20,
    current: 1,
    rewardCoins: 2000,
    rewardXp: 1000,
    tier: 4,
    completed: false,
    unlocked: false
  },
  {
    id: 'earn_10000',
    title: 'Wealthy Landowner',
    description: 'Earn 10,000 coins total',
    type: 'earn',
    target: 10000,
    current: 0,
    rewardCoins: 1500,
    rewardXp: 750,
    tier: 4,
    completed: false,
    unlocked: false
  },
  {
    id: 'harvest_1000',
    title: 'Harvest Legend',
    description: 'Harvest 1000 crops total',
    type: 'harvest',
    target: 1000,
    current: 0,
    rewardCoins: 2000,
    rewardXp: 1000,
    tier: 4,
    completed: false,
    unlocked: false
  },
  // Tier 5 - Master
  {
    id: 'level_30',
    title: 'Farming Deity',
    description: 'Reach level 30',
    type: 'level',
    target: 30,
    current: 1,
    rewardCoins: 5000,
    rewardXp: 2500,
    tier: 5,
    completed: false,
    unlocked: false
  },
  {
    id: 'earn_50000',
    title: 'Millionaire',
    description: 'Earn 50,000 coins total',
    type: 'earn',
    target: 50000,
    current: 0,
    rewardCoins: 5000,
    rewardXp: 2500,
    tier: 5,
    completed: false,
    unlocked: false
  },
  {
    id: 'max_plots',
    title: 'Land Baron',
    description: 'Own all 36 plots',
    type: 'collect',
    target: 36,
    current: 6,
    rewardCoins: 3000,
    rewardXp: 1500,
    tier: 5,
    completed: false,
    unlocked: false
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_harvest',
    title: 'First Steps',
    description: 'Harvest your first crop',
    icon: '🌱',
    requirement: 1,
    current: 0,
    rewardCoins: 20,
    rewardXp: 10,
    unlocked: false,
    category: 'harvest'
  },
  {
    id: 'harvest_100',
    title: 'Century Harvest',
    description: 'Harvest 100 crops',
    icon: '🌾',
    requirement: 100,
    current: 0,
    rewardCoins: 100,
    rewardXp: 50,
    unlocked: false,
    category: 'harvest'
  },
  {
    id: 'harvest_500',
    title: 'Harvest Hero',
    description: 'Harvest 500 crops',
    icon: '⭐',
    requirement: 500,
    current: 0,
    rewardCoins: 500,
    rewardXp: 250,
    unlocked: false,
    category: 'harvest'
  },
  {
    id: 'earn_500',
    title: 'Small Fortune',
    description: 'Earn 500 coins',
    icon: '💰',
    requirement: 500,
    current: 0,
    rewardCoins: 50,
    rewardXp: 25,
    unlocked: false,
    category: 'money'
  },
  {
    id: 'earn_5000',
    title: 'Big Spender',
    description: 'Earn 5,000 coins',
    icon: '💎',
    requirement: 5000,
    current: 0,
    rewardCoins: 300,
    rewardXp: 150,
    unlocked: false,
    category: 'money'
  },
  {
    id: 'level_5',
    title: 'Rising Star',
    description: 'Reach level 5',
    icon: '⭐',
    requirement: 5,
    current: 1,
    rewardCoins: 100,
    rewardXp: 50,
    unlocked: false,
    category: 'level'
  },
  {
    id: 'level_15',
    title: 'Veteran',
    description: 'Reach level 15',
    icon: '🏆',
    requirement: 15,
    current: 1,
    rewardCoins: 500,
    rewardXp: 250,
    unlocked: false,
    category: 'level'
  },
  {
    id: 'level_25',
    title: 'Master',
    description: 'Reach level 25',
    icon: '👑',
    requirement: 25,
    current: 1,
    rewardCoins: 1000,
    rewardXp: 500,
    unlocked: false,
    category: 'level'
  },
  {
    id: 'build_5',
    title: 'Architect',
    description: 'Build 5 buildings',
    icon: '🏗️',
    requirement: 5,
    current: 0,
    rewardCoins: 200,
    rewardXp: 100,
    unlocked: false,
    category: 'buildings'
  },
  {
    id: 'decorate_10',
    title: 'Decorator',
    description: 'Place 10 decorations',
    icon: '🎨',
    requirement: 10,
    current: 0,
    rewardCoins: 150,
    rewardXp: 75,
    unlocked: false,
    category: 'decorations'
  },
  {
    id: 'complete_10_quests',
    title: 'Quest Master',
    description: 'Complete 10 quests',
    icon: '📜',
    requirement: 10,
    current: 0,
    rewardCoins: 300,
    rewardXp: 150,
    unlocked: false,
    category: 'special'
  }
];

import { CryptoData, CryptoId } from './types';

export const CRYPTOS: Record<CryptoId, CryptoData> = {
  [CryptoId.BTC]: {
    id: CryptoId.BTC,
    symbol: 'BTC',
    name: 'Bitcoin',
    emoji: '₿',
    description: 'The original cryptocurrency. Stable, slow gains, high value.',
    basePrice: 45000,
    volatility: 0.3, // Lower volatility
    trendPeriod: 300000, // 5 minutes
    marketCapTier: 'large',
    color: 'bg-orange-500',
    unlockLevel: 1
  },
  [CryptoId.ETH]: {
    id: CryptoId.ETH,
    symbol: 'ETH',
    name: 'Ethereum',
    emoji: 'Ξ',
    description: 'Smart contract platform. Moderate volatility, good gains.',
    basePrice: 2500,
    volatility: 0.4,
    trendPeriod: 240000, // 4 minutes
    marketCapTier: 'large',
    color: 'bg-blue-500',
    unlockLevel: 2
  },
  [CryptoId.LTC]: {
    id: CryptoId.LTC,
    symbol: 'LTC',
    name: 'Litecoin',
    emoji: 'Ł',
    description: 'Fast transactions, moderate price. Digital silver.',
    basePrice: 120,
    volatility: 0.35,
    trendPeriod: 180000, // 3 minutes
    marketCapTier: 'mid',
    color: 'bg-gray-400',
    unlockLevel: 2
  },
  [CryptoId.DOGE]: {
    id: CryptoId.DOGE,
    symbol: 'DOGE',
    name: 'Dogecoin',
    emoji: '🐕',
    description: 'Much wow! High volatility, meme potential.',
    basePrice: 0.08,
    volatility: 0.7, // High volatility
    trendPeriod: 60000, // 1 minute
    marketCapTier: 'mid',
    color: 'bg-yellow-400',
    unlockLevel: 3
  },
  [CryptoId.SOL]: {
    id: CryptoId.SOL,
    symbol: 'SOL',
    name: 'Solana',
    emoji: '◎',
    description: 'Fast growing, tech-focused blockchain.',
    basePrice: 100,
    volatility: 0.5,
    trendPeriod: 150000, // 2.5 minutes
    marketCapTier: 'mid',
    color: 'bg-purple-500',
    unlockLevel: 4
  },
  [CryptoId.ADA]: {
    id: CryptoId.ADA,
    symbol: 'ADA',
    name: 'Cardano',
    emoji: '₳',
    description: 'Steady growth, research-driven platform.',
    basePrice: 0.5,
    volatility: 0.35,
    trendPeriod: 300000, // 5 minutes
    marketCapTier: 'mid',
    color: 'bg-cyan-500',
    unlockLevel: 5
  },
  [CryptoId.DOT]: {
    id: CryptoId.DOT,
    symbol: 'DOT',
    name: 'Polkadot',
    emoji: '●',
    description: 'Interoperability focus, connecting blockchains.',
    basePrice: 7,
    volatility: 0.45,
    trendPeriod: 200000, // 3.3 minutes
    marketCapTier: 'mid',
    color: 'bg-pink-500',
    unlockLevel: 6
  },
  [CryptoId.LINK]: {
    id: CryptoId.LINK,
    symbol: 'LINK',
    name: 'Chainlink',
    emoji: '🔗',
    description: 'Oracle network connecting smart contracts to real data.',
    basePrice: 15,
    volatility: 0.4,
    trendPeriod: 180000, // 3 minutes
    marketCapTier: 'mid',
    color: 'bg-blue-400',
    unlockLevel: 7
  },
  [CryptoId.GEM]: {
    id: CryptoId.GEM,
    symbol: 'GEM',
    name: 'Gemini Token',
    emoji: '💎',
    description: 'Custom token with highest volatility. Extreme risk/reward.',
    basePrice: 1,
    volatility: 0.85, // Very high volatility
    trendPeriod: 30000, // 30 seconds
    marketCapTier: 'micro',
    color: 'bg-emerald-500',
    unlockLevel: 10
  }
};

// Market simulation constants
export const PRICE_UPDATE_INTERVAL = 1000; // 1 second
export const PRICE_HISTORY_MAX_LENGTH = 1000; // Keep last 1000 data points
export const MARKET_EVENT_PROBABILITY = 0.02; // 2% chance per update
export const PUMP_MULTIPLIER_MIN = 1.5;
export const PUMP_MULTIPLIER_MAX = 3.0;
export const DUMP_MULTIPLIER_MIN = 0.3;
export const DUMP_MULTIPLIER_MAX = 0.7;
export const EVENT_DURATION_MIN = 30000; // 30 seconds
export const EVENT_DURATION_MAX = 120000; // 2 minutes

// Trading constants
export const MARKET_ORDER_FEE = 0.005; // 0.5%
export const INITIAL_CASH_BALANCE = 500; // Starting USD ($500 for everyone)
export const MIN_TRADE_AMOUNT = 1; // Minimum USD to trade

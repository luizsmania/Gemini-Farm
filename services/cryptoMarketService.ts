import { 
  CryptoId, 
  CryptoMarketState, 
  PriceHistory 
} from '../types';
import { 
  CRYPTOS, 
  PRICE_UPDATE_INTERVAL,
  PRICE_HISTORY_MAX_LENGTH,
  MARKET_EVENT_PROBABILITY,
  PUMP_MULTIPLIER_MIN,
  PUMP_MULTIPLIER_MAX,
  DUMP_MULTIPLIER_MIN,
  DUMP_MULTIPLIER_MAX,
  EVENT_DURATION_MIN,
  EVENT_DURATION_MAX
} from '../cryptoConstants';
import { getPriceImpact, checkForNews } from './cryptoNewsService';

// Global market state - shared across all instances
let marketState: Record<CryptoId, CryptoMarketState> = {} as Record<CryptoId, CryptoMarketState>;
let priceUpdateInterval: NodeJS.Timeout | null = null;
let listeners: Set<(state: Record<CryptoId, CryptoMarketState>) => void> = new Set();

// Initialize market state for all cryptos
export const initializeMarket = (): Record<CryptoId, CryptoMarketState> => {
  const state: Record<CryptoId, CryptoMarketState> = {} as Record<CryptoId, CryptoMarketState>;
  
  Object.values(CryptoId).forEach(cryptoId => {
    const crypto = CRYPTOS[cryptoId];
    state[cryptoId] = {
      cryptoId,
      currentPrice: crypto.basePrice,
      priceHistory: [{
        timestamp: Date.now(),
        price: crypto.basePrice,
        volume: 0
      }],
      trendDirection: (Math.random() - 0.5) * 2, // -1 to 1
      trendStrength: Math.random() * 0.5 + 0.25, // 0.25 to 0.75
      eventMultiplier: 1.0,
      eventEndsAt: null
    };
  });
  
  marketState = state;
  return state;
};

// Calculate next price using random walk with drift and mean reversion
const calculateNextPrice = (
  currentPrice: number,
  crypto: typeof CRYPTOS[CryptoId],
  market: CryptoMarketState
): number => {
  // Base volatility factor
  const volatilityFactor = crypto.volatility;
  
  // Trend component (drift)
  const trendComponent = market.trendDirection * market.trendStrength * 0.001;
  
  // Random walk component
  const randomComponent = (Math.random() - 0.5) * 2 * volatilityFactor * 0.02;
  
  // Mean reversion (pull back toward base price)
  const meanReversionStrength = 0.0001;
  const priceDeviation = (currentPrice - crypto.basePrice) / crypto.basePrice;
  const meanReversionComponent = -priceDeviation * meanReversionStrength;
  
  // Event multiplier (pumps and dumps)
  let eventMultiplier = market.eventMultiplier;
  
  // Check if event should occur
  if (Math.random() < MARKET_EVENT_PROBABILITY && !market.eventEndsAt) {
    const isPump = Math.random() > 0.5;
    eventMultiplier = isPump
      ? PUMP_MULTIPLIER_MIN + Math.random() * (PUMP_MULTIPLIER_MAX - PUMP_MULTIPLIER_MIN)
      : DUMP_MULTIPLIER_MIN + Math.random() * (DUMP_MULTIPLIER_MAX - DUMP_MULTIPLIER_MIN);
    
    market.eventMultiplier = eventMultiplier;
    market.eventEndsAt = Date.now() + EVENT_DURATION_MIN + 
      Math.random() * (EVENT_DURATION_MAX - EVENT_DURATION_MIN);
  }
  
  // Update trend (gradually change direction and strength)
  if (Math.random() < 0.1) { // 10% chance to change trend
    market.trendDirection += (Math.random() - 0.5) * 0.2;
    market.trendDirection = Math.max(-1, Math.min(1, market.trendDirection));
  }
  
  if (Math.random() < 0.15) { // 15% chance to change strength
    market.trendStrength += (Math.random() - 0.5) * 0.1;
    market.trendStrength = Math.max(0.1, Math.min(0.9, market.trendStrength));
  }
  
  // News impact
  const newsImpact = getPriceImpact(cryptoId) / 100; // Convert percentage to multiplier
  
  // Whale movements (random large orders)
  const whaleImpact = Math.random() < 0.01 ? (Math.random() - 0.5) * 0.05 : 0; // 1% chance of ±2.5% impact
  
  // Calculate price change (combine all factors)
  const priceChangePercent = (trendComponent + randomComponent + meanReversionComponent + newsImpact + whaleImpact) * eventMultiplier;
  let newPrice = currentPrice * (1 + priceChangePercent);
  
  // Ensure price doesn't go negative or too extreme
  newPrice = Math.max(crypto.basePrice * 0.01, Math.min(crypto.basePrice * 100, newPrice));
  
  // Check if event should end
  if (market.eventEndsAt && Date.now() >= market.eventEndsAt) {
    market.eventMultiplier = 1.0;
    market.eventEndsAt = null;
  }
  
  return newPrice;
};

// Update all crypto prices
const updatePrices = () => {
  const now = Date.now();
  
  // Check for news events
  const newsEvents = checkForNews();
  
  Object.values(CryptoId).forEach(cryptoId => {
    const market = marketState[cryptoId];
    const crypto = CRYPTOS[cryptoId];
    
    if (!market) return;
    
    const newPrice = calculateNextPrice(market.currentPrice, crypto, market);
    
    // Update price
    market.currentPrice = newPrice;
    
    // Add to history
    market.priceHistory.push({
      timestamp: now,
      price: newPrice,
      volume: Math.random() * 1000000 // Simulated volume
    });
    
    // Limit history length
    if (market.priceHistory.length > PRICE_HISTORY_MAX_LENGTH) {
      market.priceHistory.shift();
    }
  });
  
  // Notify all listeners
  listeners.forEach(listener => {
    try {
      listener({ ...marketState });
    } catch (error) {
      console.error('Error in market listener:', error);
    }
  });
};

// Start price updates
export const startMarketUpdates = (): void => {
  if (priceUpdateInterval) {
    return; // Already running
  }
  
  // Initialize if not already done
  if (Object.keys(marketState).length === 0) {
    initializeMarket();
  }
  
  priceUpdateInterval = setInterval(updatePrices, PRICE_UPDATE_INTERVAL);
};

// Stop price updates
export const stopMarketUpdates = (): void => {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
  }
};

// Subscribe to price updates
export const subscribeToMarket = (
  callback: (state: Record<CryptoId, CryptoMarketState>) => void
): (() => void) => {
  listeners.add(callback);
  
  // Immediately call with current state
  if (Object.keys(marketState).length > 0) {
    callback({ ...marketState });
  }
  
  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
  };
};

// Get current market state
export const getMarketState = (): Record<CryptoId, CryptoMarketState> => {
  if (Object.keys(marketState).length === 0) {
    return initializeMarket();
  }
  return { ...marketState };
};

// Get current price for a specific crypto
export const getCurrentPrice = (cryptoId: CryptoId): number => {
  return marketState[cryptoId]?.currentPrice || CRYPTOS[cryptoId].basePrice;
};

// Get price history for a specific crypto (for charts)
export const getPriceHistory = (
  cryptoId: CryptoId, 
  timeframe?: '1m' | '5m' | '15m' | '1h' | '24h'
): PriceHistory[] => {
  const market = marketState[cryptoId];
  if (!market) return [];
  
  const now = Date.now();
  const timeframeMs = timeframe === '1m' ? 60000 :
                      timeframe === '5m' ? 300000 :
                      timeframe === '15m' ? 900000 :
                      timeframe === '1h' ? 3600000 :
                      timeframe === '24h' ? 86400000 :
                      Infinity;
  
  return market.priceHistory.filter(
    point => now - point.timestamp <= timeframeMs
  );
};

// Reset market (for testing or new game)
export const resetMarket = (): void => {
  stopMarketUpdates();
  marketState = initializeMarket();
  startMarketUpdates();
};

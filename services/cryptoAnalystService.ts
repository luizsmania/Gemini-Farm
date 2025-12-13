import { CryptoId } from '../types';
import { CRYPTOS } from '../cryptoConstants';
import { getCurrentPrice, getPriceHistory } from './cryptoMarketService';

export interface CryptoPrediction {
  cryptoId: CryptoId;
  prediction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  reason: string;
  expectedChange: number; // Percentage change expected
  timeframe: string; // "short-term", "medium-term", "long-term"
  expiresAt: number;
}

// Cache for predictions
let predictionCache: Record<CryptoId, CryptoPrediction | null> = {} as Record<CryptoId, CryptoPrediction | null>;
let lastAnalysisTime: Record<CryptoId, number> = {} as Record<CryptoId, number>;
const ANALYSIS_COOLDOWN = 60000; // 1 minute cooldown between analyses

// Generate AI-like prediction based on technical analysis
export const analyzeCrypto = async (cryptoId: CryptoId): Promise<CryptoPrediction | null> => {
  const now = Date.now();
  
  // Check cooldown
  if (lastAnalysisTime[cryptoId] && now - lastAnalysisTime[cryptoId] < ANALYSIS_COOLDOWN) {
    return predictionCache[cryptoId] || null;
  }

  const crypto = CRYPTOS[cryptoId];
  const currentPrice = getCurrentPrice(cryptoId);
  const priceHistory = getPriceHistory(cryptoId, '15m');
  
  if (priceHistory.length < 10) {
    // Not enough data
    return null;
  }

  // Simple technical analysis
  const recentPrices = priceHistory.slice(-20).map(p => p.price);
  const oldPrices = priceHistory.slice(0, 10).map(p => p.price);
  
  const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const oldAvg = oldPrices.reduce((a, b) => a + b, 0) / oldPrices.length;
  
  const priceChange = ((recentAvg - oldAvg) / oldAvg) * 100;
  const volatility = calculateVolatility(recentPrices);
  
  // Determine prediction
  let prediction: 'bullish' | 'bearish' | 'neutral';
  let confidence: number;
  let expectedChange: number;
  let reason: string;
  
  if (priceChange > 5 && volatility < 0.1) {
    // Strong uptrend with low volatility
    prediction = 'bullish';
    confidence = 70 + Math.random() * 20; // 70-90%
    expectedChange = 10 + Math.random() * 20; // 10-30%
    reason = generateBullishReason(crypto);
  } else if (priceChange < -5 && volatility < 0.1) {
    // Strong downtrend with low volatility
    prediction = 'bearish';
    confidence = 70 + Math.random() * 20; // 70-90%
    expectedChange = -(10 + Math.random() * 20); // -10 to -30%
    reason = generateBearishReason(crypto);
  } else if (priceChange > 2 && volatility < 0.15) {
    // Moderate uptrend
    prediction = 'bullish';
    confidence = 50 + Math.random() * 20; // 50-70%
    expectedChange = 5 + Math.random() * 10; // 5-15%
    reason = generateModerateBullishReason(crypto);
  } else if (priceChange < -2 && volatility < 0.15) {
    // Moderate downtrend
    prediction = 'bearish';
    confidence = 50 + Math.random() * 20; // 50-70%
    expectedChange = -(5 + Math.random() * 10); // -5 to -15%
    reason = generateModerateBearishReason(crypto);
  } else {
    // Neutral/consolidation
    prediction = 'neutral';
    confidence = 40 + Math.random() * 20; // 40-60%
    expectedChange = (Math.random() - 0.5) * 10; // -5 to +5%
    reason = generateNeutralReason(crypto);
  }

  const cryptoPrediction: CryptoPrediction = {
    cryptoId,
    prediction,
    confidence: Math.round(confidence),
    reason,
    expectedChange: Math.round(expectedChange * 10) / 10,
    timeframe: 'short-term',
    expiresAt: now + 120000 // 2 minutes
  };

  predictionCache[cryptoId] = cryptoPrediction;
  lastAnalysisTime[cryptoId] = now;

  return cryptoPrediction;
};

const calculateVolatility = (prices: number[]): number => {
  if (prices.length < 2) return 0;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  return Math.sqrt(variance) / mean;
};

const generateBullishReason = (crypto: typeof CRYPTOS[CryptoId]): string => {
  const reasons = [
    `Strong upward momentum detected in ${crypto.name}. Technical indicators suggest continued growth potential.`,
    `${crypto.name} showing bullish patterns with increasing volume and positive trend lines.`,
    `Market sentiment for ${crypto.name} is very positive. Resistance levels are being broken.`,
    `${crypto.name} has strong support levels and is forming a bullish ascending triangle pattern.`,
    `Institutional interest in ${crypto.name} appears to be growing, driving price upward.`,
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
};

const generateBearishReason = (crypto: typeof CRYPTOS[CryptoId]): string => {
  const reasons = [
    `${crypto.name} showing bearish signals with declining momentum and increased selling pressure.`,
    `Technical analysis suggests ${crypto.name} may experience a pullback. Support levels are weakening.`,
    `Market indicators for ${crypto.name} are turning negative. Risk of downward movement.`,
    `${crypto.name} is approaching resistance and showing signs of exhaustion in the current trend.`,
    `Increased volatility and negative sentiment surrounding ${crypto.name} suggest caution.`,
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
};

const generateModerateBullishReason = (crypto: typeof CRYPTOS[CryptoId]): string => {
  const reasons = [
    `${crypto.name} showing moderate positive momentum. Could see gradual upward movement.`,
    `Mixed signals for ${crypto.name}, but slight bullish bias detected in recent price action.`,
    `${crypto.name} consolidating with a slight upward tendency.`,
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
};

const generateModerateBearishReason = (crypto: typeof CRYPTOS[CryptoId]): string => {
  const reasons = [
    `${crypto.name} showing slight negative pressure. May experience minor pullback.`,
    `Weak bearish signals detected for ${crypto.name}. Proceed with caution.`,
    `${crypto.name} trading in a bearish zone but with moderate conviction.`,
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
};

const generateNeutralReason = (crypto: typeof CRYPTOS[CryptoId]): string => {
  const reasons = [
    `${crypto.name} is consolidating. Waiting for clearer market direction.`,
    `${crypto.name} showing mixed signals. Market is indecisive at current levels.`,
    `Neutral outlook for ${crypto.name}. Price action suggests sideways movement.`,
    `${crypto.name} is in a consolidation phase. Better to wait for breakout confirmation.`,
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
};

// Get cached prediction
export const getPrediction = (cryptoId: CryptoId): CryptoPrediction | null => {
  const prediction = predictionCache[cryptoId];
  if (prediction && prediction.expiresAt > Date.now()) {
    return prediction;
  }
  return null;
};

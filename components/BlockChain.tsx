import React, { useState, useEffect } from 'react';
import { CryptoId, CryptoPortfolio } from '../types';
import { CRYPTOS, INITIAL_CASH_BALANCE } from '../cryptoConstants';
import { getCurrentPrice } from '../services/cryptoMarketService';
import { Lock, Unlock, Coins, Sparkles } from 'lucide-react';

interface BlockChainProps {
  portfolio: CryptoPortfolio;
  onPortfolioUpdate: (portfolio: CryptoPortfolio) => void;
}

interface BlockTile {
  id: number;
  x: number;
  y: number;
  isRevealed: boolean;
  reward?: {
    cryptoId: CryptoId;
    amount: number; // Amount of crypto found (small fraction)
  };
  revealedAt?: number;
}

const GRID_SIZE = 8; // 8x8 grid = 64 tiles
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const REWARD_PROBABILITY = 0.15; // 15% chance to find crypto when opening a tile
const MIN_REWARD_AMOUNT = 0.0001; // Minimum crypto amount
const MAX_REWARD_AMOUNT = 0.001; // Maximum crypto amount (scaled by crypto price)
const TILES_PER_DAY = 10; // Maximum tiles you can open per day (resets)

// Calculate reward amount based on crypto price (cheaper cryptos = more reward)
const calculateRewardAmount = (cryptoId: CryptoId, currentPrice: number): number => {
  const baseAmount = MIN_REWARD_AMOUNT + Math.random() * (MAX_REWARD_AMOUNT - MIN_REWARD_AMOUNT);
  // Scale inversely with price (BTC at $45k gives less than DOGE at $0.08)
  const priceScale = Math.max(0.1, Math.min(10, 100 / currentPrice));
  return baseAmount * priceScale;
};

// Get random crypto for reward (weighted towards cheaper cryptos for better economy)
const getRandomRewardCrypto = (): CryptoId => {
  const weights: Record<CryptoId, number> = {
    [CryptoId.DOGE]: 0.25, // 25% chance (cheap)
    [CryptoId.ADA]: 0.20,  // 20% chance
    [CryptoId.GEM]: 0.15,  // 15% chance
    [CryptoId.LTC]: 0.15,  // 15% chance
    [CryptoId.DOT]: 0.10,  // 10% chance
    [CryptoId.LINK]: 0.07, // 7% chance
    [CryptoId.SOL]: 0.05,  // 5% chance
    [CryptoId.ETH]: 0.02,  // 2% chance
    [CryptoId.BTC]: 0.01,  // 1% chance (expensive)
  };

  const rand = Math.random();
  let cumulative = 0;
  
  for (const [cryptoId, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand <= cumulative) {
      return cryptoId as CryptoId;
    }
  }
  
  return CryptoId.DOGE; // Fallback
};

export const BlockChain: React.FC<BlockChainProps> = ({
  portfolio,
  onPortfolioUpdate
}) => {
  const [tiles, setTiles] = useState<BlockTile[]>([]);
  const [tilesOpenedToday, setTilesOpenedToday] = useState(0);
  const [lastResetDate, setLastResetDate] = useState<string>('');
  const [showReward, setShowReward] = useState<{ cryptoId: CryptoId; amount: number } | null>(null);

  // Initialize grid
  useEffect(() => {
    const savedTiles = localStorage.getItem('blockchain_tiles');
    const savedDate = localStorage.getItem('blockchain_reset_date');
    const savedCount = localStorage.getItem('blockchain_opened_today');

    const today = new Date().toDateString();
    
    // Reset daily count if it's a new day
    if (savedDate !== today) {
      setTilesOpenedToday(0);
      setLastResetDate(today);
      localStorage.setItem('blockchain_reset_date', today);
      localStorage.setItem('blockchain_opened_today', '0');
    } else {
      setTilesOpenedToday(parseInt(savedCount || '0', 10));
      setLastResetDate(savedDate || today);
    }

    if (savedTiles) {
      try {
        const parsed = JSON.parse(savedTiles);
        setTiles(parsed);
      } catch {
        initializeGrid();
      }
    } else {
      initializeGrid();
    }
  }, []);

  const initializeGrid = () => {
    const newTiles: BlockTile[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        newTiles.push({
          id: y * GRID_SIZE + x,
          x,
          y,
          isRevealed: false
        });
      }
    }
    setTiles(newTiles);
    localStorage.setItem('blockchain_tiles', JSON.stringify(newTiles));
  };

  const handleTileClick = (tile: BlockTile) => {
    if (tile.isRevealed) return;
    if (tilesOpenedToday >= TILES_PER_DAY) {
      alert(`You've reached your daily limit of ${TILES_PER_DAY} tiles! Come back tomorrow.`);
      return;
    }

    const today = new Date().toDateString();
    if (lastResetDate !== today) {
      // Reset if new day
      setTilesOpenedToday(0);
      setLastResetDate(today);
      localStorage.setItem('blockchain_reset_date', today);
    }

    // Check if reward
    const hasReward = Math.random() < REWARD_PROBABILITY;
    let reward: { cryptoId: CryptoId; amount: number } | undefined;

    if (hasReward) {
      const rewardCrypto = getRandomRewardCrypto();
      const currentPrice = getCurrentPrice(rewardCrypto);
      const amount = calculateRewardAmount(rewardCrypto, currentPrice);
      
      reward = {
        cryptoId: rewardCrypto,
        amount
      };

      // Add to portfolio
      const updatedPortfolio = { ...portfolio };
      const position = updatedPortfolio.positions[rewardCrypto];
      const rewardValue = amount * currentPrice;

      if (position) {
        const totalQuantity = position.quantity + amount;
        const totalInvested = position.totalInvested + rewardValue;
        position.quantity = totalQuantity;
        position.averageBuyPrice = totalInvested / totalQuantity;
        position.totalInvested = totalInvested;
        position.lastBoughtAt = Date.now();
      } else {
        updatedPortfolio.positions[rewardCrypto] = {
          cryptoId: rewardCrypto,
          quantity: amount,
          averageBuyPrice: currentPrice,
          totalInvested: rewardValue,
          firstBoughtAt: Date.now(),
          lastBoughtAt: Date.now()
        };
      }

      // Update portfolio value
      let cryptoValue = updatedPortfolio.cashBalance;
      Object.values(updatedPortfolio.positions).forEach(pos => {
        const price = getCurrentPrice(pos.cryptoId);
        cryptoValue += pos.quantity * price;
      });
      updatedPortfolio.totalValue = cryptoValue;
      updatedPortfolio.totalProfit = cryptoValue - INITIAL_CASH_BALANCE;

      onPortfolioUpdate(updatedPortfolio);
      setShowReward(reward);
      setTimeout(() => setShowReward(null), 3000);
    }

    // Update tile
    const updatedTiles = tiles.map(t =>
      t.id === tile.id
        ? {
            ...t,
            isRevealed: true,
            reward,
            revealedAt: Date.now()
          }
        : t
    );

    setTiles(updatedTiles);
    localStorage.setItem('blockchain_tiles', JSON.stringify(updatedTiles));

    // Update daily count
    const newCount = tilesOpenedToday + 1;
    setTilesOpenedToday(newCount);
    localStorage.setItem('blockchain_opened_today', newCount.toString());
  };

  const revealedCount = tiles.filter(t => t.isRevealed).length;
  const rewardCount = tiles.filter(t => t.isRevealed && t.reward).length;
  const remainingTiles = TOTAL_TILES - revealedCount;
  const remainingToday = TILES_PER_DAY - tilesOpenedToday;

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            ⛓️ BlockChain Mining
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Mine the blockchain! Open tiles to discover hidden crypto rewards.
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Tiles Opened Today</div>
          <div className="text-2xl font-bold text-white">
            {tilesOpenedToday} / {TILES_PER_DAY}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {remainingToday} remaining today
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{revealedCount}</div>
          <div className="text-xs text-slate-400">Total Opened</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{rewardCount}</div>
          <div className="text-xs text-slate-400">Crypto Found</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{remainingTiles}</div>
          <div className="text-xs text-slate-400">Remaining</div>
        </div>
      </div>

      {/* Reward Popup */}
      {showReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-2xl p-8 text-center animate-in zoom-in">
            <Sparkles className="w-16 h-16 text-yellow-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-3xl font-bold text-white mb-2">Crypto Found!</h3>
            <div className="text-6xl mb-4">{CRYPTOS[showReward.cryptoId].emoji}</div>
            <div className="text-xl text-white font-semibold mb-1">
              {showReward.amount.toFixed(6)} {CRYPTOS[showReward.cryptoId].symbol}
            </div>
            <div className="text-sm text-emerald-100">
              {CRYPTOS[showReward.cryptoId].name}
            </div>
            <div className="text-xs text-emerald-200 mt-2">
              Added to your portfolio!
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-8 gap-2">
        {tiles.map(tile => {
          const hasReward = tile.isRevealed && tile.reward;
          const crypto = tile.reward ? CRYPTOS[tile.reward.cryptoId] : null;

          return (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              disabled={tile.isRevealed || tilesOpenedToday >= TILES_PER_DAY}
              className={`
                aspect-square rounded-lg border-2 transition-all relative overflow-hidden
                ${tile.isRevealed
                  ? hasReward
                    ? 'bg-emerald-500/20 border-emerald-500 cursor-default'
                    : 'bg-slate-700/50 border-slate-600 cursor-default'
                  : 'bg-slate-800 border-slate-700 hover:border-emerald-500 hover:bg-slate-750 cursor-pointer active:scale-95'
                }
                ${tilesOpenedToday >= TILES_PER_DAY && !tile.isRevealed
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                }
              `}
            >
              {!tile.isRevealed ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-slate-500" />
                </div>
              ) : hasReward ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="text-2xl mb-1">{crypto?.emoji}</div>
                  <div className="text-[8px] text-emerald-300 font-bold text-center px-1">
                    {tile.reward?.amount.toFixed(4)} {crypto?.symbol}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Unlock className="w-5 h-5 text-slate-500" />
                </div>
              )}

              {/* Shimmer effect for unrevealed tiles */}
              {!tile.isRevealed && (
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full pointer-events-none"
                  style={{
                    animation: 'shimmer 3s infinite'
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="text-sm text-slate-300 space-y-2">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span><strong>15% chance</strong> to find crypto when opening a tile</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <span>You can open <strong>{TILES_PER_DAY} tiles per day</strong> (resets daily)</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Rewards are automatically added to your portfolio</span>
          </div>
        </div>
      </div>
    </div>
  );
};

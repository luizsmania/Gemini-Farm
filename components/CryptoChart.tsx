import React, { useEffect, useRef, useState } from 'react';
import { CryptoId, PriceHistory } from '../types';
import { getPriceHistory, subscribeToMarket } from '../services/cryptoMarketService';
import { CRYPTOS } from '../cryptoConstants';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CryptoChartProps {
  cryptoId: CryptoId;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '24h';
  height?: number;
}

export const CryptoChart: React.FC<CryptoChartProps> = ({ 
  cryptoId, 
  timeframe = '15m',
  height = 300 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);

  useEffect(() => {
    // Get initial price history
    const history = getPriceHistory(cryptoId, timeframe);
    setPriceHistory(history);
    
    if (history.length > 0) {
      const latest = history[history.length - 1];
      setCurrentPrice(latest.price);
      
      if (history.length > 1) {
        const oldest = history[0];
        const change = latest.price - oldest.price;
        const changePercent = (change / oldest.price) * 100;
        setPriceChange(change);
        setPriceChangePercent(changePercent);
      }
    }

    // Subscribe to market updates
    const unsubscribe = subscribeToMarket((marketState) => {
      const market = marketState[cryptoId];
      if (market) {
        const history = getPriceHistory(cryptoId, timeframe);
        setPriceHistory(history);
        setCurrentPrice(market.currentPrice);
        
        if (history.length > 1) {
          const oldest = history[0];
          const change = market.currentPrice - oldest.price;
          const changePercent = (change / oldest.price) * 100;
          setPriceChange(change);
          setPriceChangePercent(changePercent);
        }
      }
    });

    return unsubscribe;
  }, [cryptoId, timeframe]);

  useEffect(() => {
    if (!canvasRef.current || priceHistory.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (priceHistory.length < 2) return;

    // Find min and max prices for scaling
    const prices = priceHistory.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Calculate chart dimensions
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw price line
    ctx.strokeStyle = priceChange >= 0 ? '#10b981' : '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();

    priceHistory.forEach((point, index) => {
      const x = padding + (chartWidth / (priceHistory.length - 1)) * index;
      const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw fill area under line
    if (priceHistory.length > 0) {
      const firstX = padding;
      const firstY = padding + chartHeight;
      const lastPoint = priceHistory[priceHistory.length - 1];
      const lastX = padding + chartWidth;
      const lastY = padding + chartHeight - ((lastPoint.price - minPrice) / priceRange) * chartHeight;

      const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
      gradient.addColorStop(0, priceChange >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)' as string);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(firstX, firstY);
      priceHistory.forEach((point, index) => {
        const x = padding + (chartWidth / (priceHistory.length - 1)) * index;
        const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(lastX, firstY);
      ctx.closePath();
      ctx.fill();
    }

    // Draw data points
    ctx.fillStyle = priceChange >= 0 ? '#10b981' : '#ef4444';
    priceHistory.forEach((point, index) => {
      if (index === priceHistory.length - 1) {
        // Highlight latest point
        const x = padding + (chartWidth / (priceHistory.length - 1)) * index;
        const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw price labels on Y-axis
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(price.toFixed(2), padding - 10, y + 4);
    }
  }, [priceHistory, priceChange]);

  const crypto = CRYPTOS[cryptoId];
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{crypto.emoji}</div>
          <div>
            <div className="font-bold text-white text-lg">{crypto.name}</div>
            <div className="text-sm text-slate-400">{crypto.symbol}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-white text-xl">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={height}
          className="w-full h-full"
          style={{ maxWidth: '100%', height: `${height}px` }}
        />
      </div>

      {/* Timeframe selector */}
      <div className="flex gap-2 mt-4">
        {(['1m', '5m', '15m', '1h', '24h'] as const).map((tf) => (
          <button
            key={tf}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              timeframe === tf
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tf.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};

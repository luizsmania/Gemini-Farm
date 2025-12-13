import React, { useState, useEffect } from 'react';
import { CryptoId, OrderType, CryptoPortfolio } from '../types';
import { CRYPTOS, MARKET_ORDER_FEE } from '../cryptoConstants';
import { getCurrentPrice } from '../services/cryptoMarketService';
import { createOrder, processPendingOrders, cancelOrder } from '../services/cryptoTradingService';
import { Button } from './Button';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, X } from 'lucide-react';

interface TradingInterfaceProps {
  cryptoId: CryptoId;
  portfolio: CryptoPortfolio;
  onPortfolioUpdate: (portfolio: CryptoPortfolio) => void;
}

export const TradingInterface: React.FC<TradingInterfaceProps> = ({
  cryptoId,
  portfolio,
  onPortfolioUpdate
}) => {
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [stopPrice, setStopPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(25);

  const crypto = CRYPTOS[cryptoId];
  const position = portfolio.positions[cryptoId];
  const availableQuantity = position?.quantity || 0;

  // Update current price
  useEffect(() => {
    const updatePrice = () => {
      const price = getCurrentPrice(cryptoId);
      setCurrentPrice(price);
      
      // Update price field if it's empty or user is not manually editing
      if (!price || orderType === 'market') {
        // Don't auto-update if user has manually entered a price
        return;
      }
    };
    
    updatePrice();
    const interval = setInterval(updatePrice, 1000);
    return () => clearInterval(interval);
  }, [cryptoId, orderType]);

  // Process pending orders periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const executed = processPendingOrders(portfolio);
      if (executed.length > 0) {
        onPortfolioUpdate({ ...portfolio });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [portfolio, onPortfolioUpdate]);

  const handlePercentageClick = (pct: number) => {
    setPercentage(pct);
    if (side === 'buy') {
      const cashAvailable = portfolio.cashBalance * 0.95; // Leave some buffer
      const qty = (cashAvailable * pct / 100) / currentPrice;
      setQuantity(qty.toFixed(8));
    } else {
      const qty = (availableQuantity * pct / 100);
      setQuantity(qty.toFixed(8));
    }
  };

  const calculateTotalCost = (): number => {
    const qty = parseFloat(quantity) || 0;
    const orderPrice = orderType === 'market' 
      ? currentPrice 
      : parseFloat(price) || currentPrice;
    const baseCost = qty * orderPrice;
    return orderType === 'market' ? baseCost * (1 + MARKET_ORDER_FEE) : baseCost;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    const orderPrice = orderType !== 'market' && price ? parseFloat(price) : undefined;
    const stopPriceValue = (orderType === 'stop_loss' || orderType === 'stop_limit') && stopPrice 
      ? parseFloat(stopPrice) 
      : undefined;

    // Validate prices
    if (orderType === 'limit' && orderPrice !== undefined) {
      if (side === 'buy' && orderPrice > currentPrice) {
        setError('Limit buy price must be at or below current price');
        return;
      }
      if (side === 'sell' && orderPrice < currentPrice) {
        setError('Limit sell price must be at or above current price');
        return;
      }
    }

    if (orderType === 'stop_loss' && stopPriceValue !== undefined) {
      if (side === 'sell' && stopPriceValue >= currentPrice) {
        setError('Stop-loss price must be below current price');
        return;
      }
    }

    if (orderType === 'take_profit' && orderPrice !== undefined) {
      if (side === 'sell' && orderPrice <= currentPrice) {
        setError('Take-profit price must be above current price');
        return;
      }
    }

    const { order, error: orderError } = createOrder(
      portfolio,
      cryptoId,
      orderType,
      side,
      qty,
      orderPrice,
      stopPriceValue
    );

    if (orderError) {
      setError(orderError);
      return;
    }

    if (order) {
      // If it's a market order, it was executed immediately
      if (order.status === 'filled') {
        setSuccess(
          `Order executed! ${side === 'buy' ? 'Bought' : 'Sold'} ${qty.toFixed(8)} ${crypto.symbol} at $${order.executedPrice?.toFixed(2)}`
        );
        // Clear form
        setQuantity('');
        setPrice('');
        setStopPrice('');
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setSuccess(`Order placed! Order ID: ${order.id.substring(0, 8)}...`);
        setTimeout(() => setSuccess(null), 5000);
      }

      // Update portfolio
      onPortfolioUpdate({ ...portfolio });
    }
  };

  const totalCost = calculateTotalCost();
  const canAfford = side === 'buy' ? portfolio.cashBalance >= totalCost : availableQuantity >= parseFloat(quantity || '0');

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-3xl">{crypto.emoji}</div>
        <div>
          <h2 className="text-xl font-bold text-white">{crypto.name}</h2>
          <div className="text-sm text-slate-400">{crypto.symbol}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-sm text-slate-400">Current Price</div>
          <div className="text-2xl font-bold text-white">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={18} />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400">
          {success}
        </div>
      )}

      {/* Buy/Sell Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setSide('buy');
            setError(null);
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
            side === 'buy'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <TrendingUp size={20} />
          Buy
        </button>
        <button
          onClick={() => {
            setSide('sell');
            setError(null);
          }}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
            side === 'sell'
              ? 'bg-red-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <TrendingDown size={20} />
          Sell
        </button>
      </div>

      {/* Order Type Selector */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">Order Type</label>
        <div className="grid grid-cols-2 gap-2">
          {(['market', 'limit', 'stop_loss', 'take_profit'] as OrderType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setOrderType(type);
                setError(null);
              }}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                orderType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {type === 'market' ? 'Market' : 
               type === 'limit' ? 'Limit' :
               type === 'stop_loss' ? 'Stop Loss' : 'Take Profit'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Quantity Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-400">Quantity ({crypto.symbol})</label>
            {side === 'sell' && (
              <span className="text-xs text-slate-500">
                Available: {availableQuantity.toFixed(8)}
              </span>
            )}
          </div>
          <input
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00000000"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            required
          />
          {side === 'buy' && (
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentageClick(pct)}
                  className={`flex-1 py-1 px-2 text-xs rounded ${
                    percentage === pct
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price Input (for limit/stop orders) */}
        {(orderType === 'limit' || orderType === 'take_profit') && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">
                {orderType === 'limit' ? 'Limit Price (USD)' : 'Take Profit Price (USD)'}
              </label>
              <button
                type="button"
                onClick={() => setPrice(currentPrice.toFixed(2))}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Use Current: ${currentPrice.toFixed(2)}
              </button>
            </div>
            <input
              type="number"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={`${currentPrice.toFixed(2)}`}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
          </div>
        )}

        {/* Stop Price Input (for stop-loss) */}
        {orderType === 'stop_loss' && (
          <div>
            <label className="block text-sm text-slate-400 mb-2">Stop Price (USD)</label>
            <input
              type="number"
              step="any"
              value={stopPrice}
              onChange={(e) => setStopPrice(e.target.value)}
              placeholder={`${(currentPrice * 0.95).toFixed(2)}`}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              required
            />
            <div className="text-xs text-slate-500 mt-1">
              Order will execute when price drops to this level
            </div>
          </div>
        )}

        {/* Total Cost Display */}
        {quantity && (
          <div className="p-4 bg-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total {side === 'buy' ? 'Cost' : 'Value'}</span>
              <span className="text-white font-semibold">
                ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {orderType === 'market' && side === 'buy' && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Fee ({MARKET_ORDER_FEE * 100}%)</span>
                <span className="text-slate-400">
                  ${(totalCost * MARKET_ORDER_FEE / (1 + MARKET_ORDER_FEE)).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {side === 'buy' ? 'Remaining Balance' : 'After Sale'}
              </span>
              <span className="text-slate-400">
                ${(side === 'buy' 
                  ? portfolio.cashBalance - totalCost 
                  : portfolio.cashBalance + (parseFloat(quantity || '0') * currentPrice * (1 - MARKET_ORDER_FEE))
                ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant={side === 'buy' ? 'primary' : 'danger'}
          fullWidth
          disabled={!canAfford || !quantity || parseFloat(quantity) <= 0}
          className="py-3 text-lg"
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {crypto.symbol}
        </Button>
      </form>
    </div>
  );
};

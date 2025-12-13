import React from 'react';
import { CryptoPortfolio as CryptoPortfolioType, CryptoId } from '../types';
import { CRYPTOS } from '../cryptoConstants';
import { getCurrentPrice } from '../services/cryptoMarketService';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface CryptoPortfolioProps {
  portfolio: CryptoPortfolioType;
}

export const CryptoPortfolio: React.FC<CryptoPortfolioProps> = ({ portfolio }) => {
  const positions = Object.values(portfolio.positions);
  
  // Calculate total value
  let totalCryptoValue = 0;
  positions.forEach(position => {
    const currentPrice = getCurrentPrice(position.cryptoId);
    totalCryptoValue += position.quantity * currentPrice;
  });

  const totalValue = portfolio.cashBalance + totalCryptoValue;
  const totalProfit = totalValue - 10000; // Initial balance
  const profitPercent = (totalProfit / 10000) * 100;

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-6">
        <Wallet className="text-emerald-400" size={24} />
        <h2 className="text-2xl font-bold text-white">Portfolio</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Value */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">Total Value</div>
          <div className="text-2xl font-bold text-white">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1 flex items-center gap-1">
            <DollarSign size={14} /> Cash
          </div>
          <div className="text-2xl font-bold text-white">
            ${portfolio.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Profit/Loss */}
        <div className={`bg-slate-800 rounded-lg p-4 border ${profitPercent >= 0 ? 'border-emerald-500/50' : 'border-red-500/50'}`}>
          <div className="text-sm text-slate-400 mb-1">Profit/Loss</div>
          <div className={`text-2xl font-bold flex items-center gap-2 ${profitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profitPercent >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            <span>
              {profitPercent >= 0 ? '+' : ''}
              {totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
              {' '}
              <span className="text-lg">
                ({profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Holdings</h3>
        {positions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No holdings. Start trading to build your portfolio!
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map(position => {
              const crypto = CRYPTOS[position.cryptoId];
              const currentPrice = getCurrentPrice(position.cryptoId);
              const currentValue = position.quantity * currentPrice;
              const profit = currentValue - position.totalInvested;
              const profitPercent = (profit / position.totalInvested) * 100;
              const isPositive = profit >= 0;

              return (
                <div
                  key={position.cryptoId}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{crypto.emoji}</div>
                      <div>
                        <div className="font-semibold text-white">{crypto.name}</div>
                        <div className="text-sm text-slate-400">{crypto.symbol}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Quantity */}
                      <div className="text-right">
                        <div className="text-sm text-slate-400">Quantity</div>
                        <div className="font-semibold text-white">
                          {position.quantity.toFixed(4)}
                        </div>
                      </div>

                      {/* Current Price */}
                      <div className="text-right">
                        <div className="text-sm text-slate-400">Price</div>
                        <div className="font-semibold text-white">
                          ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Value */}
                      <div className="text-right">
                        <div className="text-sm text-slate-400">Value</div>
                        <div className="font-semibold text-white">
                          ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Profit/Loss */}
                      <div className={`text-right ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                        <div className="text-sm text-slate-400">P/L</div>
                        <div className="font-semibold flex items-center gap-1">
                          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          <span>
                            {isPositive ? '+' : ''}
                            {profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-xs">
                          ({isPositive ? '+' : ''}{profitPercent.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Orders */}
      {portfolio.orders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Pending Orders ({portfolio.orders.length})</h3>
          <div className="space-y-2">
            {portfolio.orders.map(order => {
              const crypto = CRYPTOS[order.cryptoId];
              return (
                <div
                  key={order.id}
                  className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{crypto.emoji}</span>
                      <span className="font-semibold text-white">
                        {order.side === 'buy' ? 'Buy' : 'Sell'} {order.quantity.toFixed(4)} {crypto.symbol}
                      </span>
                      <span className="text-slate-400">({order.type})</span>
                    </div>
                    {order.price && (
                      <span className="text-slate-300">
                        @ ${order.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

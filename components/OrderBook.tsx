import React from 'react';
import { CryptoPortfolio, Order, CryptoId } from '../types';
import { CRYPTOS } from '../cryptoConstants';
import { cancelOrder } from '../services/cryptoTradingService';
import { X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from './Button';

interface OrderBookProps {
  portfolio: CryptoPortfolio;
  onPortfolioUpdate: (portfolio: CryptoPortfolio) => void;
  selectedCrypto?: CryptoId;
}

export const OrderBook: React.FC<OrderBookProps> = ({
  portfolio,
  onPortfolioUpdate,
  selectedCrypto
}) => {
  const orders = selectedCrypto
    ? portfolio.orders.filter(o => o.cryptoId === selectedCrypto)
    : portfolio.orders;

  const handleCancel = (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      const success = cancelOrder(portfolio, orderId);
      if (success) {
        onPortfolioUpdate({ ...portfolio });
      }
    }
  };

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case 'market': return 'Market';
      case 'limit': return 'Limit';
      case 'stop_loss': return 'Stop Loss';
      case 'take_profit': return 'Take Profit';
      case 'stop_limit': return 'Stop Limit';
      default: return type;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled':
        return <CheckCircle size={16} className="text-emerald-400" />;
      case 'cancelled':
        return <XCircle size={16} className="text-red-400" />;
      default:
        return <Clock size={16} className="text-yellow-400" />;
    }
  };

  if (orders.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">Order Book</h2>
        <div className="text-center py-8 text-slate-400">
          No orders. Start trading to see your orders here!
        </div>
      </div>
    );
  }

  // Separate pending and executed orders
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const executedOrders = orders.filter(o => o.status === 'filled' || o.status === 'cancelled')
    .slice(-10) // Show last 10 executed orders
    .reverse();

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
      <h2 className="text-xl font-bold text-white mb-6">Order Book</h2>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Clock size={16} />
            Pending Orders ({pendingOrders.length})
          </h3>
          <div className="space-y-2">
            {pendingOrders.map(order => {
              const crypto = CRYPTOS[order.cryptoId];
              return (
                <div
                  key={order.id}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{crypto.emoji}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {order.side === 'buy' ? 'Buy' : 'Sell'}
                          </span>
                          <span className="text-white">
                            {order.quantity.toFixed(8)} {crypto.symbol}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {getOrderTypeLabel(order.type)}
                          {order.price && ` @ $${order.price.toFixed(2)}`}
                          {order.stopPrice && ` (Stop: $${order.stopPrice.toFixed(2)})`}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleCancel(order.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X size={18} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Executed Orders History */}
      {executedOrders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <CheckCircle size={16} />
            Recent Orders ({executedOrders.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {executedOrders.map(order => {
              const crypto = CRYPTOS[order.cryptoId];
              return (
                <div
                  key={order.id}
                  className={`bg-slate-800/50 rounded-lg p-3 border ${
                    order.status === 'filled' ? 'border-emerald-500/30' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(order.status)}
                      <div className="text-2xl">{crypto.emoji}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {order.side === 'buy' ? 'Bought' : 'Sold'}
                          </span>
                          <span className="text-sm text-white">
                            {order.quantity.toFixed(8)} {crypto.symbol}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {order.executedPrice && `@ $${order.executedPrice.toFixed(2)}`}
                          {' • '}
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {order.status === 'filled' ? 'Filled' : 'Cancelled'}
                    </div>
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

import React, { useEffect, useState } from 'react';
import { CryptoId, CryptoMarketState } from '../types';
import { CRYPTOS } from '../cryptoConstants';
import { subscribeToMarket } from '../services/cryptoMarketService';
import { TrendingUp, TrendingDown, X, Zap } from 'lucide-react';

interface MarketEvent {
  id: string;
  cryptoId: CryptoId;
  type: 'pump' | 'dump';
  multiplier: number;
  timestamp: number;
}

export const MarketEventNotification: React.FC = () => {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [previousPrices, setPreviousPrices] = useState<Record<CryptoId, number>>({} as Record<CryptoId, number>);
  const [previousMultipliers, setPreviousMultipliers] = useState<Record<CryptoId, number>>({} as Record<CryptoId, number>);

  useEffect(() => {
    const unsubscribe = subscribeToMarket((marketState) => {
      const newEvents: MarketEvent[] = [];

      Object.values(marketState).forEach((market: CryptoMarketState) => {
        const previousPrice = previousPrices[market.cryptoId];
        const previousMultiplier = previousMultipliers[market.cryptoId] || 1.0;

        // Detect new pump/dump events (significant change in event multiplier)
        if (market.eventMultiplier !== 1.0 && previousMultiplier === 1.0) {
          const eventType = market.eventMultiplier > 1.0 ? 'pump' : 'dump';
          const changePercent = Math.abs((market.eventMultiplier - 1.0) * 100);
          
          // Only notify for significant events (>20% change)
          if (changePercent >= 20) {
            newEvents.push({
              id: `event_${market.cryptoId}_${Date.now()}`,
              cryptoId: market.cryptoId,
              type: eventType,
              multiplier: market.eventMultiplier,
              timestamp: Date.now()
            });
          }
        }

        // Update previous state
        setPreviousPrices(prev => ({ ...prev, [market.cryptoId]: market.currentPrice }));
        setPreviousMultipliers(prev => ({ ...prev, [market.cryptoId]: market.eventMultiplier }));
      });

      if (newEvents.length > 0) {
        setEvents(prev => [...newEvents, ...prev].slice(0, 10)); // Keep last 10 events
      }
    });

    return unsubscribe;
  }, [previousPrices, previousMultipliers]);

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Auto-remove events after 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setEvents(prev => prev.filter(e => now - e.timestamp < 10000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {events.map(event => {
        const crypto = CRYPTOS[event.cryptoId];
        const changePercent = Math.abs((event.multiplier - 1.0) * 100);
        const isPump = event.type === 'pump';

        return (
          <div
            key={event.id}
            className={`rounded-lg p-4 shadow-2xl border-2 animate-in slide-in-from-right ${
              isPump
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100'
                : 'bg-red-500/20 border-red-500 text-red-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                isPump ? 'bg-emerald-500/30' : 'bg-red-500/30'
              }`}>
                {isPump ? (
                  <TrendingUp size={24} className="text-emerald-300" />
                ) : (
                  <TrendingDown size={24} className="text-red-300" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{crypto.emoji}</span>
                  <span className="font-bold text-lg">{crypto.name}</span>
                  <Zap size={16} className={isPump ? 'text-yellow-300' : 'text-red-300'} />
                </div>
                <div className="text-sm font-semibold">
                  {isPump ? '🚀 PUMP' : '📉 DUMP'} - {changePercent.toFixed(0)}% {isPump ? 'SURGE' : 'CRASH'}!
                </div>
                <div className="text-xs mt-1 opacity-80">
                  {isPump ? 'Price is skyrocketing!' : 'Price is plummeting!'}
                </div>
              </div>
              <button
                onClick={() => removeEvent(event.id)}
                className="text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { NewsEvent } from '../services/cryptoNewsService';
import { getActiveNews } from '../services/cryptoNewsService';
import { CRYPTOS } from '../cryptoConstants';
import { TrendingUp, TrendingDown, Minus, Newspaper } from 'lucide-react';

interface CryptoNewsProps {
  cryptoId?: string; // Optional filter
  maxItems?: number;
}

export const CryptoNews: React.FC<CryptoNewsProps> = ({ cryptoId, maxItems = 5 }) => {
  const [news, setNews] = useState<NewsEvent[]>([]);

  useEffect(() => {
    const updateNews = () => {
      const activeNews = getActiveNews(cryptoId as any);
      setNews(activeNews.slice(0, maxItems));
    };

    updateNews();
    const interval = setInterval(updateNews, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [cryptoId, maxItems]);

  if (news.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-white">Market News</h2>
        </div>
        <div className="text-center py-8 text-slate-400">
          No recent news. Check back soon for updates!
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-white">Market News</h2>
      </div>

      <div className="space-y-3">
        {news.map(event => {
          const crypto = CRYPTOS[event.cryptoId];
          const isPositive = event.type === 'positive';
          const isNegative = event.type === 'negative';

          return (
            <div
              key={event.id}
              className={`p-4 rounded-lg border ${
                isPositive
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : isNegative
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  isPositive
                    ? 'bg-emerald-500/20'
                    : isNegative
                    ? 'bg-red-500/20'
                    : 'bg-slate-700'
                }`}>
                  {isPositive ? (
                    <TrendingUp size={20} className="text-emerald-400" />
                  ) : isNegative ? (
                    <TrendingDown size={20} className="text-red-400" />
                  ) : (
                    <Minus size={20} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{crypto.emoji}</span>
                    <span className="font-semibold text-white">{crypto.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      isPositive
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isNegative
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {event.type === 'positive' ? 'Positive' :
                       event.type === 'negative' ? 'Negative' : 'Neutral'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{event.title}</h3>
                  <p className="text-sm text-slate-300 mb-2">{event.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Price Impact: 
                      <span className={`ml-1 font-semibold ${
                        event.priceImpact >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {event.priceImpact >= 0 ? '+' : ''}
                        {event.priceImpact.toFixed(1)}%
                      </span>
                    </span>
                    <span>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

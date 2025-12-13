import React, { useState, useEffect } from 'react';
import { CryptoId, CryptoPortfolio } from '../types';
import { CRYPTOS } from '../cryptoConstants';
import { CryptoChart } from './CryptoChart';
import { TradingInterface } from './TradingInterface';
import { OrderBook } from './OrderBook';
import { CryptoPortfolio as CryptoPortfolioComponent } from './CryptoPortfolio';
import { CryptoAnalyst } from './CryptoAnalyst';
import { CryptoNews } from './CryptoNews';
import { MarketEventNotification } from './MarketEventNotification';
import { BlockChain } from './BlockChain';
import { TrendingUp, Wallet, FileText, BarChart3, Newspaper, Brain, Link as LinkIcon } from 'lucide-react';

interface CryptoTradingViewProps {
  portfolio: CryptoPortfolio;
  onPortfolioUpdate: (portfolio: CryptoPortfolio) => void;
}

type ViewTab = 'market' | 'trade' | 'portfolio' | 'orders' | 'analyst' | 'news' | 'blockchain';

export const CryptoTradingView: React.FC<CryptoTradingViewProps> = ({
  portfolio,
  onPortfolioUpdate
}) => {
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoId>(CryptoId.BTC);
  const [activeTab, setActiveTab] = useState<ViewTab>('market');
  const [cryptoList, setCryptoList] = useState<CryptoId[]>(Object.values(CryptoId));

  const tabs = [
    { id: 'market' as ViewTab, label: 'Market', icon: BarChart3 },
    { id: 'trade' as ViewTab, label: 'Trade', icon: TrendingUp },
    { id: 'portfolio' as ViewTab, label: 'Portfolio', icon: Wallet },
    { id: 'orders' as ViewTab, label: 'Orders', icon: FileText },
    { id: 'blockchain' as ViewTab, label: 'BlockChain', icon: LinkIcon },
    { id: 'analyst' as ViewTab, label: 'Analyst', icon: Brain },
    { id: 'news' as ViewTab, label: 'News', icon: Newspaper },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Event Notifications */}
      <MarketEventNotification />

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              💎 Crypto Trading Platform
            </h1>
            <div className="text-right">
              <div className="text-sm text-slate-400">Total Portfolio Value</div>
              <div className="text-2xl font-bold text-white">
                ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-sm ${portfolio.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {portfolio.totalProfit >= 0 ? '+' : ''}
                {portfolio.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                ({((portfolio.totalProfit / 500) * 100).toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Crypto Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
            {cryptoList.map(cryptoId => {
              const crypto = CRYPTOS[cryptoId];
              const isSelected = selectedCrypto === cryptoId;
              return (
                <button
                  key={cryptoId}
                  onClick={() => setSelectedCrypto(cryptoId)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl">{crypto.emoji}</span>
                  <span>{crypto.symbol}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Chart */}
          {(activeTab === 'market' || activeTab === 'trade') && (
            <div className="lg:col-span-2">
              <CryptoChart cryptoId={selectedCrypto} timeframe="15m" height={400} />
            </div>
          )}

          {/* Right Column - Trading/Info */}
          {activeTab === 'market' && (
            <div className="space-y-6">
              <CryptoAnalyst cryptoId={selectedCrypto} />
              <CryptoNews cryptoId={selectedCrypto} maxItems={3} />
            </div>
          )}

          {activeTab === 'trade' && (
            <div>
              <TradingInterface
                cryptoId={selectedCrypto}
                portfolio={portfolio}
                onPortfolioUpdate={onPortfolioUpdate}
              />
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="lg:col-span-3">
              <CryptoPortfolioComponent portfolio={portfolio} />
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="lg:col-span-3">
              <OrderBook
                portfolio={portfolio}
                onPortfolioUpdate={onPortfolioUpdate}
                selectedCrypto={selectedCrypto}
              />
            </div>
          )}

          {activeTab === 'analyst' && (
            <div className="lg:col-span-3">
              <CryptoAnalyst />
            </div>
          )}

          {activeTab === 'news' && (
            <div className="lg:col-span-3">
              <CryptoNews maxItems={10} />
            </div>
          )}

          {activeTab === 'blockchain' && (
            <div className="lg:col-span-3">
              <BlockChain
                portfolio={portfolio}
                onPortfolioUpdate={onPortfolioUpdate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

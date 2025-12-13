import React, { useState, useEffect } from 'react';
import { CryptoId } from '../types';
import { CRYPTOS } from '../cryptoConstants';
import { analyzeCrypto, getPrediction, CryptoPrediction } from '../services/cryptoAnalystService';
import { BrainCircuit, TrendingUp, TrendingDown, Minus, Loader2, Zap } from 'lucide-react';
import { Button } from './Button';

interface CryptoAnalystProps {
  cryptoId?: CryptoId; // Optional: if provided, shows prediction for specific crypto
}

export const CryptoAnalyst: React.FC<CryptoAnalystProps> = ({ cryptoId }) => {
  const [predictions, setPredictions] = useState<Record<CryptoId, CryptoPrediction | null>>({} as Record<CryptoId, CryptoPrediction | null>);
  const [loading, setLoading] = useState<Record<CryptoId, boolean>>({} as Record<CryptoId, boolean>);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoId | null>(cryptoId || CryptoId.BTC);

  useEffect(() => {
    // Load existing predictions
    Object.values(CryptoId).forEach(id => {
      const pred = getPrediction(id);
      if (pred) {
        setPredictions(prev => ({ ...prev, [id]: pred }));
      }
    });

    // Auto-analyze every 30 seconds
    const interval = setInterval(() => {
      if (selectedCrypto && !loading[selectedCrypto]) {
        handleAnalyze(selectedCrypto);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedCrypto, loading]);

  const handleAnalyze = async (id: CryptoId) => {
    setLoading(prev => ({ ...prev, [id]: true }));
    try {
      const prediction = await analyzeCrypto(id);
      if (prediction) {
        setPredictions(prev => ({ ...prev, [id]: prediction }));
      }
    } catch (error) {
      console.error('Error analyzing crypto:', error);
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const prediction = selectedCrypto ? predictions[selectedCrypto] : null;
  const isLoading = selectedCrypto ? loading[selectedCrypto] : false;

  return (
    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <BrainCircuit className="text-indigo-400" size={24} />
        </div>
        <h2 className="text-xl font-bold text-white">AI Market Analyst</h2>
      </div>

      {/* Crypto Selector */}
      {!cryptoId && (
        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-2">Select Crypto</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.values(CryptoId).slice(0, 6).map(id => {
              const crypto = CRYPTOS[id];
              const isSelected = selectedCrypto === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedCrypto(id)}
                  className={`p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{crypto.emoji}</div>
                  <div className={`text-xs font-semibold ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>
                    {crypto.symbol}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Prediction Display */}
      {selectedCrypto && (
        <div>
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-indigo-300">
              <Loader2 className="animate-spin w-8 h-8 mb-2" />
              <span className="text-sm">Analyzing market data...</span>
            </div>
          ) : prediction ? (
            <div className="space-y-4">
              {/* Prediction Header */}
              <div className={`p-4 rounded-lg border-2 ${
                prediction.prediction === 'bullish'
                  ? 'bg-emerald-500/10 border-emerald-500'
                  : prediction.prediction === 'bearish'
                  ? 'bg-red-500/10 border-red-500'
                  : 'bg-slate-500/10 border-slate-500'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{CRYPTOS[selectedCrypto].emoji}</div>
                    <div>
                      <div className="font-bold text-white text-lg">
                        {CRYPTOS[selectedCrypto].name}
                      </div>
                      <div className="text-sm text-slate-400">
                        {prediction.timeframe} prediction
                      </div>
                    </div>
                  </div>
                  <div className={`text-4xl ${
                    prediction.prediction === 'bullish' ? 'text-emerald-400' :
                    prediction.prediction === 'bearish' ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {prediction.prediction === 'bullish' ? (
                      <TrendingUp />
                    ) : prediction.prediction === 'bearish' ? (
                      <TrendingDown />
                    ) : (
                      <Minus />
                    )}
                  </div>
                </div>

                {/* Expected Change */}
                <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Expected Change</span>
                    <span className={`text-xl font-bold ${
                      prediction.expectedChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {prediction.expectedChange >= 0 ? '+' : ''}
                      {prediction.expectedChange.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-400">Confidence</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            prediction.confidence >= 70 ? 'bg-emerald-500' :
                            prediction.confidence >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${prediction.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm text-white font-semibold">
                        {prediction.confidence}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis Reason */}
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-yellow-400" />
                  <span className="text-sm font-semibold text-slate-300">Analysis</span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{prediction.reason}</p>
              </div>

              {/* Refresh Button */}
              <Button
                onClick={() => handleAnalyze(selectedCrypto)}
                variant="ghost"
                fullWidth
                className="border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300"
              >
                Refresh Analysis
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">
              <p className="mb-4">No prediction available</p>
              <Button
                onClick={() => handleAnalyze(selectedCrypto)}
                variant="primary"
              >
                Generate Analysis
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

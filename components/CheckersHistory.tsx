import React, { useState, useEffect } from 'react';
import { MatchHistory } from '../types/checkers';
import { Button } from './Button';
import { ArrowLeft } from 'lucide-react';

interface CheckersHistoryProps {
  playerId: string;
  onBack: () => void;
}

export const CheckersHistory: React.FC<CheckersHistoryProps> = ({ playerId, onBack }) => {
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [playerId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/match-history?playerId=${encodeURIComponent(playerId)}`);
      
      // Check if response is OK
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
      }
      
      const data = await response.json();

      if (data.success) {
        setHistory(data.data);
      } else {
        setError(data.error || 'Failed to load history');
      }
    } catch (err: any) {
      console.error('Error fetching match history:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString();
  };

  const getResultText = (yourColor: 'red' | 'black', winner: string | null, yourId: string): string => {
    if (!winner) return 'Draw';
    // This is simplified - in real implementation, you'd need to check if winner matches your playerId
    return 'Win'; // Placeholder
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
          <div className="flex items-center mb-6">
            <Button onClick={onBack} variant="secondary" size="sm" className="mr-4">
              <ArrowLeft size={20} />
            </Button>
            <h2 className="text-2xl font-bold text-white">Match History</h2>
          </div>

          {loading && (
            <div className="text-center py-12 text-slate-400">
              Loading history...
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="mb-2">No match history yet</p>
              <p className="text-sm">Play some games to see your history here!</p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-2">
              {history.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-white font-semibold">{match.opponentNickname}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        match.yourColor === 'red' 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-black/50 text-black'
                      }`}>
                        {match.yourColor === 'red' ? '🔴 Red' : '⚫ Black'}
                      </span>
                      {match.winner && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          match.winner === match.yourColor
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {match.winner === match.yourColor ? 'Win' : 'Loss'}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 text-sm">
                      {formatDate(match.finishedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


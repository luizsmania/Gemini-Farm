import React, { useState, useEffect, useRef } from 'react';
import { checkersWebSocketService } from '../services/checkersWebSocketService';
import { ServerMessage, LobbyInfo } from '../types/checkers';
import { Button } from './Button';
import { Loader2 } from 'lucide-react';

interface CheckersHubProps {
  onNicknameSet: (nickname: string, playerId: string) => void;
  onGameStart: (matchId: string, yourColor: 'red' | 'black', board: any[]) => void;
  playerId?: string;
  nickname?: string;
  onShowHistory?: () => void;
  onLogout?: () => void;
}

export const CheckersHub: React.FC<CheckersHubProps> = ({ onNicknameSet, onGameStart, playerId, nickname: propNickname, onShowHistory, onLogout }) => {
  const [nickname, setNickname] = useState(propNickname || '');
  // Don't set nicknameSet to true initially - let the server confirm it
  const [nicknameSet, setNicknameSet] = useState(false);
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSetRef = useRef(false);

  const handleSetNicknameAuto = async (nick: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    setError(null);
    
    try {
      // First ensure connection
      if (!checkersWebSocketService.isConnected()) {
        await checkersWebSocketService.connect();
      }
      await checkersWebSocketService.setNickname(nick.trim());
      // The nickname will be set when we receive NICKNAME_SET message
      // If no response after 5 seconds, show error
      timeoutRef.current = setTimeout(() => {
        const wsUrl = import.meta.env.VITE_WS_URL || 'not set';
        setError(`Server did not respond. Check: 1) VITE_WS_URL is set in Vercel (currently: ${wsUrl}), 2) WebSocket server is running on Railway/Render, 3) Server URL is correct.`);
        setLoading(false);
        timeoutRef.current = null;
      }, 5000);
    } catch (error: any) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const errorMsg = error.message || 'Failed to connect to server';
      const wsUrl = import.meta.env.VITE_WS_URL || 'not set';
      setError(`Connection failed: ${errorMsg}. Check VITE_WS_URL in Vercel (currently: ${wsUrl}) and ensure the WebSocket server is running.`);
      setLoading(false);
    }
  };

  // Auto-set nickname if it exists from props (loaded from localStorage)
  useEffect(() => {
    if (propNickname && !autoSetRef.current && !nicknameSet) {
      autoSetRef.current = true;
      // Automatically set the nickname on the server
      handleSetNicknameAuto(propNickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propNickname, nicknameSet]);

  useEffect(() => {
    const handleLobbyList = (message: ServerMessage) => {
      if (message.type === 'LOBBY_LIST' && message.lobbies) {
        setLobbies(message.lobbies);
      }
    };

    const handleNicknameSet = (message: ServerMessage) => {
      if (message.type === 'NICKNAME_SET' && message.playerId && message.nickname) {
        // Clear timeout if it exists
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setLoading(false);
        setNicknameSet(true);
        onNicknameSet(message.nickname, message.playerId);
      }
    };

    const handleGameStart = (message: ServerMessage) => {
      if (message.type === 'GAME_START' && message.matchId && message.yourColor && message.board) {
        onGameStart(message.matchId, message.yourColor, message.board);
      }
    };

    const handleError = (message: ServerMessage) => {
      if (message.type === 'ERROR' && message.message) {
        setError(message.message);
      }
    };

    checkersWebSocketService.on('NICKNAME_SET', handleNicknameSet);
    checkersWebSocketService.on('LOBBY_LIST', handleLobbyList);
    checkersWebSocketService.on('GAME_START', handleGameStart);
    checkersWebSocketService.on('ERROR', handleError);

    return () => {
      checkersWebSocketService.off('NICKNAME_SET', handleNicknameSet);
      checkersWebSocketService.off('LOBBY_LIST', handleLobbyList);
      checkersWebSocketService.off('GAME_START', handleGameStart);
      checkersWebSocketService.off('ERROR', handleError);
    };
  }, [onGameStart, onNicknameSet]);

  const handleSetNickname = async () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    await handleSetNicknameAuto(nickname);
  };

  const handleCreateLobby = () => {
    setLoading(true);
    setError(null);
    checkersWebSocketService.createLobby();
    setLoading(false);
  };

  const handleJoinLobby = (lobbyId: string) => {
    setLoading(true);
    setError(null);
    checkersWebSocketService.joinLobby(lobbyId);
    setLoading(false);
  };

  if (!nicknameSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Online Checkers
          </h1>
          <p className="text-slate-400 text-center mb-6">Enter your nickname to start</p>
          
          <div className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSetNickname()}
              placeholder="Enter your nickname"
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={20}
            />
            
            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}
            
            <Button
              onClick={handleSetNickname}
              disabled={loading || !nickname.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Connecting...
                </>
              ) : (
                'Start Playing'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Online Checkers
              </h1>
              <p className="text-slate-400">Welcome, <span className="text-purple-400 font-semibold">{nickname}</span>!</p>
            </div>
            {onLogout && (
              <Button onClick={onLogout} variant="danger" size="sm">
                Logout
              </Button>
            )}
          </div>
        </div>

        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Available Lobbies</h2>
            <div className="flex gap-2">
              {playerId && onShowHistory && (
                <Button onClick={onShowHistory} variant="secondary">
                  History
                </Button>
              )}
              <Button onClick={handleCreateLobby} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Lobby'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {lobbies.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="mb-4">No open lobbies available</p>
              <p className="text-sm">Create a lobby to start a new game!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lobbies.map((lobby) => (
                <div
                  key={lobby.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div>
                    <div className="text-white font-semibold">Lobby {lobby.id.slice(-8)}</div>
                    <div className="text-slate-400 text-sm">
                      {lobby.playerCount}/{lobby.maxPlayers} players
                    </div>
                  </div>
                  <Button
                    onClick={() => handleJoinLobby(lobby.id)}
                    disabled={loading || lobby.playerCount >= lobby.maxPlayers}
                    size="sm"
                  >
                    {lobby.playerCount >= lobby.maxPlayers ? 'Full' : 'Join'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


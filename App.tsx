import React, { useState, useEffect } from 'react';
import { CheckersHub } from './components/CheckersHub';
import { CheckersGame } from './components/CheckersGame';
import { CheckersHistory } from './components/CheckersHistory';
import { Board, Color } from './types/checkers';

type View = 'hub' | 'game' | 'history';

const STORAGE_KEY_NICKNAME = 'checkers_nickname';
const STORAGE_KEY_PLAYER_ID = 'checkers_player_id';

function App() {
  const [currentView, setCurrentView] = useState<View>('hub');
  const [nickname, setNickname] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [gameState, setGameState] = useState<{
    matchId: string;
    board: Board;
    yourColor: Color;
  } | null>(null);

  // Load nickname and playerId from localStorage on mount
  useEffect(() => {
    const savedNickname = localStorage.getItem(STORAGE_KEY_NICKNAME);
    const savedPlayerId = localStorage.getItem(STORAGE_KEY_PLAYER_ID);
    
    if (savedNickname) {
      setNickname(savedNickname);
    }
    if (savedPlayerId) {
      setPlayerId(savedPlayerId);
    }
  }, []);

  const handleNicknameSet = (nick: string, pid: string) => {
    setNickname(nick);
    setPlayerId(pid);
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_NICKNAME, nick);
    localStorage.setItem(STORAGE_KEY_PLAYER_ID, pid);
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY_NICKNAME);
    localStorage.removeItem(STORAGE_KEY_PLAYER_ID);
    // Reset state
    setNickname('');
    setPlayerId('');
    setGameState(null);
    setCurrentView('hub');
  };

  const handleGameStart = (matchId: string, yourColor: Color, board: Board) => {
    setGameState({ matchId, board, yourColor });
    setCurrentView('game');
  };

  const handleLeaveGame = () => {
    setGameState(null);
    setCurrentView('hub');
  };

  const handleShowHistory = () => {
    setCurrentView('history');
  };

  const handleBackToHub = () => {
    setCurrentView('hub');
  };

  if (currentView === 'game' && gameState) {
    return (
      <CheckersGame
        matchId={gameState.matchId}
        initialBoard={gameState.board}
        yourColor={gameState.yourColor}
        playerId={playerId}
        onLeave={handleLeaveGame}
      />
    );
  }

  if (currentView === 'history') {
    return (
      <CheckersHistory
        playerId={playerId}
        onBack={handleBackToHub}
      />
    );
  }

  return (
    <div>
      <CheckersHub
        onNicknameSet={handleNicknameSet}
        onGameStart={handleGameStart}
        playerId={playerId}
        nickname={nickname}
        onShowHistory={handleShowHistory}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;

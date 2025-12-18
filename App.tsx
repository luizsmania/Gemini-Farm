import React, { useState } from 'react';
import { CheckersHub } from './components/CheckersHub';
import { CheckersGame } from './components/CheckersGame';
import { CheckersHistory } from './components/CheckersHistory';
import { Board, Color } from './types/checkers';

type View = 'hub' | 'game' | 'history';

function App() {
  const [currentView, setCurrentView] = useState<View>('hub');
  const [nickname, setNickname] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [gameState, setGameState] = useState<{
    matchId: string;
    board: Board;
    yourColor: Color;
  } | null>(null);

  const handleNicknameSet = (nick: string, pid: string) => {
    setNickname(nick);
    setPlayerId(pid);
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
        onShowHistory={handleShowHistory}
      />
    </div>
  );
}

export default App;

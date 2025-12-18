import React, { useState, useEffect, useCallback } from 'react';
import { checkersWebSocketService } from '../services/checkersWebSocketService';
import { ServerMessage, Board, Piece, Color } from '../types/checkers';
import { Button } from './Button';
import { X } from 'lucide-react';

interface CheckersGameProps {
  matchId: string;
  initialBoard: Board;
  yourColor: Color;
  playerId?: string;
  onLeave: () => void;
}

const BOARD_SIZE = 8;

export const CheckersGame: React.FC<CheckersGameProps> = ({
  matchId,
  initialBoard,
  yourColor,
  playerId,
  onLeave,
}) => {
  const [board, setBoard] = useState<Board>(initialBoard);
  const [currentTurn, setCurrentTurn] = useState<Color>('red');
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<number[]>([]);
  const [winner, setWinner] = useState<Color | null>(null);
  const [canContinueJump, setCanContinueJump] = useState(false);
  const [continueJumpFrom, setContinueJumpFrom] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [showRematch, setShowRematch] = useState(false);

  useEffect(() => {
    const handleMoveAccepted = (message: ServerMessage) => {
      console.log('handleMoveAccepted called with:', message);
      if (message.type === 'MOVE_ACCEPTED' && message.board) {
        console.log('Updating board with new state:', message.board);
        setBoard(message.board);
        if (message.nextTurn) {
          setCurrentTurn(message.nextTurn);
        }
        if (message.canContinueJump !== undefined) {
          setCanContinueJump(message.canContinueJump);
        }
        if (message.continueJumpFrom !== undefined) {
          setContinueJumpFrom(message.continueJumpFrom);
        }
        setSelectedSquare(null);
        setLegalMoves([]);
        setError(null);
      } else {
        console.log('MOVE_ACCEPTED message missing board:', message);
      }
    };

    const handleMoveRejected = (message: ServerMessage) => {
      console.log('handleMoveRejected called with:', message);
      if (message.type === 'MOVE_REJECTED' && message.reason) {
        console.error('Move rejected:', message.reason);
        setError(message.reason);
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    };

    const handleGameOver = (message: ServerMessage) => {
      if (message.type === 'GAME_OVER' && message.winner) {
        setWinner(message.winner);
        setShowRematch(true);
      }
    };

    const handlePlayerDisconnected = (message: ServerMessage) => {
      if (message.type === 'PLAYER_DISCONNECTED') {
        setOpponentDisconnected(true);
        setTimeout(() => setOpponentDisconnected(false), 3000);
      }
    };

    const handleRematchRequest = (message: ServerMessage) => {
      if (message.type === 'REMATCH_REQUEST') {
        setShowRematch(true);
      }
    };

    checkersWebSocketService.on('MOVE_ACCEPTED', handleMoveAccepted);
    checkersWebSocketService.on('MOVE_REJECTED', handleMoveRejected);
    checkersWebSocketService.on('GAME_OVER', handleGameOver);
    checkersWebSocketService.on('PLAYER_DISCONNECTED', handlePlayerDisconnected);
    checkersWebSocketService.on('REMATCH_REQUEST', handleRematchRequest);

    return () => {
      checkersWebSocketService.off('MOVE_ACCEPTED', handleMoveAccepted);
      checkersWebSocketService.off('MOVE_REJECTED', handleMoveRejected);
      checkersWebSocketService.off('GAME_OVER', handleGameOver);
      checkersWebSocketService.off('PLAYER_DISCONNECTED', handlePlayerDisconnected);
      checkersWebSocketService.off('REMATCH_REQUEST', handleRematchRequest);
    };
  }, []);

  const getPieceDisplay = (piece: Piece): string => {
    switch (piece) {
      case 'r': return '🔴';
      case 'R': return '🔴👑';
      case 'b': return '⚫';
      case 'B': return '⚫👑';
      default: return '';
    }
  };

  const isDarkSquare = (row: number, col: number): boolean => {
    return (row + col) % 2 === 1;
  };

  const getSquareColor = (index: number, isSelected: boolean, isLegalMove: boolean): string => {
    if (isSelected) return 'bg-yellow-500/50';
    if (isLegalMove) return 'bg-green-500/30';
    const { row, col } = indexToPos(index);
    return isDarkSquare(row, col) ? 'bg-amber-900' : 'bg-amber-50';
  };

  const indexToPos = (index: number): { row: number; col: number } => {
    return {
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
    };
  };

  // Calculate legal moves for a piece
  const calculateLegalMoves = useCallback((position: number): number[] => {
    const piece = board[position];
    if (piece === null) return [];
    
    const pieceColor = (piece === 'r' || piece === 'R') ? 'red' : 'black';
    if (pieceColor !== currentTurn) return [];
    
    const { row, col } = indexToPos(position);
    const isKing = piece === 'R' || piece === 'B';
    const moves: number[] = [];
    
    // Check for captures first (mandatory)
    const captures: number[] = [];
    const captureDirections = [
      { rowDir: -2, colDir: -2 }, // Up-left capture
      { rowDir: -2, colDir: 2 },  // Up-right capture
      { rowDir: 2, colDir: -2 },  // Down-left capture
      { rowDir: 2, colDir: 2 },   // Down-right capture
    ];
    
    for (const { rowDir, colDir } of captureDirections) {
      const newRow = row + rowDir;
      const newCol = col + colDir;
      const jumpOverRow = row + rowDir / 2;
      const jumpOverCol = col + colDir / 2;
      
      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        const newIndex = newRow * BOARD_SIZE + newCol;
        const jumpOverIndex = jumpOverRow * BOARD_SIZE + jumpOverCol;
        
        if (board[newIndex] === null && board[jumpOverIndex] !== null) {
          const jumpedPiece = board[jumpOverIndex]!;
          const jumpedColor = (jumpedPiece === 'r' || jumpedPiece === 'R') ? 'red' : 'black';
          if (jumpedColor !== pieceColor) {
            captures.push(newIndex);
          }
        }
      }
    }
    
    if (captures.length > 0) {
      return captures;
    }
    
    // Regular moves (only if no captures available)
    const directions = isKing 
      ? [
          { rowDir: -1, colDir: -1 }, // Up-left
          { rowDir: -1, colDir: 1 },  // Up-right
          { rowDir: 1, colDir: -1 },  // Down-left
          { rowDir: 1, colDir: 1 },   // Down-right
        ]
      : pieceColor === 'red'
      ? [
          { rowDir: -1, colDir: -1 }, // Up-left
          { rowDir: -1, colDir: 1 },  // Up-right
        ]
      : [
          { rowDir: 1, colDir: -1 },  // Down-left
          { rowDir: 1, colDir: 1 },   // Down-right
        ];
    
    for (const { rowDir, colDir } of directions) {
      const newRow = row + rowDir;
      const newCol = col + colDir;
      
      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        const newIndex = newRow * BOARD_SIZE + newCol;
        if (board[newIndex] === null) {
          moves.push(newIndex);
        }
      }
    }
    
    return moves;
  }, [board, currentTurn]);

  const handleSquareClick = useCallback((index: number) => {
    console.log('handleSquareClick called with index:', index);
    const piece = board[index];
    const isYourPiece = piece !== null && 
      ((yourColor === 'red' && (piece === 'r' || piece === 'R')) ||
       (yourColor === 'black' && (piece === 'b' || piece === 'B')));

    console.log('Piece:', piece, 'IsYourPiece:', isYourPiece, 'CurrentTurn:', currentTurn, 'YourColor:', yourColor);

    if (winner) {
      console.log('Game has winner, ignoring click');
      return;
    }

    if (currentTurn !== yourColor) {
      console.log('Not your turn');
      setError('Wait for your turn');
      return;
    }

    if (canContinueJump && continueJumpFrom !== null) {
      // Must continue jump from the same piece
      if (index !== continueJumpFrom && selectedSquare !== continueJumpFrom) {
        setError('You must continue your jump');
        return;
      }
      if (selectedSquare === continueJumpFrom || index === continueJumpFrom) {
        setSelectedSquare(continueJumpFrom);
        // Calculate legal moves for continuing jump
        const moves = calculateLegalMoves(continueJumpFrom);
        setLegalMoves(moves);
        return;
      }
    }

    if (selectedSquare === null) {
      if (isYourPiece) {
        console.log('Selecting piece at', index);
        setSelectedSquare(index);
        // Calculate and display legal moves
        const moves = calculateLegalMoves(index);
        setLegalMoves(moves);
        console.log('Selected piece at', index, 'Legal moves:', moves);
        if (moves.length === 0) {
          setError('No legal moves available for this piece');
        }
      } else {
        console.log('Clicked on empty square or opponent piece, but no piece selected');
      }
    } else {
      if (selectedSquare === index) {
        // Deselect
        setSelectedSquare(null);
        setLegalMoves([]);
      } else if (isYourPiece) {
        // Select different piece
        setSelectedSquare(index);
        const moves = calculateLegalMoves(index);
        setLegalMoves(moves);
      } else {
        // Try to move - check if it's a legal move
        console.log('Attempting move - Selected:', selectedSquare, 'Target:', index, 'Legal moves:', legalMoves);
        if (legalMoves.length > 0 && legalMoves.includes(index)) {
          console.log('Making move from', selectedSquare, 'to', index);
          console.log('Socket connected?', checkersWebSocketService.isConnected());
          checkersWebSocketService.makeMove(matchId, selectedSquare, index);
          setError(null);
          // Don't clear selection yet - wait for server response
          // Set a timeout to show error if no response
          setTimeout(() => {
            if (selectedSquare === selectedSquare) { // Still selected after 3 seconds
              console.warn('No response from server after 3 seconds');
              setError('No response from server. Check connection.');
            }
          }, 3000);
        } else if (legalMoves.length === 0) {
          console.log('No legal moves available');
          setError('No legal moves available. Select a different piece.');
          setSelectedSquare(null);
          setLegalMoves([]);
        } else {
          console.log('Invalid move - not in legal moves list');
          setError(`Invalid move - select a highlighted square. Legal moves: ${legalMoves.join(', ')}`);
        }
      }
    }
  }, [board, selectedSquare, yourColor, currentTurn, canContinueJump, continueJumpFrom, winner, matchId, legalMoves, calculateLegalMoves]);

  const handleRematch = () => {
    checkersWebSocketService.acceptRematch(matchId);
    setShowRematch(false);
  };

  const handleLeave = () => {
    checkersWebSocketService.leaveMatch(matchId);
    onLeave();
  };

  const renderSquare = (index: number) => {
    const piece = board[index];
    const isSelected = selectedSquare === index;
    const isLegalMove = legalMoves.includes(index);
    const colorClass = getSquareColor(index, isSelected, isLegalMove);

    return (
      <div
        key={index}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Square clicked:', index, 'Piece:', piece, 'Selected:', selectedSquare, 'Legal moves:', legalMoves);
          handleSquareClick(index);
        }}
        className={`${colorClass} aspect-square flex items-center justify-center cursor-pointer transition-all hover:scale-105 border-2 ${
          isSelected ? 'border-yellow-400' : 'border-transparent'
        }`}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {piece && (
          <span 
            className="text-4xl filter drop-shadow-lg pointer-events-none select-none"
            style={{ userSelect: 'none' }}
          >
            {getPieceDisplay(piece)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Checkers Game</h2>
              <p className="text-slate-400">
                You are: <span className={`font-bold ${yourColor === 'red' ? 'text-red-400' : 'text-black'}`}>
                  {yourColor === 'red' ? '🔴 Red' : '⚫ Black'}
                </span>
              </p>
              <p className="text-slate-400">
                Current turn: <span className={`font-bold ${currentTurn === 'red' ? 'text-red-400' : 'text-black'}`}>
                  {currentTurn === 'red' ? '🔴 Red' : '⚫ Black'}
                </span>
              </p>
              {canContinueJump && (
                <p className="text-yellow-400 text-sm mt-1">You must continue your jump!</p>
              )}
            </div>
            <Button onClick={handleLeave} variant="danger" size="sm">
              <X size={20} />
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {opponentDisconnected && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 text-sm">
              Opponent disconnected. Waiting for reconnection...
            </div>
          )}

          {winner && (
            <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-400 mb-2">
                {winner === yourColor ? '🎉 You Win!' : '😔 You Lost'}
              </p>
              <p className="text-slate-300">Winner: {winner === 'red' ? '🔴 Red' : '⚫ Black'}</p>
            </div>
          )}

          {/* Checkers Board */}
          <div 
            className="grid grid-cols-8 gap-0 bg-amber-800 p-2 rounded-lg mb-4" 
            style={{ maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 0 }}
            onClick={(e) => {
              // Allow clicks to pass through to squares
              e.stopPropagation();
            }}
          >
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => renderSquare(i))}
          </div>

          {showRematch && !winner && (
            <div className="text-center">
              <p className="text-white mb-4">Opponent wants to play again!</p>
              <Button onClick={handleRematch}>Accept Rematch</Button>
            </div>
          )}

          {winner && (
            <div className="text-center space-x-4">
              <Button onClick={handleRematch}>Play Again</Button>
              <Button onClick={handleLeave} variant="danger">Leave</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


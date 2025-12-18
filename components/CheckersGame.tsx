import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  matchId: initialMatchId,
  initialBoard,
  yourColor,
  playerId,
  onLeave,
}) => {
  const [matchId, setMatchId] = useState<string>(initialMatchId);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [currentTurn, setCurrentTurn] = useState<Color>('red');
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [legalMoves, setLegalMoves] = useState<number[]>([]);
  const [mandatoryCaptures, setMandatoryCaptures] = useState<number[]>([]);
  const [winner, setWinner] = useState<Color | null>(null);
  const [canContinueJump, setCanContinueJump] = useState(false);
  const [continueJumpFrom, setContinueJumpFrom] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [showRematch, setShowRematch] = useState(false);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        setMandatoryCaptures([]);
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
        setMandatoryCaptures([]);
        // Clear error after 3 seconds
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
        errorTimeoutRef.current = setTimeout(() => {
          setError(null);
          errorTimeoutRef.current = null;
        }, 3000);
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

    const handleGameStart = (message: ServerMessage) => {
      if (message.type === 'GAME_START' && message.matchId && message.board) {
        // Rematch - reset game state
        setMatchId(message.matchId);
        setBoard(message.board);
        setCurrentTurn('red');
        setSelectedSquare(null);
        setLegalMoves([]);
        setWinner(null);
        setCanContinueJump(false);
        setContinueJumpFrom(null);
        setError(null);
        setShowRematch(false);
        // Clear any pending timeouts
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
          moveTimeoutRef.current = null;
        }
      }
    };

    checkersWebSocketService.on('MOVE_ACCEPTED', handleMoveAccepted);
    checkersWebSocketService.on('MOVE_REJECTED', handleMoveRejected);
    checkersWebSocketService.on('GAME_OVER', handleGameOver);
    checkersWebSocketService.on('PLAYER_DISCONNECTED', handlePlayerDisconnected);
    checkersWebSocketService.on('REMATCH_REQUEST', handleRematchRequest);
    checkersWebSocketService.on('GAME_START', handleGameStart);

    return () => {
      checkersWebSocketService.off('MOVE_ACCEPTED', handleMoveAccepted);
      checkersWebSocketService.off('MOVE_REJECTED', handleMoveRejected);
      checkersWebSocketService.off('GAME_OVER', handleGameOver);
      checkersWebSocketService.off('PLAYER_DISCONNECTED', handlePlayerDisconnected);
      checkersWebSocketService.off('REMATCH_REQUEST', handleRematchRequest);
      checkersWebSocketService.off('GAME_START', handleGameStart);
      // Clear timeouts on unmount
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const getPieceDisplay = (piece: Piece): { emoji: string; isKing: boolean } => {
    switch (piece) {
      case 'r': return { emoji: '🔴', isKing: false };
      case 'R': return { emoji: '🔴', isKing: true };
      case 'b': return { emoji: '⚫', isKing: false };
      case 'B': return { emoji: '⚫', isKing: true };
      default: return { emoji: '', isKing: false };
    }
  };

  const isDarkSquare = (row: number, col: number): boolean => {
    return (row + col) % 2 === 1;
  };

  const getSquareColor = (index: number, isSelected: boolean, isLegalMove: boolean, isMandatoryCapture: boolean): string => {
    if (isSelected) return 'bg-yellow-500/50';
    // Mandatory captures should show even if it's also a legal move for selected piece
    if (isMandatoryCapture) return 'bg-blue-500/60 border-2 border-blue-400';
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

  // Convert display index (flipped for black) to board index
  const displayIndexToBoardIndex = (displayIndex: number): number => {
    if (yourColor === 'black') {
      return (BOARD_SIZE * BOARD_SIZE - 1) - displayIndex;
    }
    return displayIndex;
  };

  // Convert board index to display index (flipped for black)
  const boardIndexToDisplayIndex = (boardIndex: number): number => {
    if (yourColor === 'black') {
      return (BOARD_SIZE * BOARD_SIZE - 1) - boardIndex;
    }
    return boardIndex;
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
    
    if (isKing) {
      // Kings can capture pieces multiple squares away
      const directions = [
        { rowDir: -1, colDir: -1 }, // Up-left
        { rowDir: -1, colDir: 1 },  // Up-right
        { rowDir: 1, colDir: -1 },  // Down-left
        { rowDir: 1, colDir: 1 },   // Down-right
      ];
      
      for (const { rowDir, colDir } of directions) {
        // Look for an opponent piece in this direction
        for (let distance = 1; distance < BOARD_SIZE; distance++) {
          const checkRow = row + (rowDir * distance);
          const checkCol = col + (colDir * distance);
          
          if (checkRow < 0 || checkRow >= BOARD_SIZE || checkCol < 0 || checkCol >= BOARD_SIZE) {
            break; // Out of bounds
          }
          
          const checkIndex = checkRow * BOARD_SIZE + checkCol;
          const checkPiece = board[checkIndex];
          
          if (checkPiece === null) {
            continue; // Empty square, keep looking
          }
          
          const checkColor = (checkPiece === 'r' || checkPiece === 'R') ? 'red' : 'black';
          if (checkColor === pieceColor) {
            break; // Hit own piece, can't capture
          }
          
          // Found opponent piece - check if we can land after it
          const landRow = checkRow + rowDir;
          const landCol = checkCol + colDir;
          
          if (landRow >= 0 && landRow < BOARD_SIZE && landCol >= 0 && landCol < BOARD_SIZE) {
            const landIndex = landRow * BOARD_SIZE + landCol;
            if (board[landIndex] === null) {
              captures.push(landIndex);
            }
          }
          
          break; // Found a piece (either captured or blocked)
        }
      }
    } else {
      // Regular pieces can only capture 2 squares away
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
    }
    
    if (captures.length > 0) {
      return captures;
    }
    
    // Regular moves (only if no captures available)
    if (isKing) {
      // Kings can move unlimited squares diagonally
      const directions = [
        { rowDir: -1, colDir: -1 }, // Up-left
        { rowDir: -1, colDir: 1 },  // Up-right
        { rowDir: 1, colDir: -1 },  // Down-left
        { rowDir: 1, colDir: 1 },   // Down-right
      ];
      
      for (const { rowDir, colDir } of directions) {
        // Keep moving in this direction until we hit a piece or edge
        for (let distance = 1; distance < BOARD_SIZE; distance++) {
          const newRow = row + (rowDir * distance);
          const newCol = col + (colDir * distance);
          
          if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) {
            break; // Out of bounds
          }
          
          const newIndex = newRow * BOARD_SIZE + newCol;
          if (board[newIndex] !== null) {
            break; // Hit a piece, can't go further
          }
          
          moves.push(newIndex);
        }
      }
    } else {
      // Regular pieces can only move one square
      const directions = pieceColor === 'red'
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
    }
    
    return moves;
  }, [board, currentTurn]);

  // Calculate all mandatory captures for current player
  const calculateAllMandatoryCaptures = useCallback((): number[] => {
    const allCaptures: number[] = [];
    
    // First, check if any piece has captures available
    let hasAnyCaptures = false;
    for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
      const piece = board[i];
      if (piece === null) continue;
      
      const pieceColor = (piece === 'r' || piece === 'R') ? 'red' : 'black';
      if (pieceColor !== currentTurn) continue;
      
      const moves = calculateLegalMoves(i);
      // If calculateLegalMoves returns captures (mandatory), it means this piece has captures
      if (moves.length > 0) {
        // Check if these are captures by verifying they're 2+ squares away
        const { row: fromRow, col: fromCol } = indexToPos(i);
        for (const moveIndex of moves) {
          const { row: toRow, col: toCol } = indexToPos(moveIndex);
          const rowDiff = Math.abs(toRow - fromRow);
          const colDiff = Math.abs(toCol - fromCol);
          // Captures are at least 2 squares away
          if (rowDiff >= 2 && colDiff >= 2) {
            hasAnyCaptures = true;
            allCaptures.push(moveIndex);
          }
        }
      }
    }
    
    // If there are any captures, return all capture destinations
    // Otherwise return empty (no mandatory captures)
    return hasAnyCaptures ? allCaptures : [];
  }, [board, currentTurn, calculateLegalMoves]);

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
      // Clear error after 3 seconds
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setError(null);
        errorTimeoutRef.current = null;
      }, 3000);
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
          const fromSquare = selectedSquare; // Capture value for timeout check
          checkersWebSocketService.makeMove(matchId, selectedSquare, index);
          setError(null);
          setMandatoryCaptures([]);
          // Clear any existing timeout
          if (moveTimeoutRef.current) {
            clearTimeout(moveTimeoutRef.current);
          }
          // Set a timeout to show error if no response
          moveTimeoutRef.current = setTimeout(() => {
            // Check if the square is still selected (move wasn't processed)
            setSelectedSquare(current => {
              if (current === fromSquare) {
                console.warn('No response from server after 3 seconds');
                setError('No response from server. Check connection.');
              }
              return current;
            });
            moveTimeoutRef.current = null;
          }, 3000);
        } else if (legalMoves.length === 0) {
          console.log('No legal moves available');
          setError('No legal moves available. Select a different piece.');
          setSelectedSquare(null);
          setLegalMoves([]);
          setMandatoryCaptures([]);
        } else {
          // Check if captures are mandatory
          const allMandatoryCaptures = calculateAllMandatoryCaptures();
          console.log('Checking mandatory captures:', allMandatoryCaptures);
          if (allMandatoryCaptures.length > 0) {
            console.log('Invalid move - captures are mandatory. Showing', allMandatoryCaptures.length, 'mandatory captures');
            setError('Capture is mandatory! Highlighted moves in blue must be made.');
            setMandatoryCaptures(allMandatoryCaptures);
            // Clear error after 5 seconds
            if (errorTimeoutRef.current) {
              clearTimeout(errorTimeoutRef.current);
            }
            errorTimeoutRef.current = setTimeout(() => {
              setError(null);
              errorTimeoutRef.current = null;
            }, 5000);
          } else {
            console.log('Invalid move - not in legal moves list');
            setError(`Invalid move - select a highlighted square. Legal moves: ${legalMoves.join(', ')}`);
            setMandatoryCaptures([]);
            // Clear error after 3 seconds
            if (errorTimeoutRef.current) {
              clearTimeout(errorTimeoutRef.current);
            }
            errorTimeoutRef.current = setTimeout(() => {
              setError(null);
              errorTimeoutRef.current = null;
            }, 3000);
          }
        }
      }
    }
  }, [board, selectedSquare, yourColor, currentTurn, canContinueJump, continueJumpFrom, winner, matchId, legalMoves, calculateLegalMoves]);

  const handleRematch = () => {
    // Use current matchId from state
    checkersWebSocketService.acceptRematch(matchId);
    setShowRematch(false);
  };

  const handleLeave = () => {
    checkersWebSocketService.leaveMatch(matchId);
    onLeave();
  };

  const renderSquare = (displayIndex: number) => {
    // Convert display index to board index
    const boardIndex = displayIndexToBoardIndex(displayIndex);
    const piece = board[boardIndex];
    const isSelected = selectedSquare === boardIndex;
    const isLegalMove = legalMoves.includes(boardIndex);
    const isMandatoryCapture = mandatoryCaptures.includes(boardIndex);
    // Debug log for mandatory captures
    if (isMandatoryCapture) {
      console.log('Rendering mandatory capture at displayIndex:', displayIndex, 'boardIndex:', boardIndex, 'mandatoryCaptures:', mandatoryCaptures);
    }
    const colorClass = getSquareColor(boardIndex, isSelected, isLegalMove, isMandatoryCapture);

    return (
      <div
        key={displayIndex}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Square clicked - displayIndex:', displayIndex, 'boardIndex:', boardIndex, 'Piece:', piece, 'Selected:', selectedSquare, 'Legal moves:', legalMoves);
          // Convert display index back to board index for handling
          handleSquareClick(boardIndex);
        }}
        className={`${colorClass} aspect-square flex items-center justify-center cursor-pointer transition-all hover:scale-105 border-2 ${
          isSelected ? 'border-yellow-400' : isMandatoryCapture ? 'border-blue-400' : 'border-transparent'
        }`}
        style={{ position: 'relative', zIndex: 1, minHeight: '60px', minWidth: '60px' }}
      >
        {piece && (() => {
          const display = getPieceDisplay(piece);
          return (
            <div className="relative flex items-center justify-center pointer-events-none select-none w-full h-full">
              <span className="text-4xl filter drop-shadow-lg relative z-10">{display.emoji}</span>
              {display.isKing && (
                <span className="text-2xl absolute -top-1 left-1/2 transform -translate-x-1/2 filter drop-shadow-lg z-20">👑</span>
              )}
            </div>
          );
        })()}
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
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-3 bg-red-500/90 border border-red-500 rounded-lg text-red-100 text-sm shadow-2xl max-w-md">
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


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
  nickname?: string;
  onLeave: () => void;
}

const BOARD_SIZE = 8;

// Play audio files from the audio folder
const playSound = (type: 'move-self' | 'move-opponent' | 'capture' | 'error' | 'game-start' | 'game-end' | 'promote' | 'tenseconds') => {
  try {
    const audio = new Audio(`/audio/${type}.mp3`);
    audio.volume = 0.7; // Set volume to 70%
    audio.play().catch((e) => {
      // Ignore audio errors (e.g., user interaction required, autoplay restrictions)
      console.debug('Audio play failed:', e);
    });
  } catch (e) {
    // Ignore audio errors
    console.debug('Audio creation failed:', e);
  }
};

export const CheckersGame: React.FC<CheckersGameProps> = ({
  matchId: initialMatchId,
  initialBoard,
  yourColor,
  playerId,
  nickname,
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
  const [chatMessages, setChatMessages] = useState<Array<{ senderNickname: string; message: string; timestamp: number; isOwn: boolean }>>(() => {
    // Load chat history from localStorage on mount
    const savedChat = localStorage.getItem(`chat_${initialMatchId}`);
    if (savedChat) {
      try {
        return JSON.parse(savedChat);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [chatInput, setChatInput] = useState('');
  const [opponentNickname, setOpponentNickname] = useState<string>('Opponent');
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveTimeRemaining, setLeaveTimeRemaining] = useState<number>(0);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [animatingPiece, setAnimatingPiece] = useState<{ from: number; to: number } | null>(null);
  const [capturesRed, setCapturesRed] = useState<number>(0);
  const [capturesBlack, setCapturesBlack] = useState<number>(0);
  const [moveTimeRemaining, setMoveTimeRemaining] = useState<number>(45);
  const [draggingPiece, setDraggingPiece] = useState<{ boardIndex: number; piece: Piece } | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ from: number; to: number; board: Board } | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const moveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMoveAccepted = (message: ServerMessage) => {
      console.log('handleMoveAccepted called with:', message);
      if (message.type === 'MOVE_ACCEPTED' && message.board) {
        console.log('Updating board with new state:', message.board);
        
        // Check if this was our move (optimistic update) before processing
        const wasOurMove = pendingMove !== null && 
          message.from !== undefined && 
          message.to !== undefined &&
          pendingMove.from === message.from && 
          pendingMove.to === message.to;
        
        // Set animation if we have from and to (only for opponent moves, not user's own moves)
        // User's own moves are already shown instantly via optimistic update
        if (message.from !== undefined && message.to !== undefined && !wasOurMove) {
          setAnimatingPiece({ from: message.from, to: message.to });
          setLastMove({ from: message.from, to: message.to });
          // Clear animation after it completes - faster 100ms animation
          setTimeout(() => {
            setAnimatingPiece(null);
          }, 100);
        } else if (message.from !== undefined && message.to !== undefined) {
          // Our move - just update last move, no animation needed
          setLastMove({ from: message.from, to: message.to });
        }
        
        // Check for promotion before updating board
        let wasPromotion = false;
        if (message.from !== undefined && message.to !== undefined) {
          const fromPiece = board[message.from];
          const toPiece = message.board[message.to];
          // Check if piece became a king (promotion)
          if (fromPiece && toPiece) {
            const wasKing = fromPiece === 'R' || fromPiece === 'B';
            const isNowKing = toPiece === 'R' || toPiece === 'B';
            wasPromotion = !wasKing && isNowKing;
          }
        }
        
        // Clear pending move since server confirmed it
        if (wasOurMove) {
          setPendingMove(null);
        }
        
        setBoard(message.board);
        if (message.nextTurn) {
          const wasMyTurn = currentTurn === yourColor;
          const hadCaptures = (message.capturesRed !== undefined && message.capturesRed > capturesRed) || 
                             (message.capturesBlack !== undefined && message.capturesBlack > capturesBlack);
          
          // Determine if this was our move or opponent's move (for sound)
          const wasOurMoveForSound = wasMyTurn;
          
          // Play move sound (self or opponent)
          if (wasOurMoveForSound) {
            playSound('move-self');
          } else {
            playSound('move-opponent');
          }
          
          // Play capture sound if there was a capture
          if (hadCaptures) {
            playSound('capture');
            if ('vibrate' in navigator) {
              navigator.vibrate(30);
            }
          }
          
          // Play promotion sound if piece was promoted
          if (wasPromotion) {
            playSound('promote');
          }
          
          setCurrentTurn(message.nextTurn);
          
          // Play sound if it's now my turn (opponent just moved)
          if (message.nextTurn === yourColor && !wasMyTurn) {
            if ('vibrate' in navigator) {
              navigator.vibrate([50, 30, 50]);
            }
          }
        }
        if (message.canContinueJump !== undefined) {
          setCanContinueJump(message.canContinueJump);
        }
        if (message.continueJumpFrom !== undefined) {
          setContinueJumpFrom(message.continueJumpFrom);
        }
        // Always update captures, even if 0
        if (message.capturesRed !== undefined) {
          setCapturesRed(message.capturesRed);
          console.log('MOVE_ACCEPTED: Updated capturesRed to:', message.capturesRed);
        }
        if (message.capturesBlack !== undefined) {
          setCapturesBlack(message.capturesBlack);
          console.log('MOVE_ACCEPTED: Updated capturesBlack to:', message.capturesBlack);
        }
        if (message.moveTimeRemaining !== undefined) {
          setMoveTimeRemaining(message.moveTimeRemaining);
        }
        // Only clear selection if not continuing a jump
        // Keep legal moves visible until user clicks another piece
        if (!message.canContinueJump) {
          // Clear selected square since piece moved, but keep legal moves visible
          // They'll be cleared/updated when user selects another piece
          setSelectedSquare(null);
          // Don't clear legalMoves - they'll stay visible until user selects another piece
        }
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
        
        // Revert optimistic update
        if (pendingMove) {
          setBoard(pendingMove.board);
          setPendingMove(null);
        }
        
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
        playSound('game-end');
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
        // Rematch, reconnection, or rejoin - reset/update game state
        setMatchId(message.matchId);
        setBoard(message.board);
        setCurrentTurn(message.nextTurn || 'red'); // Use current turn from server
        setSelectedSquare(null);
        setLegalMoves([]);
        setWinner(null);
        setCanContinueJump(false);
        setContinueJumpFrom(null);
        setError(null);
        setShowRematch(false);
        setLastMove(null);
        setAnimatingPiece(null);
        setIsLeaving(false); // Cancel leave state if rejoining
        setLeaveTimeRemaining(0);
        // Play game start sound
        playSound('game-start');
        if (message.capturesRed !== undefined) {
          setCapturesRed(message.capturesRed);
        }
        if (message.capturesBlack !== undefined) {
          setCapturesBlack(message.capturesBlack);
        }
        // Always update captures, even if 0
        if (message.capturesRed !== undefined) {
          setCapturesRed(message.capturesRed);
          console.log('GAME_START: Updated capturesRed to:', message.capturesRed);
        }
        if (message.capturesBlack !== undefined) {
          setCapturesBlack(message.capturesBlack);
          console.log('GAME_START: Updated capturesBlack to:', message.capturesBlack);
        }
        if (message.moveTimeRemaining !== undefined) {
          setMoveTimeRemaining(message.moveTimeRemaining);
        }
        if (leaveCountdownRef.current) {
          clearInterval(leaveCountdownRef.current);
          leaveCountdownRef.current = null;
        }
        // Load chat history from localStorage for this match
        const savedChat = localStorage.getItem(`chat_${message.matchId}`);
        if (savedChat) {
          try {
            setChatMessages(JSON.parse(savedChat));
          } catch {
            // Ignore parse errors
          }
        }
        // Don't clear chat on rejoin - keep chat history
        if (message.opponentNickname) {
          setOpponentNickname(message.opponentNickname);
        }
        // Clear any pending timeouts
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
          moveTimeoutRef.current = null;
        }
      }
    };

    const handleChatMessage = (message: ServerMessage) => {
      if (message.type === 'CHAT_MESSAGE' && message.senderNickname && message.message) {
        // Check if this is our own message by comparing nickname
        const isOwn = nickname ? message.senderNickname === nickname : false;
        setChatMessages(prev => {
          const newMessages = [...prev, {
            senderNickname: message.senderNickname!,
            message: message.message!,
            timestamp: message.timestamp || Date.now(),
            isOwn
          }];
          // Save to localStorage
          localStorage.setItem(`chat_${matchId}`, JSON.stringify(newMessages));
          return newMessages;
        });
      }
    };

    const handleMatchLeaving = (message: ServerMessage) => {
      if (message.type === 'MATCH_LEAVING' && message.matchId) {
        // This message is received when user is already back at hub
        // The countdown is handled by the server, but we can show a notification
        // The match will appear in lobby list with "Current Match" label
        console.log('Match leaving - 30 second grace period started');
      }
    };

    checkersWebSocketService.on('MOVE_ACCEPTED', handleMoveAccepted);
    checkersWebSocketService.on('MOVE_REJECTED', handleMoveRejected);
    checkersWebSocketService.on('GAME_OVER', handleGameOver);
    checkersWebSocketService.on('PLAYER_DISCONNECTED', handlePlayerDisconnected);
    checkersWebSocketService.on('REMATCH_REQUEST', handleRematchRequest);
    checkersWebSocketService.on('GAME_START', handleGameStart);
    checkersWebSocketService.on('CHAT_MESSAGE', handleChatMessage);
    checkersWebSocketService.on('MATCH_LEAVING', handleMatchLeaving);

    return () => {
      checkersWebSocketService.off('MOVE_ACCEPTED', handleMoveAccepted);
      checkersWebSocketService.off('MOVE_REJECTED', handleMoveRejected);
      checkersWebSocketService.off('GAME_OVER', handleGameOver);
      checkersWebSocketService.off('PLAYER_DISCONNECTED', handlePlayerDisconnected);
      checkersWebSocketService.off('REMATCH_REQUEST', handleRematchRequest);
      checkersWebSocketService.off('GAME_START', handleGameStart);
      checkersWebSocketService.off('CHAT_MESSAGE', handleChatMessage);
      checkersWebSocketService.off('MATCH_LEAVING', handleMatchLeaving);
      // Clear leave countdown on unmount
      if (leaveCountdownRef.current) {
        clearInterval(leaveCountdownRef.current);
      }
      // Clear timeouts on unmount
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      if (moveTimerRef.current) {
        clearInterval(moveTimerRef.current);
      }
    };
  }, [nickname]);

  // Move timer countdown
  useEffect(() => {
    if (currentTurn === yourColor && !winner && moveTimeRemaining > 0) {
      moveTimerRef.current = setInterval(() => {
        setMoveTimeRemaining(prev => {
          if (prev <= 1) {
            if (moveTimerRef.current) {
              clearInterval(moveTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (moveTimerRef.current) {
        clearInterval(moveTimerRef.current);
        moveTimerRef.current = null;
      }
    }
    
    return () => {
      if (moveTimerRef.current) {
        clearInterval(moveTimerRef.current);
      }
    };
  }, [currentTurn, yourColor, winner, moveTimeRemaining]);

  // Play 10 seconds warning sound
  useEffect(() => {
    if (currentTurn === yourColor && !winner && moveTimeRemaining === 10) {
      playSound('tenseconds');
    }
  }, [moveTimeRemaining, currentTurn, yourColor, winner]);

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

  const getSquareColor = (index: number, isSelected: boolean, isLegalMove: boolean, isMandatoryCapture: boolean, isLastMove: boolean): string => {
    if (isSelected) return 'bg-yellow-500/50';
    // Mandatory captures should show even if it's also a legal move for selected piece
    if (isMandatoryCapture) return 'bg-blue-500/60 border-2 border-blue-400';
    // Don't change background for legal moves - just show dots
    // Highlight last move destination square only
    if (isLastMove) return 'bg-purple-500/40 border-2 border-purple-400';
    const { row, col } = indexToPos(index);
    return isDarkSquare(row, col) ? 'bg-amber-900' : 'bg-amber-50';
  };

  const indexToPos = (index: number): { row: number; col: number } => {
    return {
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
    };
  };

  // Calculate relative position for animation (using display indices to respect board flip)
  const getRelativePosition = (fromBoardIndex: number, toBoardIndex: number): { x: number; y: number } => {
    // Convert board indices to display indices to respect board flip
    const fromDisplayIndex = boardIndexToDisplayIndex(fromBoardIndex);
    const toDisplayIndex = boardIndexToDisplayIndex(toBoardIndex);
    const fromPos = indexToPos(fromDisplayIndex);
    const toPos = indexToPos(toDisplayIndex);
    // Calculate difference in rows and columns
    // Since each square is 1/8 of the board, the difference in percentage is:
    const rowDiff = fromPos.row - toPos.row; // Negative means moving down
    const colDiff = fromPos.col - toPos.col; // Negative means moving right
    // Return as percentage offset (negative means coming from that direction)
    return {
      x: colDiff * 100,
      y: rowDiff * 100,
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

  // Auto-select piece and calculate moves when canContinueJump becomes true
  useEffect(() => {
    if (canContinueJump && continueJumpFrom !== null && currentTurn === yourColor) {
      setSelectedSquare(continueJumpFrom);
      const moves = calculateLegalMoves(continueJumpFrom);
      setLegalMoves(moves);
      console.log('Auto-selected piece for continuing jump at', continueJumpFrom, 'with moves:', moves);
    }
  }, [canContinueJump, continueJumpFrom, currentTurn, yourColor, calculateLegalMoves]);

  // Get board-relative position from client coordinates
  const getBoardRelativePosition = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!boardContainerRef.current) return null;
    const rect = boardContainerRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Get square index from board-relative position
  const getSquareFromPosition = useCallback((x: number, y: number): number | null => {
    if (!boardContainerRef.current) return null;
    const rect = boardContainerRef.current.getBoundingClientRect();
    const boardSize = Math.min(rect.width, rect.height);
    const squareSize = boardSize / BOARD_SIZE;
    const col = Math.floor(x / squareSize);
    const row = Math.floor(y / squareSize);
    
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return null;
    }
    
    const displayIndex = row * BOARD_SIZE + col;
    return displayIndexToBoardIndex(displayIndex);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((index: number, clientX: number, clientY: number) => {
    const piece = board[index];
    if (!piece) return;
    
    const pieceColor = (piece === 'r' || piece === 'R') ? 'red' : 'black';
    if (pieceColor !== currentTurn) return;
    if (currentTurn !== yourColor) return;
    if (winner) return;

    // Check if we can continue jump
    if (canContinueJump && continueJumpFrom !== null && index !== continueJumpFrom) {
      setError('You must continue your jump from the highlighted piece');
      return;
    }

    const pos = getBoardRelativePosition(clientX, clientY);
    if (!pos) return;

    setDraggingPiece({ boardIndex: index, piece });
    setDragPosition(pos);
    setHasDragged(false);
    setSelectedSquare(index);
    const moves = calculateLegalMoves(index);
    setLegalMoves(moves);
  }, [board, currentTurn, yourColor, winner, canContinueJump, continueJumpFrom, getBoardRelativePosition, calculateLegalMoves]);

  // Handle drag move
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!draggingPiece) return;
    setHasDragged(true); // Mark that we've moved
    const pos = getBoardRelativePosition(clientX, clientY);
    if (pos) {
      setDragPosition(pos);
    }
  }, [draggingPiece, getBoardRelativePosition]);

  // Handle drag end
  const handleDragEnd = useCallback((clientX: number, clientY: number) => {
    if (!draggingPiece) {
      setDraggingPiece(null);
      setDragPosition(null);
      setHasDragged(false);
      return;
    }

    const currentDraggingPiece = draggingPiece;
    
    setDraggingPiece(null);
    setDragPosition(null);
    setHasDragged(false);

    const pos = getBoardRelativePosition(clientX, clientY);
    if (!pos) {
      // If we can't get position, keep the piece selected with legal moves visible
      setSelectedSquare(currentDraggingPiece.boardIndex);
      const moves = calculateLegalMoves(currentDraggingPiece.boardIndex);
      setLegalMoves(moves);
      return;
    }

    const dropIndex = getSquareFromPosition(pos.x, pos.y);
    
    // If dropped on a different square, try to make the move
    if (dropIndex !== null && dropIndex !== currentDraggingPiece.boardIndex) {
      // Check if it's a valid move - ONLY update board if move is confirmed legal
      const moves = calculateLegalMoves(currentDraggingPiece.boardIndex);
      if (moves.includes(dropIndex)) {
        // Only do optimistic update for confirmed legal moves
        const newBoard = [...board];
        const piece = newBoard[currentDraggingPiece.boardIndex];
        newBoard[currentDraggingPiece.boardIndex] = null;
        newBoard[dropIndex] = piece;
        
        // Check for king promotion
        const { row } = indexToPos(dropIndex);
        if (piece === 'r' && row === 0) {
          newBoard[dropIndex] = 'R'; // Promote to king
        } else if (piece === 'b' && row === BOARD_SIZE - 1) {
          newBoard[dropIndex] = 'B'; // Promote to king
        }
        
        // Save original board for potential revert
        setPendingMove({ from: currentDraggingPiece.boardIndex, to: dropIndex, board: [...board] });
        
        // Update board instantly (no animation for user's own moves)
        setBoard(newBoard);
        
        // Send move to server with 50ms delay for smooth feel
        setTimeout(() => {
          checkersWebSocketService.makeMove(matchId, currentDraggingPiece.boardIndex, dropIndex);
        }, 50);
        
        setError(null);
        setMandatoryCaptures([]);
        // Clear legal moves immediately after making a move
        setLegalMoves([]);
        setSelectedSquare(null);
        
        // Clear any existing timeout
        if (moveTimeoutRef.current) {
          clearTimeout(moveTimeoutRef.current);
        }
        // Set a timeout to show error if no response
        moveTimeoutRef.current = setTimeout(() => {
          setSelectedSquare(current => {
            if (current === currentDraggingPiece.boardIndex) {
              console.warn('No response from server after 3 seconds');
              setError('No response from server. Check connection.');
            }
            return current;
          });
          moveTimeoutRef.current = null;
        }, 3000);
      } else {
        // Invalid move - keep piece selected and legal moves visible, no error message
        // DO NOT update board - only update for legal moves
        setSelectedSquare(currentDraggingPiece.boardIndex);
        setLegalMoves(moves);
        setMandatoryCaptures([]);
      }
    } else {
      // Dropped on same square or invalid position - keep piece selected with legal moves
      setSelectedSquare(currentDraggingPiece.boardIndex);
      const moves = calculateLegalMoves(currentDraggingPiece.boardIndex);
      setLegalMoves(moves);
    }
  }, [draggingPiece, getBoardRelativePosition, getSquareFromPosition, calculateLegalMoves, matchId, calculateAllMandatoryCaptures]);

  // Mouse event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingPiece) {
        e.preventDefault();
        handleDragMove(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggingPiece) {
        if (hasDragged) {
          // We actually dragged - handle drag end
          e.preventDefault();
          handleDragEnd(e.clientX, e.clientY);
        } else {
          // We didn't drag - it was just a click
          // Clear dragging state to allow onClick to work
          // Don't prevent default - let onClick fire
          setDraggingPiece(null);
          setDragPosition(null);
          setHasDragged(false);
        }
      }
    };

    if (draggingPiece) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingPiece, handleDragMove, handleDragEnd, hasDragged]);

  // Touch event handlers
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (draggingPiece && e.touches.length > 0) {
        e.preventDefault(); // Prevent scrolling while dragging
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (draggingPiece) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        if (touch) {
          handleDragEnd(touch.clientX, touch.clientY);
        }
      }
    };

    if (draggingPiece) {
      document.body.style.userSelect = 'none';
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });
      return () => {
        document.body.style.userSelect = '';
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [draggingPiece, handleDragMove, handleDragEnd]);

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

    // Haptic feedback on click
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    if (canContinueJump && continueJumpFrom !== null) {
      // If we have the piece selected and click on a legal move, make the move
      if (selectedSquare === continueJumpFrom) {
        const moves = calculateLegalMoves(continueJumpFrom);
        if (moves.includes(index)) {
          // This is a legal move, proceed to make it
          console.log('Making continued jump from', selectedSquare, 'to', index);
          checkersWebSocketService.makeMove(matchId, selectedSquare, index);
          setError(null);
          setMandatoryCaptures([]);
          // Clear any existing timeout
          if (moveTimeoutRef.current) {
            clearTimeout(moveTimeoutRef.current);
          }
          // Set a timeout to show error if no response
          moveTimeoutRef.current = setTimeout(() => {
            setSelectedSquare(current => {
              if (current === selectedSquare) {
                console.warn('No response from server after 3 seconds');
                setError('No response from server. Check connection.');
              }
              return current;
            });
            moveTimeoutRef.current = null;
          }, 3000);
          return;
        }
      }
      // If clicking on continueJumpFrom, select it
      if (index === continueJumpFrom) {
        setSelectedSquare(continueJumpFrom);
        const moves = calculateLegalMoves(continueJumpFrom);
        setLegalMoves(moves);
        console.log('Selected piece for continuing jump at', continueJumpFrom, 'with moves:', moves);
        return;
      }
      // If we don't have the piece selected and click elsewhere, show error
      if (selectedSquare !== continueJumpFrom) {
        setError('You must continue your jump from the highlighted piece');
        // Auto-select the piece that must continue jumping
        setSelectedSquare(continueJumpFrom);
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
        // No error message if no legal moves, just select the piece
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
        // ONLY update board if move is confirmed legal - no optimistic updates for illegal moves
        console.log('Attempting move - Selected:', selectedSquare, 'Target:', index, 'Legal moves:', legalMoves);
        if (legalMoves.length > 0 && legalMoves.includes(index)) {
          // Move is legal - do optimistic update
          console.log('Making move from', selectedSquare, 'to', index);
          console.log('Socket connected?', checkersWebSocketService.isConnected());
          const fromSquare = selectedSquare; // Capture value for timeout check
          
          // Optimistically update board instantly (chess.com style) - ONLY for legal moves
          const newBoard = [...board];
          const piece = newBoard[selectedSquare];
          newBoard[selectedSquare] = null;
          newBoard[index] = piece;
          
          // Check for king promotion
          const { row } = indexToPos(index);
          if (piece === 'r' && row === 0) {
            newBoard[index] = 'R'; // Promote to king
          } else if (piece === 'b' && row === BOARD_SIZE - 1) {
            newBoard[index] = 'B'; // Promote to king
          }
          
          // Save original board for potential revert
          setPendingMove({ from: selectedSquare, to: index, board: [...board] });
          
          // Update board instantly (no animation for user's own moves)
          setBoard(newBoard);
          
          // Send move to server
          checkersWebSocketService.makeMove(matchId, selectedSquare, index);
          setError(null);
          setMandatoryCaptures([]);
          // Clear legal moves immediately after making a move
          setLegalMoves([]);
          setSelectedSquare(null);
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
          // Just clear selection, no error message
          setSelectedSquare(null);
          setLegalMoves([]);
          setMandatoryCaptures([]);
        } else {
          // Invalid move - just clear selection and legal moves, no error message
          console.log('Invalid move - clearing selection');
          setSelectedSquare(null);
          setLegalMoves([]);
          setMandatoryCaptures([]);
        }
      }
    }
  }, [board, selectedSquare, yourColor, currentTurn, canContinueJump, continueJumpFrom, winner, matchId, legalMoves, calculateLegalMoves, calculateAllMandatoryCaptures]);

  const handleRematch = () => {
    // Use current matchId from state
    checkersWebSocketService.acceptRematch(matchId);
    setShowRematch(false);
  };

  const handleLeave = () => {
    // Start 30-second leave grace period
    checkersWebSocketService.leaveMatch(matchId);
    // Navigate to hub so user can see "Current Match" in lobby list
    // The server will send MATCH_LEAVING message and update lobby list
    // Don't clear gameState yet - let the hub show the current match
    onLeave();
  };

  const handleRejoinMatch = () => {
    // Cancel leave and rejoin
    if (leaveCountdownRef.current) {
      clearInterval(leaveCountdownRef.current);
      leaveCountdownRef.current = null;
    }
    setIsLeaving(false);
    setLeaveTimeRemaining(0);
    checkersWebSocketService.rejoinMatch(matchId);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && matchId) {
      checkersWebSocketService.sendChatMessage(matchId, chatInput.trim());
      setChatInput('');
    }
  };

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  }, [chatMessages]);

  const renderSquare = (displayIndex: number) => {
    // Convert display index to board index
    const boardIndex = displayIndexToBoardIndex(displayIndex);
    const piece = board[boardIndex];
    const isSelected = selectedSquare === boardIndex;
    const isLegalMove = legalMoves.includes(boardIndex);
    const isMandatoryCapture = mandatoryCaptures.includes(boardIndex);
    // Show both from and to squares of the absolute last move (either mine or opponent's)
    const isLastMoveSquare = lastMove !== null && (lastMove.from === boardIndex || lastMove.to === boardIndex);
    const isAnimatingFrom = animatingPiece !== null && animatingPiece.from === boardIndex;
    const isAnimatingTo = animatingPiece !== null && animatingPiece.to === boardIndex;
    
    // Debug log for mandatory captures
    if (isMandatoryCapture) {
      console.log('Rendering mandatory capture at displayIndex:', displayIndex, 'boardIndex:', boardIndex, 'mandatoryCaptures:', mandatoryCaptures);
    }
    const colorClass = getSquareColor(boardIndex, isSelected, isLegalMove, isMandatoryCapture, isLastMoveSquare);

    const isDragging = draggingPiece?.boardIndex === boardIndex;

    return (
      <div
        key={displayIndex}
        onMouseDown={(e) => {
          if (piece && !draggingPiece && currentTurn === yourColor) {
            const pieceColor = (piece === 'r' || piece === 'R') ? 'red' : 'black';
            if (pieceColor === yourColor) {
              // Start drag operation - will be cancelled if user doesn't drag
              e.stopPropagation();
              handleDragStart(boardIndex, e.clientX, e.clientY);
            }
          }
        }}
        onTouchStart={(e) => {
          if (piece && !draggingPiece && e.touches.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            handleDragStart(boardIndex, touch.clientX, touch.clientY);
          }
        }}
        onClick={(e) => {
          // Handle click for selection - only if we didn't actually drag
          // If hasDragged is false, it means it was just a click, not a drag
          // Clear dragging state first to allow selection to work
          if (!hasDragged) {
            e.preventDefault();
            e.stopPropagation();
            // Clear dragging state if it was set by mousedown (click without drag)
            setDraggingPiece(null);
            setDragPosition(null);
            setHasDragged(false);
            console.log('Square clicked - displayIndex:', displayIndex, 'boardIndex:', boardIndex, 'Piece:', piece, 'Selected:', selectedSquare, 'Legal moves:', legalMoves);
            // Convert display index back to board index for handling
            handleSquareClick(boardIndex);
          }
        }}
        className={`${colorClass} aspect-square flex items-center justify-center transition-all active:scale-95 sm:hover:scale-105 border-2 touch-manipulation ${
          piece && !draggingPiece && currentTurn === yourColor && ((piece === 'r' || piece === 'R') ? 'red' : 'black') === yourColor
            ? 'cursor-grab active:cursor-grabbing' 
            : 'cursor-pointer'
        } ${
          isSelected ? 'border-yellow-400' : 
          isMandatoryCapture ? 'border-blue-400' : 
          isLastMoveSquare ? 'border-purple-400' : 
          'border-transparent'
        }`}
        style={{ position: 'relative', zIndex: isAnimatingTo ? 9998 : isDragging ? 9999 : 1 }}
      >
        {piece && (() => {
          const display = getPieceDisplay(piece);
          // If this is animating (from or to), hide the piece (it's rendered as overlay)
          if (isAnimatingFrom || isAnimatingTo) {
            return null;
          }
          // If this piece is being dragged, hide it (it's rendered as overlay)
          if (isDragging) {
            return null;
          }
          
          return (
            <div 
              className="relative flex items-center justify-center pointer-events-none select-none w-full h-full"
            >
              <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl filter drop-shadow-lg relative z-10">{display.emoji}</span>
              {display.isKing && (
                <span className="text-sm sm:text-base md:text-lg lg:text-xl absolute -top-0.5 sm:-top-1 left-1/2 transform -translate-x-1/2 filter drop-shadow-lg z-20">👑</span>
              )}
            </div>
          );
        })()}
        {/* Show little circle for legal moves */}
        {isLegalMove && !piece && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full bg-gray-600/60"></div>
          </div>
        )}
      </div>
    );
  };

  // Determine opponent color
  const opponentColor = yourColor === 'red' ? 'black' : 'red';
  const opponentDisplayName = opponentNickname ? `Opponent: ${opponentNickname}` : 'Opponent';
  const currentPlayerDisplayName = nickname || 'You';

  return (
    <div className="h-screen bg-slate-900 p-1 sm:p-2 overflow-hidden flex flex-col">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
        {/* Desktop Layout: Board Left, Chat Right */}
        <div className="flex flex-col lg:flex-row gap-2 flex-1 min-h-0 overflow-hidden">
          {/* Left Section: Board Area */}
          <div className="flex-1 lg:flex-[0_0_65%] min-w-0 flex flex-col">
            <div className="bg-slate-800 rounded-lg p-2 sm:p-3 lg:p-4 h-full flex flex-col min-h-0">
              {/* Top Bar with Settings */}
              <div className="flex justify-between items-center mb-1 sm:mb-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Checkers</h2>
                  {currentTurn === yourColor && !winner && (
                    <span className="text-[10px] sm:text-xs text-green-400 bg-green-400/20 px-1.5 py-0.5 rounded animate-pulse">
                      It's your turn now!
                    </span>
                  )}
                  {canContinueJump && (
                    <span className="text-[10px] sm:text-xs text-yellow-400 bg-yellow-400/20 px-1.5 py-0.5 rounded">
                      Continue jump!
                    </span>
                  )}
                  {isLeaving && (
                    <span className="text-[10px] sm:text-xs text-orange-400 bg-orange-400/20 px-1.5 py-0.5 rounded">
                      Leaving in {leaveTimeRemaining}s
                    </span>
                  )}
                </div>
                {isLeaving ? (
                  <Button onClick={handleRejoinMatch} variant="secondary" size="sm" className="!p-1.5 sm:!p-2">
                    Rejoin
                  </Button>
                ) : (
                  <Button onClick={handleLeave} variant="danger" size="sm" className="!p-1.5 sm:!p-2">
                    <X size={16} className="sm:w-4 sm:h-4" />
                  </Button>
                )}
              </div>

              {/* Opponent Info (Top) */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-2 flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm sm:text-base flex-shrink-0">
                  {opponentColor === 'red' ? '🔴' : '⚫'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-white truncate">{opponentDisplayName}</span>
                    <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      opponentColor === 'red' 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {opponentColor === 'red' ? 'Red' : 'Black'}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-0.5">
                      {opponentColor === 'red' ? '🔴' : '⚫'} {(opponentColor === 'red' ? capturesRed : capturesBlack) || 0}
                    </span>
                    {currentTurn === opponentColor && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Board - Takes remaining space */}
              <div className="flex-1 min-h-0 flex items-center justify-center" style={{ position: 'relative' }}>
                <div 
                  ref={boardContainerRef}
                  className="grid grid-cols-8 gap-0 bg-amber-800 p-0.5 sm:p-1 rounded-lg w-full max-w-full" 
                  style={{ 
                    position: 'relative', 
                    zIndex: 0, 
                    aspectRatio: '1',
                    maxHeight: '100%',
                    width: '100%',
                    height: 'auto'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => renderSquare(i))}
                  {/* Dragged piece overlay - follows cursor/touch */}
                  {draggingPiece && dragPosition && boardContainerRef.current && (() => {
                    const display = getPieceDisplay(draggingPiece.piece);
                    const rect = boardContainerRef.current!.getBoundingClientRect();
                    const boardSize = Math.min(rect.width, rect.height);
                    const squareSize = boardSize / BOARD_SIZE;
                    
                    return (
                      <div
                        className="absolute pointer-events-none select-none flex items-center justify-center"
                        style={{
                          left: `${dragPosition.x}px`,
                          top: `${dragPosition.y}px`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 10001,
                          width: `${squareSize}px`,
                          height: `${squareSize}px`,
                        }}
                      >
                        <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl filter drop-shadow-lg relative z-10">{display.emoji}</span>
                        {display.isKing && (
                          <span className="text-sm sm:text-base md:text-lg lg:text-xl absolute -top-0.5 sm:-top-1 left-1/2 transform -translate-x-1/2 filter drop-shadow-lg z-20">👑</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                {/* Animated piece overlay - renders above everything when moving */}
                {animatingPiece && (() => {
                  const fromDisplayIndex = boardIndexToDisplayIndex(animatingPiece.from);
                  const toDisplayIndex = boardIndexToDisplayIndex(animatingPiece.to);
                  const fromPos = indexToPos(fromDisplayIndex);
                  const toPos = indexToPos(toDisplayIndex);
                  const piece = board[animatingPiece.to] || board[animatingPiece.from];
                  if (!piece) return null;
                  const display = getPieceDisplay(piece);
                  
                  // Calculate position as percentage of board size
                  const squareSizePercent = 100 / BOARD_SIZE;
                  const startX = (fromPos.col * squareSizePercent) + (squareSizePercent / 2);
                  const startY = (fromPos.row * squareSizePercent) + (squareSizePercent / 2);
                  
                  // Calculate movement distance in squares (positive means moving right/down)
                  const rowDiff = toPos.row - fromPos.row;
                  const colDiff = toPos.col - fromPos.col;
                  
                  // Convert to percentage of square size (each square is 100% of square size)
                  // Multiply by 100 to get percentage of the element's own width/height
                  const moveXPercent = colDiff * 100;
                  const moveYPercent = rowDiff * 100;
                  
                  return (
                    <div
                      className="absolute pointer-events-none select-none flex items-center justify-center"
                      style={{
                        left: `${startX}%`,
                        top: `${startY}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10000,
                        width: `${squareSizePercent}%`,
                        height: `${squareSizePercent}%`,
                        animation: 'pieceMoveOverlay 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
                        animationFillMode: 'forwards',
                        '--move-x': `${moveXPercent}%`,
                        '--move-y': `${moveYPercent}%`,
                      } as React.CSSProperties & { '--move-x': string; '--move-y': string }}
                    >
                      <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl filter drop-shadow-lg relative z-10">{display.emoji}</span>
                      {display.isKing && (
                        <span className="text-sm sm:text-base md:text-lg lg:text-xl absolute -top-0.5 sm:-top-1 left-1/2 transform -translate-x-1/2 filter drop-shadow-lg z-20">👑</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Current Player Info (Bottom) */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2 flex-shrink-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm sm:text-base flex-shrink-0">
                  {yourColor === 'red' ? '🔴' : '⚫'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-white truncate">{currentPlayerDisplayName}</span>
                    <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      yourColor === 'red' 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {yourColor === 'red' ? 'Red' : 'Black'}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-0.5">
                      {yourColor === 'red' ? '🔴' : '⚫'} {(yourColor === 'red' ? capturesRed : capturesBlack) || 0}
                    </span>
                    {currentTurn === yourColor && (
                      <>
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                        <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                          moveTimeRemaining <= 10 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {moveTimeRemaining}s
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Winner/Rematch Messages - Only show if game ended */}
              {winner && (
                <div className="mt-1.5 sm:mt-2 p-2 sm:p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-center flex-shrink-0">
                  <p className="text-sm sm:text-base font-bold text-green-400 mb-1">
                    {winner === yourColor ? '🎉 You Win!' : '😔 You Lost'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 justify-center mt-2">
                    <Button onClick={handleRematch} size="sm" className="w-full sm:w-auto text-xs sm:text-sm py-1.5">Play Again</Button>
                    <Button onClick={handleLeave} variant="danger" size="sm" className="w-full sm:w-auto text-xs sm:text-sm py-1.5">Leave</Button>
                  </div>
                </div>
              )}

              {showRematch && !winner && (
                <div className="mt-1.5 sm:mt-2 text-center flex-shrink-0">
                  <p className="text-white text-xs sm:text-sm mb-2">Opponent wants to play again!</p>
                  <Button onClick={handleRematch} size="sm" className="w-full sm:w-auto text-xs sm:text-sm py-1.5">Accept Rematch</Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Chat Sidebar */}
          <div className="lg:flex-[0_0_35%] min-w-0 flex flex-col">
            <div className="bg-slate-800 rounded-lg p-2 sm:p-3 h-full flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                <h3 className="text-sm sm:text-base font-semibold text-white">Chat</h3>
                {opponentDisconnected && (
                  <span className="text-[10px] sm:text-xs text-yellow-400">Reconnecting...</span>
                )}
              </div>

              {/* Chat Messages - Scrollable, fills available space on desktop, fixed larger height on mobile */}
              <div 
                className="bg-slate-900 rounded-lg p-1.5 sm:p-2 mb-2 overflow-y-auto flex-shrink-0 h-[180px] lg:flex-1 lg:min-h-0"
              >
                {chatMessages.length === 0 ? (
                  <p className="text-[10px] sm:text-xs text-slate-400 text-center py-4">No messages yet. Start chatting!</p>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`text-[10px] sm:text-xs text-slate-400 mb-0.5 ${msg.isOwn ? 'text-right' : 'text-left'}`}>
                          {msg.senderNickname}
                        </div>
                        <div
                          className={`max-w-[85%] rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-sm sm:text-base break-words ${
                            msg.isOwn
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-700 text-slate-100'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    ))}
                    <div ref={chatMessagesEndRef} />
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 touch-manipulation"
                  maxLength={200}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!chatInput.trim()}
                  className="touch-manipulation !px-2 sm:!px-3 !py-1.5 sm:!py-2 text-xs sm:text-sm"
                >
                  Send
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Error Overlay */}
      {error && (
        <div className="fixed top-2 sm:top-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 z-50 p-2 sm:p-3 bg-red-500/90 border border-red-500 rounded-lg text-red-100 text-xs sm:text-sm shadow-2xl max-w-md mx-auto">
          {error}
        </div>
      )}
    </div>
  );
};


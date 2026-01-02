// Offline game service - handles local game logic without server
import { Board, Color, Piece } from '../types/checkers';
import {
  createInitialBoard,
  validateMove,
  applyMove,
  canContinueJump,
  checkGameOver,
  getLegalMoves,
  BOARD_ARRAY_SIZE,
  indexToPos,
  getPieceColor,
  isKing,
} from '../server/checkersEngine';

// Helper to find all pieces that can capture
function findCapturingPieces(board: Board, currentTurn: Color): number[] {
  const capturingPieces: number[] = [];
  for (let i = 0; i < BOARD_ARRAY_SIZE; i++) {
    const piece = board[i];
    if (piece !== null) {
      const pieceColor = getPieceColor(piece);
      if (pieceColor === currentTurn) {
        const moves = getLegalMoves(board, i, currentTurn);
        // If legal moves exist and they're captures (distance > 1 for regular pieces, or check if it's a capture)
        if (moves.length > 0) {
          // Check if any move is a capture by checking distance
          for (const moveTo of moves) {
            const { row: fromRow, col: fromCol } = indexToPos(i);
            const { row: toRow, col: toCol } = indexToPos(moveTo);
            const rowDiff = Math.abs(toRow - fromRow);
            const colDiff = Math.abs(toCol - fromCol);
            // Captures are at least 2 squares away
            if (rowDiff >= 2 && colDiff >= 2) {
              capturingPieces.push(i);
              break;
            }
          }
        }
      }
    }
  }
  return capturingPieces;
}

export interface OfflineGameState {
  board: Board;
  currentTurn: Color;
  winner: Color | null;
  canContinueJump: boolean;
  continueJumpFrom: number | null;
  capturesRed: number;
  capturesBlack: number;
}

export class OfflineGameService {
  private gameState: OfflineGameState;

  constructor() {
    this.gameState = {
      board: createInitialBoard(),
      currentTurn: 'red',
      winner: null,
      canContinueJump: false,
      continueJumpFrom: null,
      capturesRed: 0,
      capturesBlack: 0,
    };
  }

  getState(): OfflineGameState {
    return { ...this.gameState };
  }

  makeMove(from: number, to: number): { success: boolean; error?: string; gameOver?: boolean } {
    if (this.gameState.winner) {
      return { success: false, error: 'Game is over' };
    }

    // Validate move
    const validation = validateMove(
      this.gameState.board,
      from,
      to,
      this.gameState.currentTurn,
      this.gameState.canContinueJump,
      this.gameState.continueJumpFrom
    );

    if (!validation.valid) {
      return { success: false, error: validation.reason || 'Invalid move' };
    }

    // Apply move
    const result = applyMove(
      this.gameState.board,
      from,
      to,
      this.gameState.currentTurn,
      validation.captures || []
    );

    // Update board
    this.gameState.board = result.newBoard;

    // Update capture counts
    if (result.captures.length > 0) {
      if (this.gameState.currentTurn === 'red') {
        this.gameState.capturesRed += result.captures.length;
      } else {
        this.gameState.capturesBlack += result.captures.length;
      }
    }

    // Check if piece can continue jumping
    const canContinue = canContinueJump(result.newBoard, to, this.gameState.currentTurn);

    if (canContinue) {
      // Must continue jumping
      this.gameState.canContinueJump = true;
      this.gameState.continueJumpFrom = to;
    } else {
      // Turn ends, switch to opponent
      this.gameState.canContinueJump = false;
      this.gameState.continueJumpFrom = null;
      this.gameState.currentTurn = this.gameState.currentTurn === 'red' ? 'black' : 'red';
    }

    // Check if game is over (check opponent's turn)
    const opponentTurn: Color = this.gameState.currentTurn === 'red' ? 'black' : 'red';
    const gameOverCheck = checkGameOver(result.newBoard, opponentTurn);

    if (gameOverCheck.gameOver) {
      this.gameState.winner = gameOverCheck.winner;
      return { success: true, gameOver: true };
    }

    return { success: true, gameOver: false };
  }

  // Simple AI: makes a random legal move
  makeAIMove(): { from: number; to: number } | null {
    if (this.gameState.winner) {
      return null;
    }

    const currentTurn = this.gameState.currentTurn;
    
    // Find all pieces of the current player
    const playerPieces: number[] = [];
    for (let i = 0; i < BOARD_ARRAY_SIZE; i++) {
      const piece = this.gameState.board[i];
      if (piece !== null) {
        const pieceColor = getPieceColor(piece);
        if (pieceColor === currentTurn) {
          playerPieces.push(i);
        }
      }
    }

    // If must continue jump, only consider the piece that must continue
    if (this.gameState.canContinueJump && this.gameState.continueJumpFrom !== null) {
      const moves = getLegalMoves(
        this.gameState.board,
        this.gameState.continueJumpFrom,
        currentTurn
      );
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        return { from: this.gameState.continueJumpFrom, to: randomMove };
      }
    }

    // Check for mandatory captures first
    const capturingPieces = findCapturingPieces(this.gameState.board, currentTurn);
    if (capturingPieces.length > 0) {
      // Try pieces that can capture
      for (const piecePos of capturingPieces) {
        const moves = getLegalMoves(this.gameState.board, piecePos, currentTurn);
        if (moves.length > 0) {
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          return { from: piecePos, to: randomMove };
        }
      }
    }

    // No mandatory captures, find any legal move
    // Shuffle pieces for randomness
    const shuffledPieces = [...playerPieces].sort(() => Math.random() - 0.5);
    for (const piecePos of shuffledPieces) {
      const moves = getLegalMoves(this.gameState.board, piecePos, currentTurn);
      if (moves.length > 0) {
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        return { from: piecePos, to: randomMove };
      }
    }

    return null;
  }

  reset() {
    this.gameState = {
      board: createInitialBoard(),
      currentTurn: 'red',
      winner: null,
      canContinueJump: false,
      continueJumpFrom: null,
      capturesRed: 0,
      capturesBlack: 0,
    };
  }
}


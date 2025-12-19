// Authoritative checkers game engine (server-side only)

import { Board, Piece, Color } from '../types/checkers';

export const BOARD_SIZE = 8;
export const BOARD_ARRAY_SIZE = 64;

// Initialize a standard checkers board
export function createInitialBoard(): Board {
  const board: Board = new Array(BOARD_ARRAY_SIZE).fill(null);
  
  // Place black pieces (top 3 rows)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row * BOARD_SIZE + col] = 'b';
      }
    }
  }
  
  // Place red pieces (bottom 3 rows)
  for (let row = 5; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 === 1) {
        board[row * BOARD_SIZE + col] = 'r';
      }
    }
  }
  
  return board;
}

// Convert position (row, col) to array index
export function posToIndex(row: number, col: number): number {
  return row * BOARD_SIZE + col;
}

// Convert array index to position (row, col)
export function indexToPos(index: number): { row: number; col: number } {
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
  };
}

// Get piece color
export function getPieceColor(piece: Piece): Color | null {
  if (piece === null) return null;
  return piece.toLowerCase() === 'r' ? 'red' : 'black';
}

// Check if piece is a king
export function isKing(piece: Piece): boolean {
  return piece === 'R' || piece === 'B';
}

// Get all legal moves for a piece
export function getLegalMoves(board: Board, position: number, currentTurn: Color): number[] {
  const piece = board[position];
  if (piece === null) return [];
  
  const pieceColor = getPieceColor(piece);
  if (pieceColor !== currentTurn) return [];
  
  const { row, col } = indexToPos(position);
  const isPieceKing = isKing(piece);
  const moves: number[] = [];
  
  // Check for mandatory captures first
  const captures = findCaptures(board, position, currentTurn, isPieceKing);
  if (captures.length > 0) {
    return captures;
  }
  
  // Regular moves (only if no captures available)
  if (isPieceKing) {
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
        
        const newIndex = posToIndex(newRow, newCol);
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
        const newIndex = posToIndex(newRow, newCol);
        if (board[newIndex] === null) {
          moves.push(newIndex);
        }
      }
    }
  }
  
  return moves;
}

// Find all capture moves from a position
function findCaptures(board: Board, position: number, currentTurn: Color, isKing: boolean): number[] {
  const captures: number[] = [];
  const { row, col } = indexToPos(position);
  
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
        
        const checkIndex = posToIndex(checkRow, checkCol);
        const checkPiece = board[checkIndex];
        
        if (checkPiece === null) {
          continue; // Empty square, keep looking
        }
        
        const checkColor = getPieceColor(checkPiece);
        if (checkColor === currentTurn) {
          break; // Hit own piece, can't capture
        }
        
        // Found opponent piece - check if we can land after it
        const landRow = checkRow + rowDir;
        const landCol = checkCol + colDir;
        
        if (landRow >= 0 && landRow < BOARD_SIZE && landCol >= 0 && landCol < BOARD_SIZE) {
          const landIndex = posToIndex(landRow, landCol);
          if (board[landIndex] === null) {
            captures.push(landIndex);
          }
        }
        
        break; // Found a piece (either captured or blocked)
      }
    }
  } else {
    // Regular pieces can only capture 2 squares away
    const directions = currentTurn === 'red'
      ? [
          { rowDir: -2, colDir: -2 }, // Up-left
          { rowDir: -2, colDir: 2 },  // Up-right
        ]
      : [
          { rowDir: 2, colDir: -2 },  // Down-left
          { rowDir: 2, colDir: 2 },   // Down-right
        ];
    
    for (const { rowDir, colDir } of directions) {
      const newRow = row + rowDir;
      const newCol = col + colDir;
      
      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        const newIndex = posToIndex(newRow, newCol);
        const jumpOverIndex = posToIndex(row + rowDir / 2, col + colDir / 2);
        
        if (board[newIndex] === null && board[jumpOverIndex] !== null) {
          const jumpOverColor = getPieceColor(board[jumpOverIndex]!);
          if (jumpOverColor !== null && jumpOverColor !== currentTurn) {
            captures.push(newIndex);
          }
        }
      }
    }
  }
  
  return captures;
}

// Validate a move
export function validateMove(
  board: Board,
  from: number,
  to: number,
  currentTurn: Color,
  mustContinueJump: boolean,
  continueJumpFrom: number | null
): { valid: boolean; reason?: string; captures?: number[] } {
  // Check if positions are valid
  if (from < 0 || from >= BOARD_ARRAY_SIZE || to < 0 || to >= BOARD_ARRAY_SIZE) {
    return { valid: false, reason: 'Invalid position' };
  }
  
  const piece = board[from];
  if (piece === null) {
    return { valid: false, reason: 'No piece at source position' };
  }
  
  const pieceColor = getPieceColor(piece);
  if (pieceColor !== currentTurn) {
    return { valid: false, reason: 'Not your piece' };
  }
  
  // If must continue jump, check that we're continuing from the right position
  if (mustContinueJump && continueJumpFrom !== null && from !== continueJumpFrom) {
    return { valid: false, reason: 'Must continue jump from previous position' };
  }
  
  const pieceIsKing = isKing(piece);
  const { row: fromRow, col: fromCol } = indexToPos(from);
  const { row: toRow, col: toCol } = indexToPos(to);
  
  // Check if destination is empty
  if (board[to] !== null) {
    return { valid: false, reason: 'Destination is not empty' };
  }
  
  // Check if move is diagonal
  const rowDiff = toRow - fromRow;
  const colDiff = toCol - fromCol;
  if (Math.abs(rowDiff) !== Math.abs(colDiff)) {
    return { valid: false, reason: 'Move must be diagonal' };
  }
  
  // Check if it's a capture
  // For regular pieces: must be exactly 2 squares
  // For kings: can be any distance >= 2, and must have exactly one opponent piece in path
  let isCapture = false;
  if (pieceIsKing) {
    // For kings, check if there's exactly one opponent piece in the path
    if (Math.abs(rowDiff) >= 2 && Math.abs(rowDiff) === Math.abs(colDiff)) {
      const rowStep = rowDiff > 0 ? 1 : -1;
      const colStep = colDiff > 0 ? 1 : -1;
      let opponentPieces = 0;
      
      for (let i = 1; i < Math.abs(rowDiff); i++) {
        const checkRow = fromRow + (rowStep * i);
        const checkCol = fromCol + (colStep * i);
        const checkIndex = posToIndex(checkRow, checkCol);
        const checkPiece = board[checkIndex];
        
        if (checkPiece !== null) {
          const checkColor = getPieceColor(checkPiece);
          if (checkColor === currentTurn) {
            break; // Hit own piece, not a capture
          }
          opponentPieces++;
        }
      }
      
      isCapture = opponentPieces === 1;
    }
  } else {
    // Regular pieces: exactly 2 squares
    isCapture = Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 2;
  }
  
  // Regular move: 1 square for regular pieces, any distance for kings (if not a capture)
  const isRegularMove = pieceIsKing 
    ? (Math.abs(rowDiff) === Math.abs(colDiff) && Math.abs(rowDiff) >= 1 && !isCapture)
    : (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1);
  
  if (!isCapture && !isRegularMove) {
    return { valid: false, reason: 'Invalid move distance' };
  }
  
  // For kings moving multiple squares, check that the path is clear
  if (pieceIsKing && isRegularMove && Math.abs(rowDiff) > 1) {
    const rowStep = rowDiff > 0 ? 1 : -1;
    const colStep = colDiff > 0 ? 1 : -1;
    
    // Check each square along the path
    for (let i = 1; i < Math.abs(rowDiff); i++) {
      const checkRow = fromRow + (rowStep * i);
      const checkCol = fromCol + (colStep * i);
      const checkIndex = posToIndex(checkRow, checkCol);
      
      if (board[checkIndex] !== null) {
        return { valid: false, reason: 'Path is blocked' };
      }
    }
  }
  
  // Check if there are mandatory captures available
  if (!mustContinueJump) {
    const allCaptures = getAllCaptures(board, currentTurn);
    if (allCaptures.length > 0 && !isCapture) {
      return { valid: false, reason: 'Capture is mandatory' };
    }
  } else {
    // If must continue jump, the move MUST be a capture
    if (!isCapture) {
      return { valid: false, reason: 'Must continue jump with a capture' };
    }
  }
  
  // Validate capture
  if (isCapture) {
    if (pieceIsKing) {
      // King capture - check that there's exactly one opponent piece in the path
      const rowStep = rowDiff > 0 ? 1 : -1;
      const colStep = colDiff > 0 ? 1 : -1;
      const captures: number[] = [];
      
      // Check each square along the path
      for (let i = 1; i < Math.abs(rowDiff); i++) {
        const checkRow = fromRow + (rowStep * i);
        const checkCol = fromCol + (colStep * i);
        const checkIndex = posToIndex(checkRow, checkCol);
        const checkPiece = board[checkIndex];
        
        if (checkPiece !== null) {
          const checkColor = getPieceColor(checkPiece);
          if (checkColor === currentTurn) {
            return { valid: false, reason: 'Cannot jump over your own piece' };
          }
          captures.push(checkIndex);
        }
      }
      
      if (captures.length === 0) {
        return { valid: false, reason: 'No piece to capture' };
      }
      if (captures.length > 1) {
        return { valid: false, reason: 'Cannot capture multiple pieces in one move' };
      }
      
      return { valid: true, captures };
    } else {
      // Regular piece capture - must be exactly 2 squares
      const jumpOverIndex = posToIndex(
        fromRow + (rowDiff / 2),
        fromCol + (colDiff / 2)
      );
      const jumpedPiece = board[jumpOverIndex];
      
      if (jumpedPiece === null) {
        return { valid: false, reason: 'No piece to capture' };
      }
      
      const jumpedColor = getPieceColor(jumpedPiece);
      if (jumpedColor === currentTurn) {
        return { valid: false, reason: 'Cannot capture your own piece' };
      }
      
      return { valid: true, captures: [jumpOverIndex] };
    }
  }
  
  // Validate regular move direction (only for non-kings)
  if (isRegularMove && !pieceIsKing) {
    if (pieceColor === 'red' && rowDiff > 0) {
      return { valid: false, reason: 'Red pieces can only move up' };
    }
    if (pieceColor === 'black' && rowDiff < 0) {
      return { valid: false, reason: 'Black pieces can only move down' };
    }
  }
  
  return { valid: true };
}

// Get all possible captures for current player
function getAllCaptures(board: Board, currentTurn: Color): number[] {
  const captures: number[] = [];
  
  for (let i = 0; i < BOARD_ARRAY_SIZE; i++) {
    const piece = board[i];
    if (piece !== null && getPieceColor(piece) === currentTurn) {
      const pieceCaptures = findCaptures(board, i, currentTurn, isKing(piece));
      captures.push(...pieceCaptures.map(c => i));
    }
  }
  
  return captures;
}

// Apply a move to the board
export function applyMove(
  board: Board,
  from: number,
  to: number,
  currentTurn: Color,
  capturesToRemove: number[] = []
): { newBoard: Board; captures: number[]; promoted: boolean } {
  const newBoard: Board = [...board];
  const piece = newBoard[from]!;
  let promoted = false;
  
  const { row: toRow } = indexToPos(to);
  
  // Remove captured pieces
  for (const captureIndex of capturesToRemove) {
    newBoard[captureIndex] = null;
  }
  
  // Move piece
  newBoard[to] = piece;
  newBoard[from] = null;
  
  // Check for king promotion
  if (!isKing(piece)) {
    if (currentTurn === 'red' && toRow === 0) {
      newBoard[to] = 'R';
      promoted = true;
    } else if (currentTurn === 'black' && toRow === BOARD_SIZE - 1) {
      newBoard[to] = 'B';
      promoted = true;
    }
  }
  
  return { newBoard, captures: capturesToRemove, promoted };
}

// Check if a piece can continue jumping after a capture
export function canContinueJump(board: Board, position: number, currentTurn: Color): boolean {
  const piece = board[position];
  if (piece === null) return false;
  
  const pieceIsKing = isKing(piece);
  const captures = findCaptures(board, position, currentTurn, pieceIsKing);
  return captures.length > 0;
}

// Check if game is over
export function checkGameOver(board: Board, currentTurn: Color): { gameOver: boolean; winner: Color | null } {
  const opponentTurn: Color = currentTurn === 'red' ? 'black' : 'red';
  
  // Check if opponent has any pieces
  let hasPieces = false;
  let hasLegalMoves = false;
  
  for (let i = 0; i < BOARD_ARRAY_SIZE; i++) {
    const piece = board[i];
    if (piece !== null && getPieceColor(piece) === opponentTurn) {
      hasPieces = true;
      const moves = getLegalMoves(board, i, opponentTurn);
      if (moves.length > 0) {
        hasLegalMoves = true;
        break;
      }
    }
  }
  
  if (!hasPieces) {
    return { gameOver: true, winner: currentTurn };
  }
  
  if (!hasLegalMoves) {
    return { gameOver: true, winner: currentTurn };
  }
  
  return { gameOver: false, winner: null };
}


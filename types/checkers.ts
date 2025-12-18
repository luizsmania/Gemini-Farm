// Checkers game types

export type Piece = 'r' | 'R' | 'b' | 'B' | null; // r=red, R=red king, b=black, B=black king, null=empty
export type Color = 'red' | 'black';
export type Board = Piece[]; // 64-element array (8x8 board)

export interface Lobby {
  id: string;
  players: string[]; // Player IDs
  maxPlayers: number;
  createdAt: number;
}

export interface GameState {
  matchId: string;
  board: Board;
  currentTurn: Color;
  playerRed: string;
  playerBlack: string;
  winner: Color | null;
  lastMove: { from: number; to: number } | null;
  canContinueJump: boolean;
  continueJumpFrom: number | null;
  moveCount?: number;
}

// WebSocket message types
export interface ClientMessage {
  type: 'SET_NICKNAME' | 'CREATE_LOBBY' | 'JOIN_LOBBY' | 'MOVE' | 'REMATCH_ACCEPT' | 'LEAVE_MATCH' | 'CHAT_MESSAGE';
  nickname?: string;
  playerId?: string; // For reconnection
  lobbyId?: string;
  from?: number;
  to?: number;
  matchId?: string;
  message?: string;
}

export interface ServerMessage {
  type: 'NICKNAME_SET' | 'LOBBY_LIST' | 'GAME_START' | 'MOVE_ACCEPTED' | 'MOVE_REJECTED' | 'GAME_OVER' | 'ERROR' | 'PLAYER_DISCONNECTED' | 'REMATCH_REQUEST' | 'MATCH_ENDED' | 'CHAT_MESSAGE';
  lobbies?: LobbyInfo[];
  matchId?: string;
  yourColor?: Color;
  board?: Board;
  nextTurn?: Color;
  reason?: string;
  winner?: Color;
  from?: number;
  to?: number;
  canContinueJump?: boolean;
  continueJumpFrom?: number | null;
  message?: string;
  playerId?: string;
  nickname?: string;
  senderNickname?: string;
  opponentNickname?: string;
  timestamp?: number;
}

export interface LobbyInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  creatorNickname?: string; // Nickname of the player who created the lobby
}

export interface MatchHistory {
  id: string;
  opponentNickname: string;
  opponentColor: 'red' | 'black';
  yourColor: 'red' | 'black';
  winner: string | null;
  finishedAt: Date | null;
}


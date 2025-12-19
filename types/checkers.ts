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
  capturesRed?: number; // Number of pieces captured by red player
  capturesBlack?: number; // Number of pieces captured by black player
  moveTimerStart?: number; // Timestamp when current turn started
}

// WebSocket message types
export interface ClientMessage {
  type: 'SET_NICKNAME' | 'CREATE_LOBBY' | 'JOIN_LOBBY' | 'MOVE' | 'REMATCH_ACCEPT' | 'LEAVE_MATCH' | 'CHAT_MESSAGE' | 'REJOIN_MATCH' | 'FORFEIT_MATCH' | 'REQUEST_LOBBY_LIST';
  nickname?: string;
  playerId?: string; // For reconnection
  lobbyId?: string;
  from?: number;
  to?: number;
  matchId?: string;
  message?: string;
}

export interface ServerMessage {
  type: 'NICKNAME_SET' | 'LOBBY_LIST' | 'GAME_START' | 'MOVE_ACCEPTED' | 'MOVE_REJECTED' | 'GAME_OVER' | 'ERROR' | 'PLAYER_DISCONNECTED' | 'REMATCH_REQUEST' | 'MATCH_ENDED' | 'CHAT_MESSAGE' | 'MATCH_LEAVING';
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
  timeRemaining?: number;
  capturesRed?: number;
  capturesBlack?: number;
  moveTimeRemaining?: number; // Time remaining for current move (in seconds)
}

export interface LobbyInfo {
  id: string;
  playerCount: number;
  maxPlayers: number;
  creatorNickname?: string; // Nickname of the player who created the lobby
  isCurrentMatch?: boolean; // True if this is the player's current match they're leaving
  isYourLobby?: boolean; // True if this lobby was created by the current player
}

export interface MatchHistory {
  id: string;
  opponentNickname: string;
  opponentColor: 'red' | 'black';
  yourColor: 'red' | 'black';
  winner: string | null;
  finishedAt: Date | null;
}


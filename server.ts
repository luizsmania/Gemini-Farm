/**
 * WebSocket Server for Online Checkers Game
 * 
 * Authoritative server - all game logic runs here
 * 
 * Deployment Options:
 * - Railway: https://railway.app
 * - Render: https://render.com
 * - Fly.io: https://fly.io
 */

import { Server } from 'socket.io';
import http from 'http';
import { createInitialBoard, validateMove, applyMove, canContinueJump, checkGameOver } from './server/checkersEngine.js';
import { initDatabase, createMatch, finishMatch, addMove, getPlayerById, createPlayer, getMatchHistory, checkDatabaseHealth } from './api/database.js';
import { GameState, Lobby, ClientMessage, ServerMessage } from './types/checkers.js';
import { isValidUUID, isValidBoardPosition, sanitizeNickname, isValidNickname, sanitizeText, isValidMatchId } from './utils/validation.js';
import { rateLimitMove, rateLimitChat, rateLimitLobby, rateLimitNickname } from './middleware/rateLimiter.js';
// DOMPurify removed - using simple server-side sanitization instead
import logger, { logGameEvent, logSocketEvent, logSecurityEvent } from './utils/logger.js';

// Create HTTP server
const httpServer = http.createServer();

// Configure CORS for production
const getCorsOrigin = () => {
  // Development: allow localhost
  if (process.env.NODE_ENV === 'development') {
    return process.env.CLIENT_URL || 'http://localhost:3000';
  }
  
  // Production: MUST specify allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [];
  
  if (allowedOrigins.length === 0) {
    logger.error('ERROR: ALLOWED_ORIGINS must be set in production!');
    logger.error('Set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com');
    // Fail fast in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ALLOWED_ORIGINS environment variable is required in production');
    }
    // Development fallback
    return 'http://localhost:3000';
  }
  
  return allowedOrigins;
};

// Get allowed origins for CORS validation
const getAllowedOrigins = () => {
  const origin = getCorsOrigin();
  if (typeof origin === 'string') {
    return [origin];
  }
  if (Array.isArray(origin)) {
    return origin;
  }
  return ['http://localhost:3000']; // Fallback
};

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const allowed = getAllowedOrigins();
      
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        // In development, allow
        if (process.env.NODE_ENV === 'development') {
          callback(null, true);
          return;
        }
        // In production, reject if origin required
        callback(new Error('Origin required'));
        return;
      }
      
      if (allowed.includes(origin)) {
        callback(null, true);
      } else {
        logSecurityEvent('CORS rejected', origin || 'unknown', { allowed: allowed.join(', ') });
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Allow Engine.IO v3 clients (for compatibility)
});

// In-memory game state
const lobbies = new Map<string, Lobby>();
const activeGames = new Map<string, GameState>();
const playerToGame = new Map<string, string>(); // playerId -> matchId
const playerDisconnectTimers = new Map<string, NodeJS.Timeout>();
const rematchRequests = new Map<string, Set<string>>(); // matchId -> Set of playerIds who requested rematch
const playerNicknames = new Map<string, string>(); // playerId -> nickname
const playerLeaveTimers = new Map<string, NodeJS.Timeout>(); // playerId -> leave timer
const leavingPlayers = new Map<string, string>(); // playerId -> matchId (players who clicked leave but have 30s grace period)
const moveTimers = new Map<string, NodeJS.Timeout>(); // matchId -> move timer (45 seconds per move)

// Cleanup utility functions
function cleanupPlayerTimers(playerId: string) {
  // Disconnect timer
  const disconnectTimer = playerDisconnectTimers.get(playerId);
  if (disconnectTimer) {
    clearTimeout(disconnectTimer);
    playerDisconnectTimers.delete(playerId);
  }
  
  // Leave timer
  const leaveTimer = playerLeaveTimers.get(playerId);
  if (leaveTimer) {
    clearTimeout(leaveTimer);
    playerLeaveTimers.delete(playerId);
  }
  
  // Remove from leaving players
  leavingPlayers.delete(playerId);
}

function cleanupGameTimers(matchId: string) {
  const moveTimer = moveTimers.get(matchId);
  if (moveTimer) {
    clearTimeout(moveTimer);
    moveTimers.delete(matchId);
  }
}

// Clean up lobby after a delay (in case of errors)
function cleanupLobby(lobbyId: string) {
  setTimeout(() => {
    if (lobbies.has(lobbyId)) {
      const lobby = lobbies.get(lobbyId)!;
      if (lobby.players.length === 0) {
        lobbies.delete(lobbyId);
        broadcastLobbyList();
      }
    }
  }, 1000);
}

// Broadcast lobby list to all connected clients
function broadcastLobbyList(playerId?: string) {
  const lobbyList = Array.from(lobbies.values())
    .filter(lobby => lobby.players.length < lobby.maxPlayers)
    .map(lobby => {
      const creatorNickname = lobby.creatorId 
        ? sanitizeText(playerNicknames.get(lobby.creatorId) || 'Unknown', 20)
        : 'Unknown';
      const isYourLobby = playerId ? (lobby.creatorId === playerId) : false;
      return {
        id: lobby.id,
        playerCount: lobby.players.length,
        maxPlayers: lobby.maxPlayers,
        creatorNickname,
        isYourLobby,
      };
    });
  
  // Add active games that the player is leaving from (30-second grace period)
  if (playerId) {
    const leavingMatchId = leavingPlayers.get(playerId);
    if (leavingMatchId) {
      const game = activeGames.get(leavingMatchId);
      if (game) {
        const opponentId = playerId === game.playerRed ? game.playerBlack : game.playerRed;
        const opponentNickname = sanitizeText(playerNicknames.get(opponentId) || 'Opponent', 20);
        lobbyList.unshift({
          id: leavingMatchId,
          playerCount: 1, // Player is leaving, so only opponent remains
          maxPlayers: 2,
          creatorNickname: opponentNickname,
          isCurrentMatch: true, // Flag to show "Current Match" label
          isYourLobby: false,
        });
      }
    }
  }
  
  // Send to specific player if provided, otherwise broadcast to all
  if (playerId) {
    io.to(`player:${playerId}`).emit('LOBBY_LIST', { type: 'LOBBY_LIST', lobbies: lobbyList } as ServerMessage);
  } else {
    // When broadcasting to all, we need to send personalized lists to each player
    // For now, we'll send without isYourLobby flag when broadcasting to all
    const generalList = lobbyList.map(lobby => ({
      ...lobby,
      isYourLobby: false, // Don't mark as "your lobby" when broadcasting to all
    }));
    io.emit('LOBBY_LIST', { type: 'LOBBY_LIST', lobbies: generalList } as ServerMessage);
  }
}

// Start a new game
async function startGame(lobby: Lobby) {
  if (lobby.players.length !== 2) return;
  
  const [playerRed, playerBlack] = lobby.players;
  
  try {
    // Create match in database (returns match with UUID)
    let match;
    let matchId: string;
    try {
      match = await createMatch(playerRed, playerBlack);
      matchId = match.id;
    } catch (dbError: any) {
      logger.error('Database error creating match', { error: dbError instanceof Error ? dbError.message : String(dbError), playerRed, playerBlack });
      // If database fails, use lobby ID as match ID
      matchId = lobby.id;
      logger.warn('Using lobby ID as match ID', { matchId });
    }
    
    const board = createInitialBoard();
    const gameState: GameState = {
      matchId,
      board,
      currentTurn: 'red',
      playerRed,
      playerBlack,
      winner: null,
      lastMove: null,
      canContinueJump: false,
      continueJumpFrom: null,
      moveCount: 0,
      capturesRed: 0,
      capturesBlack: 0,
      moveTimerStart: Date.now(),
    };
    logGameEvent('Game started', matchId, { playerRed, playerBlack, capturesRed: 0, capturesBlack: 0 });
    
    activeGames.set(matchId, gameState);
    playerToGame.set(playerRed, matchId);
    playerToGame.set(playerBlack, matchId);
    
    // Start move timer for first turn (red)
    startMoveTimer(matchId, gameState);
    
    // Remove lobby
    lobbies.delete(lobby.id);
    broadcastLobbyList();
    
    // Join match room for both players
    io.to(`player:${playerRed}`).socketsJoin(`match:${matchId}`);
    io.to(`player:${playerBlack}`).socketsJoin(`match:${matchId}`);
    
    // Get opponent nicknames (sanitized)
    const playerRedNickname = sanitizeText(playerNicknames.get(playerRed) || 'Player 1', 20);
    const playerBlackNickname = sanitizeText(playerNicknames.get(playerBlack) || 'Player 2', 20);
    
    // Notify players
    io.to(`player:${playerRed}`).emit('GAME_START', {
      type: 'GAME_START',
      matchId,
      yourColor: 'red',
      board,
      opponentNickname: playerBlackNickname,
      capturesRed: 0,
      capturesBlack: 0,
      moveTimeRemaining: 45,
    } as ServerMessage);
    
    io.to(`player:${playerBlack}`).emit('GAME_START', {
      type: 'GAME_START',
      matchId,
      yourColor: 'black',
      board,
      opponentNickname: playerRedNickname,
      capturesRed: 0,
      capturesBlack: 0,
      moveTimeRemaining: 45,
    } as ServerMessage);
    
    logGameEvent('Game started', matchId, { playerRed, playerBlack });
  } catch (error) {
    logger.error('Error starting game', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
  }
}

// Handle player disconnect
function handleDisconnect(playerId: string) {
  const matchId = playerToGame.get(playerId);
  if (!matchId) {
    cleanupPlayerTimers(playerId);
    return;
  }
  
  const game = activeGames.get(matchId);
  if (!game || game.winner !== null) {
    cleanupPlayerTimers(playerId);
    return; // Game already ended
  }
  
  // Check if there's already a disconnect timer running
  if (playerDisconnectTimers.has(playerId)) {
    logger.debug('Player already has disconnect timer', { playerId });
    return;
  }
  
  // Set 30 second timer
  logger.info('Player disconnected, starting 30s forfeit timer', { playerId });
  
  const timer = setTimeout(async () => {
    // Forfeit game
    const winnerId = playerId === game.playerRed ? game.playerBlack : game.playerRed;
    const winnerColor: 'red' | 'black' = playerId === game.playerRed ? 'black' : 'red';
    
    game.winner = winnerColor;
    
    try {
      await finishMatch(matchId, winnerId);
    } catch (error) {
      logger.error('Error finishing match (timeout)', { error: error instanceof Error ? error.message : String(error), matchId, winnerId });
    }
    
    // Notify players
    io.to(`match:${matchId}`).emit('GAME_OVER', {
      type: 'GAME_OVER',
      winner: winnerColor,
    } as ServerMessage);
    
    // Cleanup all timers
    cleanupGameTimers(matchId);
    cleanupPlayerTimers(playerId);
    cleanupPlayerTimers(game.playerRed);
    cleanupPlayerTimers(game.playerBlack);
    
    activeGames.delete(matchId);
    playerToGame.delete(game.playerRed);
    playerToGame.delete(game.playerBlack);
    
    logGameEvent('Game forfeited', matchId, { reason: 'disconnect', forfeitedBy: playerId });
  }, 30000); // 30 seconds
  
  playerDisconnectTimers.set(playerId, timer);
  
  // Notify other player
  const otherPlayerId = playerId === game.playerRed ? game.playerBlack : game.playerRed;
  io.to(`player:${otherPlayerId}`).emit('PLAYER_DISCONNECTED', {
    type: 'PLAYER_DISCONNECTED',
    message: 'Opponent disconnected. Game will end in 30 seconds if they don\'t return.',
  } as ServerMessage);
}

// Handle player reconnect
function handleReconnect(playerId: string) {
  const timer = playerDisconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    playerDisconnectTimers.delete(playerId);
    logger.info('Player reconnected, cleared disconnect timer', { playerId });
    
    const matchId = playerToGame.get(playerId);
    if (matchId) {
      const game = activeGames.get(matchId);
      if (game) {
        // Notify other player
        const otherPlayerId = playerId === game.playerRed ? game.playerBlack : game.playerRed;
        io.to(`player:${otherPlayerId}`).emit('PLAYER_DISCONNECTED', {
          type: 'PLAYER_DISCONNECTED',
          message: 'Opponent reconnected.',
        } as ServerMessage);
      }
    }
  }
}

// Start move timer (45 seconds per move)
function startMoveTimer(matchId: string, game: GameState) {
  // Clear existing timer
  cleanupGameTimers(matchId);
  
  // Only start timer if game is active and not already won
  if (game.winner !== null) return;
  
  const timer = setTimeout(async () => {
    const currentPlayerId = game.currentTurn === 'red' ? game.playerRed : game.playerBlack;
    const winnerId = game.currentTurn === 'red' ? game.playerBlack : game.playerRed;
    const winnerColor: 'red' | 'black' = game.currentTurn === 'red' ? 'black' : 'red';
    
    game.winner = winnerColor;
    
    try {
      await finishMatch(matchId, winnerId);
    } catch (error) {
      logger.error('Error finishing match (timeout)', { error: error instanceof Error ? error.message : String(error), matchId, winnerId });
    }
    
    // Notify players
    io.to(`match:${matchId}`).emit('GAME_OVER', {
      type: 'GAME_OVER',
      winner: winnerColor,
    } as ServerMessage);
    
    // Cleanup
    cleanupGameTimers(matchId);
    cleanupPlayerTimers(game.playerRed);
    cleanupPlayerTimers(game.playerBlack);
    activeGames.delete(matchId);
    playerToGame.delete(game.playerRed);
    playerToGame.delete(game.playerBlack);
    
    logGameEvent('Game forfeited', matchId, { reason: 'timeout', forfeitedBy: currentPlayerId });
  }, 45000); // 45 seconds
  
  moveTimers.set(matchId, timer);
}

io.on('connection', (socket) => {
  const clientIp = socket.handshake.address || socket.request.socket.remoteAddress || 'unknown';
  logSocketEvent('Client connected', socket.id, { ip: clientIp });
  
  let currentPlayerId: string | null = null;
  let currentNickname: string | null = null;
  
  // Log all incoming events for debugging
  const originalOnevent = socket.onevent;
  socket.onevent = function (packet: any) {
    const args = packet.data || [];
    const eventName = args[0];
    if (eventName === 'MOVE') {
      logSocketEvent('MOVE event received', socket.id, { data: args[1] });
    } else if (eventName) {
      logSocketEvent('Event received', socket.id, { eventName });
    }
    originalOnevent.call(this, packet);
  };
  
  // Set nickname and create/get player
  socket.on('SET_NICKNAME', async (message: ClientMessage) => {
    try {
      // Rate limit check
      if (!(await rateLimitNickname(socket.id, clientIp))) {
        socket.emit('ERROR', { 
          type: 'ERROR', 
          message: 'Too many nickname attempts. Please wait a minute.' 
        } as ServerMessage);
        return;
      }
      
      // Validate input
      if (!message.nickname || !isValidNickname(message.nickname)) {
        socket.emit('ERROR', { 
          type: 'ERROR', 
          message: 'Nickname must be 1-20 characters and contain only letters, numbers, and spaces.' 
        } as ServerMessage);
        return;
      }
      
      // Sanitize nickname
      const nickname = sanitizeNickname(message.nickname);
      
      // Validate playerId if provided
      if (message.playerId && !isValidUUID(message.playerId)) {
        socket.emit('ERROR', { 
          type: 'ERROR', 
          message: 'Invalid player ID format.' 
        } as ServerMessage);
        return;
      }
      
      // Check if player provided an existing playerId (for reconnection after page refresh)
      let existingPlayerId: string | null = null;
      if (message.playerId && typeof message.playerId === 'string' && isValidUUID(message.playerId)) {
        // First check if this playerId is in an active game
        const matchId = playerToGame.get(message.playerId);
        if (matchId) {
          const game = activeGames.get(matchId);
          if (game && game.winner === null) {
            // Player is reconnecting to an active game
            existingPlayerId = message.playerId;
            logger.info('Player reconnecting with existing playerId', { playerId: existingPlayerId, matchId });
            
            // Cancel disconnect timer if it exists
            handleReconnect(existingPlayerId);
            
            // Rejoin match room
            socket.join(`match:${matchId}`);
            
            // Update nickname mapping (sanitized)
            playerNicknames.set(existingPlayerId, nickname);
            
            // Determine player color
            const yourColor = existingPlayerId === game.playerRed ? 'red' : 'black';
            const opponentId = yourColor === 'red' ? game.playerBlack : game.playerRed;
            const opponentNickname = sanitizeText(playerNicknames.get(opponentId) || 'Opponent', 20);
            
            currentPlayerId = existingPlayerId;
            currentNickname = nickname;
            
            // Join player-specific room
            socket.join(`player:${currentPlayerId}`);
            
            logger.info('Player reconnected to match', { playerId: currentPlayerId, nickname: currentNickname, matchId });
            
            // Send player ID back to client
            socket.emit('NICKNAME_SET', {
              type: 'NICKNAME_SET',
              playerId: currentPlayerId,
              nickname: currentNickname,
            });
            
            // Send current game state to reconnecting player
            const timeRemaining = game.moveTimerStart ? Math.max(0, 45 - Math.floor((Date.now() - game.moveTimerStart) / 1000)) : 45;
            socket.emit('GAME_START', {
              type: 'GAME_START',
              matchId,
              yourColor,
              board: game.board,
              opponentNickname,
              nextTurn: game.currentTurn, // Include current turn
              capturesRed: game.capturesRed || 0,
              capturesBlack: game.capturesBlack || 0,
              moveTimeRemaining: timeRemaining,
            } as ServerMessage);
            
            // Notify other player
            io.to(`player:${opponentId}`).emit('PLAYER_DISCONNECTED', {
              type: 'PLAYER_DISCONNECTED',
              message: 'Opponent reconnected.',
            } as ServerMessage);
            
            // Send lobby list
            broadcastLobbyList();
            return;
          }
        }
        
        // If playerId provided but not in active game, verify it exists in database
        // If it does, reuse it (for consistency)
        try {
          const { getPlayerById } = await import('./api/database.js');
          const existingPlayer = await getPlayerById(message.playerId);
          if (existingPlayer) {
            existingPlayerId = message.playerId;
            logger.info('Reusing existing playerId', { playerId: existingPlayerId, nickname });
          }
        } catch (dbError: any) {
          logger.info('Could not verify existing playerId, will create new player', { playerId: message.playerId, error: dbError.message });
        }
      }
      
      // Create new player (first time or not reconnecting to active game)
      if (!existingPlayerId) {
        let player;
        try {
          player = await createPlayer(nickname);
          currentPlayerId = player.id;
        } catch (dbError: any) {
          logger.error('Database error creating player', { error: dbError instanceof Error ? dbError.message : String(dbError), nickname });
          // If database fails, use a temporary ID based on socket ID and nickname
          // This allows the game to work even if database is down
          currentPlayerId = `temp_${socket.id}_${Date.now()}`;
          logger.warn('Using temporary player ID', { playerId: currentPlayerId, nickname, socketId: socket.id });
        }
      } else {
        // Reusing existing playerId (already set above for reconnection case)
        currentPlayerId = existingPlayerId;
      }
      
      currentNickname = nickname; // Already sanitized
      playerNicknames.set(currentPlayerId, currentNickname);
      
      // Join player-specific room
      socket.join(`player:${currentPlayerId}`);
      
      logger.info('Player connected', { playerId: currentPlayerId, nickname: currentNickname, socketId: socket.id });
      
      // Send player ID back to client
      socket.emit('NICKNAME_SET', {
        type: 'NICKNAME_SET',
        playerId: currentPlayerId,
        nickname: currentNickname,
      });
      
      // Send lobby list
      broadcastLobbyList();
    } catch (error: any) {
      logger.error('Error setting nickname', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, socketId: socket.id });
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: `Failed to set nickname: ${error.message || 'Unknown error'}` 
      } as ServerMessage);
    }
  });
  
  // Create lobby
  socket.on('CREATE_LOBBY', async () => {
    if (!currentPlayerId) {
      socket.emit('ERROR', { type: 'ERROR', message: 'Please set nickname first' } as ServerMessage);
      return;
    }
    
    // Rate limit check
    if (!(await rateLimitLobby(socket.id, clientIp))) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Too many lobby creations. Please wait 10 seconds.' 
      } as ServerMessage);
      return;
    }
    
    // Check if player is already in an active match
    const activeMatchId = playerToGame.get(currentPlayerId);
    if (activeMatchId) {
      const activeGame = activeGames.get(activeMatchId);
      if (activeGame && activeGame.winner === null) {
        socket.emit('ERROR', { type: 'ERROR', message: 'You are already in an active match. Please leave it first.' } as ServerMessage);
        return;
      }
    }
    
    const lobbyId = `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lobby: Lobby = {
      id: lobbyId,
      players: [currentPlayerId],
      maxPlayers: 2,
      createdAt: Date.now(),
      creatorId: currentPlayerId, // Store creator ID
    };
    
    lobbies.set(lobbyId, lobby);
    socket.join(`lobby:${lobbyId}`);
    // Broadcast to all players so everyone sees the new lobby
    broadcastLobbyList();
    // Also send personalized list to creator (includes isYourLobby flag)
    broadcastLobbyList(currentPlayerId);
    
    logger.info('Lobby created', { lobbyId, creatorId: currentPlayerId, creatorNickname: currentNickname });
  });

  socket.on('REQUEST_LOBBY_LIST', () => {
    if (!currentPlayerId) {
      socket.emit('ERROR', { type: 'ERROR', message: 'Please set your nickname first' } as ServerMessage);
      return;
    }
    
    // Send lobby list to the requesting player
    broadcastLobbyList(currentPlayerId);
  });
  
  // Join lobby (or rejoin match)
  socket.on('JOIN_LOBBY', (message: ClientMessage) => {
    if (!currentPlayerId) {
      socket.emit('ERROR', { type: 'ERROR', message: 'Please set nickname first' } as ServerMessage);
      return;
    }
    
    if (!message.lobbyId) {
      socket.emit('ERROR', { type: 'ERROR', message: 'Lobby ID required' } as ServerMessage);
      return;
    }
    
    // Check if this is a match the player is rejoining (current match they're leaving)
    const leavingMatchId = leavingPlayers.get(currentPlayerId);
    if (leavingMatchId === message.lobbyId) {
      // Player is rejoining their current match
      const game = activeGames.get(message.lobbyId);
      if (game) {
        // Cancel leave timer
        const leaveTimer = playerLeaveTimers.get(currentPlayerId);
        if (leaveTimer) {
          clearTimeout(leaveTimer);
          playerLeaveTimers.delete(currentPlayerId);
        }
        
        // Remove from leaving players
        leavingPlayers.delete(currentPlayerId);
        
        // Rejoin match room
        socket.join(`match:${message.lobbyId}`);
        
        // Determine player color and opponent info
        const yourColor = currentPlayerId === game.playerRed ? 'red' : 'black';
        const opponentId = yourColor === 'red' ? game.playerBlack : game.playerRed;
        const opponentNickname = sanitizeText(playerNicknames.get(opponentId) || 'Opponent', 20);
        
        // Send game state back to player
        socket.emit('GAME_START', {
          type: 'GAME_START',
          matchId: message.lobbyId,
          yourColor,
          board: game.board,
          opponentNickname,
          nextTurn: game.currentTurn,
          capturesRed: game.capturesRed ?? 0,
          capturesBlack: game.capturesBlack ?? 0,
        } as ServerMessage);
        
        // Update lobby list
        broadcastLobbyList(currentPlayerId);
        return;
      }
    }
    
    // Normal lobby join logic
    const lobby = lobbies.get(message.lobbyId);
    if (!lobby) {
      socket.emit('ERROR', { type: 'ERROR', message: 'Lobby not found' } as ServerMessage);
      return;
    }
    
    if (lobby.players.length >= lobby.maxPlayers) {
      socket.emit('ERROR', { type: 'ERROR', message: 'Lobby is full' } as ServerMessage);
      return;
    }
    
    if (lobby.players.includes(currentPlayerId)) {
      socket.emit('ERROR', { type: 'ERROR', message: 'Already in this lobby' } as ServerMessage);
      return;
    }
    
    lobby.players.push(currentPlayerId);
    socket.join(`lobby:${lobby.id}`);
    
    // Join match room for future use
    socket.join(`match:${lobby.id}`);
    
    logger.info('Player joined lobby', { playerId: currentPlayerId, nickname: currentNickname, lobbyId: message.lobbyId });
    
    // Start game if full
    if (lobby.players.length === 2) {
      startGame(lobby);
    } else {
      // Broadcast to all players so everyone sees the updated lobby
      broadcastLobbyList();
      // Also send personalized list to the player who joined
      broadcastLobbyList(currentPlayerId);
    }
  });
  
  // Make a move
  socket.on('MOVE', async (message: any) => {
    logger.debug(`[MOVE] Handler called`, { socketId: socket.id, message: message ? Object.keys(message) : null });
    
    try {
      // Rate limit check
      if (!(await rateLimitMove(socket.id, clientIp))) {
        socket.emit('MOVE_REJECTED', { 
          type: 'MOVE_REJECTED', 
          reason: 'Too many moves. Please slow down.' 
        } as ServerMessage);
        return;
      }
      
      // Validate input types and values
      if (!currentPlayerId) {
        logSecurityEvent('Move rejected - not authenticated', clientIp, { socketId: socket.id });
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: 'Not authenticated' } as ServerMessage);
        return;
      }
      
      if (typeof message !== 'object' || message === null) {
        socket.emit('MOVE_REJECTED', { 
          type: 'MOVE_REJECTED', 
          reason: 'Invalid message format' 
        } as ServerMessage);
        return;
      }
      
      // Ensure message is in correct format
      const moveMessage: ClientMessage = message && typeof message === 'object' ? message : { type: 'MOVE', ...message };
      
      // Validate board positions
      if (!isValidBoardPosition(moveMessage.from!) || 
          !isValidBoardPosition(moveMessage.to!) || 
          !moveMessage.matchId) {
        logSecurityEvent('Move rejected - invalid data', clientIp, { from: moveMessage.from, to: moveMessage.to, matchId: moveMessage.matchId });
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: 'Invalid move data' } as ServerMessage);
        return;
      }
      
      // Validate match ID format
      if (!isValidMatchId(moveMessage.matchId)) {
        socket.emit('MOVE_REJECTED', { 
          type: 'MOVE_REJECTED', 
          reason: 'Invalid match ID format' 
        } as ServerMessage);
        return;
      }
      
      const game = activeGames.get(moveMessage.matchId);
      if (!game) {
        logger.warn('[MOVE] Rejected: Game not found', { matchId: moveMessage.matchId, playerId: currentPlayerId });
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: 'Game not found' } as ServerMessage);
        return;
      }
      
      // Check if it's player's turn
      const playerColor = currentPlayerId === game.playerRed ? 'red' : 'black';
      if (playerColor !== game.currentTurn) {
        logger.debug(`[MOVE] Rejected: Not player's turn`, { playerColor, currentTurn: game.currentTurn, matchId: moveMessage.matchId });
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: 'Not your turn' } as ServerMessage);
        return;
      }
      
      // Validate move
      const validation = validateMove(
        game.board,
        moveMessage.from!,
        moveMessage.to!,
        game.currentTurn,
        game.canContinueJump,
        game.continueJumpFrom
      );
      
      if (!validation.valid) {
        logger.debug('[MOVE] Rejected: Invalid move', { reason: validation.reason, from: moveMessage.from, to: moveMessage.to, matchId: moveMessage.matchId });
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: validation.reason || 'Invalid move' } as ServerMessage);
        return;
      }
      
      logger.debug('[MOVE] Validated, applying move', { matchId: moveMessage.matchId, from: moveMessage.from, to: moveMessage.to });
      
      // Apply move (use captures from validation)
      const captures = validation.captures || [];
      const result = applyMove(game.board, moveMessage.from!, moveMessage.to!, game.currentTurn, captures);
      game.board = result.newBoard;
      game.lastMove = { from: moveMessage.from!, to: moveMessage.to! };
      
      // Track captures - always update, even during continued jumps (ensure initialized)
      game.capturesRed = game.capturesRed ?? 0;
      game.capturesBlack = game.capturesBlack ?? 0;
      if (result.captures && result.captures.length > 0) {
        if (game.currentTurn === 'red') {
          game.capturesRed += result.captures.length;
          logGameEvent('Piece captured', moveMessage.matchId, { player: 'red', captures: result.captures.length, total: game.capturesRed });
        } else {
          game.capturesBlack += result.captures.length;
          logGameEvent('Piece captured', moveMessage.matchId, { player: 'black', captures: result.captures.length, total: game.capturesBlack });
        }
      }
      
      // Save move to database - count moves in game state
      if (!game.moveCount) game.moveCount = 0;
      game.moveCount++;
      try {
        await addMove(moveMessage.matchId!, game.moveCount, moveMessage.from!, moveMessage.to!);
      } catch (dbError) {
        // Non-critical - game continues even if move isn't saved
        logger.warn('Error saving move to database (non-critical)', { error: dbError instanceof Error ? dbError.message : String(dbError), matchId: moveMessage.matchId, moveNumber: game.moveCount });
      }
      
      // Check for continued jump
      const canJump = canContinueJump(game.board, moveMessage.to!, game.currentTurn);
      
      if (canJump && result.captures.length > 0) {
        // Continue jump - don't reset timer, same turn
        // Captures already tracked above
        game.canContinueJump = true;
        game.continueJumpFrom = moveMessage.to!;
        game.currentTurn = playerColor; // Keep same turn
      } else {
        // Switch turn - reset timer
        game.canContinueJump = false;
        game.continueJumpFrom = null;
        game.currentTurn = game.currentTurn === 'red' ? 'black' : 'red';
        game.moveTimerStart = Date.now(); // Reset timer for new turn
        
        // Clear old move timer and start new one
        const oldTimer = moveTimers.get(moveMessage.matchId!);
        if (oldTimer) {
          clearTimeout(oldTimer);
        }
        startMoveTimer(moveMessage.matchId!, game);
      }
      
      // Check for game over
      const gameOver = checkGameOver(game.board, game.currentTurn === 'red' ? 'black' : 'red');
      
      if (gameOver.gameOver && gameOver.winner) {
        game.winner = gameOver.winner;
        const winnerId = gameOver.winner === 'red' ? game.playerRed : game.playerBlack;
        
        try {
          await finishMatch(moveMessage.matchId!, winnerId);
        } catch (dbError) {
          // Non-critical - game can end even if database fails
          logger.warn('Error finishing match in database (non-critical)', { error: dbError instanceof Error ? dbError.message : String(dbError), matchId: moveMessage.matchId, winnerId });
        }
        
        io.to(`match:${moveMessage.matchId}`).emit('GAME_OVER', {
          type: 'GAME_OVER',
          winner: gameOver.winner,
        } as ServerMessage);
        
        // Cleanup after a delay
        const oldTimer = moveTimers.get(moveMessage.matchId!);
        if (oldTimer) {
          clearTimeout(oldTimer);
          moveTimers.delete(moveMessage.matchId!);
        }
        setTimeout(() => {
          activeGames.delete(moveMessage.matchId!);
          playerToGame.delete(game.playerRed);
          playerToGame.delete(game.playerBlack);
        }, 60000); // Clean up after 1 minute
      } else {
        // Broadcast move
        const moveAcceptedMessage = {
          type: 'MOVE_ACCEPTED',
          board: game.board,
          nextTurn: game.currentTurn,
          from: moveMessage.from,
          to: moveMessage.to,
          canContinueJump: game.canContinueJump,
          continueJumpFrom: game.continueJumpFrom,
          capturesRed: game.capturesRed ?? 0,
          capturesBlack: game.capturesBlack ?? 0,
          moveTimeRemaining: game.moveTimerStart ? Math.max(0, 45 - Math.floor((Date.now() - game.moveTimerStart) / 1000)) : 45,
        } as ServerMessage;
        logger.debug(`[MOVE] Move accepted`, { matchId: moveMessage.matchId, capturesRed: moveAcceptedMessage.capturesRed, capturesBlack: moveAcceptedMessage.capturesBlack, nextTurn: moveAcceptedMessage.nextTurn });
        
        // Emit to both the match room and directly to the socket to ensure delivery
        io.to(`match:${moveMessage.matchId}`).emit('MOVE_ACCEPTED', moveAcceptedMessage);
        socket.emit('MOVE_ACCEPTED', moveAcceptedMessage);
        logger.debug(`[MOVE] Move broadcast complete`, { matchId: moveMessage.matchId, socketId: socket.id });
      }
    } catch (error) {
      logger.error('[MOVE] Error processing move', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, socketId: socket.id, playerId: currentPlayerId });
      socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` } as ServerMessage);
    }
  });
  
  // Rematch accept
  socket.on('REMATCH_ACCEPT', (message: ClientMessage) => {
    if (!currentPlayerId || !message.matchId) return;
    
    const game = activeGames.get(message.matchId);
    if (!game) return;
    
    if (!rematchRequests.has(message.matchId)) {
      rematchRequests.set(message.matchId, new Set());
    }
    
    rematchRequests.get(message.matchId)!.add(currentPlayerId);
    
    const requests = rematchRequests.get(message.matchId)!;
    if (requests.size === 2) {
      // Both accepted, create new game
      const lobby: Lobby = {
        id: `lobby_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        players: [game.playerRed, game.playerBlack],
        maxPlayers: 2,
        createdAt: Date.now(),
      };
      
      startGame(lobby);
      rematchRequests.delete(message.matchId);
    } else {
      // Notify other player
      const otherPlayerId = currentPlayerId === game.playerRed ? game.playerBlack : game.playerRed;
      io.to(`player:${otherPlayerId}`).emit('REMATCH_REQUEST', {
        type: 'REMATCH_REQUEST',
        message: 'Opponent wants to play again',
      } as ServerMessage);
    }
  });
  
  // Chat message
  socket.on('CHAT_MESSAGE', async (message: ClientMessage) => {
    // Rate limit check
    if (!(await rateLimitChat(socket.id, clientIp))) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Too many messages. Please slow down.' 
      } as ServerMessage);
      return;
    }
    
    if (!currentPlayerId || !message.matchId || !message.message) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Invalid chat message' 
      } as ServerMessage);
      return;
    }
    
    // Validate match ID
    if (!isValidMatchId(message.matchId)) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Invalid match ID' 
      } as ServerMessage);
      return;
    }
    
    const game = activeGames.get(message.matchId);
    if (!game) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Game not found' 
      } as ServerMessage);
      return;
    }
    
    // Verify player is in this match
    if (currentPlayerId !== game.playerRed && currentPlayerId !== game.playerBlack) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'You are not in this match' 
      } as ServerMessage);
      return;
    }
    
    // Sanitize message and nickname
    const senderNickname = sanitizeText(playerNicknames.get(currentPlayerId) || 'Unknown', 20);
    const sanitizedMessage = sanitizeText(message.message, 200);
    
    // Don't send empty messages
    if (sanitizedMessage.trim().length === 0) {
      return;
    }
    
    const chatMessage: ServerMessage = {
      type: 'CHAT_MESSAGE',
      matchId: message.matchId,
      senderNickname,
      message: sanitizedMessage,
      timestamp: Date.now(),
    };
    
    // Broadcast to both players in the match
    io.to(`match:${message.matchId}`).emit('CHAT_MESSAGE', chatMessage);
  });
  
  // Leave match - 30 second grace period
  socket.on('LEAVE_MATCH', (message: ClientMessage) => {
    if (!currentPlayerId || !message.matchId) return;
    
    const game = activeGames.get(message.matchId);
    if (!game) return;
    
    // Check if player is already in leaving state
    if (leavingPlayers.has(currentPlayerId)) {
      // Cancel existing leave timer
      const existingTimer = playerLeaveTimers.get(currentPlayerId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        playerLeaveTimers.delete(currentPlayerId);
      }
    }
    
    // Mark player as leaving
    leavingPlayers.set(currentPlayerId, message.matchId);
    
    // Start 30-second timer
    const leaveTimer = setTimeout(() => {
      // Actually leave the match after 30 seconds
      const gameToLeave = activeGames.get(message.matchId);
      if (gameToLeave) {
        activeGames.delete(message.matchId);
        playerToGame.delete(gameToLeave.playerRed);
        playerToGame.delete(gameToLeave.playerBlack);
      }
      
      socket.leave(`match:${message.matchId}`);
      
      io.to(`match:${message.matchId}`).emit('MATCH_ENDED', {
        type: 'MATCH_ENDED',
        message: 'Opponent left the match',
      } as ServerMessage);
      
      // Cleanup
      leavingPlayers.delete(currentPlayerId);
      playerLeaveTimers.delete(currentPlayerId);
      
      // Update lobby list for the leaving player
      broadcastLobbyList(currentPlayerId);
    }, 30000); // 30 seconds
    
    playerLeaveTimers.set(currentPlayerId, leaveTimer);
    
    // Leave the match room temporarily (but keep game active)
    socket.leave(`match:${message.matchId}`);
    
    // Notify player they have 30 seconds to rejoin
    socket.emit('MATCH_LEAVING', {
      type: 'MATCH_LEAVING',
      matchId: message.matchId,
      message: 'You have 30 seconds to rejoin your match',
      timeRemaining: 30,
    } as ServerMessage);
    
    // Update lobby list to show current match immediately
    setTimeout(() => {
      broadcastLobbyList(currentPlayerId);
    }, 100); // Small delay to ensure state is updated
  });
  
  // Rejoin match (cancel leave)
  socket.on('REJOIN_MATCH', (message: ClientMessage) => {
    if (!currentPlayerId || !message.matchId) return;
    
    const game = activeGames.get(message.matchId);
    if (!game) return;
    
    // Check if player is in leaving state for this match
    if (leavingPlayers.get(currentPlayerId) === message.matchId) {
      // Cancel leave timer
      const leaveTimer = playerLeaveTimers.get(currentPlayerId);
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        playerLeaveTimers.delete(currentPlayerId);
      }
      
      // Remove from leaving players
      leavingPlayers.delete(currentPlayerId);
      
      // Rejoin match room
      socket.join(`match:${message.matchId}`);
      
      // Determine player color and opponent info
      const yourColor = currentPlayerId === game.playerRed ? 'red' : 'black';
      const opponentId = yourColor === 'red' ? game.playerBlack : game.playerRed;
      const opponentNickname = sanitizeText(playerNicknames.get(opponentId) || 'Opponent', 20);
      
      // Send game state back to player
      const timeRemaining = game.moveTimerStart ? Math.max(0, 45 - Math.floor((Date.now() - game.moveTimerStart) / 1000)) : 45;
      socket.emit('GAME_START', {
        type: 'GAME_START',
        matchId: message.matchId,
        yourColor,
        board: game.board,
        opponentNickname,
        nextTurn: game.currentTurn,
        capturesRed: game.capturesRed ?? 0,
        capturesBlack: game.capturesBlack ?? 0,
        moveTimeRemaining: timeRemaining,
      } as ServerMessage);
      
      // Update lobby list
      broadcastLobbyList(currentPlayerId);
    }
  });
  
  // Forfeit match (immediate forfeit, no grace period)
  socket.on('FORFEIT_MATCH', async (message: ClientMessage) => {
    if (!currentPlayerId || !message.matchId) return;
    
    const game = activeGames.get(message.matchId);
    if (!game) return;
    
    // Verify player is in this match
    if (currentPlayerId !== game.playerRed && currentPlayerId !== game.playerBlack) {
      socket.emit('ERROR', { type: 'ERROR', message: 'You are not in this match' } as ServerMessage);
      return;
    }
    
    // Determine winner (opponent)
    const winnerId = currentPlayerId === game.playerRed ? game.playerBlack : game.playerRed;
    const winnerColor: 'red' | 'black' = currentPlayerId === game.playerRed ? 'black' : 'red';
    
    // Set winner
    game.winner = winnerColor;
    
    // Cancel any leave timers
    const leaveTimer = playerLeaveTimers.get(currentPlayerId);
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      playerLeaveTimers.delete(currentPlayerId);
    }
    leavingPlayers.delete(currentPlayerId);
    
    // Save to database
    try {
      await finishMatch(message.matchId, winnerId);
    } catch (error) {
      logger.error('Error finishing match in database (forfeit)', { error: error instanceof Error ? error.message : String(error), matchId: message.matchId, winnerId });
    }
    
    // Notify both players
    io.to(`match:${message.matchId}`).emit('GAME_OVER', {
      type: 'GAME_OVER',
      winner: winnerColor,
    } as ServerMessage);
    
    // Cleanup
    const oldTimer = moveTimers.get(message.matchId);
    if (oldTimer) {
      clearTimeout(oldTimer);
      moveTimers.delete(message.matchId);
    }
    activeGames.delete(message.matchId);
    playerToGame.delete(game.playerRed);
    playerToGame.delete(game.playerBlack);
    
    // Remove from match room
    socket.leave(`match:${message.matchId}`);
    
    // Update lobby list
    broadcastLobbyList(currentPlayerId);
    
    logGameEvent('Match forfeited', message.matchId, { forfeitedBy: currentPlayerId, nickname: currentNickname });
  });
  
  socket.on('disconnect', (reason) => {
    logSocketEvent('Client disconnected', socket.id, { reason });
    
    if (currentPlayerId) {
      // Cleanup timers immediately on disconnect
      cleanupPlayerTimers(currentPlayerId);
      
      // Only trigger disconnect timer if it's an actual disconnect (not a reconnection attempt)
      // Socket.IO will automatically try to reconnect, so we give it time
      // Only start the timer if it's a real disconnect (not just a temporary network issue)
      if (reason === 'io server disconnect' || reason === 'transport close') {
        handleDisconnect(currentPlayerId);
      } else {
        // For other disconnect reasons (like 'transport error'), wait a bit before starting timer
        // This gives the client time to reconnect
        setTimeout(() => {
          // Check if player has reconnected (socket is still disconnected after delay)
          if (!socket.connected && currentPlayerId) {
            handleDisconnect(currentPlayerId);
          }
        }, 5000); // Wait 5 seconds before starting disconnect timer
      }
      cleanupLobby(currentPlayerId);
    }
  });
});

// Health check endpoint
httpServer.on('request', async (req, res) => {
  if (req.url === '/health') {
    // Check database health asynchronously
    const dbHealthy = await checkDatabaseHealth().catch(() => false);
    
    const statusCode = dbHealthy ? 200 : 503;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: dbHealthy ? 'ok' : 'degraded', 
      database: dbHealthy ? 'healthy' : 'unhealthy',
      connections: io.engine.clientsCount,
      activeGames: activeGames.size,
      lobbies: lobbies.size,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Validate required environment variables
    const requiredEnvVars: { [key: string]: string | undefined } = {
      POSTGRES_URL: process.env.POSTGRES_URL,
    };
    
    const optionalEnvVars: { [key: string]: string | undefined } = {
      CLIENT_URL: process.env.CLIENT_URL,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    // Check required vars
    const missingVars: string[] = [];
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value || value.trim() === '') {
        missingVars.push(key);
      }
    }
    
      if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
        logger.error('Missing required environment variables', { missingVars });
        process.exit(1);
      }
    
    // Warn about missing optional vars in production
    if (process.env.NODE_ENV === 'production') {
      const missingOptional: string[] = [];
      for (const [key, value] of Object.entries(optionalEnvVars)) {
        if (!value || value.trim() === '') {
          missingOptional.push(key);
        }
      }
      
      if (missingOptional.length > 0 && missingOptional.includes('ALLOWED_ORIGINS')) {
        logger.error('✗ ALLOWED_ORIGINS is required in production for CORS security!');
        logger.error('Set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com');
        process.exit(1);
      }
      
      if (missingOptional.length > 0 && missingOptional.includes('ALLOWED_ORIGINS') === false) {
        logger.warn('Missing optional environment variables (may cause issues)', { missingOptional });
      }
    }
    
    // Validate POSTGRES_URL format if present
    if (process.env.POSTGRES_URL) {
      if (!process.env.POSTGRES_URL.startsWith('postgresql://') && 
          !process.env.POSTGRES_URL.startsWith('postgres://')) {
        logger.error('✗ POSTGRES_URL must start with postgresql:// or postgres://');
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        } else {
          logger.warn('⚠ Continuing in development mode, but database may not work');
        }
      }
    }
    
    logger.info('Starting Checkers WebSocket server...', { 
      nodeVersion: process.version, 
      port: PORT, 
      environment: process.env.NODE_ENV || 'development' 
    });
    logger.info('Configuration', {
      postgresUrl: process.env.POSTGRES_URL ? 'configured' : 'missing',
      clientUrl: process.env.CLIENT_URL || 'not set',
      allowedOrigins: process.env.ALLOWED_ORIGINS || 'not set',
    });
    
    // Initialize database schema
    try {
      await initDatabase();
      logger.info('✓ Database initialized');
      
      // Health check
      const dbHealthy = await checkDatabaseHealth();
      if (!dbHealthy) {
        logger.error('✗ Database health check failed');
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        } else {
          logger.warn('⚠ Continuing without database (development mode)');
        }
      } else {
        logger.info('✓ Database health check passed');
      }
    } catch (error) {
      logger.error('Error initializing database', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      if (process.env.NODE_ENV === 'production') {
        logger.error('Cannot continue without database in production');
        process.exit(1);
      }
      // Continue anyway in development - database might already be initialized
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
      const corsOrigin = getCorsOrigin();
      logger.info('Server started successfully', {
        port: PORT,
        cors: typeof corsOrigin === 'string' ? corsOrigin : Array.isArray(corsOrigin) ? corsOrigin.join(',') : 'all origins',
        healthCheck: `http://localhost:${PORT}/health`,
      });
    });

    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      logger.error('HTTP server error', { 
        error: error.message, 
        code: error.code, 
        port: PORT,
        stack: error.stack 
      });
      if (error.code === 'EADDRINUSE') {
        logger.error('Port already in use', { port: PORT });
      }
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { 
        error: error.message, 
        stack: error.stack,
        name: error.name 
      });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { 
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: String(promise)
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

startServer().catch((error) => {
  logger.error('Fatal error starting server', { 
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    io.close(() => {
      logger.info('Socket.IO server closed');
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
  });
});

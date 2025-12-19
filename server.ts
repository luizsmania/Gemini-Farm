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
import { initDatabase, createMatch, finishMatch, addMove, getPlayerById, createPlayer, getMatchHistory } from './api/database.js';
import { GameState, Lobby, ClientMessage, ServerMessage } from './types/checkers.js';

// Create HTTP server
const httpServer = http.createServer();

// Configure CORS for production
const getCorsOrigin = () => {
  // In production, allow specific origins
  if (process.env.CLIENT_URL) {
    return process.env.CLIENT_URL;
  }
  if (process.env.VITE_CLIENT_URL) {
    return process.env.VITE_CLIENT_URL;
  }
  // Allow all origins in development
  if (process.env.NODE_ENV === 'development') {
    return '*';
  }
  // In production without CLIENT_URL, allow common Vercel patterns
  return true; // Allow all origins (Socket.IO will check origin automatically)
};

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: getCorsOrigin(),
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
      const creatorNickname = lobby.creatorId ? (playerNicknames.get(lobby.creatorId) || 'Unknown') : 'Unknown';
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
        const opponentNickname = playerNicknames.get(opponentId) || 'Opponent';
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
      console.error('Database error creating match:', dbError);
      // If database fails, use lobby ID as match ID
      matchId = lobby.id;
      console.warn(`Using lobby ID as match ID: ${matchId}`);
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
    console.log(`[GAME_START] Initialized game ${matchId} with captures: Red=0, Black=0`);
    
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
    
    // Get opponent nicknames
    const playerRedNickname = playerNicknames.get(playerRed) || 'Player 1';
    const playerBlackNickname = playerNicknames.get(playerBlack) || 'Player 2';
    
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
    
    console.log(`Game started: ${matchId}, Red: ${playerRed}, Black: ${playerBlack}`);
  } catch (error) {
    console.error('Error starting game:', error);
  }
}

// Handle player disconnect
function handleDisconnect(playerId: string) {
  const matchId = playerToGame.get(playerId);
  if (!matchId) return;
  
  const game = activeGames.get(matchId);
  if (!game || game.winner !== null) return; // Game already ended
  
  // Check if there's already a disconnect timer running
  if (playerDisconnectTimers.has(playerId)) {
    console.log(`Player ${playerId} already has a disconnect timer, not starting a new one`);
    return;
  }
  
  // Set 30 second timer
  console.log(`Player ${playerId} disconnected, starting 30s forfeit timer`);
  
  const timer = setTimeout(async () => {
    // Forfeit game
    const winnerId = playerId === game.playerRed ? game.playerBlack : game.playerRed;
    const winnerColor: 'red' | 'black' = playerId === game.playerRed ? 'black' : 'red';
    
    game.winner = winnerColor;
    
    try {
      await finishMatch(matchId, winnerId);
    } catch (error) {
      console.error('Error finishing match:', error);
    }
    
    // Notify players
    io.to(`match:${matchId}`).emit('GAME_OVER', {
      type: 'GAME_OVER',
      winner: winnerColor,
    } as ServerMessage);
    
    // Cleanup
    const oldTimer = moveTimers.get(matchId);
    if (oldTimer) {
      clearTimeout(oldTimer);
      moveTimers.delete(matchId);
    }
    activeGames.delete(matchId);
    playerToGame.delete(game.playerRed);
    playerToGame.delete(game.playerBlack);
    playerDisconnectTimers.delete(playerId);
    
    console.log(`Game ${matchId} forfeited by ${playerId}`);
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
    console.log(`Player ${playerId} reconnected, cleared disconnect timer`);
    
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
  // Clear existing timer if any
  const oldTimer = moveTimers.get(matchId);
  if (oldTimer) {
    clearTimeout(oldTimer);
  }
  
  // Only start timer if game is active and not already won
  if (game.winner !== null) return;
  
  const timer = setTimeout(async () => {
    // Time's up - forfeit current player
    const currentPlayerId = game.currentTurn === 'red' ? game.playerRed : game.playerBlack;
    const winnerId = game.currentTurn === 'red' ? game.playerBlack : game.playerRed;
    const winnerColor: 'red' | 'black' = game.currentTurn === 'red' ? 'black' : 'red';
    
    game.winner = winnerColor;
    
    try {
      await finishMatch(matchId, winnerId);
    } catch (error) {
      console.error('Error finishing match:', error);
    }
    
    // Notify players
    io.to(`match:${matchId}`).emit('GAME_OVER', {
      type: 'GAME_OVER',
      winner: winnerColor,
    } as ServerMessage);
    
    // Cleanup
    activeGames.delete(matchId);
    playerToGame.delete(game.playerRed);
    playerToGame.delete(game.playerBlack);
    moveTimers.delete(matchId);
    
    console.log(`Game ${matchId} forfeited by ${currentPlayerId} (timeout)`);
  }, 45000); // 45 seconds
  
  moveTimers.set(matchId, timer);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  let currentPlayerId: string | null = null;
  let currentNickname: string | null = null;
  
  // Log all incoming events for debugging
  const originalOnevent = socket.onevent;
  socket.onevent = function (packet: any) {
    const args = packet.data || [];
    const eventName = args[0];
    if (eventName === 'MOVE') {
      console.log(`[Socket ${socket.id}] ========== MOVE EVENT RECEIVED ==========`);
      console.log(`[Socket ${socket.id}] MOVE data:`, JSON.stringify(args[1]));
      console.log(`[Socket ${socket.id}] Full packet:`, JSON.stringify(packet));
    } else if (eventName) {
      console.log(`[Socket ${socket.id}] Event received:`, eventName);
    }
    originalOnevent.call(this, packet);
  };
  
  // Set nickname and create/get player
  socket.on('SET_NICKNAME', async (message: ClientMessage) => {
    try {
      if (!message.nickname || message.nickname.trim().length === 0) {
        socket.emit('ERROR', { type: 'ERROR', message: 'Nickname is required' } as ServerMessage);
        return;
      }
      
      const nickname = message.nickname.trim();
      
      // Check if player provided an existing playerId (for reconnection after page refresh)
      let existingPlayerId: string | null = null;
      if (message.playerId && typeof message.playerId === 'string') {
        // First check if this playerId is in an active game
        const matchId = playerToGame.get(message.playerId);
        if (matchId) {
          const game = activeGames.get(matchId);
          if (game && game.winner === null) {
            // Player is reconnecting to an active game
            existingPlayerId = message.playerId;
            console.log(`Player reconnecting with existing playerId: ${existingPlayerId} to match: ${matchId}`);
            
            // Cancel disconnect timer if it exists
            handleReconnect(existingPlayerId);
            
            // Rejoin match room
            socket.join(`match:${matchId}`);
            
            // Update nickname mapping
            playerNicknames.set(existingPlayerId, nickname);
            
            // Determine player color
            const yourColor = existingPlayerId === game.playerRed ? 'red' : 'black';
            const opponentId = yourColor === 'red' ? game.playerBlack : game.playerRed;
            const opponentNickname = playerNicknames.get(opponentId) || 'Opponent';
            
            currentPlayerId = existingPlayerId;
            currentNickname = nickname;
            
            // Join player-specific room
            socket.join(`player:${currentPlayerId}`);
            
            console.log(`Player ${currentNickname} (${currentPlayerId}) reconnected to match ${matchId}`);
            
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
            console.log(`Reusing existing playerId: ${existingPlayerId} for nickname: ${nickname}`);
          }
        } catch (dbError: any) {
          console.log('Could not verify existing playerId, will create new player:', dbError.message);
        }
      }
      
      // Create new player (first time or not reconnecting to active game)
      if (!existingPlayerId) {
        let player;
        try {
          player = await createPlayer(nickname);
          currentPlayerId = player.id;
        } catch (dbError: any) {
          console.error('Database error creating player:', dbError);
          // If database fails, use a temporary ID based on socket ID and nickname
          // This allows the game to work even if database is down
          currentPlayerId = `temp_${socket.id}_${Date.now()}`;
          console.warn(`Using temporary player ID: ${currentPlayerId}`);
        }
      } else {
        // Reusing existing playerId (already set above for reconnection case)
        currentPlayerId = existingPlayerId;
      }
      
      currentNickname = nickname;
      playerNicknames.set(currentPlayerId, currentNickname);
      
      // Join player-specific room
      socket.join(`player:${currentPlayerId}`);
      
      console.log(`Player ${currentNickname} (${currentPlayerId}) connected`);
      
      // Send player ID back to client
      socket.emit('NICKNAME_SET', {
        type: 'NICKNAME_SET',
        playerId: currentPlayerId,
        nickname: currentNickname,
      });
      
      // Send lobby list
      broadcastLobbyList();
    } catch (error: any) {
      console.error('Error setting nickname:', error);
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: `Failed to set nickname: ${error.message || 'Unknown error'}` 
      } as ServerMessage);
    }
  });
  
  // Create lobby
  socket.on('CREATE_LOBBY', () => {
    if (!currentPlayerId) {
      socket.emit('ERROR', { type: 'ERROR', message: 'Please set nickname first' } as ServerMessage);
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
    
    console.log(`Lobby ${lobbyId} created by ${currentNickname}`);
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
        const opponentNickname = playerNicknames.get(opponentId) || 'Opponent';
        
        // Send game state back to player
        socket.emit('GAME_START', {
          type: 'GAME_START',
          matchId: message.lobbyId,
          yourColor,
          board: game.board,
          opponentNickname,
          nextTurn: game.currentTurn,
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
    
    console.log(`${currentNickname} joined lobby ${message.lobbyId}`);
    
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
    console.log(`[MOVE] ========== MOVE HANDLER CALLED ==========`);
    console.log(`[MOVE] Socket ID: ${socket.id}`);
    console.log(`[MOVE] Raw message:`, message);
    console.log(`[MOVE] Message keys:`, message ? Object.keys(message) : 'null');
    
    try {
      // Ensure message is in correct format
      const moveMessage: ClientMessage = message && typeof message === 'object' ? message : { type: 'MOVE', ...message };
      
      console.log(`[MOVE] Processed message:`, JSON.stringify(moveMessage));
      console.log(`[MOVE] Current player ID:`, currentPlayerId);
      
      if (!currentPlayerId) {
        console.log('[MOVE] Rejected: Not authenticated');
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: 'Not authenticated' } as ServerMessage);
        return;
      }
      
      if (moveMessage.from === undefined || moveMessage.to === undefined || !moveMessage.matchId) {
        console.log('[MOVE] Rejected: Invalid move data', { from: moveMessage.from, to: moveMessage.to, matchId: moveMessage.matchId });
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: 'Invalid move data' } as ServerMessage);
        return;
      }
      
      const game = activeGames.get(moveMessage.matchId);
      if (!game) {
        console.log('[MOVE] Rejected: Game not found');
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: 'Game not found' } as ServerMessage);
        return;
      }
      
      // Check if it's player's turn
      const playerColor = currentPlayerId === game.playerRed ? 'red' : 'black';
      if (playerColor !== game.currentTurn) {
        console.log(`[MOVE] Rejected: Not player's turn. Player: ${playerColor}, Current turn: ${game.currentTurn}`);
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
        console.log('[MOVE] Rejected: Invalid move -', validation.reason);
        socket.emit('MOVE_REJECTED', { type: 'MOVE_REJECTED', reason: validation.reason || 'Invalid move' } as ServerMessage);
        return;
      }
      
      console.log('[MOVE] Validated, applying move...');
      
      // Apply move (use captures from validation)
      const captures = validation.captures || [];
      const result = applyMove(game.board, moveMessage.from!, moveMessage.to!, game.currentTurn, captures);
      game.board = result.newBoard;
      game.lastMove = { from: moveMessage.from!, to: moveMessage.to! };
      
      // Track captures - always update, even during continued jumps
      if (game.capturesRed === undefined) game.capturesRed = 0;
      if (game.capturesBlack === undefined) game.capturesBlack = 0;
      if (result.captures && result.captures.length > 0) {
        if (game.currentTurn === 'red') {
          game.capturesRed += result.captures.length;
          console.log(`[MOVE] Red captured ${result.captures.length} piece(s). Total: ${game.capturesRed}`);
        } else {
          game.capturesBlack += result.captures.length;
          console.log(`[MOVE] Black captured ${result.captures.length} piece(s). Total: ${game.capturesBlack}`);
        }
      }
      
      // Save move to database - count moves in game state
      if (!game.moveCount) game.moveCount = 0;
      game.moveCount++;
      try {
        await addMove(moveMessage.matchId!, game.moveCount, moveMessage.from!, moveMessage.to!);
      } catch (dbError) {
        // Non-critical - game continues even if move isn't saved
        console.error('Error saving move to database (non-critical):', dbError);
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
          console.error('Error finishing match in database (non-critical):', dbError);
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
        console.log(`[MOVE] Captures - Red: ${moveAcceptedMessage.capturesRed}, Black: ${moveAcceptedMessage.capturesBlack}`);
        console.log(`[MOVE] Broadcasting MOVE_ACCEPTED to match:${moveMessage.matchId}`);
        console.log(`[MOVE] Board length: ${moveAcceptedMessage.board?.length}, Next turn: ${moveAcceptedMessage.nextTurn}`);
        console.log(`[MOVE] Full message:`, JSON.stringify(moveAcceptedMessage));
        
        // Emit to both the match room and directly to the socket to ensure delivery
        io.to(`match:${moveMessage.matchId}`).emit('MOVE_ACCEPTED', moveAcceptedMessage);
        console.log(`[MOVE] Emitted to match room: match:${moveMessage.matchId}`);
        
        socket.emit('MOVE_ACCEPTED', moveAcceptedMessage);
        console.log(`[MOVE] Emitted directly to socket ${socket.id}`);
        console.log(`[MOVE] Socket connected: ${socket.connected}, Socket ID: ${socket.id}`);
        console.log(`[MOVE] ========== MOVE HANDLER COMPLETE ==========`);
      }
    } catch (error) {
      console.error('[MOVE] Error processing move:', error);
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
  socket.on('CHAT_MESSAGE', (message: ClientMessage) => {
    if (!currentPlayerId || !message.matchId || !message.message) return;
    
    const game = activeGames.get(message.matchId);
    if (!game) return;
    
    // Verify player is in this match
    if (currentPlayerId !== game.playerRed && currentPlayerId !== game.playerBlack) {
      return;
    }
    
    const senderNickname = playerNicknames.get(currentPlayerId) || 'Unknown';
    const chatMessage: ServerMessage = {
      type: 'CHAT_MESSAGE',
      matchId: message.matchId,
      senderNickname,
      message: message.message.trim().substring(0, 200), // Limit message length
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
      const opponentNickname = playerNicknames.get(opponentId) || 'Opponent';
      
      // Send game state back to player
      const timeRemaining = game.moveTimerStart ? Math.max(0, 45 - Math.floor((Date.now() - game.moveTimerStart) / 1000)) : 45;
      socket.emit('GAME_START', {
        type: 'GAME_START',
        matchId: message.matchId,
        yourColor,
        board: game.board,
        opponentNickname,
        nextTurn: game.currentTurn,
        capturesRed: game.capturesRed || 0,
        capturesBlack: game.capturesBlack || 0,
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
      console.error('Error finishing match in database:', error);
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
    
    console.log(`Match ${message.matchId} forfeited by ${currentNickname}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log(`Client ${socket.id} disconnected: ${reason}`);
    
    if (currentPlayerId) {
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
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
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
    console.log('Starting Checkers WebSocket server...');
    console.log(`Node version: ${process.version}`);
    console.log(`Port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Initialize database schema
    try {
      await initDatabase();
      console.log('✓ Database initialized');
    } catch (error) {
      console.error('⚠ Error initializing database:', error);
      // Continue anyway - database might already be initialized
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Checkers WebSocket server running on port ${PORT}`);
      const corsOrigin = getCorsOrigin();
      console.log(`✓ CORS enabled for: ${typeof corsOrigin === 'string' ? corsOrigin : corsOrigin === true ? 'all origins' : 'none'}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
      console.log(`✓ Socket.IO server ready for connections`);
    });

    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      console.error('✗ HTTP server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
      process.exit(1);
    });

    process.on('uncaughtException', (error) => {
      console.error('✗ Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('✗ Unhandled rejection at:', promise, 'reason:', reason);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('✗ Fatal error starting server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed');
    io.close(() => {
      console.log('Socket.IO server closed');
      process.exit(0);
    });
  });
});

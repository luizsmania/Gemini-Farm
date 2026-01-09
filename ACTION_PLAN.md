# 🎯 Prioritized Action Plan - Critical Fixes

**Based on:** Security Audit Report  
**Priority Order:** Critical → High → Medium  
**Estimated Time:** 2-3 weeks for critical fixes

---

## Phase 1: Critical Security Fixes (Week 1)

### ✅ Task 1.1: Fix XSS Vulnerability in Chat
**Priority:** CRITICAL  
**Time:** 2 hours  
**Files:** `server.ts`, `components/CheckersGame.tsx`

**Implementation:**

1. Install DOMPurify:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

2. Update `server.ts` (line ~854):
```typescript
import DOMPurify from 'isomorphic-dompurify'; // Server-side sanitization

socket.on('CHAT_MESSAGE', (message: ClientMessage) => {
  if (!currentPlayerId || !message.matchId || !message.message) return;
  
  const game = activeGames.get(message.matchId);
  if (!game) return;
  
  if (currentPlayerId !== game.playerRed && currentPlayerId !== game.playerBlack) {
    return;
  }
  
  const senderNickname = playerNicknames.get(currentPlayerId) || 'Unknown';
  
  // Sanitize message
  const sanitizedMessage = DOMPurify.sanitize(
    message.message.trim().substring(0, 200),
    { ALLOWED_TAGS: [], ALLOWED_ATTR: [] } // Strip all HTML
  );
  
  const chatMessage: ServerMessage = {
    type: 'CHAT_MESSAGE',
    matchId: message.matchId,
    senderNickname: DOMPurify.sanitize(senderNickname, { ALLOWED_TAGS: [] }),
    message: sanitizedMessage,
    timestamp: Date.now(),
  };
  
  io.to(`match:${message.matchId}`).emit('CHAT_MESSAGE', chatMessage);
});
```

3. Update `components/CheckersGame.tsx` (line ~1819):
```typescript
// Already safe - React auto-escapes, but ensure no dangerouslySetInnerHTML
<div className={...}>
  {msg.message} {/* React escapes automatically */}
</div>
```

**Testing:**
- Try injecting `<script>alert('XSS')</script>` in chat
- Verify it's displayed as plain text, not executed

---

### ✅ Task 1.2: Fix CORS Configuration
**Priority:** CRITICAL  
**Time:** 1 hour  
**Files:** `server.ts`

**Implementation:**

Update `server.ts` (lines 22-48):
```typescript
const getCorsOrigin = () => {
  // Development: allow localhost
  if (process.env.NODE_ENV === 'development') {
    return process.env.CLIENT_URL || 'http://localhost:3000';
  }
  
  // Production: MUST specify allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [];
  
  if (allowedOrigins.length === 0) {
    console.error('ERROR: ALLOWED_ORIGINS must be set in production!');
    console.error('Set ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com');
    // Fail fast in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ALLOWED_ORIGINS environment variable is required in production');
    }
    // Development fallback
    return 'http://localhost:3000';
  }
  
  return allowedOrigins;
};

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      const allowed = getCorsOrigin();
      
      if (typeof allowed === 'string') {
        // Single origin
        if (!origin || origin === allowed) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else if (Array.isArray(allowed)) {
        // Multiple origins
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      } else {
        callback(new Error('Invalid CORS configuration'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type'],
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});
```

**Environment Variables:**
Add to `.env` and production:
```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Testing:**
- Verify connection from allowed origin works
- Verify connection from disallowed origin is rejected
- Check browser console for CORS errors

---

### ✅ Task 1.3: Add Rate Limiting
**Priority:** CRITICAL  
**Time:** 4 hours  
**Files:** `server.ts`, new file `middleware/rateLimiter.ts`

**Implementation:**

1. Install dependencies:
```bash
npm install express-rate-limit
npm install --save-dev @types/express-rate-limit
```

2. Create `middleware/rateLimiter.ts`:
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Per-IP rate limiters
const moveLimiter = new RateLimiterMemory({
  points: 10, // 10 moves
  duration: 1, // per second
});

const chatLimiter = new RateLimiterMemory({
  points: 5, // 5 messages
  duration: 1, // per second
});

const lobbyLimiter = new RateLimiterMemory({
  points: 1, // 1 lobby
  duration: 10, // per 10 seconds
});

const nicknameLimiter = new RateLimiterMemory({
  points: 3, // 3 attempts
  duration: 60, // per minute
});

export async function rateLimitMove(socketId: string, ip: string): Promise<boolean> {
  try {
    await moveLimiter.consume(`${ip}:move`);
    return true;
  } catch {
    return false;
  }
}

export async function rateLimitChat(socketId: string, ip: string): Promise<boolean> {
  try {
    await chatLimiter.consume(`${ip}:chat`);
    return true;
  } catch {
    return false;
  }
}

export async function rateLimitLobby(socketId: string, ip: string): Promise<boolean> {
  try {
    await lobbyLimiter.consume(`${ip}:lobby`);
    return true;
  } catch {
    return false;
  }
}

export async function rateLimitNickname(socketId: string, ip: string): Promise<boolean> {
  try {
    await nicknameLimiter.consume(`${ip}:nickname`);
    return true;
  } catch {
    return false;
  }
}
```

3. Update `server.ts`:
```typescript
import { rateLimitMove, rateLimitChat, rateLimitLobby, rateLimitNickname } from './middleware/rateLimiter.js';

io.on('connection', (socket) => {
  const clientIp = socket.handshake.address || socket.request.socket.remoteAddress || 'unknown';
  console.log('Client connected:', socket.id, 'from IP:', clientIp);
  
  // ... existing code ...
  
  socket.on('SET_NICKNAME', async (message: ClientMessage) => {
    // Rate limit check
    if (!(await rateLimitNickname(socket.id, clientIp))) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Too many nickname attempts. Please wait a minute.' 
      } as ServerMessage);
      return;
    }
    
    // ... rest of existing code ...
  });
  
  socket.on('CREATE_LOBBY', async () => {
    // Rate limit check
    if (!(await rateLimitLobby(socket.id, clientIp))) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Too many lobby creations. Please wait 10 seconds.' 
      } as ServerMessage);
      return;
    }
    
    // ... rest of existing code ...
  });
  
  socket.on('MOVE', async (message: any) => {
    // Rate limit check
    if (!(await rateLimitMove(socket.id, clientIp))) {
      socket.emit('MOVE_REJECTED', { 
        type: 'MOVE_REJECTED', 
        reason: 'Too many moves. Please slow down.' 
      } as ServerMessage);
      return;
    }
    
    // ... rest of existing code ...
  });
  
  socket.on('CHAT_MESSAGE', async (message: ClientMessage) => {
    // Rate limit check
    if (!(await rateLimitChat(socket.id, clientIp))) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Too many messages. Please slow down.' 
      } as ServerMessage);
      return;
    }
    
    // ... rest of existing code ...
  });
});
```

**Note:** For production, use Redis-based rate limiter for distributed systems:
```bash
npm install rate-limiter-flexible ioredis
```

**Testing:**
- Try sending 20 moves in 1 second - should be rate limited
- Try creating 2 lobbies in 5 seconds - should be rate limited
- Verify error messages are user-friendly

---

### ✅ Task 1.4: Add Input Validation
**Priority:** CRITICAL  
**Time:** 3 hours  
**Files:** `server.ts`

**Implementation:**

Add validation utilities at top of `server.ts`:
```typescript
// Validation utilities
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof str === 'string' && uuidRegex.test(str);
}

function isValidBoardPosition(pos: number): boolean {
  return typeof pos === 'number' && 
         Number.isInteger(pos) && 
         pos >= 0 && 
         pos < 64;
}

function sanitizeNickname(nickname: string): string {
  return nickname
    .trim()
    .substring(0, 20)
    .replace(/[<>\"'&]/g, '') // Remove dangerous chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/^\s+|\s+$/g, ''); // Trim again
}

function isValidNickname(nickname: string): boolean {
  if (!nickname || typeof nickname !== 'string') return false;
  const sanitized = sanitizeNickname(nickname);
  return sanitized.length >= 1 && sanitized.length <= 20;
}
```

Update handlers:
```typescript
socket.on('SET_NICKNAME', async (message: ClientMessage) => {
  try {
    // Validate input
    if (!message.nickname || !isValidNickname(message.nickname)) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Nickname must be 1-20 characters and contain only letters, numbers, and spaces.' 
      } as ServerMessage);
      return;
    }
    
    const nickname = sanitizeNickname(message.nickname);
    
    // Validate playerId if provided
    if (message.playerId && !isValidUUID(message.playerId)) {
      socket.emit('ERROR', { 
        type: 'ERROR', 
        message: 'Invalid player ID format.' 
      } as ServerMessage);
      return;
    }
    
    // ... rest of existing code using 'nickname' variable ...
  } catch (error: any) {
    console.error('Error setting nickname:', error);
    socket.emit('ERROR', { 
      type: 'ERROR', 
      message: `Failed to set nickname: ${error.message || 'Unknown error'}` 
    } as ServerMessage);
  }
});

socket.on('MOVE', async (message: any) => {
  try {
    // Validate input types and values
    if (!currentPlayerId) {
      socket.emit('MOVE_REJECTED', { 
        type: 'MOVE_REJECTED', 
        reason: 'Not authenticated' 
      } as ServerMessage);
      return;
    }
    
    if (typeof message !== 'object' || message === null) {
      socket.emit('MOVE_REJECTED', { 
        type: 'MOVE_REJECTED', 
        reason: 'Invalid message format' 
      } as ServerMessage);
      return;
    }
    
    if (!isValidBoardPosition(message.from) || 
        !isValidBoardPosition(message.to) || 
        !message.matchId) {
      socket.emit('MOVE_REJECTED', { 
        type: 'MOVE_REJECTED', 
        reason: 'Invalid move data' 
      } as ServerMessage);
      return;
    }
    
    if (!isValidUUID(message.matchId)) {
      socket.emit('MOVE_REJECTED', { 
        type: 'MOVE_REJECTED', 
        reason: 'Invalid match ID format' 
      } as ServerMessage);
      return;
    }
    
    // ... rest of existing code ...
  } catch (error) {
    console.error('[MOVE] Error processing move:', error);
    socket.emit('MOVE_REJECTED', { 
      type: 'MOVE_REJECTED', 
      reason: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    } as ServerMessage);
  }
});

socket.on('JOIN_LOBBY', (message: ClientMessage) => {
  if (!currentPlayerId) {
    socket.emit('ERROR', { type: 'ERROR', message: 'Please set nickname first' } as ServerMessage);
    return;
  }
  
  if (!message.lobbyId || typeof message.lobbyId !== 'string') {
    socket.emit('ERROR', { type: 'ERROR', message: 'Lobby ID required' } as ServerMessage);
    return;
  }
  
  // ... rest of existing code ...
});
```

Update `api/match-history.ts`:
```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.query;

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ success: false, error: 'Player ID is required' });
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(playerId)) {
      return res.status(400).json({ success: false, error: 'Invalid player ID format' });
    }

    // ... rest of existing code ...
  } catch (error: any) {
    // ... existing error handling ...
  }
}
```

**Testing:**
- Try invalid UUIDs - should be rejected
- Try negative board positions - should be rejected
- Try non-integer positions - should be rejected
- Try extremely long nicknames - should be truncated/sanitized

---

## Phase 2: Critical Reliability Fixes (Week 1-2)

### ✅ Task 2.1: Fix Memory Leaks - Timer Cleanup
**Priority:** HIGH  
**Time:** 3 hours  
**Files:** `server.ts`

**Implementation:**

Add cleanup utility function:
```typescript
// Cleanup utility
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
```

Update `handleDisconnect`:
```typescript
function handleDisconnect(playerId: string) {
  const matchId = playerToGame.get(playerId);
  if (!matchId) {
    cleanupPlayerTimers(playerId);
    return;
  }
  
  const game = activeGames.get(matchId);
  if (!game || game.winner !== null) {
    cleanupPlayerTimers(playerId);
    return;
  }
  
  if (playerDisconnectTimers.has(playerId)) {
    console.log(`Player ${playerId} already has a disconnect timer, not starting a new one`);
    return;
  }
  
  console.log(`Player ${playerId} disconnected, starting 30s forfeit timer`);
  
  const timer = setTimeout(async () => {
    const winnerId = playerId === game.playerRed ? game.playerBlack : game.playerRed;
    const winnerColor: 'red' | 'black' = playerId === game.playerRed ? 'black' : 'red';
    
    game.winner = winnerColor;
    
    try {
      await finishMatch(matchId, winnerId);
    } catch (error) {
      console.error('Error finishing match:', error);
    }
    
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
    
    console.log(`Game ${matchId} forfeited by ${playerId}`);
  }, 30000);
  
  playerDisconnectTimers.set(playerId, timer);
  
  const otherPlayerId = playerId === game.playerRed ? game.playerBlack : game.playerRed;
  io.to(`player:${otherPlayerId}`).emit('PLAYER_DISCONNECTED', {
    type: 'PLAYER_DISCONNECTED',
    message: 'Opponent disconnected. Game will end in 30 seconds if they don\'t return.',
  } as ServerMessage);
}
```

Update `startMoveTimer`:
```typescript
function startMoveTimer(matchId: string, game: GameState) {
  // Clear existing timer
  cleanupGameTimers(matchId);
  
  if (game.winner !== null) return;
  
  const timer = setTimeout(async () => {
    const currentPlayerId = game.currentTurn === 'red' ? game.playerRed : game.playerBlack;
    const winnerId = game.currentTurn === 'red' ? game.playerBlack : game.playerRed;
    const winnerColor: 'red' | 'black' = game.currentTurn === 'red' ? 'black' : 'red';
    
    game.winner = winnerColor;
    
    try {
      await finishMatch(matchId, winnerId);
    } catch (error) {
      console.error('Error finishing match:', error);
    }
    
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
    
    console.log(`Game ${matchId} forfeited by ${currentPlayerId} (timeout)`);
  }, 45000);
  
  moveTimers.set(matchId, timer);
}
```

Update `socket.on('disconnect')`:
```typescript
socket.on('disconnect', (reason) => {
  console.log(`Client ${socket.id} disconnected: ${reason}`);
  
  if (currentPlayerId) {
    // Cleanup timers immediately
    cleanupPlayerTimers(currentPlayerId);
    
    if (reason === 'io server disconnect' || reason === 'transport close') {
      handleDisconnect(currentPlayerId);
    } else {
      setTimeout(() => {
        if (!socket.connected && currentPlayerId) {
          handleDisconnect(currentPlayerId);
        }
      }, 5000);
    }
    cleanupLobby(currentPlayerId);
  }
});
```

**Testing:**
- Connect/disconnect multiple times - check memory doesn't grow
- Monitor process memory over time
- Use `process.memoryUsage()` to track

---

### ✅ Task 2.2: Add Environment Variable Validation
**Priority:** HIGH  
**Time:** 1 hour  
**Files:** `server.ts`

**Implementation:**

Add at top of `startServer` function:
```typescript
async function startServer() {
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
    console.error('✗ Missing required environment variables:');
    missingVars.forEach(v => console.error(`  - ${v}`));
    console.error('\nServer cannot start without these variables.');
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
    
    if (missingOptional.length > 0) {
      console.warn('⚠ Missing optional environment variables (may cause issues):');
      missingOptional.forEach(v => console.warn(`  - ${v}`));
    }
  }
  
  // Validate POSTGRES_URL format if present
  if (process.env.POSTGRES_URL) {
    if (!process.env.POSTGRES_URL.startsWith('postgresql://') && 
        !process.env.POSTGRES_URL.startsWith('postgres://')) {
      console.error('✗ POSTGRES_URL must start with postgresql:// or postgres://');
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
  
  // Log configuration (without secrets)
  console.log('Configuration:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  PORT: ${process.env.PORT || 3001}`);
  console.log(`  POSTGRES_URL: ${process.env.POSTGRES_URL ? '✓ configured' : '✗ missing'}`);
  console.log(`  CLIENT_URL: ${process.env.CLIENT_URL || 'not set'}`);
  console.log(`  ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || 'not set'}`);
  
  try {
    console.log('Starting Checkers WebSocket server...');
    // ... rest of existing code ...
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Testing:**
- Start server without POSTGRES_URL in production - should exit
- Start server with invalid POSTGRES_URL format - should warn/exit
- Verify startup logs show configuration status

---

### ✅ Task 2.3: Add Null Safety Checks
**Priority:** HIGH  
**Time:** 2 hours  
**Files:** `server.ts`, `components/CheckersGame.tsx`

**Implementation:**

Update `server.ts` - ensure all optional properties have defaults:
```typescript
// In startGame function, ensure all properties initialized
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
  capturesRed: 0, // Explicitly set to 0
  capturesBlack: 0, // Explicitly set to 0
  moveTimerStart: Date.now(), // Always set
};

// In MOVE handler, always use nullish coalescing
const timeRemaining = game.moveTimerStart 
  ? Math.max(0, 45 - Math.floor((Date.now() - game.moveTimerStart) / 1000))
  : 45;

const capturesRed = game.capturesRed ?? 0;
const capturesBlack = game.capturesBlack ?? 0;
```

Update `components/CheckersGame.tsx`:
```typescript
// Always use nullish coalescing
const capturesRed = message.capturesRed ?? 0;
const capturesBlack = message.capturesBlack ?? 0;
const moveTimeRemaining = message.moveTimeRemaining ?? 45;
```

**Testing:**
- Create game and verify all properties initialized
- Check that undefined values don't cause errors
- Verify calculations work with null/undefined values

---

## Phase 3: High Priority Fixes (Week 2)

### ✅ Task 3.1: Add Basic Logging Infrastructure
**Priority:** HIGH  
**Time:** 4 hours  
**Files:** New file `utils/logger.ts`, update `server.ts`

**Implementation:**

1. Install Winston:
```bash
npm install winston
```

2. Create `utils/logger.ts`:
```typescript
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'checkers-server' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
```

3. Update `server.ts`:
```typescript
import logger from './utils/logger.js';

// Replace console.log with logger
logger.info('Starting Checkers WebSocket server...');
logger.error('Database error:', error);
logger.warn('Using temporary player ID:', currentPlayerId);
```

**Testing:**
- Verify logs are written to files
- Check log levels work correctly
- Verify production doesn't log to console

---

### ✅ Task 3.2: Add Database Health Check
**Priority:** HIGH  
**Time:** 2 hours  
**Files:** `server.ts`, `api/database.ts`

**Implementation:**

Add to `api/database.ts`:
```typescript
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}
```

Update `server.ts`:
```typescript
import { checkDatabaseHealth } from './api/database.js';

// In startServer function, after initDatabase:
try {
  await initDatabase();
  console.log('✓ Database initialized');
  
  // Health check
  const dbHealthy = await checkDatabaseHealth();
  if (!dbHealthy) {
    console.error('✗ Database health check failed');
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠ Continuing without database (development mode)');
    }
  } else {
    console.log('✓ Database health check passed');
  }
} catch (error) {
  console.error('⚠ Error initializing database:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Add health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    // Async health check
    checkDatabaseHealth().then(dbHealthy => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        database: dbHealthy ? 'healthy' : 'unhealthy',
        connections: io.engine.clientsCount,
        activeGames: activeGames.size,
        lobbies: lobbies.size,
        timestamp: new Date().toISOString(),
      }));
    }).catch(() => {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', database: 'unhealthy' }));
    });
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});
```

**Testing:**
- Stop database, check health endpoint returns unhealthy
- Start database, verify health check passes
- Verify server exits in production if DB unhealthy

---

## Phase 4: Testing Infrastructure (Week 2-3)

### ✅ Task 4.1: Set Up Testing Framework
**Priority:** HIGH  
**Time:** 6 hours  
**Files:** New test files

**Implementation:**

1. Install dependencies:
```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @types/node
```

2. Create `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'server/**/*.ts',
    'api/**/*.ts',
    'services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};
```

3. Create first test `tests/checkersEngine.test.ts`:
```typescript
import { createInitialBoard, validateMove, applyMove, checkGameOver } from '../server/checkersEngine';

describe('Checkers Engine', () => {
  test('creates initial board with correct piece placement', () => {
    const board = createInitialBoard();
    expect(board.length).toBe(64);
    
    // Check black pieces (top 3 rows)
    let blackCount = 0;
    for (let i = 0; i < 24; i++) {
      if (board[i] === 'b') blackCount++;
    }
    expect(blackCount).toBe(12);
    
    // Check red pieces (bottom 3 rows)
    let redCount = 0;
    for (let i = 40; i < 64; i++) {
      if (board[i] === 'r') redCount++;
    }
    expect(redCount).toBe(12);
  });
  
  test('validates move correctly', () => {
    const board = createInitialBoard();
    const result = validateMove(board, 27, 20, 'red', false, null);
    expect(result.valid).toBe(true);
  });
  
  test('rejects invalid move', () => {
    const board = createInitialBoard();
    const result = validateMove(board, 27, 28, 'red', false, null);
    expect(result.valid).toBe(false);
  });
});
```

4. Update `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**Testing:**
- Run `npm test` - should execute tests
- Verify coverage report generated
- Add more tests incrementally

---

## Implementation Checklist

### Week 1
- [ ] Task 1.1: Fix XSS Vulnerability
- [ ] Task 1.2: Fix CORS Configuration
- [ ] Task 1.3: Add Rate Limiting
- [ ] Task 1.4: Add Input Validation
- [ ] Task 2.1: Fix Memory Leaks
- [ ] Task 2.2: Add Environment Variable Validation
- [ ] Task 2.3: Add Null Safety Checks

### Week 2
- [ ] Task 3.1: Add Basic Logging
- [ ] Task 3.2: Add Database Health Check
- [ ] Task 4.1: Set Up Testing Framework
- [ ] Write tests for critical paths

### Week 3
- [ ] Integration testing
- [ ] Load testing setup
- [ ] Documentation updates
- [ ] Code review

---

## Notes

- **Test each fix independently** before moving to next
- **Commit after each task** with descriptive messages
- **Update documentation** as you go
- **Monitor production** after deploying fixes
- **Roll back** if issues detected

---

## Next Steps After Critical Fixes

1. Implement authentication system (separate large task)
2. Add game state persistence (Redis)
3. Set up CI/CD pipeline
4. Add monitoring/alerting (Sentry, DataDog, etc.)
5. Performance optimization
6. Security audit retest

---

**Last Updated:** 2024  
**Status:** Ready for Implementation


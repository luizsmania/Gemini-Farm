# Online Checkers Game - Implementation Summary

## Overview
A real-time multiplayer Checkers game built with WebSockets, PostgreSQL, and React. The server is authoritative and handles all game logic.

## Architecture

### Backend
- **WebSocket Server** (`server.js`): Handles real-time communication, lobby management, and game state
- **Checkers Engine** (`server/checkersEngine.ts`): Authoritative game logic (move validation, captures, king promotion, win detection)
- **Database** (`api/database.ts`): PostgreSQL schema and operations for players, matches, and moves

### Frontend
- **Hub** (`components/CheckersHub.tsx`): Nickname entry, lobby list, create/join lobbies
- **Game** (`components/CheckersGame.tsx`): Interactive checkers board with real-time updates
- **History** (`components/CheckersHistory.tsx`): Match history display
- **WebSocket Service** (`services/checkersWebSocketService.ts`): Client-side WebSocket communication

## Database Schema

### Players
- `id` (UUID, PRIMARY KEY)
- `nickname` (TEXT)
- `created_at` (TIMESTAMP)

### Matches
- `id` (UUID, PRIMARY KEY)
- `player_red` (UUID, REFERENCES players)
- `player_black` (UUID, REFERENCES players)
- `winner` (UUID, REFERENCES players)
- `finished_at` (TIMESTAMP)
- `created_at` (TIMESTAMP)

### Moves
- `id` (SERIAL, PRIMARY KEY)
- `match_id` (UUID, REFERENCES matches)
- `move_number` (INT)
- `from_pos` (INT)
- `to_pos` (INT)
- `created_at` (TIMESTAMP)

## WebSocket Message Protocol

### Client → Server
- `SET_NICKNAME` - Set player nickname
- `CREATE_LOBBY` - Create a new lobby
- `JOIN_LOBBY` - Join an existing lobby
- `MOVE` - Make a move (from, to positions)
- `REMATCH_ACCEPT` - Accept rematch request
- `LEAVE_MATCH` - Leave current match

### Server → Client
- `NICKNAME_SET` - Confirm nickname set (includes playerId)
- `LOBBY_LIST` - List of available lobbies
- `GAME_START` - Game started (includes matchId, yourColor, board)
- `MOVE_ACCEPTED` - Move validated and applied
- `MOVE_REJECTED` - Move invalid (includes reason)
- `GAME_OVER` - Game ended (includes winner)
- `PLAYER_DISCONNECTED` - Opponent disconnected
- `REMATCH_REQUEST` - Opponent wants rematch
- `MATCH_ENDED` - Match ended
- `ERROR` - Error message

## Game Rules (Server-Enforced)

1. **Turn Order**: Red moves first, then alternates
2. **Movement**: 
   - Regular pieces move diagonally forward only
   - Kings move diagonally in any direction
   - One square for regular moves, two squares for captures
3. **Captures**:
   - Mandatory if available
   - Must capture opponent pieces
   - Multi-jump enforcement (must continue if possible)
4. **King Promotion**: 
   - Red pieces promoted on row 0
   - Black pieces promoted on row 7
5. **Win Conditions**:
   - Opponent has no pieces
   - Opponent has no legal moves

## Features

✅ Real-time multiplayer via WebSockets  
✅ Authoritative server (all game logic server-side)  
✅ PostgreSQL persistence (matches and moves)  
✅ Lobby system (create/join, max 2 players)  
✅ Disconnect handling (30s forfeit timer)  
✅ Rematch system  
✅ Match history  
✅ Move validation (mandatory captures, multi-jumps)  
✅ King promotion  
✅ Win detection  

## Setup & Running

### Prerequisites
- Node.js 18+
- PostgreSQL database (Vercel Postgres or local)
- Environment variables:
  - `POSTGRES_URL` - PostgreSQL connection string
  - `CLIENT_URL` or `VITE_CLIENT_URL` - Frontend URL for CORS
  - `PORT` - WebSocket server port (default: 3001)

### Installation
```bash
npm install
```

### Development

1. **Start WebSocket server** (requires TypeScript execution):
   ```bash
   npm run server  # Uses tsx to run server.js
   # Or: npx tsx server.js
   ```

2. **Start frontend**:
   ```bash
   npm run dev
   ```

### Production Deployment

#### WebSocket Server
Deploy to Railway, Render, or Fly.io:
- Set `startCommand` to `npx tsx server.js` or compile TypeScript first
- Set environment variables
- Ensure port is configurable via `PORT` env var

#### Frontend
Deploy to Vercel:
- Standard Vite build
- Set `VITE_WS_URL` environment variable to WebSocket server URL

### Database Initialization
The database schema is automatically initialized when the server starts via `initDatabase()`.

## Notes

- The server file (`server.js`) uses TypeScript syntax but has a `.js` extension. It requires `tsx` or similar to run.
- Players are created in the database on nickname entry (no authentication required)
- Lobbies are stored in-memory on the server
- Active games are stored in-memory but moves are persisted to database
- Match history is stored in PostgreSQL

## Future Improvements

- Player authentication/accounts
- Elo rating system
- Spectator mode
- Replay system
- Chat functionality
- Move animations
- Sound effects


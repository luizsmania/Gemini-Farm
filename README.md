# 🎮 Online Checkers Game

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)

**🎮 A real-time multiplayer Checkers game with authoritative server-side game logic**

</div>

---

## 🎯 Overview

A production-ready online Checkers game built with **WebSockets**, **PostgreSQL**, and **React**. The server is authoritative, meaning all game logic runs server-side to prevent cheating and ensure fair play.

### ✨ Key Features

- 🎯 **Real-Time Multiplayer** - Play against opponents via WebSockets
- 🔒 **Authoritative Server** - All game logic validated server-side
- 💾 **Persistent Matches** - Game history stored in PostgreSQL
- 🎮 **Standard Checkers Rules** - Mandatory captures, multi-jumps, king promotion
- 📊 **Match History** - View your past games and results
- ⚡ **Lobby System** - Create or join lobbies (max 2 players)
- 🔄 **Auto-Start** - Games begin automatically when 2 players join
- ⏱️ **Disconnect Handling** - 30-second forfeit timer
- 🔁 **Rematch System** - Play again with the same opponent

---

## 🎮 Game Rules

The server enforces standard Checkers rules:

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

---

## 🛠️ Technology Stack

### Frontend
- **React 19.2.1** - Modern UI framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool
- **Socket.IO Client** - WebSocket communication

### Backend
- **Node.js** - WebSocket server
- **Socket.IO** - Real-time communication
- **PostgreSQL** (Vercel Postgres) - Match and player data storage
- **TypeScript** - Server-side type safety

### Deployment
- **Vercel** - Frontend and API hosting
- **Railway/Render/Fly.io** - WebSocket server hosting

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Vercel Postgres or local)
- Railway/Render/Fly.io account (for WebSocket server)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Gemini-Farm-3

# Install dependencies
npm install

# Set up environment variables (see below)
```

### Environment Variables

#### Frontend (Vercel)
```env
VITE_WS_URL=wss://your-websocket-server.railway.app
POSTGRES_URL=postgresql://... (auto-added by Vercel)
```

#### WebSocket Server (Railway/Render)
```env
CLIENT_URL=https://your-vercel-app.vercel.app
POSTGRES_URL=postgresql://... (from Vercel Postgres)
NODE_ENV=production
PORT=3000 (auto-set by Railway/Render)
```

**Important**: 
- `CLIENT_URL` must match your Vercel app URL exactly (including `https://`)
- This allows CORS to work properly so Vercel users can connect

### Development

1. **Start WebSocket server**:
   ```bash
   npm run server
   # Or: npx tsx server.js
   ```

2. **Start frontend**:
   ```bash
   npm run dev
   ```

### Production Deployment

See [CHECKERS_README.md](./CHECKERS_README.md) for detailed deployment instructions.

---

## 📁 Project Structure

```
├── api/
│   ├── database.ts          # Database schema and operations
│   └── match-history.ts     # Match history API endpoint
├── components/
│   ├── CheckersHub.tsx      # Lobby/hub screen
│   ├── CheckersGame.tsx     # Game board component
│   ├── CheckersHistory.tsx  # Match history component
│   └── Button.tsx           # Reusable button component
├── server/
│   └── checkersEngine.ts    # Authoritative game logic
├── services/
│   └── checkersWebSocketService.ts  # WebSocket client service
├── types/
│   └── checkers.ts          # TypeScript type definitions
├── server.js                # WebSocket server
└── App.tsx                  # Main app component
```

---

## 🎯 How It Works

1. **Player joins** with nickname only (no authentication required)
2. **Lobby system** - Players create or join lobbies (max 2 players)
3. **Game starts** automatically when 2 players join
4. **Moves validated** server-side - all game logic runs on server
5. **Real-time sync** - Both players see moves instantly via WebSockets
6. **Match persisted** - All moves saved to PostgreSQL
7. **Game ends** - Winner determined, match stored in history

---

## 📚 Documentation

- [CHECKERS_README.md](./CHECKERS_README.md) - Detailed implementation guide
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment instructions

---

## 🔧 Development Notes

- The server file (`server.js`) uses TypeScript syntax and requires `tsx` to run
- Database schema initializes automatically on server start
- All game logic is server-authoritative (client is presentation-only)
- Lobbies are stored in-memory, matches are persisted to database

---

## 📝 License

MIT

---

## 🙏 Acknowledgments

Built with modern web technologies for a production-ready multiplayer gaming experience.

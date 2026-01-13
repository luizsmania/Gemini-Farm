# 🎮 Online Checkers Game - Real-Time Multiplayer

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19.2.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io)
![Vercel](https://img.shields.io/badge/deployed%20on-Vercel-black?logo=vercel)
![Render](https://img.shields.io/badge/deployed%20on-Render-46E3B7?logo=render)

**A production-ready real-time multiplayer Checkers game with authoritative server-side game logic**

[Live Demo](#) • [Documentation](#features) • [Technologies](#-technologies-used)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technologies Used](#-technologies-used)
- [Architecture](#-architecture)
- [Key Highlights](#-key-highlights)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Future Enhancements](#-future-enhancements)

---

## 🎯 Overview

This is a full-stack real-time multiplayer Checkers game built from scratch. The project demonstrates expertise in **real-time web applications**, **WebSocket communication**, **authoritative game servers**, and **modern React development**. All game logic runs server-side to ensure fair play and prevent cheating.

### What Makes This Project Special

- ✅ **Authoritative Server Architecture** - All game logic validated server-side
- ✅ **Real-Time Communication** - WebSocket-based instant updates
- ✅ **Production-Ready** - Deployed with proper error handling, logging, and monitoring
- ✅ **Type-Safe** - Full TypeScript implementation across frontend and backend
- ✅ **Scalable Design** - Modular architecture with separation of concerns

---

## ✨ Features

### Core Gameplay
- 🎮 **Real-Time Multiplayer** - Play against opponents via WebSockets
- 🎯 **Standard Checkers Rules** - Mandatory captures, multi-jumps, king promotion
- ⚡ **Optimistic UI Updates** - Instant visual feedback for smooth gameplay
- 🎨 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🔊 **Audio Feedback** - Sound effects for moves, captures, and game events

### Game Management
- 🏠 **Lobby System** - Create or join game lobbies (2 players max)
- 🔄 **Auto-Start Games** - Games begin automatically when 2 players join
- 📊 **Match History** - View past games with move-by-move replay
- 🔁 **Rematch System** - Play again with the same opponent instantly
- ⏱️ **Move Timer** - 45-second per-move limit with countdown

### Technical Features
- 🔒 **Server-Side Validation** - All moves validated before execution
- 💾 **Persistent Storage** - Game history stored in PostgreSQL
- 🔌 **Disconnect Handling** - 30-second grace period for reconnection
- 🛡️ **Security** - Input sanitization, rate limiting, CORS protection
- 📝 **Comprehensive Logging** - Winston-based logging for debugging

---

## 🛠️ Technologies Used

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.1 | UI framework with hooks and modern patterns |
| **TypeScript** | 5.8 | Type-safe development |
| **Vite** | 6.2 | Fast build tool and dev server |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Socket.IO Client** | 4.7 | WebSocket communication |
| **Lucide React** | 0.556 | Icon library |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 22+ | Runtime environment |
| **TypeScript** | 5.8 | Server-side type safety |
| **Socket.IO** | 4.7 | WebSocket server |
| **PostgreSQL** | 15 | Relational database |
| **Winston** | 3.19 | Logging framework |
| **Rate Limiter Flexible** | 9.0 | API rate limiting |

### DevOps & Deployment
| Service | Purpose |
|---------|---------|
| **Vercel** | Frontend hosting and edge functions |
| **Render** | WebSocket server hosting |
| **Vercel Postgres** | Managed PostgreSQL database |
| **GitHub** | Version control and CI/CD |

---

## 🏗️ Architecture

### System Design

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   React Client  │◄───────►│  WebSocket       │◄───────►│  PostgreSQL  │
│   (Vercel)      │  WSS    │  Server (Render)  │  SQL    │  Database    │
└─────────────────┘         └──────────────────┘         └──────────────┘
       │                            │
       │                            │
       ▼                            ▼
┌──────────────┐            ┌──────────────┐
│  Static      │            │  Game Logic  │
│  Assets      │            │  Engine      │
└──────────────┘            └──────────────┘
```

### Key Architectural Decisions

1. **Authoritative Server Pattern**
   - All game logic runs server-side
   - Client only handles presentation and user input
   - Prevents cheating and ensures game integrity

2. **WebSocket Communication**
   - Real-time bidirectional communication
   - Low latency for instant move updates
   - Automatic reconnection handling

3. **Optimistic UI Updates**
   - Client updates UI immediately for user's moves
   - Server validates and confirms
   - Reverts on validation failure

4. **State Management**
   - React hooks for local state
   - Server as source of truth
   - Optimistic updates with rollback capability

---

## 🎯 Key Highlights

### Real-Time Communication
- Implemented WebSocket-based real-time game synchronization
- Handled connection drops, reconnections, and state recovery
- Optimized for low latency with efficient message protocols

### Game Logic Engine
- Built complete Checkers rules engine from scratch
- Handles mandatory captures, multi-jumps, king promotion
- Validates all moves server-side before execution

### Database Design
- Designed PostgreSQL schema for matches, players, and moves
- Implemented efficient queries for match history
- Optimized for read-heavy workloads

### Security & Performance
- Implemented rate limiting to prevent abuse
- Input sanitization and validation
- CORS protection and secure WebSocket connections
- Optimized React rendering with memoization

### User Experience
- Responsive design for all screen sizes
- Drag-and-drop piece movement
- Visual feedback for legal moves
- Audio cues for game events
- Match history with move replay

---

## 📁 Project Structure

```
├── api/
│   ├── database.ts              # Database schema and operations
│   └── match-history.ts         # Match history API endpoints
├── components/
│   ├── CheckersGame.tsx         # Main game board component
│   ├── CheckersHub.tsx          # Lobby/hub screen
│   ├── CheckersHistory.tsx     # Match history viewer
│   └── Button.tsx               # Reusable UI components
├── server/
│   └── checkersEngine.ts        # Authoritative game logic
├── services/
│   ├── checkersWebSocketService.ts  # WebSocket client service
│   └── offlineGameService.ts       # Offline/AI game service
├── types/
│   └── checkers.ts              # TypeScript type definitions
├── utils/
│   ├── logger.ts                # Logging utilities
│   └── validation.ts            # Input validation helpers
├── middleware/
│   └── rateLimiter.ts           # Rate limiting middleware
├── server.ts                    # WebSocket server entry point
└── App.tsx                      # Main React application
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Vercel Postgres)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gemini-farm-4.git
cd gemini-farm-4

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

**Frontend (.env)**
```env
VITE_WS_URL=wss://your-websocket-server.onrender.com
```

**Backend (.env)**
```env
POSTGRES_URL=postgresql://user:password@host:port/database
CLIENT_URL=https://your-frontend.vercel.app
ALLOWED_ORIGINS=https://your-frontend.vercel.app
NODE_ENV=production
PORT=3001
```

### Development

```bash
# Start WebSocket server
npm run server

# Start frontend dev server (in another terminal)
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## 🌐 Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Configure build settings (auto-detected for Vite)
3. Add environment variables
4. Deploy automatically on push

### Backend (Render)
1. Create new Web Service on Render
2. Connect GitHub repository
3. Set start command: `npx tsx server.ts`
4. Configure environment variables
5. Deploy

See [MIGRATE_TO_RENDER.md](./MIGRATE_TO_RENDER.md) for detailed deployment instructions.

---

## 🔮 Future Enhancements

- [ ] User authentication and profiles
- [ ] ELO rating system
- [ ] Tournament mode
- [ ] Spectator mode
- [ ] Mobile app (React Native)
- [ ] Advanced AI opponent
- [ ] Custom game rules
- [ ] Social features (friends, chat rooms)

---

## 📊 Project Stats

- **Lines of Code**: ~5,000+
- **Components**: 4 main React components
- **API Endpoints**: 2 REST endpoints
- **WebSocket Events**: 10+ event types
- **Database Tables**: 3 main tables
- **Test Coverage**: Manual testing (unit tests planned)

---

## 🎓 Learning Outcomes

This project demonstrates proficiency in:

- ✅ **Full-Stack Development** - End-to-end application development
- ✅ **Real-Time Systems** - WebSocket implementation and state synchronization
- ✅ **TypeScript** - Type-safe development across the stack
- ✅ **Database Design** - Schema design and query optimization
- ✅ **Security Best Practices** - Input validation, rate limiting, CORS
- ✅ **DevOps** - CI/CD, deployment, and monitoring
- ✅ **React Best Practices** - Hooks, memoization, performance optimization
- ✅ **System Architecture** - Scalable, maintainable code structure

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Myself

---

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by classic board games
- Thanks to the open-source community

---

<div align="center">

**⭐ If you found this project interesting, please consider giving it a star! ⭐**

Made with ❤️ using React, TypeScript, and WebSockets

</div>

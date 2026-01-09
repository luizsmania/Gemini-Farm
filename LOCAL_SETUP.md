# 🚀 Local Development Setup Guide

This guide will help you run the Online Checkers Game project locally on your machine.

## 📋 Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **PostgreSQL database** (optional for offline mode, required for multiplayer)

## 🔧 Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory (optional for local development):

```env
# Frontend - WebSocket Server URL (for local development)
VITE_WS_URL=ws://localhost:3001

# Backend - Server Configuration
PORT=3001
NODE_ENV=development

# Database (optional - only needed for multiplayer features)
# Get this from Vercel Postgres or use a local PostgreSQL instance
POSTGRES_URL=postgresql://user:password@localhost:5432/checkers_db

# CORS Configuration (optional - defaults to allow all in development)
CLIENT_URL=http://localhost:3000
```

**Note**: 
- For **offline mode** (playing against AI), you don't need a database or WebSocket server
- For **multiplayer mode**, you need both the WebSocket server and database

## 🎮 Running the Project

### Option 1: Offline Mode Only (No Server Required)

If you just want to test the game against AI:

```bash
# Start the frontend only
npm run dev
```

The app will run at `http://localhost:3000` and you can play offline games without any server setup.

### Option 2: Full Setup (Multiplayer)

You need **two terminal windows**:

#### Terminal 1: WebSocket Server

```bash
# Start the WebSocket server
npm run server
# Or: npx tsx server.ts
```

You should see:
```
✓ Checkers WebSocket server running on port 3001
✓ Database initialized
✓ Socket.IO server ready for connections
```

#### Terminal 2: Frontend

```bash
# Start the frontend development server
npm run dev
```

You should see:
```
VITE v6.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **WebSocket Server**: ws://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🗄️ Database Setup (Optional)

### Option A: Use Vercel Postgres (Easiest)

1. Create a Vercel account
2. Create a new project
3. Add a Postgres database in the Storage tab
4. Copy the `POSTGRES_URL` connection string
5. Add it to your `.env` file

### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database:
   ```sql
   CREATE DATABASE checkers_db;
   ```
3. Update `.env` with your local connection string:
   ```env
   POSTGRES_URL=postgresql://postgres:password@localhost:5432/checkers_db
   ```

The database schema will be created automatically when the server starts.

## 🧪 Testing

### Test Offline Mode

1. Start frontend: `npm run dev`
2. Open http://localhost:3000
3. Click "Start Offline Game"
4. Play against AI

### Test Multiplayer Mode

1. Start server: `npm run server` (Terminal 1)
2. Start frontend: `npm run dev` (Terminal 2)
3. Open http://localhost:3000 in **two different browser windows**
4. Set different nicknames in each window
5. One window: Click "Create Lobby"
6. Other window: Click "Join" on the lobby
7. Game should start automatically!

## 🐛 Troubleshooting

### Port Already in Use

If you see `Port 3001 is already in use`:

```bash
# Change the port in .env
PORT=3002

# Or kill the process using the port (Windows)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or (Mac/Linux)
lsof -ti:3001 | xargs kill
```

### WebSocket Connection Failed

1. **Check server is running**: Visit http://localhost:3001/health
2. **Check VITE_WS_URL**: Make sure `.env` has `VITE_WS_URL=ws://localhost:3001`
3. **Check browser console**: Look for connection errors
4. **Restart both servers**: Stop and restart both frontend and backend

### Database Connection Issues

1. **Check POSTGRES_URL**: Verify the connection string is correct
2. **Check database is running**: If using local PostgreSQL, ensure it's running
3. **Check permissions**: Ensure the database user has proper permissions
4. **Server will continue without DB**: The server will still run, but multiplayer features won't work

### "require is not defined" Error

This was fixed in the codebase. If you see this:
1. Make sure you're using the latest code
2. Clear browser cache
3. Restart the dev server

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start Vite dev server (frontend)
npm run server       # Start WebSocket server (backend)

# Build
npm run build        # Build for production
npm run preview      # Preview production build

# Alternative server commands
npx tsx server.ts    # Run server directly with tsx
```

## 🎯 Quick Start (Minimal Setup)

For the fastest setup to just play offline:

```bash
# 1. Install dependencies
npm install

# 2. Start frontend (no server needed for offline mode)
npm run dev

# 3. Open http://localhost:3000
# 4. Click "Start Offline Game"
```

That's it! You can play against AI without any additional setup.

## 📚 Additional Resources

- [README.md](./README.md) - Project overview
- [CHECKERS_README.md](./CHECKERS_README.md) - Detailed implementation guide
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Production deployment guide

## 💡 Tips

- **Hot Reload**: Both frontend and backend support hot reload during development
- **Console Logs**: Check browser console (F12) and server terminal for debugging
- **Network Tab**: Use browser DevTools Network tab to monitor WebSocket connections
- **Two Browsers**: For multiplayer testing, use two different browsers or incognito windows

---

Happy coding! 🎮



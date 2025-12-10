# WebSocket Setup Guide

This project now includes WebSocket support for real-time communication between the game client and server.

## Features

- ✅ Real-time game state synchronization
- ✅ Multi-device support (play on multiple devices simultaneously)
- ✅ Lower latency than HTTP polling
- ✅ Automatic reconnection
- ✅ Fallback to polling if WebSocket fails

## Architecture

Since **Vercel Serverless Functions don't support WebSocket connections**, you have two options:

### Option 1: Separate WebSocket Server (Recommended)

Deploy a separate Node.js server with Socket.IO that handles WebSocket connections.

#### Setup Steps:

1. **Create a separate WebSocket server** (see `websocket-server-example.js`)

2. **Deploy to a platform that supports WebSocket:**
   - [Railway](https://railway.app) (Recommended - easy setup)
   - [Render](https://render.com)
   - [Fly.io](https://fly.io)
   - [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
   - [Heroku](https://heroku.com)

3. **Set environment variable:**
   ```bash
   VITE_WS_URL=wss://your-websocket-server.com
   ```

4. **Example WebSocket Server** (`websocket-server-example.js`):
   ```javascript
   const { Server } = require('socket.io');
   const http = require('http');
   
   const httpServer = http.createServer();
   const io = new Server(httpServer, {
     cors: { origin: '*' }
   });
   
   io.on('connection', (socket) => {
     socket.on('authenticate', ({ username }) => {
       socket.data.username = username;
       socket.join(`user:${username}`);
       socket.emit('authenticated', { success: true });
     });
     
     socket.on('gameStateUpdate', async (data) => {
       // Save to database and broadcast to other devices
       socket.to(`user:${data.username}`).emit('gameStateUpdate', data);
     });
   });
   
   httpServer.listen(3001);
   ```

### Option 2: Use a WebSocket Service

Use a managed WebSocket service like:
- [Pusher](https://pusher.com) (Free tier available)
- [Ably](https://ably.com) (Free tier available)
- [Socket.io Cloud](https://www.socket.io/cloud)

#### Setup with Pusher:

1. **Install Pusher:**
   ```bash
   npm install pusher-js
   ```

2. **Update `services/websocketService.ts`** to use Pusher instead of Socket.IO

3. **Set environment variables:**
   ```bash
   VITE_PUSHER_KEY=your_pusher_key
   VITE_PUSHER_CLUSTER=your_cluster
   ```

## Configuration

### Environment Variables

Add to your `.env` file or Vercel environment variables:

```bash
# WebSocket server URL (for Option 1)
VITE_WS_URL=wss://your-websocket-server.com

# Or for development
VITE_WS_URL=ws://localhost:3001
```

### Client Configuration

The WebSocket service automatically:
- Connects when user logs in
- Reconnects on disconnect
- Falls back to HTTP polling if WebSocket fails
- Handles authentication automatically

## Usage in Code

```typescript
import { websocketService } from './services/websocketService';

// Connect when user logs in
await websocketService.connect(currentUser);

// Listen for game state updates
websocketService.on('gameStateUpdate', (update) => {
  // Update game state from server
  setGameState(update.gameState);
});

// Send game state update
websocketService.sendGameStateUpdate(gameState, version);

// Disconnect on logout
websocketService.disconnect();
```

## Benefits

1. **Real-time Updates**: Changes sync instantly across devices
2. **Lower Latency**: WebSocket is faster than HTTP polling
3. **Lower Server Costs**: Persistent connection uses less resources
4. **Better UX**: Instant feedback and synchronization
5. **Multi-device Support**: Play on phone and computer simultaneously

## Testing Locally

1. **Start WebSocket server:**
   ```bash
   node websocket-server-example.js
   ```

2. **Set environment variable:**
   ```bash
   VITE_WS_URL=ws://localhost:3001
   ```

3. **Start game:**
   ```bash
   npm run dev
   ```

## Production Deployment

1. Deploy WebSocket server to Railway/Render/etc.
2. Set `VITE_WS_URL` in Vercel environment variables
3. Update CORS settings on WebSocket server to allow your domain
4. Test connection in production

## Troubleshooting

**WebSocket not connecting:**
- Check `VITE_WS_URL` is set correctly
- Verify WebSocket server is running
- Check browser console for errors
- Ensure CORS is configured on WebSocket server

**Connection drops frequently:**
- Check network stability
- Increase reconnection attempts in `websocketService.ts`
- Verify WebSocket server is stable

**Game state not syncing:**
- Check WebSocket connection status
- Verify authentication is working
- Check server logs for errors


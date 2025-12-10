/**
 * WebSocket Server for Gemini Farm
 * 
 * This is a standalone WebSocket server that can be deployed separately.
 * 
 * Deployment Options:
 * - Railway: https://railway.app (Recommended - easy setup)
 * - Render: https://render.com
 * - Fly.io: https://fly.io
 * - DigitalOcean App Platform: https://www.digitalocean.com/products/app-platform
 * 
 * Setup:
 * 1. Install dependencies: npm install socket.io
 * 2. Set environment variables (see below)
 * 3. Deploy to one of the platforms above
 * 4. Set VITE_WS_URL in your Vercel project to point to this server
 */

import { Server } from 'socket.io';
import http from 'http';

// Create HTTP server
const httpServer = http.createServer();

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || process.env.VITE_CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Store active connections per user
const userRooms = new Map();

io.on('connection', async (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('authenticate', async ({ username }) => {
    try {
      // Verify user exists (you can add more validation here)
      if (!username) {
        socket.emit('authenticated', { success: false, message: 'Username required' });
        return;
      }

      // Store username in socket data
      socket.data.username = username;
      
      // Join user-specific room for multi-device sync
      const roomName = `user:${username}`;
      socket.join(roomName);
      
      // Track active connections
      if (!userRooms.has(username)) {
        userRooms.set(username, new Set());
      }
      userRooms.get(username).add(socket.id);

      console.log(`User ${username} authenticated, socket: ${socket.id}`);
      socket.emit('authenticated', { success: true, message: 'Authenticated successfully' });

      // Send current game state to newly connected device
      try {
        const apiUrl = process.env.API_URL || process.env.VERCEL_URL || 'https://your-app.vercel.app';
        const response = await fetch(`${apiUrl}/api/load?username=${encodeURIComponent(username)}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const { metadata, ...gameState } = result.data;
            socket.emit('gameStateUpdate', {
              username,
              gameState,
              version: metadata?.version || 0,
            });
          }
        }
      } catch (error) {
        console.error('Error loading game state for new connection:', error);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('authenticated', { success: false, message: 'Authentication failed' });
    }
  });

  socket.on('gameStateUpdate', async (data) => {
    try {
      const { username, gameState, version } = data;
      
      if (!username || !gameState) {
        console.error('Invalid game state update:', data);
        return;
      }

      // Verify socket is authenticated
      if (socket.data.username !== username) {
        console.error('Unauthorized game state update attempt');
        return;
      }

      console.log(`Received game state update from ${username}, version: ${version}`);

      // Save to database via API
      try {
        const apiUrl = process.env.API_URL || process.env.VERCEL_URL || 'https://gemini-farm-umber.vercel.app';
        console.log(`Saving game state for ${username} via API: ${apiUrl}/api/save`);
        
        const response = await fetch(`${apiUrl}/api/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, gameState }),
        });
        
        if (response.ok) {
          const saveResult = await response.json();
          console.log(`Save result for ${username}:`, saveResult);
          
          if (saveResult.success) {
            // Broadcast directly with the received gameState (don't wait for load)
            // This is faster and ensures we send the exact state that was saved
            const roomName = `user:${username}`;
            const clientsInRoom = io.sockets.adapter.rooms.get(roomName);
            const clientCount = clientsInRoom ? clientsInRoom.size : 0;
            
            console.log(`Broadcasting to room ${roomName}, ${clientCount} clients connected`);
            
            // Broadcast to other devices of the same user (but not the sender)
            socket.to(roomName).emit('gameStateUpdate', {
              username,
              gameState,
              version: version + 1,
            });

            console.log(`✅ Broadcasted game state update to other devices of ${username} (version ${version + 1})`);
            
            // Also try to get updated version for confirmation (optional)
            try {
              const loadResponse = await fetch(`${apiUrl}/api/load?username=${encodeURIComponent(username)}`, {
                headers: {
                  'Content-Type': 'application/json',
                },
              });
              if (loadResponse.ok) {
                const loadResult = await loadResponse.json();
                if (loadResult.success && loadResult.data) {
                  const { metadata } = loadResult.data;
                  const actualVersion = metadata?.version || version + 1;
                  console.log(`Confirmed version after save: ${actualVersion}`);
                }
              }
            } catch (loadError) {
              // Non-critical, just for logging
              console.warn('Could not confirm version after save:', loadError);
            }
          } else {
            console.error(`Save failed for ${username}:`, saveResult);
          }
        } else {
          console.error(`Save API returned error for ${username}:`, response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error saving game state:', error);
      }
    } catch (error) {
      console.error('Error handling game state update:', error);
      socket.emit('error', { message: 'Failed to save game state', code: 'SAVE_ERROR' });
    }
  });

  socket.on('requestGameState', async ({ username }) => {
    try {
      if (!username || socket.data.username !== username) {
        socket.emit('error', { message: 'Unauthorized', code: 'UNAUTHORIZED' });
        return;
      }

      // Load from database via API
      try {
        const apiUrl = process.env.API_URL || process.env.VERCEL_URL || 'https://your-app.vercel.app';
        const response = await fetch(`${apiUrl}/api/load?username=${encodeURIComponent(username)}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const { metadata, ...gameState } = result.data;
            socket.emit('gameStateUpdate', {
              username,
              gameState,
              version: metadata?.version || 0,
            });
          }
        }
      } catch (error) {
        console.error('Error loading game state:', error);
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      socket.emit('error', { message: 'Failed to load game state', code: 'LOAD_ERROR' });
    }
  });

  socket.on('disconnect', (reason) => {
    const username = socket.data.username;
    if (username) {
      const userSockets = userRooms.get(username);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userRooms.delete(username);
        }
      }
      console.log(`User ${username} disconnected: ${reason}`);
    } else {
      console.log(`Socket ${socket.id} disconnected: ${reason}`);
    }
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      connections: io.engine.clientsCount,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  // Default response
  res.writeHead(404);
  res.end('Not Found');
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`CORS enabled for: ${process.env.CLIENT_URL || process.env.VITE_CLIENT_URL || '*'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Server is ready and listening on 0.0.0.0:${PORT}`);
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


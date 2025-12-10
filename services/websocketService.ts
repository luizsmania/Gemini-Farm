import { io, Socket } from 'socket.io-client';
import { GameState, User } from '../types';

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
}

export interface GameStateUpdate {
  username: string;
  gameState: GameState;
  version: number;
}

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private currentUser: User | null = null;

  // Get WebSocket server URL from environment or use default
  private getServerUrl(): string {
    // For production, use environment variable or default to your WebSocket server
    // For development, you can use a local WebSocket server
    const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_WS_SERVER_URL;
    
    if (wsUrl) {
      return wsUrl;
    }

    // Default: try to connect to same origin with /socket.io path
    // This works if you have a WebSocket server running
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // For Vercel, you'd typically use an external WebSocket service
    // Or run a separate WebSocket server
    return `${protocol}//${host}`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for existing connection attempt
        const checkInterval = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkInterval);
            if (this.socket?.connected) {
              resolve();
            } else {
              reject(new Error('Connection failed'));
            }
          }
        }, 100);
        return;
      }

      this.isConnecting = true;
      this.currentUser = user;

      try {
        const serverUrl = this.getServerUrl();
        console.log('Connecting to WebSocket server:', serverUrl);

        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'], // Fallback to polling if WebSocket fails
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionAttempts: this.maxReconnectAttempts,
          timeout: 20000,
          auth: {
            username: user.username,
          },
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Authenticate with username
          if (this.socket && user.username) {
            this.socket.emit('authenticate', { username: user.username });
          }
          
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.isConnecting = false;
          
          if (reason === 'io server disconnect') {
            // Server disconnected, try to reconnect
            this.socket?.connect();
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnecting = false;
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn('Max reconnection attempts reached. WebSocket will not reconnect automatically.');
            reject(error);
          } else {
            // Will auto-reconnect
            resolve(); // Resolve anyway to not block the app
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('WebSocket reconnected after', attemptNumber, 'attempts');
          this.reconnectAttempts = 0;
          
          // Re-authenticate
          if (this.socket && user.username) {
            this.socket.emit('authenticate', { username: user.username });
          }
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log('WebSocket reconnection attempt', attemptNumber);
        });

        this.socket.on('reconnect_failed', () => {
          console.error('WebSocket reconnection failed');
        });

        // Set up message handlers
        this.setupMessageHandlers();

      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Set up message handlers for incoming WebSocket messages
   */
  private setupMessageHandlers(): void {
    if (!this.socket) return;

    // Handle game state updates from server
    this.socket.on('gameStateUpdate', (data: GameStateUpdate) => {
      console.log('Received game state update:', data);
      this.emit('gameStateUpdate', data);
    });

    // Handle notifications
    this.socket.on('notification', (data: { type: string; message: string; data?: any }) => {
      console.log('Received notification:', data);
      this.emit('notification', data);
    });

    // Handle server messages
    this.socket.on('message', (data: WebSocketMessage) => {
      console.log('Received message:', data);
      this.emit('message', data);
    });

    // Handle authentication response
    this.socket.on('authenticated', (data: { success: boolean; message?: string }) => {
      console.log('WebSocket authenticated:', data);
      this.emit('authenticated', data);
    });

    // Handle errors
    this.socket.on('error', (error: { message: string; code?: string }) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentUser = null;
    this.listeners.clear();
  }

  /**
   * Send game state update to server
   */
  sendGameStateUpdate(gameState: GameState, version: number): void {
    if (!this.socket?.connected || !this.currentUser) {
      console.warn('WebSocket not connected, cannot send game state update');
      return;
    }

    const update: GameStateUpdate = {
      username: this.currentUser.username,
      gameState,
      version,
    };

    this.socket.emit('gameStateUpdate', update);
  }

  /**
   * Request latest game state from server
   */
  requestGameState(): void {
    if (!this.socket?.connected || !this.currentUser) {
      console.warn('WebSocket not connected, cannot request game state');
      return;
    }

    this.socket.emit('requestGameState', { username: this.currentUser.username });
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get connection status
   */
  getStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();


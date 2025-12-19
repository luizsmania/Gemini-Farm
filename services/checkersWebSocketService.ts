import { io, Socket } from 'socket.io-client';
import { ClientMessage, ServerMessage, LobbyInfo, GameState, Color } from '../types/checkers';

class CheckersWebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((message: ServerMessage) => void)[]> = new Map();
  private wsUrl: string;

  constructor() {
    const envUrl = import.meta.env.VITE_WS_URL;
    
    if (!envUrl) {
      console.warn('VITE_WS_URL is not set. Using localhost for development.');
      this.wsUrl = 'http://localhost:3001';
    } else {
      // Socket.IO expects HTTP/HTTPS URL, not wss://
      // Convert wss:// to https:// and ws:// to http://
      this.wsUrl = envUrl
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://');
      
      console.log('Connecting to WebSocket server at:', this.wsUrl);
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      this.socket = io(this.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 5000,
      });

      let timeoutId: NodeJS.Timeout | null = null;
      
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        console.error('Attempted URL:', this.wsUrl);
        console.error('VITE_WS_URL from env:', import.meta.env.VITE_WS_URL);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
      });

      // Register all message types
      const messageTypes: Array<ServerMessage['type']> = [
        'NICKNAME_SET',
        'LOBBY_LIST',
        'GAME_START',
        'MOVE_ACCEPTED',
        'MOVE_REJECTED',
        'GAME_OVER',
        'ERROR',
        'PLAYER_DISCONNECTED',
        'REMATCH_REQUEST',
        'MATCH_ENDED',
        'CHAT_MESSAGE',
        'MATCH_LEAVING',
      ];

      messageTypes.forEach((type) => {
        this.socket?.on(type, (data: any) => {
          console.log('Received server message:', type, data);
          // Handle MOVE_ACCEPTED specially to ensure board is included
          if (type === 'MOVE_ACCEPTED') {
            console.log('MOVE_ACCEPTED received with board:', data.board ? `Board length: ${data.board.length}` : 'NO BOARD');
          }
          this.emit(type, { type, ...data } as ServerMessage);
        });
      });
      
      // Also listen for any errors
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Timeout if connection takes too long
      timeoutId = setTimeout(() => {
        if (!this.socket?.connected) {
          const error = new Error(`Connection timeout after 10s. Server URL: ${this.wsUrl}. Check that VITE_WS_URL is set correctly in Vercel.`);
          console.error(error.message);
          reject(error);
        }
      }, 10000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  on(messageType: string, callback: (message: ServerMessage) => void): void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, []);
    }
    this.listeners.get(messageType)!.push(callback);
  }

  off(messageType: string, callback: (message: ServerMessage) => void): void {
    const callbacks = this.listeners.get(messageType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private emit(messageType: string, message: ServerMessage): void {
    const callbacks = this.listeners.get(messageType) || [];
    callbacks.forEach((callback) => callback(message));
  }

  send(message: ClientMessage): void {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return;
    }

    console.log('Sending message:', message.type, message);
    this.socket.emit(message.type, message);
  }

  async setNickname(nickname: string, existingPlayerId?: string): Promise<void> {
    // Ensure we're connected before sending
    if (!this.socket?.connected) {
      try {
        await this.connect();
      } catch (error) {
        console.error('Failed to connect:', error);
        throw error;
      }
    }
    this.send({ type: 'SET_NICKNAME', nickname, playerId: existingPlayerId });
  }

  createLobby(): void {
    this.send({ type: 'CREATE_LOBBY' });
  }

  joinLobby(lobbyId: string): void {
    this.send({ type: 'JOIN_LOBBY', lobbyId });
  }

  makeMove(matchId: string, from: number, to: number): void {
    console.log('makeMove called:', { matchId, from, to, connected: this.socket?.connected });
    if (!this.socket?.connected) {
      console.error('Cannot make move - socket not connected');
      return;
    }
    this.send({ type: 'MOVE', matchId, from, to });
  }

  acceptRematch(matchId: string): void {
    this.send({ type: 'REMATCH_ACCEPT', matchId });
  }

  leaveMatch(matchId: string): void {
    this.send({ type: 'LEAVE_MATCH', matchId });
  }

  sendChatMessage(matchId: string, message: string): void {
    this.send({ type: 'CHAT_MESSAGE', matchId, message });
  }

  rejoinMatch(matchId: string): void {
    this.send({ type: 'REJOIN_MATCH', matchId });
  }

  forfeitMatch(matchId: string): void {
    this.send({ type: 'FORFEIT_MATCH', matchId });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const checkersWebSocketService = new CheckersWebSocketService();


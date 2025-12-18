import { io, Socket } from 'socket.io-client';
import { ClientMessage, ServerMessage, LobbyInfo, GameState, Color } from '../types/checkers';

class CheckersWebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((message: ServerMessage) => void)[]> = new Map();
  private wsUrl: string;

  constructor() {
    this.wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
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

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
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
      ];

      messageTypes.forEach((type) => {
        this.socket?.on(type, (data: any) => {
          this.emit(type, { type, ...data } as ServerMessage);
        });
      });

      // Timeout if connection takes too long
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
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

    this.socket.emit(message.type, message);
  }

  async setNickname(nickname: string): Promise<void> {
    // Ensure we're connected before sending
    if (!this.socket?.connected) {
      try {
        await this.connect();
      } catch (error) {
        console.error('Failed to connect:', error);
        throw error;
      }
    }
    this.send({ type: 'SET_NICKNAME', nickname });
  }

  createLobby(): void {
    this.send({ type: 'CREATE_LOBBY' });
  }

  joinLobby(lobbyId: string): void {
    this.send({ type: 'JOIN_LOBBY', lobbyId });
  }

  makeMove(matchId: string, from: number, to: number): void {
    this.send({ type: 'MOVE', matchId, from, to });
  }

  acceptRematch(matchId: string): void {
    this.send({ type: 'REMATCH_ACCEPT', matchId });
  }

  leaveMatch(matchId: string): void {
    this.send({ type: 'LEAVE_MATCH', matchId });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const checkersWebSocketService = new CheckersWebSocketService();


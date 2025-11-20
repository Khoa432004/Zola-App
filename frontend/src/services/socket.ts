'use client';

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  connect(token: string): Socket | null {
    if (this.socket?.connected) {
      console.log('✅ WebSocket already connected:', this.socket.id);
      return this.socket;
    }

    if (this.isConnecting) {
      console.log('⏳ WebSocket connection in progress...');
      return this.socket;
    }

    try {
      console.log('🔄 Connecting to WebSocket server:', SOCKET_URL);
      this.isConnecting = true;
      this.socket = io(SOCKET_URL, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected successfully! Socket ID:', this.socket?.id);
        this.isConnecting = false;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected. Reason:', reason);
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        this.isConnecting = false;
      });

      this.socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      return this.socket;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;
      return null;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  /**
   * Get socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Join a room
   */
  joinRoom(room: string, data?: any): void {
    if (!this.socket) {
      console.warn('⚠️ Cannot join room: socket not initialized');
      return;
    }

    if (!this.socket.connected) {
      console.warn('⚠️ Cannot join room: socket not connected. Waiting for connection...');
      // Wait for connection and then join
      this.socket.once('connect', () => {
        this.joinRoom(room, data);
      });
      return;
    }

    if (room.startsWith('conversation:')) {
      const conId = room.replace('conversation:', '');
      console.log(`🔵 Joining conversation room: ${conId}`);
      this.socket.emit('join_conversation', { conId }, (response: any) => {
        if (response?.error) {
          console.error('❌ Error joining conversation:', response.error);
        } else {
          console.log(`✅ Successfully joined conversation: ${conId}`);
        }
      });
    } else if (room.startsWith('post:')) {
      const postId = room.replace('post:', '');
      console.log(`🔵 Joining post room: ${postId}`);
      this.socket.emit('join_post', { postId });
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string, data?: any): void {
    if (this.socket?.connected) {
      if (room.startsWith('conversation:')) {
        this.socket.emit('leave_conversation', { conId: room.replace('conversation:', '') });
      } else if (room.startsWith('post:')) {
        this.socket.emit('leave_post', { postId: room.replace('post:', '') });
      }
    }
  }

  /**
   * Emit an event
   */
  emit(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Listen to an event
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      console.log(`👂 Setting up listener for event: ${event}`);
      this.socket.on(event, (...args) => {
        console.log(`📨 Received event: ${event}`, args);
        callback(...args);
      });
    } else {
      console.warn(`⚠️ Cannot listen to event ${event}: socket not initialized`);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();


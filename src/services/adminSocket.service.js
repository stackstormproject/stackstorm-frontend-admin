/**
 * Admin Live Customer Support WebSocket Connection Manager
 * StackStorm E-Commerce Platform — Dickwella Fashion Corner
 * Module Owner: S. Thanoogithan (FR-024 / SDS §12.2)
 */
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class AdminSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  /**
   * Initializes or reuses the Socket.IO connection for support agents/admins.
   */
  connect(token = null) {
    const authToken =
      token || localStorage.getItem('stackstorm_admin_token') || localStorage.getItem('token');

    if (this.socket) {
      if (this.socket.connected && this.currentAuthToken === authToken) {
        return this.socket;
      }
      this.disconnect();
    }

    this.currentAuthToken = authToken;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: authToken,
      },
      extraHeaders: authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {},
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this._emitLocal('connect', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this._emitLocal('disconnect', { reason });
    });

    this.socket.on('connect_error', (error) => {
      this._emitLocal('connect_error', error);
    });

    // Forwarded chat events
    const chatEvents = [
      'chat:joined',
      'chat:message',
      'chat:typing',
      'chat:user_joined',
      'chat:user_left',
      'chat:error',
      'support:new_session',
    ];

    chatEvents.forEach((eventName) => {
      this.socket.on(eventName, (data) => {
        this._emitLocal(eventName, data);
      });
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Agent joins an existing customer chat session to handle live support.
   */
  joinSession(sessionId, callback) {
    if (!this.socket) this.connect();
    this.socket.emit(
      'chat:join',
      {
        sessionId,
        isAgent: true,
        role: 'support_agent',
        senderRole: 'support_agent',
      },
      (response) => {
        if (typeof callback === 'function') callback(response);
      }
    );
  }

  /**
   * Sends an agent reply message to the session room.
   */
  sendMessage(sessionId, message, callback) {
    if (!this.socket) this.connect();
    this.socket.emit(
      'chat:message',
      {
        sessionId,
        message,
        isAgent: true,
        senderRole: 'support_agent',
        senderType: 'agent',
        sender: 'agent',
        role: 'support_agent',
        senderName: 'Alex (Support Agent)',
      },
      (response) => {
        if (typeof callback === 'function') callback(response);
      }
    );
  }

  /**
   * Emits agent typing status to the customer counterpart.
   */
  sendTyping(sessionId, isTyping) {
    if (!this.socket) return;
    this.socket.emit('chat:typing', { sessionId, isTyping });
  }

  /**
   * Leaves the session room.
   */
  leaveSession(sessionId, callback) {
    if (!this.socket) return;
    this.socket.emit('chat:leave', { sessionId }, (response) => {
      if (typeof callback === 'function') callback(response);
    });
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);

    const isForwarded = [
      'connect',
      'disconnect',
      'connect_error',
      'chat:joined',
      'chat:message',
      'chat:typing',
      'chat:user_joined',
      'chat:user_left',
      'chat:error',
      'support:new_session',
    ].includes(event);

    if (!isForwarded && this.socket) {
      this.socket.on(event, handler);
    }

    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  _emitLocal(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((handler) => {
        try {
          handler(data);
        } catch (e) {
          console.error(`[AdminSocketService] Error in listener for ${event}:`, e);
        }
      });
    }
  }
}

export const adminSocketService = new AdminSocketService();
export default adminSocketService;

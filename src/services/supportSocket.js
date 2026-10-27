import { io } from 'socket.io-client';
import { getAccessToken } from '../lib/session';

// Same origin by default: nginx and the Vite dev proxy forward /socket.io to the API.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
const ACK_TIMEOUT_MS = 8000;

export const SUPPORT_EVENTS = [
  'chat:message',
  'chat:typing',
  'support:new_session',
  'chat:session_resolved',
  'chat:error',
];

/**
 * Socket.IO connection for the support console.
 *
 * The server decides who is an agent from the JWT role alone (#139), so no role flags are
 * sent. `auth` is a function, so every reconnect presents the current (possibly refreshed)
 * in-memory access token instead of the one the page started with.
 *
 * @param {object} options
 * @param {(event: string, data: any) => void} options.onEvent - server events in SUPPORT_EVENTS
 * @param {(status: 'connecting'|'online'|'offline') => void} [options.onStatus]
 * @param {typeof io} [options.connect] - injectable for tests
 */
export function createSupportSocket({ onEvent, onStatus = () => {}, connect = io }) {
  const socket = connect(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    auth: (cb) => cb({ token: getAccessToken() }),
  });

  onStatus('connecting');
  socket.on('connect', () => onStatus('online'));
  socket.on('disconnect', () => onStatus('offline'));
  socket.on('connect_error', () => onStatus('offline'));
  SUPPORT_EVENTS.forEach((event) => socket.on(event, (data) => onEvent(event, data)));

  /** Emits with an acknowledgement and rejects with the server's message on failure. */
  const request = (event, payload) =>
    new Promise((resolve, reject) => {
      socket.timeout(ACK_TIMEOUT_MS).emit(event, payload, (timeoutError, response) => {
        if (timeoutError) {
          reject(new Error('The chat server did not answer. Check the connection.'));
        } else if (response && response.success === false) {
          reject(new Error(response.error?.message || response.error || 'Request refused'));
        } else {
          resolve(response);
        }
      });
    });

  return {
    /** Joins the session room; an unclaimed session is claimed by this agent. */
    joinSession: (sessionId) => request('chat:join', { sessionId: Number(sessionId) }),
    sendMessage: (sessionId, message) =>
      request('chat:message', { sessionId: Number(sessionId), message }),
    sendTyping: (sessionId, isTyping) =>
      socket.emit('chat:typing', { sessionId: Number(sessionId), isTyping }),
    disconnect: () => socket.disconnect(),
  };
}

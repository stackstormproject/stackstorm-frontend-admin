import { createSupportSocket, SUPPORT_EVENTS } from '../../services/supportSocket';
import { setAccessToken, clearAccessToken } from '../../lib/session';

/** A stand-in for a socket.io client: records handlers and emits, lets tests reply. */
const fakeSocket = () => {
  const handlers = {};
  const sent = [];
  let ackError = null;
  let ackResponse = { success: true };
  const socket = {
    handlers,
    sent,
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
    }),
    emit: vi.fn((event, payload) => sent.push({ event, payload })),
    timeout: vi.fn(() => ({
      emit: (event, payload, ack) => {
        sent.push({ event, payload });
        ack(ackError, ackResponse);
      },
    })),
    disconnect: vi.fn(),
    replyWith: (error, response) => {
      ackError = error;
      ackResponse = response;
    },
  };
  return socket;
};

describe('support socket', () => {
  let socket;
  let connect;
  let onEvent;
  let onStatus;

  beforeEach(() => {
    socket = fakeSocket();
    connect = vi.fn(() => socket);
    onEvent = vi.fn();
    onStatus = vi.fn();
  });

  afterEach(() => clearAccessToken());

  it('should present the current in-memory token on every (re)connect', () => {
    createSupportSocket({ onEvent, onStatus, connect });
    const { auth } = connect.mock.calls[0][1];
    const cb = vi.fn();

    setAccessToken('first');
    auth(cb);
    setAccessToken('refreshed');
    auth(cb);

    expect(cb.mock.calls).toEqual([[{ token: 'first' }], [{ token: 'refreshed' }]]);
  });

  it('should report connection status and forward server events', () => {
    createSupportSocket({ onEvent, onStatus, connect });

    socket.handlers.connect();
    socket.handlers['chat:message']({ id: 'msg-1' });
    socket.handlers.disconnect();
    socket.handlers.connect_error(new Error('x'));

    expect(onStatus.mock.calls.map(([s]) => s)).toEqual([
      'connecting',
      'online',
      'offline',
      'offline',
    ]);
    expect(onEvent).toHaveBeenCalledWith('chat:message', { id: 'msg-1' });
    expect(Object.keys(socket.handlers)).toEqual(expect.arrayContaining(SUPPORT_EVENTS));
  });

  it('should send no role flags when joining or replying', async () => {
    const client = createSupportSocket({ onEvent, connect });

    await client.joinSession('12');
    await client.sendMessage('12', 'Hello');
    client.sendTyping('12', true);

    expect(socket.sent).toEqual([
      { event: 'chat:join', payload: { sessionId: 12 } },
      { event: 'chat:message', payload: { sessionId: 12, message: 'Hello' } },
      { event: 'chat:typing', payload: { sessionId: 12, isTyping: true } },
    ]);
  });

  it('should reject with the server message when a request is refused', async () => {
    const client = createSupportSocket({ onEvent, connect });
    socket.replyWith(null, {
      success: false,
      error: { message: 'You cannot join this chat session' },
    });

    await expect(client.joinSession(3)).rejects.toThrow('You cannot join this chat session');
  });

  it('should reject when the server does not acknowledge in time', async () => {
    const client = createSupportSocket({ onEvent, connect });
    socket.replyWith(new Error('timeout'));

    await expect(client.sendMessage(3, 'hi')).rejects.toThrow(/did not answer/);
  });

  it('should disconnect on request', () => {
    createSupportSocket({ onEvent, connect }).disconnect();

    expect(socket.disconnect).toHaveBeenCalled();
  });
});

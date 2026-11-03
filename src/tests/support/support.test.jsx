import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, ADMINS, apiError } from '../renderApp';
import * as supportApi from '../../api/support';
import { createSupportSocket } from '../../services/supportSocket';
import { fromSocketMessage, appendMessage } from '../../lib/support';

vi.mock('../../api/support');
vi.mock('../../services/supportSocket');

const apiSession = (overrides = {}) => ({
  id: '7',
  customer_id: '4',
  customer_name: 'Alice Silva',
  customer_email: 'alice@example.com',
  tier: 'Gold',
  status: 'pending',
  inquiry_topic: 'Speak to an Agent',
  created_at: '2026-10-27T10:00:00Z',
  messages: [
    {
      id: 'msg-1',
      sender: 'customer',
      sender_name: 'Alice Silva',
      text: 'Where is my sarong?',
      timestamp: '2026-10-27T10:00:00Z',
    },
    {
      id: 'msg-2',
      sender: 'bot',
      sender_name: 'Virtual assistant',
      text: 'Connecting you',
      timestamp: '2026-10-27T10:00:01Z',
    },
  ],
  ...overrides,
});

let socket;
let emitServer;
let setStatus;

beforeEach(() => {
  socket = {
    joinSession: vi.fn().mockResolvedValue({ success: true }),
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    sendTyping: vi.fn(),
    disconnect: vi.fn(),
  };
  createSupportSocket.mockImplementation(({ onEvent, onStatus }) => {
    emitServer = (event, data) => act(() => onEvent(event, data));
    setStatus = (status) => act(() => onStatus(status));
    return socket;
  });
});

describe('support console', () => {
  it('should be open to support agents and list waiting chats', async () => {
    supportApi.listSupportSessions.mockResolvedValue([apiSession()]);
    renderApp('/support', { admin: ADMINS.agent });

    expect(await screen.findByRole('heading', { name: 'Live support' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Waiting (1)' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Connecting you')).toBeInTheDocument();
    expect(screen.getByText('1 shopper is waiting.')).toBeInTheDocument();
    setStatus('online');
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Live');
  });

  it('should take a waiting chat, reply and see the reply once', async () => {
    const user = userEvent.setup();
    supportApi.listSupportSessions
      .mockResolvedValueOnce([apiSession()])
      .mockResolvedValue([apiSession({ status: 'agent_active' })]);
    const { router } = renderApp('/support', { admin: ADMINS.agent });

    await user.click(await screen.findByRole('button', { name: /Alice Silva/ }));
    expect(router.state.location.search).toBe('?session=7');
    const conversation = screen.getByRole('region', { name: 'Alice Silva' });
    expect(within(conversation).getByLabelText('Reply to Alice Silva')).toBeDisabled();
    expect(within(conversation).getByText(/^Virtual assistant ·/)).toBeInTheDocument();

    await user.click(within(conversation).getByRole('button', { name: 'Take this chat' }));
    await waitFor(() => expect(socket.joinSession).toHaveBeenCalledWith('7'));
    const reply = await within(conversation).findByLabelText('Reply to Alice Silva');
    await waitFor(() => expect(reply).toBeEnabled());

    await user.type(reply, 'Hello Alice{Enter}');
    expect(socket.sendMessage).toHaveBeenCalledWith('7', 'Hello Alice');
    expect(reply).toHaveValue('');
    expect(socket.sendTyping).toHaveBeenCalledWith('7', true);
    expect(socket.sendTyping).toHaveBeenLastCalledWith('7', false);

    const echo = {
      id: 'msg-9',
      sessionId: 7,
      senderRole: 'support_agent',
      senderName: 'Nimali Perera',
      message: 'Hello Alice',
      createdAt: '2026-10-27T10:05:00Z',
    };
    emitServer('chat:message', echo);
    emitServer('chat:message', echo);
    expect(within(conversation).getAllByText('Hello Alice')).toHaveLength(1);
  });

  it('should show a new customer message and their typing', async () => {
    const user = userEvent.setup();
    supportApi.listSupportSessions.mockResolvedValue([apiSession({ status: 'agent_active' })]);
    renderApp('/support?session=7', { admin: ADMINS.agent });

    await screen.findByRole('region', { name: 'Alice Silva' });
    emitServer('chat:typing', { sessionId: 7, isTyping: true, role: 'customer' });
    expect(screen.getByText('Alice Silva is typing…')).toBeInTheDocument();

    emitServer('chat:message', {
      id: 'msg-10',
      sessionId: 7,
      senderRole: 'customer',
      message: 'It was order DFC-2026-0011',
      createdAt: '2026-10-27T10:06:00Z',
    });
    expect(screen.getAllByText('It was order DFC-2026-0011').length).toBeGreaterThan(0);
    expect(screen.queryByText('Alice Silva is typing…')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Active (1)' }));
    expect(screen.getByRole('button', { name: /Alice Silva/ })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('should reload the queue when a new chat arrives or a message is for an unknown chat', async () => {
    supportApi.listSupportSessions
      .mockResolvedValueOnce([])
      .mockResolvedValue([apiSession({ id: '8', customer_name: 'Bob Perera' })]);
    renderApp('/support', { admin: ADMINS.agent });

    expect(await screen.findByText('Nobody is waiting.')).toBeInTheDocument();
    emitServer('support:new_session', { sessionId: 8 });

    expect(await screen.findByRole('button', { name: /Bob Perera/ })).toBeInTheDocument();
    emitServer('chat:message', { id: 'x', sessionId: 99, senderRole: 'customer', message: 'hi' });
    await waitFor(() => expect(supportApi.listSupportSessions).toHaveBeenCalledTimes(3));
  });

  it('should resolve a chat and close the composer', async () => {
    const user = userEvent.setup();
    supportApi.listSupportSessions.mockResolvedValue([apiSession({ status: 'agent_active' })]);
    supportApi.updateSupportSessionStatus.mockResolvedValue({});
    renderApp('/support?session=7', { admin: ADMINS.agent });

    await user.click(await screen.findByRole('button', { name: 'Mark resolved' }));

    expect(supportApi.updateSupportSessionStatus).toHaveBeenCalledWith('7', 'resolved');
    expect(await screen.findByText('This conversation is resolved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved (1)' })).toBeInTheDocument();
  });

  it('should mark a chat resolved when another agent closes it', async () => {
    supportApi.listSupportSessions.mockResolvedValue([apiSession({ status: 'agent_active' })]);
    renderApp('/support?session=7', { admin: ADMINS.agent });

    await screen.findByRole('region', { name: 'Alice Silva' });
    emitServer('chat:session_resolved', { sessionId: '7' });

    expect(screen.getByText('This conversation is resolved.')).toBeInTheDocument();
  });

  it('should show a refused join and a failed send', async () => {
    const user = userEvent.setup();
    socket.joinSession.mockRejectedValue(new Error('Chat session not found'));
    socket.sendMessage.mockRejectedValue(new Error('The chat server did not answer.'));
    supportApi.listSupportSessions.mockResolvedValue([
      apiSession(),
      apiSession({
        id: '9',
        status: 'agent_active',
        customer_name: 'Carol',
        customer_id: 'guest',
        messages: [],
      }),
    ]);
    const { router } = renderApp('/support?session=7', { admin: ADMINS.agent });

    await user.click(await screen.findByRole('button', { name: 'Take this chat' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chat session not found');

    await act(() => router.navigate('/support?session=9'));
    const conversation = await screen.findByRole('region', { name: 'Carol' });
    expect(within(conversation).getByText(/Guest shopper/)).toBeInTheDocument();
    expect(within(conversation).getByText('No messages yet.')).toBeInTheDocument();
    await user.type(within(conversation).getByLabelText('Reply to Carol'), 'Hi');
    await user.click(within(conversation).getByRole('button', { name: 'Send' }));
    expect(await within(conversation).findByRole('alert')).toHaveTextContent('did not answer');
    expect(within(conversation).getByLabelText('Reply to Carol')).toHaveValue('Hi');
  });

  it('should offer a retry when the queue cannot load', async () => {
    supportApi.listSupportSessions.mockRejectedValue(apiError(500, 'INTERNAL', 'Queue down'));
    renderApp('/support', { admin: ADMINS.agent });

    expect(await screen.findByText('Queue down')).toBeInTheDocument();
  });

  it('should disconnect the socket when leaving the page', async () => {
    supportApi.listSupportSessions.mockResolvedValue([]);
    const { unmount } = renderApp('/support', { admin: ADMINS.agent });
    await screen.findByText('Nobody is waiting.');

    unmount();

    expect(socket.disconnect).toHaveBeenCalled();
  });

  it('should not crash the page if the chat library throws while disconnecting (#15)', async () => {
    // Reported crash: "Unexpected Application Error! destroy is not a function" when leaving
    // /support - thrown from inside socket.disconnect()'s own cleanup internals, during the
    // page's unmount effect. The library's failure must not become a page-level error screen.
    socket.disconnect.mockImplementation(() => {
      throw new TypeError('destroy is not a function');
    });
    supportApi.listSupportSessions.mockResolvedValue([]);
    const { unmount } = renderApp('/support', { admin: ADMINS.agent });
    await screen.findByText('Nobody is waiting.');

    expect(() => unmount()).not.toThrow();
    expect(socket.disconnect).toHaveBeenCalled();
  });
});

describe('support message helpers', () => {
  it('should map socket roles and ignore duplicate ids', () => {
    expect(fromSocketMessage({ id: 1, senderRole: 'bot', message: 'x' })).toMatchObject({
      from: 'bot',
      name: 'Virtual assistant',
    });
    expect(fromSocketMessage({ id: 2, sender: 'agent', text: 'y' })).toMatchObject({
      from: 'agent',
      name: 'Support',
      text: 'y',
    });
    expect(fromSocketMessage({ id: 3 }).from).toBe('customer');
    const sessions = [{ id: '1', messages: [{ id: 'a' }] }];
    expect(appendMessage(sessions, 1, { id: 'a' })).toEqual(sessions);
  });
});

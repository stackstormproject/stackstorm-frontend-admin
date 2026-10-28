/**
 * The support API and the socket describe messages differently:
 *   API:    { id, sender: 'customer'|'agent'|'bot', sender_name, text, timestamp } (#156)
 *   socket: { id, sessionId, senderRole: 'customer'|'support_agent'|'bot', senderName, message, createdAt }
 * Both become { id, from: 'customer'|'agent'|'bot', name, text, at }.
 */
const API_SENDERS = ['customer', 'agent', 'bot'];

export const fromApiMessage = (message) => ({
  id: String(message.id),
  from: API_SENDERS.includes(message.sender) ? message.sender : 'agent',
  name: message.sender_name,
  text: message.text,
  at: message.timestamp,
});

export const fromSocketMessage = (payload) => {
  const role = payload.senderRole || payload.sender || 'customer';
  let from = 'agent';
  if (role === 'customer') from = 'customer';
  else if (role === 'bot') from = 'bot';
  return {
    id: String(payload.id),
    from,
    name: payload.senderName || (from === 'bot' ? 'Virtual assistant' : 'Support'),
    text: payload.message ?? payload.text ?? '',
    at: payload.createdAt || new Date().toISOString(),
  };
};

export const fromApiSession = (session) => ({
  id: String(session.id),
  status: session.status, // pending | agent_active | resolved
  customerName: session.customer_name,
  customerEmail: session.customer_email,
  customerId: session.customer_id === 'guest' ? null : session.customer_id,
  tier: session.tier,
  topic: session.inquiry_topic,
  createdAt: session.created_at,
  messages: (session.messages || []).map(fromApiMessage),
});

/** Appends a message once: the server echoes every message to the agent channel. */
export const appendMessage = (sessions, sessionId, message) =>
  sessions.map((session) =>
    session.id === String(sessionId) && !session.messages.some((m) => m.id === message.id)
      ? { ...session, messages: [...session.messages, message] }
      : session
  );

export const QUEUES = [
  { status: 'pending', label: 'Waiting' },
  { status: 'agent_active', label: 'Active' },
  { status: 'resolved', label: 'Resolved' },
];

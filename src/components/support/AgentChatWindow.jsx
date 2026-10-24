import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle, MessageSquare, Sparkles, Zap } from 'lucide-react';
import './AgentChatWindow.css';

export const CANNED_RESPONSES = [
  {
    id: 'greeting',
    label: 'Standard Greeting',
    text: 'Hello! Thank you for reaching out to Dickwella Fashion Corner. My name is Alex. How may I assist you today?',
  },
  {
    id: 'order_lookup',
    label: 'Order Lookup',
    text: 'I would be happy to check that order for you. Could you please confirm your Order Reference (e.g., DFC-20261005-XXXX)?',
  },
  {
    id: 'return_courtesy',
    label: '30-Day Return Courtesy',
    text: 'Our 30-day return & exchange policy allows exchanges for wrong sizes or store credit refunds, provided tags are intact.',
  },
  {
    id: 'courier_delay',
    label: 'Courier Delay Apology',
    text: 'We apologize for the delivery delay. I have notified our dispatch logistics team to prioritize your parcel with highest priority.',
  },
  {
    id: 'closing',
    label: 'Closing / Resolution',
    text: 'Is there anything else I can assist you with today? Thank you for choosing Dickwella Fashion Corner!',
  },
];

export default function AgentChatWindow({
  session = null,
  onSendMessage,
  isCustomerTyping = false,
  onResolveSession,
  onTyping,
}) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages, isCustomerTyping]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 1500);
    }
  };

  const handleCannedSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    const canned = CANNED_RESPONSES.find((c) => c.id === selectedId);
    if (canned) {
      setInputText(canned.text);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !session) return;

    if (onTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      onTyping(false);
    }

    onSendMessage && onSendMessage(trimmed);
    setInputText('');
  };

  if (!session) {
    return (
      <div className="chat-window-panel" data-testid="agent-chat-window">
        <div className="chat-empty-state">
          <div className="chat-empty-icon">
            <MessageSquare size={24} />
          </div>
          <h3>Select a customer inquiry</h3>
          <p>Choose an ongoing session from the left queue to view messages or join live chat.</p>
        </div>
      </div>
    );
  }

  const isResolved = session.status === 'resolved';

  return (
    <section
      className="chat-window-panel"
      data-testid="agent-chat-window"
      aria-label="Active Conversation Window"
    >
      {/* Header Bar */}
      <div className="chat-window-header">
        <div className="header-customer-info">
          <div className="header-avatar">
            {session.customer_name ? session.customer_name.charAt(0) : 'C'}
          </div>
          <div className="header-meta">
            <div className="header-cust-name" data-testid="chat-header-customer">
              <span>{session.customer_name}</span>
              <span style={{ marginLeft: 6, color: 'var(--admin-accent)', fontSize: '0.75rem' }}>
                ({session.tier || 'Silver'} VIP)
              </span>
            </div>
            <span className="header-cust-sub">
              {session.customer_email} • {session.inquiry_topic}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <div data-testid="chat-session-status">
            {session.status === 'pending' && (
              <span className="session-status-badge status-waiting">Queue Standby</span>
            )}
            {(session.status === 'agent_active' || session.status === 'active') && (
              <span className="session-status-badge status-live">Live Active</span>
            )}
            {session.status === 'resolved' && (
              <span className="session-status-badge status-closed">Resolved</span>
            )}
          </div>

          {!isResolved && (
            <button
              type="button"
              className="btn-resolve-chat"
              onClick={() => onResolveSession && onResolveSession(session.id)}
              title="Mark support inquiry as resolved"
              data-testid="resolve-chat-btn"
            >
              <CheckCircle size={14} />
              <span>Resolve Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div
        className="messages-stream"
        data-testid="agent-chat-stream"
        role="log"
        aria-live="polite"
      >
        {session.messages?.map((msg, idx) => {
          const isAgent = msg.sender === 'agent';
          return (
            <div
              key={msg.id || idx}
              className={`chat-bubble-row ${isAgent ? 'bubble-row-agent bubble-agent' : 'bubble-row-customer bubble-customer'}`}
            >
              <span className="bubble-sender-name">
                {isAgent ? 'Alex (Staff)' : session.customer_name}
              </span>
              <div className="bubble-content">{msg.text}</div>
              <span className="bubble-timestamp">
                {msg.timestamp
                  ? new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Now'}
              </span>
            </div>
          );
        })}

        {/* Customer Typing Indicator */}
        {isCustomerTyping && (
          <div
            className="typing-indicator"
            role="status"
            aria-live="assertive"
            data-testid="typing-indicator"
          >
            <span>Customer is typing</span>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Controls Bar: Canned responses + Composer */}
      <div className="chat-controls-bar">
        {!isResolved && (
          <div className="canned-response-row">
            <Zap size={14} color="var(--admin-primary)" />
            <select
              className="canned-select"
              defaultValue=""
              onChange={handleCannedSelect}
              aria-label="Insert quick canned response"
              data-testid="canned-response-select"
            >
              <option value="" disabled>
                ⚡ Insert quick canned response...
              </option>
              {CANNED_RESPONSES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <form onSubmit={handleSubmit} className="composer-form">
          <input
            type="text"
            className="composer-input"
            placeholder={
              isResolved
                ? 'This session is marked as resolved.'
                : 'Type customer response or select canned reply...'
            }
            value={inputText}
            onChange={handleInputChange}
            disabled={isResolved}
            aria-label="Agent chat reply"
            data-testid="chat-message-input"
          />
          <button
            type="submit"
            className="btn-send-message"
            disabled={isResolved || !inputText.trim()}
            aria-label="Send message to customer"
            title="Send Message"
            data-testid="send-message-btn"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </section>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { formatDateTime } from '../../lib/format';

const MAX_MESSAGE = 1000;

function MessageList({ messages }) {
  const endRef = useRef(null);
  useEffect(() => {
 fix/1-brand-logo
    // #15: never let the browser's return value from scrollIntoView() become the effect's
    // cleanup function - if it's ever non-undefined, React throws "destroy is not a function"
    // when this component unmounts.

 develop
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);
  return (
    <ol className="messages" aria-label="Messages">
      {messages.map((message) => (
        <li key={message.id} className={`message message--${message.from}`}>
          <span className="message__meta">
            {message.name} · {formatDateTime(message.at)}
          </span>
          <p className="message__text">{message.text}</p>
        </li>
      ))}
      <li ref={endRef} aria-hidden="true" className="messages__end" />
    </ol>
  );
}

export function Conversation({ session, customerTyping, onTake, onResolve, onSend, onTyping }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const inputId = useId();
  const canReply = session.status === 'agent_active';

  useEffect(() => {
    setDraft('');
    setError(null);
  }, [session.id]);

  const run = async (name, action) => {
    setBusy(name);
    setError(null);
    try {
      await action();
      return true;
    } catch (actionError) {
      setError(actionError.message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const sent = await run('send', () => onSend(text));
    if (sent) {
      setDraft('');
      onTyping(false);
    }
  };

  return (
    <section className="conversation" aria-labelledby="conversation-title">
      <header className="conversation__header">
        <div>
          <h2 id="conversation-title">{session.customerName}</h2>
          <p className="muted">
            {session.customerId ? (
              <Link to={`/customers/${session.customerId}`}>{session.customerEmail}</Link>
            ) : (
              'Guest shopper'
            )}
            {' · '}
            {session.tier} tier · started {formatDateTime(session.createdAt)}
          </p>
        </div>
        <div className="btn-row">
          <StatusBadge status={session.status} />
          {session.status === 'pending' && (
            <button
              type="button"
              className="btn btn--primary btn--small"
              disabled={busy !== null}
              onClick={() => run('take', onTake)}
            >
              {busy === 'take' ? 'Joining…' : 'Take this chat'}
            </button>
          )}
          {session.status !== 'resolved' && (
            <button
              type="button"
              className="btn btn--secondary btn--small"
              disabled={busy !== null}
              onClick={() => run('resolve', onResolve)}
            >
              {busy === 'resolve' ? 'Closing…' : 'Mark resolved'}
            </button>
          )}
        </div>
      </header>

      {session.messages.length === 0 ? (
        <p className="conversation__empty muted">No messages yet.</p>
      ) : (
        <MessageList messages={session.messages} />
      )}

      <p className="typing" aria-live="polite">
        {customerTyping ? `${session.customerName} is typing…` : ''}
      </p>

      {error && (
        <p className="form-error conversation__error" role="alert">
          {error}
        </p>
      )}

      {session.status === 'resolved' ? (
        <p className="conversation__closed muted">This conversation is resolved.</p>
      ) : (
        <form className="composer" onSubmit={send}>
          <label htmlFor={inputId} className="visually-hidden">
            Reply to {session.customerName}
          </label>
          <textarea
            id={inputId}
            className="field__control composer__input"
            rows={2}
            maxLength={MAX_MESSAGE}
            value={draft}
            disabled={!canReply}
            placeholder={
              canReply
                ? 'Write a reply. Enter sends, Shift+Enter adds a line.'
                : 'Take this chat to reply'
            }
            onChange={(event) => {
              setDraft(event.target.value);
              onTyping(event.target.value.length > 0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!canReply || !draft.trim() || busy !== null}
          >
            <Send size={16} aria-hidden="true" />
            Send
          </button>
        </form>
      )}
    </section>
  );
}

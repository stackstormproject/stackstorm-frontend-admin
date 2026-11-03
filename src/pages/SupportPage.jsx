import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listSupportSessions, updateSupportSessionStatus } from '../api/support';
import { createSupportSocket } from '../services/supportSocket';
import { useResource } from '../hooks/useResource';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { Conversation } from '../components/support/Conversation';
import { appendMessage, fromApiSession, fromSocketMessage, QUEUES } from '../lib/support';
import { formatDateTime } from '../lib/format';

const TYPING_TIMEOUT_MS = 4000;
const STATUS_LABELS = { connecting: 'Connecting…', online: 'Live', offline: 'Reconnecting…' };

const loadSessions = async () => (await listSupportSessions()).map(fromApiSession);

/** A short two-note alert for new chats; silently skipped where audio is blocked. */
const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(587, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not allowed before a user gesture, or unsupported: the queue still updates.
  }
};

export default function SupportPage() {
  const sessions = useResource(loadSessions, []);
  const [params, setParams] = useSearchParams();
  const [queue, setQueue] = useState('pending');
  const [connection, setConnection] = useState('connecting');
  const [typing, setTyping] = useState({});
  const [soundOn, setSoundOn] = useState(false);
  const socketRef = useRef(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const { reload, setData } = sessions;

  const selectedId = params.get('session');
  const list = sessions.data || [];
  const selected = list.find((session) => session.id === selectedId) || null;

  const handleEvent = useCallback(
    (event, data) => {
      if (!data) return;
      if (event === 'support:new_session') {
        if (soundRef.current) playChime();
        reload();
      } else if (event === 'chat:message') {
        const message = fromSocketMessage(data);
        setData((current) => {
          if (!current) return current;
          if (!current.some((s) => s.id === String(data.sessionId))) {
            reload();
            return current;
          }
          return appendMessage(current, data.sessionId, message);
        });
        if (message.from === 'customer') {
          setTyping((t) => ({ ...t, [String(data.sessionId)]: false }));
        }
      } else if (event === 'chat:typing' && data.role === 'customer') {
        setTyping((t) => ({ ...t, [String(data.sessionId)]: Boolean(data.isTyping) }));
      } else if (event === 'chat:session_resolved') {
        setData((current) =>
          current?.map((s) => (s.id === String(data.sessionId) ? { ...s, status: 'resolved' } : s))
        );
      }
    },
    [reload, setData]
  );

  useEffect(() => {
    const socket = createSupportSocket({ onEvent: handleEvent, onStatus: setConnection });
    socketRef.current = socket;
    return () => {
      // #15: a teardown error here must never take down the whole page - the operator has
      // already navigated away, so the socket going away uncleanly isn't worth an error screen.
      try {
        socket.disconnect();
      } catch {
        // already disconnecting/disconnected
      }
    };
  }, [handleEvent]);

  // A typing indicator that never got its "stopped" event clears itself.
  useEffect(() => {
    const active = Object.keys(typing).filter((id) => typing[id]);
    if (!active.length) return undefined;
    const timer = setTimeout(() => setTyping({}), TYPING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [typing]);

  const select = (id) => {
    const next = new URLSearchParams(params);
    next.set('session', id);
    setParams(next, { replace: true });
  };

  const counts = Object.fromEntries(
    QUEUES.map(({ status }) => [status, list.filter((s) => s.status === status).length])
  );
  const visible = list.filter((session) => session.status === queue);

  const take = async () => {
    await socketRef.current.joinSession(selected.id);
    reload();
  };
  const resolve = async () => {
    await updateSupportSessionStatus(selected.id, 'resolved');
    setData((current) =>
      current.map((s) => (s.id === selected.id ? { ...s, status: 'resolved' } : s))
    );
  };
  const send = (text) => socketRef.current.sendMessage(selected.id, text);
  const sendTyping = (isTyping) => {
    if (selected) socketRef.current.sendTyping(selected.id, isTyping);
  };

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="Live support"
        description="Shoppers who ask for a person wait here. Take a chat to reply; the virtual assistant stops answering once an agent joins."
        actions={
          <>
            <span className={`connection connection--${connection}`} role="status">
              <span className="connection__dot" aria-hidden="true" />
              {STATUS_LABELS[connection]}
            </span>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={soundOn}
                onChange={(event) => setSoundOn(event.target.checked)}
              />
              Sound for new chats
            </label>
          </>
        }
      />

      {sessions.loading && !sessions.data && <LoadingState label="Loading conversations" />}
      {sessions.error && <ErrorState error={sessions.error} onRetry={reload} />}
      {sessions.data && (
        <div className="support">
          <section className="card card--flush support__queue" aria-label="Conversations">
            <div className="segmented support__tabs" role="group" aria-label="Queue">
              {QUEUES.map(({ status, label }) => (
                <button
                  key={status}
                  type="button"
                  className="segmented__option"
                  aria-pressed={queue === status}
                  onClick={() => setQueue(status)}
                >
                  {label} ({counts[status]})
                </button>
              ))}
            </div>
            {visible.length === 0 ? (
              <p className="support__empty muted">
                {queue === 'pending' ? 'Nobody is waiting.' : 'No conversations here.'}
              </p>
            ) : (
              <ul className="queue">
                {visible.map((session) => {
                  const last = session.messages[session.messages.length - 1];
                  return (
                    <li key={session.id}>
                      <button
                        type="button"
                        className="queue__item"
                        aria-current={session.id === selectedId ? 'true' : undefined}
                        onClick={() => select(session.id)}
                      >
                        <span className="queue__name">
                          {session.customerName}
                          {typing[session.id] && <span className="badge badge--info">typing</span>}
                        </span>
                        <span className="queue__preview">{last ? last.text : session.topic}</span>
                        <span className="queue__time">{formatDateTime(session.createdAt)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selected ? (
            <Conversation
              key={selected.id}
              session={selected}
              customerTyping={Boolean(typing[selected.id])}
              onTake={take}
              onResolve={resolve}
              onSend={send}
              onTyping={sendTyping}
            />
          ) : (
            <section className="card support__placeholder">
              <EmptyState title="Choose a conversation">
                {counts.pending > 0
                  ? `${counts.pending} ${counts.pending === 1 ? 'shopper is' : 'shoppers are'} waiting.`
                  : 'New chats appear here as soon as a shopper asks for a person.'}
              </EmptyState>
            </section>
          )}
        </div>
      )}
    </>
  );
}

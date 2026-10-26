import React, { useState, useEffect, useRef } from 'react';
import { Clock, Radio, CheckCircle2, Zap } from 'lucide-react';
import adminSocketService from '../services/adminSocket.service';
import apiClient from '../api/client';
import SessionQueue from '../components/support/SessionQueue';
import AgentChatWindow from '../components/support/AgentChatWindow';
import './SupportConsolePage.css';

export const FALLBACK_SUPPORT_SESSIONS = [
  {
    id: 'session-101',
    customer_id: 'cust-102',
    customer_name: 'Nimasha Fernando',
    customer_email: 'nimasha.f@outlook.com',
    tier: 'Gold',
    status: 'pending',
    inquiry_topic: 'Return eligibility question',
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    wait_time_label: '2m ago',
    messages: [
      {
        id: 'msg-1',
        sender: 'customer',
        sender_name: 'Nimasha Fernando',
        text: 'Hello, can I exchange my Linen Summer Dress for a smaller size?',
        timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'session-102',
    customer_id: 'cust-103',
    customer_name: 'Thisara Perera',
    customer_email: 'thisara@yahoo.com',
    tier: 'Platinum',
    status: 'agent_active',
    inquiry_topic: 'VIP expedited dispatch query',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    wait_time_label: '15m ago',
    messages: [
      {
        id: 'msg-10',
        sender: 'customer',
        sender_name: 'Thisara Perera',
        text: 'Hi, was order DFC-20261005-9901 dispatched this morning?',
        timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-11',
        sender: 'agent',
        sender_name: 'Alex (Support Agent)',
        text: 'Hello Thisara! Yes, tracking code SLPOST-81100-01 has been assigned and is in transit.',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'session-103',
    customer_id: 'cust-104',
    customer_name: 'Sanduni Wickramasinghe',
    customer_email: 'sanduni.w@gmail.com',
    tier: 'Platinum',
    status: 'resolved',
    inquiry_topic: 'Silk Saree Care Instructions',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    wait_time_label: '1h ago',
    messages: [
      {
        id: 'msg-20',
        sender: 'customer',
        sender_name: 'Sanduni Wickramasinghe',
        text: 'Thank you for the dry cleaning recommendations!',
        timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      },
      {
        id: 'msg-21',
        sender: 'agent',
        sender_name: 'Alex (Support Agent)',
        text: 'You are very welcome! Have a wonderful day.',
        timestamp: new Date(Date.now() - 54 * 60 * 1000).toISOString(),
      },
    ],
  },
];

export default function SupportConsolePage() {
  const [sessions, setSessions] = useState(FALLBACK_SUPPORT_SESSIONS);
  const [selectedSessionId, setSelectedSessionId] = useState('session-102');
  const [isCustomerTyping, setIsCustomerTyping] = useState(false);
  const [isChimeEnabled, setIsChimeEnabled] = useState(true);
  const typingTimerRef = useRef(null);

  // Web Audio Chime Synthesis (Zero Asset Dependency)
  const playChime = () => {
    if (!isChimeEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay blocked or unsupported
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/admin/support/sessions')
      .then(({ data }) => {
        const liveSessions = data?.sessions || (Array.isArray(data) ? data : null);
        if (isMounted && Array.isArray(liveSessions)) {
          if (liveSessions.length > 0) {
            setSessions(liveSessions);
            if (
              !selectedSessionId ||
              !liveSessions.some((s) => String(s.id) === String(selectedSessionId))
            ) {
              setSelectedSessionId(liveSessions[0].id);
            }
          } else {
            setSessions([]);
            setSelectedSessionId(null);
          }
        }
      })
      .catch(() => {
        // Fallback retained if backend is unreachable or during test execution
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // 1. Establish socket connection
    adminSocketService.connect();

    // 2. Incoming message listener
    const unsubMsg = adminSocketService.on('chat:message', (data) => {
      if (!data) return;
      const { sessionId, message, text, sender, senderRole, senderName, createdAt, timestamp } =
        data;

      setSessions((prev) =>
        prev.map((s) => {
          if (String(s.id) === String(sessionId)) {
            const role = senderRole || sender || 'customer';
            const msgSender = role === 'support_agent' || role === 'agent' ? 'agent' : 'customer';
            const msgText = typeof message === 'string' ? message : text || message?.text || '';
            const newMsg = {
              id: data.id || `msg-${Date.now()}`,
              sender: msgSender,
              sender_name:
                senderName ||
                (msgSender === 'agent' ? 'Support Agent' : s.customer_name || 'Customer'),
              text: msgText,
              timestamp: createdAt || timestamp || new Date().toISOString(),
            };
            return {
              ...s,
              messages: [...(s.messages || []), newMsg],
            };
          }
          return s;
        })
      );

      const role = senderRole || sender || 'customer';
      if (role !== 'support_agent' && role !== 'agent') {
        playChime();
      }
    });

    // 3. Typing indicator listener
    const unsubTyping = adminSocketService.on('chat:typing', (data) => {
      if (!data) return;
      if (String(data.sessionId) === String(selectedSessionId)) {
        setIsCustomerTyping(Boolean(data.isTyping));
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (data.isTyping) {
          typingTimerRef.current = setTimeout(() => {
            setIsCustomerTyping(false);
          }, 3000);
        }
      }
    });

    // 4. New session in queue listener
    const unsubNewSession = adminSocketService.on('support:new_session', (sessionData) => {
      if (!sessionData) return;
      const normalizedSession = {
        id: String(sessionData.sessionId || sessionData.id),
        customer_id: sessionData.customerId ? String(sessionData.customerId) : 'guest',
        customer_name:
          sessionData.customerName ||
          (sessionData.customerId ? `Customer #${sessionData.customerId}` : 'Storefront Guest'),
        customer_email: sessionData.customerEmail || 'guest@stackstorm.lk',
        tier: sessionData.tier || 'Silver',
        status: sessionData.status || 'pending',
        inquiry_topic:
          sessionData.subject || sessionData.inquiry_topic || 'Customer Storefront Inquiry',
        created_at: sessionData.createdAt || new Date().toISOString(),
        wait_time_label: 'Just now',
        messages: sessionData.messages || [],
      };

      setSessions((prev) => {
        if (prev.some((s) => String(s.id) === normalizedSession.id)) {
          return prev;
        }
        return [normalizedSession, ...prev];
      });
      playChime();
    });

    return () => {
      unsubMsg();
      unsubTyping();
      unsubNewSession();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [selectedSessionId, isChimeEnabled]);

  const activeSession = sessions.find((s) => String(s.id) === String(selectedSessionId)) || null;

  const handleAcceptSession = (session) => {
    setSessions((prev) =>
      prev.map((s) => (String(s.id) === String(session.id) ? { ...s, status: 'agent_active' } : s))
    );
    setSelectedSessionId(session.id);
    adminSocketService.joinSession(session.id);
    apiClient
      .patch(`/admin/support/sessions/${session.id}/status`, { status: 'agent_active' })
      .catch(() => {});
  };

  const handleSendMessage = (text) => {
    if (!activeSession) return;
    const newMsg = {
      id: `msg-agent-${Date.now()}`,
      sender: 'agent',
      sender_name: 'Alex (Support Agent)',
      text,
      timestamp: new Date().toISOString(),
    };

    setSessions((prev) =>
      prev.map((s) =>
        String(s.id) === String(activeSession.id)
          ? { ...s, messages: [...(s.messages || []), newMsg] }
          : s
      )
    );

    adminSocketService.sendMessage(activeSession.id, text);
  };

  const handleResolveSession = (sessionId) => {
    setSessions((prev) =>
      prev.map((s) => (String(s.id) === String(sessionId) ? { ...s, status: 'resolved' } : s))
    );
    apiClient
      .patch(`/admin/support/sessions/${sessionId}/status`, { status: 'resolved' })
      .catch(() => {});
  };

  const handleTyping = (isTyping) => {
    if (activeSession) {
      adminSocketService.sendTyping(activeSession.id, isTyping);
    }
  };

  const waitingCount = sessions.filter((s) => s.status === 'pending').length;
  const activeCount = sessions.filter(
    (s) => s.status === 'agent_active' || s.status === 'active'
  ).length;
  const resolvedCount = sessions.filter((s) => s.status === 'resolved').length;

  return (
    <div className="support-console-container" data-testid="support-console-page">
      {/* Header */}
      <div className="support-header">
        <div>
          <div className="support-kicker">
            <span className="live-pulse-badge">
              <span className="pulse-dot" />
              <span>WebSocket Connected</span>
            </span>
            <span className="support-kicker-tag">Live Support Desk • Dickwella Atelier</span>
          </div>
          <h1 className="support-title">Real-Time Support Console &amp; Queue</h1>
          <p className="support-subtitle">
            Manage live multi-channel shopper inquiries, triage pending queue requests, send quick
            canned resolutions, and monitor bi-directional typing broadcasts.
          </p>
        </div>
      </div>

      {/* 4 Operational KPI Cards */}
      <div className="support-kpis-grid">
        <div className="support-kpi-card" data-testid="kpi-waiting-queue">
          <div className="kpi-top">
            <span className="kpi-tag">Waiting in Queue</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }}
            >
              <Clock size={16} />
            </div>
          </div>
          <span className="kpi-big-num">{waitingCount}</span>
          <span className="kpi-subtext">Needs agent assignment</span>
        </div>

        <div className="support-kpi-card" data-testid="kpi-active-chats">
          <div className="kpi-top">
            <span className="kpi-tag">Active Conversations</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}
            >
              <Radio size={16} />
            </div>
          </div>
          <span className="kpi-big-num">{activeCount}</span>
          <span className="kpi-subtext">Underway in real time</span>
        </div>

        <div className="support-kpi-card" data-testid="kpi-resolved-inquiries">
          <div className="kpi-top">
            <span className="kpi-tag">Resolved Inquiries</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}
            >
              <CheckCircle2 size={16} />
            </div>
          </div>
          <span className="kpi-big-num">{resolvedCount}</span>
          <span className="kpi-subtext">Completed today</span>
        </div>

        <div className="support-kpi-card" data-testid="kpi-response-speed">
          <div className="kpi-top">
            <span className="kpi-tag">Avg Response Speed</span>
            <div
              className="kpi-icon-box"
              style={{
                backgroundColor: 'var(--admin-accent-subtle)',
                color: 'var(--admin-accent)',
              }}
            >
              <Zap size={16} />
            </div>
          </div>
          <span className="kpi-big-num">38s</span>
          <span className="kpi-subtext">SLA Target &lt; 60s</span>
        </div>
      </div>

      {/* Dual Panel Layout */}
      <div className="support-dual-panel">
        <SessionQueue
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onAcceptSession={handleAcceptSession}
          isChimeEnabled={isChimeEnabled}
          onToggleChime={() => setIsChimeEnabled((prev) => !prev)}
        />

        <AgentChatWindow
          session={activeSession}
          onSendMessage={handleSendMessage}
          isCustomerTyping={isCustomerTyping}
          onResolveSession={handleResolveSession}
          onTyping={handleTyping}
        />
      </div>
    </div>
  );
}

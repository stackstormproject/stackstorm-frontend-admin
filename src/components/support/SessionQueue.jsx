import React, { useState } from 'react';
import {
  Search,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  Radio,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import './SessionQueue.css';

export default function SessionQueue({
  sessions = [],
  selectedSessionId,
  onSelectSession,
  onAcceptSession,
  isChimeEnabled = true,
  onToggleChime,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'pending' | 'active' | 'resolved'

  const filteredSessions = sessions.filter((s) => {
    let matchesTab = true;
    if (filterTab === 'pending') {
      matchesTab = s.status === 'pending';
    } else if (filterTab === 'active') {
      matchesTab = s.status === 'agent_active' || s.status === 'active';
    } else if (filterTab === 'resolved') {
      matchesTab = s.status === 'resolved';
    }

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (s.customer_name || '').toLowerCase().includes(query) ||
      (s.customer_email || '').toLowerCase().includes(query) ||
      (s.inquiry_topic || '').toLowerCase().includes(query) ||
      (s.id || '').toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  const pendingCount = sessions.filter((s) => s.status === 'pending').length;

  return (
    <aside
      className="session-queue-panel"
      data-testid="session-queue-panel"
      aria-label="Customer Support Session Queue"
    >
      {/* Queue Header */}
      <div className="queue-header">
        <div className="queue-header-top">
          <div className="queue-title-group">
            <MessageSquare size={16} color="var(--admin-primary)" />
            <h3 className="queue-title">Inquiry Queue</h3>
            {pendingCount > 0 && (
              <span className="queue-count-badge" title={`${pendingCount} pending in queue`}>
                {pendingCount}
              </span>
            )}
          </div>

          <button
            type="button"
            className={`chime-toggle-btn ${isChimeEnabled ? 'chime-active' : ''}`}
            onClick={onToggleChime}
            aria-label={
              isChimeEnabled
                ? 'Disable audio notification chime'
                : 'Enable audio notification chime'
            }
            title={isChimeEnabled ? 'Notification Chime: Enabled' : 'Notification Chime: Muted'}
            data-testid="toggle-chime-btn"
          >
            {isChimeEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>

        {/* Search */}
        <div className="queue-search-box">
          <Search size={14} className="queue-search-icon" />
          <input
            type="text"
            placeholder="Search customer, email, topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="queue-search-input"
            aria-label="Filter support sessions"
            data-testid="session-search-input"
          />
        </div>

        {/* Filter Pills */}
        <div className="queue-filter-tabs" role="tablist" aria-label="Session status filters">
          <button
            type="button"
            className={`queue-tab-btn ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
            data-testid="queue-tab-all"
          >
            All ({sessions.length})
          </button>
          <button
            type="button"
            className={`queue-tab-btn ${filterTab === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterTab('pending')}
            data-testid="queue-tab-pending"
          >
            Waiting ({pendingCount})
          </button>
          <button
            type="button"
            className={`queue-tab-btn ${filterTab === 'active' ? 'active' : ''}`}
            onClick={() => setFilterTab('active')}
            data-testid="queue-tab-active"
          >
            Live (
            {sessions.filter((s) => s.status === 'agent_active' || s.status === 'active').length})
          </button>
          <button
            type="button"
            className={`queue-tab-btn ${filterTab === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilterTab('resolved')}
            data-testid="queue-tab-resolved"
          >
            Closed ({sessions.filter((s) => s.status === 'resolved').length})
          </button>
        </div>
      </div>

      {/* Queue List */}
      <div className="queue-list" role="list">
        {filteredSessions.length === 0 ? (
          <div className="empty-queue-cell">No support sessions match the selected filter.</div>
        ) : (
          filteredSessions.map((session) => {
            const isSelected = String(selectedSessionId) === String(session.id);
            const lastMsg =
              session.messages && session.messages.length > 0
                ? session.messages[session.messages.length - 1].text
                : session.inquiry_topic;

            return (
              <div
                key={session.id}
                role="listitem"
                tabIndex={0}
                className={`session-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectSession && onSelectSession(session.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectSession && onSelectSession(session.id);
                  }
                }}
                data-testid={`session-item-${session.id}`}
              >
                <div className="session-top">
                  <div className="customer-meta">
                    <div className="cust-avatar">
                      {session.customer_name ? session.customer_name.charAt(0) : 'C'}
                    </div>
                    <div className="cust-details">
                      <span className="cust-name">{session.customer_name}</span>
                      <span className="cust-tier-badge">{session.tier || 'Silver'} Patron</span>
                    </div>
                  </div>

                  <div>
                    {session.status === 'pending' && (
                      <span className="session-status-badge status-waiting">
                        <Clock size={10} /> Waiting
                      </span>
                    )}
                    {(session.status === 'agent_active' || session.status === 'active') && (
                      <span className="session-status-badge status-live">
                        <Radio size={10} /> Live
                      </span>
                    )}
                    {session.status === 'resolved' && (
                      <span className="session-status-badge status-closed">
                        <CheckCircle2 size={10} /> Closed
                      </span>
                    )}
                  </div>
                </div>

                <p className="session-snippet">{lastMsg}</p>

                <div className="session-footer">
                  <div className="wait-clock">
                    <Clock size={11} />
                    <span>{session.wait_time_label || 'Just now'}</span>
                  </div>

                  {session.status === 'pending' && (
                    <button
                      type="button"
                      className="btn-accept-chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcceptSession && onAcceptSession(session);
                      }}
                      title="Accept customer inquiry and join live session"
                      data-testid={`accept-chat-btn-${session.id}`}
                    >
                      <UserCheck size={12} />
                      <span>Accept Chat</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

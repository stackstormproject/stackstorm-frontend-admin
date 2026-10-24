import React from 'react';
import { Bell, Search, ExternalLink, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminHeader({
  activeTabLabel = 'Dashboard & KPIs',
  isBackendHealthy = true,
  gatewayMessage = 'Backend Connected (Port 5000)',
}) {
  return (
    <header className="admin-top-header" role="banner">
      {/* Breadcrumbs */}
      <div className="header-breadcrumbs">
        <span>Operations</span>
        <span>/</span>
        <span style={{ color: 'var(--admin-primary)', fontWeight: 'var(--font-semibold)' }}>
          {activeTabLabel}
        </span>
      </div>

      {/* Right Controls */}
      <div className="header-right-tools">
        {/* Gateway Status Badge */}
        <div className="gateway-status-pill" title={gatewayMessage}>
          {isBackendHealthy ? (
            <CheckCircle2 size={14} color="var(--admin-success)" />
          ) : (
            <AlertCircle size={14} color="var(--admin-warning)" />
          )}
          <span>{gatewayMessage}</span>
        </div>

        {/* Quick Search Shortcut */}
        <button className="tool-icon-btn" aria-label="Search Console" title="Search (Ctrl + K)">
          <Search size={18} />
        </button>

        {/* Notification Bell */}
        <button className="tool-icon-btn" aria-label="View Notifications" title="Notifications">
          <Bell size={18} />
        </button>

        {/* Link to Live Storefront */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noreferrer"
          className="tool-icon-btn"
          aria-label="Open Customer Storefront"
          title="Open Storefront (Port 5173)"
        >
          <ExternalLink size={18} />
        </a>

        {/* Staff Role Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            background: 'var(--admin-surface-elevated)',
            border: '1px solid var(--admin-border)',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-xs)',
          }}
        >
          <ShieldCheck size={14} color="var(--admin-accent)" />
          <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--admin-accent)' }}>
            ADMIN
          </span>
        </div>
      </div>
    </header>
  );
}

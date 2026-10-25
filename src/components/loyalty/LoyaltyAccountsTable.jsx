import React, { useState } from 'react';
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Award,
  Crown,
  Edit3,
} from 'lucide-react';
import './LoyaltyAccountsTable.css';

export default function LoyaltyAccountsTable({ accounts = [], onAdjustPoints, onOpenAdjustModal }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Filter accounts
  const filteredAccounts = accounts.filter((acc) => {
    const tier = (acc.tier || '').toLowerCase();
    const quarters = acc.quarters_below_spend || 0;
    const status = (acc.grace_period_status || '').toLowerCase();

    let matchesTab = true;
    if (selectedFilter === 'silver') matchesTab = tier === 'silver';
    else if (selectedFilter === 'gold') matchesTab = tier === 'gold';
    else if (selectedFilter === 'platinum') matchesTab = tier === 'platinum';
    else if (selectedFilter === 'grace' || selectedFilter === 'grace_warning') {
      matchesTab = quarters > 0 || status === 'warning' || status === 'downgrade_pending';
    }

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (acc.customer_name || '').toLowerCase().includes(query) ||
      (acc.customer_email || '').toLowerCase().includes(query) ||
      (acc.customer_id || '').toLowerCase().includes(query) ||
      tier.includes(query);

    return matchesTab && matchesSearch;
  });

  const getTierIcon = (tier) => {
    switch ((tier || '').toLowerCase()) {
      case 'platinum':
        return <Crown size={12} />;
      case 'gold':
        return <Award size={12} />;
      default:
        return <ShieldCheck size={12} />;
    }
  };

  const getGraceStatusBadge = (acc) => {
    const quarters = acc.quarters_below_spend || 0;
    const status = acc.grace_period_status;

    if (quarters >= 2 || status === 'downgrade_pending') {
      return (
        <span
          className="grace-badge red-alert"
          title="2 consecutive quarters below spend threshold. Downgrade pending next quarterly audit sweep."
          data-testid="grace-badge-downgrade-pending"
        >
          <AlertOctagon size={13} />
          <span>Q2 Downgrade Pending</span>
        </span>
      );
    }

    if (quarters === 1 || status === 'warning') {
      return (
        <span
          className="grace-badge amber-warning"
          title="1 quarter below spend threshold. Tier preserved under 2-Quarter Grace Period Policy."
          data-testid="grace-badge-q1-warning"
        >
          <AlertTriangle size={13} />
          <span>Q1 Grace Warning</span>
        </span>
      );
    }

    return (
      <span
        className="grace-badge green-maintained"
        title="Account meets spend requirement. Tier actively maintained."
        data-testid="grace-badge-maintained"
      >
        <ShieldCheck size={13} />
        <span>Active / Maintained</span>
      </span>
    );
  };

  const graceAccountsCount = accounts.filter(
    (a) =>
      (a.quarters_below_spend || 0) > 0 ||
      a.grace_period_status === 'warning' ||
      a.grace_period_status === 'downgrade_pending'
  ).length;

  return (
    <div className="loyalty-table-card" data-testid="loyalty-accounts-table">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search customer, email, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search customer loyalty accounts"
            data-testid="loyalty-search-input"
          />
        </div>

        {/* Filter Pills */}
        <div className="tier-filter-tabs" role="tablist" aria-label="Tier Filters">
          <button
            type="button"
            className={`filter-tab-btn ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
            data-testid="tier-tab-all"
          >
            <span>ALL</span>
            <span className="tab-badge">{accounts.length}</span>
          </button>

          <button
            type="button"
            className={`filter-tab-btn ${selectedFilter === 'platinum' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('platinum')}
            data-testid="tier-tab-platinum"
          >
            <span>PLATINUM</span>
            <span className="tab-badge">
              {accounts.filter((a) => (a.tier || '').toLowerCase() === 'platinum').length}
            </span>
          </button>

          <button
            type="button"
            className={`filter-tab-btn ${selectedFilter === 'gold' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('gold')}
            data-testid="tier-tab-gold"
          >
            <span>GOLD</span>
            <span className="tab-badge">
              {accounts.filter((a) => (a.tier || '').toLowerCase() === 'gold').length}
            </span>
          </button>

          <button
            type="button"
            className={`filter-tab-btn ${selectedFilter === 'silver' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('silver')}
            data-testid="tier-tab-silver"
          >
            <span>SILVER</span>
            <span className="tab-badge">
              {accounts.filter((a) => (a.tier || '').toLowerCase() === 'silver').length}
            </span>
          </button>

          <button
            type="button"
            className={`filter-tab-btn tab-grace ${
              selectedFilter === 'grace' || selectedFilter === 'grace_warning' ? 'active' : ''
            }`}
            onClick={() => setSelectedFilter('grace_warning')}
            data-testid="tier-tab-grace"
          >
            <span>GRACE WARNINGS ⚠️</span>
            <span className="tab-badge">{graceAccountsCount}</span>
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="table-responsive-wrapper">
        <table className="loyalty-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Current Tier</th>
              <th>Annual Spend vs Threshold</th>
              <th>Points Balance</th>
              <th>2-Quarter Grace Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  No loyalty accounts match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredAccounts.map((acc) => {
                const threshold = acc.tier_threshold || 0;
                const spend = acc.annual_spend || 0;
                const spendPct =
                  threshold > 0 ? Math.min(100, Math.round((spend / threshold) * 100)) : 100;
                const isUnderSpend = threshold > 0 && spend < threshold;

                return (
                  <tr key={acc.id} className="loyalty-row" data-testid={`loyalty-row-${acc.id}`}>
                    <td>
                      <div className="customer-cell">
                        <span className="cust-name">{acc.customer_name}</span>
                        <span className="cust-email">{acc.customer_email}</span>
                        <span className="cust-id">{acc.customer_id}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`tier-pill tier-${(acc.tier || 'silver').toLowerCase()}`}>
                        {getTierIcon(acc.tier)}
                        <span>{acc.tier}</span>
                      </span>
                    </td>
                    <td>
                      <div className="spend-cell">
                        <span className="spend-amount">
                          {acc.annual_spend_formatted || `LKR ${spend.toLocaleString()}`}
                        </span>
                        <span className="spend-threshold">
                          {threshold > 0
                            ? `Threshold: LKR ${threshold.toLocaleString()} (${spendPct}%)`
                            : 'Standard Free Tier'}
                        </span>
                        <div className="spend-progress-track">
                          <div
                            className="spend-progress-bar"
                            style={{
                              width: `${spendPct}%`,
                              backgroundColor: isUnderSpend
                                ? 'var(--admin-warning)'
                                : 'var(--admin-success)',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="points-cell">
                        {acc.points_balance?.toLocaleString()} pts
                      </span>
                    </td>
                    <td data-testid={`grace-status-${acc.id}`}>{getGraceStatusBadge(acc)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-adjust-points"
                        onClick={() => {
                          if (onAdjustPoints) onAdjustPoints(acc);
                          else if (onOpenAdjustModal) onOpenAdjustModal(acc);
                        }}
                        title="Adjust points for customer goodwill"
                        data-testid={`adjust-points-btn-${acc.customer_id || acc.id}`}
                      >
                        <Edit3 size={13} />
                        <span>Adjust Points</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

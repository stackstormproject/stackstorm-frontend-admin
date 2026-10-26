import React, { useState, useEffect } from 'react';
import {
  Award,
  Crown,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { adminLoyaltyApi, FALLBACK_LOYALTY_ACCOUNTS } from '../api/adminLoyalty.api';
import LoyaltyDistributionChart from '../components/loyalty/LoyaltyDistributionChart';
import LoyaltyAccountsTable from '../components/loyalty/LoyaltyAccountsTable';
import PointsAdjustmentModal from '../components/loyalty/PointsAdjustmentModal';
import './LoyaltyConsolePage.css';

export default function LoyaltyConsolePage() {
  const [accounts, setAccounts] = useState(FALLBACK_LOYALTY_ACCOUNTS);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      const data = await adminLoyaltyApi.getAccounts();
      if (Array.isArray(data)) {
        setAccounts(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handlePointsAdjustment = async ({ customerId, pointsDelta, reason, notes }) => {
    await adminLoyaltyApi.adjustPoints({ customerId, pointsDelta, reason, notes });

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.customer_id === customerId || acc.id === customerId) {
          const newBal = Math.max(0, (acc.points_balance || 0) + pointsDelta);
          return { ...acc, points_balance: newBal };
        }
        return acc;
      })
    );

    const sign = pointsDelta > 0 ? `+${pointsDelta}` : `${pointsDelta}`;
    setToastMessage(`Adjusted ${sign} points for customer goodwill.`);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleRunQuarterlyAudit = async () => {
    setIsAuditing(true);
    try {
      const result = await adminLoyaltyApi.triggerQuarterlyAudit();

      // Enforce 2-quarter consecutive grace downgrade rule
      setAccounts((prev) =>
        prev.map((acc) => {
          const quarters = acc.quarters_below_spend || 0;
          if (quarters >= 2 || acc.grace_period_status === 'downgrade_pending') {
            const currentTier = (acc.tier || '').toLowerCase();
            let newTier = 'silver';
            let newThreshold = 0;
            if (currentTier === 'platinum') {
              newTier = 'gold';
              newThreshold = 100000;
            }
            return {
              ...acc,
              tier: newTier,
              tier_threshold: newThreshold,
              quarters_below_spend: 0,
              grace_period_status: 'maintained',
            };
          }
          return acc;
        })
      );

      const downgraded = result?.downgradedCount ?? 1;
      const evaluated = result?.evaluatedAccounts ?? accounts.length;
      setToastMessage(
        `Quarterly Audit Sweep executed! Evaluated ${evaluated} accounts. ${downgraded} pending downgrade applied under 2-quarter grace policy.`
      );
      setTimeout(() => setToastMessage(''), 5500);
    } finally {
      setIsAuditing(false);
    }
  };

  const platinumCount = accounts.filter((a) => (a.tier || '').toLowerCase() === 'platinum').length;
  const goldCount = accounts.filter((a) => (a.tier || '').toLowerCase() === 'gold').length;
  const silverCount = accounts.filter((a) => (a.tier || '').toLowerCase() === 'silver').length;
  const graceAccountsCount = accounts.filter(
    (a) =>
      (a.quarters_below_spend || 0) > 0 ||
      a.grace_period_status === 'warning' ||
      a.grace_period_status === 'downgrade_pending'
  ).length;

  return (
    <div className="loyalty-page-container" data-testid="loyalty-console-page">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="loyalty-toast" role="alert" data-testid="loyalty-toast">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="loyalty-header">
        <div>
          <div className="loyalty-kicker">
            <span className="kicker-badge">Customer Retention Lifecycle</span>
            <span className="kicker-tag">2-Quarter Grace Period Policy Oversight</span>
          </div>
          <h1 className="loyalty-title">Loyalty Tier Console &amp; Grace Period Oversight</h1>
          <p className="loyalty-subtitle">
            Monitor customer tier progression, inspect annual spend against thresholds, issue
            customer service goodwill adjustments, and govern 2-quarter grace downgrades.
          </p>
        </div>

        <div className="loyalty-header-actions">
          <button
            type="button"
            className="audit-sweep-btn"
            onClick={handleRunQuarterlyAudit}
            disabled={isAuditing}
            data-testid="run-quarterly-audit-btn"
          >
            <RefreshCw size={14} className={isAuditing ? 'spinning' : ''} />
            <span>{isAuditing ? 'Auditing Roster...' : 'Run Quarterly Audit Sweep'}</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="loyalty-kpis-grid">
        <div className="kpi-card" data-testid="kpi-total-members">
          <div className="kpi-header">
            <span className="kpi-label">Total Tier Members</span>
            <div
              className="kpi-icon-box"
              style={{
                backgroundColor: 'var(--admin-primary-subtle)',
                color: 'var(--admin-primary)',
              }}
            >
              <Users size={16} />
            </div>
          </div>
          <span className="kpi-val">{accounts.length}</span>
          <span className="kpi-footer">Active Dickwella patrons</span>
        </div>

        <div className="kpi-card" data-testid="kpi-platinum">
          <div className="kpi-header">
            <span className="kpi-label">Platinum VIP</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8' }}
            >
              <Crown size={16} />
            </div>
          </div>
          <span className="kpi-val">{platinumCount}</span>
          <span className="kpi-footer">Threshold: LKR 250,000+</span>
        </div>

        <div className="kpi-card" data-testid="kpi-gold">
          <div className="kpi-header">
            <span className="kpi-label">Gold Members</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
            >
              <Award size={16} />
            </div>
          </div>
          <span className="kpi-val">{goldCount}</span>
          <span className="kpi-footer">Threshold: LKR 100,000+</span>
        </div>

        <div className="kpi-card" data-testid="kpi-silver">
          <div className="kpi-header">
            <span className="kpi-label">Silver Members</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8' }}
            >
              <ShieldCheck size={16} />
            </div>
          </div>
          <span className="kpi-val">{silverCount}</span>
          <span className="kpi-footer">Standard baseline tier</span>
        </div>

        <div className="kpi-card" data-testid="kpi-grace">
          <div className="kpi-header">
            <span className="kpi-label">At-Risk Grace Accounts</span>
            <div
              className="kpi-icon-box"
              style={{ backgroundColor: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }}
            >
              <AlertTriangle size={16} />
            </div>
          </div>
          <span className="kpi-val">{graceAccountsCount}</span>
          <span className="kpi-footer">Sub-threshold grace period</span>
        </div>
      </div>

      {/* Middle Analytics Section: Donut Chart + Policy Explainer */}
      <div className="analytics-grid">
        <LoyaltyDistributionChart accounts={accounts} />

        <div className="policy-explainer-card">
          <h3 className="policy-title">
            <ShieldAlert size={18} color="var(--admin-primary)" />
            <span>2-Quarter Grace Period Policy (SDS §11.4)</span>
          </h3>
          <p className="policy-desc">
            Dickwella Fashion Corner enforces a stateful hysteresis retention model. Shoppers who
            experience a temporary dip in spending do not lose high-tier privileges prematurely.
          </p>

          <div className="policy-steps">
            <div className="policy-step">
              <span
                className="step-num"
                style={{
                  backgroundColor: 'var(--admin-success-bg)',
                  color: 'var(--admin-success)',
                }}
              >
                1
              </span>
              <div className="step-content">
                <span className="step-label">Stage 1: Active / Maintained</span>
                <span className="step-detail">
                  Customer annual spend meets or exceeds the tier threshold. Tier benefits remain
                  fully unlocked.
                </span>
              </div>
            </div>

            <div className="policy-step">
              <span
                className="step-num"
                style={{
                  backgroundColor: 'var(--admin-warning-bg)',
                  color: 'var(--admin-warning)',
                }}
              >
                2
              </span>
              <div className="step-content">
                <span className="step-label">Stage 2: Q1 Grace Warning (Tier Preserved)</span>
                <span className="step-detail">
                  1 quarter below threshold. Account enters grace period. Tier and multiplier perks
                  are 100% preserved.
                </span>
              </div>
            </div>

            <div className="policy-step">
              <span
                className="step-num"
                style={{ backgroundColor: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
              >
                3
              </span>
              <div className="step-content">
                <span className="step-label">Stage 3: Q2 Downgrade Pending</span>
                <span className="step-detail">
                  2 consecutive quarters below threshold. Downgrade is scheduled and applied during
                  the next quarterly audit sweep.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <LoyaltyAccountsTable accounts={accounts} onAdjustPoints={(acc) => setSelectedAccount(acc)} />

      {/* Points Adjustment Modal */}
      <PointsAdjustmentModal
        isOpen={Boolean(selectedAccount)}
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onSubmit={handlePointsAdjustment}
      />
    </div>
  );
}

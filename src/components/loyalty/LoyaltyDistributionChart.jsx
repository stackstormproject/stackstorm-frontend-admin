import React from 'react';
import './LoyaltyDistributionChart.css';

export default function LoyaltyDistributionChart({ accounts = [] }) {
  const silverCount = accounts.filter((a) => (a.tier || '').toLowerCase() === 'silver').length;
  const goldCount = accounts.filter((a) => (a.tier || '').toLowerCase() === 'gold').length;
  const platinumCount = accounts.filter((a) => (a.tier || '').toLowerCase() === 'platinum').length;
  const total = silverCount + goldCount + platinumCount;

  const silverPct = total > 0 ? Math.round((silverCount / total) * 100) : 0;
  const goldPct = total > 0 ? Math.round((goldCount / total) * 100) : 0;
  const platinumPct = total > 0 ? Math.max(0, 100 - silverPct - goldPct) : 0;

  const RADIUS = 70;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  // Arc lengths
  const platArc = total > 0 ? (platinumCount / total) * CIRCUMFERENCE : 0;
  const goldArc = total > 0 ? (goldCount / total) * CIRCUMFERENCE : 0;
  const silverArc = total > 0 ? (silverCount / total) * CIRCUMFERENCE : 0;

  const platOffset = 0;
  const goldOffset = platArc;
  const silverOffset = platArc + goldArc;

  return (
    <div className="loyalty-chart-card" data-testid="loyalty-distribution-chart">
      <div className="chart-header">
        <h3 className="chart-title">Customer Tier Distribution</h3>
        <span className="chart-badge">Active Roster</span>
      </div>

      <div className="chart-body">
        <div className="donut-wrapper">
          <svg
            viewBox="0 0 200 200"
            className="donut-svg"
            data-testid="donut-chart-svg"
            aria-label="Tier distribution donut chart"
          >
            {/* Background Track */}
            <circle
              cx="100"
              cy="100"
              r={RADIUS}
              fill="transparent"
              stroke="var(--admin-border)"
              strokeWidth="20"
            />

            {/* Platinum Segment (#38BDF8) */}
            {platArc > 0 && (
              <circle
                cx="100"
                cy="100"
                r={RADIUS}
                className="donut-segment"
                stroke="#38BDF8"
                strokeDasharray={`${platArc} ${CIRCUMFERENCE}`}
                strokeDashoffset={-platOffset}
                data-testid="segment-platinum"
              />
            )}

            {/* Gold Segment (#F59E0B) */}
            {goldArc > 0 && (
              <circle
                cx="100"
                cy="100"
                r={RADIUS}
                className="donut-segment"
                stroke="#F59E0B"
                strokeDasharray={`${goldArc} ${CIRCUMFERENCE}`}
                strokeDashoffset={-goldOffset}
                data-testid="segment-gold"
              />
            )}

            {/* Silver Segment (#94A3B8) */}
            {silverArc > 0 && (
              <circle
                cx="100"
                cy="100"
                r={RADIUS}
                className="donut-segment"
                stroke="#94A3B8"
                strokeDasharray={`${silverArc} ${CIRCUMFERENCE}`}
                strokeDashoffset={-silverOffset}
                data-testid="segment-silver"
              />
            )}
          </svg>

          <div className="donut-center-info">
            <span className="center-count" data-testid="chart-total-members">
              {total}
            </span>
            <span className="center-label">Members</span>
          </div>
        </div>

        {/* Legend */}
        <div className="chart-legend">
          <div className="legend-item" data-testid="legend-platinum">
            <div className="legend-info">
              <span className="legend-color-dot" style={{ backgroundColor: '#38BDF8' }} />
              <span className="legend-tier-name">Platinum VIP</span>
            </div>
            <div className="legend-metrics">
              <span className="legend-count">{platinumCount}</span>
              <span className="legend-pct">({platinumPct}%)</span>
            </div>
          </div>

          <div className="legend-item" data-testid="legend-gold">
            <div className="legend-info">
              <span className="legend-color-dot" style={{ backgroundColor: '#F59E0B' }} />
              <span className="legend-tier-name">Gold</span>
            </div>
            <div className="legend-metrics">
              <span className="legend-count">{goldCount}</span>
              <span className="legend-pct">({goldPct}%)</span>
            </div>
          </div>

          <div className="legend-item" data-testid="legend-silver">
            <div className="legend-info">
              <span className="legend-color-dot" style={{ backgroundColor: '#94A3B8' }} />
              <span className="legend-tier-name">Silver</span>
            </div>
            <div className="legend-metrics">
              <span className="legend-count">{silverCount}</span>
              <span className="legend-pct">({silverPct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

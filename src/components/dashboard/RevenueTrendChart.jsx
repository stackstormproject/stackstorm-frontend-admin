import React, { useState } from 'react';
import { Calendar, BarChart3, TrendingUp } from 'lucide-react';
import './RevenueTrendChart.css';

export default function RevenueTrendChart({ trendData, isLoading = false }) {
  const [activeTimeframe, setActiveTimeframe] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const series = trendData?.[activeTimeframe] || [];

  // Calculate statistics
  const totalRevenue = series.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalOrders = series.reduce((sum, item) => sum + (item.orders || 0), 0);
  const maxRevenue = Math.max(...series.map((item) => item.revenue || 0), 1000);

  // SVG Chart Geometry
  const width = 700;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = series.map((item, idx) => {
    const x = paddingX + (series.length > 1 ? (idx / (series.length - 1)) * chartWidth : chartWidth / 2);
    const normalizedY = (item.revenue || 0) / maxRevenue;
    const y = height - paddingY - normalizedY * chartHeight;
    return { x, y, ...item };
  });

  // Construct SVG Area and Line Paths
  let linePath = '';
  let areaPath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
    areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  }

  const formatLKR = (val) => {
    return `LKR ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatShortLKR = (val) => {
    if (val >= 1000000) return `LKR ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `LKR ${(val / 1000).toFixed(0)}K`;
    return `LKR ${val}`;
  };

  return (
    <div className="revenue-chart-card" data-testid="revenue-trend-chart">
      {/* Chart Header with Timeframe Tabs */}
      <div className="chart-header">
        <div className="chart-title-group">
          <div className="chart-title-icon">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="chart-heading">Executive Sales & Revenue Velocity</h2>
            <p className="chart-sub">Gross revenue and order fulfillment trends</p>
          </div>
        </div>

        {/* Timeframe Switcher Tabs */}
        <div className="timeframe-tabs" role="tablist" aria-label="Revenue Timeframe Filter">
          <button
            role="tab"
            aria-selected={activeTimeframe === 'daily'}
            className={`timeframe-tab ${activeTimeframe === 'daily' ? 'active' : ''}`}
            onClick={() => setActiveTimeframe('daily')}
            data-testid="timeframe-tab-daily"
          >
            Daily (7D)
          </button>
          <button
            role="tab"
            aria-selected={activeTimeframe === 'weekly'}
            className={`timeframe-tab ${activeTimeframe === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTimeframe('weekly')}
            data-testid="timeframe-tab-weekly"
          >
            Weekly (4W)
          </button>
          <button
            role="tab"
            aria-selected={activeTimeframe === 'monthly'}
            className={`timeframe-tab ${activeTimeframe === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTimeframe('monthly')}
            data-testid="timeframe-tab-monthly"
          >
            Monthly (6M)
          </button>
        </div>
      </div>

      {/* Aggregate Snapshot Header */}
      <div className="chart-summary-bar">
        <div className="summary-stat">
          <span className="summary-label">Window Total</span>
          <span className="summary-value" data-testid="chart-window-total">{formatLKR(totalRevenue)}</span>
        </div>
        <div className="summary-stat">
          <span className="summary-label">Total Volume</span>
          <span className="summary-value">{totalOrders} Orders</span>
        </div>
        <div className="summary-stat">
          <span className="summary-label">Average per {activeTimeframe === 'daily' ? 'Day' : activeTimeframe === 'weekly' ? 'Week' : 'Month'}</span>
          <span className="summary-value">
            {formatLKR(series.length ? totalRevenue / series.length : 0)}
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="svg-chart-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="revenue-svg"
          preserveAspectRatio="none"
          role="img"
          aria-label="Revenue trend graph"
        >
          <defs>
            <linearGradient id="adminRevenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Guide Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * chartHeight;
            const gridVal = maxRevenue * ratio;
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="var(--admin-border, #1E293B)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="var(--admin-text-subtle, #64748B)"
                  fontSize="10"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {formatShortLKR(gridVal)}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#adminRevenueGradient)" />
          )}

          {/* Trend Stroke Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--admin-primary, #38BDF8)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points and Interaction Circles */}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIndex === idx ? 6 : 3.5}
                fill={hoveredIndex === idx ? '#FFFFFF' : 'var(--admin-primary, #38BDF8)'}
                stroke="var(--admin-card, #151D2F)"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
              {/* X Axis Label */}
              <text
                x={pt.x}
                y={height - paddingY + 16}
                textAnchor="middle"
                fill={hoveredIndex === idx ? 'var(--admin-primary, #38BDF8)' : 'var(--admin-text-muted, #94A3B8)'}
                fontSize="11"
                fontWeight={hoveredIndex === idx ? 'bold' : 'normal'}
                fontFamily="var(--font-body, sans-serif)"
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>

        {/* Hover Floating Tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="chart-tooltip"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100 - 15}%`,
            }}
          >
            <div className="tooltip-date">{points[hoveredIndex].date}</div>
            <div className="tooltip-revenue">{formatLKR(points[hoveredIndex].revenue)}</div>
            <div className="tooltip-orders">{points[hoveredIndex].orders} orders placed</div>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import './KpiCard.css';

export default function KpiCard({
  title,
  value,
  trend,
  trendLabel = 'from last month',
  icon: Icon,
  variant = 'primary', // 'primary', 'success', 'warning', 'danger', 'accent'
  dataTestId,
}) {
  const isPositive = typeof trend === 'number' ? trend > 0 : String(trend).startsWith('+');
  const isNegative = typeof trend === 'number' ? trend < 0 : String(trend).startsWith('-');
  const formattedTrend =
    typeof trend === 'number' ? (trend > 0 ? `+${trend}%` : `${trend}%`) : trend;

  return (
    <div className={`kpi-card-root kpi-variant-${variant}`} data-testid={dataTestId || 'kpi-card'}>
      <div className="kpi-card-header">
        <span className="kpi-card-title">{title}</span>
        {Icon && (
          <div className={`kpi-icon-wrapper icon-variant-${variant}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="kpi-card-value">{value}</div>

      {(trend !== undefined || trendLabel) && (
        <div className="kpi-card-footer">
          {trend !== undefined && (
            <span
              className={`kpi-trend-pill ${
                isPositive ? 'trend-positive' : isNegative ? 'trend-negative' : 'trend-neutral'
              }`}
            >
              {isPositive && <TrendingUp size={13} />}
              {isNegative && <TrendingDown size={13} />}
              {!isPositive && !isNegative && <Minus size={13} />}
              <span>{formattedTrend}</span>
            </span>
          )}
          {trendLabel && <span className="kpi-trend-label">{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

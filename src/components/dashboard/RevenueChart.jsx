import { useState } from 'react';
import { compactNumber, niceTicks } from '../../lib/chart';
import { formatDate, formatMoney } from '../../lib/format';

const WIDTH = 720;
const HEIGHT = 240;
const PAD = { top: 12, right: 8, bottom: 28, left: 48 };
const GAP = 2; // surface gap between adjacent bars

/**
 * Daily paid revenue as bars (one series, so no legend: the card title names it).
 * Hover shows the day's revenue and order count; the same numbers are in the table view.
 */
export function RevenueChart({ series }) {
  const [active, setActive] = useState(null);
  const ticks = niceTicks(Math.max(...series.map((d) => d.revenue), 0));
  const top = ticks[ticks.length - 1];
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotW / Math.max(series.length, 1);
  const barW = Math.max(slot - GAP, 1);
  const y = (v) => PAD.top + plotH - (v / top) * plotH;
  const labelEvery = Math.ceil(series.length / 6);
  const hovered = active === null ? null : series[active];

  return (
    <div className="chart">
      <div className="chart__scroll">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="chart__svg"
          role="img"
          aria-label={`Daily paid revenue, ${series.length} days`}
          onMouseLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? 'chart__baseline' : 'chart__grid'}
              />
              <text x={PAD.left - 8} y={y(t)} className="chart__tick" textAnchor="end" dy="0.32em">
                {compactNumber(t)}
              </text>
            </g>
          ))}
          {series.map((d, i) => {
            const x = PAD.left + i * slot + GAP / 2;
            const h = Math.max(plotH - (y(d.revenue) - PAD.top), 0);
            const r = Math.min(4, barW / 2, h);
            // Rounded data-end, square at the baseline.
            const path =
              h > 0
                ? `M${x},${PAD.top + plotH} V${y(d.revenue) + r} q0,-${r} ${r},-${r} H${x + barW - r} q${r},0 ${r},${r} V${PAD.top + plotH} Z`
                : '';
            return (
              <g key={d.date}>
                {path && (
                  <path
                    d={path}
                    className={`chart__bar ${active === i ? 'chart__bar--active' : ''}`}
                  />
                )}
                <rect
                  x={PAD.left + i * slot}
                  y={PAD.top}
                  width={slot}
                  height={plotH}
                  className="chart__hit"
                  onMouseEnter={() => setActive(i)}
                />
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={HEIGHT - 8} className="chart__tick" textAnchor="middle">
                    {formatDate(d.date).replace(/ \d{4}$/, '')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {hovered && (
        <div
          className="chart__tooltip"
          style={{ left: `${((PAD.left + (active + 0.5) * slot) / WIDTH) * 100}%` }}
          role="status"
        >
          <strong>{formatDate(hovered.date)}</strong>
          <span>{formatMoney(hovered.revenue)}</span>
          <span className="muted">
            {hovered.orders} paid order{hovered.orders === 1 ? '' : 's'}
          </span>
        </div>
      )}
      <details className="chart__table">
        <summary>Show as table</summary>
        <div className="table-wrap">
          <table className="table">
            <caption className="visually-hidden">Daily paid revenue</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col" className="num">
                  Paid orders
                </th>
                <th scope="col" className="num">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {series.map((d) => (
                <tr key={d.date}>
                  <td>{formatDate(d.date)}</td>
                  <td className="num">{d.orders}</td>
                  <td className="num">{formatMoney(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

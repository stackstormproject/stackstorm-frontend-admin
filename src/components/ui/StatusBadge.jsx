import { humanize } from '../../lib/format';

const TONES = {
  // orders
  payment_pending: 'warning',
  confirmed: 'info',
  processing: 'info',
  shipped: 'accent',
  delivered: 'success',
  cancelled: 'danger',
  return_requested: 'warning',
  returned: 'neutral',
  // returns
  requested: 'warning',
  approved: 'info',
  rejected: 'danger',
  completed: 'success',
  // support sessions
  pending: 'warning',
  agent_active: 'success',
  resolved: 'neutral',
  // products
  active: 'success',
  archived: 'neutral',
  // loyalty tiers
  silver: 'neutral',
  gold: 'accent',
  platinum: 'info',
};

const LABELS = {
  agent_active: 'With an agent',
  pending: 'Waiting',
};

/** Colour is never the only signal: the badge always carries the status text. */
export function StatusBadge({ status, label }) {
  const key = String(status || '').toLowerCase();
  const tone = TONES[key] || 'neutral';
  return (
    <span className={`badge ${tone === 'neutral' ? '' : `badge--${tone}`}`}>
      {label || LABELS[key] || humanize(key)}
    </span>
  );
}

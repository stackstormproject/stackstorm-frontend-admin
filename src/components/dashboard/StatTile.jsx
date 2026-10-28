import { Link } from 'react-router-dom';

/** A headline number. With `to`, the whole tile links to the list behind the number. */
export function StatTile({ label, value, hint, to, tone }) {
  const body = (
    <>
      <span className="stat__label">{label}</span>
      <span className={`stat__value ${tone ? `stat__value--${tone}` : ''}`}>{value}</span>
      {hint && <span className="stat__hint">{hint}</span>}
    </>
  );
  return to ? (
    <Link to={to} className="stat stat--link">
      {body}
    </Link>
  ) : (
    <div className="stat">{body}</div>
  );
}

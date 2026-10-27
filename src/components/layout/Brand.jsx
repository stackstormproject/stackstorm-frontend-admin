import { Link } from 'react-router-dom';

export function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <span className="brand__mark" aria-hidden="true" />
      <span>
        <span className="brand__name">Dickwella Fashion Corner</span>
        <span className="brand__sub">Operations console</span>
      </span>
    </Link>
  );
}

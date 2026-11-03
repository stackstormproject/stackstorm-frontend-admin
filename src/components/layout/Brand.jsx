import { Link } from 'react-router-dom';
import logoIcon from '../../assets/logo-icon.png';

export function Brand({ to = '/' }) {
  return (
    <Link to={to} className="brand">
      <img
        className="brand__mark"
        src={logoIcon}
        width="34"
        height="34"
        alt=""
        aria-hidden="true"
      />
      <span>
        <span className="brand__name">Dickwella Fashion Corner</span>
        <span className="brand__sub">Operations console</span>
      </span>
    </Link>
  );
}

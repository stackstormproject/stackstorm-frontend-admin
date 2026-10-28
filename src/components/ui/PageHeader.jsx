import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PageHeader({ eyebrow, title, description, actions, back }) {
  return (
    <>
      {back && (
        <Link to={back.to} className="back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <header className="page-header">
        <div>
          {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="page-header__description">{description}</p>}
        </div>
        {actions && <div className="btn-row">{actions}</div>}
      </header>
    </>
  );
}

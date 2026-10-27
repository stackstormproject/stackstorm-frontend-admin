import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { navigationFor } from '../../navigation';
import { ROLE_LABELS } from '../../lib/roles';
import { Brand } from './Brand';

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

export default function AdminLayout() {
  const { admin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const groups = navigationFor(admin.role);

  // Close the narrow-screen drawer after navigating.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  const handleSignOut = async () => {
    // Leave the guarded area first so the guard does not race the sign-out.
    navigate('/login', { replace: true });
    await signOut();
  };

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="topbar">
        <Brand />
        <button
          type="button"
          className="icon-btn"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          aria-controls="sidebar"
          onClick={() => setDrawerOpen((open) => !open)}
        >
          {drawerOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </header>

      {drawerOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <aside id="sidebar" className={`sidebar ${drawerOpen ? 'sidebar--open' : ''}`}>
        <Brand />
        <nav className="nav" aria-label="Main">
          {groups.map((group) => (
            <div key={group.heading} className="nav__group">
              <p className="nav__heading">{group.heading}</p>
              <ul className="nav__list">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink to={to} end={end} className="nav__link">
                      <Icon size={18} aria-hidden="true" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="operator">
          <span className="operator__avatar" aria-hidden="true">
            {initialsOf(admin.name)}
          </span>
          <span className="operator__text">
            <span className="operator__name">{admin.name}</span>
            <span className="operator__role">{ROLE_LABELS[admin.role] || admin.role}</span>
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Sign out"
            title="Sign out"
            onClick={handleSignOut}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <main id="main" className="main" tabIndex={-1}>
        <div className="main__inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

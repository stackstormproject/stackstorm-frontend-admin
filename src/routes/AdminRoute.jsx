import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ShieldX, LogIn, ExternalLink, RefreshCw } from 'lucide-react';
import './AdminRoute.css';

export default function AdminRoute({
  children,
  allowedRoles = ['admin', 'inventory_manager', 'inventory_staff'],
  fallback = null,
}) {
  const { user, isAuthenticated, hasRole, logout } = useAdminAuth();

  // 1. Unauthenticated -> Redirect or Login Gate
  if (!isAuthenticated || !user) {
    if (fallback) return fallback;

    return (
      <div className="admin-route-guard-container" data-testid="admin-login-guard">
        <div className="admin-guard-card">
          <div className="guard-icon-badge guard-icon-warning">
            <LogIn size={28} />
          </div>
          <h2 className="guard-title">Authentication Required</h2>
          <p className="guard-desc">
            You must be authenticated with administrative credentials to access the Dickwella Fashion Corner control room.
          </p>
          <div className="guard-actions">
            <a href="/login" className="guard-btn guard-btn-primary">
              <LogIn size={16} /> Log In to Admin Console
            </a>
            <a href="http://localhost:5173" className="guard-btn guard-btn-ghost">
              <ExternalLink size={16} /> Return to Customer Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthorized Role -> HTTP 403 Forbidden
  if (!hasRole(allowedRoles)) {
    return (
      <div className="admin-route-guard-container" data-testid="admin-403-guard">
        <div className="admin-guard-card guard-card-forbidden">
          <div className="guard-icon-badge guard-icon-danger">
            <ShieldX size={32} />
          </div>
          <div className="guard-code-badge">HTTP 403 FORBIDDEN</div>
          <h2 className="guard-title">Access Denied: Insufficient Privileges</h2>
          <p className="guard-desc">
            Your authenticated role (<strong className="user-role-highlight">{user.role || 'customer'}</strong>) does not have authorization to view this operations console.
          </p>
          <p className="guard-subtext">
            Required administrative roles: <code>{allowedRoles.join(' | ')}</code>.
          </p>
          <div className="guard-actions">
            <button
              onClick={() => logout()}
              className="guard-btn guard-btn-danger"
              data-testid="switch-user-btn"
            >
              <RefreshCw size={16} /> Switch Account / Re-login
            </button>
            <a href="http://localhost:5173" className="guard-btn guard-btn-ghost">
              <ExternalLink size={16} /> Back to Storefront
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized -> Render children
  return <>{children}</>;
}

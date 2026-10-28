import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { hasRole } from '../../lib/roles';
import { LoadingState } from '../ui/States';
import ForbiddenPage from '../../pages/ForbiddenPage';

/** Sends signed-out operators to sign in and brings them back to the page they asked for. */
export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'checking') {
    return (
      <div className="state--page state">
        <LoadingState label="Checking your session" />
      </div>
    );
  }
  if (status !== 'signedIn') {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return children;
}

/** Shows a clear "not for your role" page instead of a failing screen of 403s. */
export function RequireRole({ roles, children }) {
  const { admin } = useAuth();
  if (!hasRole(admin, roles)) return <ForbiddenPage />;
  return children;
}

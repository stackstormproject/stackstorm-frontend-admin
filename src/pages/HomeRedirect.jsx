import { Navigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { hasRole, MANAGER_ROLES } from '../lib/roles';

/** "/" sends managers to the dashboard and support agents to the support console. */
export default function HomeRedirect() {
  const { admin } = useAuth();
  return <Navigate to={hasRole(admin, MANAGER_ROLES) ? '/dashboard' : '/support'} replace />;
}

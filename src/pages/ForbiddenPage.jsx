import { Link } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { EmptyState } from '../components/ui/States';
import { ROLE_LABELS, homePathFor } from '../lib/roles';

export default function ForbiddenPage() {
  const { admin } = useAuth();
  return (
    <EmptyState
      level={1}
      title="This page is not available for your role"
      action={
        <Link to={homePathFor(admin)} className="btn btn--secondary">
          Go to your start page
        </Link>
      }
    >
      You are signed in as {ROLE_LABELS[admin?.role] || 'staff'}. Ask a super admin if you need
      access.
    </EmptyState>
  );
}

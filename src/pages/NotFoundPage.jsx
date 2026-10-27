import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/States';

export default function NotFoundPage() {
  return (
    <EmptyState
      level={1}
      title="Page not found"
      action={
        <Link to="/" className="btn btn--secondary">
          Go to start page
        </Link>
      }
    >
      The address may be mistyped, or the record was removed.
    </EmptyState>
  );
}

/** Shared loading, error and empty states so every page fails and waits the same way. */

export function LoadingState({ label = 'Loading' }) {
  return (
    <div className="state state--loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'This could not be loaded', level = 2 }) {
  const Heading = `h${level}`;
  return (
    <div className="state state--error" role="alert">
      <Heading className="state__title">{title}</Heading>
      <p>{error?.message || 'Please try again.'}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/** `level` sets the heading level: 1 when the state is the whole page (404, 403). */
export function EmptyState({ title, children, action, level = 2 }) {
  const Heading = `h${level}`;
  return (
    <div className="state state--empty">
      <Heading className="state__title">{title}</Heading>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

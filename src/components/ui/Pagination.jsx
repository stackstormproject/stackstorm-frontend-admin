/** Previous / next pager for the backend's { page, total_pages, total } pagination. */
export function Pagination({ pagination, onPageChange, noun = 'results' }) {
  if (!pagination) return null;
  const { page, total_pages: totalPages, total } = pagination;
  if (!total) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>
        Page {page} of {Math.max(totalPages, 1)} · {total} {noun}
      </span>
      <div className="btn-row">
        <button
          type="button"
          className="btn btn--secondary btn--small"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn--secondary btn--small"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

import { Link } from 'react-router-dom';
import { listReturns, RETURN_STATUSES } from '../api/returns';
import { useResource } from '../hooks/useResource';
import { useListParams } from '../hooks/useListParams';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { formatDate, humanize } from '../lib/format';

const FILTERS = [{ value: '', label: 'All' }].concat(
  RETURN_STATUSES.map((status) => ({ value: status, label: humanize(status) }))
);

export default function ReturnsPage() {
  const { filters, page, setFilters, setPage } = useListParams(['status']);
  const returns = useResource(() => listReturns({ ...filters, page }), [filters.status, page]);

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Returns and exchanges"
        description="New requests are listed first. Approve a request, then record the parcel when it arrives: an accepted return is restocked and refunded; an accepted exchange sends the new size."
      />
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Filter by status">
          {FILTERS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              className="segmented__option"
              aria-pressed={filters.status === option.value}
              onClick={() => setFilters({ status: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <section className="card card--flush" aria-label="Return requests">
        {returns.loading && <LoadingState label="Loading returns" />}
        {returns.error && <ErrorState error={returns.error} onRetry={returns.reload} />}
        {returns.data && returns.data.returns.length === 0 && (
          <EmptyState
            title={filters.status ? `No ${filters.status} returns` : 'No return requests'}
          />
        )}
        {returns.data && returns.data.returns.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Request</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Item</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.data.returns.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/returns/${item.id}`}>
                          {humanize(item.type)} #{item.id}
                        </Link>
                        <span className="cell-sub">
                          {item.order.invoice_number} · {formatDate(item.created_at)}
                        </span>
                      </td>
                      <td>
                        {item.customer.name}
                        <span className="cell-sub">{item.customer.email}</span>
                      </td>
                      <td>
                        {item.item.product_name}
                        <span className="cell-sub">
                          {item.item.size} · {item.item.color} · qty {item.item.quantity}
                          {item.exchange && ` → ${item.exchange.size} · ${item.exchange.color}`}
                        </span>
                      </td>
                      <td>{item.reason}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={returns.data.pagination}
              onPageChange={setPage}
              noun="requests"
            />
          </>
        )}
      </section>
    </>
  );
}

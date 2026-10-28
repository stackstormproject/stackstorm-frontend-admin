import { Link } from 'react-router-dom';
import { listOrders, ORDER_STATUSES } from '../api/orders';
import { useResource } from '../hooks/useResource';
import { useListParams } from '../hooks/useListParams';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchForm } from '../components/ui/SearchForm';
import { FormField } from '../components/ui/FormField';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { deliveryLabel, formatDateTime, formatMoney, humanize } from '../lib/format';

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const { filters, page, setFilters, setPage } = useListParams(['status', 'search']);
  const orders = useResource(
    () => listOrders({ ...filters, page, limit: PAGE_SIZE }),
    [filters.status, filters.search, page]
  );
  const filtered = Boolean(filters.status || filters.search);

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Orders"
        description="Newest first. Open an order to ship, deliver or cancel it."
      />
      <div className="toolbar">
        <SearchForm
          label="orders"
          placeholder="Order number, email or name"
          value={filters.search}
          onSearch={(search) => setFilters({ search })}
        />
        <FormField
          as="select"
          label="Status"
          value={filters.status}
          onChange={(event) => setFilters({ status: event.target.value })}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanize(status)}
            </option>
          ))}
        </FormField>
        {filtered && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setFilters({ status: '', search: '' })}
          >
            Clear filters
          </button>
        )}
      </div>

      <section className="card card--flush" aria-label="Order list">
        {orders.loading && <LoadingState label="Loading orders" />}
        {orders.error && <ErrorState error={orders.error} onRetry={orders.reload} />}
        {orders.data && orders.data.orders.length === 0 && (
          <EmptyState title={filtered ? 'No orders match these filters' : 'No orders yet'} />
        )}
        {orders.data && orders.data.orders.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Delivery</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Items
                    </th>
                    <th scope="col" className="num">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/orders/${order.id}`}>{order.invoice_number}</Link>
                        <span className="cell-sub">{formatDateTime(order.order_date)}</span>
                      </td>
                      <td>
                        {order.customer_name}
                        {order.is_guest && (
                          <>
                            {' '}
                            <span className="badge">Guest</span>
                          </>
                        )}
                        <span className="cell-sub">{order.customer_email}</span>
                      </td>
                      <td>
                        {deliveryLabel(order.shipping_option)}
                        {order.tracking_number && (
                          <span className="cell-sub mono">{order.tracking_number}</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="num">{order.items_count}</td>
                      <td className="num">{formatMoney(order.total_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={orders.data.pagination} onPageChange={setPage} noun="orders" />
          </>
        )}
      </section>
    </>
  );
}

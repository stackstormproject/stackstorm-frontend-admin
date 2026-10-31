import { Link, useParams } from 'react-router-dom';
import { getCustomer } from '../api/customers';
import { useResource } from '../hooks/useResource';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { formatDate, formatDateTime, formatMoney, formatNumber, humanize } from '../lib/format';

const formatAddress = (address) =>
  [address.address_line1, address.address_line2, address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(', ');

export default function CustomerDetailPage() {
  const { customerId } = useParams();
  const customer = useResource(() => getCustomer(customerId), [customerId]);

  if (customer.loading && !customer.data) return <LoadingState label="Loading the customer" />;
  if (customer.error) {
    return (
      <ErrorState
        level={1}
        title={
          customer.error.status === 404 ? 'Customer not found' : 'The customer could not be loaded'
        }
        error={customer.error}
        onRetry={customer.error.status === 404 ? undefined : customer.reload}
      />
    );
  }

  const { data } = customer;

  return (
    <>
      <PageHeader
        back={{ to: '/customers', label: 'All customers' }}
        eyebrow={`Customer since ${formatDate(data.registered_at)}`}
        title={data.name}
      />

      <div className="stats">
        <div className="stat">
          <span className="stat__label">Tier</span>
          <span className="stat__value">{humanize(data.tier)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Points</span>
          <span className="stat__value">{formatNumber(data.points)}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Paid orders</span>
          <span className="stat__value">{data.order_count}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Spent</span>
          <span className="stat__value">{formatMoney(data.total_spent)}</span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-side">
          <section className="card card--flush" aria-labelledby="orders-title">
            <div className="card__header">
              <h2 id="orders-title">Recent orders</h2>
              <Link to={`/orders?search=${encodeURIComponent(data.email)}`}>All their orders</Link>
            </div>
            {data.recent_orders.length === 0 ? (
              <EmptyState title="No orders yet" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="num">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_orders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link to={`/orders/${order.id}`}>{order.invoice_number}</Link>
                          <span className="cell-sub">{formatDate(order.order_date)}</span>
                        </td>
                        <td>
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="num">{formatMoney(order.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card card--flush" aria-labelledby="points-title">
            <div className="card__header">
              <h2 id="points-title">Points history</h2>
            </div>
            {data.loyalty_transactions.length === 0 ? (
              <EmptyState title="No points activity" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Type</th>
                      <th scope="col">Details</th>
                      <th scope="col" className="num">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.loyalty_transactions.map((entry) => (
                      <tr key={entry.id}>
                        <td className="nowrap">{formatDateTime(entry.created_at)}</td>
                        <td>{humanize(entry.transaction_type)}</td>
                        <td>
                          {entry.description || '—'}
                          {entry.admin_name && (
                            <span className="cell-sub">by {entry.admin_name}</span>
                          )}
                        </td>
                        <td className={`num ${entry.points > 0 ? 'delta--up' : 'delta--down'}`}>
                          {entry.points > 0
                            ? `+${formatNumber(entry.points)}`
                            : formatNumber(entry.points)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="detail-side">
          <section className="card" aria-labelledby="contact-title">
            <h2 id="contact-title" className="card__title">
              Contact
            </h2>
            <dl className="details">
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${data.email}`}>{data.email}</a>
              </dd>
              <dt>Phone</dt>
              <dd>{data.phone ? <a href={`tel:${data.phone}`}>{data.phone}</a> : '—'}</dd>
              <dt>Last order</dt>
              <dd>{formatDate(data.last_order_at)}</dd>
            </dl>
          </section>
          <section className="card" aria-labelledby="addresses-title">
            <h2 id="addresses-title" className="card__title">
              Addresses
            </h2>
            {data.addresses.length === 0 ? (
              <p className="muted">No saved addresses.</p>
            ) : (
              <ul className="plain-list">
                {data.addresses.map((address) => (
                  <li key={address.id}>
                    {formatAddress(address)}
                    {address.is_default && <span className="badge badge--info">Default</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

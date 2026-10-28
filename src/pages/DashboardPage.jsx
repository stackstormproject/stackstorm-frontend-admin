import { Link, useSearchParams } from 'react-router-dom';
import { getOverview, getSalesTrend } from '../api/analytics';
import { useResource } from '../hooks/useResource';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { StatusBadge } from '../components/ui/StatusBadge';
import { StatTile } from '../components/dashboard/StatTile';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { formatDate, formatMoney, formatMoneyWhole, formatNumber } from '../lib/format';

const RANGES = [7, 30, 90];

function SalesTrend() {
  const [params, setParams] = useSearchParams();
  const days = RANGES.includes(Number(params.get('days'))) ? Number(params.get('days')) : 30;
  const trend = useResource(() => getSalesTrend(days), [days]);

  const pickRange = (value) => {
    const next = new URLSearchParams(params);
    next.set('days', String(value));
    setParams(next, { replace: true });
  };

  return (
    <section className="card" aria-labelledby="trend-title">
      <div className="card__header">
        <div>
          <h2 id="trend-title">Paid revenue per day</h2>
          {trend.data && (
            <p className="muted">
              {formatMoney(trend.data.totals.revenue)} from {trend.data.totals.orders} paid orders
              in the last {days} days
            </p>
          )}
        </div>
        <div className="segmented" role="group" aria-label="Date range">
          {RANGES.map((value) => (
            <button
              key={value}
              type="button"
              className="segmented__option"
              aria-pressed={days === value}
              onClick={() => pickRange(value)}
            >
              {value} days
            </button>
          ))}
        </div>
      </div>
      {trend.loading && <LoadingState label="Loading sales" />}
      {trend.error && <ErrorState error={trend.error} onRetry={trend.reload} />}
      {trend.data && <RevenueChart series={trend.data.series} />}
    </section>
  );
}

export default function DashboardPage() {
  const overview = useResource(getOverview, []);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Revenue counts paid orders only (confirmed, processing, shipped, delivered). Unpaid and cancelled orders are excluded."
      />
      {overview.loading && <LoadingState label="Loading the dashboard" />}
      {overview.error && <ErrorState error={overview.error} onRetry={overview.reload} />}
      {overview.data && <Overview data={overview.data} />}
    </>
  );
}

function Overview({ data }) {
  const { metrics, top_products: topProducts, recent_orders: recentOrders } = data;
  return (
    <>
      <section className="stats" aria-label="Key figures">
        <StatTile label="Revenue (paid)" value={formatMoneyWhole(metrics.total_revenue)} />
        <StatTile label="Paid orders" value={formatNumber(metrics.paid_orders)} to="/orders" />
        <StatTile label="Average order" value={formatMoneyWhole(metrics.average_order_value)} />
        <StatTile
          label="Active customers"
          value={formatNumber(metrics.active_customers)}
          to="/customers"
        />
      </section>

      <h2 className="section-title">Needs attention</h2>
      <div className="stats stats--attention">
        <StatTile
          label="Awaiting payment"
          value={formatNumber(metrics.awaiting_payment)}
          hint="Unpaid holds expire after 15 minutes"
          to="/orders?status=payment_pending"
        />
        <StatTile
          label="Open returns"
          value={formatNumber(metrics.open_returns)}
          hint={`Return rate ${metrics.return_rate_percentage}% of paid orders`}
          to="/returns"
          tone={metrics.open_returns > 0 ? 'warning' : undefined}
        />
        <StatTile
          label="Low-stock variants"
          value={formatNumber(metrics.low_stock_count)}
          hint={`${metrics.low_stock_threshold} or fewer available`}
          to="/inventory?low=true"
          tone={metrics.low_stock_count > 0 ? 'warning' : undefined}
        />
        <StatTile
          label="Support queue"
          value={formatNumber(metrics.support_queue_count)}
          hint="Customers waiting for an agent"
          to="/support"
          tone={metrics.support_queue_count > 0 ? 'warning' : undefined}
        />
      </div>

      <SalesTrend />

      <div className="dashboard-grid">
        <section className="card card--flush" aria-labelledby="recent-title">
          <div className="card__header">
            <h2 id="recent-title">Recent orders</h2>
            <Link to="/orders">All orders</Link>
          </div>
          {recentOrders.length === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/orders/${order.id}`}>{order.invoice_number}</Link>
                        <span className="cell-sub">{formatDate(order.order_date)}</span>
                      </td>
                      <td>{order.customer_name}</td>
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

        <section className="card card--flush" aria-labelledby="top-title">
          <div className="card__header">
            <h2 id="top-title">Best sellers</h2>
          </div>
          {topProducts.length === 0 ? (
            <EmptyState title="No paid sales yet" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col" className="num">
                      Units
                    </th>
                    <th scope="col" className="num">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product) => (
                    <tr key={product.product_id}>
                      <td>
                        <Link to={`/products/${product.product_id}`}>{product.title}</Link>
                      </td>
                      <td className="num">{formatNumber(product.units_sold)}</td>
                      <td className="num">{formatMoney(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

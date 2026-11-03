import { Link } from 'react-router-dom';
import { listCustomers } from '../api/customers';
import { useResource } from '../hooks/useResource';
import { useListParams } from '../hooks/useListParams';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchForm } from '../components/ui/SearchForm';
import { FormField } from '../components/ui/FormField';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { formatDate, formatMoney, formatNumber } from '../lib/format';

export const TIERS = ['silver', 'gold', 'platinum'];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'spend', label: 'Highest spend' },
  { value: 'orders', label: 'Most orders' },
  { value: 'name', label: 'Name A-Z' },
];

export default function CustomersPage() {
  const { filters, page, setFilters, setPage } = useListParams(['search', 'tier', 'sort']);
  const customers = useResource(
    () => listCustomers({ ...filters, page }),
    [filters.search, filters.tier, filters.sort, page]
  );

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="Customers"
        description="Registered shoppers with their loyalty tier, points and paid spend. Guest checkouts are not listed."
      />
      <div className="toolbar">
        <SearchForm
          label="customers"
          placeholder="Name, email or phone"
          value={filters.search}
          onSearch={(search) => setFilters({ search })}
        />
        <FormField
          as="select"
          label="Tier"
          value={filters.tier}
          onChange={(event) => setFilters({ tier: event.target.value })}
        >
          <option value="">All tiers</option>
          {TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </option>
          ))}
        </FormField>
        <FormField
          as="select"
          label="Sort"
          value={filters.sort || 'newest'}
          onChange={(event) =>
            setFilters({ sort: event.target.value === 'newest' ? '' : event.target.value })
          }
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </FormField>
      </div>

      <section className="card card--flush" aria-label="Customer list">
        {customers.loading && <LoadingState label="Loading customers" />}
        {customers.error && <ErrorState error={customers.error} onRetry={customers.reload} />}
        {customers.data && customers.data.customers.length === 0 && (
          <EmptyState title="No customers found" />
        )}
        {customers.data && customers.data.customers.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Customer</th>
                    <th scope="col">Tier</th>
                    <th scope="col" className="num">
                      Points
                    </th>
                    <th scope="col" className="num">
                      Paid orders
                    </th>
                    <th scope="col" className="num">
                      Spent
                    </th>
                    <th scope="col">Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.data.customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <Link to={`/customers/${customer.id}`}>{customer.name}</Link>
                        <span className="cell-sub">{customer.email}</span>
                      </td>
                      <td>
                        <StatusBadge status={customer.tier} />
                      </td>
                      <td className="num">{formatNumber(customer.points)}</td>
                      <td className="num">{customer.order_count}</td>
                      <td className="num">{formatMoney(customer.total_spent)}</td>
                      <td className="nowrap">{formatDate(customer.last_order_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={customers.data.pagination}
              onPageChange={setPage}
              noun="customers"
            />
          </>
        )}
      </section>
    </>
  );
}

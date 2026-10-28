import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { listCategories, listProducts } from '../api/products';
import { useResource } from '../hooks/useResource';
import { useListParams } from '../hooks/useListParams';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchForm } from '../components/ui/SearchForm';
import { FormField } from '../components/ui/FormField';
import { Pagination } from '../components/ui/Pagination';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { categoryGroups } from '../lib/productForm';
import { formatMoney } from '../lib/format';

export default function ProductsPage() {
  const { filters, page, setFilters, setPage } = useListParams(['status', 'search', 'category_id']);
  const status = filters.status === 'archived' ? 'archived' : 'active';
  const products = useResource(
    () => listProducts({ ...filters, status, page }),
    [status, filters.search, filters.category_id, page]
  );
  const categories = useResource(listCategories, []);

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Archived products are hidden from the shop but keep their order history."
        actions={
          <Link to="/products/new" className="btn btn--primary">
            <Plus size={16} aria-hidden="true" />
            New product
          </Link>
        }
      />
      <div className="toolbar">
        <div className="segmented" role="group" aria-label="Show">
          {['active', 'archived'].map((value) => (
            <button
              key={value}
              type="button"
              className="segmented__option"
              aria-pressed={status === value}
              onClick={() => setFilters({ status: value === 'active' ? '' : value })}
            >
              {value === 'active' ? 'In the shop' : 'Archived'}
            </button>
          ))}
        </div>
        <SearchForm
          label="products"
          placeholder="Name or brand"
          value={filters.search}
          onSearch={(search) => setFilters({ search })}
        />
        <FormField
          as="select"
          label="Category"
          value={filters.category_id}
          onChange={(event) => setFilters({ category_id: event.target.value })}
        >
          <option value="">All categories</option>
          {categoryGroups(categories.data || []).map((group) => (
            <optgroup key={group.id} label={group.name}>
              {group.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </FormField>
      </div>

      <section className="card card--flush" aria-label="Product list">
        {products.loading && <LoadingState label="Loading products" />}
        {products.error && <ErrorState error={products.error} onRetry={products.reload} />}
        {products.data && products.data.products.length === 0 && (
          <EmptyState
            title={status === 'archived' ? 'No archived products' : 'No products found'}
          />
        )}
        {products.data && products.data.products.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="num">
                      Price
                    </th>
                    <th scope="col" className="num">
                      Sizes
                    </th>
                    <th scope="col" className="num">
                      Available
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.data.products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="line-item">
                          {product.primary_image ? (
                            <img src={product.primary_image} alt="" className="line-item__image" />
                          ) : (
                            <span className="line-item__image" aria-hidden="true" />
                          )}
                          <span>
                            <Link to={`/products/${product.id}`}>{product.name}</Link>
                            {product.brand && <span className="cell-sub">{product.brand}</span>}
                          </span>
                        </div>
                      </td>
                      <td>{product.category_name || '—'}</td>
                      <td className="num">{formatMoney(product.price)}</td>
                      <td className="num">{product.variants.length}</td>
                      <td className="num">
                        {product.total_available === 0 ? (
                          <span className="badge badge--danger">Sold out</span>
                        ) : (
                          product.total_available
                        )}
                      </td>
                      <td>
                        <StatusBadge status={product.is_active ? 'active' : 'archived'} />
                        {product.is_final_sale && <span className="cell-sub">Final sale</span>}
                        {(product.is_new_arrival || product.is_popular) && (
                          <span className="cell-sub">
                            {[
                              product.is_new_arrival && 'New arrivals',
                              product.is_popular && 'Popular',
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={products.data.pagination}
              onPageChange={setPage}
              noun="products"
            />
          </>
        )}
      </section>
    </>
  );
}

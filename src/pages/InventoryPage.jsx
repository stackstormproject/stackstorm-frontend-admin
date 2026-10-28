import { useState } from 'react';
import { Link } from 'react-router-dom';
import { listInventory } from '../api/inventory';
import { useResource } from '../hooks/useResource';
import { useListParams } from '../hooks/useListParams';
import { useToast } from '../state/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchForm } from '../components/ui/SearchForm';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { AdjustStockDialog } from '../components/inventory/AdjustStockDialog';
import { StockHistoryDialog } from '../components/inventory/StockHistoryDialog';

const PAGE_SIZE = 25;

export default function InventoryPage() {
  const { filters, page, setFilters, setPage } = useListParams(['search', 'low']);
  const lowOnly = filters.low === 'true';
  const inventory = useResource(
    () =>
      listInventory({ search: filters.search, low: lowOnly || undefined, page, limit: PAGE_SIZE }),
    [filters.search, lowOnly, page]
  );
  const [adjusting, setAdjusting] = useState(null);
  const [history, setHistory] = useState(null);
  const toast = useToast();
  const threshold = inventory.data?.low_stock_threshold;

  const handleAdjusted = (updated, delta) => {
    setAdjusting(null);
    inventory.setData((data) => ({
      ...data,
      items: data.items.map((item) => (item.variant_id === updated.variant_id ? updated : item)),
    }));
    toast.success(
      `${updated.sku}: ${delta > 0 ? `added ${delta}` : `removed ${-delta}`}, ${updated.stock_quantity} on hand`
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Stock"
        description={`Available = on hand minus units held in active checkouts (15-minute holds).${
          threshold !== undefined ? ` Low stock means ${threshold} or fewer available.` : ''
        }`}
      />
      <div className="toolbar">
        <SearchForm
          label="stock"
          placeholder="Product name or SKU"
          value={filters.search}
          onSearch={(search) => setFilters({ search })}
        />
        <label className="checkbox">
          <input
            type="checkbox"
            checked={lowOnly}
            onChange={(event) => setFilters({ low: event.target.checked ? 'true' : '' })}
          />
          Low stock only
        </label>
      </div>

      <section className="card card--flush" aria-label="Stock list">
        {inventory.loading && <LoadingState label="Loading stock" />}
        {inventory.error && <ErrorState error={inventory.error} onRetry={inventory.reload} />}
        {inventory.data && inventory.data.items.length === 0 && (
          <EmptyState title={lowOnly ? 'Nothing is low on stock' : 'No sizes match'} />
        )}
        {inventory.data && inventory.data.items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Size</th>
                    <th scope="col" className="num">
                      On hand
                    </th>
                    <th scope="col" className="num">
                      Held
                    </th>
                    <th scope="col" className="num">
                      Available
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.data.items.map((item) => (
                    <tr key={item.variant_id}>
                      <td>
                        <Link to={`/products/${item.product_id}`}>{item.product_name}</Link>
                        <span className="cell-sub mono">{item.sku}</span>
                      </td>
                      <td className="nowrap">
                        {item.size}
                        {item.color ? ` · ${item.color}` : ''}
                      </td>
                      <td className="num">{item.stock_quantity}</td>
                      <td className="num">{item.reserved_quantity}</td>
                      <td className="num">
                        {item.is_low ? (
                          <span
                            className={`badge ${item.available === 0 ? 'badge--danger' : 'badge--warning'}`}
                          >
                            {item.available === 0 ? 'Out' : `Low: ${item.available}`}
                          </span>
                        ) : (
                          item.available
                        )}
                      </td>
                      <td>
                        <div className="btn-row btn-row--end">
                          <button
                            type="button"
                            className="btn btn--secondary btn--small"
                            aria-label={`Adjust stock for ${item.sku}`}
                            onClick={() => setAdjusting(item)}
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            aria-label={`Stock history for ${item.sku}`}
                            onClick={() => setHistory(item)}
                          >
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              pagination={inventory.data.pagination}
              onPageChange={setPage}
              noun="sizes"
            />
          </>
        )}
      </section>

      {adjusting && (
        <AdjustStockDialog
          item={adjusting}
          onClose={() => setAdjusting(null)}
          onAdjusted={handleAdjusted}
        />
      )}
      {history && <StockHistoryDialog item={history} onClose={() => setHistory(null)} />}
    </>
  );
}

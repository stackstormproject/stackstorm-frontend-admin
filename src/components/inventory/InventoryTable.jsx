import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Package,
  Search,
  Filter,
  AlertTriangle,
  SlidersHorizontal,
  Plus,
  RefreshCw,
} from 'lucide-react';
import LowStockBadge from './LowStockBadge';
import './InventoryTable.css';

export default function InventoryTable({
  products = [],
  onAdjustStock,
  lowStockOnly = false,
  onToggleLowStockOnly,
}) {
  const [expandedProductIds, setExpandedProductIds] = useState(() => {
    // Default expand all products initially for convenient auditing
    return products.map((p) => p.id);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const toggleExpand = (productId) => {
    setExpandedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const expandAll = () => setExpandedProductIds(products.map((p) => p.id));
  const collapseAll = () => setExpandedProductIds([]);

  // Extract distinct categories
  const categories = [
    'all',
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];

  // Filtering Logic
  const filteredProducts = products
    .map((product) => {
      const variants = product.variants || [];

      // Filter variants
      const matchingVariants = variants.filter((v) => {
        const available = Math.max(0, (v.stock_quantity || 0) - (v.reserved_quantity || 0));
        const passesLowStock = !lowStockOnly || available < 5;
        const matchesSearch =
          (product.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.color || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (v.size || '').toLowerCase().includes(searchQuery.toLowerCase());

        return passesLowStock && matchesSearch;
      });

      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;

      if (!matchesCategory) return null;
      if (matchingVariants.length === 0 && (searchQuery || lowStockOnly)) return null;

      return {
        ...product,
        displayVariants: matchingVariants,
      };
    })
    .filter(Boolean);

  return (
    <div className="inventory-matrix-card" data-testid="inventory-matrix-table">
      {/* Header and Filter Controls */}
      <div className="matrix-toolbar">
        <div className="matrix-search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search garment title, SKU code, variant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="matrix-search-input"
            aria-label="Search Inventory Matrix"
            data-testid="inventory-search-input"
          />
        </div>

        <div className="matrix-controls-right">
          {/* Category Filter */}
          <div className="category-select-wrapper">
            <Filter size={14} style={{ color: 'var(--admin-text-subtle)' }} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
              aria-label="Filter by Category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Garment Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Toggle Pill */}
          <button
            type="button"
            className={`low-stock-toggle-btn ${lowStockOnly ? 'active' : ''}`}
            onClick={onToggleLowStockOnly}
            data-testid="toggle-low-stock-filter"
            title="Filter SKUs with available stock < 5"
          >
            <AlertTriangle size={14} />
            <span>Low-Stock Alerts Only (&lt; 5)</span>
          </button>

          {/* Expand/Collapse All */}
          <div className="expand-buttons">
            <button
              type="button"
              onClick={expandAll}
              className="text-toggle-btn"
              title="Expand all products"
            >
              Expand All
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-toggle-btn"
              title="Collapse all products"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* Main Hierarchical Products & SKU Variants Table */}
      <div className="table-responsive-wrapper">
        <table className="inventory-matrix-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}></th>
              <th>Garment / SKU Variant</th>
              <th>Color & Attributes</th>
              <th>Size</th>
              <th style={{ textAlign: 'center' }}>Physical On-Hand</th>
              <th style={{ textAlign: 'center' }}>15-Min Reserved</th>
              <th style={{ textAlign: 'center' }}>Available to Sell</th>
              <th>Restock Status</th>
              <th style={{ textAlign: 'right' }}>Warehouse Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-matrix-cell">
                  No garment SKU variants match the selected filters.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const isExpanded = expandedProductIds.includes(product.id);
                const variants = product.displayVariants || product.variants || [];
                const totalOnHand = variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
                const totalReserved = variants.reduce(
                  (sum, v) => sum + (v.reserved_quantity || 0),
                  0
                );
                const totalAvailable = Math.max(0, totalOnHand - totalReserved);
                const hasLowStockVariant = variants.some((v) => {
                  const avail = Math.max(0, (v.stock_quantity || 0) - (v.reserved_quantity || 0));
                  return avail < 5;
                });

                return (
                  <React.Fragment key={product.id}>
                    {/* Parent Garment Row */}
                    <tr
                      className={`product-group-row ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleExpand(product.id)}
                      data-testid={`product-row-${product.id}`}
                    >
                      <td className="expand-chevron-cell">
                        <button
                          type="button"
                          className="chevron-btn"
                          aria-label={isExpanded ? 'Collapse variants' : 'Expand variants'}
                        >
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                      <td className="product-summary-cell" colSpan="3">
                        <div className="product-identity">
                          {product.thumbnail ? (
                            <img
                              src={product.thumbnail}
                              alt={product.title}
                              className="garment-thumb"
                            />
                          ) : (
                            <div className="garment-thumb-fallback">
                              <Package size={16} />
                            </div>
                          )}
                          <div>
                            <span className="product-title-text">{product.title}</span>
                            <div className="product-meta-sub">
                              <span className="category-pill">{product.category}</span>
                              <span className="sku-prefix-pill">{product.sku_prefix}</span>
                              <span className="variant-count-pill">
                                {variants.length} SKU{' '}
                                {variants.length === 1 ? 'Variant' : 'Variants'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center font-mono font-bold">{totalOnHand}</td>
                      <td className="text-center font-mono text-muted">{totalReserved}</td>
                      <td className="text-center font-mono font-bold text-highlight">
                        {totalAvailable}
                      </td>
                      <td>
                        {hasLowStockVariant ? (
                          <span className="group-alert-pill">
                            <AlertTriangle size={12} /> Low Stock Detected
                          </span>
                        ) : (
                          <span className="group-ok-pill">Adequate Stock</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="click-to-toggle-hint">
                          {isExpanded ? 'Click to Collapse' : 'Click to View SKUs'}
                        </span>
                      </td>
                    </tr>

                    {/* Child SKU Variant Rows */}
                    {isExpanded &&
                      variants.map((variant) => {
                        const onHand = Number(variant.stock_quantity || 0);
                        const reserved = Number(variant.reserved_quantity || 0);
                        const available = Math.max(0, onHand - reserved);

                        return (
                          <tr
                            key={variant.id || variant.sku}
                            className={`variant-child-row ${available < 5 ? 'row-low-stock' : ''}`}
                            data-testid={`variant-row-${variant.sku}`}
                          >
                            <td className="tree-indent-cell">
                              <div className="tree-branch-line"></div>
                            </td>
                            <td className="sku-code-cell">
                              <span className="sku-code" data-testid={`sku-${variant.sku}`}>
                                {variant.sku}
                              </span>
                            </td>
                            <td>
                              <span className="variant-color-badge">{variant.color}</span>
                            </td>
                            <td>
                              <span className="variant-size-badge">{variant.size}</span>
                            </td>
                            <td
                              className="text-center font-mono"
                              data-testid={`onhand-${variant.sku}`}
                            >
                              {onHand}
                            </td>
                            <td
                              className="text-center font-mono text-muted"
                              data-testid={`reserved-${variant.sku}`}
                            >
                              {reserved}
                            </td>
                            <td
                              className={`text-center font-mono font-bold ${
                                available < 5 ? 'text-danger' : 'text-success'
                              }`}
                              data-testid={`available-${variant.sku}`}
                            >
                              {available}
                            </td>
                            <td>
                              <LowStockBadge availableStock={available} />
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="adjust-stock-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onAdjustStock) onAdjustStock(product, variant);
                                }}
                                data-testid={`adjust-stock-btn-${variant.sku}`}
                                title={`Adjust physical stock for ${variant.sku}`}
                              >
                                <SlidersHorizontal size={13} />
                                <span>Adjust Stock</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

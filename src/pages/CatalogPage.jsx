import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  Shirt,
  Tag,
  Boxes,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  adminProductsApi,
  FALLBACK_PRODUCTS,
  FALLBACK_CATEGORIES,
} from '../api/adminProducts.api';
import ProductModal from '../components/catalog/ProductModal';
import DeleteConfirmModal from '../components/catalog/DeleteConfirmModal';
import './CatalogPage.css';

export default function CatalogPage() {
  const [products, setProducts] = useState(FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load products & categories
  const fetchCatalogData = async () => {
    setIsLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        adminProductsApi.getProducts(),
        adminProductsApi.getCategories(),
      ]);
      if (Array.isArray(prods) && prods.length > 0) {
        setProducts(prods);
      }
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    } catch {
      // Fallback already seeded
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (product) => {
    setDeletingProduct(product);
    setIsDeleteModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveProduct = async (payload, existingId) => {
    if (existingId) {
      // Update
      const updated = await adminProductsApi.updateProduct(existingId, payload);
      setProducts((prev) =>
        prev.map((p) => (p.id === existingId ? { ...p, ...payload, ...updated } : p))
      );
      showToast(`Garment "${payload.name}" updated successfully in catalog.`);
    } else {
      // Create
      const created = await adminProductsApi.createProduct(payload);
      const newProduct = {
        id: created?.id || Date.now(),
        ...payload,
        variants: payload.variants || [],
      };
      setProducts((prev) => [newProduct, ...prev]);
      showToast(`New garment "${payload.name}" published to storefront catalog!`);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async (id) => {
    setIsDeleting(true);
    try {
      await adminProductsApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setIsDeleteModalOpen(false);
      setDeletingProduct(null);
      showToast(`Product removed from catalog.`);
    } catch (err) {
      showToast(`Error removing product: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Category filter
      if (selectedCategory !== 'All') {
        const prodCat = (prod.category?.name || prod.category || '').toLowerCase();
        if (prodCat !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (prod.name || '').toLowerCase().includes(q);
        const brandMatch = (prod.brand || '').toLowerCase().includes(q);
        const descMatch = (prod.description || '').toLowerCase().includes(q);
        const materialMatch = (prod.material || '').toLowerCase().includes(q);
        const skuMatch = (prod.variants || []).some((v) =>
          (v.sku || '').toLowerCase().includes(q)
        );
        return nameMatch || brandMatch || descMatch || materialMatch || skuMatch;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Aggregate Metrics
  const totalGarments = products.length;
  let totalVariantsCount = 0;
  let totalStockCount = 0;
  let totalPriceSum = 0;

  products.forEach((p) => {
    totalPriceSum += Number(p.price || 0);
    const variants = p.variants || [];
    totalVariantsCount += variants.length;
    variants.forEach((v) => {
      totalStockCount += Number(v.stockQuantity ?? v.stock_quantity ?? 0);
    });
  });

  const avgPrice = totalGarments > 0 ? (totalPriceSum / totalGarments).toFixed(2) : '0.00';

  return (
    <div className="catalog-page-container" data-testid="catalog-page">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="catalog-toast" role="alert" data-testid="catalog-toast">
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="catalog-header">
        <div>
          <div className="catalog-kicker">
            <span className="catalog-kicker-badge">Storefront Collection Engine</span>
            <span className="catalog-kicker-tag">Dickwella Atelier Artisanal Catalog</span>
          </div>
          <h1 className="catalog-title">Product Catalog & Garment Management</h1>
          <p className="catalog-subtitle">
            Configure apparel specifications, manage multi-variant SKUs, and publish new artisanal designs to the online store.
          </p>
        </div>

        <div className="catalog-header-actions">
          <button
            type="button"
            className="catalog-sync-btn"
            onClick={fetchCatalogData}
            disabled={isLoading}
            title="Refresh product catalog from API"
            data-testid="sync-catalog-btn"
          >
            <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync Catalog'}</span>
          </button>

          <button
            type="button"
            className="catalog-add-btn"
            onClick={handleOpenAddModal}
            data-testid="add-new-product-btn"
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="catalog-kpi-grid">
        <div className="catalog-kpi-card">
          <div className="cat-kpi-header">
            <span className="cat-kpi-label">Active Garments</span>
            <div className="cat-kpi-icon icon-primary">
              <Shirt size={18} />
            </div>
          </div>
          <div className="cat-kpi-val" data-testid="kpi-total-garments">
            {totalGarments} Styles
          </div>
          <span className="cat-kpi-sub">Published to customer store</span>
        </div>

        <div className="catalog-kpi-card">
          <div className="cat-kpi-header">
            <span className="cat-kpi-label">Monitored SKUs</span>
            <div className="cat-kpi-icon icon-info">
              <Boxes size={18} />
            </div>
          </div>
          <div className="cat-kpi-val text-info" data-testid="kpi-total-skus">
            {totalVariantsCount} SKUs
          </div>
          <span className="cat-kpi-sub">Total {totalStockCount} physical units</span>
        </div>

        <div className="catalog-kpi-card">
          <div className="cat-kpi-header">
            <span className="cat-kpi-label">Categories Curated</span>
            <div className="cat-kpi-icon icon-accent">
              <Tag size={18} />
            </div>
          </div>
          <div className="cat-kpi-val text-accent" data-testid="kpi-categories">
            {categories.length} Categories
          </div>
          <span className="cat-kpi-sub">Handloom, Batik, Silk & Linen</span>
        </div>

        <div className="catalog-kpi-card">
          <div className="cat-kpi-header">
            <span className="cat-kpi-label">Average Garment Price</span>
            <div className="cat-kpi-icon icon-success">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="cat-kpi-val text-success" data-testid="kpi-avg-price">
            LKR {Number(avgPrice).toLocaleString()}
          </div>
          <span className="cat-kpi-sub">Dickwella premium heritage line</span>
        </div>
      </div>

      {/* Control Bar: Search, Category Filter, View Mode */}
      <div className="catalog-controls-bar">
        {/* Search Input */}
        <div className="catalog-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by garment title, brand, material, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="catalog-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              &times;
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="category-filter-pills" role="tablist" aria-label="Category Filter">
          <button
            type="button"
            className={`cat-pill ${selectedCategory === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('All')}
          >
            All Items ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => {
              const catName = p.category?.name || p.category || '';
              return catName.toLowerCase() === cat.name.toLowerCase();
            }).length;

            return (
              <button
                key={cat.id || cat.name}
                type="button"
                className={`cat-pill ${selectedCategory === cat.name ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* View Toggle */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
            aria-label="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="Table View"
            aria-label="Table View"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Catalog Display */}
      {filteredProducts.length === 0 ? (
        <div className="catalog-empty-state">
          <Shirt size={48} className="empty-icon" />
          <h3>No Garments Found</h3>
          <p>
            {searchQuery
              ? `No products match your search query "${searchQuery}".`
              : `No apparel products registered under category "${selectedCategory}".`}
          </p>
          <button
            type="button"
            className="catalog-add-btn"
            onClick={handleOpenAddModal}
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="products-grid">
          {filteredProducts.map((product) => {
            const variants = product.variants || [];
            const totalStock = variants.reduce(
              (acc, v) => acc + Number(v.stockQuantity ?? v.stock_quantity ?? 0),
              0
            );

            return (
              <div
                key={product.id}
                className="product-card"
                data-testid={`product-card-${product.id}`}
              >
                <div className="product-card-media">
                  <img
                    src={
                      product.primaryImage ||
                      product.primary_image ||
                      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80'
                    }
                    alt={product.name}
                    className="product-card-img"
                    onError={(e) => {
                      e.target.src =
                        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80';
                    }}
                  />
                  <div className="card-top-badges">
                    <span className="card-category-badge">
                      {product.category?.name || product.category || 'Apparel'}
                    </span>
                    {(product.isFinalSale ?? product.is_final_sale) && (
                      <span className="card-finalsale-badge">Final Sale</span>
                    )}
                  </div>
                </div>

                <div className="product-card-body">
                  <div className="card-brand-tag">
                    {product.brand || 'Dickwella Atelier'}
                  </div>
                  <h3 className="card-product-title" title={product.name}>
                    {product.name}
                  </h3>

                  <div className="card-price-row">
                    <span className="card-currency">LKR</span>
                    <span className="card-price-value">
                      {Number(product.price || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {product.material && (
                    <div className="card-material-line">
                      <span>Fabric: {product.material}</span>
                    </div>
                  )}

                  {/* Variants Summary */}
                  <div className="card-variants-summary">
                    <div className="variant-pill-tag">
                      <Layers size={12} />
                      <span>{variants.length} SKU Variant{variants.length > 1 ? 's' : ''}</span>
                    </div>
                    <div
                      className={`stock-badge ${
                        totalStock > 10 ? 'in-stock' : totalStock > 0 ? 'low-stock' : 'out-of-stock'
                      }`}
                    >
                      {totalStock > 0 ? `${totalStock} in stock` : 'Out of Stock'}
                    </div>
                  </div>

                  {/* Variant SKU chips preview */}
                  {variants.length > 0 && (
                    <div className="card-sku-chips">
                      {variants.slice(0, 3).map((v, i) => (
                        <span key={i} className="sku-chip" title={`${v.size} / ${v.color}`}>
                          {v.size || 'OS'}: {v.sku}
                        </span>
                      ))}
                      {variants.length > 3 && (
                        <span className="sku-chip-more">+{variants.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="product-card-footer">
                  <button
                    type="button"
                    className="card-action-btn edit-btn"
                    onClick={() => handleOpenEditModal(product)}
                    data-testid={`edit-product-${product.id}`}
                  >
                    <Edit2 size={14} />
                    <span>Edit Specs</span>
                  </button>
                  <button
                    type="button"
                    className="card-action-btn delete-btn"
                    onClick={() => handleOpenDeleteModal(product)}
                    data-testid={`delete-product-${product.id}`}
                    title="Delete Product"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* High-Density Table View */
        <div className="catalog-table-wrapper">
          <table className="catalog-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Thumbnail</th>
                <th>Garment Name & Atelier</th>
                <th>Category</th>
                <th>Price (LKR)</th>
                <th>Fabric / Material</th>
                <th>Variants (SKUs)</th>
                <th>Stock Status</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const variants = product.variants || [];
                const totalStock = variants.reduce(
                  (acc, v) => acc + Number(v.stockQuantity ?? v.stock_quantity ?? 0),
                  0
                );

                return (
                  <tr key={product.id}>
                    <td>
                      <img
                        src={
                          product.primaryImage ||
                          product.primary_image ||
                          'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=100&q=80'
                        }
                        alt=""
                        className="table-img-thumbnail"
                      />
                    </td>
                    <td>
                      <div className="table-product-info">
                        <span className="table-prod-name">{product.name}</span>
                        <span className="table-prod-brand">
                          {product.brand || 'Dickwella Atelier'} • {product.slug || ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="table-cat-badge">
                        {product.category?.name || product.category || 'Apparel'}
                      </span>
                    </td>
                    <td>
                      <span className="table-price">
                        LKR {Number(product.price || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="table-material">{product.material || 'Handloom'}</span>
                    </td>
                    <td>
                      <div className="table-variants-cell">
                        <span>{variants.length} SKUs</span>
                        <span className="table-variant-sub">
                          {variants.map((v) => v.size || 'OS').slice(0, 3).join(', ')}
                          {variants.length > 3 ? '...' : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`table-stock-badge ${
                          totalStock > 10 ? 'in-stock' : totalStock > 0 ? 'low-stock' : 'out-of-stock'
                        }`}
                      >
                        {totalStock} units
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <button
                          type="button"
                          className="table-action-btn edit"
                          onClick={() => handleOpenEditModal(product)}
                          title="Edit Product"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-action-btn delete"
                          onClick={() => handleOpenDeleteModal(product)}
                          title="Delete Product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={handleSaveProduct}
        product={editingProduct}
        categories={categories}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        product={deletingProduct}
        isDeleting={isDeleting}
      />
    </div>
  );
}

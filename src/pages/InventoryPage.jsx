import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Boxes, Clock, RefreshCw, Sparkles, Layers } from 'lucide-react';
import InventoryTable from '../components/inventory/InventoryTable';
import StockAdjustmentModal from '../components/inventory/StockAdjustmentModal';
import { inventoryApi, FALLBACK_INVENTORY } from '../api/inventory.api';
import './InventoryPage.css';

export default function InventoryPage() {
  const [products, setProducts] = useState(FALLBACK_INVENTORY);
  const [isLoading, setIsLoading] = useState(false);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Stock Adjustment Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const data = await inventoryApi.getProducts();
      if (Array.isArray(data) && data.length > 0) {
        setProducts(data);
      }
    } catch {
      // Fallback already in state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleOpenAdjustModal = (product, variant) => {
    setSelectedProduct(product);
    setSelectedVariant(variant);
    setIsModalOpen(true);
  };

  const handleCloseAdjustModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  const handleStockAdjustmentSubmit = async ({
    sku,
    delta,
    reason,
    notes,
    newStockLevel,
    variantId,
    productId,
  }) => {
    // 1. Optimistic in-place state update without full page reload (AC4)
    setProducts((prevProducts) =>
      prevProducts.map((prod) => {
        if (prod.id !== productId && !prod.variants.some((v) => v.sku === sku)) {
          return prod;
        }

        const updatedVariants = prod.variants.map((v) => {
          if (v.sku === sku || v.id === variantId) {
            const nextStock = Math.max(0, (v.stock_quantity || 0) + delta);
            return {
              ...v,
              stock_quantity: nextStock,
            };
          }
          return v;
        });

        return {
          ...prod,
          variants: updatedVariants,
        };
      })
    );

    // 2. Dispatch to backend API POST /api/v1/inventory/adjust
    await inventoryApi.adjustStock({ sku, delta, reason, notes });

    // 3. User feedback
    const formattedDelta = delta > 0 ? `+${delta}` : `${delta}`;
    setToastMessage(
      `Stock updated: SKU ${sku} (${formattedDelta} units). Audit recorded: "${reason}".`
    );
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Compute Aggregate Inventory Telemetry
  let totalSkus = 0;
  let lowStockSkus = 0;
  let totalOnHandUnits = 0;
  let totalReservedUnits = 0;

  products.forEach((prod) => {
    (prod.variants || []).forEach((v) => {
      totalSkus += 1;
      const onHand = Number(v.stock_quantity || 0);
      const reserved = Number(v.reserved_quantity || 0);
      const available = Math.max(0, onHand - reserved);

      totalOnHandUnits += onHand;
      totalReservedUnits += reserved;
      if (available < 5) {
        lowStockSkus += 1;
      }
    });
  });

  return (
    <div className="inventory-page-container" data-testid="inventory-page">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="inventory-toast" role="alert" data-testid="inventory-toast">
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="inventory-header">
        <div>
          <div className="inventory-kicker">
            <span className="inventory-kicker-badge">Central Warehouse Operations</span>
            <span className="inventory-kicker-tag">Dickwella Atelier Fulfillment Center</span>
          </div>
          <h1 className="inventory-title">Inventory & SKU Restock Matrix</h1>
          <p className="inventory-subtitle">
            Audit physical apparel stock, monitor 15-minute checkout reservations, and execute
            compliant restock adjustments.
          </p>
        </div>

        <div className="inventory-header-actions">
          <button
            type="button"
            className="inventory-refresh-btn"
            onClick={fetchInventory}
            disabled={isLoading}
            title="Reload live inventory data"
            data-testid="refresh-inventory-btn"
          >
            <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync Warehouse'}</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Telemetry Strip */}
      <div className="inventory-kpi-grid">
        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">SKU Variants Monitored</span>
            <div className="inv-kpi-icon icon-primary">
              <Boxes size={18} />
            </div>
          </div>
          <div className="inv-kpi-val" data-testid="kpi-total-skus">
            {totalSkus} SKUs
          </div>
          <span className="inv-kpi-sub">Across {products.length} Garment Styles</span>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Critical Low-Stock Alerts</span>
            <div className="inv-kpi-icon icon-danger">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="inv-kpi-val text-danger" data-testid="kpi-low-stock-skus">
            {lowStockSkus} SKUs
          </div>
          <span className="inv-kpi-sub">Available stock &lt; 5 units</span>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Total Units On-Hand</span>
            <div className="inv-kpi-icon icon-success">
              <Package size={18} />
            </div>
          </div>
          <div className="inv-kpi-val text-success" data-testid="kpi-onhand-units">
            {totalOnHandUnits} Units
          </div>
          <span className="inv-kpi-sub">Physical warehouse stock</span>
        </div>

        <div className="inv-kpi-card">
          <div className="inv-kpi-header">
            <span className="inv-kpi-label">Active Checkout Holds</span>
            <div className="inv-kpi-icon icon-warning">
              <Clock size={18} />
            </div>
          </div>
          <div className="inv-kpi-val text-warning" data-testid="kpi-reserved-units">
            {totalReservedUnits} Reserved
          </div>
          <span className="inv-kpi-sub">15-minute temporary lock</span>
        </div>
      </div>

      {/* Hierarchical Inventory & SKU Matrix Table */}
      <InventoryTable
        products={products}
        onAdjustStock={handleOpenAdjustModal}
        lowStockOnly={lowStockOnly}
        onToggleLowStockOnly={() => setLowStockOnly((prev) => !prev)}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isModalOpen}
        onClose={handleCloseAdjustModal}
        product={selectedProduct}
        variant={selectedVariant}
        onSubmit={handleStockAdjustmentSubmit}
      />
    </div>
  );
}

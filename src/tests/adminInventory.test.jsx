import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import LowStockBadge from '../components/inventory/LowStockBadge';
import StockAdjustmentModal from '../components/inventory/StockAdjustmentModal';
import InventoryTable from '../components/inventory/InventoryTable';
import InventoryPage from '../pages/InventoryPage';
import { FALLBACK_INVENTORY, inventoryApi } from '../api/inventory.api';

describe('STORM-FE-018: Admin Inventory Restock Matrix, SKU Variant Stock Adjustment & Low-Stock Alerts', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('/api/v1/inventory/adjust')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                sku: 'SAR-HLM-RED-OS',
                delta: 10,
                newStockLevel: 22,
                updatedAt: new Date().toISOString(),
              },
            }),
        });
      }
      if (url.includes('/api/v1/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: FALLBACK_INVENTORY }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  describe('AC1: Inventory Table Hierarchical Grouping & SKU Variants', () => {
    it('renders products and displays expandable SKU variants with color, size, on-hand, reserved, and available stock', () => {
      render(
        <InventoryTable
          products={FALLBACK_INVENTORY}
          onAdjustStock={vi.fn()}
          lowStockOnly={false}
          onToggleLowStockOnly={vi.fn()}
        />
      );

      // Parent product title
      expect(screen.getByText('Heritage Ceylon Handloom Saree')).toBeInTheDocument();
      expect(screen.getByText('Hand-Dyed Silk Batik Shirt')).toBeInTheDocument();

      // Child SKU code
      expect(screen.getByTestId('sku-SAR-HLM-RED-OS')).toHaveTextContent('SAR-HLM-RED-OS');
      expect(screen.getByTestId('onhand-SAR-HLM-RED-OS')).toHaveTextContent('12');
      expect(screen.getByTestId('reserved-SAR-HLM-RED-OS')).toHaveTextContent('2');
      expect(screen.getByTestId('available-SAR-HLM-RED-OS')).toHaveTextContent('10');
    });

    it('toggles expand/collapse on product click', () => {
      render(
        <InventoryTable
          products={FALLBACK_INVENTORY}
          onAdjustStock={vi.fn()}
          lowStockOnly={false}
          onToggleLowStockOnly={vi.fn()}
        />
      );

      const parentRow = screen.getByTestId('product-row-101');
      expect(screen.getByTestId('variant-row-SAR-HLM-RED-OS')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(parentRow);
      expect(screen.queryByTestId('variant-row-SAR-HLM-RED-OS')).not.toBeInTheDocument();

      // Click to re-expand
      fireEvent.click(parentRow);
      expect(screen.getByTestId('variant-row-SAR-HLM-RED-OS')).toBeInTheDocument();
    });
  });

  describe('AC2: LowStockBadge Alerts & Pulsing Flag', () => {
    it('renders pulsing red Low Stock badge when available stock < 5', () => {
      render(<LowStockBadge availableStock={3} threshold={5} />);

      const badge = screen.getByTestId('low-stock-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('pulsing');
      expect(badge).toHaveTextContent(/Low Stock \(3 left\)/i);
    });

    it('renders In Stock badge when available stock >= 5', () => {
      render(<LowStockBadge availableStock={10} threshold={5} />);

      const badge = screen.getByTestId('in-stock-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).not.toHaveClass('pulsing');
      expect(badge).toHaveTextContent(/In Stock \(10\)/i);
    });

    it('renders Out of Stock badge when available stock is 0', () => {
      render(<LowStockBadge availableStock={0} threshold={5} />);

      const badge = screen.getByTestId('out-of-stock-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent(/Out of Stock/i);
    });
  });

  describe('AC3: StockAdjustmentModal & Mandatory Audit Reason', () => {
    const mockProduct = FALLBACK_INVENTORY[0];
    const mockVariant = mockProduct.variants[0]; // stock_quantity: 12, reserved_quantity: 2

    it('opens modal and displays current stock, SKU, and audit reason selector', () => {
      render(
        <StockAdjustmentModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockProduct}
          variant={mockVariant}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByTestId('stock-adjustment-modal')).toBeInTheDocument();
      expect(screen.getByText('SAR-HLM-RED-OS')).toBeInTheDocument();
      expect(screen.getByText('Crimson Red')).toBeInTheDocument();
      expect(screen.getByTestId('audit-reason-select')).toBeInTheDocument();
      expect(screen.getByTestId('submit-stock-adjustment-btn')).toBeInTheDocument();
    });

    it('allows toggling between Add (+) and Subtract (-) units and previews resulting stock', () => {
      render(
        <StockAdjustmentModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockProduct}
          variant={mockVariant}
          onSubmit={vi.fn()}
        />
      );

      // Default: Add 1 unit -> On-Hand 12 + 1 = 13
      expect(screen.getByTestId('resulting-onhand')).toHaveTextContent('13 units');

      // Toggle Subtract
      const subtractBtn = screen.getByTestId('toggle-subtract-stock');
      fireEvent.click(subtractBtn);

      // Subtract 1 unit -> On-Hand 12 - 1 = 11
      expect(screen.getByTestId('resulting-onhand')).toHaveTextContent('11 units');
    });

    it('enforces failure recovery constraint: blocks negative stock adjustment and displays error', async () => {
      render(
        <StockAdjustmentModal
          isOpen={true}
          onClose={vi.fn()}
          product={mockProduct}
          variant={mockVariant} // on-hand: 12
          onSubmit={vi.fn()}
        />
      );

      // Switch to subtract
      fireEvent.click(screen.getByTestId('toggle-subtract-stock'));

      // Enter quantity 20 (more than on-hand 12)
      const qtyInput = screen.getByTestId('stock-qty-input');
      fireEvent.change(qtyInput, { target: { value: '20' } });

      // Resulting on-hand would be -8
      expect(screen.getByTestId('resulting-onhand')).toHaveTextContent('-8 units');

      // Attempt to submit
      const submitBtn = screen.getByTestId('submit-stock-adjustment-btn');
      fireEvent.click(submitBtn);

      expect(screen.getByTestId('stock-modal-error')).toBeInTheDocument();
      expect(screen.getByTestId('stock-modal-error')).toHaveTextContent(/cannot be less than zero/i);
    });

    it('submits valid adjustment payload with delta and audit reason', async () => {
      const mockSubmit = vi.fn().mockResolvedValue({ success: true });
      const mockClose = vi.fn();

      render(
        <StockAdjustmentModal
          isOpen={true}
          onClose={mockClose}
          product={mockProduct}
          variant={mockVariant}
          onSubmit={mockSubmit}
        />
      );

      const qtyInput = screen.getByTestId('stock-qty-input');
      fireEvent.change(qtyInput, { target: { value: '5' } });

      const reasonSelect = screen.getByTestId('audit-reason-select');
      fireEvent.change(reasonSelect, { target: { value: 'Restock Shipment Received' } });

      const submitBtn = screen.getByTestId('submit-stock-adjustment-btn');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'SAR-HLM-RED-OS',
          delta: 5,
          reason: 'Restock Shipment Received',
          newStockLevel: 17,
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('AC4: In-Place Optimistic UI Update & Filtering in InventoryPage', () => {
    it('renders aggregate KPI metrics and inventory matrix table', async () => {
      await act(async () => {
        render(<InventoryPage />);
      });

      expect(screen.getByTestId('inventory-page')).toBeInTheDocument();
      expect(screen.getByText(/Inventory & SKU Restock Matrix/i)).toBeInTheDocument();
      expect(screen.getByTestId('kpi-total-skus')).toHaveTextContent('15 SKUs');
      expect(screen.getByTestId('kpi-low-stock-skus')).toBeInTheDocument();
    });

    it('filters inventory table by search keyword', async () => {
      await act(async () => {
        render(<InventoryPage />);
      });

      const searchInput = screen.getByTestId('inventory-search-input');
      fireEvent.change(searchInput, { target: { value: 'Batik' } });

      expect(screen.getByText('Hand-Dyed Silk Batik Shirt')).toBeInTheDocument();
      expect(screen.queryByText('Classic Handloom Cotton Sarong')).not.toBeInTheDocument();
    });

    it('filters table by low-stock only toggle', async () => {
      await act(async () => {
        render(<InventoryPage />);
      });

      const lowStockToggle = screen.getByTestId('toggle-low-stock-filter');
      fireEvent.click(lowStockToggle);
      expect(lowStockToggle).toHaveClass('active');
    });

    it('optimistically updates variant stock in-place without page reload', async () => {
      await act(async () => {
        render(<InventoryPage />);
      });

      // Find Adjust Stock button for SAR-HLM-RED-OS (currently on-hand: 12)
      const adjustBtn = screen.getByTestId('adjust-stock-btn-SAR-HLM-RED-OS');
      await act(async () => {
        fireEvent.click(adjustBtn);
      });

      // Modal is open
      expect(screen.getByTestId('stock-adjustment-modal')).toBeInTheDocument();

      // Add 8 units
      const qtyInput = screen.getByTestId('stock-qty-input');
      fireEvent.change(qtyInput, { target: { value: '8' } });

      const submitBtn = screen.getByTestId('submit-stock-adjustment-btn');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Modal closed, on-hand count updated to 20 (12 + 8)
      expect(screen.queryByTestId('stock-adjustment-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('onhand-SAR-HLM-RED-OS')).toHaveTextContent('20');
      expect(screen.getByTestId('available-SAR-HLM-RED-OS')).toHaveTextContent('18');
      expect(screen.getByTestId('inventory-toast')).toHaveTextContent(/Stock updated: SKU SAR-HLM-RED-OS \(\+8 units\)/i);
    });
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import StatusTransitionModal from '../components/orders/StatusTransitionModal';
import OrderInspectorDrawer from '../components/orders/OrderInspectorDrawer';
import OrdersFulfillmentPage from '../pages/OrdersFulfillmentPage';
import ReturnsReviewPage from '../pages/ReturnsReviewPage';
import {
  FALLBACK_ADMIN_ORDERS,
  FALLBACK_ADMIN_RETURNS,
  adminOrdersApi,
} from '../api/adminOrders.api';

describe('STORM-FE-019: Admin Order Fulfillment Console & 30-Day Return Approvals', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      if (
        url.includes('/api/v1/admin/orders/') &&
        (opts?.method === 'PUT' || opts?.method === 'PATCH')
      ) {
        const body = JSON.parse(opts.body || '{}');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 1,
                ...body,
                updated_at: new Date().toISOString(),
              },
            }),
        });
      }
      if (url.includes('/api/v1/admin/orders')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { orders: FALLBACK_ADMIN_ORDERS } }),
        });
      }
      if (url.includes('/api/v1/admin/returns/') && opts?.method === 'PATCH') {
        const isApprove = url.includes('/approve');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 301,
                status: isApprove ? 'approved' : 'rejected',
                updatedAt: new Date().toISOString(),
              },
            }),
        });
      }
      if (url.includes('/api/v1/admin/returns')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { returns: FALLBACK_ADMIN_RETURNS } }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  describe('AC1: Orders Fulfillment Console & Status Filter Pills', () => {
    it('renders orders table with order numbers, customer names, items count, and LKR totals', async () => {
      await act(async () => {
        render(<OrdersFulfillmentPage />);
      });

      expect(screen.getByText(/Order Fulfillment Console/i)).toBeInTheDocument();
      expect(screen.getByText('DFC-20261005-9901')).toBeInTheDocument();
      expect(screen.getByText('Kavindu Senanayake')).toBeInTheDocument();
      expect(screen.getByText('LKR 14,750.00')).toBeInTheDocument();
      expect(screen.getByText('DFC-20261005-9902')).toBeInTheDocument();
    });

    it('filters orders list by status tabs (e.g. SHIPPED)', async () => {
      await act(async () => {
        render(<OrdersFulfillmentPage />);
      });

      const shippedTab = screen.getByTestId('filter-tab-shipped');
      fireEvent.click(shippedTab);
      expect(shippedTab).toHaveClass('active');

      // Order #3 is shipped
      expect(screen.getByText('DFC-20261004-9899')).toBeInTheDocument();
      // Order #1 is pending, so it should not appear
      expect(screen.queryByText('DFC-20261005-9901')).not.toBeInTheDocument();
    });

    it('filters orders by keyword search', async () => {
      await act(async () => {
        render(<OrdersFulfillmentPage />);
      });

      const searchInput = screen.getByTestId('orders-search-input');
      fireEvent.change(searchInput, { target: { value: 'Thisara' } });

      expect(screen.getByText('Thisara Perera')).toBeInTheDocument();
      expect(screen.queryByText('Kavindu Senanayake')).not.toBeInTheDocument();
    });
  });

  describe('AC2: Status Transition Modal & Delivered Timestamp Logging', () => {
    const mockOrder = FALLBACK_ADMIN_ORDERS[1]; // status: processing

    it('opens modal, captures tracking code for shipped stage, and triggers update', async () => {
      const mockConfirm = vi.fn().mockResolvedValue({ success: true });
      const mockClose = vi.fn();

      render(
        <StatusTransitionModal
          isOpen={true}
          onClose={mockClose}
          order={mockOrder}
          targetStatus="shipped"
          onConfirm={mockConfirm}
        />
      );

      expect(screen.getByTestId('status-transition-modal')).toBeInTheDocument();
      expect(screen.getByTestId('tracking-number-input')).toBeInTheDocument();

      // Enter courier tracking code
      const trackingInput = screen.getByTestId('tracking-number-input');
      fireEvent.change(trackingInput, { target: { value: 'SLPOST-81100-01' } });

      const submitBtn = screen.getByTestId('confirm-status-transition-btn');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: mockOrder.id,
          status: 'shipped',
          tracking_number: 'SLPOST-81100-01',
        })
      );
      expect(mockClose).toHaveBeenCalled();
    });

    it('automatically passes delivered_at timestamp when target status is delivered', async () => {
      const mockConfirm = vi.fn().mockResolvedValue({ success: true });

      render(
        <StatusTransitionModal
          isOpen={true}
          onClose={vi.fn()}
          order={mockOrder}
          targetStatus="delivered"
          onConfirm={mockConfirm}
        />
      );

      expect(screen.getByTestId('delivered-notice')).toBeInTheDocument();

      const submitBtn = screen.getByTestId('confirm-status-transition-btn');
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: mockOrder.id,
          status: 'delivered',
          delivered_at: expect.any(String),
        })
      );
    });

    it('opens OrderInspectorDrawer when Inspect button is clicked', async () => {
      await act(async () => {
        render(<OrdersFulfillmentPage />);
      });

      const inspectBtn = screen.getByTestId('inspect-order-btn-1');
      await act(async () => {
        fireEvent.click(inspectBtn);
      });

      expect(screen.getByTestId('order-inspector-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-customer-name')).toHaveTextContent('Kavindu Senanayake');
      expect(screen.getByTestId('drawer-order-total')).toHaveTextContent('LKR 14,750.00');
    });
  });

  describe('AC3 & AC4: Returns & Exchanges Review Console', () => {
    it('renders customer return and exchange submissions with photographic proof', async () => {
      await act(async () => {
        render(<ReturnsReviewPage />);
      });

      expect(screen.getByText(/30-Day Return & Exchange Approvals/i)).toBeInTheDocument();
      expect(screen.getByText('RET-20261005-01')).toBeInTheDocument();
      expect(screen.getByText('Sanduni Wickramasinghe')).toBeInTheDocument();
      expect(screen.getByText('Size Exchange')).toBeInTheDocument();
      expect(screen.getByText(/Wrong Size \/ Fit Too Tight/i)).toBeInTheDocument();
      expect(screen.getByTestId('photo-thumb-btn-301')).toBeInTheDocument();
    });

    it('approves a pending exchange request and updates row status to APPROVED', async () => {
      await act(async () => {
        render(<ReturnsReviewPage />);
      });

      const approveBtn = screen.getByTestId('approve-return-btn-301');
      await act(async () => {
        fireEvent.click(approveBtn);
      });

      expect(screen.getByTestId('return-status-301')).toHaveTextContent(/APPROVED/i);
      expect(screen.getByTestId('returns-toast')).toHaveTextContent(/Exchange Authorized/i);
    });

    it('opens reject modal and confirms rejection with justification reason', async () => {
      await act(async () => {
        render(<ReturnsReviewPage />);
      });

      const rejectBtn = screen.getByTestId('reject-return-btn-302');
      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      expect(screen.getByTestId('reject-modal')).toBeInTheDocument();

      const confirmRejectBtn = screen.getByTestId('confirm-reject-btn');
      await act(async () => {
        fireEvent.click(confirmRejectBtn);
      });

      expect(screen.queryByTestId('reject-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('return-status-302')).toHaveTextContent(/REJECTED/i);
    });

    it('opens photographic evidence in lightbox modal on thumbnail click', async () => {
      await act(async () => {
        render(<ReturnsReviewPage />);
      });

      const photoThumb = screen.getByTestId('photo-thumb-btn-301');
      fireEvent.click(photoThumb);

      expect(screen.getByTestId('photo-lightbox')).toBeInTheDocument();
    });
  });
});

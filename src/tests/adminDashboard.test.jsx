import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import AdminRoute from '../routes/AdminRoute';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import KpiCard from '../components/dashboard/KpiCard';
import RevenueTrendChart from '../components/dashboard/RevenueTrendChart';
import RecentOrdersTable from '../components/dashboard/RecentOrdersTable';
import DashboardPage from '../pages/DashboardPage';
import { FALLBACK_ANALYTICS } from '../api/adminAnalytics.api';
import { DollarSign } from 'lucide-react';

describe('STORM-FE-017: Admin Role-Guarded Layout & Executive KPI Analytics Dashboard', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/v1/health')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: { status: 'operational' } }),
        });
      }
      if (url.includes('/api/v1/admin/analytics/sales-trend')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: FALLBACK_ANALYTICS.salesTrend }),
        });
      }
      if (url.includes('/api/v1/admin/analytics')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, data: FALLBACK_ANALYTICS.metrics }),
        });
      }
      if (url.includes('/api/v1/admin/orders')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({ success: true, data: { orders: FALLBACK_ANALYTICS.recentOrders } }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  describe('AC1: AdminRoute RBAC Guard & Authorization Enforcement', () => {
    it('blocks unauthenticated visitors and prompts admin login', () => {
      render(
        <AdminAuthProvider initialUser={null} initialToken={null}>
          <AdminRoute>
            <div data-testid="protected-content">Secret Admin Dashboard</div>
          </AdminRoute>
        </AdminAuthProvider>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('admin-login-guard')).toBeInTheDocument();
      expect(screen.getByText(/Authentication Required/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Log In to Admin Console/i })).toBeInTheDocument();
    });

    it('blocks authenticated non-admin users (e.g., customer) and displays HTTP 403 Forbidden screen', () => {
      const customerUser = { id: 'cust-999', name: 'John Customer', role: 'customer' };

      render(
        <AdminAuthProvider initialUser={customerUser} initialToken="customer-token">
          <AdminRoute>
            <div data-testid="protected-content">Secret Admin Dashboard</div>
          </AdminRoute>
        </AdminAuthProvider>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('admin-403-guard')).toBeInTheDocument();
      expect(screen.getByText(/HTTP 403 FORBIDDEN/i)).toBeInTheDocument();
      expect(screen.getByText(/Access Denied: Insufficient Privileges/i)).toBeInTheDocument();
      expect(screen.getByText(/customer/i)).toBeInTheDocument();
      expect(screen.getByTestId('switch-user-btn')).toBeInTheDocument();
    });

    it('authorizes admin user and renders children seamlessly', () => {
      const adminUser = { id: 'admin-001', name: 'Amarawickrama R.H.', role: 'admin' };

      render(
        <AdminAuthProvider initialUser={adminUser} initialToken="admin-token">
          <AdminRoute>
            <div data-testid="protected-content">Executive Operations Dashboard</div>
          </AdminRoute>
        </AdminAuthProvider>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText(/Executive Operations Dashboard/i)).toBeInTheDocument();
      expect(screen.queryByTestId('admin-403-guard')).not.toBeInTheDocument();
    });

    it('authorizes inventory_manager role user and renders children', () => {
      const inventoryUser = { id: 'inv-001', name: 'S. Thanoogithan', role: 'inventory_manager' };

      render(
        <AdminAuthProvider initialUser={inventoryUser} initialToken="inv-token">
          <AdminRoute>
            <div data-testid="protected-content">Inventory Restock Console</div>
          </AdminRoute>
        </AdminAuthProvider>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-403-guard')).not.toBeInTheDocument();
    });
  });

  describe('AC2: Executive KpiCard Component', () => {
    it('renders KPI metric card with title, formatted LKR amount, icon, and positive growth badge', () => {
      render(
        <KpiCard
          title="Total Monthly Revenue"
          value="LKR 845,200.00"
          trend={18.4}
          trendLabel="from last month"
          icon={DollarSign}
          variant="primary"
          dataTestId="test-kpi"
        />
      );

      expect(screen.getByText(/Total Monthly Revenue/i)).toBeInTheDocument();
      expect(screen.getByText('LKR 845,200.00')).toBeInTheDocument();
      expect(screen.getByText('+18.4%')).toBeInTheDocument();
      expect(screen.getByText(/from last month/i)).toBeInTheDocument();
    });

    it('renders negative trend correctly with styling pill', () => {
      render(
        <KpiCard
          title="Low-Stock Variants"
          value="3 Items"
          trend={-12.5}
          trendLabel="vs yesterday"
          variant="danger"
        />
      );

      expect(screen.getByText(/Low-Stock Variants/i)).toBeInTheDocument();
      expect(screen.getByText('3 Items')).toBeInTheDocument();
      expect(screen.getByText('-12.5%')).toBeInTheDocument();
    });
  });

  describe('AC3: RevenueTrendChart & Timeframe Switching', () => {
    it('renders chart and allows switching across Daily, Weekly, and Monthly tabs', async () => {
      render(<RevenueTrendChart trendData={FALLBACK_ANALYTICS.salesTrend} />);

      expect(screen.getByText(/Executive Sales & Revenue Velocity/i)).toBeInTheDocument();
      expect(screen.getByTestId('timeframe-tab-daily')).toHaveClass('active');

      // Click Weekly tab
      const weeklyTab = screen.getByTestId('timeframe-tab-weekly');
      fireEvent.click(weeklyTab);
      expect(weeklyTab).toHaveClass('active');
      expect(screen.getByText(/Average per Week/i)).toBeInTheDocument();

      // Click Monthly tab
      const monthlyTab = screen.getByTestId('timeframe-tab-monthly');
      fireEvent.click(monthlyTab);
      expect(monthlyTab).toHaveClass('active');
      expect(screen.getByText(/Average per Month/i)).toBeInTheDocument();
    });

    it('renders SVG graph with path and data points', () => {
      const { container } = render(<RevenueTrendChart trendData={FALLBACK_ANALYTICS.salesTrend} />);
      const svg = container.querySelector('svg.revenue-svg');
      expect(svg).toBeInTheDocument();
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('AC4: RecentOrdersTable with Quick Fulfillment Status Actions', () => {
    it('renders 10 recent orders with order numbers, customer names, and LKR totals', () => {
      render(
        <RecentOrdersTable orders={FALLBACK_ANALYTICS.recentOrders} onUpdateStatus={vi.fn()} />
      );

      expect(screen.getByText('DFC-20261005-9901')).toBeInTheDocument();
      expect(screen.getByText('Kavindu Senanayake')).toBeInTheDocument();
      expect(screen.getByText('LKR 14,750.00')).toBeInTheDocument();
      expect(screen.getByText('DFC-20261005-9902')).toBeInTheDocument();
      expect(screen.getByText('Nimasha Fernando')).toBeInTheDocument();
    });

    it('triggers fulfillment status transition callback when action button is clicked', async () => {
      const handleUpdate = vi.fn().mockResolvedValue({ success: true });
      render(
        <RecentOrdersTable orders={FALLBACK_ANALYTICS.recentOrders} onUpdateStatus={handleUpdate} />
      );

      // Order #1 is 'placed', so next action is 'Start Processing'
      const startProcessingBtn = screen.getByTestId('action-btn-1');
      expect(startProcessingBtn).toHaveTextContent(/Start Processing/i);

      await act(async () => {
        fireEvent.click(startProcessingBtn);
      });
      expect(handleUpdate).toHaveBeenCalledWith(1, 'processing');
    });

    it('filters orders by search query keyword', () => {
      render(
        <RecentOrdersTable orders={FALLBACK_ANALYTICS.recentOrders} onUpdateStatus={vi.fn()} />
      );

      const searchInput = screen.getByLabelText(/Search Orders/i);
      fireEvent.change(searchInput, { target: { value: 'Thisara' } });

      expect(screen.getByText('Thisara Perera')).toBeInTheDocument();
      expect(screen.queryByText('Kavindu Senanayake')).not.toBeInTheDocument();
    });
  });

  describe('Unified DashboardPage Integration', () => {
    it('renders 4 KPI summary cards with percentage growth badges, sales chart, and orders table', async () => {
      await act(async () => {
        render(<DashboardPage isBackendHealthy={true} gatewayMessage="Backend Online" />);
      });

      // 4 Executive Retail KPIs
      expect(screen.getByText(/Total Monthly Revenue/i)).toBeInTheDocument();
      expect(screen.getByText('LKR 845,200.00')).toBeInTheDocument();
      expect(screen.getByText(/Active Orders Fulfilled/i)).toBeInTheDocument();
      expect(screen.getByText('142 Orders')).toBeInTheDocument();
      expect(screen.getByText(/Average Order Value \(AOV\)/i)).toBeInTheDocument();
      expect(screen.getByText('LKR 5,952.11')).toBeInTheDocument();
      expect(screen.getByText(/Active Customers/i)).toBeInTheDocument();
      expect(screen.getByText('840 Customers')).toBeInTheDocument();

      // Chart & Table
      expect(screen.getByTestId('revenue-trend-chart')).toBeInTheDocument();
      expect(screen.getByTestId('recent-orders-table')).toBeInTheDocument();
    });

    it('handles refresh button click to reload metrics', async () => {
      await act(async () => {
        render(<DashboardPage isBackendHealthy={true} />);
      });

      const refreshBtn = screen.getByTestId('refresh-metrics-btn');
      await act(async () => {
        fireEvent.click(refreshBtn);
        // Allow microtasks to run so fetch is invoked
        await Promise.resolve();
      });

      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

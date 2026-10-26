/**
 * Admin Analytics & Operations API Client Service
 * StackStorm E-Commerce Platform — Dickwella Fashion Corner
 * Module Owner: Amarawickrama R.H.
 */

import apiClient from './client';

// Fallback mock analytics data for resilient offline testing and determinism
export const FALLBACK_ANALYTICS = {
  metrics: {
    totalRevenue: 845200,
    totalRevenueFormatted: 'LKR 845,200.00',
    totalRevenueGrowth: 18.4,
    monthlyOrders: 142,
    monthlyOrdersGrowth: 12.3,
    averageOrderValue: 5952.11,
    averageOrderValueFormatted: 'LKR 5,952.11',
    aovGrowth: 5.4,
    activeCustomers: 840,
    activeCustomersGrowth: 9.2,
    lowStockCount: 3,
    supportQueueCount: 2,
  },
  salesTrend: {
    daily: [
      { label: 'Mon', date: '2026-10-01', revenue: 98400, orders: 18 },
      { label: 'Tue', date: '2026-10-02', revenue: 112500, orders: 22 },
      { label: 'Wed', date: '2026-10-03', revenue: 145000, orders: 27 },
      { label: 'Thu', date: '2026-10-04', revenue: 128900, orders: 24 },
      { label: 'Fri', date: '2026-10-05', revenue: 164200, orders: 31 },
      { label: 'Sat', date: '2026-10-06', revenue: 198000, orders: 39 },
      { label: 'Sun', date: '2026-10-07', revenue: 185600, orders: 35 },
    ],
    weekly: [
      { label: 'W1 Sep', date: 'Sep 01 - 07', revenue: 620000, orders: 95 },
      { label: 'W2 Sep', date: 'Sep 08 - 14', revenue: 710000, orders: 112 },
      { label: 'W3 Sep', date: 'Sep 15 - 21', revenue: 785000, orders: 128 },
      { label: 'W4 Sep', date: 'Sep 22 - 28', revenue: 845200, orders: 142 },
    ],
    monthly: [
      { label: 'May', date: 'May 2026', revenue: 2150000, orders: 380 },
      { label: 'Jun', date: 'Jun 2026', revenue: 2480000, orders: 420 },
      { label: 'Jul', date: 'Jul 2026', revenue: 2710000, orders: 460 },
      { label: 'Aug', date: 'Aug 2026', revenue: 3100000, orders: 515 },
      { label: 'Sep', date: 'Sep 2026', revenue: 3450000, orders: 580 },
      { label: 'Oct', date: 'Oct 2026', revenue: 3890000, orders: 630 },
    ],
  },
  recentOrders: [
    {
      id: 1,
      order_number: 'DFC-20261005-9901',
      customer_name: 'Kavindu Senanayake',
      customer_email: 'kavindu@gmail.com',
      items_count: 2,
      total_amount: 14750,
      total_formatted: 'LKR 14,750.00',
      status: 'placed',
      created_at: '2026-10-05T08:30:00Z',
    },
    {
      id: 2,
      order_number: 'DFC-20261005-9902',
      customer_name: 'Nimasha Fernando',
      customer_email: 'nimasha.f@outlook.com',
      items_count: 1,
      total_amount: 6800,
      total_formatted: 'LKR 6,800.00',
      status: 'processing',
      created_at: '2026-10-05T09:15:00Z',
    },
    {
      id: 3,
      order_number: 'DFC-20261004-9899',
      customer_name: 'Thisara Perera',
      customer_email: 'thisara@yahoo.com',
      items_count: 3,
      total_amount: 32400,
      total_formatted: 'LKR 32,400.00',
      status: 'shipped',
      created_at: '2026-10-04T14:20:00Z',
    },
    {
      id: 4,
      order_number: 'DFC-20261004-9895',
      customer_name: 'Sanduni Wickramasinghe',
      customer_email: 'sanduni.w@gmail.com',
      items_count: 1,
      total_amount: 8500,
      total_formatted: 'LKR 8,500.00',
      status: 'delivered',
      created_at: '2026-10-04T11:00:00Z',
    },
    {
      id: 5,
      order_number: 'DFC-20261003-9890',
      customer_name: 'Roshan Bandara',
      customer_email: 'roshan.b@gmail.com',
      items_count: 2,
      total_amount: 12600,
      total_formatted: 'LKR 12,600.00',
      status: 'delivered',
      created_at: '2026-10-03T16:45:00Z',
    },
    {
      id: 6,
      order_number: 'DFC-20261003-9888',
      customer_name: 'Anoma Jayawardena',
      customer_email: 'anoma.j@sltnet.lk',
      items_count: 4,
      total_amount: 45000,
      total_formatted: 'LKR 45,000.00',
      status: 'processing',
      created_at: '2026-10-03T10:10:00Z',
    },
    {
      id: 7,
      order_number: 'DFC-20261002-9884',
      customer_name: 'Dinesh Chandimal',
      customer_email: 'dinesh.c@gmail.com',
      items_count: 1,
      total_amount: 4200,
      total_formatted: 'LKR 4,200.00',
      status: 'delivered',
      created_at: '2026-10-02T13:30:00Z',
    },
    {
      id: 8,
      order_number: 'DFC-20261002-9881',
      customer_name: 'Chamari Athapaththu',
      customer_email: 'chamari.a@yahoo.com',
      items_count: 2,
      total_amount: 18900,
      total_formatted: 'LKR 18,900.00',
      status: 'placed',
      created_at: '2026-10-02T09:00:00Z',
    },
    {
      id: 9,
      order_number: 'DFC-20261001-9880',
      customer_name: 'Lahiru Kumara',
      customer_email: 'lahiru.k@outlook.com',
      items_count: 1,
      total_amount: 6750,
      total_formatted: 'LKR 6,750.00',
      status: 'shipped',
      created_at: '2026-10-01T15:15:00Z',
    },
    {
      id: 10,
      order_number: 'DFC-20261001-9877',
      customer_name: 'Mahesh Theekshana',
      customer_email: 'mahesh.t@gmail.com',
      items_count: 1,
      total_amount: 5200,
      total_formatted: 'LKR 5,200.00',
      status: 'delivered',
      created_at: '2026-10-01T12:00:00Z',
    },
  ],
};

function mapBackendMetrics(data) {
  if (!data) return null;
  const metrics = data.metrics || data;
  return {
    totalRevenue: metrics.totalRevenue ?? metrics.total_revenue ?? 0,
    totalRevenueFormatted:
      metrics.totalRevenueFormatted ||
      metrics.formatted_revenue ||
      `LKR ${(metrics.totalRevenue ?? metrics.total_revenue ?? 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    totalRevenueGrowth: metrics.totalRevenueGrowth ?? metrics.revenue_growth ?? 0,
    monthlyOrders: metrics.monthlyOrders ?? metrics.total_orders ?? 0,
    monthlyOrdersGrowth: metrics.monthlyOrdersGrowth ?? metrics.orders_growth ?? 0,
    averageOrderValue: metrics.averageOrderValue ?? metrics.average_order_value ?? 0,
    averageOrderValueFormatted:
      metrics.averageOrderValueFormatted ||
      metrics.formatted_aov ||
      `LKR ${(metrics.averageOrderValue ?? metrics.average_order_value ?? 0).toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`,
    aovGrowth: metrics.aovGrowth ?? metrics.aov_growth ?? 0,
    activeCustomers: metrics.activeCustomers ?? metrics.active_customers ?? 0,
    activeCustomersGrowth: metrics.activeCustomersGrowth ?? metrics.customers_growth ?? 0,
    lowStockCount: metrics.lowStockCount ?? metrics.low_stock_count ?? 0,
    supportQueueCount: metrics.supportQueueCount ?? metrics.support_queue_count ?? 0,
  };
}

export const adminAnalyticsApi = {
  /**
   * Fetches real-time overview metrics from GET /api/v1/admin/analytics
   */
  async getOverview() {
    const { data } = await apiClient.get('/admin/analytics');
    return mapBackendMetrics(data);
  },

  /**
   * Fetches sales trend aggregations from GET /api/v1/admin/analytics/sales-trend
   */
  async getSalesTrend(days = 30) {
    const { data } = await apiClient.get(`/admin/analytics/sales-trend?days=${days}`);
    return data?.salesTrend || data;
  },

  /**
   * Fetches recent 10 orders for fulfillment management
   */
  async getRecentOrders(limit = 10) {
    const { data } = await apiClient.get(`/admin/orders?limit=${limit}`);
    return data?.orders || (Array.isArray(data) ? data : []);
  },

  /**
   * Updates fulfillment status of an order
   */
  async updateOrderStatus(orderId, newStatus) {
    const { data } = await apiClient.patch(`/admin/orders/${orderId}/status`, {
      status: newStatus,
    });
    return data;
  },
};

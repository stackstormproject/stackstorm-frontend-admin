import { http } from '../lib/http';

/** GET /admin/analytics -> { metrics, top_products, recent_orders } (paid orders only, #134) */
export const getOverview = () => http.get('/admin/analytics');

/** GET /admin/analytics/sales-trend?days=N -> { days, series: [{ date, revenue, orders }], totals } */
export const getSalesTrend = (days = 30) =>
  http.get('/admin/analytics/sales-trend', { params: { days } });

import { http } from '../lib/http';
import { cleanParams } from '../lib/format';

/** GET /admin/inventory?search&low=true&page&limit -> { items, low_stock_threshold, pagination } */
export const listInventory = (params) =>
  http.get('/admin/inventory', { params: cleanParams(params) });

/** POST /admin/inventory/:variantId/adjust; 409 if stock would fall below held units */
export const adjustStock = (variantId, { delta, reason, note }) =>
  http.post(`/admin/inventory/${variantId}/adjust`, { delta, reason, note: note || undefined });

/** GET /admin/inventory/:variantId/logs -> { logs, reasons } */
export const getStockLogs = (variantId) => http.get(`/admin/inventory/${variantId}/logs`);

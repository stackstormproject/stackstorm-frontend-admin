import { http } from '../lib/http';
import { cleanParams } from '../lib/format';

/** GET /admin/customers?search&tier&sort&page -> { customers, pagination } */
export const listCustomers = (params) =>
  http.get('/admin/customers', { params: cleanParams(params) });

/** -> customer with recent_orders, addresses and loyalty_transactions */
export const getCustomer = (id) => http.get(`/admin/customers/${id}`);

/** POST /admin/customers/:id/loyalty-adjustments; a reason is required, balance never < 0 */
export const adjustLoyaltyPoints = (id, { points, note }) =>
  http.post(`/admin/customers/${id}/loyalty-adjustments`, { points, note });

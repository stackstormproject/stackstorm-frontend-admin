import { http } from '../lib/http';
import { cleanParams } from '../lib/format';

/** GET /admin/customers?search&tier&sort&page -> { customers, pagination } */
export const listCustomers = (params) =>
  http.get('/admin/customers', { params: cleanParams(params) });

/** -> customer with recent_orders, addresses and loyalty_transactions */
export const getCustomer = (id) => http.get(`/admin/customers/${id}`);

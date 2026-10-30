import { http } from '../lib/http';

/** Admin promo code management (#205). */

/** GET /admin/promo-codes -> [{ id, code, discount_type, discount_value, min_order_amount,
 * max_discount_amount, start_date, end_date, usage_limit, times_used, is_active }] */
export const listPromoCodes = () => http.get('/admin/promo-codes');

/** POST /admin/promo-codes */
export const createPromoCode = (fields) => http.post('/admin/promo-codes', fields);

/** PUT /admin/promo-codes/:id */
export const updatePromoCode = (id, fields) => http.put(`/admin/promo-codes/${id}`, fields);

/** DELETE /admin/promo-codes/:id */
export const deletePromoCode = (id) => http.delete(`/admin/promo-codes/${id}`);

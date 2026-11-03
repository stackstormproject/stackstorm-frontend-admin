import { http } from '../lib/http';
import { cleanParams } from '../lib/format';

export const ORDER_STATUSES = [
  'payment_pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
];

/** GET /admin/orders?status&search&page&limit -> { orders, pagination } */
export const listOrders = (params) => http.get('/admin/orders', { params: cleanParams(params) });

/** GET /admin/orders/:id -> order with items, addresses, customer and allowed_statuses */
export const getOrder = (id) => http.get(`/admin/orders/${id}`);

/**
 * PATCH /admin/orders/:id/status. Shipping needs a tracking number; cancelling a paid order
 * restocks it and refunds the payment (#133).
 * -> { id, status, tracking_number, delivery_date, refund, allowed_statuses }
 */
export const updateOrderStatus = (id, { status, trackingNumber }) =>
  http.patch(`/admin/orders/${id}/status`, {
    status,
    ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
  });

/** GET /admin/orders/:id/invoice -> the PDF invoice as a Blob; 409 while unpaid (#179) */
export const getInvoice = (id) =>
  http.get(`/admin/orders/${id}/invoice`, {
    responseType: 'blob',
    headers: { Accept: 'application/pdf' },
  });

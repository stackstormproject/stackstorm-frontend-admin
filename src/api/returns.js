import { http } from '../lib/http';
import { cleanParams } from '../lib/format';

export const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'completed'];

/** GET /admin/returns?status&page -> { returns, pagination } (requested first) */
export const listReturns = (params) => http.get('/admin/returns', { params: cleanParams(params) });

export const getReturn = (id) => http.get(`/admin/returns/${id}`);

export const approveReturn = (id, note) =>
  http.post(`/admin/returns/${id}/approve`, note ? { note } : {});

/** A reason is required; the customer sees it in their returns list. */
export const rejectReturn = (id, note) => http.post(`/admin/returns/${id}/reject`, { note });

/**
 * POST /admin/returns/:id/receive. An acceptable item is restocked and refunded (or the
 * exchange item is sent); an unacceptable one is rejected with the note.
 */
export const receiveReturn = (id, { acceptable, note }) =>
  http.post(`/admin/returns/${id}/receive`, { acceptable, note: note || undefined });

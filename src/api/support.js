import { http } from '../lib/http';

/** GET /admin/support/sessions -> { sessions } with each session's messages */
export const listSupportSessions = async () => {
  const { sessions } = await http.get('/admin/support/sessions');
  return sessions;
};

/** PATCH /admin/support/sessions/:id/status with 'resolved' | 'agent_active' | 'pending' */
export const updateSupportSessionStatus = (id, status) =>
  http.patch(`/admin/support/sessions/${id}/status`, { status });

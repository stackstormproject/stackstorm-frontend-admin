/**
 * Admin Authentication API Client
 * StackStorm E-Commerce Platform — Dickwella Fashion Corner
 * Connects directly to live backend endpoints:
 *   POST /api/v1/auth/admin/login
 *   GET  /api/v1/auth/admin/me
 */
import apiClient from './client';

export const DEMO_ADMIN_ACCOUNTS = [
  {
    label: 'Executive Super Admin',
    email: 'admin@stackstorm.lk',
    password: 'AdminPassword123!',
    user: {
      id: 'admin-001',
      name: 'Amarawickrama R.H.',
      email: 'admin@stackstorm.lk',
      role: 'admin',
      department: 'Executive Operations',
    },
  },
  {
    label: 'Lead Inventory Engineer',
    email: 'inventory@dickwellafashion.lk',
    password: 'AdminPassword123!',
    user: {
      id: 'inv-002',
      name: 'S. Thanoogithan',
      email: 'inventory@dickwellafashion.lk',
      role: 'inventory_manager',
      department: 'Warehouse & Fulfillment',
    },
  },
  {
    label: 'Customer Support Lead',
    email: 'support@dickwellafashion.lk',
    password: 'AdminPassword123!',
    user: {
      id: 'sup-003',
      name: 'B.K. Pabasara',
      email: 'support@dickwellafashion.lk',
      role: 'support_agent',
      department: 'Customer Care & CRM',
    },
  },
];

export const adminAuthApi = {
  /**
   * Submit credentials to POST /api/v1/auth/admin/login
   */
  async loginAdmin({ email, password }) {
    const { data } = await apiClient.post('/auth/admin/login', { email, password });

    const user = data.admin ||
      data.user || {
        id: data.userId || 'admin-001',
        name: data.name || email.split('@')[0],
        email,
        role: data.role || 'admin',
      };
    const token = data.accessToken || data.token || 'jwt-admin-token';

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('stackstorm_admin_token', token);
      localStorage.setItem('stackstorm_admin_user', JSON.stringify(user));
    }

    return { user, token };
  },

  /**
   * Fetch current authenticated admin profile
   */
  async getProfile(token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const { data } = await apiClient.get('/auth/admin/me', { headers });
    return data;
  },
};

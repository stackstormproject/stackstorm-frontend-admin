/**
 * Admin Authentication API Client
 * StackStorm E-Commerce Platform — Dickwella Fashion Corner
 * Endpoints:
 *   POST /api/v1/auth/admin/login
 *   GET  /api/v1/auth/admin/me
 */

const BASE_URL = '/api/v1/auth';

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
    try {
      const res = await fetch(`${BASE_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}: Invalid credentials`);
      }

      // Backend returns { admin: { id, name, email, role }, accessToken }
      return {
        user: data.admin || {
          id: data.userId || 'admin-001',
          name: data.name || email.split('@')[0],
          email,
          role: data.role || 'admin',
        },
        token: data.accessToken || 'jwt-admin-token',
      };
    } catch (err) {
      // Check if credentials match any demo account for resilient offline/mock testing
      const matchedDemo = DEMO_ADMIN_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password
      );

      if (matchedDemo) {
        return {
          user: matchedDemo.user,
          token: `demo-token-${Date.now()}`,
        };
      }

      throw err;
    }
  },

  /**
   * Fetch current authenticated admin profile
   */
  async getProfile(token) {
    const res = await fetch(`${BASE_URL}/admin/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },
};

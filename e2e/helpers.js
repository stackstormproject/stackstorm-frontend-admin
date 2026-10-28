import { expect, request as playwrightRequest } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL || 'http://localhost:5000/api/v1';

// No password is committed: set E2E_ADMIN_PASSWORD (the seed's SEED_ADMIN_PASSWORD locally).
export const STAFF = {
  manager: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@stackstorm.lk',
    password: process.env.E2E_ADMIN_PASSWORD,
  },
  agent: {
    email: process.env.E2E_AGENT_EMAIL || 'support@stackstorm.lk',
    password: process.env.E2E_AGENT_PASSWORD || process.env.E2E_ADMIN_PASSWORD,
  },
};

export const hasCredentials = Boolean(process.env.E2E_ADMIN_PASSWORD);

export const unique = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

export const ADDRESS = { line1: '12 Main Street', city: 'Dickwella', postal_code: '81200' };

export async function signIn(page, who = 'manager') {
  await page.goto('/login');
  await page.getByLabel('Work email').fill(STAFF[who].email);
  await page.getByLabel('Password', { exact: true }).fill(STAFF[who].password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('#sidebar')).toBeAttached();
}

const unwrap = async (response) => {
  const body = await response.json();
  if (!response.ok())
    throw new Error(`${response.url()} -> ${response.status()} ${JSON.stringify(body)}`);
  return body && typeof body === 'object' && 'data' in body ? body.data : body;
};

/** API calls used to arrange data the screens under test act on. */
export async function apiClient() {
  const api = await playwrightRequest.newContext({ baseURL: `${API_URL}/` });
  const login = await unwrap(await api.post('auth/admin/login', { data: STAFF.manager }));
  const admin = { Authorization: `Bearer ${login.accessToken}` };

  const client = {
    dispose: () => api.dispose(),

    /** A fresh product with two sizes, so tests never fight over seeded stock. */
    async createProduct(name = unique('E2E Shirt')) {
      const categories = await unwrap(await api.get('categories'));
      return unwrap(
        await api.post('admin/products', {
          headers: admin,
          data: {
            name,
            price: 2500,
            category_id: categories[0].id,
            variants: [
              { size: 'M', color: 'Blue', additional_price: 0, stock_quantity: 10 },
              { size: 'L', color: 'Blue', additional_price: 0, stock_quantity: 10 },
            ],
          },
        })
      );
    },

    async archiveProduct(id) {
      await api.put(`admin/products/${id}`, { headers: admin, data: { is_active: false } });
    },

    /** Checkout and mock payment; returns the paid order (status processing). */
    async paidOrder(variantId, { customerToken, quantity = 1 } = {}) {
      const auth = customerToken ? { Authorization: `Bearer ${customerToken}` } : {};
      const checkout = await unwrap(
        await api.post('checkout/initiate', {
          headers: auth,
          data: {
            ...(customerToken ? {} : { guest_email: `${unique('guest')}@example.lk` }),
            items: [{ variant_id: variantId, quantity }],
            shippingAddress: ADDRESS,
          },
        })
      );
      const proof = customerToken ? auth : { 'X-Guest-Token': checkout.guest_order_token };
      const intent = await unwrap(
        await api.post('payments/create-intent', {
          headers: proof,
          data: { order_id: checkout.order_id },
        })
      );
      await unwrap(
        await api.post('payments/confirm', {
          headers: proof,
          data: { order_id: checkout.order_id, payment_intent_id: intent.paymentIntentId },
        })
      );
      return unwrap(await api.get(`admin/orders/${checkout.order_id}`, { headers: admin }));
    },

    async setOrderStatus(orderId, status, trackingNumber) {
      return unwrap(
        await api.patch(`admin/orders/${orderId}/status`, {
          headers: admin,
          data: { status, ...(trackingNumber ? { tracking_number: trackingNumber } : {}) },
        })
      );
    },

    async registerCustomer() {
      const email = `${unique('shopper')}@example.lk`;
      const { accessToken } = await unwrap(
        await api.post('auth/register', {
          data: { name: 'E2E Shopper', email, password: 'Sh0pper!Pass2026' },
        })
      );
      return { email, token: accessToken };
    },

    async requestReturn(customerToken, orderItemId, extra = {}) {
      return unwrap(
        await api.post('returns', {
          headers: { Authorization: `Bearer ${customerToken}` },
          data: { order_item_id: orderItemId, type: 'return', reason: 'Too small', ...extra },
        })
      );
    },
  };
  return client;
}

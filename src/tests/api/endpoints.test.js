import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { http } from '../../lib/http';
import {
  getAccessToken,
  clearAccessToken,
  hasSessionHint,
  setAccessToken,
} from '../../lib/session';
import * as auth from '../../api/auth';
import * as analytics from '../../api/analytics';
import * as orders from '../../api/orders';
import * as products from '../../api/products';
import * as inventory from '../../api/inventory';
import * as returns from '../../api/returns';
import * as customers from '../../api/customers';
import * as support from '../../api/support';

// Contract tests: each call must hit the route, verb and body the backend actually serves.
describe('API contract', () => {
  let api;
  let raw;
  const ok = (data) => [200, { success: true, data }];

  beforeEach(() => {
    api = new MockAdapter(http);
    raw = new MockAdapter(axios);
    clearAccessToken();
  });

  afterEach(() => {
    api.restore();
    raw.restore();
  });

  const last = (verb) => api.history[verb].at(-1);
  const bodyOf = (verb) => JSON.parse(last(verb).data || '{}');

  describe('auth', () => {
    const admin = { id: 1, name: 'Super Admin', email: 'a@b.lk', role: 'super_admin' };

    it('should keep the token in memory and set the session hint after sign-in', async () => {
      api.onPost('/auth/admin/login').reply(200, { admin, accessToken: 'tok' });

      await expect(auth.signIn({ email: 'a@b.lk', password: 'pw' })).resolves.toEqual(admin);

      expect(bodyOf('post')).toEqual({ email: 'a@b.lk', password: 'pw' });
      expect(getAccessToken()).toBe('tok');
      expect(hasSessionHint()).toBe(true);
    });

    it('should read the admin profile from /auth/admin/me', async () => {
      api.onGet('/auth/admin/me').reply(200, { userId: 1, role: 'super_admin', admin });

      await expect(auth.fetchCurrentAdmin()).resolves.toEqual(admin);
    });

    it('should restore a staff session from the refresh cookie', async () => {
      raw.onPost('/api/v1/auth/refresh').reply(200, { accessToken: 'r', admin });

      await expect(auth.restoreSession()).resolves.toEqual(admin);
      expect(getAccessToken()).toBe('r');
    });

    it('should not accept a shopper session as a staff session', async () => {
      raw.onPost('/api/v1/auth/refresh').reply(200, { accessToken: 'c', customer: { id: 3 } });

      await expect(auth.restoreSession()).resolves.toBeNull();
      expect(getAccessToken()).toBeNull();
    });

    it('should clear local state on sign-out even if the server call fails', async () => {
      setAccessToken('tok');
      api.onPost('/auth/logout').networkError();

      await expect(auth.signOut()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
      expect(getAccessToken()).toBeNull();
      expect(hasSessionHint()).toBe(false);
    });
  });

  it('should read the dashboard overview and the sales trend window', async () => {
    api.onGet('/admin/analytics').reply(...ok({ metrics: {} }));
    api.onGet('/admin/analytics/sales-trend').reply(...ok({ series: [] }));

    await analytics.getOverview();
    await analytics.getSalesTrend(7);

    expect(last('get').params).toEqual({ days: 7 });
  });

  describe('orders', () => {
    it('should send only the filters that are set', async () => {
      api.onGet('/admin/orders').reply(...ok({ orders: [] }));

      await orders.listOrders({ status: '', search: 'DFC-2026', page: 2 });

      expect(last('get').params).toEqual({ search: 'DFC-2026', page: 2 });
    });

    it('should send the tracking number in snake_case when shipping', async () => {
      api.onPatch('/admin/orders/5/status').reply(...ok({ status: 'shipped' }));

      await orders.updateOrderStatus(5, { status: 'shipped', trackingNumber: 'RR123LK' });

      expect(bodyOf('patch')).toEqual({ status: 'shipped', tracking_number: 'RR123LK' });
    });

    it('should omit the tracking number for other transitions', async () => {
      api.onPatch('/admin/orders/5/status').reply(...ok({ status: 'cancelled' }));
      api.onGet('/admin/orders/5').reply(...ok({ id: 5 }));

      await orders.updateOrderStatus(5, { status: 'cancelled' });
      await orders.getOrder(5);

      expect(bodyOf('patch')).toEqual({ status: 'cancelled' });
      expect(orders.ORDER_STATUSES).toContain('payment_pending');
    });
  });

  it('should call every catalog route with the right verb', async () => {
    api.onGet('/admin/products').reply(...ok({ products: [] }));
    api.onGet('/admin/products/3').reply(...ok({ id: 3 }));
    api.onPost('/admin/products').reply(201, { success: true, data: { id: 3 } });
    api.onPut('/admin/products/3').reply(...ok({ id: 3 }));
    api.onDelete('/admin/products/3').reply(...ok(null));
    api.onPost('/admin/products/3/variants').reply(201, { success: true, data: {} });
    api.onPatch('/admin/products/3/variants/9').reply(...ok({}));
    api.onDelete('/admin/products/3/variants/9').reply(...ok({}));
    api.onGet('/categories').reply(...ok([]));

    await products.listProducts({ status: 'archived', search: '' });
    expect(last('get').params).toEqual({ status: 'archived' });
    await products.getProduct(3);
    await products.createProduct({ name: 'Sarong', variants: [] });
    await products.updateProduct(3, { is_active: false });
    expect(bodyOf('put')).toEqual({ is_active: false });
    await products.deleteProduct(3);
    await products.addVariant(3, { size: 'M', color: 'Blue' });
    await products.updateVariant(3, 9, { additional_price: 100 });
    await products.deleteVariant(3, 9);
    await products.listCategories();

    expect(api.history.delete.map((r) => r.url)).toEqual([
      '/admin/products/3',
      '/admin/products/3/variants/9',
    ]);
  });

  it('should adjust stock with delta, reason and note and read the log', async () => {
    api.onGet('/admin/inventory').reply(...ok({ items: [] }));
    api.onPost('/admin/inventory/8/adjust').reply(...ok({}));
    api.onGet('/admin/inventory/8/logs').reply(...ok({ logs: [] }));

    await inventory.listInventory({ low: true, search: '' });
    expect(last('get').params).toEqual({ low: true });
    await inventory.adjustStock(8, { delta: -2, reason: 'damaged', note: '' });
    expect(bodyOf('post')).toEqual({ delta: -2, reason: 'damaged' });
    await inventory.getStockLogs(8);
  });

  it('should drive the return workflow routes', async () => {
    api.onGet('/admin/returns').reply(...ok({ returns: [] }));
    api.onGet('/admin/returns/4').reply(...ok({ id: 4 }));
    api.onPost(/\/admin\/returns\/4\/(approve|reject|receive)/).reply(...ok({}));

    await returns.listReturns({ status: 'requested' });
    await returns.getReturn(4);
    await returns.approveReturn(4);
    expect(bodyOf('post')).toEqual({});
    await returns.approveReturn(4, 'Send it back');
    expect(bodyOf('post')).toEqual({ note: 'Send it back' });
    await returns.rejectReturn(4, 'Worn');
    expect(bodyOf('post')).toEqual({ note: 'Worn' });
    await returns.receiveReturn(4, { acceptable: true, note: '' });
    expect(bodyOf('post')).toEqual({ acceptable: true });
    expect(last('post').url).toBe('/admin/returns/4/receive');
  });

  it('should adjust loyalty points with a reason', async () => {
    api.onGet('/admin/customers').reply(...ok({ customers: [] }));
    api.onGet('/admin/customers/2').reply(...ok({ id: 2 }));
    api.onPost('/admin/customers/2/loyalty-adjustments').reply(...ok({}));

    await customers.listCustomers({ sort: 'spend', tier: '' });
    expect(last('get').params).toEqual({ sort: 'spend' });
    await customers.getCustomer(2);
    await customers.adjustLoyaltyPoints(2, { points: -50, note: 'Goodwill reversal' });
    expect(bodyOf('post')).toEqual({ points: -50, note: 'Goodwill reversal' });
  });

  it('should read support sessions and change their status', async () => {
    api.onGet('/admin/support/sessions').reply(...ok({ sessions: [{ id: '1' }] }));
    api.onPatch('/admin/support/sessions/1/status').reply(...ok({}));

    await expect(support.listSupportSessions()).resolves.toEqual([{ id: '1' }]);
    await support.updateSupportSessionStatus('1', 'resolved');
    expect(bodyOf('patch')).toEqual({ status: 'resolved' });
  });
});

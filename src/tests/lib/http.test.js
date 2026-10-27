import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { http, toApiError, unwrap, ApiError, refreshAccessToken } from '../../lib/http';
import { setAccessToken, getAccessToken, clearAccessToken } from '../../lib/session';

describe('http client', () => {
  let api;
  let raw;

  beforeEach(() => {
    api = new MockAdapter(http);
    raw = new MockAdapter(axios);
    clearAccessToken();
  });

  afterEach(() => {
    api.restore();
    raw.restore();
  });

  it('should unwrap the { success, data } envelope', async () => {
    api
      .onGet('/admin/products')
      .reply(200, { success: true, data: { products: [1] }, message: 'ok' });

    await expect(http.get('/admin/products')).resolves.toEqual({ products: [1] });
  });

  it('should pass plain bodies through untouched', () => {
    expect(unwrap({ customer: { id: 1 }, accessToken: 't' })).toEqual({
      customer: { id: 1 },
      accessToken: 't',
    });
  });

  it('should attach the bearer token when signed in', async () => {
    setAccessToken('abc');
    api.onGet('/auth/admin/me').reply((config) => [200, { auth: config.headers.Authorization }]);

    await expect(http.get('/auth/admin/me')).resolves.toEqual({ auth: 'Bearer abc' });
  });

  it('should normalise the central error handler shape', async () => {
    api.onPatch('/admin/orders/1/status').reply(409, { error: 'CONFLICT', message: 'Not allowed' });

    await expect(http.patch('/admin/orders/1/status')).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
      message: 'Not allowed',
    });
  });

  it('should normalise the responseFormatter error shape', () => {
    const error = toApiError({
      response: {
        status: 400,
        data: { success: false, message: '', errors: [{ message: 'Bad' }] },
      },
      message: 'fallback',
    });

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Bad');
    expect(error.code).toBe('HTTP_400');
  });

  it('should report network failures with a readable message', async () => {
    api.onGet('/admin/products').networkError();

    await expect(http.get('/admin/products')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('should refresh once and retry given an expired access token', async () => {
    setAccessToken('old');
    let calls = 0;
    api.onGet('/auth/admin/me').reply((config) => {
      calls += 1;
      return config.headers.Authorization === 'Bearer new'
        ? [200, { success: true, data: { id: 4 } }]
        : [401, { error: 'TOKEN_EXPIRED', message: 'expired' }];
    });
    raw.onPost('/api/v1/auth/refresh').reply(200, { accessToken: 'new', admin: { id: 4 } });

    await expect(http.get('/auth/admin/me')).resolves.toEqual({ id: 4 });
    expect(calls).toBe(2);
    expect(getAccessToken()).toBe('new');
  });

  it('should share one refresh between concurrent 401s', async () => {
    setAccessToken('old');
    api
      .onGet(/\/a|\/b/)
      .reply((config) =>
        config.headers.Authorization === 'Bearer new'
          ? [200, { ok: true }]
          : [401, { error: 'TOKEN_EXPIRED' }]
      );
    raw.onPost('/api/v1/auth/refresh').reply(200, { accessToken: 'new' });

    await Promise.all([http.get('/a'), http.get('/b')]);

    expect(raw.history.post).toHaveLength(1);
  });

  it('should sign out and surface the error given the refresh fails', async () => {
    setAccessToken('old');
    api.onGet('/auth/admin/me').reply(401, { error: 'TOKEN_EXPIRED' });
    raw
      .onPost('/api/v1/auth/refresh')
      .reply(401, { error: 'REFRESH_TOKEN_REUSE', message: 'Log in' });

    await expect(http.get('/auth/admin/me')).rejects.toMatchObject({ code: 'REFRESH_TOKEN_REUSE' });
    expect(getAccessToken()).toBeNull();
  });

  it('should not try to refresh for a guest', async () => {
    api.onGet('/auth/admin/me').reply(401, { error: 'UNAUTHORIZED', message: 'No token' });

    await expect(http.get('/auth/admin/me')).rejects.toMatchObject({ status: 401 });
    expect(raw.history.post).toHaveLength(0);
  });

  it('should expose refreshAccessToken for session restore', async () => {
    raw.onPost('/api/v1/auth/refresh').reply(200, { accessToken: 'r1', admin: { id: 9 } });

    await expect(refreshAccessToken()).resolves.toMatchObject({ admin: { id: 9 } });
    expect(getAccessToken()).toBe('r1');
  });
});

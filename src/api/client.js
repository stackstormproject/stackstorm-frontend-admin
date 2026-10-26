/**
 * Centralized API Client Service
 * StackStorm E-Commerce Platform — Dickwella Fashion Corner Admin
 * Standardized per SDS §2.4 & Prompting Guide Contract
 */

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api/v1';

class ApiClient {
  constructor(baseURL = BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Builds the absolute endpoint URL.
   */
  resolveUrl(endpoint) {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint;
    }
    const cleanBase = this.baseURL.replace(/\/+$/, '');
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    return `${cleanBase}/${cleanEndpoint}`;
  }

  /**
   * Retrieves authorization headers with stored token.
   */
  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('stackstorm_admin_token') || localStorage.getItem('token');
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Core request executor with RFC 7807 error unpacking.
   */
  async request(endpoint, options = {}) {
    const url = this.resolveUrl(endpoint);
    const headers = this.getHeaders(options.headers);

    const config = {
      ...options,
      headers,
    };

    const res = await fetch(url, config);

    const contentType = res.headers?.get ? res.headers.get('content-type') : '';
    if (contentType && contentType.includes('text/html')) {
      const err = new Error(
        `Endpoint '${endpoint}' returned HTML instead of JSON. Ensure backend is running and proxy is active.`
      );
      err.status = 502;
      throw err;
    }

    let data = {};
    if (typeof res.json === 'function') {
      try {
        data = await res.json();
      } catch {
        data = {};
      }
    } else if (typeof res.text === 'function') {
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        data = {};
      }
    }

    if (!res.ok) {
      // Handle 401 Unauthorized
      if (res.status === 401 && typeof window !== 'undefined') {
        if (!endpoint.includes('/auth/admin/login')) {
          localStorage.removeItem('stackstorm_admin_token');
          localStorage.removeItem('stackstorm_admin_user');
        }
      }

      const errorMessage =
        data?.message ||
        data?.error ||
        data?.errors?.[0]?.message ||
        data?.details?.[0]?.message ||
        `HTTP ${res.status}: ${res.statusText || 'Request failed'}`;

      const error = new Error(errorMessage);
      error.status = res.status;
      error.statusCode = res.status;
      error.data = data;
      throw error;
    }

    return {
      status: res.status,
      data: data?.data !== undefined ? data.data : data,
      raw: data,
    };
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
export default apiClient;

import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './session';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const REQUEST_TIMEOUT_MS = 15000;
const NETWORK_ERROR_MESSAGE = 'Cannot reach the server. Check your connection and try again.';

/** One error shape for the whole app, whatever envelope the backend used. */
export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message, details = null }) {
    super(message || 'Something went wrong. Please try again.');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * The backend answers errors in three shapes:
 *   { error: 'CODE', message, details }            (central error handler)
 *   { success: false, message, errors: [] }         (responseFormatter)
 *   { success: false, error: 'CODE', message }      (cart identity middleware)
 */
export const toApiError = (error) => {
  if (error instanceof ApiError) return error;
  if (!error?.response) {
    return new ApiError({ status: 0, code: 'NETWORK_ERROR', message: NETWORK_ERROR_MESSAGE });
  }
  const { status, data } = error.response;
  const body = data && typeof data === 'object' ? data : {};
  const firstError = Array.isArray(body.errors) ? body.errors[0] : null;
  return new ApiError({
    status,
    code: body.error || body.code || `HTTP_${status}`,
    message: body.message || firstError?.message || error.message,
    details:
      body.details || (Array.isArray(body.errors) && body.errors.length ? body.errors : null),
  });
};

/** `{ success, data }` envelopes are unwrapped; plain bodies (auth routes) pass through. */
export const unwrap = (body) =>
  body && typeof body === 'object' && 'success' in body && 'data' in body ? body.data : body;

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  withCredentials: true, // the refresh token is an httpOnly cookie
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.headers.Authorization) {
    // eslint-disable-next-line no-param-reassign
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshInFlight = null;

/**
 * Single-flight refresh: concurrent 401s share one POST /auth/refresh, because the backend
 * rotates the refresh token and treats a second use of the old one as theft.
 */
export const refreshAccessToken = () => {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post(`${API_BASE_URL}/auth/refresh`, null, { withCredentials: true })
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data;
      })
      .catch((error) => {
        clearAccessToken();
        throw toApiError(error);
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

const RETRYABLE_AUTH_CODES = ['TOKEN_EXPIRED', 'INVALID_TOKEN'];

http.interceptors.response.use(
  (response) => unwrap(response.data),
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.error;
    const shouldRefresh =
      error.response?.status === 401 &&
      RETRYABLE_AUTH_CODES.includes(code) &&
      original &&
      !original.retriedAfterRefresh &&
      Boolean(getAccessToken());

    if (!shouldRefresh) throw toApiError(error);

    original.retriedAfterRefresh = true;
    try {
      const { accessToken } = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${accessToken}`;
      return await http(original);
    } catch (refreshError) {
      throw toApiError(refreshError);
    }
  }
);

/**
 * Admin session state.
 *
 * - The access token lives in memory only. It is never written to storage, so a script
 *   injected into the page cannot read a credential from localStorage (OWASP A07).
 *   On reload the session is restored from the backend's httpOnly refresh cookie.
 * - A non-secret hint records that this browser signed in before, so the console only asks
 *   for a refresh when there may be a session to restore.
 */

const SESSION_HINT_KEY = 'dfc.admin.hasSession';

let accessToken = null;
const listeners = new Set();

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token || null;
  listeners.forEach((listener) => listener(accessToken));
};

export const clearAccessToken = () => setAccessToken(null);

/** Subscribe to token changes (sign-in, refresh, sign-out). Returns an unsubscribe function. */
export const onAccessTokenChange = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const hasSessionHint = () => {
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
};

export const setSessionHint = (present) => {
  try {
    if (present) window.localStorage.setItem(SESSION_HINT_KEY, '1');
    else window.localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Storage unavailable (private mode): the operator signs in again after a reload.
  }
};

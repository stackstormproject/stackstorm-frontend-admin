import { http, refreshAccessToken } from '../lib/http';
import { clearAccessToken, setAccessToken, setSessionHint } from '../lib/session';

/** POST /auth/admin/login -> { admin, accessToken }; the refresh token is set as a cookie. */
export const signIn = async ({ email, password }) => {
  const { admin, accessToken } = await http.post('/auth/admin/login', { email, password });
  setAccessToken(accessToken);
  setSessionHint(true);
  return admin;
};

/** GET /auth/admin/me -> { admin: { id, name, email, role } } */
export const fetchCurrentAdmin = async () => {
  const { admin } = await http.get('/auth/admin/me');
  return admin;
};

/**
 * Restores a session from the refresh cookie. POST /auth/refresh answers `admin` for staff
 * and `customer` for shoppers; a customer session is not accepted here.
 */
export const restoreSession = async () => {
  const data = await refreshAccessToken();
  if (!data.admin) {
    clearAccessToken();
    return null;
  }
  return data.admin;
};

/** Revokes the refresh token server-side; local state is cleared even if the call fails. */
export const signOut = async () => {
  try {
    await http.post('/auth/logout');
  } finally {
    clearAccessToken();
    setSessionHint(false);
  }
};

/**
 * Mirrors the backend role matrix (backend src/config/constants.js, #132).
 * The server enforces it; the console only hides what the operator cannot use.
 */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SUPPORT_AGENT: 'support_agent',
});

export const ADMIN_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPPORT_AGENT];
export const MANAGER_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN];
export const SUPPORT_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.SUPPORT_AGENT];

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super admin',
  [ROLES.ADMIN]: 'Store manager',
  [ROLES.SUPPORT_AGENT]: 'Support agent',
};

export const hasRole = (user, roles) => Boolean(user && roles.includes(user.role));

/** Where an operator lands after signing in: managers on the dashboard, agents on support. */
export const homePathFor = (user) => (hasRole(user, MANAGER_ROLES) ? '/' : '/support');

import { MANAGER_ROLES, SUPPORT_ROLES } from './lib/roles';

/**
 * Sidebar sections. Each feature ticket adds its entry here and its route in routes.jsx.
 * `roles` hides links the operator cannot use; the API enforces the same matrix.
 */
export const NAV_GROUPS = [
  { heading: 'Overview', roles: MANAGER_ROLES, items: [] },
  { heading: 'Sales', roles: MANAGER_ROLES, items: [] },
  { heading: 'Catalogue', roles: MANAGER_ROLES, items: [] },
  { heading: 'Customers', roles: SUPPORT_ROLES, items: [] },
];

export const navigationFor = (role) =>
  NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (item.roles || group.roles).includes(role)),
  })).filter((group) => group.items.length > 0);

import {
  Boxes,
  Headset,
  LayoutDashboard,
  Package,
  Percent,
  ShoppingBag,
  Tags,
  Undo2,
  Users,
} from 'lucide-react';
import { MANAGER_ROLES, SUPPORT_ROLES } from './lib/roles';

/**
 * Sidebar sections. Each feature ticket adds its entry here and its route in routes.jsx.
 * `roles` hides links the operator cannot use; the API enforces the same matrix.
 */
export const NAV_GROUPS = [
  {
    heading: 'Overview',
    roles: MANAGER_ROLES,
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    heading: 'Sales',
    roles: MANAGER_ROLES,
    items: [
      { to: '/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/returns', label: 'Returns', icon: Undo2 },
    ],
  },
  {
    heading: 'Catalogue',
    roles: MANAGER_ROLES,
    items: [
      { to: '/products', label: 'Products', icon: Package },
      { to: '/brands', label: 'Brands', icon: Tags },
      { to: '/inventory', label: 'Stock', icon: Boxes },
    ],
  },
  {
    heading: 'Marketing',
    roles: MANAGER_ROLES,
    items: [{ to: '/promo-codes', label: 'Promo codes', icon: Percent }],
  },
  {
    heading: 'Customers',
    roles: SUPPORT_ROLES,
    items: [
      { to: '/customers', label: 'Customers', icon: Users, roles: MANAGER_ROLES },
      { to: '/support', label: 'Live support', icon: Headset },
    ],
  },
];

export const navigationFor = (role) =>
  NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (item.roles || group.roles).includes(role)),
  })).filter((group) => group.items.length > 0);

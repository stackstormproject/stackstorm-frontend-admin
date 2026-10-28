import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppProviders } from '../App';
import { routes as appRoutes } from '../routes';

export const ADMINS = {
  manager: { id: 1, name: 'Super Admin', email: 'admin@stackstorm.lk', role: 'super_admin' },
  storeManager: { id: 3, name: 'Kasun Silva', email: 'kasun@stackstorm.lk', role: 'admin' },
  agent: { id: 2, name: 'Nimali Perera', email: 'support@stackstorm.lk', role: 'support_agent' },
};

/**
 * Renders the real route table inside the real providers at a URL, signed in as `admin`
 * (pass `admin: null` for a signed-out browser). API modules are mocked per test file.
 */
export function renderApp(url = '/', { admin = ADMINS.manager, routes = appRoutes } = {}) {
  const restore = () => Promise.resolve(admin);
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const utils = render(
    <AppProviders restore={restore}>
      <RouterProvider router={router} />
    </AppProviders>
  );
  return { ...utils, router };
}

export const apiError = (status, code, message, details = null) =>
  Object.assign(new Error(message), { status, code, details });

import AdminLayout from './components/layout/AdminLayout';
import { RequireAuth, RequireRole } from './components/layout/RequireAuth';
import { MANAGER_ROLES } from './lib/roles';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import HomeRedirect from './pages/HomeRedirect';
import DashboardPage from './pages/DashboardPage';

const managersOnly = (element) => <RequireRole roles={MANAGER_ROLES}>{element}</RequireRole>;

/**
 * Route table. Every page has a URL, so refresh, the back button and shared links work.
 * Feature tickets add their pages under the guarded layout, wrapped in RequireRole.
 */
export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'dashboard', element: managersOnly(<DashboardPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

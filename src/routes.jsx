import AdminLayout from './components/layout/AdminLayout';
import { RequireAuth, RequireRole } from './components/layout/RequireAuth';
import { MANAGER_ROLES, SUPPORT_ROLES } from './lib/roles';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import HomeRedirect from './pages/HomeRedirect';
import { LoadingState } from './components/ui/States';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ReturnsPage from './pages/ReturnsPage';
import ReturnDetailPage from './pages/ReturnDetailPage';
import ProductsPage from './pages/ProductsPage';
import ProductNewPage from './pages/ProductNewPage';
import ProductEditPage from './pages/ProductEditPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';

const managersOnly = (element) => <RequireRole roles={MANAGER_ROLES}>{element}</RequireRole>;

/**
 * Route table. Every page has a URL, so refresh, the back button and shared links work.
 * Feature tickets add their pages under the guarded layout, wrapped in RequireRole.
 */
export const routes = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    // Shown while a lazily loaded page (the support console) loads on first visit.
    hydrateFallbackElement: (
      <div className="state--page state">
        <LoadingState label="Loading" />
      </div>
    ),
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      { path: 'dashboard', element: managersOnly(<DashboardPage />) },
      { path: 'orders', element: managersOnly(<OrdersPage />) },
      { path: 'orders/:orderId', element: managersOnly(<OrderDetailPage />) },
      { path: 'returns', element: managersOnly(<ReturnsPage />) },
      { path: 'returns/:returnId', element: managersOnly(<ReturnDetailPage />) },
      { path: 'products', element: managersOnly(<ProductsPage />) },
      { path: 'products/new', element: managersOnly(<ProductNewPage />) },
      { path: 'products/:productId', element: managersOnly(<ProductEditPage />) },
      { path: 'inventory', element: managersOnly(<InventoryPage />) },
      { path: 'customers', element: managersOnly(<CustomersPage />) },
      { path: 'customers/:customerId', element: managersOnly(<CustomerDetailPage />) },
      {
        path: 'support',
        // Loaded on demand: socket.io is only needed by the support console.
        lazy: async () => {
          const { default: SupportPage } = await import('./pages/SupportPage');
          return {
            element: (
              <RequireRole roles={SUPPORT_ROLES}>
                <SupportPage />
              </RequireRole>
            ),
          };
        },
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

import React, { useState, useEffect } from 'react';
import AdminLayout from './components/layout/AdminLayout';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminRoute from './routes/AdminRoute';
import DashboardPage from './pages/DashboardPage';
import CatalogPage from './pages/CatalogPage';
import InventoryPage from './pages/InventoryPage';
import OrdersFulfillmentPage from './pages/OrdersFulfillmentPage';
import ReturnsReviewPage from './pages/ReturnsReviewPage';
import LoyaltyConsolePage from './pages/LoyaltyConsolePage';
import SupportConsolePage from './pages/SupportConsolePage';
import './styles/admin-tokens.css';
import './styles/admin-global.css';

function AdminAppContent() {
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window !== 'undefined' && import.meta.env?.MODE !== 'test') {
      const path = (window.location.pathname || '').toLowerCase();
      if (path.includes('support')) return 'support';
      if (path.includes('catalog')) return 'catalog';
      if (path.includes('inventory')) return 'inventory';
      if (path.includes('orders')) return 'orders';
      if (path.includes('returns')) return 'returns';
      if (path.includes('loyalty')) return 'loyalty';
      try {
        const saved = localStorage.getItem('stackstorm_admin_active_tab');
        if (saved) return saved;
      } catch {
        // ignore
      }
    }
    return 'dashboard';
  });

  const handleSelectTab = (tab) => {
    setCurrentTab(tab);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('stackstorm_admin_active_tab', tab);
      } catch {
        // ignore
      }
    }
  };
  const [backendStatus, setBackendStatus] = useState({
    checked: false,
    healthy: false,
    message: 'Testing API Gateway...',
  });
  const { user } = useAdminAuth();

  // Poll backend health via Vite proxy on port 5000
  useEffect(() => {
    let isMounted = true;
    fetch('/api/v1/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setBackendStatus({
            checked: true,
            healthy: data.success === true,
            message: 'Backend Online',
          });
        }
      })
      .catch((err) => {
        if (isMounted) {
          setBackendStatus({
            checked: true,
            healthy: false,
            message: `Gateway Standby: ${err.message}`,
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AdminRoute>
      <AdminLayout
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isBackendHealthy={backendStatus.healthy}
        gatewayMessage={backendStatus.message}
        operatorName={user?.name || 'Amarawickrama R.H.'}
        operatorRole={
          user?.role === 'super_admin'
            ? 'Executive Super Admin'
            : user?.role === 'admin'
              ? 'Executive Store Owner'
              : user?.role === 'inventory_manager'
                ? 'Lead Inventory Engineer'
                : user?.role === 'support_agent'
                  ? 'Customer Support Lead'
                  : 'Operations Specialist'
        }
      >
        {/* View 1: Dashboard & KPIs */}
        {currentTab === 'dashboard' && (
          <DashboardPage
            isBackendHealthy={backendStatus.healthy}
            gatewayMessage={backendStatus.message}
          />
        )}

        {/* View 2: Product Catalog & Apparel Creation */}
        {currentTab === 'catalog' && <CatalogPage />}

        {/* View 3: Inventory & SKUs */}
        {currentTab === 'inventory' && (
          <InventoryPage onNavigateToCatalog={() => setCurrentTab('catalog')} />
        )}

        {/* View 4: Order Fulfillment */}
        {currentTab === 'orders' && <OrdersFulfillmentPage />}

        {/* View 5: 30-Day Returns */}
        {currentTab === 'returns' && <ReturnsReviewPage />}

        {/* View 6: Loyalty Tiers & 2-Quarter Grace Period */}
        {currentTab === 'loyalty' && <LoyaltyConsolePage />}

        {/* View 7: Live Support Chat & Agent Console (STORM-FE-022) */}
        {currentTab === 'support' && <SupportConsolePage />}
      </AdminLayout>
    </AdminRoute>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <AdminAppContent />
    </AdminAuthProvider>
  );
}

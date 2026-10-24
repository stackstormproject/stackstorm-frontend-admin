import React, { useState, useEffect } from 'react';
import AdminLayout from './components/layout/AdminLayout';
import './styles/admin-tokens.css';
import './styles/admin-global.css';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [backendStatus, setBackendStatus] = useState({
    checked: false,
    healthy: false,
    message: 'Testing API Gateway...',
  });

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
            message: 'Backend Online (Port 5000)',
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
    <AdminLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      isBackendHealthy={backendStatus.healthy}
      gatewayMessage={backendStatus.message}
    >
      {/* Tab 1: Dashboard & KPIs */}
      {currentTab === 'dashboard' && (
        <section style={{ padding: '1.5rem' }}>
          <h2>Executive Operations Dashboard</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1rem' }}>
            <div className="admin-kpi-card" style={{ background: 'var(--admin-card)', padding: '1rem', borderRadius: '8px' }}>
              <h3>Total Monthly Revenue</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>LKR 845,200.00</p>
            </div>
            <div className="admin-kpi-card" style={{ background: 'var(--admin-card)', padding: '1rem', borderRadius: '8px' }}>
              <h3>Active Orders Fulfilled</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>142</p>
            </div>
            <div className="admin-kpi-card" style={{ background: 'var(--admin-card)', padding: '1rem', borderRadius: '8px' }}>
              <h3>Low-Stock SKU Alerts</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>6</p>
            </div>
            <div className="admin-kpi-card" style={{ background: 'var(--admin-card)', padding: '1rem', borderRadius: '8px' }}>
              <h3>Live Support Queue</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>3</p>
            </div>
          </div>
        </section>
      )}

      {/* Tab 2: Inventory & SKUs */}
      {currentTab === 'inventory' && (
        <section style={{ padding: '1.5rem' }}>
          <h2>Inventory & SKU Restock Matrix</h2>
          <p>Warehouse stock levels and threshold monitoring.</p>
        </section>
      )}

      {/* Tab 3: Order Fulfillment */}
      {currentTab === 'orders' && (
        <section style={{ padding: '1.5rem' }}>
          <h2>Order Fulfillment Console</h2>
          <p>Manage order dispatches and delivery statuses.</p>
        </section>
      )}

      {/* Tab 4: 30-Day Returns */}
      {currentTab === 'returns' && (
        <section style={{ padding: '1.5rem' }}>
          <h2>30-Day Return Reviews</h2>
        </section>
      )}

      {/* Tab 5: Loyalty Tiers */}
      {currentTab === 'loyalty' && (
        <section style={{ padding: '1.5rem' }}>
          <h2>Loyalty Tier Console</h2>
        </section>
      )}

      {/* Tab 6: Live Support */}
      {currentTab === 'support' && (
        <section style={{ padding: '1.5rem' }}>
          <h2>Live Support Chat Console</h2>
        </section>
      )}
    </AdminLayout>
  );
}
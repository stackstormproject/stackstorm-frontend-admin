import React, { useState } from 'react';
import AdminSidebar, { ADMIN_NAV_ITEMS } from './AdminSidebar';
import AdminHeader from './AdminHeader';
import '../../styles/admin-layout.css';

export default function AdminLayout({
  children,
  currentTab = 'dashboard',
  onSelectTab,
  isBackendHealthy = true,
  gatewayMessage = 'Backend Connected (Port 5000)',
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const activeItem = ADMIN_NAV_ITEMS.find((item) => item.id === currentTab) || ADMIN_NAV_ITEMS[0];

  return (
    <div className="admin-layout-root">
      {/* 1. Left Nav Sidebar */}
      <AdminSidebar
        currentTab={currentTab}
        onSelectTab={onSelectTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. Main Content Viewport */}
      <div className="admin-content-area">
        {/* Header Bar */}
        <AdminHeader
          activeTabLabel={activeItem.label}
          isBackendHealthy={isBackendHealthy}
          gatewayMessage={gatewayMessage}
        />

        {/* Dynamic Screen View */}
        <main className="admin-main-body" role="main">
          {children}
        </main>

        {/* Admin Portal Footer */}
        <footer className="admin-portal-footer">
          <span>StackStorm Control Room v1.0 • Dickwella Fashion Corner Operations</span>
          <span className="footer-credits-tag">
            Engineered by: Amarawickrama R.H. • S. Thanoogithan • B.K. Pabasara • Lakshani A.T.
          </span>
        </footer>
      </div>
    </div>
  );
}

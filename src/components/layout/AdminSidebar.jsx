import React from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  RotateCcw,
  Award,
  Headphones,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react'

export const ADMIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard & KPIs', icon: LayoutDashboard, path: '/admin/dashboard', badge: 'Live' },
  { id: 'inventory', label: 'Inventory & SKUs', icon: Package, path: '/admin/inventory', badge: '3 Low' },
  { id: 'orders', label: 'Order Fulfillment', icon: ShoppingBag, path: '/admin/orders', badge: '8 New' },
  { id: 'returns', label: '30-Day Returns', icon: RotateCcw, path: '/admin/returns', badge: null },
  { id: 'loyalty', label: 'Loyalty Tiers', icon: Award, path: '/admin/loyalty', badge: null },
  { id: 'support', label: 'Live Support Chat', icon: Headphones, path: '/admin/support', badge: '2 Active' },
]

export default function AdminSidebar({
  currentTab = 'dashboard',
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  operatorName = 'S. Thanoogithan',
  operatorRole = 'Lead Inventory Engineer',
}) {
  return (
    <aside
      className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Admin Navigation Sidebar"
    >
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="brand-icon-box" title="StackStorm Control Room">
            <ShieldAlert size={20} />
          </div>
          {!isCollapsed && (
            <div className="brand-titles">
              <span className="brand-name">StackStorm Admin</span>
              <span className="brand-sub">Dickwella Atelier</span>
            </div>
          )}
        </div>

        <button
          className="sidebar-toggle-btn"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        {!isCollapsed && <span className="nav-section-label">Operations Control</span>}

        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = currentTab === item.id

          return (
            <button
              key={item.id}
              className={`admin-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab && onSelectTab(item.id)}
              aria-label={item.label}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} className="nav-item-icon" />
              {!isCollapsed && (
                <>
                  <span className="nav-item-label">{item.label}</span>
                  {item.badge && <span className="nav-item-badge">{item.badge}</span>}
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* Sidebar Footer with Operator Avatar */}
      <div className="sidebar-footer">
        <div className="operator-avatar" title={operatorName}>
          {operatorName.charAt(0)}
        </div>
        {!isCollapsed && (
          <div className="operator-details">
            <span className="operator-name">{operatorName}</span>
            <span className="operator-status">
              <span className="status-dot" />
              <span>{operatorRole}</span>
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}

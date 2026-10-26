import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import StatusTransitionModal from '../components/orders/StatusTransitionModal';
import OrderInspectorDrawer from '../components/orders/OrderInspectorDrawer';
import { adminOrdersApi, FALLBACK_ADMIN_ORDERS } from '../api/adminOrders.api';
import './OrdersFulfillmentPage.css';

const STATUS_FILTERS = [
  'all',
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export default function OrdersFulfillmentPage() {
  const [orders, setOrders] = useState(FALLBACK_ADMIN_ORDERS);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Modals & Drawers
  const [transitionOrder, setTransitionOrder] = useState(null);
  const [inspectOrder, setInspectOrder] = useState(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await adminOrdersApi.getOrders();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch {
      // Fallback in state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdateConfirm = async ({
    orderId,
    status,
    tracking_number,
    courier,
    notes,
    delivered_at,
  }) => {
    // 1. Optimistic in-place update
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status,
            tracking_number: tracking_number || ord.tracking_number,
            courier: courier || ord.courier,
            delivered_at: delivered_at || ord.delivered_at,
          };
        }
        return ord;
      })
    );

    // 2. Dispatch to API
    await adminOrdersApi.updateStatus(orderId, {
      status,
      tracking_number,
      courier,
      notes,
      delivered_at,
    });

    // 3. User notification
    setToastMessage(`Order #${orderId} advanced to "${status.toUpperCase()}".`);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesFilter =
      selectedFilter === 'all' ||
      (order.status || '').toLowerCase() === selectedFilter.toLowerCase() ||
      (selectedFilter === 'paid' && order.payment_status === 'paid');

    const matchesSearch =
      (order.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.tracking_number || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const formatLKR = (val) =>
    `LKR ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status) => {
    const norm = (status || '').toLowerCase().trim();
    switch (norm) {
      case 'pending':
        return (
          <span className="status-pill pill-pending">
            <Clock size={11} /> PENDING
          </span>
        );
      case 'paid':
        return (
          <span className="status-pill pill-paid">
            <CheckCircle2 size={11} /> PAID
          </span>
        );
      case 'processing':
        return (
          <span className="status-pill pill-processing">
            <ShoppingBag size={11} /> PROCESSING
          </span>
        );
      case 'shipped':
        return (
          <span className="status-pill pill-shipped">
            <Truck size={11} /> SHIPPED
          </span>
        );
      case 'delivered':
        return (
          <span className="status-pill pill-delivered">
            <CheckCircle2 size={11} /> DELIVERED
          </span>
        );
      case 'cancelled':
        return <span className="status-pill pill-cancelled">CANCELLED</span>;
      default:
        return <span className="status-pill">{status}</span>;
    }
  };

  return (
    <div className="fulfillment-page-container" data-testid="fulfillment-page">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fulfillment-toast" role="alert" data-testid="fulfillment-toast">
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="fulfillment-header">
        <div>
          <div className="fulfillment-kicker">
            <span className="kicker-badge">Order Dispatch Control</span>
            <span className="kicker-tag">Southern Province Delivery Hub</span>
          </div>
          <h1 className="fulfillment-title">Order Fulfillment Console</h1>
          <p className="fulfillment-subtitle">
            Manage live garment orders through Placed, Processing, Dispatched, and Delivered states
            with carrier tracking codes.
          </p>
        </div>

        <div className="fulfillment-header-actions">
          <button
            type="button"
            className="sync-btn"
            onClick={fetchOrders}
            disabled={isLoading}
            data-testid="sync-orders-btn"
          >
            <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync Orders'}</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tab Pills */}
      <div className="status-filter-pills-bar" role="tablist" aria-label="Order Status Filters">
        {STATUS_FILTERS.map((st) => {
          const count =
            st === 'all'
              ? orders.length
              : orders.filter((o) => (o.status || '').toLowerCase() === st).length;

          return (
            <button
              key={st}
              role="tab"
              aria-selected={selectedFilter === st}
              className={`status-tab-btn ${selectedFilter === st ? 'active' : ''}`}
              onClick={() => setSelectedFilter(st)}
              data-testid={`filter-tab-${st}`}
            >
              <span>{st.toUpperCase()}</span>
              <span className="tab-count-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table Container Card */}
      <div className="fulfillment-table-card">
        {/* Search Bar */}
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by order #, customer, tracking code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              aria-label="Search Orders"
              data-testid="orders-search-input"
            />
          </div>
          <div className="toolbar-count">
            Showing {filteredOrders.length} of {orders.length} Orders
          </div>
        </div>

        {/* Responsive Table */}
        <div className="table-responsive-wrapper">
          <table className="fulfillment-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total Value</th>
                <th>Fulfillment Stage</th>
                <th>Carrier / Tracking</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-cell">
                    No orders match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="order-row" data-testid={`order-row-${order.id}`}>
                    <td className="order-number-cell">
                      <span className="order-number font-mono">{order.order_number}</span>
                      <span className="placed-time">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td>
                      <div className="customer-info">
                        <span className="customer-name">{order.customer?.name}</span>
                        <span className="customer-email">{order.customer?.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="items-chip">{order.items?.length || 1} item(s)</span>
                    </td>
                    <td className="order-amount-cell font-mono font-bold">
                      {formatLKR(order.total_amount)}
                    </td>
                    <td data-testid={`status-badge-${order.id}`}>{getStatusBadge(order.status)}</td>
                    <td>
                      {order.tracking_number ? (
                        <div className="tracking-pill" title={order.courier || 'Courier'}>
                          <Truck size={12} />
                          <span className="font-mono">{order.tracking_number}</span>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Unassigned</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="inspect-btn"
                          onClick={() => setInspectOrder(order)}
                          title="Inspect Order Details"
                          data-testid={`inspect-order-btn-${order.id}`}
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                        <button
                          type="button"
                          className="advance-btn"
                          onClick={() => setTransitionOrder(order)}
                          title="Advance Fulfillment Status"
                          data-testid={`advance-status-btn-${order.id}`}
                        >
                          <SlidersHorizontal size={13} />
                          <span>Advance</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status Transition Modal */}
      <StatusTransitionModal
        isOpen={!!transitionOrder}
        onClose={() => setTransitionOrder(null)}
        order={transitionOrder}
        onConfirm={handleStatusUpdateConfirm}
      />

      {/* Order Inspector Slide-Over Drawer */}
      <OrderInspectorDrawer
        isOpen={!!inspectOrder}
        onClose={() => setInspectOrder(null)}
        order={inspectOrder}
        onOpenStatusModal={(ord) => {
          setInspectOrder(null);
          setTransitionOrder(ord);
        }}
      />
    </div>
  );
}

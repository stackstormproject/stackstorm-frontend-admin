import React, { useState } from 'react';
import {
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  ChevronRight,
  Search,
  ArrowRight,
  Filter,
} from 'lucide-react';
import './RecentOrdersTable.css';

export default function RecentOrdersTable({ orders = [], onUpdateStatus }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const norm = (status || '').toLowerCase().trim();
    switch (norm) {
      case 'placed':
        return <span className="status-badge badge-placed"><Clock size={12} /> Placed</span>;
      case 'processing':
        return <span className="status-badge badge-processing"><ShoppingBag size={12} /> Processing</span>;
      case 'shipped':
        return <span className="status-badge badge-shipped"><Truck size={12} /> Shipped</span>;
      case 'delivered':
        return <span className="status-badge badge-delivered"><CheckCircle2 size={12} /> Delivered</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const getNextStatusAction = (currentStatus) => {
    const norm = (currentStatus || '').toLowerCase().trim();
    switch (norm) {
      case 'placed':
        return { next: 'processing', label: 'Start Processing', icon: ArrowRight, class: 'action-processing' };
      case 'processing':
        return { next: 'shipped', label: 'Dispatch (Ship)', icon: Truck, class: 'action-shipped' };
      case 'shipped':
        return { next: 'delivered', label: 'Mark Delivered', icon: CheckCircle2, class: 'action-delivered' };
      case 'delivered':
      default:
        return null;
    }
  };

  const handleActionClick = async (orderId, nextStatus) => {
    if (!onUpdateStatus) return;
    setUpdatingId(orderId);
    try {
      await onUpdateStatus(orderId, nextStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatLKR = (val) => {
    return `LKR ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="recent-orders-card" data-testid="recent-orders-table">
      {/* Table Header Controls */}
      <div className="orders-table-header">
        <div className="orders-table-title-group">
          <div className="orders-title-icon">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h2 className="orders-heading">Recent Apparel Orders (10 Latest)</h2>
            <p className="orders-sub">Real-time order fulfillment & dispatch velocity</p>
          </div>
        </div>

        {/* Quick Search & Status Filter */}
        <div className="orders-controls">
          <div className="orders-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search order #, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="orders-search-input"
              aria-label="Search Orders"
            />
          </div>

          <div className="orders-status-filter">
            <Filter size={14} style={{ color: 'var(--admin-text-subtle)' }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="orders-filter-select"
              aria-label="Filter Orders by Status"
            >
              <option value="all">All Statuses</option>
              <option value="placed">Placed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Orders Table */}
      <div className="table-responsive-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Placed Timestamp</th>
              <th>Fulfillment Status</th>
              <th style={{ textAlign: 'right' }}>Quick Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-orders-cell">
                  No customer orders match the current filter.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const action = getNextStatusAction(order.status);
                const isUpdating = updatingId === order.id;

                return (
                  <tr key={order.id} className="order-row">
                    <td className="order-number-cell">
                      <span className="order-number">{order.order_number}</span>
                    </td>
                    <td>
                      <div className="customer-info">
                        <span className="customer-name">{order.customer_name}</span>
                        <span className="customer-email">{order.customer_email}</span>
                      </div>
                    </td>
                    <td>
                      <span className="items-badge">{order.items_count} items</span>
                    </td>
                    <td className="order-amount-cell">
                      {order.total_formatted || formatLKR(order.total_amount)}
                    </td>
                    <td className="order-time-cell">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{getStatusBadge(order.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {action ? (
                        <button
                          className={`action-btn ${action.class}`}
                          disabled={isUpdating}
                          onClick={() => handleActionClick(order.id, action.next)}
                          title={`Transition order to ${action.next}`}
                          data-testid={`action-btn-${order.id}`}
                        >
                          {isUpdating ? (
                            'Updating...'
                          ) : (
                            <>
                              <span>{action.label}</span>
                              <action.icon size={13} />
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="fulfilled-tag">
                          <CheckCircle2 size={13} /> Fulfilled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

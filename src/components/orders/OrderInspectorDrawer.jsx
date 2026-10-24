import React from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Package,
  Truck,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import './OrderInspectorDrawer.css';

export default function OrderInspectorDrawer({ isOpen, onClose, order, onOpenStatusModal }) {
  if (!isOpen || !order) return null;

  const formatLKR = (val) =>
    `LKR ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="drawer-backdrop" onClick={onClose} data-testid="order-inspector-drawer">
      <div className="inspector-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div>
            <span className="drawer-kicker">Order Fulfillment Inspector</span>
            <h2 className="drawer-title" data-testid="drawer-order-number">
              {order.order_number}
            </h2>
          </div>
          <button onClick={onClose} className="drawer-close-btn" aria-label="Close Inspector">
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Status & Quick Action Hero */}
          <div className="inspector-hero-card">
            <div className="hero-status-row">
              <span className="hero-status-label">Current Stage:</span>
              <span className={`status-pill pill-${(order.status || '').toLowerCase()}`}>
                {(order.status || '').toUpperCase()}
              </span>
            </div>
            {order.tracking_number && (
              <div className="hero-tracking-row">
                <Truck size={14} />
                <span>
                  Tracking: <strong>{order.tracking_number}</strong> ({order.courier || 'Courier'})
                </span>
              </div>
            )}
            <button
              type="button"
              className="advance-stage-btn"
              onClick={() => {
                if (onOpenStatusModal) onOpenStatusModal(order);
              }}
              data-testid="drawer-advance-status-btn"
            >
              <SlidersHorizontal size={14} />
              <span>Advance Fulfillment Stage</span>
            </button>
          </div>

          {/* Customer & Delivery Coordinates */}
          <div className="drawer-section">
            <h3 className="section-title">Customer & Delivery Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Customer Name</span>
                <span className="info-val" data-testid="drawer-customer-name">
                  {order.customer?.name || 'Customer'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Email Address</span>
                <span className="info-val">{order.customer?.email || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone Contact</span>
                <span className="info-val">{order.customer?.phone || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Payment Mode</span>
                <span className="info-val font-mono">
                  {order.payment_method?.toUpperCase() || 'CARD'}
                </span>
              </div>
            </div>
            <div className="address-box">
              <MapPin size={16} className="address-icon" />
              <span>{order.customer?.address || 'Matara, Southern Province, Sri Lanka'}</span>
            </div>
          </div>

          {/* Ordered Line Items */}
          <div className="drawer-section">
            <h3 className="section-title">Purchased Apparel Items ({order.items?.length || 0})</h3>
            <div className="items-list">
              {(order.items || []).map((item, idx) => (
                <div key={item.id || idx} className="item-row">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="item-thumb" />
                  ) : (
                    <div className="item-thumb-fallback">
                      <Package size={16} />
                    </div>
                  )}
                  <div className="item-details">
                    <span className="item-title">{item.title}</span>
                    <span className="item-meta">
                      SKU: <code>{item.sku}</code> • {item.color} • Size {item.size}
                    </span>
                  </div>
                  <div className="item-pricing">
                    <span className="item-qty">Qty: {item.quantity}</span>
                    <span className="item-price">{formatLKR(item.unit_price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Bar */}
            <div className="drawer-total-bar">
              <span>Total Order Amount:</span>
              <span className="total-amount font-mono" data-testid="drawer-order-total">
                {formatLKR(order.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

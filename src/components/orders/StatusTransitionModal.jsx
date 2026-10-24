import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle2, Clock, ShoppingBag, AlertCircle, ArrowRight } from 'lucide-react';
import './StatusTransitionModal.css';

const COURIER_PARTNERS = [
  'Sri Lanka Post EMS',
  'Prompt Xpress',
  'Certis Lanka Courier',
  'Pronto Lanka',
  'Domex Express',
  'Direct Atelier Delivery (Matara/Dickwella)',
];

export default function StatusTransitionModal({
  isOpen,
  onClose,
  order,
  targetStatus: initialTargetStatus,
  onConfirm,
}) {
  const [targetStatus, setTargetStatus] = useState(initialTargetStatus || 'processing');
  const [courier, setCourier] = useState(COURIER_PARTNERS[0]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      const current = (order.status || '').toLowerCase().trim();
      let defaultTarget = 'processing';
      if (current === 'pending' || current === 'paid') defaultTarget = 'processing';
      else if (current === 'processing') defaultTarget = 'shipped';
      else if (current === 'shipped') defaultTarget = 'delivered';

      setTargetStatus(initialTargetStatus || defaultTarget);
      setTrackingNumber(order.tracking_number || '');
      setCourier(order.courier || COURIER_PARTNERS[0]);
      setNotes('');
      setError('');
    }
  }, [isOpen, order, initialTargetStatus]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (targetStatus === 'shipped' && (!trackingNumber || trackingNumber.trim() === '')) {
      setError('Please provide a courier tracking code for customer delivery tracking.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Failure recovery: Guarantee delivered_at timestamp is present when status is 'delivered'
      const delivered_at = targetStatus === 'delivered' ? new Date().toISOString() : null;

      await onConfirm({
        orderId: order.id,
        status: targetStatus,
        tracking_number: trackingNumber.trim(),
        courier,
        notes: notes.trim(),
        delivered_at,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="status-modal-backdrop" onClick={onClose} data-testid="status-transition-modal">
      <div
        className="status-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transition-modal-title"
      >
        {/* Header */}
        <div className="status-modal-header">
          <div className="modal-title-group">
            <div className="status-icon-box">
              <Truck size={20} />
            </div>
            <div>
              <h2 id="transition-modal-title" className="status-modal-title">
                Advance Order Fulfillment
              </h2>
              <span className="order-id-badge">{order.order_number}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close Modal"
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        {/* Customer Context Strip */}
        <div className="order-context-strip">
          <div>
            <span className="context-label">Customer:</span>
            <span className="context-val">{order.customer?.name || 'Customer'}</span>
          </div>
          <div>
            <span className="context-label">Items:</span>
            <span className="context-val">{order.items?.length || 1} item(s)</span>
          </div>
          <div>
            <span className="context-label">Total Amount:</span>
            <span className="context-val font-mono">
              LKR{' '}
              {Number(order.total_amount || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="status-form">
          {/* Status Progression Visualizer */}
          <div className="progression-selector-group">
            <label className="form-label">Target Fulfillment Stage</label>
            <div className="status-radio-grid">
              {['processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`status-select-btn ${targetStatus === st ? `active ${st}` : ''}`}
                  onClick={() => {
                    setTargetStatus(st);
                    setError('');
                  }}
                  data-testid={`select-status-${st}`}
                >
                  <span className="status-btn-text">{st.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Shipped Specific Inputs: Courier & Tracking Number */}
          {targetStatus === 'shipped' && (
            <div className="shipped-fields-box">
              <div className="form-group">
                <label className="form-label" htmlFor="courier-select">
                  Courier Delivery Partner
                </label>
                <select
                  id="courier-select"
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  className="modal-input"
                  data-testid="courier-select"
                >
                  {COURIER_PARTNERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="tracking-number-input">
                  Tracking Code / Waybill Number <span className="required-star">*</span>
                </label>
                <input
                  id="tracking-number-input"
                  type="text"
                  placeholder="e.g. SLPOST-81100-01"
                  value={trackingNumber}
                  onChange={(e) => {
                    setTrackingNumber(e.target.value);
                    setError('');
                  }}
                  className="modal-input font-mono"
                  data-testid="tracking-number-input"
                  required
                />
              </div>
            </div>
          )}

          {/* Delivered Specific Notice */}
          {targetStatus === 'delivered' && (
            <div className="delivered-notice-box" data-testid="delivered-notice">
              <CheckCircle2 size={18} color="var(--admin-success, #10B981)" />
              <div>
                <div className="notice-title">30-Day Return Eligibility Anchor</div>
                <div className="notice-sub">
                  Delivered timestamp will be permanently logged as{' '}
                  <strong>{new Date().toLocaleString()}</strong>. Customer 30-day return window
                  activates from this moment.
                </div>
              </div>
            </div>
          )}

          {/* Internal Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="fulfillment-notes">
              Internal Dispatch Notes (Optional)
            </label>
            <textarea
              id="fulfillment-notes"
              rows={2}
              placeholder="e.g., Handed over to courier driver at Matara depot."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="modal-textarea"
              data-testid="fulfillment-notes-input"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="modal-error-alert" role="alert" data-testid="status-modal-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
              data-testid="confirm-status-transition-btn"
            >
              <span>
                {isSubmitting ? 'Updating...' : `Confirm: Mark as ${targetStatus.toUpperCase()}`}
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

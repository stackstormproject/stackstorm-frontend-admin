import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, AlertCircle, CheckCircle2, ShieldCheck, Package } from 'lucide-react';
import './StockAdjustmentModal.css';

export const AUDIT_REASONS = [
  { value: 'Restock Shipment Received', label: 'Restock Shipment Received (Vendor Delivery)' },
  {
    value: 'Cycle Count Audit Correction',
    label: 'Cycle Count Audit Correction (Physical Inventory)',
  },
  { value: 'Damaged Garment Write-off', label: 'Damaged / Defective Garment Write-off' },
  { value: 'Customer Exchange Return', label: 'Customer Return / Exchange Restock' },
  { value: 'Warehouse Transfer', label: 'Central Warehouse Stock Transfer' },
  { value: 'Other Operational Adjustment', label: 'Other Operational Adjustment' },
];

export default function StockAdjustmentModal({ isOpen, onClose, product, variant, onSubmit }) {
  const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' | 'subtract'
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState(AUDIT_REASONS[0].value);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAdjustmentType('add');
      setQuantity(1);
      setReason(AUDIT_REASONS[0].value);
      setNotes('');
      setError('');
    }
  }, [isOpen, variant]);

  if (!isOpen || !variant) return null;

  const currentOnHand = Number(variant.stock_quantity || 0);
  const currentReserved = Number(variant.reserved_quantity || 0);
  const currentAvailable = Math.max(0, currentOnHand - currentReserved);

  const delta = adjustmentType === 'add' ? Number(quantity) : -Number(quantity);
  const resultingOnHand = currentOnHand + delta;
  const resultingAvailable = resultingOnHand - currentReserved;

  const handleQuantityChange = (val) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setQuantity(num);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (quantity <= 0) {
      setError('Adjustment quantity must be at least 1 unit.');
      return;
    }

    // Enforce failure recovery constraint: newStock >= 0
    if (resultingOnHand < 0) {
      setError(
        `Negative stock adjustment permitted check failed: Resulting stock cannot be less than zero. Maximum units you can subtract is ${currentOnHand}.`
      );
      return;
    }

    if (!reason || reason.trim() === '') {
      setError('Audit reason is mandatory for inventory compliance.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({
          sku: variant.sku,
          delta,
          reason,
          notes,
          newStockLevel: resultingOnHand,
          variantId: variant.id,
          productId: product?.id,
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply stock adjustment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="stock-adjustment-modal">
      <div
        className="stock-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-modal-title"
      >
        {/* Header */}
        <div className="stock-modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Package size={20} />
            </div>
            <div>
              <h2 id="stock-modal-title" className="stock-modal-title">
                Adjust SKU Inventory Stock
              </h2>
              <span className="sku-badge">{variant.sku}</span>
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

        {/* Product & Variant Context */}
        <div className="garment-context-bar">
          <div>
            <div className="garment-title">{product?.title || 'Garment Item'}</div>
            <div className="garment-attributes">
              <span>
                Color: <strong>{variant.color}</strong>
              </span>
              <span>•</span>
              <span>
                Size: <strong>{variant.size}</strong>
              </span>
            </div>
          </div>
          <div className="current-stock-pills">
            <div className="stock-pill">
              <span className="pill-label">On-Hand</span>
              <span className="pill-val">{currentOnHand}</span>
            </div>
            <div className="stock-pill">
              <span className="pill-label">Reserved</span>
              <span className="pill-val">{currentReserved}</span>
            </div>
            <div className="stock-pill highlight-pill">
              <span className="pill-label">Available</span>
              <span className="pill-val">{currentAvailable}</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="adjustment-form">
          {/* Add / Subtract Direction Toggle */}
          <div className="type-toggle-group" role="radiogroup" aria-label="Adjustment Type">
            <button
              type="button"
              className={`type-toggle-btn ${adjustmentType === 'add' ? 'active add' : ''}`}
              onClick={() => {
                setAdjustmentType('add');
                setError('');
              }}
              data-testid="toggle-add-stock"
            >
              <Plus size={16} />
              <span>Add Stock (+ Units)</span>
            </button>
            <button
              type="button"
              className={`type-toggle-btn ${adjustmentType === 'subtract' ? 'active subtract' : ''}`}
              onClick={() => {
                setAdjustmentType('subtract');
                setError('');
              }}
              data-testid="toggle-subtract-stock"
            >
              <Minus size={16} />
              <span>Subtract Stock (- Units)</span>
            </button>
          </div>

          {/* Quantity Stepper Input */}
          <div className="form-group">
            <label className="form-label" htmlFor="stock-qty-input">
              Quantity to {adjustmentType === 'add' ? 'Add' : 'Deduct'}
            </label>
            <div className="qty-stepper-row">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <input
                id="stock-qty-input"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="qty-number-input"
                data-testid="stock-qty-input"
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => handleQuantityChange(quantity + 1)}
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Quick Increment Chips */}
            <div className="quick-qty-chips">
              {[5, 10, 25, 50].map((chipVal) => (
                <button
                  key={chipVal}
                  type="button"
                  className="quick-chip"
                  onClick={() => handleQuantityChange(chipVal)}
                >
                  +{chipVal}
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Resulting Stock Preview */}
          <div className="resulting-preview-box">
            <div className="preview-item">
              <span className="preview-label">Resulting Physical On-Hand:</span>
              <span
                className={`preview-val ${resultingOnHand < 0 ? 'preview-danger' : 'preview-success'}`}
                data-testid="resulting-onhand"
              >
                {resultingOnHand} units
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Resulting Available to Sell:</span>
              <span
                className={`preview-val ${resultingAvailable < 5 ? 'preview-warning' : 'preview-neutral'}`}
                data-testid="resulting-available"
              >
                {resultingAvailable} units
              </span>
            </div>
          </div>

          {/* Audit Reason Selection (Mandatory) */}
          <div className="form-group">
            <label className="form-label" htmlFor="audit-reason-select">
              Mandatory Audit Reason <span className="required-star">*</span>
            </label>
            <select
              id="audit-reason-select"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              className="audit-reason-select"
              data-testid="audit-reason-select"
              required
            >
              {AUDIT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Audit Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="audit-notes-input">
              Internal Compliance Notes (Optional)
            </label>
            <textarea
              id="audit-notes-input"
              rows={2}
              placeholder="e.g., PO #44891 arrived from Colombo handloom mill."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="audit-notes-textarea"
              data-testid="audit-notes-input"
            />
          </div>

          {/* Validation Error Alert */}
          {(error || resultingOnHand < 0) && (
            <div className="modal-error-alert" role="alert" data-testid="stock-modal-error">
              <AlertCircle size={16} />
              <span>
                {error ||
                  `Negative stock adjustment permitted check failed: Resulting stock cannot be less than zero. Maximum units you can subtract is ${currentOnHand}.`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || resultingOnHand < 0}
              data-testid="submit-stock-adjustment-btn"
            >
              <ShieldCheck size={16} />
              <span>
                {isSubmitting ? 'Recording Adjustment...' : 'Confirm & Commit Adjustment'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

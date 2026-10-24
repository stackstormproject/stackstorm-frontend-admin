import React, { useState, useEffect } from 'react';
import { Award, Plus, Minus, X, AlertCircle } from 'lucide-react';
import './PointsAdjustmentModal.css';

export const REASON_OPTIONS = [
  'Customer Service Goodwill / CS Resolution',
  'Order Delivery Delay Compensation',
  'Garment Defect Resolution',
  'Promotional VIP Bonus',
  'Manual Balance Correction / Reversal',
];

export default function PointsAdjustmentModal({
  isOpen = false,
  account = null,
  onClose,
  onSubmit,
}) {
  const [adjustmentType, setAdjustmentType] = useState('add'); // 'add' | 'deduct'
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState(REASON_OPTIONS[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAdjustmentType('add');
      setPoints('');
      setReason(REASON_OPTIONS[0]);
      setNotes('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  const currentPoints = account.points_balance || 0;
  const numericPoints = Math.max(0, parseInt(points, 10) || 0);
  const delta = adjustmentType === 'add' ? numericPoints : -numericPoints;
  const resultingBalance = Math.max(0, currentPoints + delta);

  const handleChipClick = (amount) => {
    setError('');
    setPoints(String(amount));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedPoints = parseInt(points, 10);
    if (!parsedPoints || parsedPoints <= 0) {
      setError('Please specify a positive point amount.');
      return;
    }

    if (adjustmentType === 'deduct' && currentPoints - parsedPoints < 0) {
      setError(`Cannot deduct more points than customer balance (${currentPoints} pts available).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const pointsDelta = adjustmentType === 'add' ? parsedPoints : -parsedPoints;
      await onSubmit({
        customerId: account.customer_id || account.id,
        pointsDelta,
        reason,
        notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply points adjustment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      data-testid="points-adjustment-modal"
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-box">
              <Award size={20} />
            </div>
            <div>
              <h3 className="modal-title">Goodwill Points Adjustment</h3>
              <p className="modal-subtitle">Customer Care &amp; Retention Override</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Customer Summary Bar */}
          <div className="customer-summary-bar">
            <div className="summary-meta">
              <span className="summary-name">{account.customer_name}</span>
              <span className="summary-email">{account.customer_email}</span>
            </div>
            <div className="summary-balance">
              <span className="balance-label">Current Balance</span>
              <span className="balance-value">{currentPoints} pts</span>
            </div>
          </div>

          {/* Direction Toggle (Credit / Debit) */}
          <div className="direction-toggle" role="group" aria-label="Adjustment direction">
            <button
              type="button"
              className={`toggle-btn ${adjustmentType === 'add' ? 'active-add' : ''}`}
              onClick={() => {
                setAdjustmentType('add');
                setError('');
              }}
              data-testid="btn-type-add"
            >
              <Plus size={14} />
              <span>Credit (+) Points</span>
            </button>
            <button
              type="button"
              className={`toggle-btn ${adjustmentType === 'deduct' ? 'active-deduct' : ''}`}
              onClick={() => {
                setAdjustmentType('deduct');
                setError('');
              }}
              data-testid="btn-type-deduct"
            >
              <Minus size={14} />
              <span>Debit (-) Points</span>
            </button>
          </div>

          {/* Points Input & Quick Increment Chips */}
          <div className="form-group">
            <label className="form-label" htmlFor="points-amount-input">
              Points Amount
            </label>
            <div className="input-with-preview">
              <input
                id="points-amount-input"
                type="number"
                min="1"
                placeholder="e.g. 250"
                value={points}
                onChange={(e) => {
                  setPoints(e.target.value);
                  setError('');
                }}
                className="points-input"
                data-testid="points-input"
              />
            </div>

            <div className="chips-row">
              {[50, 100, 250, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="chip-btn"
                  onClick={() => handleChipClick(amt)}
                  data-testid={`chip-${amt}`}
                >
                  +{amt} pts
                </button>
              ))}
            </div>
          </div>

          {/* Resulting Balance Preview */}
          <div className="preview-box">
            <span className="preview-label">Projected Customer Balance:</span>
            <span className="preview-tag" data-testid="preview-resulting-balance">
              {resultingBalance} pts
            </span>
          </div>

          {/* Reason Select */}
          <div className="form-group">
            <label className="form-label" htmlFor="adjustment-reason">
              Audit Reason
            </label>
            <select
              id="adjustment-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="select-field"
              data-testid="adjustment-reason-select"
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Internal Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="adjustment-notes">
              Internal Case Notes (Optional)
            </label>
            <textarea
              id="adjustment-notes"
              rows="2"
              placeholder="e.g., Authorized by Manager Lakshani for order delay."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="textarea-field"
              data-testid="adjustment-notes-input"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="modal-error" role="alert" data-testid="modal-error-alert">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={isSubmitting}
              data-testid="apply-points-btn"
            >
              {isSubmitting ? 'Applying...' : 'Apply Points Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

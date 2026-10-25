import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  product = null,
  isDeleting = false,
}) {
  if (!isOpen || !product) return null;

  return (
    <div
      className="product-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="delete-modal-container">
        <div className="delete-modal-header">
          <div className="delete-icon-box">
            <AlertTriangle size={24} />
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="delete-modal-body">
          <h3 id="delete-modal-title" className="delete-modal-title">
            Remove Product From Catalog?
          </h3>
          <p className="delete-modal-text">
            Are you sure you want to remove{' '}
            <strong className="delete-highlight">{product.name}</strong> (ID: {product.id})?
            This will purge the garment and associated SKUs from public listing.
          </p>
        </div>

        <div className="delete-modal-footer">
          <button
            type="button"
            className="modal-cancel-btn"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-delete-confirm-btn"
            onClick={() => onConfirm(product.id)}
            disabled={isDeleting}
            data-testid="confirm-delete-product-btn"
          >
            <Trash2 size={15} />
            <span>{isDeleting ? 'Deleting...' : 'Delete Product'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

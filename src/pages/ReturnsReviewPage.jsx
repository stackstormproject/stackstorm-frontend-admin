import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Camera,
  X,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { adminOrdersApi, FALLBACK_ADMIN_RETURNS } from '../api/adminOrders.api';
import './ReturnsReviewPage.css';

export default function ReturnsReviewPage() {
  const [returnsList, setReturnsList] = useState(FALLBACK_ADMIN_RETURNS);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Image lightbox preview
  const [activePhoto, setActivePhoto] = useState(null);

  // Reject modal
  const [rejectingReturn, setRejectingReturn] = useState(null);
  const [rejectReason, setRejectReason] = useState('Garment worn or tags removed');

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const data = await adminOrdersApi.getReturns();
      if (Array.isArray(data) && data.length > 0) {
        setReturnsList(data);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleApprove = async (ret) => {
    // 1. Optimistic update
    setReturnsList((prev) => prev.map((r) => (r.id === ret.id ? { ...r, status: 'approved' } : r)));

    // 2. Dispatch API
    await adminOrdersApi.approveReturn(ret.id, { restock: true });

    // 3. Toast
    const actionLabel = ret.type === 'exchange' ? 'Exchange Authorized' : 'Return Approved';
    setToastMessage(
      `${actionLabel} for reference ${ret.return_reference}. Inventory restock triggered.`
    );
    setTimeout(() => setToastMessage(''), 4500);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingReturn) return;
    const retId = rejectingReturn.id;
    const ref = rejectingReturn.return_reference;

    // 1. Optimistic update
    setReturnsList((prev) =>
      prev.map((r) => (r.id === retId ? { ...r, status: 'rejected', reason: rejectReason } : r))
    );

    setRejectingReturn(null);

    // 2. Dispatch API
    await adminOrdersApi.rejectReturn(retId, { reason: rejectReason });

    // 3. Toast
    setToastMessage(`Return request ${ref} rejected. Customer notified.`);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Filter
  const filteredReturns = returnsList.filter((r) => {
    const matchesStatus =
      selectedStatus === 'all' || (r.status || '').toLowerCase() === selectedStatus.toLowerCase();
    const matchesSearch =
      (r.return_reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.order_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.item_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.reason || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="returns-page-container" data-testid="returns-review-page">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="returns-toast" role="alert" data-testid="returns-toast">
          <Sparkles size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="returns-header">
        <div>
          <div className="returns-kicker">
            <span className="kicker-badge">Reverse Logistics & Customer Care</span>
            <span className="kicker-tag">30-Day Policy Audit Console</span>
          </div>
          <h1 className="returns-title">30-Day Return & Exchange Approvals</h1>
          <p className="returns-subtitle">
            Inspect photographic proof, audit return eligibility within 30 days of delivery, and
            approve refunds or variant exchanges.
          </p>
        </div>

        <div className="returns-header-actions">
          <button
            type="button"
            className="sync-btn"
            onClick={fetchReturns}
            disabled={isLoading}
            data-testid="sync-returns-btn"
          >
            <RefreshCw size={14} className={isLoading ? 'spinning' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync Requests'}</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tab Pills */}
      <div className="status-filter-pills-bar" role="tablist" aria-label="Return Status Filters">
        {['all', 'pending', 'approved', 'rejected'].map((st) => {
          const count =
            st === 'all'
              ? returnsList.length
              : returnsList.filter((r) => (r.status || '').toLowerCase() === st).length;

          return (
            <button
              key={st}
              role="tab"
              aria-selected={selectedStatus === st}
              className={`status-tab-btn ${selectedStatus === st ? 'active' : ''}`}
              onClick={() => setSelectedStatus(st)}
              data-testid={`return-filter-tab-${st}`}
            >
              <span>{st.toUpperCase()}</span>
              <span className="tab-count-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table Card */}
      <div className="returns-table-card">
        {/* Search */}
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search reference, order #, customer, garment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              aria-label="Search Returns"
              data-testid="returns-search-input"
            />
          </div>
          <div className="toolbar-count">
            Showing {filteredReturns.length} of {returnsList.length} Return Requests
          </div>
        </div>

        {/* Responsive Table */}
        <div className="table-responsive-wrapper">
          <table className="returns-table">
            <thead>
              <tr>
                <th>Reference / Order</th>
                <th>Customer</th>
                <th>Garment & Exchange Details</th>
                <th>Type</th>
                <th>Reason & Notes</th>
                <th>Photo Proof</th>
                <th>Approval Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    No return or exchange requests match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="return-row" data-testid={`return-row-${ret.id}`}>
                    <td className="ref-cell">
                      <span className="ref-number font-mono">{ret.return_reference}</span>
                      <span className="order-sub font-mono">{ret.order_number}</span>
                      <span className="delivery-window-tag">
                        Delivered {ret.days_since_delivery || 10}d ago (
                        {30 - (ret.days_since_delivery || 10)}d left)
                      </span>
                    </td>
                    <td>
                      <div className="customer-info">
                        <span className="customer-name">{ret.customer_name}</span>
                        <span className="customer-email">{ret.customer_email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="garment-info">
                        <span className="garment-title">{ret.item_title}</span>
                        <span className="variant-info">
                          Original: <code>{ret.original_variant?.sku}</code> (
                          {ret.original_variant?.size})
                        </span>
                        {ret.exchange_variant && (
                          <div className="exchange-info">
                            <ArrowRight size={11} color="var(--admin-primary)" />
                            <span>
                              Exchange to: <code>{ret.exchange_variant.sku}</code> (
                              {ret.exchange_variant.size})
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`type-pill ${ret.type === 'exchange' ? 'type-exchange' : 'type-return'}`}
                      >
                        {ret.type === 'exchange' ? 'Size Exchange' : 'Return (Refund)'}
                      </span>
                    </td>
                    <td className="reason-cell">
                      <span className="reason-text">{ret.reason}</span>
                      {ret.customer_notes && (
                        <span className="notes-text">"{ret.customer_notes}"</span>
                      )}
                    </td>
                    <td>
                      {ret.photo_url ? (
                        <button
                          type="button"
                          className="photo-thumb-btn"
                          onClick={() => setActivePhoto(ret.photo_url)}
                          title="Click to zoom customer photographic evidence"
                          data-testid={`photo-thumb-btn-${ret.id}`}
                        >
                          <img src={ret.photo_url} alt="Proof" className="proof-thumb" />
                          <Camera size={11} className="camera-overlay" />
                        </button>
                      ) : (
                        <span className="text-muted text-xs">No photo</span>
                      )}
                    </td>
                    <td data-testid={`return-status-${ret.id}`}>
                      {ret.status === 'approved' && (
                        <span className="status-pill pill-approved">
                          <CheckCircle2 size={11} /> APPROVED
                        </span>
                      )}
                      {ret.status === 'rejected' && (
                        <span className="status-pill pill-rejected">
                          <XCircle size={11} /> REJECTED
                        </span>
                      )}
                      {ret.status === 'pending' && (
                        <span className="status-pill pill-pending">
                          <Clock size={11} /> PENDING REVIEW
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {ret.status === 'pending' ? (
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="approve-btn"
                            onClick={() => handleApprove(ret)}
                            title={
                              ret.type === 'exchange'
                                ? 'Authorize garment size exchange'
                                : 'Approve return for refund'
                            }
                            data-testid={`approve-return-btn-${ret.id}`}
                          >
                            <CheckCircle2 size={13} />
                            <span>
                              {ret.type === 'exchange' ? 'Authorize Exchange' : 'Approve Return'}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="reject-btn"
                            onClick={() => setRejectingReturn(ret)}
                            title="Reject return request"
                            data-testid={`reject-return-btn-${ret.id}`}
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="decision-final-tag">
                          {ret.status === 'approved' ? 'Processed' : 'Closed'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photographic Proof Lightbox Modal */}
      {activePhoto && (
        <div
          className="lightbox-backdrop"
          onClick={() => setActivePhoto(null)}
          data-testid="photo-lightbox"
        >
          <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <span className="lightbox-title">Customer Photographic Evidence</span>
              <button onClick={() => setActivePhoto(null)} className="lightbox-close-btn">
                <X size={18} />
              </button>
            </div>
            <img src={activePhoto} alt="Customer Proof" className="lightbox-image" />
          </div>
        </div>
      )}

      {/* Reject Justification Modal */}
      {rejectingReturn && (
        <div
          className="lightbox-backdrop"
          onClick={() => setRejectingReturn(null)}
          data-testid="reject-modal"
        >
          <div className="reject-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="reject-header">
              <AlertTriangle size={20} color="var(--admin-danger)" />
              <h3 className="reject-title">
                Reject Return Request ({rejectingReturn.return_reference})
              </h3>
            </div>
            <p className="reject-desc">
              Please specify the audit justification for rejecting customer{' '}
              <strong>{rejectingReturn.customer_name}</strong>'s request.
            </p>
            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="reject-select"
                data-testid="reject-reason-select"
              >
                <option value="Garment worn or tags removed">
                  Garment worn or tags removed (Policy violation)
                </option>
                <option value="Return requested past 30-day delivered window">
                  Return requested past 30-day delivered window
                </option>
                <option value="Garment is marked as Final Sale">
                  Garment is marked as Final Sale
                </option>
                <option value="Photo evidence does not show reported defect">
                  Photo evidence does not show reported defect
                </option>
                <option value="Other Policy Ineligibility">Other Policy Ineligibility</option>
              </select>
            </div>
            <div className="reject-actions">
              <button type="button" className="cancel-btn" onClick={() => setRejectingReturn(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="confirm-reject-btn"
                onClick={handleRejectConfirm}
                data-testid="confirm-reject-btn"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

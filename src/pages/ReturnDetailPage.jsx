import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getReturn } from '../api/returns';
import { useResource } from '../hooks/useResource';
import { useToast } from '../state/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorState, LoadingState } from '../components/ui/States';
import { ReturnActionDialog } from '../components/returns/ReturnActionDialog';
import { formatDate, formatDateTime, formatMoney, humanize } from '../lib/format';

const RETURN_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIONS = {
  requested: [
    { action: 'approve', label: 'Approve', primary: true },
    { action: 'reject', label: 'Reject' },
  ],
  approved: [
    { action: 'receive', label: 'Record returned parcel', primary: true },
    { action: 'reject', label: 'Reject' },
  ],
};

const DONE_MESSAGES = {
  approve: 'Request approved. The customer can send the item back.',
  reject: 'Request rejected. The customer can see your reason.',
};

/** Days between delivery and the request; null when the order has no delivery date. */
const daysAfterDelivery = (request) => {
  if (!request.order.delivery_date) return null;
  return Math.floor(
    (new Date(request.created_at) - new Date(request.order.delivery_date)) / DAY_MS
  );
};

export default function ReturnDetailPage() {
  const { returnId } = useParams();
  const request = useResource(() => getReturn(returnId), [returnId]);
  const [action, setAction] = useState(null);
  const toast = useToast();

  if (request.loading && !request.data) return <LoadingState label="Loading the request" />;
  if (request.error) {
    return (
      <ErrorState
        level={1}
        title={request.error.status === 404 ? 'Return not found' : 'The return could not be loaded'}
        error={request.error}
        onRetry={request.error.status === 404 ? undefined : request.reload}
      />
    );
  }

  const { data } = request;
  const days = daysAfterDelivery(data);

  const handleDone = (result) => {
    const done = action;
    setAction(null);
    request.reload();
    if (done !== 'receive') {
      toast.success(DONE_MESSAGES[done]);
    } else if (result.status === 'rejected') {
      toast.success('Item rejected after inspection. Nothing was refunded.');
    } else if (result.type === 'exchange') {
      toast.success('Item restocked and the replacement taken from stock.');
    } else if (result.refund?.refunded) {
      toast.success(`Item restocked and ${formatMoney(result.refund.amount)} refunded.`);
    } else {
      toast.error('Item restocked, but no card refund was made. Refund it from Stripe.');
    }
  };

  return (
    <>
      <PageHeader
        back={{ to: '/returns', label: 'All returns' }}
        eyebrow={`Requested ${formatDateTime(data.created_at)}`}
        title={`${humanize(data.type)} #${data.id}`}
        actions={(ACTIONS[data.status] || []).map((item) => (
          <button
            key={item.action}
            type="button"
            className={`btn ${item.primary ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setAction(item.action)}
          >
            {item.label}
          </button>
        ))}
      />
      <p className="order-status">
        Status <StatusBadge status={data.status} />
      </p>

      {days !== null && days > RETURN_WINDOW_DAYS && data.status === 'requested' && (
        <p className="callout callout--warning" role="note">
          Requested {days} days after delivery, outside the {RETURN_WINDOW_DAYS}-day return window.
        </p>
      )}

      <div className="detail-grid">
        <div className="detail-side">
          <section className="card" aria-labelledby="item-title">
            <h2 id="item-title" className="card__title">
              Returned item
            </h2>
            <dl className="details">
              <dt>Product</dt>
              <dd>{data.item.product_name}</dd>
              <dt>Variant</dt>
              <dd>
                {data.item.size} · {data.item.color} <span className="mono">({data.item.sku})</span>
              </dd>
              <dt>Quantity</dt>
              <dd>{data.item.quantity}</dd>
              <dt>Paid</dt>
              <dd>{formatMoney(data.item.subtotal)}</dd>
              <dt>Reason</dt>
              <dd>{data.reason}</dd>
            </dl>
          </section>

          <section className="card" aria-labelledby="outcome-title">
            <h2 id="outcome-title" className="card__title">
              {data.type === 'exchange' ? 'Exchange' : 'Refund'}
            </h2>
            {data.type === 'exchange' && data.exchange ? (
              <dl className="details">
                <dt>Wants</dt>
                <dd>
                  {data.exchange.size} · {data.exchange.color}
                </dd>
                <dt>In stock</dt>
                <dd>
                  {data.exchange.available}
                  {data.exchange.available < data.item.quantity && data.status !== 'completed' && (
                    <span className="badge badge--warning">Not enough to exchange</span>
                  )}
                </dd>
              </dl>
            ) : (
              <dl className="details">
                <dt>Amount</dt>
                <dd>{formatMoney(data.refund_amount || data.item.subtotal)}</dd>
                <dt>Method</dt>
                <dd>Back to the original card</dd>
              </dl>
            )}
          </section>
        </div>

        <div className="detail-side">
          <section className="card" aria-labelledby="who-title">
            <h2 id="who-title" className="card__title">
              Order and customer
            </h2>
            <dl className="details">
              <dt>Order</dt>
              <dd>
                <Link to={`/orders/${data.order.id}`}>{data.order.invoice_number}</Link>
              </dd>
              <dt>Delivered</dt>
              <dd>
                {formatDate(data.order.delivery_date)}
                {days !== null && (
                  <span className="cell-sub">return requested {days} days later</span>
                )}
              </dd>
              <dt>Customer</dt>
              <dd>
                <Link to={`/customers/${data.customer.id}`}>{data.customer.name}</Link>
                <span className="cell-sub">{data.customer.email}</span>
              </dd>
            </dl>
          </section>

          {(data.admin_note || data.resolved_by) && (
            <section className="card" aria-labelledby="decision-title">
              <h2 id="decision-title" className="card__title">
                Decision
              </h2>
              <dl className="details">
                {data.resolved_by && (
                  <>
                    <dt>By</dt>
                    <dd>{data.resolved_by}</dd>
                  </>
                )}
                {data.resolved_at && (
                  <>
                    <dt>Closed</dt>
                    <dd>{formatDateTime(data.resolved_at)}</dd>
                  </>
                )}
                {data.admin_note && (
                  <>
                    <dt>Note</dt>
                    <dd>{data.admin_note}</dd>
                  </>
                )}
              </dl>
            </section>
          )}
        </div>
      </div>

      {action && (
        <ReturnActionDialog
          request={data}
          action={action}
          onClose={() => setAction(null)}
          onDone={handleDone}
        />
      )}
    </>
  );
}

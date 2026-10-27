import { useState } from 'react';
import { updateOrderStatus } from '../../api/orders';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';
import { formatMoney } from '../../lib/format';

const PAID = ['confirmed', 'processing', 'shipped'];
const TRACKING_PATTERN = /^[A-Za-z0-9-]{4,40}$/;

const copyFor = (order, target) => {
  const pickup = order.shipping_option === 'pickup';
  switch (target) {
    case 'shipped':
      return {
        title: 'Mark as shipped',
        description:
          order.shipping_option === 'pickup'
            ? 'Store pickup: a tracking number is optional.'
            : 'The customer sees the tracking number on their order page.',
        confirm: 'Mark as shipped',
      };
    case 'delivered':
      return {
        title: pickup ? 'Mark as collected' : 'Mark as delivered',
        description: pickup
          ? 'Confirm the customer collected the order at the Dickwella store.'
          : 'Confirm the parcel reached the customer. Delivery starts the 30-day return window.',
        confirm: pickup ? 'Mark as collected' : 'Mark as delivered',
      };
    case 'cancelled':
      return {
        title: 'Cancel order',
        description: PAID.includes(order.status)
          ? `The items go back into stock and ${formatMoney(order.total_amount)} is refunded to the customer's card.`
          : 'The order was never paid. Its stock hold is released; nothing is charged or refunded.',
        confirm: 'Cancel order',
        danger: true,
      };
    default:
      return { title: 'Change status', description: '', confirm: 'Confirm' };
  }
};

/**
 * Confirms one status change. Shipping needs a carrier tracking number; the server enforces
 * the transition rules (#133) and reports the refund for paid cancellations.
 */
export function StatusChangeDialog({ order, target, onClose, onChanged }) {
  const [tracking, setTracking] = useState('');
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState(null);
  const [busy, setBusy] = useState(false);
  const copy = copyFor(order, target || '');

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    const needsTracking = target === 'shipped' && order.shipping_option !== 'pickup';
    if ((needsTracking || tracking.trim()) && !TRACKING_PATTERN.test(tracking.trim())) {
      setFieldError('Enter the tracking number from the courier receipt (4-40 letters or digits).');
      return;
    }
    setFieldError(null);
    setBusy(true);
    try {
      const result = await updateOrderStatus(order.id, {
        status: target,
        trackingNumber: (target === 'shipped' && tracking.trim()) || undefined,
      });
      onChanged(result);
    } catch (apiError) {
      setError(apiError.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(target)}
      title={copy.title}
      description={copy.description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Keep as is
          </button>
          <button
            type="submit"
            form="status-change-form"
            className={`btn ${copy.danger ? 'btn--danger' : 'btn--primary'}`}
            disabled={busy}
          >
            {busy ? 'Saving…' : copy.confirm}
          </button>
        </>
      }
    >
      <form id="status-change-form" onSubmit={submit} noValidate>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {target === 'shipped' && (
          <FormField
            label="Tracking number"
            hint="Sri Lanka Post or courier reference, e.g. RR123456789LK"
            value={tracking}
            onChange={(event) => setTracking(event.target.value)}
            error={fieldError}
            autoComplete="off"
            required={order.shipping_option !== 'pickup'}
          />
        )}
      </form>
    </Dialog>
  );
}

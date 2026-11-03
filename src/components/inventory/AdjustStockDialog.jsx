import { useState } from 'react';
import { adjustStock } from '../../api/inventory';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';

export const ADJUSTMENT_REASONS = [
  { value: 'restock', label: 'Restock from supplier', direction: 'add' },
  { value: 'damaged', label: 'Damaged or faulty', direction: 'remove' },
  { value: 'stock count correction', label: 'Stock count correction', direction: null },
  { value: 'returned to supplier', label: 'Returned to supplier', direction: 'remove' },
  { value: 'other', label: 'Other (explain in the note)', direction: null },
];
const MAX_ADJUSTMENT = 10000;
const MAX_NOTE = 200;

/**
 * Adds or removes stock with a reason; every change is logged with the operator's name.
 * The preview shows the result, and the form refuses to drop below units held in checkouts.
 */
export function AdjustStockDialog({ item, onClose, onAdjusted }) {
  const [direction, setDirection] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('restock');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const amount = Number(quantity);
  const validAmount = Number.isInteger(amount) && amount > 0 && amount <= MAX_ADJUSTMENT;
  const delta = direction === 'add' ? amount : -amount;
  const next = item.stock_quantity + (validAmount ? delta : 0);

  const pickReason = (value) => {
    setReason(value);
    const suggested = ADJUSTMENT_REASONS.find((r) => r.value === value)?.direction;
    if (suggested) setDirection(suggested);
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!validAmount) found.quantity = `Enter a whole number from 1 to ${MAX_ADJUSTMENT}.`;
    else if (next < item.reserved_quantity) {
      found.quantity = `Only ${item.stock_quantity - item.reserved_quantity} can be removed: ${item.reserved_quantity} are held in checkouts.`;
    }
    if (reason === 'other' && !note.trim()) found.note = 'Explain the change.';
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const updated = await adjustStock(item.variant_id, { delta, reason, note: note.trim() });
      onAdjusted(updated, delta);
    } catch (error) {
      setFormError(error.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title={`Adjust stock: ${item.sku}`}
      description={`${item.product_name}, ${item.size}${item.color ? ` · ${item.color}` : ''}. On hand ${item.stock_quantity}, held ${item.reserved_quantity}.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="adjust-form" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save adjustment'}
          </button>
        </>
      }
    >
      <form id="adjust-form" className="stack" onSubmit={submit} noValidate>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <FormField
          as="select"
          label="Reason"
          value={reason}
          onChange={(event) => pickReason(event.target.value)}
        >
          {ADJUSTMENT_REASONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FormField>
        <div className="form-grid">
          <fieldset>
            <legend>Change</legend>
            <div className="segmented">
              {['add', 'remove'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="segmented__option"
                  aria-pressed={direction === value}
                  onClick={() => setDirection(value)}
                >
                  {value === 'add' ? 'Add units' : 'Remove units'}
                </button>
              ))}
            </div>
          </fieldset>
          <FormField
            label="Quantity"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            error={errors.quantity}
          />
        </div>
        <p className="callout" aria-live="polite">
          On hand after saving: <strong>{next}</strong> (
          {Math.max(next - item.reserved_quantity, 0)} available to sell)
        </p>
        <FormField
          as="textarea"
          label={reason === 'other' ? 'Note' : 'Note (optional)'}
          value={note}
          maxLength={MAX_NOTE}
          onChange={(event) => setNote(event.target.value)}
          error={errors.note}
          hint="Saved in the stock history, e.g. supplier invoice number"
        />
      </form>
    </Dialog>
  );
}

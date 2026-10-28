import { useState } from 'react';
import { adjustLoyaltyPoints } from '../../api/customers';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';
import { formatNumber } from '../../lib/format';

const MAX_ADJUSTMENT = 100000;
const NOTE_MAX = 200;

/** Goodwill credit or correction. The reason is shown to the customer in their points history. */
export function PointsDialog({ customer, onClose, onAdjusted }) {
  const [direction, setDirection] = useState('add');
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const amount = Number(points);
  const valid = Number.isInteger(amount) && amount > 0 && amount <= MAX_ADJUSTMENT;
  const change = direction === 'add' ? amount : -amount;
  const balance = customer.points + (valid ? change : 0);

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (!valid) found.points = `Enter a whole number from 1 to ${formatNumber(MAX_ADJUSTMENT)}.`;
    else if (balance < 0) found.points = `Only ${customer.points} points can be removed.`;
    if (!note.trim()) found.note = 'Give a reason; the customer sees it.';
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const updated = await adjustLoyaltyPoints(customer.id, { points: change, note: note.trim() });
      onAdjusted(updated, change);
    } catch (error) {
      setFormError(error.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title="Adjust loyalty points"
      description={`${customer.name} has ${formatNumber(customer.points)} points.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="points-form" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="points-form" className="stack" onSubmit={submit} noValidate>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
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
                  {value === 'add' ? 'Add points' : 'Remove points'}
                </button>
              ))}
            </div>
          </fieldset>
          <FormField
            label="Points"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            error={errors.points}
          />
        </div>
        <p className="callout" aria-live="polite">
          Balance after saving: <strong>{formatNumber(Math.max(balance, 0))}</strong> points
        </p>
        <FormField
          as="textarea"
          label="Reason for the customer"
          value={note}
          maxLength={NOTE_MAX}
          onChange={(event) => setNote(event.target.value)}
          error={errors.note}
          hint="e.g. Goodwill credit for the late delivery of DFC-2026-0011"
        />
      </form>
    </Dialog>
  );
}

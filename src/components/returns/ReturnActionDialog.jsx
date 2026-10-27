import { useState } from 'react';
import { approveReturn, receiveReturn, rejectReturn } from '../../api/returns';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';
import { formatMoney } from '../../lib/format';

const outcomeOf = (request) =>
  request.type === 'exchange'
    ? `${request.item.quantity} × ${request.exchange?.size} · ${request.exchange?.color} is taken from stock and sent to the customer.`
    : `${formatMoney(request.refund_amount || request.item.subtotal)} is refunded to the customer's card.`;

/**
 * One dialog for the three return decisions:
 * - approve: optional instructions for the customer
 * - reject: a reason is required (the customer sees it)
 * - receive: inspect the parcel; acceptable restocks and refunds or exchanges,
 *   not acceptable rejects with a required description
 */
export function ReturnActionDialog({ request, action, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [acceptable, setAcceptable] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const copy = {
    approve: {
      title: 'Approve request',
      description: 'The customer is told to send the item back. Nothing moves until it arrives.',
      confirm: 'Approve',
      noteLabel: 'Message to the customer (optional)',
    },
    reject: {
      title: 'Reject request',
      description: 'The request is closed. The customer sees your reason in their account.',
      confirm: 'Reject request',
      noteLabel: 'Reason for the customer',
    },
    receive: {
      title: 'Record returned parcel',
      description: 'Inspect the item before deciding. This cannot be undone.',
      confirm: 'Save inspection',
      noteLabel:
        acceptable === false ? 'What is wrong with the item' : 'Inspection note (optional)',
    },
  }[action];

  const validate = () => {
    const found = {};
    if (action === 'receive' && acceptable === null) found.acceptable = 'Choose one.';
    const noteRequired = action === 'reject' || (action === 'receive' && acceptable === false);
    if (noteRequired && !note.trim()) found.note = 'Write a short reason; the customer sees it.';
    return found;
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      let result;
      if (action === 'approve') result = await approveReturn(request.id, note.trim() || undefined);
      else if (action === 'reject') result = await rejectReturn(request.id, note.trim());
      else result = await receiveReturn(request.id, { acceptable, note: note.trim() });
      onDone(result);
    } catch (error) {
      setFormError(error.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title={copy.title}
      description={copy.description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Back
          </button>
          <button
            type="submit"
            form="return-action-form"
            className={`btn ${action === 'reject' ? 'btn--danger' : 'btn--primary'}`}
            disabled={busy}
          >
            {busy ? 'Saving…' : copy.confirm}
          </button>
        </>
      }
    >
      <form id="return-action-form" className="stack" onSubmit={submit} noValidate>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        {action === 'receive' && (
          <fieldset aria-describedby={errors.acceptable ? 'acceptable-error' : undefined}>
            <legend>Condition of the returned item</legend>
            <div className="choice-list">
              <label className="choice">
                <input
                  type="radio"
                  name="acceptable"
                  checked={acceptable === true}
                  onChange={() => setAcceptable(true)}
                />
                <span>
                  <strong>Resellable: accept it</strong>
                  <span className="choice__hint">
                    The item goes back into stock. {outcomeOf(request)}
                  </span>
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="acceptable"
                  checked={acceptable === false}
                  onChange={() => setAcceptable(false)}
                />
                <span>
                  <strong>Not acceptable: reject it</strong>
                  <span className="choice__hint">
                    Worn, washed, damaged or missing tags. Nothing is refunded and the item is
                    returned to the customer.
                  </span>
                </span>
              </label>
            </div>
            {errors.acceptable && (
              <p id="acceptable-error" className="field__error">
                {errors.acceptable}
              </p>
            )}
          </fieldset>
        )}
        <FormField
          as="textarea"
          label={copy.noteLabel}
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          error={errors.note}
        />
      </form>
    </Dialog>
  );
}

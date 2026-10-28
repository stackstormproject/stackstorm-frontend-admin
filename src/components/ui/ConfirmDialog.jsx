import { useState } from 'react';
import { Dialog } from './Dialog';

/** Asks before a destructive or hard-to-undo action and shows the server's refusal inline. */
export function ConfirmDialog({ title, description, confirmLabel, danger, onConfirm, onClose }) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (apiError) {
      setError(apiError.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title={title}
      description={description}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            disabled={busy}
            onClick={confirm}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}

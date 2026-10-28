import { useId } from 'react';
import { X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';

/**
 * Accessible modal: labelled by its title, traps focus, closes on Escape and on the close
 * button, and returns focus to the opener. Clicking the backdrop does not close it, so a
 * half-filled form is never lost by a stray click.
 */
export function Dialog({ open, title, description, onClose, children, footer, wide = false }) {
  const titleId = useId();
  const descriptionId = useId();
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <div className="dialog-backdrop">
      <div
        ref={ref}
        className={`dialog ${wide ? 'dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="dialog__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && (
              <p id={descriptionId} className="muted">
                {description}
              </p>
            )}
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="dialog__body">{children}</div>
        {footer && <div className="dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}

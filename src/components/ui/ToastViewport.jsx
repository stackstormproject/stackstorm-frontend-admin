import { useToast } from '../../state/ToastContext';

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.tone}`}
          role={toast.tone === 'error' ? 'alert' : 'status'}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast__close"
            aria-label="Dismiss message"
            onClick={() => dismiss(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

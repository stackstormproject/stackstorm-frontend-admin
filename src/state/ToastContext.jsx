import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);
const DEFAULT_DURATION_MS = 4500;

/** Short, polite status messages ("Order marked as shipped"). Errors use role="alert". */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (message, tone = 'info', duration = DEFAULT_DURATION_MS) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error', 7000),
      info: (message) => show(message, 'info'),
    }),
    [toasts, dismiss, show]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
};

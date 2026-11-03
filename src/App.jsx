import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './state/AuthContext';
import { ToastProvider } from './state/ToastContext';
import { ToastViewport } from './components/ui/ToastViewport';

export function AppProviders({ children, restore }) {
  return (
    <ToastProvider>
      <AuthProvider restore={restore}>
        {children}
        <ToastViewport />
      </AuthProvider>
    </ToastProvider>
  );
}

export default function App({ router }) {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}

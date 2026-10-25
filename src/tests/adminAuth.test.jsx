import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AdminLoginPage from '../pages/AdminLoginPage';
import AdminRoute from '../routes/AdminRoute';
import AdminHeader from '../components/layout/AdminHeader';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext';
import { DEMO_ADMIN_ACCOUNTS } from '../api/adminAuth.api';

describe('Admin Authentication & RBAC Access Enforcement', () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/api/v1/auth/admin/login')) {
        const body = JSON.parse(options.body);
        if (body.password === 'WrongPassword') {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ message: 'Invalid credentials' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              admin: {
                id: 'admin-001',
                name: 'Amarawickrama R.H.',
                email: body.email,
                role: 'admin',
              },
              accessToken: 'mock-jwt-token-xyz',
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it('AC1: should render AdminLoginPage with form controls and quick-fill operator accounts', () => {
    render(
      <AdminAuthProvider>
        <AdminLoginPage />
      </AdminAuthProvider>
    );

    expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();
    expect(screen.getByText(/StackStorm Control Room/i)).toBeInTheDocument();
    expect(screen.getByTestId('admin-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('admin-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('admin-login-submit-btn')).toBeInTheDocument();

    // Verify quick fill accounts
    expect(screen.getByText('Amarawickrama R.H.')).toBeInTheDocument();
    expect(screen.getByText('S. Thanoogithan')).toBeInTheDocument();
  });

  it('AC2: should quick-fill email and password when an operator role is clicked', () => {
    render(
      <AdminAuthProvider>
        <AdminLoginPage />
      </AdminAuthProvider>
    );

    const thanoogithanBtn = screen.getByText('S. Thanoogithan');
    fireEvent.click(thanoogithanBtn);

    const emailInput = screen.getByTestId('admin-email-input');
    expect(emailInput).toHaveValue('inventory@dickwellafashion.lk');
  });

  it('AC3: should display error message when authentication fails', async () => {
    render(
      <AdminAuthProvider>
        <AdminLoginPage />
      </AdminAuthProvider>
    );

    const passInput = screen.getByTestId('admin-password-input');
    fireEvent.change(passInput, { target: { value: 'WrongPassword' } });

    const submitBtn = screen.getByTestId('admin-login-submit-btn');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(screen.getByTestId('login-error-alert')).toBeInTheDocument();
  });

  it('AC4: should authenticate and invoke onLoginSuccess when valid credentials submitted', async () => {
    const handleLoginSuccess = vi.fn();

    render(
      <AdminAuthProvider>
        <AdminLoginPage onLoginSuccess={handleLoginSuccess} />
      </AdminAuthProvider>
    );

    const submitBtn = screen.getByTestId('admin-login-submit-btn');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(handleLoginSuccess).toHaveBeenCalledTimes(1);
  });

  it('AC5: should transition from AdminRoute unauthenticated guard to AdminLoginPage when Log In is clicked', async () => {
    render(
      <AdminAuthProvider initialUser={null} initialToken={null}>
        <AdminRoute>
          <div>Protected Area</div>
        </AdminRoute>
      </AdminAuthProvider>
    );

    expect(screen.getByTestId('admin-login-guard')).toBeInTheDocument();

    const loginLink = screen.getByRole('link', { name: /Log In to Admin Console/i });
    await act(async () => {
      fireEvent.click(loginLink);
    });

    expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();
  });

  it('AC6: should clear authentication when Logout button in AdminHeader is clicked', async () => {
    function TestApp() {
      const { isAuthenticated } = useAdminAuth();
      return (
        <div>
          <AdminHeader />
          <div data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</div>
        </div>
      );
    }

    render(
      <AdminAuthProvider>
        <TestApp />
      </AdminAuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');

    const logoutBtn = screen.getByTestId('admin-logout-btn');
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
  });
});

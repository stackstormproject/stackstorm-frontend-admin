import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, ADMINS, apiError } from '../renderApp';
import * as authApi from '../../api/auth';
import { restoreFromCookie } from '../../state/AuthContext';
import { setAccessToken, clearAccessToken, setSessionHint } from '../../lib/session';
import { describeSignInError, safeNext } from '../../lib/authErrors';
import { navigationFor, NAV_GROUPS } from '../../navigation';

vi.mock('../../api/auth');
vi.mock('../../api/analytics');

describe('sign-in', () => {
  it('should show only the sign-in page given no session', async () => {
    renderApp('/', { admin: null });

    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('should validate the form before calling the API', async () => {
    const user = userEvent.setup();
    renderApp('/login', { admin: null });

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter your work email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(authApi.signIn).not.toHaveBeenCalled();
  });

  it('should reject a malformed email', async () => {
    const user = userEvent.setup();
    renderApp('/login', { admin: null });

    await user.type(await screen.findByLabelText('Work email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
  });

  it('should explain wrong credentials and clear the password', async () => {
    const user = userEvent.setup();
    authApi.signIn.mockRejectedValue(apiError(401, 'INVALID_CREDENTIALS', 'Email or password'));
    renderApp('/login', { admin: null });

    await user.type(await screen.findByLabelText('Work email'), 'admin@stackstorm.lk');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password do not match a staff account.'
    );
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('should send a support agent to the support console after signing in', async () => {
    const user = userEvent.setup();
    authApi.signIn.mockResolvedValue(ADMINS.agent);
    const { router } = renderApp('/login', { admin: null });

    await user.type(await screen.findByLabelText('Work email'), 'support@stackstorm.lk');
    await user.type(screen.getByLabelText('Password'), 'Admin1234!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/support'));
    expect(authApi.signIn).toHaveBeenCalledWith({
      email: 'support@stackstorm.lk',
      password: 'Admin1234!',
    });
  });

  it('should return to the requested page after signing in', async () => {
    const user = userEvent.setup();
    authApi.signIn.mockResolvedValue(ADMINS.manager);
    const { router } = renderApp('/orders/12?tab=items', { admin: null });

    await user.type(await screen.findByLabelText('Work email'), 'admin@stackstorm.lk');
    await user.type(screen.getByLabelText('Password'), 'Admin1234!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(`${router.state.location.pathname}${router.state.location.search}`).toBe(
        '/orders/12?tab=items'
      )
    );
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    renderApp('/login', { admin: null });

    const toggle = await screen.findByRole('button', { name: 'Show password' });
    await user.click(toggle);

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('should skip the sign-in page given an existing session', async () => {
    const { router } = renderApp('/login', { admin: ADMINS.agent });

    await waitFor(() => expect(router.state.location.pathname).toBe('/support'));
  });
});

describe('shell and roles', () => {
  it('should show the operator name and role', async () => {
    renderApp('/nowhere', { admin: ADMINS.agent });

    expect(await screen.findByText('Nimali Perera')).toBeInTheDocument();
    expect(screen.getByText('Support agent')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('should send managers from / to the dashboard', async () => {
    const { router } = renderApp('/', { admin: ADMINS.manager });

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });

  it('should sign out through the API and land on the sign-in page', async () => {
    const user = userEvent.setup();
    authApi.signOut.mockResolvedValue();
    const { router } = renderApp('/nowhere');

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(authApi.signOut).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
  });

  it('should still sign out locally given the server call fails', async () => {
    const user = userEvent.setup();
    authApi.signOut.mockRejectedValue(apiError(0, 'NETWORK_ERROR', 'offline'));
    renderApp('/nowhere');

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Staff sign in' })).toBeInTheDocument();
  });

  it('should open and close the narrow-screen menu', async () => {
    const user = userEvent.setup();
    renderApp('/nowhere');

    const toggle = await screen.findByRole('button', { name: 'Open menu' });
    await user.click(toggle);
    expect(document.getElementById('sidebar')).toHaveClass('sidebar--open');

    const closers = screen.getAllByRole('button', { name: 'Close menu' });
    await user.click(closers[closers.length - 1]);
    expect(document.getElementById('sidebar')).not.toHaveClass('sidebar--open');

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.keyboard('{Escape}');
    expect(document.getElementById('sidebar')).not.toHaveClass('sidebar--open');
  });

  it('should tell the operator when the session ends mid-work', async () => {
    renderApp('/nowhere');
    await screen.findByText('Super Admin');

    act(() => {
      setAccessToken('t');
      clearAccessToken();
    });

    expect(await screen.findByText(/Your session ended/)).toBeInTheDocument();
  });

  it('should hide navigation groups the role cannot use', () => {
    const icon = () => null;
    NAV_GROUPS[0].items.push({ to: '/x', label: 'X', icon });
    try {
      expect(navigationFor('support_agent').map((g) => g.heading)).not.toContain('Overview');
      expect(navigationFor('admin').map((g) => g.heading)).toContain('Overview');
    } finally {
      NAV_GROUPS[0].items.pop();
    }
  });

  it('should show a support agent only the support console', async () => {
    renderApp('/nowhere', { admin: ADMINS.agent });

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['Live support']);
  });

  it('should show managers every section', async () => {
    renderApp('/nowhere', { admin: ADMINS.storeManager });

    const nav = await screen.findByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['Dashboard', 'Orders', 'Returns', 'Products', 'Stock', 'Customers', 'Live support']);
  });
});

describe('session restore', () => {
  it('should not call the API given this browser never signed in', async () => {
    await expect(restoreFromCookie()).resolves.toBeNull();
    expect(authApi.restoreSession).not.toHaveBeenCalled();
  });

  it('should restore from the cookie given the hint', async () => {
    setSessionHint(true);
    authApi.restoreSession.mockResolvedValue(ADMINS.manager);

    await expect(restoreFromCookie()).resolves.toEqual(ADMINS.manager);
  });

  it('should drop the hint given the cookie is no longer valid', async () => {
    setSessionHint(true);
    authApi.restoreSession.mockRejectedValue(apiError(401, 'REFRESH_TOKEN_EXPIRED', 'x'));

    await expect(restoreFromCookie()).resolves.toBeNull();
    expect(localStorage.getItem('dfc.admin.hasSession')).toBeNull();
  });
});

describe('auth helpers', () => {
  it('should only allow same-site return paths', () => {
    expect(safeNext('/orders/1')).toBe('/orders/1');
    expect(safeNext('//evil.example')).toBeNull();
    expect(safeNext('https://evil.example')).toBeNull();
    expect(safeNext('/login')).toBeNull();
    expect(safeNext(null)).toBeNull();
  });

  it('should map every sign-in failure to readable text', () => {
    expect(describeSignInError({ code: 'ACCOUNT_LOCKED' }).form).toMatch(/locked/);
    expect(describeSignInError({ status: 429 }).form).toMatch(/Too many attempts/);
    expect(
      describeSignInError({
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: [
          { field: 'email', message: 'A valid email is required' },
          { field: 'email', message: 'second' },
        ],
      })
    ).toEqual({ form: null, fields: { email: 'A valid email is required' } });
    expect(describeSignInError({ code: 'VALIDATION_ERROR', message: 'Invalid' }).form).toBe(
      'Invalid'
    );
    expect(describeSignInError(undefined).form).toMatch(/Something went wrong/);
  });
});

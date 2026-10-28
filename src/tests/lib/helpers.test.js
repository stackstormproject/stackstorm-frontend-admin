import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  onAccessTokenChange,
  hasSessionHint,
  setSessionHint,
} from '../../lib/session';
import { hasRole, homePathFor, MANAGER_ROLES, SUPPORT_ROLES, ROLE_LABELS } from '../../lib/roles';
import {
  formatMoney,
  formatMoneyWhole,
  formatNumber,
  formatDate,
  formatDateTime,
  humanize,
  cleanParams,
} from '../../lib/format';

describe('session', () => {
  afterEach(() => clearAccessToken());

  it('should notify subscribers of token changes until they unsubscribe', () => {
    const seen = [];
    const unsubscribe = onAccessTokenChange((token) => seen.push(token));

    setAccessToken('a');
    clearAccessToken();
    unsubscribe();
    setAccessToken('b');

    expect(seen).toEqual(['a', null]);
  });

  it('should never write the access token to storage', () => {
    setAccessToken('secret-token');

    expect(getAccessToken()).toBe('secret-token');
    expect(JSON.stringify({ ...localStorage })).not.toContain('secret-token');
    expect(localStorage.length).toBe(0);
  });

  it('should keep only a non-secret session hint', () => {
    setSessionHint(true);
    expect(hasSessionHint()).toBe(true);

    setSessionHint(false);
    expect(hasSessionHint()).toBe(false);
  });

  it('should treat unavailable storage as no hint', () => {
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(hasSessionHint()).toBe(false);
    expect(() => setSessionHint(true)).not.toThrow();
    spy.mockRestore();
  });
});

describe('roles', () => {
  it('should match the backend role matrix', () => {
    expect(MANAGER_ROLES).toEqual(['super_admin', 'admin']);
    expect(SUPPORT_ROLES).toContain('support_agent');
    expect(ROLE_LABELS.support_agent).toBe('Support agent');
  });

  it('should send managers to the dashboard and agents to support', () => {
    expect(homePathFor({ role: 'admin' })).toBe('/');
    expect(homePathFor({ role: 'support_agent' })).toBe('/support');
  });

  it('should deny a missing user', () => {
    expect(hasRole(null, MANAGER_ROLES)).toBe(false);
  });
});

describe('format', () => {
  it('should format rupees with two decimals', () => {
    expect(formatMoney(4650)).toMatch(/4,650\.00/);
    expect(formatMoney(undefined)).toMatch(/0\.00/);
    expect(formatMoneyWhole(5049.6)).toMatch(/5,050$/);
    expect(formatMoneyWhole(null)).toMatch(/0$/);
  });

  it('should format numbers and dates and fall back to a dash', () => {
    expect(formatNumber(12000)).toBe('12,000');
    expect(formatDate('2026-10-27T08:00:00Z')).toBe('27 Oct 2026');
    expect(formatDateTime('2026-10-27T08:00:00Z')).toMatch(/27 Oct 2026/);
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
  });

  it('should humanize enum values', () => {
    expect(humanize('payment_pending')).toBe('Payment pending');
    expect(humanize('')).toBe('');
  });

  it('should drop empty params', () => {
    expect(cleanParams({ status: '', search: 'x', page: 1, tier: null, low: undefined })).toEqual({
      search: 'x',
      page: 1,
    });
    expect(cleanParams()).toEqual({});
  });
});

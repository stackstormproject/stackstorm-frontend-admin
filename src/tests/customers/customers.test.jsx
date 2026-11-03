import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, ADMINS, apiError } from '../renderApp';
import * as customersApi from '../../api/customers';

vi.mock('../../api/customers');

const summary = (overrides = {}) => ({
  id: 4,
  name: 'Alice Silva',
  email: 'alice@example.com',
  phone: '+94771234567',
  registered_at: '2026-10-01T08:00:00Z',
  tier: 'gold',
  points: 120,
  order_count: 3,
  total_spent: 18450,
  last_order_at: '2026-10-27T08:00:00Z',
  ...overrides,
});

const detail = (overrides = {}) => ({
  ...summary(),
  recent_orders: [
    {
      id: 11,
      invoice_number: 'DFC-2026-0011',
      order_date: '2026-10-27T08:00:00Z',
      status: 'shipped',
      total_amount: 4650,
    },
  ],
  addresses: [
    {
      id: 1,
      address_line1: '12 Main Street',
      address_line2: null,
      city: 'Dickwella',
      state: 'Matara',
      postal_code: '81200',
      is_default: true,
    },
  ],
  loyalty_transactions: [
    {
      id: 2,
      points: -20,
      transaction_type: 'redeemed',
      description: 'Redeemed at checkout',
      created_at: '2026-10-26T08:00:00Z',
      admin_name: null,
    },
    {
      id: 1,
      points: 50,
      transaction_type: 'adjusted',
      description: 'Goodwill credit',
      created_at: '2026-10-25T08:00:00Z',
      admin_name: 'Super Admin',
    },
  ],
  ...overrides,
});

describe('customer list', () => {
  it('should list customers with tier, points and paid spend', async () => {
    customersApi.listCustomers.mockResolvedValue({
      customers: [summary()],
      pagination: { total: 1, page: 1, total_pages: 1 },
    });
    renderApp('/customers');

    expect(await screen.findByRole('link', { name: 'Alice Silva' })).toHaveAttribute(
      'href',
      '/customers/4'
    );
    const row = screen.getByRole('link', { name: 'Alice Silva' }).closest('tr');
    expect(within(row).getByText('Gold')).toBeInTheDocument();
    expect(within(row).getByText(/18,450\.00/)).toBeInTheDocument();
  });

  it('should filter by tier and sort through the URL', async () => {
    const user = userEvent.setup();
    customersApi.listCustomers.mockResolvedValue({ customers: [], pagination: { total: 0 } });
    const { router } = renderApp('/customers');

    expect(await screen.findByText('No customers found')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Tier'), 'platinum');
    await user.selectOptions(screen.getByLabelText('Sort'), 'spend');
    await waitFor(() => expect(router.state.location.search).toBe('?tier=platinum&sort=spend'));
    expect(customersApi.listCustomers).toHaveBeenLastCalledWith({
      search: '',
      tier: 'platinum',
      sort: 'spend',
      page: 1,
    });

    await user.selectOptions(screen.getByLabelText('Sort'), 'newest');
    await waitFor(() => expect(router.state.location.search).toBe('?tier=platinum'));
  });

  it('should hide customers from support agents', async () => {
    renderApp('/customers', { admin: ADMINS.agent });

    expect(await screen.findByText(/not available for your role/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Customers' })).not.toBeInTheDocument();
  });
});

describe('customer record', () => {
  beforeEach(() => {
    customersApi.getCustomer.mockResolvedValue(detail());
  });

  it('should show orders, addresses, contact and the points history', async () => {
    renderApp('/customers/4');

    expect(await screen.findByRole('heading', { name: 'Alice Silva' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'DFC-2026-0011' })).toHaveAttribute(
      'href',
      '/orders/11'
    );
    expect(screen.getByRole('link', { name: 'All their orders' })).toHaveAttribute(
      'href',
      '/orders?search=alice%40example.com'
    );
    expect(screen.getByRole('link', { name: '+94771234567' })).toHaveAttribute(
      'href',
      'tel:+94771234567'
    );
    expect(screen.getByText('12 Main Street, Dickwella, Matara, 81200')).toBeInTheDocument();
    expect(screen.getByText('+50')).toHaveClass('delta--up');
    expect(screen.getByText('-20')).toHaveClass('delta--down');
    expect(screen.getByText('by Super Admin')).toBeInTheDocument();
  });

  it('should show empty sections for a new customer', async () => {
    customersApi.getCustomer.mockResolvedValue(
      detail({ recent_orders: [], addresses: [], loyalty_transactions: [], phone: null })
    );
    renderApp('/customers/4');

    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('No saved addresses.')).toBeInTheDocument();
    expect(screen.getByText('No points activity')).toBeInTheDocument();
  });

  it('should report a missing customer', async () => {
    customersApi.getCustomer.mockRejectedValue(apiError(404, 'NOT_FOUND', 'Customer 9 not found'));
    renderApp('/customers/9');

    expect(await screen.findByRole('heading', { name: 'Customer not found' })).toBeInTheDocument();
  });
});

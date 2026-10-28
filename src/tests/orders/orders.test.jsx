import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, ADMINS, apiError } from '../renderApp';
import * as ordersApi from '../../api/orders';

vi.mock('../../api/orders', async (importOriginal) => ({
  ...(await importOriginal()),
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  getInvoice: vi.fn(),
}));

const row = (overrides = {}) => ({
  id: 11,
  invoice_number: 'DFC-2026-0011',
  customer_name: 'Alice Silva',
  customer_email: 'alice@example.com',
  is_guest: false,
  status: 'processing',
  shipping_option: 'standard',
  items_count: 2,
  total_amount: 4650,
  order_date: '2026-10-27T08:07:58.624Z',
  tracking_number: null,
  ...overrides,
});

const detail = (overrides = {}) => ({
  id: 11,
  invoice_number: 'DFC-2026-0011',
  is_guest: false,
  guest_email: null,
  status: 'processing',
  order_date: '2026-10-27T08:07:58.624Z',
  delivery_date: null,
  shipping_option: 'standard',
  shipping_cost: 450,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 8850,
  tracking_number: null,
  notes: null,
  shipping_address: { line1: '12 Main Street', city: 'Dickwella', postal_code: '81200' },
  billing_address: { line1: '12 Main Street', city: 'Dickwella', postal_code: '81200' },
  customer: { id: 4, name: 'Alice Silva', email: 'alice@example.com', phone: null },
  items: [
    {
      id: 1,
      product_id: 13,
      product_title: 'Dumbara Shawl',
      primary_image: 'https://images.example/shawl.jpg',
      is_final_sale: true,
      sku: 'DFC-13-OS',
      size: 'One Size',
      color: 'Natural',
      quantity: 2,
      unit_price: 4200,
      subtotal: 8400,
    },
  ],
  allowed_statuses: ['shipped', 'cancelled'],
  ...overrides,
});

const pagination = { total: 1, page: 1, limit: 20, total_pages: 1 };

describe('order list', () => {
  beforeEach(() => {
    ordersApi.listOrders.mockResolvedValue({ orders: [row()], pagination });
  });

  it('should list orders with links, customer and totals', async () => {
    renderApp('/orders');

    const link = await screen.findByRole('link', { name: 'DFC-2026-0011' });
    expect(link).toHaveAttribute('href', '/orders/11');
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Home delivery')).toBeInTheDocument();
    expect(ordersApi.listOrders).toHaveBeenCalledWith({
      status: '',
      search: '',
      page: 1,
      limit: 20,
    });
  });

  it('should keep the status filter and search in the URL and reset the page', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/orders?page=3');
    await screen.findByRole('link', { name: 'DFC-2026-0011' });

    await user.selectOptions(screen.getByLabelText('Status'), 'shipped');
    await waitFor(() => expect(router.state.location.search).toBe('?status=shipped'));

    await user.type(screen.getByRole('searchbox'), 'alice{Enter}');
    await waitFor(() =>
      expect(ordersApi.listOrders).toHaveBeenLastCalledWith({
        status: 'shipped',
        search: 'alice',
        page: 1,
        limit: 20,
      })
    );

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('should mark guest orders and show tracking numbers', async () => {
    ordersApi.listOrders.mockResolvedValue({
      orders: [row({ is_guest: true, customer_name: 'Guest', tracking_number: 'RR1LK' })],
      pagination,
    });
    renderApp('/orders');

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Guest', { selector: '.badge' })).toBeInTheDocument();
    expect(within(table).getByText('RR1LK')).toBeInTheDocument();
  });

  it('should say when nothing matches the filters', async () => {
    ordersApi.listOrders.mockResolvedValue({ orders: [], pagination: { ...pagination, total: 0 } });
    renderApp('/orders?status=returned');

    expect(await screen.findByText('No orders match these filters')).toBeInTheDocument();
  });

  it('should page through results', async () => {
    const user = userEvent.setup();
    ordersApi.listOrders.mockResolvedValue({
      orders: [row()],
      pagination: { total: 45, page: 1, limit: 20, total_pages: 3 },
    });
    const { router } = renderApp('/orders');

    await user.click(await screen.findByRole('button', { name: 'Next' }));

    await waitFor(() => expect(router.state.location.search).toBe('?page=2'));
  });

  it('should show a retry when the list fails', async () => {
    ordersApi.listOrders.mockRejectedValue(apiError(500, 'INTERNAL', 'Database unavailable'));
    renderApp('/orders');

    expect(await screen.findByText('Database unavailable')).toBeInTheDocument();
  });

  it('should keep orders from support agents', async () => {
    renderApp('/orders', { admin: ADMINS.agent });

    expect(await screen.findByText(/not available for your role/)).toBeInTheDocument();
    expect(ordersApi.listOrders).not.toHaveBeenCalled();
  });
});

describe('order detail', () => {
  it('should show items, totals, customer and delivery', async () => {
    ordersApi.getOrder.mockResolvedValue(detail());
    renderApp('/orders/11');

    expect(await screen.findByRole('heading', { name: 'DFC-2026-0011' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dumbara Shawl' })).toHaveAttribute(
      'href',
      '/products/13'
    );
    expect(screen.getByText('Final sale')).toBeInTheDocument();
    expect(screen.getByText(/4,200\.00 each/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Alice Silva' })).toHaveAttribute(
      'href',
      '/customers/4'
    );
    expect(screen.getAllByText('12 Main Street, Dickwella, 81200')).toHaveLength(2);
  });

  it('should download the PDF invoice of a paid order (#179)', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    ordersApi.getOrder.mockResolvedValue(detail());
    ordersApi.getInvoice
      .mockResolvedValueOnce(new Blob(['%PDF-']))
      .mockRejectedValueOnce(apiError(409, 'CONFLICT', 'unpaid'))
      .mockRejectedValueOnce(apiError(500, 'X', 'Server is busy'));
    renderApp('/orders/11');

    const button = await screen.findByRole('button', { name: 'Invoice (PDF)' });
    await userEvent.click(button);
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(click.mock.contexts[0].download).toBe('DFC-2026-0011.pdf');
    await userEvent.click(button);
    expect(
      await screen.findByText('The invoice is ready once the order is paid.')
    ).toBeInTheDocument();
    await userEvent.click(button);
    expect(await screen.findByText('Server is busy')).toBeInTheDocument();
    click.mockRestore();
  });

  it('should not offer an invoice for an unpaid order', async () => {
    ordersApi.getOrder.mockResolvedValue(detail({ status: 'payment_pending' }));
    renderApp('/orders/11');

    expect(await screen.findByRole('heading', { name: 'DFC-2026-0011' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Invoice (PDF)' })).not.toBeInTheDocument();
  });

  it('should offer only the transitions the server allows', async () => {
    ordersApi.getOrder.mockResolvedValue(detail({ allowed_statuses: [], status: 'delivered' }));
    renderApp('/orders/11');

    expect(await screen.findByText(/No further changes are possible/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark as/ })).not.toBeInTheDocument();
  });

  it('should require a tracking number before shipping', async () => {
    const user = userEvent.setup();
    ordersApi.getOrder.mockResolvedValue(detail());
    ordersApi.updateOrderStatus.mockResolvedValue({ status: 'shipped', refund: null });
    renderApp('/orders/11');

    await user.click(await screen.findByRole('button', { name: 'Mark as shipped' }));
    const dialog = screen.getByRole('dialog', { name: 'Mark as shipped' });
    await user.click(within(dialog).getByRole('button', { name: 'Mark as shipped' }));
    expect(within(dialog).getByText(/Enter the tracking number/)).toBeInTheDocument();
    expect(ordersApi.updateOrderStatus).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Tracking number'), 'RR123456789LK');
    await user.click(within(dialog).getByRole('button', { name: 'Mark as shipped' }));

    await waitFor(() =>
      expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith(11, {
        status: 'shipped',
        trackingNumber: 'RR123456789LK',
      })
    );
    expect(await screen.findByText('DFC-2026-0011 is now shipped')).toBeInTheDocument();
    expect(ordersApi.getOrder).toHaveBeenCalledTimes(2);
  });

  it('should explain the refund before cancelling a paid order and report it after', async () => {
    const user = userEvent.setup();
    ordersApi.getOrder.mockResolvedValue(detail());
    ordersApi.updateOrderStatus.mockResolvedValue({
      status: 'cancelled',
      refund: { refunded: true, amount: 8850 },
    });
    renderApp('/orders/11');

    await user.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancel order' });
    expect(dialog).toHaveAccessibleDescription(/back into stock and LKR\s?8,850\.00 is refunded/);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    expect(await screen.findByText(/Refunded LKR\s?8,850\.00/)).toBeInTheDocument();
    expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith(11, {
      status: 'cancelled',
      trackingNumber: undefined,
    });
  });

  it('should warn when a refund fails', async () => {
    const user = userEvent.setup();
    ordersApi.getOrder.mockResolvedValue(detail());
    ordersApi.updateOrderStatus.mockResolvedValue({
      status: 'cancelled',
      refund: { refunded: false, error: 'Refund failed: issue it from the Stripe dashboard' },
    });
    renderApp('/orders/11');

    await user.click(await screen.findByRole('button', { name: 'Cancel order' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel order' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /issue it from the Stripe dashboard/
    );
  });

  it('should describe releasing the hold for an unpaid order', async () => {
    const user = userEvent.setup();
    ordersApi.getOrder.mockResolvedValue(
      detail({ status: 'payment_pending', allowed_statuses: ['cancelled'] })
    );
    renderApp('/orders/11');

    await user.click(await screen.findByRole('button', { name: 'Cancel order' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/never paid/);
    await user.click(screen.getByRole('button', { name: 'Keep as is' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show the server error inside the dialog', async () => {
    const user = userEvent.setup();
    ordersApi.getOrder.mockResolvedValue(
      detail({ allowed_statuses: ['delivered'], status: 'shipped' })
    );
    ordersApi.updateOrderStatus.mockRejectedValue(
      apiError(409, 'CONFLICT', 'Order was changed by someone else')
    );
    renderApp('/orders/11');

    await user.click(await screen.findByRole('button', { name: 'Mark as delivered' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleDescription(/30-day return window/);
    await user.click(within(dialog).getByRole('button', { name: 'Mark as delivered' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Order was changed by someone else'
    );
  });

  it('should treat store pickup as collection with an optional tracking number', async () => {
    const user = userEvent.setup();
    ordersApi.getOrder.mockResolvedValue(
      detail({
        shipping_option: 'pickup',
        is_guest: true,
        guest_email: 'guest@example.com',
        shipping_cost: 0,
        discount_amount: 100,
        tax_amount: 50,
        notes: 'Gift wrap please',
        allowed_statuses: ['shipped', 'delivered', 'cancelled'],
      })
    );
    ordersApi.updateOrderStatus.mockResolvedValue({ status: 'shipped' });
    renderApp('/orders/11');

    expect(await screen.findByRole('button', { name: 'Mark as collected' })).toBeInTheDocument();
    expect(screen.getByText('Store pickup')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('guest@example.com')).toBeInTheDocument();
    expect(screen.getByText('Gift wrap please')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark as shipped' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Mark as shipped' })
    );
    await waitFor(() =>
      expect(ordersApi.updateOrderStatus).toHaveBeenCalledWith(11, {
        status: 'shipped',
        trackingNumber: undefined,
      })
    );
  });

  it('should say when the order does not exist', async () => {
    ordersApi.getOrder.mockRejectedValue(apiError(404, 'NOT_FOUND', 'Order 999 not found'));
    renderApp('/orders/999');

    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});

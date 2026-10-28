import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, apiError } from '../renderApp';
import * as returnsApi from '../../api/returns';

vi.mock('../../api/returns', async (importOriginal) => ({
  ...(await importOriginal()),
  listReturns: vi.fn(),
  getReturn: vi.fn(),
  approveReturn: vi.fn(),
  rejectReturn: vi.fn(),
  receiveReturn: vi.fn(),
}));

const request = (overrides = {}) => ({
  id: 1,
  type: 'return',
  status: 'requested',
  reason: 'Too small',
  admin_note: null,
  refund_amount: 6800,
  created_at: '2026-10-27T07:42:12.851Z',
  resolved_at: null,
  resolved_by: null,
  order: { id: 3, invoice_number: 'DFC-2026-0003', delivery_date: '2026-10-20T07:42:07.786Z' },
  customer: { id: 4, name: 'Test Shopper', email: 'shopper1@example.com' },
  item: {
    id: 3,
    variant_id: 14,
    product_name: 'Festival Sarong Set',
    sku: 'DFC-12-S',
    size: 'S',
    color: 'Natural',
    quantity: 2,
    subtotal: 6800,
  },
  exchange: null,
  ...overrides,
});

const exchange = (overrides = {}) =>
  request({
    type: 'exchange',
    refund_amount: 0,
    exchange: { variant_id: 15, size: 'M', color: 'Natural', available: 25 },
    ...overrides,
  });

const openAction = async (user, name) => {
  await user.click(await screen.findByRole('button', { name }));
  return screen.getByRole('dialog');
};

describe('returns list', () => {
  it('should list requests with order, customer and the size asked for', async () => {
    returnsApi.listReturns.mockResolvedValue({
      returns: [exchange()],
      pagination: { total: 1, page: 1, limit: 20, total_pages: 1 },
    });
    renderApp('/returns');

    expect(await screen.findByRole('link', { name: 'Exchange #1' })).toHaveAttribute(
      'href',
      '/returns/1'
    );
    expect(screen.getByText(/S · Natural · qty 2 → M · Natural/)).toBeInTheDocument();
    expect(screen.getByText(/DFC-2026-0003/)).toBeInTheDocument();
  });

  it('should filter by status through the URL', async () => {
    const user = userEvent.setup();
    returnsApi.listReturns.mockResolvedValue({ returns: [], pagination: { total: 0 } });
    const { router } = renderApp('/returns');

    expect(await screen.findByText('No return requests')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approved' }));

    await waitFor(() => expect(router.state.location.search).toBe('?status=approved'));
    expect(await screen.findByText('No approved returns')).toBeInTheDocument();
    expect(returnsApi.listReturns).toHaveBeenLastCalledWith({ status: 'approved', page: 1 });
  });

  it('should offer a retry when loading fails', async () => {
    returnsApi.listReturns.mockRejectedValue(apiError(500, 'INTERNAL', 'Returns unavailable'));
    renderApp('/returns');

    expect(await screen.findByText('Returns unavailable')).toBeInTheDocument();
  });
});

describe('return decisions', () => {
  it('should show the item, the refund and the delivery window', async () => {
    returnsApi.getReturn.mockResolvedValue(request());
    renderApp('/returns/1');

    expect(await screen.findByRole('heading', { name: 'Return #1' })).toBeInTheDocument();
    expect(screen.getByText('Back to the original card')).toBeInTheDocument();
    expect(screen.getByText('return requested 7 days later')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'DFC-2026-0003' })).toHaveAttribute(
      'href',
      '/orders/3'
    );
  });

  it('should warn about a request outside the 30-day window', async () => {
    returnsApi.getReturn.mockResolvedValue(
      request({ order: { id: 3, invoice_number: 'DFC-2026-0003', delivery_date: '2026-09-01' } })
    );
    renderApp('/returns/1');

    expect(await screen.findByRole('note')).toHaveTextContent(/outside the 30-day return window/);
  });

  it('should approve with an optional message', async () => {
    const user = userEvent.setup();
    returnsApi.getReturn.mockResolvedValue(request());
    returnsApi.approveReturn.mockResolvedValue(request({ status: 'approved' }));
    renderApp('/returns/1');

    const dialog = await openAction(user, 'Approve');
    await user.type(within(dialog).getByLabelText(/Message to the customer/), 'Post it to us');
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(returnsApi.approveReturn).toHaveBeenCalledWith(1, 'Post it to us'));
    expect(await screen.findByText(/Request approved/)).toBeInTheDocument();
  });

  it('should require a reason to reject', async () => {
    const user = userEvent.setup();
    returnsApi.getReturn.mockResolvedValue(request());
    returnsApi.rejectReturn.mockResolvedValue(request({ status: 'rejected' }));
    renderApp('/returns/1');

    const dialog = await openAction(user, 'Reject');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));
    expect(within(dialog).getByText(/Write a short reason/)).toBeInTheDocument();
    expect(returnsApi.rejectReturn).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText('Reason for the customer'), 'Item was worn');
    await user.click(within(dialog).getByRole('button', { name: 'Reject request' }));

    await waitFor(() => expect(returnsApi.rejectReturn).toHaveBeenCalledWith(1, 'Item was worn'));
    expect(await screen.findByText(/Request rejected/)).toBeInTheDocument();
  });

  it('should restock and refund an accepted return', async () => {
    const user = userEvent.setup();
    returnsApi.getReturn.mockResolvedValue(request({ status: 'approved' }));
    returnsApi.receiveReturn.mockResolvedValue({
      ...request({ status: 'completed' }),
      refund: { refunded: true, amount: 6800 },
    });
    renderApp('/returns/1');

    const dialog = await openAction(user, 'Record returned parcel');
    await user.click(within(dialog).getByRole('button', { name: 'Save inspection' }));
    expect(within(dialog).getByText('Choose one.')).toBeInTheDocument();

    const accept = within(dialog).getByRole('radio', { name: /Resellable/ });
    expect(accept.closest('label')).toHaveTextContent(/6,800\.00 is refunded/);
    await user.click(accept);
    await user.click(within(dialog).getByRole('button', { name: 'Save inspection' }));

    await waitFor(() =>
      expect(returnsApi.receiveReturn).toHaveBeenCalledWith(1, { acceptable: true, note: '' })
    );
    expect(
      await screen.findByText(/Item restocked and LKR\s?6,800\.00 refunded/)
    ).toBeInTheDocument();
  });

  it('should warn when the accepted return was not refunded', async () => {
    const user = userEvent.setup();
    returnsApi.getReturn.mockResolvedValue(request({ status: 'approved' }));
    returnsApi.receiveReturn.mockResolvedValue({
      ...request({ status: 'completed' }),
      refund: { refunded: false },
    });
    renderApp('/returns/1');

    const dialog = await openAction(user, 'Record returned parcel');
    await user.click(within(dialog).getByRole('radio', { name: /Resellable/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save inspection' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Refund it from Stripe/);
  });

  it('should require a description when the item is not acceptable', async () => {
    const user = userEvent.setup();
    returnsApi.getReturn.mockResolvedValue(request({ status: 'approved' }));
    returnsApi.receiveReturn.mockResolvedValue(request({ status: 'rejected' }));
    renderApp('/returns/1');

    const dialog = await openAction(user, 'Record returned parcel');
    await user.click(within(dialog).getByRole('radio', { name: /Not acceptable/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save inspection' }));
    expect(within(dialog).getByText(/Write a short reason/)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('What is wrong with the item'), 'Stained');
    await user.click(within(dialog).getByRole('button', { name: 'Save inspection' }));

    await waitFor(() =>
      expect(returnsApi.receiveReturn).toHaveBeenCalledWith(1, {
        acceptable: false,
        note: 'Stained',
      })
    );
    expect(await screen.findByText(/Nothing was refunded/)).toBeInTheDocument();
  });

  it('should send the replacement for an accepted exchange', async () => {
    const user = userEvent.setup();
    returnsApi.getReturn.mockResolvedValue(exchange({ status: 'approved' }));
    returnsApi.receiveReturn.mockResolvedValue({
      ...exchange({ status: 'completed' }),
      refund: null,
    });
    renderApp('/returns/1');

    const dialog = await openAction(user, 'Record returned parcel');
    expect(
      within(dialog)
        .getByRole('radio', { name: /Resellable/ })
        .closest('label')
    ).toHaveTextContent('2 × M · Natural is taken from stock');
    await user.click(within(dialog).getByRole('radio', { name: /Resellable/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save inspection' }));

    expect(await screen.findByText(/replacement taken from stock/)).toBeInTheDocument();
  });

  it('should show the server conflict when the replacement ran out', async () => {
    const user = userEvent.setup();
    returnsApi.getReturn.mockResolvedValue(
      exchange({ status: 'approved', exchange: { size: 'M', color: 'Natural', available: 1 } })
    );
    returnsApi.receiveReturn.mockRejectedValue(
      apiError(
        409,
        'CONFLICT',
        'The replacement size is out of stock. Restock it or refund instead.'
      )
    );
    renderApp('/returns/1');

    expect(await screen.findByText('Not enough to exchange')).toBeInTheDocument();
    const dialog = await openAction(user, 'Record returned parcel');
    await user.click(within(dialog).getByRole('radio', { name: /Resellable/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Save inspection' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/out of stock/);
    await user.click(within(dialog).getByRole('button', { name: 'Back' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should show the decision on a closed request and offer no actions', async () => {
    returnsApi.getReturn.mockResolvedValue(
      request({
        status: 'completed',
        admin_note: 'Refunded in full',
        resolved_by: 'Super Admin',
        resolved_at: '2026-10-28T10:00:00Z',
        order: { id: 3, invoice_number: 'DFC-2026-0003', delivery_date: null },
      })
    );
    renderApp('/returns/1');

    expect(await screen.findByText('Refunded in full')).toBeInTheDocument();
    const decision = screen.getByRole('region', { name: 'Decision' });
    expect(within(decision).getByText('Super Admin')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve|Reject|Record/ })).not.toBeInTheDocument();
  });

  it('should report a missing return and retry other errors', async () => {
    const user = userEvent.setup();
    returnsApi.getReturn
      .mockRejectedValueOnce(apiError(500, 'INTERNAL', 'Server error'))
      .mockRejectedValueOnce(apiError(404, 'NOT_FOUND', 'Return 9 not found'));
    renderApp('/returns/9');

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Return not found' })).toBeInTheDocument();
  });
});

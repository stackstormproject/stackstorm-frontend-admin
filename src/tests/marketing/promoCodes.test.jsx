import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, apiError } from '../renderApp';
import * as promoApi from '../../api/promoCodes';

vi.mock('../../api/promoCodes');

// Refs #205: admin promo code management.
const PROMO = {
  id: 1,
  code: 'WELCOME10',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 1000,
  max_discount_amount: 2000,
  start_date: '2026-10-01T00:00:00.000Z',
  end_date: '2026-12-31T00:00:00.000Z',
  usage_limit: 100,
  times_used: 12,
  is_active: true,
};

describe('Promo codes page', () => {
  it('should list a code with its discount, window and usage', async () => {
    promoApi.listPromoCodes.mockResolvedValue([PROMO]);
    renderApp('/promo-codes');

    const row = (await screen.findByText('WELCOME10')).closest('tr');
    expect(within(row).getByText('10%')).toBeInTheDocument();
    expect(within(row).getByText('12 / 100')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
  });

  it('should show an empty state with no codes', async () => {
    promoApi.listPromoCodes.mockResolvedValue([]);
    renderApp('/promo-codes');

    expect(await screen.findByRole('heading', { name: 'No promo codes yet' })).toBeInTheDocument();
  });

  it('should create a percentage code', async () => {
    const user = userEvent.setup();
    promoApi.listPromoCodes.mockResolvedValue([]);
    promoApi.createPromoCode.mockResolvedValue({ ...PROMO, code: 'SAVE20' });
    renderApp('/promo-codes');

    await screen.findByRole('heading', { name: 'No promo codes yet' });
    await user.click(screen.getByRole('button', { name: 'New code' }));

    await user.type(screen.getByLabelText('Code'), 'save20');
    await user.type(screen.getByLabelText('Discount (%)'), '20');
    await user.clear(screen.getByLabelText('Start date'));
    await user.type(screen.getByLabelText('Start date'), '2026-11-01');
    await user.type(screen.getByLabelText('End date'), '2026-12-01');
    await user.click(screen.getByRole('button', { name: 'Save code' }));

    await waitFor(() =>
      expect(promoApi.createPromoCode).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SAVE20',
          discount_type: 'percentage',
          discount_value: 20,
          start_date: '2026-11-01',
          end_date: '2026-12-01',
        })
      )
    );
  });

  it('should refuse a percentage discount over 100 and an invalid code', async () => {
    const user = userEvent.setup();
    promoApi.listPromoCodes.mockResolvedValue([]);
    renderApp('/promo-codes');

    await user.click(await screen.findByRole('button', { name: 'New code' }));
    await user.clear(screen.getByLabelText('Code'));
    await user.type(screen.getByLabelText('Code'), 'no');
    await user.type(screen.getByLabelText('Discount (%)'), '150');
    await user.click(screen.getByRole('button', { name: 'Save code' }));

    expect(
      await screen.findByText('3-32 characters: capital letters, numbers and hyphens only.')
    ).toBeInTheDocument();
    expect(screen.getByText('A percentage discount cannot exceed 100.')).toBeInTheDocument();
    expect(promoApi.createPromoCode).not.toHaveBeenCalled();
  });

  it('should edit an existing code', async () => {
    const user = userEvent.setup();
    promoApi.listPromoCodes.mockResolvedValue([PROMO]);
    promoApi.updatePromoCode.mockResolvedValue(PROMO);
    renderApp('/promo-codes');

    await user.click(await screen.findByRole('button', { name: 'Edit WELCOME10' }));
    const value = screen.getByLabelText('Discount (%)');
    await user.clear(value);
    await user.type(value, '15');
    await user.click(screen.getByRole('button', { name: 'Save code' }));

    await waitFor(() =>
      expect(promoApi.updatePromoCode).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ discount_value: 15 })
      )
    );
  });

  it('should show a duplicate-code refusal from the server', async () => {
    const user = userEvent.setup();
    promoApi.listPromoCodes.mockResolvedValue([]);
    promoApi.createPromoCode.mockRejectedValue(
      apiError(409, 'CONFLICT', 'A promo code with this code already exists')
    );
    renderApp('/promo-codes');

    await user.click(await screen.findByRole('button', { name: 'New code' }));
    await user.type(screen.getByLabelText('Code'), 'WELCOME10');
    await user.type(screen.getByLabelText('Discount (%)'), '10');
    await user.clear(screen.getByLabelText('Start date'));
    await user.type(screen.getByLabelText('Start date'), '2026-11-01');
    await user.type(screen.getByLabelText('End date'), '2026-12-01');
    await user.click(screen.getByRole('button', { name: 'Save code' }));

    expect(
      await screen.findByText('A promo code with this code already exists')
    ).toBeInTheDocument();
  });

  it('should delete a code', async () => {
    const user = userEvent.setup();
    promoApi.listPromoCodes.mockResolvedValue([PROMO]);
    promoApi.deletePromoCode.mockResolvedValue({});
    renderApp('/promo-codes');

    await user.click(await screen.findByRole('button', { name: 'Delete WELCOME10' }));
    await user.click(screen.getByRole('button', { name: 'Delete code' }));

    await waitFor(() => expect(promoApi.deletePromoCode).toHaveBeenCalledWith(1));
  });
});

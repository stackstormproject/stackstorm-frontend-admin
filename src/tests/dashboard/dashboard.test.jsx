import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, ADMINS, apiError } from '../renderApp';
import * as analytics from '../../api/analytics';
import { niceTicks, compactNumber } from '../../lib/chart';

vi.mock('../../api/analytics');

const overview = {
  metrics: {
    total_revenue: 40400,
    paid_orders: 8,
    awaiting_payment: 2,
    active_customers: 12,
    average_order_value: 5050,
    return_rate_percentage: 12.5,
    open_returns: 1,
    low_stock_count: 9,
    low_stock_threshold: 5,
    support_queue_count: 0,
  },
  top_products: [{ product_id: 13, title: 'Dumbara Shawl', units_sold: 5, revenue: 21000 }],
  recent_orders: [
    {
      id: 12,
      invoice_number: 'DFC-2026-0012',
      customer_name: 'Guest',
      status: 'processing',
      total_amount: 4650,
      order_date: '2026-10-27T08:08:24.881Z',
    },
  ],
};

const trend = (days) => ({
  days,
  series: [
    { date: '2026-10-26', revenue: 0, orders: 0 },
    { date: '2026-10-27', revenue: 40400, orders: 8 },
  ],
  totals: { revenue: 40400, orders: 8 },
});

describe('dashboard', () => {
  beforeEach(() => {
    analytics.getOverview.mockResolvedValue(overview);
    analytics.getSalesTrend.mockImplementation((days) => Promise.resolve(trend(days)));
  });

  it('should show paid-only figures with links to the lists behind them', async () => {
    renderApp('/dashboard');

    const figures = await screen.findByLabelText('Key figures');
    expect(within(figures).getByText(/40,400$/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Low-stock variants\s*9/ })).toHaveAttribute(
      'href',
      '/inventory?low=true'
    );
    expect(screen.getByRole('link', { name: /Awaiting payment/ })).toHaveAttribute(
      'href',
      '/orders?status=payment_pending'
    );
    expect(screen.getByRole('link', { name: 'DFC-2026-0012' })).toHaveAttribute(
      'href',
      '/orders/12'
    );
    expect(screen.getByRole('link', { name: 'Dumbara Shawl' })).toHaveAttribute(
      'href',
      '/products/13'
    );
  });

  it('should load 30 days by default and switch range through the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/dashboard');

    await screen.findByText(/in the last 30 days/);
    await user.click(screen.getByRole('button', { name: '7 days' }));

    await screen.findByText(/in the last 7 days/);
    expect(analytics.getSalesTrend).toHaveBeenLastCalledWith(7);
    expect(router.state.location.search).toBe('?days=7');
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('should ignore an unsupported range in the URL', async () => {
    renderApp('/dashboard?days=9999');

    await screen.findByText(/in the last 30 days/);
    expect(analytics.getSalesTrend).toHaveBeenCalledWith(30);
  });

  it('should show the hovered day and offer the same data as a table', async () => {
    renderApp('/dashboard');
    const chart = await screen.findByRole('img', { name: /Daily paid revenue/ });

    fireEvent.mouseEnter(chart.querySelectorAll('.chart__hit')[1]);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('8 paid orders');
    fireEvent.mouseLeave(chart);
    expect(chart.parentElement.querySelector('.chart__tooltip')).toBeNull();

    const table = screen.getByRole('table', { name: 'Daily paid revenue' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('should show empty lists and a retry on errors', async () => {
    const user = userEvent.setup();
    analytics.getOverview
      .mockRejectedValueOnce(apiError(500, 'INTERNAL', 'Analytics are unavailable'))
      .mockResolvedValueOnce({ ...overview, top_products: [], recent_orders: [] });
    renderApp('/dashboard');

    expect(await screen.findByText('Analytics are unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('No paid sales yet')).toBeInTheDocument();
  });

  it('should keep the dashboard from support agents', async () => {
    renderApp('/dashboard', { admin: ADMINS.agent });

    expect(
      await screen.findByRole('heading', { name: 'This page is not available for your role' })
    ).toBeInTheDocument();
    expect(analytics.getOverview).not.toHaveBeenCalled();
  });

  it('should show the dashboard link to managers', async () => {
    renderApp('/dashboard', { admin: ADMINS.storeManager });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveClass('active')
    );
  });
});

describe('chart helpers', () => {
  it('should round the axis to readable steps', () => {
    expect(niceTicks(40400)).toEqual([0, 20000, 40000, 60000]);
    expect(niceTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(niceTicks(0)).toEqual([0, 1, 2, 3, 4]);
    expect(niceTicks(9)[4]).toBeGreaterThanOrEqual(9);
    expect(compactNumber(40000)).toBe('40K');
  });
});

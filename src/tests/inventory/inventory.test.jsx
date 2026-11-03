import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, apiError } from '../renderApp';
import * as inventoryApi from '../../api/inventory';

vi.mock('../../api/inventory');

const item = (overrides = {}) => ({
  variant_id: 4,
  product_id: 9,
  product_name: 'Artisan Silk Batik Kurti',
  sku: 'DFC-9-FS',
  size: 'Free Size',
  color: 'Indigo',
  stock_quantity: 6,
  reserved_quantity: 2,
  available: 4,
  is_low: true,
  ...overrides,
});

const page = (items) => ({
  items,
  low_stock_threshold: 5,
  pagination: { total: items.length, page: 1, limit: 25, total_pages: 1 },
});

describe('stock', () => {
  beforeEach(() => {
    inventoryApi.listInventory.mockResolvedValue(
      page([
        item(),
        item({
          variant_id: 5,
          sku: 'DFC-9-M',
          size: 'M',
          color: null,
          stock_quantity: 30,
          reserved_quantity: 0,
          available: 30,
          is_low: false,
        }),
        item({
          variant_id: 6,
          sku: 'DFC-9-L',
          available: 0,
          stock_quantity: 0,
          reserved_quantity: 0,
        }),
      ])
    );
  });

  it('should show on hand, held and available with low and out markers', async () => {
    renderApp('/inventory');

    expect(await screen.findByText('Low: 4')).toBeInTheDocument();
    expect(screen.getByText('Out')).toBeInTheDocument();
    expect(screen.getByText(/Low stock means 5 or fewer available/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Artisan Silk Batik Kurti' })[0]).toHaveAttribute(
      'href',
      '/products/9'
    );
  });

  it('should filter to low stock and search through the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/inventory');
    await screen.findByText('Low: 4');

    await user.click(screen.getByLabelText('Low stock only'));
    await waitFor(() => expect(router.state.location.search).toBe('?low=true'));
    await waitFor(() =>
      expect(inventoryApi.listInventory).toHaveBeenLastCalledWith({
        search: '',
        low: true,
        page: 1,
        limit: 25,
      })
    );

    await user.type(screen.getByLabelText('Search stock'), 'DFC-9{Enter}');
    await waitFor(() => expect(router.state.location.search).toBe('?low=true&search=DFC-9'));
  });

  it('should say when nothing is low', async () => {
    inventoryApi.listInventory.mockResolvedValue(page([]));
    renderApp('/inventory?low=true');

    expect(await screen.findByText('Nothing is low on stock')).toBeInTheDocument();
  });

  it('should restock with a note and update the row in place', async () => {
    const user = userEvent.setup();
    inventoryApi.adjustStock.mockResolvedValue(
      item({ stock_quantity: 16, available: 14, is_low: false })
    );
    renderApp('/inventory');

    await user.click(await screen.findByRole('button', { name: 'Adjust stock for DFC-9-FS' }));
    const dialog = screen.getByRole('dialog', { name: 'Adjust stock: DFC-9-FS' });
    await user.type(within(dialog).getByLabelText('Quantity'), '10');
    expect(within(dialog).getByText(/On hand after saving/)).toHaveTextContent('16 (14 available');
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Invoice 4471');
    await user.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));

    await waitFor(() =>
      expect(inventoryApi.adjustStock).toHaveBeenCalledWith(4, {
        delta: 10,
        reason: 'restock',
        note: 'Invoice 4471',
      })
    );
    expect(await screen.findByText('DFC-9-FS: added 10, 16 on hand')).toBeInTheDocument();
    expect(screen.queryByText('Low: 4')).not.toBeInTheDocument();
    expect(inventoryApi.listInventory).toHaveBeenCalledTimes(1);
  });

  it('should switch to removing for damage and refuse to go below held units', async () => {
    const user = userEvent.setup();
    renderApp('/inventory');

    await user.click(await screen.findByRole('button', { name: 'Adjust stock for DFC-9-FS' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'damaged');
    expect(within(dialog).getByRole('button', { name: 'Remove units' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await user.type(within(dialog).getByLabelText('Quantity'), '5');
    await user.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));

    expect(within(dialog).getByText(/Only 4 can be removed: 2 are held/)).toBeInTheDocument();
    expect(inventoryApi.adjustStock).not.toHaveBeenCalled();
  });

  it('should remove stock and report it', async () => {
    const user = userEvent.setup();
    inventoryApi.adjustStock.mockResolvedValue(item({ stock_quantity: 5, available: 3 }));
    renderApp('/inventory');

    await user.click(await screen.findByRole('button', { name: 'Adjust stock for DFC-9-FS' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove units' }));
    await user.type(within(dialog).getByLabelText('Quantity'), '1');
    await user.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));

    expect(await screen.findByText('DFC-9-FS: removed 1, 5 on hand')).toBeInTheDocument();
  });

  it('should require a whole quantity and a note for "other"', async () => {
    const user = userEvent.setup();
    inventoryApi.adjustStock.mockRejectedValue(
      apiError(409, 'CONFLICT', 'Stock cannot go below 3: that many are held')
    );
    renderApp('/inventory');

    await user.click(await screen.findByRole('button', { name: 'Adjust stock for DFC-9-FS' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Reason'), 'other');
    await user.type(within(dialog).getByLabelText('Quantity'), '1.5');
    await user.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));
    expect(within(dialog).getByText(/whole number from 1 to 10000/)).toBeInTheDocument();
    expect(within(dialog).getByText('Explain the change.')).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('Quantity'));
    await user.type(within(dialog).getByLabelText('Quantity'), '1');
    await user.type(within(dialog).getByLabelText('Note'), 'Found in back room');
    await user.click(within(dialog).getByRole('button', { name: 'Save adjustment' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Stock cannot go below 3');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  });

  it('should show who changed stock and when', async () => {
    const user = userEvent.setup();
    inventoryApi.getStockLogs.mockResolvedValue({
      logs: [
        {
          id: 2,
          change_quantity: -1,
          reason: 'damaged',
          created_at: '2026-10-27T10:00:00Z',
          admin_name: null,
        },
        {
          id: 1,
          change_quantity: 10,
          reason: 'restock: Invoice 4471',
          created_at: '2026-10-26T10:00:00Z',
          admin_name: 'Super Admin',
        },
      ],
      reasons: [],
    });
    renderApp('/inventory');

    await user.click(await screen.findByRole('button', { name: 'Stock history for DFC-9-FS' }));
    const dialog = await screen.findByRole('dialog', { name: 'Stock history: DFC-9-FS' });

    expect(await within(dialog).findByText('+10')).toHaveClass('delta--up');
    expect(within(dialog).getByText('-1')).toHaveClass('delta--down');
    expect(within(dialog).getByText('System')).toBeInTheDocument();
    expect(inventoryApi.getStockLogs).toHaveBeenCalledWith(4);
  });

  it('should say when a size has no history', async () => {
    const user = userEvent.setup();
    inventoryApi.getStockLogs.mockResolvedValue({ logs: [], reasons: [] });
    renderApp('/inventory');

    await user.click(await screen.findByRole('button', { name: 'Stock history for DFC-9-M' }));

    expect(await screen.findByText('No changes recorded yet')).toBeInTheDocument();
  });
});

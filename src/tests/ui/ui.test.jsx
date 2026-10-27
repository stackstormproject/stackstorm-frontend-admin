import { useState } from 'react';
import { act, render, screen, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Dialog } from '../../components/ui/Dialog';
import { Pagination } from '../../components/ui/Pagination';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { ErrorState, EmptyState, LoadingState } from '../../components/ui/States';
import { useResource } from '../../hooks/useResource';

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        title="Ship order"
        description="Add the tracking number"
        onClose={() => setOpen(false)}
        footer={<button type="button">Confirm</button>}
      >
        <input aria-label="Tracking number" />
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('should be labelled, trap focus and return focus on Escape', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const opener = screen.getByRole('button', { name: 'Open' });

    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Ship order' });
    expect(dialog).toHaveAccessibleDescription('Add the tracking number');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('should close from the close button', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('should page forward and back and disable at the ends', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(
      <Pagination
        pagination={{ page: 1, total_pages: 3, total: 30 }}
        onPageChange={onPageChange}
        noun="orders"
      />
    );

    expect(screen.getByText('Page 1 of 3 · 30 orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(
      <Pagination pagination={{ page: 3, total_pages: 3, total: 30 }} onPageChange={onPageChange} />
    );
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
  });

  it('should render nothing without results', () => {
    const { container } = render(
      <Pagination pagination={{ page: 1, total_pages: 0, total: 0 }} onPageChange={() => {}} />
    );
    render(<Pagination pagination={null} onPageChange={() => {}} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('StatusBadge', () => {
  it('should always show the status as text with a tone', () => {
    render(
      <>
        <StatusBadge status="payment_pending" />
        <StatusBadge status="agent_active" />
        <StatusBadge status="mystery" />
        <StatusBadge status="gold" label="Gold tier" />
      </>
    );

    expect(screen.getByText('Payment pending')).toHaveClass('badge--warning');
    expect(screen.getByText('With an agent')).toHaveClass('badge--success');
    expect(screen.getByText('Mystery')).toHaveClass('badge');
    expect(screen.getByText('Gold tier')).toHaveClass('badge--accent');
  });
});

describe('PageHeader and states', () => {
  it('should render the back link, eyebrow and actions', () => {
    render(
      <MemoryRouter>
        <PageHeader
          eyebrow="Sales"
          title="Order DFC-1"
          description="Placed today"
          back={{ to: '/orders', label: 'All orders' }}
          actions={<button type="button">Print</button>}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'All orders' })).toHaveAttribute('href', '/orders');
    expect(screen.getByRole('heading', { name: 'Order DFC-1' })).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  it('should offer retry on errors and announce loading', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <>
        <LoadingState />
        <ErrorState error={new Error('Server down')} onRetry={onRetry} />
        <EmptyState title="No orders">Nothing yet</EmptyState>
      </>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(screen.getByRole('alert')).toHaveTextContent('Server down');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });
});

describe('useResource', () => {
  it('should load, expose errors and reload', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ n: 1 });
    const { result } = renderHook(() => useResource(load, []));

    await waitFor(() => expect(result.current.error?.message).toBe('boom'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }));

    act(() => result.current.setData((d) => ({ ...d, n: 2 })));
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }));
    act(() => result.current.setData({ n: 3 }));
    await waitFor(() => expect(result.current.data).toEqual({ n: 3 }));
  });
});

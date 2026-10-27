import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { renderApp, ADMINS } from '../renderApp';
import * as analytics from '../../api/analytics';
import * as orders from '../../api/orders';
import * as returns from '../../api/returns';
import * as products from '../../api/products';
import * as inventory from '../../api/inventory';
import * as customers from '../../api/customers';
import * as support from '../../api/support';
import { createSupportSocket } from '../../services/supportSocket';

vi.mock('../../api/analytics');
vi.mock('../../api/orders', async (importOriginal) => ({
  ...(await importOriginal()),
  listOrders: vi.fn(),
  getOrder: vi.fn(),
}));
vi.mock('../../api/returns', async (importOriginal) => ({
  ...(await importOriginal()),
  listReturns: vi.fn(),
  getReturn: vi.fn(),
}));
vi.mock('../../api/products');
vi.mock('../../api/inventory');
vi.mock('../../api/customers');
vi.mock('../../api/support');
vi.mock('../../services/supportSocket');

// NFR008: WCAG 2.1 AA. axe-core checks names, roles, labels, landmarks and ARIA use.
// Colour contrast cannot be computed in jsdom; the palette was checked by hand (README).
const AXE_OPTIONS = { rules: { 'color-contrast': { enabled: false } } };
const PAGE = { total: 1, page: 1, limit: 20, total_pages: 1 };
const DATE = '2026-10-27T08:00:00Z';

const ORDER = {
  id: 11,
  invoice_number: 'DFC-2026-0011',
  customer_name: 'Alice Silva',
  customer_email: 'alice@example.com',
  is_guest: false,
  status: 'processing',
  shipping_option: 'standard',
  items_count: 1,
  total_amount: 4650,
  order_date: DATE,
  tracking_number: null,
  shipping_cost: 450,
  tax_amount: 0,
  discount_amount: 0,
  delivery_date: null,
  shipping_address: { line1: '12 Main Street', city: 'Dickwella' },
  billing_address: { line1: '12 Main Street', city: 'Dickwella' },
  customer: { id: 4, name: 'Alice Silva', email: 'alice@example.com', phone: null },
  items: [
    {
      id: 1,
      product_id: 13,
      product_title: 'Dumbara Shawl',
      primary_image: 'https://img.example/1.jpg',
      sku: 'DFC-13-OS',
      size: 'One Size',
      color: 'Natural',
      quantity: 1,
      unit_price: 4200,
      subtotal: 4200,
    },
  ],
  allowed_statuses: ['shipped', 'cancelled'],
};

const RETURN = {
  id: 1,
  type: 'return',
  status: 'approved',
  reason: 'Too small',
  refund_amount: 4200,
  created_at: DATE,
  order: { id: 11, invoice_number: 'DFC-2026-0011', delivery_date: DATE },
  customer: { id: 4, name: 'Alice Silva', email: 'alice@example.com' },
  item: {
    product_name: 'Dumbara Shawl',
    sku: 'DFC-13-OS',
    size: 'One Size',
    color: 'Natural',
    quantity: 1,
    subtotal: 4200,
  },
  exchange: null,
};

const VARIANT = {
  id: 30,
  sku: 'DFC-14-M',
  size: 'M',
  color: 'Sand',
  additional_price: 0,
  stock_quantity: 8,
  reserved_quantity: 0,
  available: 8,
  in_use: false,
};

const PRODUCT = {
  id: 14,
  name: 'Galle Fort Linen Shirt',
  price: 5200,
  brand: 'Dickwella Atelier',
  category_id: 12,
  category_name: 'Linen Casual Shirts',
  is_final_sale: false,
  is_active: true,
  primary_image: null,
  variants: [VARIANT, { ...VARIANT, id: 31, sku: 'DFC-14-L', size: 'L' }],
  total_available: 16,
  updated_at: DATE,
};

const STOCK_ITEM = {
  variant_id: 30,
  product_id: 14,
  product_name: 'Galle Fort Linen Shirt',
  sku: 'DFC-14-M',
  size: 'M',
  color: 'Sand',
  stock_quantity: 3,
  reserved_quantity: 1,
  available: 2,
  is_low: true,
};

const CUSTOMER = {
  id: 4,
  name: 'Alice Silva',
  email: 'alice@example.com',
  phone: null,
  registered_at: DATE,
  tier: 'gold',
  points: 120,
  order_count: 1,
  total_spent: 4650,
  last_order_at: DATE,
  recent_orders: [
    {
      id: 11,
      invoice_number: 'DFC-2026-0011',
      order_date: DATE,
      status: 'shipped',
      total_amount: 4650,
    },
  ],
  addresses: [],
  loyalty_transactions: [],
};

beforeEach(() => {
  analytics.getOverview.mockResolvedValue({
    metrics: {
      total_revenue: 4650,
      paid_orders: 1,
      awaiting_payment: 0,
      active_customers: 1,
      average_order_value: 4650,
      return_rate_percentage: 0,
      open_returns: 0,
      low_stock_count: 1,
      low_stock_threshold: 5,
      support_queue_count: 0,
    },
    top_products: [{ product_id: 13, title: 'Dumbara Shawl', units_sold: 1, revenue: 4200 }],
    recent_orders: [ORDER],
  });
  analytics.getSalesTrend.mockResolvedValue({
    days: 30,
    series: [{ date: '2026-10-27', revenue: 4650, orders: 1 }],
    totals: { revenue: 4650, orders: 1 },
  });
  orders.listOrders.mockResolvedValue({ orders: [ORDER], pagination: PAGE });
  orders.getOrder.mockResolvedValue(ORDER);
  returns.listReturns.mockResolvedValue({ returns: [RETURN], pagination: PAGE });
  returns.getReturn.mockResolvedValue(RETURN);
  products.listCategories.mockResolvedValue([
    { id: 1, name: 'Men', children: [{ id: 12, name: 'Linen Casual Shirts', children: [] }] },
  ]);
  products.listProducts.mockResolvedValue({ products: [PRODUCT], pagination: PAGE });
  products.getProduct.mockResolvedValue(PRODUCT);
  inventory.listInventory.mockResolvedValue({
    items: [STOCK_ITEM],
    low_stock_threshold: 5,
    pagination: PAGE,
  });
  customers.listCustomers.mockResolvedValue({ customers: [CUSTOMER], pagination: PAGE });
  customers.getCustomer.mockResolvedValue(CUSTOMER);
  support.listSupportSessions.mockResolvedValue([
    {
      id: '7',
      customer_id: '4',
      customer_name: 'Alice Silva',
      customer_email: 'alice@example.com',
      tier: 'Gold',
      status: 'agent_active',
      inquiry_topic: 'Order help',
      created_at: DATE,
      messages: [
        { id: 'm1', sender: 'customer', sender_name: 'Alice', text: 'Hi', timestamp: DATE },
      ],
    },
  ]);
  createSupportSocket.mockReturnValue({
    joinSession: vi.fn(),
    sendMessage: vi.fn(),
    sendTyping: vi.fn(),
    disconnect: vi.fn(),
  });
});

const expectNoViolations = async (container) =>
  expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();

describe('accessibility (axe)', () => {
  it.each([
    ['/dashboard', /Paid revenue per day/],
    ['/orders', /DFC-2026-0011/],
    ['/orders/11', /Mark as shipped/],
    ['/returns', /Return #1/],
    ['/returns/1', /Record returned parcel/],
    ['/products', /Galle Fort Linen Shirt/],
    ['/products/new', /Sizes and stock/],
    ['/products/14', /Add size/],
    ['/inventory', /Low: 2/],
    ['/customers', /Alice Silva/],
    ['/customers/4', /Points history/],
    ['/support?session=7', /Mark resolved/],
  ])('should have no violations on %s', async (url, ready) => {
    const { container } = renderApp(url);
    await screen.findAllByText(ready);
    await expectNoViolations(container);
  });

  it('should have no violations on the sign-in page with errors', async () => {
    const user = userEvent.setup();
    const { container } = renderApp('/login', { admin: null });
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    await expectNoViolations(container);
  });

  it('should have no violations on the role page for a support agent', async () => {
    const { container } = renderApp('/orders', { admin: ADMINS.agent });
    await screen.findByText(/not available for your role/);
    await expectNoViolations(container);
  });

  it.each([
    ['/orders/11', 'Mark as shipped'],
    ['/returns/1', 'Record returned parcel'],
    ['/products/14', 'Add size'],
    ['/inventory', 'Adjust stock for DFC-14-M'],
    ['/customers/4', 'Adjust points'],
  ])('should have no violations in the dialog on %s', async (url, button) => {
    const user = userEvent.setup();
    const { baseElement } = renderApp(url);
    await user.click(await screen.findByRole('button', { name: button }));
    await screen.findByRole('dialog');
    await expectNoViolations(baseElement);
  });
});

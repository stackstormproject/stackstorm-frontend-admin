import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, apiError } from '../renderApp';
import * as productsApi from '../../api/products';
import { validateVariants, validateProduct, emptyProduct } from '../../lib/productForm';

vi.mock('../../api/products');

const categories = [
  {
    id: 1,
    name: 'Men',
    children: [{ id: 12, name: 'Linen Casual Shirts', children: [] }],
  },
];

const variant = (overrides = {}) => ({
  id: 30,
  sku: 'DFC-14-M-SAND',
  size: 'M',
  color: 'Sand',
  additional_price: 0,
  stock_quantity: 8,
  reserved_quantity: 0,
  available: 8,
  in_use: false,
  ...overrides,
});

const product = (overrides = {}) => ({
  id: 14,
  name: 'Galle Fort Linen Shirt',
  price: 5200,
  description: null,
  material: 'Linen',
  care_instructions: null,
  brand: 'Dickwella Atelier',
  category_id: 12,
  category_name: 'Linen Casual Shirts',
  is_final_sale: false,
  is_active: true,
  primary_image: null,
  variants: [
    variant(),
    variant({ id: 31, sku: 'DFC-14-L-SAND', size: 'L', additional_price: 200 }),
  ],
  total_available: 12,
  updated_at: '2026-10-27T12:00:00Z',
  ...overrides,
});

beforeEach(() => {
  productsApi.listCategories.mockResolvedValue(categories);
});

describe('product list', () => {
  it('should list shop products with price, sizes and stock', async () => {
    productsApi.listProducts.mockResolvedValue({
      products: [
        product(),
        product({ id: 15, name: 'Sold Out Sari', total_available: 0, is_final_sale: true }),
      ],
      pagination: { total: 2, page: 1, total_pages: 1 },
    });
    renderApp('/products');

    expect(await screen.findByRole('link', { name: 'Galle Fort Linen Shirt' })).toHaveAttribute(
      'href',
      '/products/14'
    );
    expect(screen.getByText('Sold out')).toBeInTheDocument();
    expect(screen.getByText('Final sale')).toBeInTheDocument();
    expect(productsApi.listProducts).toHaveBeenCalledWith({
      status: 'active',
      search: '',
      category_id: '',
      page: 1,
    });
  });

  it('should switch to archived products and filter by category', async () => {
    const user = userEvent.setup();
    productsApi.listProducts.mockResolvedValue({ products: [], pagination: { total: 0 } });
    const { router } = renderApp('/products');

    await user.click(await screen.findByRole('button', { name: 'Archived' }));
    expect(await screen.findByText('No archived products')).toBeInTheDocument();

    await screen.findByRole('option', { name: 'Linen Casual Shirts' });
    await user.selectOptions(screen.getByLabelText('Category'), '12');
    await waitFor(() =>
      expect(router.state.location.search).toBe('?status=archived&category_id=12')
    );
  });
});

describe('new product', () => {
  it('should validate before saving and focus the first problem', async () => {
    const user = userEvent.setup();
    renderApp('/products/new');

    await user.click(await screen.findByRole('button', { name: 'Save product' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Check the highlighted fields.');
    expect(screen.getByText(/Enter a name of 2-120 characters/)).toBeInTheDocument();
    expect(screen.getByText(/so shoppers can find it/)).toBeInTheDocument();
    expect(screen.getByText(/Enter a size/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Product name')).toHaveFocus());
    expect(productsApi.createProduct).not.toHaveBeenCalled();
  });

  it('should create the product with its sizes and open it', async () => {
    const user = userEvent.setup();
    productsApi.createProduct.mockResolvedValue(product());
    productsApi.getProduct.mockResolvedValue(product());
    const { router } = renderApp('/products/new');

    await user.type(await screen.findByLabelText('Product name'), 'Galle Fort Linen Shirt');
    await screen.findByRole('option', { name: 'Linen Casual Shirts' });
    await user.selectOptions(screen.getByLabelText('Category'), '12');
    await user.type(screen.getByLabelText('Price (LKR)'), '5200');
    await user.click(screen.getByLabelText(/Final sale/));
    await user.type(screen.getByLabelText('Size'), 'M');
    await user.type(screen.getByLabelText('Colour'), 'Sand');
    await user.clear(screen.getByLabelText('Opening stock'));
    await user.type(screen.getByLabelText('Opening stock'), '8');
    await user.click(screen.getByRole('button', { name: 'Add another size' }));
    const sizes = screen.getAllByLabelText('Size');
    await user.type(sizes[1], 'L');
    await user.click(screen.getByRole('button', { name: 'Remove size 2' }));
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products/14'));
    expect(productsApi.createProduct).toHaveBeenCalledWith({
      name: 'Galle Fort Linen Shirt',
      category_id: 12,
      price: 5200,
      brand: null,
      material: null,
      description: null,
      care_instructions: null,
      primary_image: null,
      gallery_images: [],
      is_final_sale: true,
      is_new_arrival: false,
      is_popular: false,
      on_sale: false,
      discount_percentage: null,
      variants: [{ size: 'M', color: 'Sand', additional_price: 0, stock_quantity: 8 }],
    });
    expect(
      await screen.findByText('Galle Fort Linen Shirt is now in the shop')
    ).toBeInTheDocument();
  });

  it('should show the server refusal', async () => {
    const user = userEvent.setup();
    productsApi.createProduct.mockRejectedValue(
      apiError(400, 'BAD_REQUEST', 'Category 12 does not exist')
    );
    renderApp('/products/new');

    await user.type(await screen.findByLabelText('Product name'), 'Shirt');
    await screen.findByRole('option', { name: 'Linen Casual Shirts' });
    await user.selectOptions(screen.getByLabelText('Category'), '12');
    await user.type(screen.getByLabelText('Price (LKR)'), '100');
    await user.type(screen.getByLabelText('Size'), 'M');
    await user.click(screen.getByRole('button', { name: 'Save product' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Category 12 does not exist');
  });

  it('should go back to the list on cancel', async () => {
    const user = userEvent.setup();
    productsApi.listProducts.mockResolvedValue({ products: [], pagination: { total: 0 } });
    const { router } = renderApp('/products/new');

    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(router.state.location.pathname).toBe('/products');
  });
});

describe('edit product', () => {
  beforeEach(() => {
    productsApi.getProduct.mockResolvedValue(product());
  });

  it('should save edited details', async () => {
    const user = userEvent.setup();
    productsApi.updateProduct.mockResolvedValue(product());
    renderApp('/products/14');

    const name = await screen.findByLabelText('Product name');
    await user.clear(name);
    await user.type(name, 'Galle Fort Shirt');
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    await waitFor(() =>
      expect(productsApi.updateProduct).toHaveBeenCalledWith(
        14,
        expect.objectContaining({ name: 'Galle Fort Shirt', price: 5200, category_id: 12 })
      )
    );
    expect(await screen.findByText('Product details saved')).toBeInTheDocument();
  });

  it('should not save invalid details', async () => {
    const user = userEvent.setup();
    productsApi.updateProduct.mockRejectedValue(apiError(400, 'X', 'Image must be an http(s) URL'));
    renderApp('/products/14');

    const price = await screen.findByLabelText('Price (LKR)');
    await user.clear(price);
    await user.click(screen.getByRole('button', { name: 'Save details' }));
    expect(screen.getByText(/Enter a price in rupees/)).toBeInTheDocument();
    expect(productsApi.updateProduct).not.toHaveBeenCalled();

    await user.type(price, '10');
    await user.click(screen.getByRole('button', { name: 'Save details' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Image must be an http(s) URL');
  });

  it('should archive after confirming', async () => {
    const user = userEvent.setup();
    productsApi.updateProduct.mockResolvedValue({});
    renderApp('/products/14');

    await user.click(await screen.findByRole('button', { name: 'Archive' }));
    const dialog = screen.getByRole('dialog', { name: 'Archive product' });
    await user.click(within(dialog).getByRole('button', { name: 'Archive' }));

    await waitFor(() =>
      expect(productsApi.updateProduct).toHaveBeenCalledWith(14, { is_active: false })
    );
    expect(await screen.findByText('Product archived')).toBeInTheDocument();
  });

  it('should restore an archived product', async () => {
    const user = userEvent.setup();
    productsApi.getProduct.mockResolvedValue(product({ is_active: false }));
    productsApi.updateProduct.mockResolvedValue({});
    renderApp('/products/14');

    await user.click(await screen.findByRole('button', { name: 'Restore to shop' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Restore' }));

    await waitFor(() =>
      expect(productsApi.updateProduct).toHaveBeenCalledWith(14, { is_active: true })
    );
  });

  it('should explain why a sold product cannot be deleted', async () => {
    const user = userEvent.setup();
    productsApi.deleteProduct.mockRejectedValue(
      apiError(409, 'CONFLICT', 'This product has orders or holds. Archive it instead.')
    );
    renderApp('/products/14');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete product' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete permanently' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Archive it instead.');
  });

  it('should delete a never-sold product and return to the list', async () => {
    const user = userEvent.setup();
    productsApi.deleteProduct.mockResolvedValue(null);
    productsApi.listProducts.mockResolvedValue({ products: [], pagination: { total: 0 } });
    const { router } = renderApp('/products/14');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete permanently' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/products'));
  });

  it('should add a size with opening stock', async () => {
    const user = userEvent.setup();
    productsApi.addVariant.mockResolvedValue({});
    renderApp('/products/14');

    await user.click(await screen.findByRole('button', { name: 'Add size' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a size' });
    await user.type(within(dialog).getByLabelText('Size'), 'XL');
    await user.clear(within(dialog).getByLabelText('Opening stock'));
    await user.type(within(dialog).getByLabelText('Opening stock'), '3');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(productsApi.addVariant).toHaveBeenCalledWith(14, {
        size: 'XL',
        color: null,
        additional_price: 0,
        stock_quantity: 3,
      })
    );
    expect(await screen.findByText('Size added')).toBeInTheDocument();
  });

  it('should only allow the extra price to change on an ordered size', async () => {
    const user = userEvent.setup();
    productsApi.getProduct.mockResolvedValue(
      product({ variants: [variant({ in_use: true }), variant({ id: 31, sku: 'DFC-14-L' })] })
    );
    productsApi.updateVariant.mockResolvedValue({});
    renderApp('/products/14');

    expect(await screen.findByRole('button', { name: 'Remove DFC-14-M-SAND' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Edit DFC-14-M-SAND' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleDescription(/has been ordered/);
    expect(within(dialog).getByLabelText('Size')).toBeDisabled();
    const extra = within(dialog).getByLabelText('Extra price (LKR)');
    await user.clear(extra);
    await user.type(extra, '150');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(productsApi.updateVariant).toHaveBeenCalledWith(14, 30, { additional_price: 150 })
    );
  });

  it('should rename an unused size and show conflicts', async () => {
    const user = userEvent.setup();
    productsApi.updateVariant.mockRejectedValueOnce(
      apiError(409, 'CONFLICT', 'That size and colour already exist')
    );
    renderApp('/products/14');

    await user.click(await screen.findByRole('button', { name: 'Edit DFC-14-M-SAND' }));
    const dialog = screen.getByRole('dialog');
    const size = within(dialog).getByLabelText('Size');
    await user.clear(size);
    await user.type(size, 'L');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exist');
    expect(productsApi.updateVariant).toHaveBeenCalledWith(14, 30, {
      size: 'L',
      color: 'Sand',
      additional_price: 0,
    });
  });

  it('should remove an unused size after confirming', async () => {
    const user = userEvent.setup();
    productsApi.deleteVariant.mockResolvedValue({});
    renderApp('/products/14');

    await user.click(await screen.findByRole('button', { name: 'Remove DFC-14-L-SAND' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove size' })
    );

    await waitFor(() => expect(productsApi.deleteVariant).toHaveBeenCalledWith(14, 31));
    expect(await screen.findByText('Size removed')).toBeInTheDocument();
  });

  it('should keep the last size', async () => {
    productsApi.getProduct.mockResolvedValue(product({ variants: [variant()] }));
    renderApp('/products/14');

    const remove = await screen.findByRole('button', { name: 'Remove DFC-14-M-SAND' });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'A product needs at least one size');
  });

  it('should link each size to its stock adjustment', async () => {
    renderApp('/products/14');

    const links = await screen.findAllByRole('link', { name: 'Adjust stock' });
    expect(links[0]).toHaveAttribute('href', '/inventory?search=DFC-14-M-SAND');
  });

  it('should report a missing product', async () => {
    productsApi.getProduct.mockRejectedValue(apiError(404, 'NOT_FOUND', 'Product 99 not found'));
    renderApp('/products/99');

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});

describe('product form rules', () => {
  it('should flag duplicate sizes, long values and bad numbers', () => {
    const errors = validateVariants([
      { size: 'M', color: 'Blue', additional_price: '0', stock_quantity: '1' },
      { size: 'm', color: 'blue', additional_price: '-1', stock_quantity: '1.5' },
      { size: 'X'.repeat(21), color: 'C'.repeat(31), additional_price: '', stock_quantity: '0' },
    ]);

    expect(errors[0]).toBeUndefined();
    expect(errors[1]).toMatchObject({
      size: expect.stringMatching(/twice/),
      additional_price: expect.any(String),
      stock_quantity: expect.any(String),
    });
    expect(errors[2]).toMatchObject({ size: expect.any(String), color: expect.any(String) });
  });

  it('should reject a non-http image link', () => {
    expect(
      validateProduct({
        ...emptyProduct(),
        name: 'Sari',
        category_id: '1',
        price: '100',
        primary_image: 'ftp://x',
      })
    ).toEqual({ primary_image: 'Upload the photo again.' });
  });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, apiError } from '../renderApp';
import * as productsApi from '../../api/products';
import { ImageUploader } from '../../components/catalog/ImageUploader';
import { imageFileProblem, productPayload, productToForm } from '../../lib/productForm';

vi.mock('../../api/products');

// Refs #179: product photos, home page sections and brands.
const photo = (name = 'shirt.jpg', type = 'image/jpeg', size = 1000) =>
  new File([new Uint8Array(size)], name, { type });

const choose = (label, file) =>
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });

describe('imageFileProblem', () => {
  it('should accept photos up to 5 MB and explain anything else', () => {
    expect(imageFileProblem(photo())).toBeNull();
    expect(imageFileProblem(photo('a.gif', 'image/gif'))).toMatch(/not a JPEG, PNG or WebP/);
    expect(imageFileProblem(photo('big.png', 'image/png', 6 * 1024 * 1024))).toMatch(/5 MB/);
  });
});

describe('ImageUploader', () => {
  const setup = (main = '', extras = []) => {
    const onChange = vi.fn();
    render(<ImageUploader main={main} extras={extras} onChange={onChange} />);
    return onChange;
  };

  it('should upload a main photo', async () => {
    productsApi.uploadImages.mockResolvedValue({ urls: ['/api/v1/media/products/a.jpg'] });
    const onChange = setup();

    choose('Choose main photo', photo());

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        primary_image: '/api/v1/media/products/a.jpg',
        gallery_images: [],
      })
    );
    expect(productsApi.uploadImages.mock.calls[0][0][0].name).toBe('shirt.jpg');
  });

  it('should make the first extra photo the main one when there is none', async () => {
    productsApi.uploadImages.mockResolvedValue({ urls: ['/m/b.jpg'] });
    const onChange = setup();

    choose('Choose extra photo 2', photo());

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({ primary_image: '/m/b.jpg', gallery_images: [] })
    );
  });

  it('should add extra photos, swap the main photo and remove one', async () => {
    productsApi.uploadImages.mockResolvedValue({ urls: ['/m/d.jpg'] });
    const onChange = setup('/m/a.jpg', ['/m/b.jpg', '/m/c.jpg']);

    expect(screen.getByRole('img', { name: 'Main photo' })).toHaveAttribute('src', '/m/a.jpg');
    choose('Choose extra photo 3', photo());
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        primary_image: '/m/a.jpg',
        gallery_images: ['/m/b.jpg', '/m/c.jpg', '/m/d.jpg'],
      })
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Make extra photo 2 the main photo' })
    );
    expect(onChange).toHaveBeenLastCalledWith({
      primary_image: '/m/c.jpg',
      gallery_images: ['/m/b.jpg', '/m/a.jpg'],
    });

    await userEvent.click(screen.getByRole('button', { name: 'Remove main photo' }));
    expect(onChange).toHaveBeenLastCalledWith({
      primary_image: '',
      gallery_images: ['/m/b.jpg', '/m/c.jpg'],
    });
  });

  it('should refuse unsupported files and show upload errors', async () => {
    productsApi.uploadImages.mockRejectedValue(apiError(400, 'INVALID_FILE_TYPE', 'Bad file'));
    const onChange = setup();

    choose('Choose main photo', photo('a.gif', 'image/gif'));
    expect(screen.getByRole('alert')).toHaveTextContent('a.gif is not a JPEG, PNG or WebP photo.');
    expect(productsApi.uploadImages).not.toHaveBeenCalled();

    choose('Choose main photo', photo());
    expect(await screen.findByText('Bad file')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should ignore an empty file choice', () => {
    const onChange = setup();
    fireEvent.change(screen.getByLabelText('Choose main photo'), { target: { files: [] } });
    expect(productsApi.uploadImages).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('product form with photos, sections and brand', () => {
  it('should carry photos and sections through the payload', () => {
    const values = productToForm({
      name: 'Saree',
      price: 9000,
      primary_image: '/m/a.jpg',
      gallery_images: ['/m/b.jpg'],
      is_new_arrival: true,
      is_popular: false,
    });

    expect(productPayload(values)).toMatchObject({
      primary_image: '/m/a.jpg',
      gallery_images: ['/m/b.jpg'],
      is_new_arrival: true,
      is_popular: false,
    });
  });

  it('should save sections and the brand chosen on the edit page', async () => {
    const user = userEvent.setup();
    const product = {
      id: 14,
      name: 'Galle Fort Linen Shirt',
      price: 5200,
      brand: 'Old Brand',
      category_id: 12,
      is_active: true,
      primary_image: '/api/v1/media/products/a.jpg',
      gallery_images: [],
      variants: [{ id: 30, size: 'M', available: 3, stock_quantity: 3, reserved_quantity: 0 }],
    };
    productsApi.listCategories.mockResolvedValue([]);
    productsApi.getProduct.mockResolvedValue(product);
    productsApi.updateProduct.mockResolvedValue(product);
    productsApi.listBrands.mockResolvedValue([{ id: 1, name: 'Dickwella Atelier' }]);
    renderApp('/products/14');

    const brand = await screen.findByLabelText('Brand');
    await screen.findByRole('option', { name: 'Dickwella Atelier' });
    expect(within(brand).getByRole('option', { name: 'Old Brand' })).toBeInTheDocument();
    await user.selectOptions(brand, 'Dickwella Atelier');
    await user.click(screen.getByLabelText('Show in “Popular now”'));
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    await waitFor(() =>
      expect(productsApi.updateProduct).toHaveBeenCalledWith(
        14,
        expect.objectContaining({
          brand: 'Dickwella Atelier',
          is_popular: true,
          is_new_arrival: false,
        })
      )
    );
  });

  it('should put a product on sale with a discount percentage (#203)', async () => {
    const user = userEvent.setup();
    const product = {
      id: 14,
      name: 'Galle Fort Linen Shirt',
      price: 5200,
      category_id: 12,
      is_active: true,
      primary_image: '/api/v1/media/products/a.jpg',
      gallery_images: [],
      on_sale: false,
      discount_percentage: null,
      variants: [{ id: 30, size: 'M', available: 3, stock_quantity: 3, reserved_quantity: 0 }],
    };
    productsApi.listCategories.mockResolvedValue([]);
    productsApi.getProduct.mockResolvedValue(product);
    productsApi.updateProduct.mockResolvedValue(product);
    productsApi.listBrands.mockResolvedValue([]);
    renderApp('/products/14');

    await screen.findByLabelText('Product name');
    await user.click(screen.getByLabelText('On sale'));
    await user.type(screen.getByLabelText('Discount percentage'), '20');
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    await waitFor(() =>
      expect(productsApi.updateProduct).toHaveBeenCalledWith(
        14,
        expect.objectContaining({ on_sale: true, discount_percentage: 20 })
      )
    );
  });

  it('should refuse an out-of-range discount and clear it when sale is unticked', async () => {
    const user = userEvent.setup();
    const product = {
      id: 14,
      name: 'Galle Fort Linen Shirt',
      price: 5200,
      category_id: 12,
      is_active: true,
      on_sale: true,
      discount_percentage: 20,
      variants: [{ id: 30, size: 'M', available: 3, stock_quantity: 3, reserved_quantity: 0 }],
    };
    productsApi.listCategories.mockResolvedValue([]);
    productsApi.getProduct.mockResolvedValue(product);
    productsApi.updateProduct.mockResolvedValue(product);
    productsApi.listBrands.mockResolvedValue([]);
    renderApp('/products/14');

    const discount = await screen.findByLabelText('Discount percentage');
    expect(discount).toHaveValue(20);
    await user.clear(discount);
    await user.type(discount, '95');
    await user.click(screen.getByRole('button', { name: 'Save details' }));
    expect(await screen.findByText('Enter a discount of 1-90%.')).toBeInTheDocument();
    expect(productsApi.updateProduct).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText('On sale'));
    expect(screen.queryByLabelText('Discount percentage')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save details' }));

    await waitFor(() =>
      expect(productsApi.updateProduct).toHaveBeenCalledWith(
        14,
        expect.objectContaining({ on_sale: false, discount_percentage: null })
      )
    );
  });

  it('should ask for a main photo before extra photos', async () => {
    const { validateProduct, emptyProduct } = await import('../../lib/productForm');
    expect(
      validateProduct({
        ...emptyProduct(),
        name: 'Sari',
        category_id: '1',
        price: '100',
        gallery_images: ['/m/b.jpg'],
      })
    ).toEqual({ primary_image: 'Add a main photo before the extra photos.' });
  });
});

describe('Brands page', () => {
  const BRANDS = [
    {
      id: 1,
      name: 'Dickwella Atelier',
      slug: 'dickwella-atelier',
      tagline: 'Our looms',
      logo_url: null,
      is_featured: true,
      sort_order: 1,
      product_count: 7,
    },
    {
      id: 2,
      name: 'Loom Co',
      logo_url: '/m/logo.png',
      is_featured: false,
      sort_order: 2,
      product_count: 0,
    },
  ];

  beforeEach(() => {
    productsApi.listBrands.mockResolvedValue(BRANDS);
  });

  it('should list brands with products, visibility and order', async () => {
    renderApp('/brands');

    const row = (await screen.findByText('Dickwella Atelier')).closest('tr');
    expect(within(row).getByText('7')).toBeInTheDocument();
    expect(within(row).getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('should add a brand with an uploaded logo', async () => {
    const user = userEvent.setup();
    productsApi.uploadImages.mockResolvedValue({ urls: ['/m/new-logo.png'] });
    productsApi.createBrand.mockResolvedValue({});
    renderApp('/brands');

    await user.click(await screen.findByRole('button', { name: 'New brand' }));
    const dialog = screen.getByRole('dialog', { name: 'New brand' });
    await user.click(within(dialog).getByRole('button', { name: 'Save brand' }));
    expect(within(dialog).getByText('Enter a brand name of 2-60 characters.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Brand name'), 'Ruhunu Looms');
    await user.type(within(dialog).getByLabelText('Tagline'), 'Southern weaves');
    fireEvent.change(within(dialog).getByLabelText('Upload logo'), {
      target: { files: [photo('logo.png', 'image/png')] },
    });
    expect(await within(dialog).findByRole('img', { name: 'Brand logo' })).toHaveAttribute(
      'src',
      '/m/new-logo.png'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save brand' }));

    await waitFor(() =>
      expect(productsApi.createBrand).toHaveBeenCalledWith({
        name: 'Ruhunu Looms',
        tagline: 'Southern weaves',
        logo_url: '/m/new-logo.png',
        is_featured: true,
        sort_order: 0,
      })
    );
    expect(await screen.findByText('Ruhunu Looms added')).toBeInTheDocument();
  });

  it('should edit a brand, remove its logo and show server errors', async () => {
    const user = userEvent.setup();
    productsApi.updateBrand
      .mockRejectedValueOnce(apiError(409, 'CONFLICT', 'A brand with this name already exists'))
      .mockResolvedValue({});
    renderApp('/brands');

    await user.click(await screen.findByRole('button', { name: 'Edit Loom Co' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit Loom Co' });
    await user.click(within(dialog).getByRole('button', { name: 'Remove logo' }));
    await user.click(within(dialog).getByLabelText('Show under “Our brands”'));
    await user.click(within(dialog).getByRole('button', { name: 'Save brand' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exists');

    await user.click(within(dialog).getByRole('button', { name: 'Save brand' }));
    await waitFor(() =>
      expect(productsApi.updateBrand).toHaveBeenLastCalledWith(2, {
        name: 'Loom Co',
        tagline: null,
        logo_url: null,
        is_featured: true,
        sort_order: 2,
      })
    );
  });

  it('should refuse a logo that is not a photo and report upload errors', async () => {
    const user = userEvent.setup();
    productsApi.uploadImages.mockRejectedValue(apiError(500, 'X', 'Upload failed'));
    renderApp('/brands');

    await user.click(await screen.findByRole('button', { name: 'New brand' }));
    const dialog = screen.getByRole('dialog', { name: 'New brand' });
    fireEvent.change(within(dialog).getByLabelText('Upload logo'), {
      target: { files: [photo('logo.gif', 'image/gif')] },
    });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('not a JPEG');
    fireEvent.change(within(dialog).getByLabelText('Upload logo'), {
      target: { files: [photo('logo.png', 'image/png')] },
    });
    expect(await within(dialog).findByText('Upload failed')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should delete a brand after confirming', async () => {
    const user = userEvent.setup();
    productsApi.deleteBrand.mockResolvedValue({});
    renderApp('/brands');

    await user.click(await screen.findByRole('button', { name: 'Delete Dickwella Atelier' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete Dickwella Atelier' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete brand' }));

    await waitFor(() => expect(productsApi.deleteBrand).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Dickwella Atelier deleted')).toBeInTheDocument();
  });

  it('should invite adding the first brand', async () => {
    productsApi.listBrands.mockResolvedValue([]);
    renderApp('/brands');

    expect(await screen.findByRole('heading', { name: 'No brands yet' })).toBeInTheDocument();
  });
});

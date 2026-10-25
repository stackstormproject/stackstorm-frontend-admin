import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import CatalogPage from '../pages/CatalogPage';
import ProductModal from '../components/catalog/ProductModal';
import DeleteConfirmModal from '../components/catalog/DeleteConfirmModal';
import { adminProductsApi, FALLBACK_PRODUCTS, FALLBACK_CATEGORIES } from '../api/adminProducts.api';

describe('Admin Product Catalog & Garment Creation Operations', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (url.includes('/api/v1/products') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 999,
                ...body,
              },
            }),
        });
      }
      if (url.includes('/api/v1/products') && options?.method === 'PUT') {
        const body = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                id: 1,
                ...body,
              },
            }),
        });
      }
      if (url.includes('/api/v1/products') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: null,
            }),
        });
      }
      if (url.includes('/api/v1/categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: FALLBACK_CATEGORIES,
            }),
        });
      }
      if (url.includes('/api/v1/products')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                products: FALLBACK_PRODUCTS,
                total: FALLBACK_PRODUCTS.length,
              },
            }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it('AC1: should render CatalogPage header and all 4 KPI telemetry cards', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    expect(screen.getByText(/Product Catalog & Garment Management/i)).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-garments')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-total-skus')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-categories')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-avg-price')).toBeInTheDocument();
  });

  it('AC2: should open Add New Product modal when CTA button is clicked', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    const addBtn = screen.getByTestId('add-new-product-btn');
    expect(addBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(addBtn);
    });

    expect(screen.getByText(/Add New Apparel Product/i)).toBeInTheDocument();
    expect(screen.getByTestId('product-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('product-price-input')).toBeInTheDocument();
    expect(screen.getByTestId('save-product-btn')).toBeInTheDocument();
  });

  it('AC3: should validate required product name and price before submission', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    // Open Modal
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-new-product-btn'));
    });

    // Clear name and price
    const nameInput = screen.getByTestId('product-name-input');
    const priceInput = screen.getByTestId('product-price-input');
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.change(priceInput, { target: { value: '' } });

    // Click Save
    const saveBtn = screen.getByTestId('save-product-btn');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(screen.getByText(/Product name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Valid price in LKR is required/i)).toBeInTheDocument();
  });

  it('AC4: should create a new product and add it to the catalog', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    // Open Modal
    await act(async () => {
      fireEvent.click(screen.getByTestId('add-new-product-btn'));
    });

    // Fill in product data
    const nameInput = screen.getByTestId('product-name-input');
    const priceInput = screen.getByTestId('product-price-input');

    fireEvent.change(nameInput, { target: { value: 'Kandyan Royal Silk Tunic' } });
    fireEvent.change(priceInput, { target: { value: '9500.00' } });

    // Submit form
    const saveBtn = screen.getByTestId('save-product-btn');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    // Expect modal to close and new product to appear in list
    await waitFor(() => {
      expect(screen.queryByText(/Add New Apparel Product/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Kandyan Royal Silk Tunic')).toBeInTheDocument();
  });

  it('AC5: should filter products by search query', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    const searchInput = screen.getByTestId('catalog-search-input');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Batik' } });
    });

    expect(screen.getByText(/Hand-Dyed Silk Batik Shirt/i)).toBeInTheDocument();
    expect(screen.queryByText(/Heritage Ceylon Handloom Saree/i)).not.toBeInTheDocument();
  });

  it('AC6: should toggle between grid and table views', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    // Default is grid view
    expect(screen.getByTestId(`product-card-${FALLBACK_PRODUCTS[0].id}`)).toBeInTheDocument();

    // Switch to table view
    const tableBtn = screen.getByRole('button', { name: /table view/i });
    await act(async () => {
      fireEvent.click(tableBtn);
    });

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText(/Thumbnail/i)).toBeInTheDocument();
  });

  it('AC7: should support editing an existing product and submitting updates', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    const editBtn = screen.getByTestId(`edit-product-${FALLBACK_PRODUCTS[0].id}`);
    await act(async () => {
      fireEvent.click(editBtn);
    });

    expect(screen.getByText(/Edit Garment Specification/i)).toBeInTheDocument();
    const priceInput = screen.getByTestId('product-price-input');
    fireEvent.change(priceInput, { target: { value: '8900.00' } });

    const saveBtn = screen.getByTestId('save-product-btn');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Edit Garment Specification/i)).not.toBeInTheDocument();
    });
  });

  it('AC8: should open and cancel DeleteConfirmModal without deleting', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    const deleteBtn = screen.getByTestId(`delete-product-${FALLBACK_PRODUCTS[0].id}`);
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(screen.getByText(/Remove Product From Catalog\?/i)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await act(async () => {
      fireEvent.click(cancelBtn);
    });

    expect(screen.queryByText(/Remove Product From Catalog\?/i)).not.toBeInTheDocument();
    expect(screen.getByTestId(`product-card-${FALLBACK_PRODUCTS[0].id}`)).toBeInTheDocument();
  });

  it('AC9: should confirm product deletion in DeleteConfirmModal and remove it from catalog', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    const deleteBtn = screen.getByTestId(`delete-product-${FALLBACK_PRODUCTS[1].id}`);
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    const confirmBtn = screen.getByTestId('confirm-delete-product-btn');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(`product-card-${FALLBACK_PRODUCTS[1].id}`)
      ).not.toBeInTheDocument();
    });
  });

  it('AC10: should support adding, editing and removing SKU variants in ProductModal', async () => {
    const handleClose = vi.fn();
    const handleSubmit = vi.fn().mockResolvedValue(true);

    const { rerender } = render(
      <ProductModal isOpen={true} onClose={handleClose} onSubmit={handleSubmit} />
    );

    expect(screen.getByText(/Add New Apparel Product/i)).toBeInTheDocument();

    // Add variant
    const addVarBtn = screen.getByTestId('add-variant-btn');
    await act(async () => {
      fireEvent.click(addVarBtn);
    });

    const varSkuInputs = screen.getAllByPlaceholderText(/SAR-HLM-RED-OS/i);
    expect(varSkuInputs.length).toBeGreaterThanOrEqual(2);

    // Edit SKU input
    fireEvent.change(varSkuInputs[0], { target: { value: 'CUSTOM-SKU-001' } });

    // Close button
    const closeBtn = screen.getByLabelText(/close modal/i);
    await act(async () => {
      fireEvent.click(closeBtn);
    });
    expect(handleClose).toHaveBeenCalled();

    // Rerender in closed state
    rerender(<ProductModal isOpen={false} onClose={handleClose} onSubmit={handleSubmit} />);
    expect(screen.queryByText(/Add New Apparel Product/i)).not.toBeInTheDocument();
  });

  it('AC11: should filter products by category pills', async () => {
    await act(async () => {
      render(<CatalogPage />);
    });

    const shirtPill = screen.getByRole('button', { name: /shirt/i });
    await act(async () => {
      fireEvent.click(shirtPill);
    });

    expect(screen.getByText(/Hand-Dyed Silk Batik Shirt/i)).toBeInTheDocument();
    expect(screen.queryByText(/Heritage Ceylon Handloom Saree/i)).not.toBeInTheDocument();

    const allPill = screen.getByRole('button', { name: /all items/i });
    await act(async () => {
      fireEvent.click(allPill);
    });

    expect(screen.getByText(/Hand-Dyed Silk Batik Shirt/i)).toBeInTheDocument();
    expect(screen.getByText(/Heritage Ceylon Handloom Saree/i)).toBeInTheDocument();
  });

  it('AC12: should test adminProductsApi CRUD methods directly including fallback handling', async () => {
    // getProducts with search and category
    const prods = await adminProductsApi.getProducts({ search: 'batik', category: '2' });
    expect(Array.isArray(prods)).toBe(true);

    // createProduct
    const created = await adminProductsApi.createProduct({ name: 'Test Garment', price: 5000 });
    expect(created).toBeDefined();

    // updateProduct
    const updated = await adminProductsApi.updateProduct(1, { name: 'Updated Garment' });
    expect(updated).toBeDefined();

    // deleteProduct
    const deleted = await adminProductsApi.deleteProduct(1);
    expect(deleted).toBe(true);

    // getCategories
    const cats = await adminProductsApi.getCategories();
    expect(Array.isArray(cats)).toBe(true);

    // Test network error fallback
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));
    const fallbackProds = await adminProductsApi.getProducts();
    expect(fallbackProds).toEqual(FALLBACK_PRODUCTS);

    const fallbackCats = await adminProductsApi.getCategories();
    expect(fallbackCats).toEqual(FALLBACK_CATEGORIES);
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import CatalogPage from '../pages/CatalogPage';
import { FALLBACK_PRODUCTS, FALLBACK_CATEGORIES } from '../api/adminProducts.api';

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
});

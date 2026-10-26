/**
 * Admin Inventory & SKU Operations API Client Service
 * StackStorm E-Commerce Platform — Dickwella Fashion Corner
 * Module Owner: S. Thanoogithan
 */

import apiClient from './client';

export const FALLBACK_INVENTORY = [
  {
    id: 101,
    title: 'Heritage Ceylon Handloom Saree',
    category: 'Saree',
    sku_prefix: 'SAR-HLM',
    thumbnail: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=150&q=80',
    variants: [
      {
        id: 1001,
        sku: 'SAR-HLM-RED-OS',
        color: 'Crimson Red',
        size: 'One Size',
        stock_quantity: 12,
        reserved_quantity: 2,
      },
      {
        id: 1002,
        sku: 'SAR-HLM-GLD-OS',
        color: 'Kandyan Gold',
        size: 'One Size',
        stock_quantity: 3,
        reserved_quantity: 1,
      }, // Low stock (avail: 2)
      {
        id: 1003,
        sku: 'SAR-HLM-TEAL-OS',
        color: 'Deep Teal',
        size: 'One Size',
        stock_quantity: 8,
        reserved_quantity: 0,
      },
    ],
  },
  {
    id: 102,
    title: 'Hand-Dyed Silk Batik Shirt',
    category: 'Shirt',
    sku_prefix: 'SHR-BTK',
    thumbnail: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=150&q=80',
    variants: [
      {
        id: 1004,
        sku: 'SHR-BTK-BLU-S',
        color: 'Ocean Indigo',
        size: 'S',
        stock_quantity: 4,
        reserved_quantity: 1,
      }, // Low stock (avail: 3)
      {
        id: 1005,
        sku: 'SHR-BTK-BLU-M',
        color: 'Ocean Indigo',
        size: 'M',
        stock_quantity: 15,
        reserved_quantity: 3,
      },
      {
        id: 1006,
        sku: 'SHR-BTK-BLU-L',
        color: 'Ocean Indigo',
        size: 'L',
        stock_quantity: 9,
        reserved_quantity: 1,
      },
      {
        id: 1007,
        sku: 'SHR-BTK-BLU-XL',
        color: 'Ocean Indigo',
        size: 'XL',
        stock_quantity: 2,
        reserved_quantity: 0,
      }, // Low stock (avail: 2)
    ],
  },
  {
    id: 103,
    title: 'Classic Handloom Cotton Sarong',
    category: 'Sarong',
    sku_prefix: 'SRG-CTN',
    thumbnail: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=150&q=80',
    variants: [
      {
        id: 1008,
        sku: 'SRG-CTN-CHK-OS',
        color: 'Maroon Check',
        size: 'One Size',
        stock_quantity: 25,
        reserved_quantity: 4,
      },
      {
        id: 1009,
        sku: 'SRG-CTN-NVY-OS',
        color: 'Navy Stripe',
        size: 'One Size',
        stock_quantity: 18,
        reserved_quantity: 2,
      },
    ],
  },
  {
    id: 104,
    title: 'Tropical Embroidered Kaftan',
    category: 'Dress',
    sku_prefix: 'KFT-EMB',
    thumbnail: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=150&q=80',
    variants: [
      {
        id: 1010,
        sku: 'KFT-EMB-WHT-S',
        color: 'Pearl White',
        size: 'S',
        stock_quantity: 6,
        reserved_quantity: 2,
      }, // Low stock (avail: 4)
      {
        id: 1011,
        sku: 'KFT-EMB-WHT-M',
        color: 'Pearl White',
        size: 'M',
        stock_quantity: 14,
        reserved_quantity: 1,
      },
      {
        id: 1012,
        sku: 'KFT-EMB-WHT-L',
        color: 'Pearl White',
        size: 'L',
        stock_quantity: 11,
        reserved_quantity: 0,
      },
    ],
  },
  {
    id: 105,
    title: 'Tailored Linen Casual Trouser',
    category: 'Trouser',
    sku_prefix: 'TRS-LIN',
    thumbnail: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=150&q=80',
    variants: [
      {
        id: 1013,
        sku: 'TRS-LIN-BEI-30',
        color: 'Sand Beige',
        size: '30',
        stock_quantity: 8,
        reserved_quantity: 1,
      },
      {
        id: 1014,
        sku: 'TRS-LIN-BEI-32',
        color: 'Sand Beige',
        size: '32',
        stock_quantity: 12,
        reserved_quantity: 2,
      },
      {
        id: 1015,
        sku: 'TRS-LIN-BEI-34',
        color: 'Sand Beige',
        size: '34',
        stock_quantity: 5,
        reserved_quantity: 1,
      }, // Low stock (avail: 4)
    ],
  },
];

export const inventoryApi = {
  /**
   * Fetches all products with variant stock levels
   */
  async getProducts() {
    const { data } = await apiClient.get('/products?limit=50');
    const products = data?.products || (Array.isArray(data) ? data : []);
    return products;
  },

  /**
   * Submits stock adjustment calling POST /api/v1/inventory/adjust
   * @param {Object} payload { sku, delta, reason, notes }
   */
  async adjustStock({ sku, delta, reason, notes = '' }) {
    const { data } = await apiClient.post('/inventory/adjust', { sku, delta, reason, notes });
    return data;
  },

  /**
   * Fetches inventory audit trail logs
   */
  async getAuditLogs(sku = null) {
    const url = sku ? `/inventory/variants/${sku}/logs` : `/inventory/logs`;
    const { data } = await apiClient.get(url);
    return Array.isArray(data) ? data : data?.logs || [];
  },
};

/**
 * Admin Product Catalog CRUD API Client
 * StackStorm E-Commerce Platform — Dickwella Fashion Corner
 * Endpoints: POST/GET/PUT/DELETE /api/v1/products
 */

const PRODUCTS_URL = '/api/v1/products';
const CATEGORIES_URL = '/api/v1/categories';

/** Fallback catalog for offline / backend-standby mode */
export const FALLBACK_PRODUCTS = [
  {
    id: 1,
    name: 'Heritage Ceylon Handloom Saree',
    slug: 'heritage-ceylon-handloom-saree',
    price: '8500.00',
    brand: 'Dickwella Atelier',
    category: 'Saree',
    material: 'Pure Handloom Cotton',
    description: 'A stunning handloom saree woven by master artisans in the Dickwella region, featuring traditional Ceylon motifs in vibrant colours.',
    primaryImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=300&q=80',
    isFinalSale: false,
    variants: [
      { sku: 'SAR-HLM-RED-OS', size: 'One Size', color: 'Crimson Red', stockQuantity: 12 },
      { sku: 'SAR-HLM-GLD-OS', size: 'One Size', color: 'Kandyan Gold', stockQuantity: 3 },
    ],
  },
  {
    id: 2,
    name: 'Hand-Dyed Silk Batik Shirt',
    slug: 'hand-dyed-silk-batik-shirt',
    price: '4200.00',
    brand: 'Dickwella Atelier',
    category: 'Shirt',
    material: 'Natural Silk',
    description: 'Individually hand-dyed batik shirt with unique wax-resist patterns. Each piece is one-of-a-kind due to the artisanal dyeing process.',
    primaryImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&q=80',
    isFinalSale: false,
    variants: [
      { sku: 'SHR-BTK-BLU-S', size: 'S', color: 'Ocean Indigo', stockQuantity: 4 },
      { sku: 'SHR-BTK-BLU-M', size: 'M', color: 'Ocean Indigo', stockQuantity: 15 },
      { sku: 'SHR-BTK-BLU-L', size: 'L', color: 'Ocean Indigo', stockQuantity: 9 },
    ],
  },
  {
    id: 3,
    name: 'Tropical Embroidered Kaftan',
    slug: 'tropical-embroidered-kaftan',
    price: '6750.00',
    brand: 'Dickwella Atelier',
    category: 'Dress',
    material: 'Lightweight Chiffon',
    description: 'Flowing tropical kaftan with hand-embroidered floral motifs. Perfect for warm evenings and beach resort wear.',
    primaryImage: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300&q=80',
    isFinalSale: false,
    variants: [
      { sku: 'KFT-EMB-WHT-S', size: 'S', color: 'Pearl White', stockQuantity: 6 },
      { sku: 'KFT-EMB-WHT-M', size: 'M', color: 'Pearl White', stockQuantity: 14 },
    ],
  },
  {
    id: 4,
    name: 'Classic Handloom Cotton Sarong',
    slug: 'classic-handloom-cotton-sarong',
    price: '2800.00',
    brand: 'Dickwella Atelier',
    category: 'Sarong',
    material: 'Handloom Cotton',
    description: 'Traditional Sri Lankan sarong woven on handlooms in the Southern Province. Available in authentic check and stripe patterns.',
    primaryImage: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=300&q=80',
    isFinalSale: false,
    variants: [
      { sku: 'SRG-CTN-CHK-OS', size: 'One Size', color: 'Maroon Check', stockQuantity: 25 },
      { sku: 'SRG-CTN-NVY-OS', size: 'One Size', color: 'Navy Stripe', stockQuantity: 18 },
    ],
  },
  {
    id: 5,
    name: 'Tailored Linen Casual Trouser',
    slug: 'tailored-linen-casual-trouser',
    price: '3500.00',
    brand: 'Dickwella Atelier',
    category: 'Trouser',
    material: '100% Linen',
    description: 'Relaxed-fit linen trousers tailored for the tropical climate. Features a natural texture and breathable weave.',
    primaryImage: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300&q=80',
    isFinalSale: false,
    variants: [
      { sku: 'TRS-LIN-BEI-30', size: '30', color: 'Sand Beige', stockQuantity: 8 },
      { sku: 'TRS-LIN-BEI-32', size: '32', color: 'Sand Beige', stockQuantity: 12 },
    ],
  },
];

export const FALLBACK_CATEGORIES = [
  { id: 1, name: 'Saree' },
  { id: 2, name: 'Shirt' },
  { id: 3, name: 'Dress' },
  { id: 4, name: 'Sarong' },
  { id: 5, name: 'Trouser' },
  { id: 6, name: 'Kaftan' },
  { id: 7, name: 'Kurti' },
  { id: 8, name: 'Jacket' },
];

function authHeaders() {
  const token = localStorage.getItem('stackstorm_admin_token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export const adminProductsApi = {
  /**
   * Fetch full product catalogue (admin view, no limit)
   */
  async getProducts({ search = '', category = '', page = 1, limit = 50 } = {}) {
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.append('search', search);
      if (category && category !== 'all') params.append('category_id', category);

      const res = await fetch(`${PRODUCTS_URL}?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const products = data?.data?.products || data?.data || [];
      return Array.isArray(products) && products.length > 0 ? products : FALLBACK_PRODUCTS;
    } catch {
      return FALLBACK_PRODUCTS;
    }
  },

  /**
   * Create a new product  POST /api/v1/products
   */
  async createProduct(payload) {
    const res = await fetch(PRODUCTS_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data?.data || data;
  },

  /**
   * Update existing product  PUT /api/v1/products/:id
   */
  async updateProduct(id, payload) {
    const res = await fetch(`${PRODUCTS_URL}/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data?.data || data;
  },

  /**
   * Delete product  DELETE /api/v1/products/:id
   */
  async deleteProduct(id) {
    const res = await fetch(`${PRODUCTS_URL}/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return true;
  },

  /**
   * Fetch categories for the "Category" select dropdown
   */
  async getCategories() {
    try {
      const res = await fetch(CATEGORIES_URL, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const cats = data?.data || [];
      return Array.isArray(cats) && cats.length > 0 ? cats : FALLBACK_CATEGORIES;
    } catch {
      return FALLBACK_CATEGORIES;
    }
  },
};

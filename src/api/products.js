import { http } from '../lib/http';
import { cleanParams } from '../lib/format';

/** GET /admin/products?status=active|archived&search&category_id&page -> { products, pagination } */
export const listProducts = (params) =>
  http.get('/admin/products', { params: cleanParams(params) });

export const getProduct = (id) => http.get(`/admin/products/${id}`);

/** POST /admin/products with { ...fields, variants: [{ size, color, additional_price, stock_quantity }] } */
export const createProduct = (product) => http.post('/admin/products', product);

/** PUT /admin/products/:id; also archives and restores via { is_active } */
export const updateProduct = (id, fields) => http.put(`/admin/products/${id}`, fields);

/** DELETE /admin/products/:id; 409 when the product was ever ordered (archive it instead) */
export const deleteProduct = (id) => http.delete(`/admin/products/${id}`);

export const addVariant = (productId, variant) =>
  http.post(`/admin/products/${productId}/variants`, variant);

export const updateVariant = (productId, variantId, fields) =>
  http.patch(`/admin/products/${productId}/variants/${variantId}`, fields);

export const deleteVariant = (productId, variantId) =>
  http.delete(`/admin/products/${productId}/variants/${variantId}`);

/** GET /categories -> top-level categories with `children` */
export const listCategories = () => http.get('/categories');

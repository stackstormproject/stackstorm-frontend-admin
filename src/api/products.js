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

/**
 * POST /upload/images (multipart, field "images", JPEG/PNG/WebP up to 5 MB each) -> { urls }.
 * Without S3 the backend stores files itself and returns /api/v1/media/... links (#179).
 */
export const uploadImages = (files) => {
  const form = new FormData();
  [...files].forEach((file) => form.append('images', file));
  return http.post('/upload/images', form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

/** GET /admin/brands -> every brand with its product count (#179) */
export const listBrands = () => http.get('/admin/brands');

/** POST /admin/brands with { name, tagline, logo_url, is_featured, sort_order } */
export const createBrand = (brand) => http.post('/admin/brands', brand);

/** PUT /admin/brands/:id; renaming also renames the brand on its products */
export const updateBrand = (id, fields) => http.put(`/admin/brands/${id}`, fields);

/** DELETE /admin/brands/:id; products keep their brand name */
export const deleteBrand = (id) => http.delete(`/admin/brands/${id}`);

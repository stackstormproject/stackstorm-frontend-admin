/** Client-side checks that mirror the backend rules (adminProduct.service, #136). */
export const LIMITS = Object.freeze({
  nameMax: 120,
  textMax: 2000,
  priceMax: 1000000,
  stockMax: 10000,
  sizeMax: 20,
  colorMax: 30,
  variantsMax: 30,
});

// An image is an http(s) link or a file uploaded to the backend (/api/v1/media/...).
export const IMAGE_PATTERN = /^(https?:\/\/\S+|\/api\/v1\/media\/[\w./-]+)$/i;
export const MAX_EXTRA_IMAGES = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const emptyProduct = () => ({
  name: '',
  category_id: '',
  price: '',
  brand: '',
  material: '',
  description: '',
  care_instructions: '',
  primary_image: '',
  gallery_images: [],
  is_final_sale: false,
  is_new_arrival: false,
  is_popular: false,
});

export const emptyVariant = () => ({
  size: '',
  color: '',
  additional_price: '0',
  stock_quantity: '0',
});

/** Form values from an API product (numbers and nulls become strings). */
export const productToForm = (product) => ({
  name: product.name || '',
  category_id: product.category_id ? String(product.category_id) : '',
  price: String(product.price ?? ''),
  brand: product.brand || '',
  material: product.material || '',
  description: product.description || '',
  care_instructions: product.care_instructions || '',
  primary_image: product.primary_image || '',
  gallery_images: product.gallery_images || [],
  is_final_sale: Boolean(product.is_final_sale),
  is_new_arrival: Boolean(product.is_new_arrival),
  is_popular: Boolean(product.is_popular),
});

const isMoney = (value, { allowZero }) => {
  if (String(value).trim() === '') return false;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= (allowZero ? 0 : 0.01) && amount <= LIMITS.priceMax;
};

export const validateProduct = (values) => {
  const errors = {};
  const name = values.name.trim();
  if (name.length < 2 || name.length > LIMITS.nameMax) {
    errors.name = `Enter a name of 2-${LIMITS.nameMax} characters.`;
  }
  if (!values.category_id) errors.category_id = 'Choose a category so shoppers can find it.';
  if (!isMoney(values.price, { allowZero: false })) {
    errors.price = 'Enter a price in rupees, for example 4500.';
  }
  const image = values.primary_image.trim();
  if (image && !IMAGE_PATTERN.test(image)) errors.primary_image = 'Upload the photo again.';
  if (!image && values.gallery_images.length) {
    errors.primary_image = 'Add a main photo before the extra photos.';
  }
  return errors;
};

/** Errors per row index and field, e.g. { 0: { size: '…' } }. */
export const validateVariants = (variants, { requireStock = true } = {}) => {
  const errors = {};
  const seen = new Set();
  variants.forEach((variant, index) => {
    const rowErrors = {};
    const size = variant.size.trim();
    if (!size) rowErrors.size = 'Enter a size, e.g. M or Free size.';
    else if (size.length > LIMITS.sizeMax) rowErrors.size = `At most ${LIMITS.sizeMax} characters.`;
    if (variant.color.trim().length > LIMITS.colorMax) {
      rowErrors.color = `At most ${LIMITS.colorMax} characters.`;
    }
    if (!isMoney(variant.additional_price, { allowZero: true })) {
      rowErrors.additional_price = 'Enter 0 or more.';
    }
    if (requireStock) {
      const stock = Number(variant.stock_quantity);
      if (!Number.isInteger(stock) || stock < 0 || stock > LIMITS.stockMax) {
        rowErrors.stock_quantity = `Whole number, 0-${LIMITS.stockMax}.`;
      }
    }
    const key = `${size.toLowerCase()}|${variant.color.trim().toLowerCase()}`;
    if (size && seen.has(key)) rowErrors.size = 'This size and colour is listed twice.';
    seen.add(key);
    if (Object.keys(rowErrors).length) errors[index] = rowErrors;
  });
  return errors;
};

export const productPayload = (values) => ({
  name: values.name.trim(),
  category_id: Number(values.category_id),
  price: Number(values.price),
  brand: values.brand.trim() || null,
  material: values.material.trim() || null,
  description: values.description.trim() || null,
  care_instructions: values.care_instructions.trim() || null,
  primary_image: values.primary_image.trim() || null,
  gallery_images: values.gallery_images.slice(0, MAX_EXTRA_IMAGES),
  is_final_sale: values.is_final_sale,
  is_new_arrival: values.is_new_arrival,
  is_popular: values.is_popular,
});

export const variantPayload = (variant, { withStock = true } = {}) => ({
  size: variant.size.trim(),
  color: variant.color.trim() || null,
  additional_price: Number(variant.additional_price),
  ...(withStock ? { stock_quantity: Number(variant.stock_quantity) } : {}),
});

/** Flattens the /categories tree into option groups: parents with their children. */
export const categoryGroups = (tree = []) =>
  tree.map((parent) => ({
    id: parent.id,
    name: parent.name,
    options: [parent, ...(parent.children || [])].map((category) => ({
      id: category.id,
      label: category.id === parent.id ? `${parent.name} (general)` : category.name,
    })),
  }));

/** Why a picked file cannot be uploaded, or null when it can. */
export const imageFileProblem = (file) => {
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name} is not a JPEG, PNG or WebP photo.`;
  if (file.size > MAX_IMAGE_BYTES) return `${file.name} is larger than 5 MB.`;
  return null;
};

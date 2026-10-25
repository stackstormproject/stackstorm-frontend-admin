import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Layers,
  Tag,
  AlertCircle,
  Check,
} from 'lucide-react';
import { FALLBACK_CATEGORIES } from '../../api/adminProducts.api';

const SIZES = ['One Size', 'XS', 'S', 'M', 'L', 'XL', '2XL', '28', '30', '32', '34', '36'];

export default function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  product = null,
  categories = FALLBACK_CATEGORIES,
}) {
  const isEdit = Boolean(product && product.id);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'Saree',
    categoryId: 1,
    brand: 'Dickwella Atelier',
    price: '',
    material: '',
    careInstructions: '',
    description: '',
    primaryImage: '',
    isFinalSale: false,
    variants: [
      {
        sku: '',
        size: 'One Size',
        color: 'Natural',
        stockQuantity: 10,
        additionalPrice: 0,
      },
    ],
  });

  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        category: product.category || 'Saree',
        categoryId: product.categoryId || 1,
        brand: product.brand || 'Dickwella Atelier',
        price: product.price ? String(product.price) : '',
        material: product.material || '',
        careInstructions: product.careInstructions || product.care_instructions || '',
        description: product.description || '',
        primaryImage: product.primaryImage || product.primary_image || '',
        isFinalSale: Boolean(product.isFinalSale ?? product.is_final_sale),
        variants:
          Array.isArray(product.variants) && product.variants.length > 0
            ? product.variants.map((v) => ({
                id: v.id,
                sku: v.sku || '',
                size: v.size || 'One Size',
                color: v.color || 'Natural',
                stockQuantity: v.stockQuantity ?? v.stock_quantity ?? 0,
                additionalPrice: v.additionalPrice ?? v.additional_price ?? 0,
              }))
            : [
                {
                  sku: '',
                  size: 'One Size',
                  color: 'Natural',
                  stockQuantity: 10,
                  additionalPrice: 0,
                },
              ],
      });
      setFormErrors({});
    } else {
      // Reset for new product
      setFormData({
        name: '',
        slug: '',
        category: 'Saree',
        categoryId: 1,
        brand: 'Dickwella Atelier',
        price: '',
        material: 'Pure Handloom Cotton',
        careInstructions: 'Dry clean only or cold gentle hand wash with mild detergent.',
        description: '',
        primaryImage: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&q=80',
        isFinalSale: false,
        variants: [
          {
            sku: 'SAR-HLM-NEW-01',
            size: 'One Size',
            color: 'Ceylon Indigo',
            stockQuantity: 15,
            additionalPrice: 0,
          },
        ],
      });
      setFormErrors({});
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Auto-generate slug when name changes
      if (field === 'name' && !isEdit) {
        next.slug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return next;
    });
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleVariantChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedVariants = [...prev.variants];
      updatedVariants[index] = {
        ...updatedVariants[index],
        [field]: value,
      };
      return { ...prev, variants: updatedVariants };
    });
  };

  const handleAddVariant = () => {
    const categoryPrefix = (formData.category || 'SKU').substring(0, 3).toUpperCase();
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const newSku = `${categoryPrefix}-NEW-${randomSuffix}`;

    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          sku: newSku,
          size: 'M',
          color: 'Natural',
          stockQuantity: 10,
          additionalPrice: 0,
        },
      ],
    }));
  };

  const handleRemoveVariant = (index) => {
    if (formData.variants.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required';
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      errors.price = 'Valid price in LKR is required (greater than 0)';
    }
    if (!formData.category) errors.category = 'Please select a category';

    formData.variants.forEach((v, idx) => {
      if (!v.sku || !v.sku.trim()) {
        errors[`variant_${idx}_sku`] = 'SKU is required';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        variants: formData.variants.map((v) => ({
          ...v,
          stockQuantity: Number(v.stockQuantity) || 0,
          stock_quantity: Number(v.stockQuantity) || 0,
          additionalPrice: Number(v.additionalPrice) || 0,
        })),
      };

      await onSubmit(payload, product?.id);
      onClose();
    } catch (err) {
      setFormErrors((prev) => ({
        ...prev,
        submit: err.message || 'Failed to save product specification',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="product-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="product-modal-container">
        {/* Header */}
        <div className="product-modal-header">
          <div className="modal-title-group">
            <span className="modal-kicker">
              {isEdit ? 'Catalog Revision' : 'Artisanal Creation'} • Dickwella Atelier
            </span>
            <h2 id="product-modal-title" className="product-modal-title">
              {isEdit ? 'Edit Garment Specification' : 'Add New Apparel Product'}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Error Banner */}
        {formErrors.submit && (
          <div className="modal-alert-banner" role="alert">
            <AlertCircle size={16} />
            <span>{formErrors.submit}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="product-modal-form">
          <div className="form-sections-grid">
            {/* Section 1: Basic Garment Info */}
            <div className="form-section-card">
              <div className="section-card-header">
                <Tag size={16} className="section-icon" />
                <h3>Garment Identity & Pricing</h3>
              </div>

              <div className="form-group">
                <label htmlFor="prod-name">
                  Product Title <span className="req">*</span>
                </label>
                <input
                  id="prod-name"
                  type="text"
                  placeholder="e.g. Heritage Ceylon Handloom Saree"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className={formErrors.name ? 'input-error' : ''}
                  data-testid="product-name-input"
                />
                {formErrors.name && <span className="field-error-text">{formErrors.name}</span>}
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="prod-category">
                    Category <span className="req">*</span>
                  </label>
                  <select
                    id="prod-category"
                    value={formData.category}
                    onChange={(e) => {
                      const selectedCat = categories.find((c) => c.name === e.target.value);
                      handleFieldChange('category', e.target.value);
                      if (selectedCat) {
                        handleFieldChange('categoryId', selectedCat.id);
                      }
                    }}
                    data-testid="product-category-select"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="prod-brand">Brand / Atelier</label>
                  <input
                    id="prod-brand"
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleFieldChange('brand', e.target.value)}
                    placeholder="Dickwella Atelier"
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="prod-price">
                    Base Price (LKR) <span className="req">*</span>
                  </label>
                  <input
                    id="prod-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="8500.00"
                    value={formData.price}
                    onChange={(e) => handleFieldChange('price', e.target.value)}
                    className={formErrors.price ? 'input-error' : ''}
                    data-testid="product-price-input"
                  />
                  {formErrors.price && <span className="field-error-text">{formErrors.price}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="prod-slug">SEO URL Slug</label>
                  <input
                    id="prod-slug"
                    type="text"
                    value={formData.slug}
                    onChange={(e) => handleFieldChange('slug', e.target.value)}
                    placeholder="auto-generated-slug"
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label" htmlFor="prod-final-sale">
                  <input
                    id="prod-final-sale"
                    type="checkbox"
                    checked={formData.isFinalSale}
                    onChange={(e) => handleFieldChange('isFinalSale', e.target.checked)}
                  />
                  <span>Mark as Final Sale (Not eligible for 30-Day Return / Refund)</span>
                </label>
              </div>
            </div>

            {/* Section 2: Craftsmanship & Media */}
            <div className="form-section-card">
              <div className="section-card-header">
                <Sparkles size={16} className="section-icon" />
                <h3>Fabrication & Visual Asset</h3>
              </div>

              <div className="form-group">
                <label htmlFor="prod-material">Fabric & Material Composition</label>
                <input
                  id="prod-material"
                  type="text"
                  placeholder="e.g. 100% Handloom Cotton / Ceylon Silk"
                  value={formData.material}
                  onChange={(e) => handleFieldChange('material', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="prod-care">Care & Handling Instructions</label>
                <input
                  id="prod-care"
                  type="text"
                  placeholder="e.g. Dry clean recommended or cold gentle hand wash"
                  value={formData.careInstructions}
                  onChange={(e) => handleFieldChange('careInstructions', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="prod-desc">Artisanal Story & Description</label>
                <textarea
                  id="prod-desc"
                  rows={3}
                  placeholder="Describe the silhouette, cultural inspiration, weaving technique..."
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="prod-image">Primary Showcase Image URL</label>
                <div className="image-input-preview-box">
                  <input
                    id="prod-image"
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.primaryImage}
                    onChange={(e) => handleFieldChange('primaryImage', e.target.value)}
                  />
                  {formData.primaryImage && (
                    <img
                      src={formData.primaryImage}
                      alt="Garment Preview"
                      className="form-image-thumbnail"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: SKU Variants Matrix */}
          <div className="form-section-card variants-matrix-card">
            <div className="section-card-header">
              <div className="variants-header-title">
                <Layers size={16} className="section-icon" />
                <h3>Product Variant Matrix (SKUs & Stock)</h3>
                <span className="variant-counter-badge">
                  {formData.variants.length} Variant{formData.variants.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                type="button"
                className="add-variant-btn"
                onClick={handleAddVariant}
                data-testid="add-variant-btn"
              >
                <Plus size={14} />
                <span>Add Variant SKU</span>
              </button>
            </div>

            <div className="variants-table-container">
              <table className="variants-form-table">
                <thead>
                  <tr>
                    <th>
                      Variant SKU <span className="req">*</span>
                    </th>
                    <th>Size</th>
                    <th>Colorway</th>
                    <th>Initial Stock</th>
                    <th>Price Delta (LKR)</th>
                    <th style={{ width: '48px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.variants.map((variant, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          placeholder="e.g. SAR-HLM-RED-OS"
                          value={variant.sku}
                          onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                          className={
                            formErrors[`variant_${index}_sku`]
                              ? 'input-error variant-input'
                              : 'variant-input'
                          }
                          data-testid={`variant-sku-${index}`}
                        />
                      </td>
                      <td>
                        <select
                          value={variant.size}
                          onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                          className="variant-select"
                        >
                          {SIZES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Colorway"
                          value={variant.color}
                          onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                          className="variant-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          value={variant.stockQuantity}
                          onChange={(e) =>
                            handleVariantChange(index, 'stockQuantity', e.target.value)
                          }
                          className="variant-input variant-num"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={variant.additionalPrice}
                          onChange={(e) =>
                            handleVariantChange(index, 'additionalPrice', e.target.value)
                          }
                          className="variant-input variant-num"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="variant-delete-btn"
                          onClick={() => handleRemoveVariant(index)}
                          disabled={formData.variants.length <= 1}
                          title={
                            formData.variants.length <= 1
                              ? 'At least one variant is required'
                              : 'Remove Variant'
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="product-modal-footer">
            <button
              type="button"
              className="modal-cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-submit-btn"
              disabled={isSubmitting}
              data-testid="save-product-btn"
            >
              <Check size={16} />
              <span>
                {isSubmitting
                  ? 'Saving Garment...'
                  : isEdit
                    ? 'Update Product Details'
                    : 'Publish Garment to Catalog'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

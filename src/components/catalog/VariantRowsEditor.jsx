import { Plus, Trash2 } from 'lucide-react';
import { FormField } from '../ui/FormField';
import { emptyVariant, LIMITS } from '../../lib/productForm';

/** Sizes for a new product: each row is a size/colour with an extra price and opening stock. */
export function VariantRowsEditor({ variants, errors, onChange }) {
  const update = (index, field) => (event) =>
    onChange(variants.map((v, i) => (i === index ? { ...v, [field]: event.target.value } : v)));

  return (
    <div className="variant-rows">
      {variants.map((variant, index) => {
        const rowErrors = errors[index] || {};
        return (
          // Rows have no stable id until saved; the index is the identity here.
          // eslint-disable-next-line react/no-array-index-key
          <fieldset key={index} className="variant-row">
            <legend className="visually-hidden">Size {index + 1}</legend>
            <FormField
              label="Size"
              value={variant.size}
              onChange={update(index, 'size')}
              error={rowErrors.size}
              maxLength={LIMITS.sizeMax}
              placeholder="M"
            />
            <FormField
              label="Colour"
              value={variant.color}
              onChange={update(index, 'color')}
              error={rowErrors.color}
              maxLength={LIMITS.colorMax}
              placeholder="Indigo"
            />
            <FormField
              label="Extra price"
              type="number"
              min="0"
              step="0.01"
              value={variant.additional_price}
              onChange={update(index, 'additional_price')}
              error={rowErrors.additional_price}
            />
            <FormField
              label="Opening stock"
              type="number"
              min="0"
              step="1"
              value={variant.stock_quantity}
              onChange={update(index, 'stock_quantity')}
              error={rowErrors.stock_quantity}
            />
            <button
              type="button"
              className="icon-btn variant-row__remove"
              aria-label={`Remove size ${index + 1}`}
              disabled={variants.length === 1}
              onClick={() => onChange(variants.filter((_, i) => i !== index))}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </fieldset>
        );
      })}
      <button
        type="button"
        className="btn btn--secondary btn--small"
        disabled={variants.length >= LIMITS.variantsMax}
        onClick={() => onChange([...variants, emptyVariant()])}
      >
        <Plus size={14} aria-hidden="true" />
        Add another size
      </button>
    </div>
  );
}

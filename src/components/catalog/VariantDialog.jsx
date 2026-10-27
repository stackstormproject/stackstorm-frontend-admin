import { useState } from 'react';
import { addVariant, updateVariant } from '../../api/products';
import { Dialog } from '../ui/Dialog';
import { FormField } from '../ui/FormField';
import { emptyVariant, LIMITS, validateVariants, variantPayload } from '../../lib/productForm';

/**
 * Adds a size (with opening stock) or edits one. A size that has been ordered or is held
 * keeps its size and colour (#136): only its extra price can change.
 */
export function VariantDialog({ productId, variant, onClose, onSaved }) {
  const editing = Boolean(variant);
  const locked = editing && variant.in_use;
  const [values, setValues] = useState(() =>
    editing
      ? {
          size: variant.size || '',
          color: variant.color || '',
          additional_price: String(variant.additional_price ?? 0),
          stock_quantity: '0',
        }
      : emptyVariant()
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validateVariants([values], { requireStock: !editing })[0] || {};
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      if (!editing) {
        await addVariant(productId, variantPayload(values));
      } else if (locked) {
        await updateVariant(productId, variant.id, {
          additional_price: Number(values.additional_price),
        });
      } else {
        await updateVariant(productId, variant.id, variantPayload(values, { withStock: false }));
      }
      onSaved(editing ? 'Size updated' : 'Size added');
    } catch (error) {
      setFormError(error.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title={editing ? `Edit ${variant.sku}` : 'Add a size'}
      description={
        locked
          ? 'This size has been ordered, so its size and colour stay as they are. You can change its extra price.'
          : undefined
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="variant-form" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="variant-form" className="form-grid" onSubmit={submit} noValidate>
        {formError && (
          <p className="form-error form-grid__wide" role="alert">
            {formError}
          </p>
        )}
        <FormField
          label="Size"
          value={values.size}
          onChange={set('size')}
          error={errors.size}
          maxLength={LIMITS.sizeMax}
          disabled={locked}
        />
        <FormField
          label="Colour"
          value={values.color}
          onChange={set('color')}
          error={errors.color}
          maxLength={LIMITS.colorMax}
          disabled={locked}
        />
        <FormField
          label="Extra price (LKR)"
          type="number"
          min="0"
          step="0.01"
          value={values.additional_price}
          onChange={set('additional_price')}
          error={errors.additional_price}
        />
        {!editing && (
          <FormField
            label="Opening stock"
            type="number"
            min="0"
            step="1"
            value={values.stock_quantity}
            onChange={set('stock_quantity')}
            error={errors.stock_quantity}
          />
        )}
      </form>
    </Dialog>
  );
}

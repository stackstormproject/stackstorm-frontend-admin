import { FormField } from '../ui/FormField';
import { LIMITS } from '../../lib/productForm';

/** The product's own fields, shared by the create and edit pages. */
export function ProductFields({ values, errors, onChange, categories }) {
  const set = (field) => (event) =>
    onChange({
      ...values,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });

  return (
    <div className="form-grid">
      <div className="form-grid__wide">
        <FormField
          label="Product name"
          value={values.name}
          onChange={set('name')}
          error={errors.name}
          maxLength={LIMITS.nameMax}
          required
        />
      </div>
      <FormField
        as="select"
        label="Category"
        value={values.category_id}
        onChange={set('category_id')}
        error={errors.category_id}
        required
      >
        <option value="">Choose a category</option>
        {categories.map((group) => (
          <optgroup key={group.id} label={group.name}>
            {group.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </FormField>
      <FormField
        label="Price (LKR)"
        type="number"
        inputMode="decimal"
        min="1"
        step="0.01"
        value={values.price}
        onChange={set('price')}
        error={errors.price}
        hint="Base price; a size can add an extra amount"
        required
      />
      <FormField label="Brand" value={values.brand} onChange={set('brand')} maxLength={120} />
      <FormField
        label="Material"
        value={values.material}
        onChange={set('material')}
        maxLength={120}
      />
      <div className="form-grid__wide">
        <FormField
          label="Image link"
          type="url"
          value={values.primary_image}
          onChange={set('primary_image')}
          error={errors.primary_image}
          hint="https:// address of the main photo"
        />
      </div>
      <div className="form-grid__wide">
        <FormField
          as="textarea"
          label="Description"
          value={values.description}
          onChange={set('description')}
          maxLength={LIMITS.textMax}
        />
      </div>
      <div className="form-grid__wide">
        <FormField
          as="textarea"
          label="Care instructions"
          value={values.care_instructions}
          onChange={set('care_instructions')}
          maxLength={LIMITS.textMax}
        />
      </div>
      <label className="checkbox form-grid__wide">
        <input type="checkbox" checked={values.is_final_sale} onChange={set('is_final_sale')} />
        Final sale: cannot be returned or exchanged
      </label>
    </div>
  );
}

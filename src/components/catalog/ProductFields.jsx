import { Link } from 'react-router-dom';
import { FormField } from '../ui/FormField';
import { ImageUploader } from './ImageUploader';
import { LIMITS } from '../../lib/productForm';

/** The product's own fields, shared by the create and edit pages. */
export function ProductFields({ values, errors, onChange, categories, brands = [] }) {
  const toggleOnSale = (event) => {
    const onSale = event.target.checked;
    onChange({
      ...values,
      on_sale: onSale,
      discount_percentage: onSale ? values.discount_percentage : '',
    });
  };
  const brandNames = brands.map((b) => b.name);
  const unknownBrand = values.brand && !brandNames.includes(values.brand);
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
      <FormField
        as="select"
        label="Brand"
        value={values.brand}
        onChange={set('brand')}
        hint={
          <>
            Shown under “Our brands”. <Link to="/brands">Manage brands</Link>
          </>
        }
      >
        <option value="">No brand</option>
        {unknownBrand && <option value={values.brand}>{values.brand}</option>}
        {brandNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </FormField>
      <FormField
        label="Material"
        value={values.material}
        onChange={set('material')}
        maxLength={120}
      />
      <div className="form-grid__wide">
        <ImageUploader
          main={values.primary_image}
          extras={values.gallery_images}
          error={errors.primary_image}
          onChange={(images) => onChange({ ...values, ...images })}
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
      <fieldset className="form-grid__wide sale-field">
        <legend className="field__label">Sale (#203)</legend>
        <label className="checkbox">
          <input type="checkbox" checked={values.on_sale} onChange={toggleOnSale} />
          On sale
        </label>
        {values.on_sale && (
          <FormField
            label="Discount percentage"
            type="number"
            inputMode="decimal"
            min="1"
            max="90"
            step="0.01"
            value={values.discount_percentage}
            onChange={set('discount_percentage')}
            error={errors.discount_percentage}
            hint="Applied to the base price; appears in the shop's “Sale” section."
            required
          />
        )}
      </fieldset>
      <fieldset className="form-grid__wide sections-field">
        <legend className="field__label">Home page sections</legend>
        <label className="checkbox">
          <input type="checkbox" checked={values.is_new_arrival} onChange={set('is_new_arrival')} />
          Show in “New arrivals”
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={values.is_popular} onChange={set('is_popular')} />
          Show in “Popular now”
        </label>
      </fieldset>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { focusFirstError } from '../lib/focus';
import { createProduct, listCategories } from '../api/products';
import { useResource } from '../hooks/useResource';
import { useToast } from '../state/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { ProductFields } from '../components/catalog/ProductFields';
import { VariantRowsEditor } from '../components/catalog/VariantRowsEditor';
import {
  categoryGroups,
  emptyProduct,
  emptyVariant,
  productPayload,
  validateProduct,
  validateVariants,
  variantPayload,
} from '../lib/productForm';

export default function ProductNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const categories = useResource(listCategories, []);
  const [values, setValues] = useState(emptyProduct);
  const [variants, setVariants] = useState(() => [emptyVariant()]);
  const [errors, setErrors] = useState({});
  const [variantErrors, setVariantErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const found = validateProduct(values);
    const foundVariants = validateVariants(variants);
    setErrors(found);
    setVariantErrors(foundVariants);
    setFormError(null);
    if (Object.keys(found).length || Object.keys(foundVariants).length) {
      setFormError('Check the highlighted fields.');
      focusFirstError(event.currentTarget);
      return;
    }
    setBusy(true);
    try {
      const created = await createProduct({
        ...productPayload(values),
        variants: variants.map((variant) => variantPayload(variant)),
      });
      toast.success(`${created.name} is now in the shop`);
      navigate(`/products/${created.id}`, { replace: true });
    } catch (error) {
      setFormError(error.message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        back={{ to: '/products', label: 'All products' }}
        eyebrow="Catalogue"
        title="New product"
        description="The product goes live in the shop as soon as it is saved. Opening stock is recorded in the stock history."
      />
      <form className="stack" onSubmit={submit} noValidate>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <section className="card" aria-labelledby="details-title">
          <h2 id="details-title" className="card__title">
            Details
          </h2>
          <ProductFields
            values={values}
            errors={errors}
            onChange={setValues}
            categories={categoryGroups(categories.data || [])}
          />
        </section>
        <section className="card" aria-labelledby="sizes-title">
          <h2 id="sizes-title" className="card__title">
            Sizes and stock
          </h2>
          <VariantRowsEditor variants={variants} errors={variantErrors} onChange={setVariants} />
        </section>
        <div className="btn-row btn-row--end">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => navigate('/products')}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </form>
    </>
  );
}

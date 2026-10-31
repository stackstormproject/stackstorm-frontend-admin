import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteProduct,
  deleteVariant,
  getProduct,
  listBrands,
  listCategories,
  updateProduct,
} from '../api/products';
import { useResource } from '../hooks/useResource';
import { useToast } from '../state/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ErrorState, LoadingState } from '../components/ui/States';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProductFields } from '../components/catalog/ProductFields';
import { VariantDialog } from '../components/catalog/VariantDialog';
import { categoryGroups, productPayload, productToForm, validateProduct } from '../lib/productForm';
import { formatDateTime, formatMoney } from '../lib/format';
import { focusFirstError } from '../lib/focus';

function DetailsForm({ product, categories, brands, onSaved }) {
  const [values, setValues] = useState(() => productToForm(product));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  // Pick up server changes (e.g. after archiving) without losing the form identity.
  useEffect(() => {
    setValues(productToForm(product));
  }, [product]);

  const submit = async (event) => {
    event.preventDefault();
    const found = validateProduct(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) {
      focusFirstError(event.currentTarget);
      return;
    }
    setBusy(true);
    try {
      await updateProduct(product.id, productPayload(values));
      toast.success('Product details saved');
      onSaved();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit} noValidate aria-labelledby="details-title">
      <h2 id="details-title">Details</h2>
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <ProductFields
        values={values}
        errors={errors}
        onChange={setValues}
        categories={categories}
        brands={brands}
      />
      <div className="btn-row btn-row--end">
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save details'}
        </button>
      </div>
    </form>
  );
}

export default function ProductEditPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const product = useResource(() => getProduct(productId), [productId]);
  const categories = useResource(listCategories, []);
  // The brand list only fills the brand menu; the form still works without it.
  const brands = useResource(() => listBrands().catch(() => []), []);
  const [variantDialog, setVariantDialog] = useState(null); // { variant } or { variant: null }
  const [confirm, setConfirm] = useState(null);

  if (product.loading && !product.data) return <LoadingState label="Loading the product" />;
  if (product.error) {
    return (
      <ErrorState
        level={1}
        title={
          product.error.status === 404 ? 'Product not found' : 'The product could not be loaded'
        }
        error={product.error}
        onRetry={product.error.status === 404 ? undefined : product.reload}
      />
    );
  }

  const { data } = product;
  const lastVariant = data.variants.length <= 1;
  const removeHint = (variant) => {
    if (variant.in_use) return 'Ordered or held: it cannot be removed';
    if (lastVariant) return 'A product needs at least one size';
    return undefined;
  };

  const askArchive = () =>
    setConfirm({
      title: data.is_active ? 'Archive product' : 'Put product back in the shop',
      description: data.is_active
        ? 'Shoppers can no longer find or buy it. Orders, returns and stock history are kept.'
        : 'It becomes visible and purchasable again.',
      confirmLabel: data.is_active ? 'Archive' : 'Restore',
      run: async () => {
        await updateProduct(data.id, { is_active: !data.is_active });
        toast.success(data.is_active ? 'Product archived' : 'Product is back in the shop');
        setConfirm(null);
        product.reload();
      },
    });

  const askDelete = () =>
    setConfirm({
      title: 'Delete product',
      description:
        'Only a product that was never ordered or held can be deleted. Otherwise archive it.',
      confirmLabel: 'Delete permanently',
      danger: true,
      run: async () => {
        await deleteProduct(data.id);
        toast.success(`${data.name} was deleted`);
        navigate('/products', { replace: true });
      },
    });

  const askRemoveVariant = (variant) =>
    setConfirm({
      title: `Remove ${variant.size}${variant.color ? ` · ${variant.color}` : ''}`,
      description: 'Its stock history is deleted with it.',
      confirmLabel: 'Remove size',
      danger: true,
      run: async () => {
        await deleteVariant(data.id, variant.id);
        toast.success('Size removed');
        setConfirm(null);
        product.reload();
      },
    });

  return (
    <>
      <PageHeader
        back={{ to: '/products', label: 'All products' }}
        eyebrow={data.category_name || 'Catalogue'}
        title={data.name}
        actions={
          <>
            <button type="button" className="btn btn--secondary" onClick={askArchive}>
              {data.is_active ? 'Archive' : 'Restore to shop'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={askDelete}>
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          </>
        }
      />
      <p className="order-status">
        <StatusBadge status={data.is_active ? 'active' : 'archived'} />
        <span className="muted">
          {formatMoney(data.price)} · {data.total_available} available · updated{' '}
          {formatDateTime(data.updated_at)}
        </span>
      </p>

      <div className="detail-grid">
        <DetailsForm
          product={data}
          categories={categoryGroups(categories.data || [])}
          brands={brands.data || []}
          onSaved={product.reload}
        />

        <section className="card card--flush" aria-labelledby="sizes-title">
          <div className="card__header">
            <h2 id="sizes-title">Sizes</h2>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => setVariantDialog({ variant: null })}
            >
              <Plus size={14} aria-hidden="true" />
              Add size
            </button>
          </div>
          <ul className="variant-list">
            {data.variants.map((variant) => (
              <li key={variant.id} className="variant-list__item">
                <div>
                  <strong>
                    {variant.size}
                    {variant.color ? ` · ${variant.color}` : ''}
                  </strong>
                  <span className="cell-sub mono">{variant.sku}</span>
                  <span className="cell-sub">
                    {formatMoney(Number(data.price) + Number(variant.additional_price))}
                    {Number(variant.additional_price) > 0 &&
                      ` (+${formatMoney(variant.additional_price)})`}
                  </span>
                  <span className="cell-sub">
                    {variant.available} available
                    {variant.reserved_quantity > 0 && `, ${variant.reserved_quantity} held`}
                    {' · '}
                    <Link to={`/inventory?search=${encodeURIComponent(variant.sku)}`}>
                      Adjust stock
                    </Link>
                  </span>
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Edit ${variant.sku}`}
                    onClick={() => setVariantDialog({ variant })}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remove ${variant.sku}`}
                    disabled={variant.in_use || lastVariant}
                    title={removeHint(variant)}
                    onClick={() => askRemoveVariant(variant)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="card__foot muted">
            Sizes that were ordered keep their size and colour; only the extra price can change.
          </p>
        </section>
      </div>

      {variantDialog && (
        <VariantDialog
          productId={data.id}
          variant={variantDialog.variant}
          onClose={() => setVariantDialog(null)}
          onSaved={(message) => {
            setVariantDialog(null);
            toast.success(message);
            product.reload();
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          onConfirm={confirm.run}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}

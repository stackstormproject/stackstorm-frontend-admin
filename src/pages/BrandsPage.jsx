import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { createBrand, deleteBrand, listBrands, updateBrand, uploadImages } from '../api/products';
import { useResource } from '../hooks/useResource';
import { useToast } from '../state/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField } from '../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { imageFileProblem } from '../lib/productForm';

const emptyBrand = { name: '', tagline: '', logo_url: '', is_featured: true, sort_order: '0' };

/** Add or edit one brand, with an optional uploaded logo. */
function BrandDialog({ brand, onClose, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState(() =>
    brand
      ? {
          name: brand.name,
          tagline: brand.tagline || '',
          logo_url: brand.logo_url || '',
          is_featured: brand.is_featured,
          sort_order: String(brand.sort_order),
        }
      : emptyBrand
  );
  const [error, setError] = useState(null);
  const [nameError, setNameError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) =>
    setValues({
      ...values,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });

  const uploadLogo = async (file) => {
    if (!file) return;
    const problem = imageFileProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { urls } = await uploadImages([file]);
      setValues((v) => ({ ...v, logo_url: urls[0] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const name = values.name.trim();
    if (name.length < 2) {
      setNameError('Enter a brand name of 2-60 characters.');
      return;
    }
    setNameError(null);
    setBusy(true);
    setError(null);
    const payload = {
      name,
      tagline: values.tagline.trim() || null,
      logo_url: values.logo_url || null,
      is_featured: values.is_featured,
      sort_order: Number(values.sort_order) || 0,
    };
    try {
      if (brand) await updateBrand(brand.id, payload);
      else await createBrand(payload);
      toast.success(brand ? `${name} saved` : `${name} added`);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title={brand ? `Edit ${brand.name}` : 'New brand'}
      description="Featured brands with products on sale appear under “Our brands” in the shop."
      onClose={onClose}
    >
      <form className="stack" onSubmit={submit} noValidate>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <FormField
          label="Brand name"
          value={values.name}
          onChange={set('name')}
          error={nameError}
          maxLength={60}
          hint={brand ? 'Renaming also renames it on its products.' : undefined}
          required
        />
        <FormField
          label="Tagline"
          value={values.tagline}
          onChange={set('tagline')}
          maxLength={120}
        />
        <div className="logo-field">
          {values.logo_url ? (
            <img src={values.logo_url} alt="Brand logo" className="logo-field__preview" />
          ) : (
            <span className="logo-field__preview logo-field__preview--empty" aria-hidden="true" />
          )}
          <label className="btn btn--secondary">
            {values.logo_url ? 'Change logo' : 'Upload logo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="visually-hidden"
              onChange={(event) => uploadLogo(event.target.files?.[0])}
            />
          </label>
          {values.logo_url && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setValues({ ...values, logo_url: '' })}
            >
              Remove logo
            </button>
          )}
        </div>
        <FormField
          label="Order on the home page"
          type="number"
          min="0"
          max="999"
          value={values.sort_order}
          onChange={set('sort_order')}
          hint="Lower numbers come first."
        />
        <label className="checkbox">
          <input type="checkbox" checked={values.is_featured} onChange={set('is_featured')} />
          Show under “Our brands”
        </label>
        <div className="btn-row btn-row--end">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save brand'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Brands for the shop's "Our brands" section (#179). */
export default function BrandsPage() {
  const toast = useToast();
  const brands = useResource(listBrands, []);
  const [editing, setEditing] = useState(null); // { brand } or { brand: null }
  const [removing, setRemoving] = useState(null);

  return (
    <>
      <PageHeader
        eyebrow="Catalogue"
        title="Brands"
        description="Choose the brands shown under “Our brands” on the shop’s home page."
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setEditing({ brand: null })}
          >
            <Plus size={16} aria-hidden="true" />
            New brand
          </button>
        }
      />
      <section className="card card--flush" aria-label="Brand list">
        {brands.loading && <LoadingState label="Loading brands" />}
        {brands.error && <ErrorState error={brands.error} onRetry={brands.reload} />}
        {brands.data && brands.data.length === 0 && (
          <EmptyState title="No brands yet">
            Add a brand, then choose it on its products.
          </EmptyState>
        )}
        {brands.data && brands.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Brand</th>
                  <th scope="col" className="num">
                    Products
                  </th>
                  <th scope="col">In the shop</th>
                  <th scope="col" className="num">
                    Order
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {brands.data.map((brand) => (
                  <tr key={brand.id}>
                    <td>
                      <div className="line-item">
                        {brand.logo_url ? (
                          <img src={brand.logo_url} alt="" className="line-item__image" />
                        ) : (
                          <span className="line-item__image brand-initial" aria-hidden="true">
                            {brand.name[0]}
                          </span>
                        )}
                        <span>
                          <strong>{brand.name}</strong>
                          {brand.tagline && <span className="cell-sub">{brand.tagline}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="num">{brand.product_count}</td>
                    <td>
                      {brand.is_featured ? (
                        <span className="badge badge--success">Featured</span>
                      ) : (
                        <span className="badge">Hidden</span>
                      )}
                    </td>
                    <td className="num">{brand.sort_order}</td>
                    <td className="num">
                      <div className="btn-row btn-row--end">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Edit ${brand.name}`}
                          onClick={() => setEditing({ brand })}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Delete ${brand.name}`}
                          onClick={() => setRemoving(brand)}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <BrandDialog
          brand={editing.brand}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            brands.reload();
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={`Delete ${removing.name}`}
          description="It disappears from “Our brands”. Its products keep the brand name."
          confirmLabel="Delete brand"
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await deleteBrand(removing.id);
            toast.success(`${removing.name} deleted`);
            setRemoving(null);
            brands.reload();
          }}
        />
      )}
    </>
  );
}

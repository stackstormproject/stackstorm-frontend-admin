import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { listBanners, saveBanner, clearBanner } from '../api/banners';
import { uploadImages } from '../api/products';
import { useResource } from '../hooks/useResource';
import { useToast } from '../state/ToastContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField } from '../components/ui/FormField';
import { ErrorState, LoadingState } from '../components/ui/States';
import { imageFileProblem } from '../lib/productForm';

const SLOTS = [1, 2, 3];
const emptySlot = () => ({
  title: '',
  subtitle: '',
  image_url: '',
  button_text: '',
  button_link: '',
  is_active: true,
});

/** Internal link validation mirrors banner.service's LINK_PATTERN (no off-site buttons). */
const LINK_PATTERN = /^\/[\w\-./?=&%]*$/;

/** Add or replace the one banner in a slot (1, 2 or 3). */
function BannerDialog({ slot, banner, onClose, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState(() =>
    banner
      ? {
          title: banner.title,
          subtitle: banner.subtitle || '',
          image_url: banner.image_url || '',
          button_text: banner.button_text || '',
          button_link: banner.button_link || '',
          is_active: banner.is_active,
        }
      : emptySlot()
  );
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) =>
    setValues({
      ...values,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });

  const uploadImage = async (file) => {
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
      setValues((v) => ({ ...v, image_url: urls[0] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const validate = () => {
    const found = {};
    const title = values.title.trim();
    if (title.length < 2 || title.length > 120) {
      found.title = 'Enter a title of 2-120 characters.';
    }
    if (!values.image_url.trim()) found.image_url = 'Upload a photo for this banner.';
    const hasText = values.button_text.trim().length > 0;
    const hasLink = values.button_link.trim().length > 0;
    if (hasText !== hasLink) {
      found.button_link = 'A button needs both a label and a link, or neither.';
    } else if (hasLink && !LINK_PATTERN.test(values.button_link.trim())) {
      found.button_link = 'Use a path within the shop, such as /sale.';
    }
    return found;
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setError(null);
    try {
      await saveBanner(slot, {
        title: values.title.trim(),
        subtitle: values.subtitle.trim() || null,
        image_url: values.image_url,
        button_text: values.button_text.trim() || null,
        button_link: values.button_link.trim() || null,
        is_active: values.is_active,
      });
      toast.success(`Banner ${slot} saved`);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title={banner ? `Edit banner ${slot}` : `Add banner ${slot}`}
      description="Shown in rotation on the shop's home page."
      onClose={onClose}
    >
      <form className="stack" onSubmit={submit} noValidate>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <FormField
          label="Title"
          value={values.title}
          onChange={set('title')}
          error={errors.title}
          maxLength={120}
          required
        />
        <FormField
          label="Subtitle (optional)"
          value={values.subtitle}
          onChange={set('subtitle')}
          maxLength={240}
        />
        <div className="logo-field">
          {values.image_url ? (
            <img src={values.image_url} alt="Banner" className="logo-field__preview" />
          ) : (
            <span className="logo-field__preview logo-field__preview--empty" aria-hidden="true" />
          )}
          <label className="btn btn--secondary">
            {values.image_url ? 'Change photo' : 'Upload photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="visually-hidden"
              onChange={(event) => uploadImage(event.target.files?.[0])}
            />
          </label>
        </div>
        {errors.image_url && (
          <p className="field__error" role="alert">
            {errors.image_url}
          </p>
        )}
        <FormField
          label="Button label (optional)"
          value={values.button_text}
          onChange={set('button_text')}
          maxLength={40}
          hint="Leave both the label and link empty for a banner with no button."
        />
        <FormField
          label="Button link (optional)"
          value={values.button_link}
          onChange={set('button_link')}
          error={errors.button_link}
          maxLength={300}
          placeholder="/sale"
          hint="A path within the shop, such as /sale or /shop/women."
        />
        <label className="checkbox">
          <input type="checkbox" checked={values.is_active} onChange={set('is_active')} />
          Show on the home page
        </label>
        <div className="btn-row btn-row--end">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save banner'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** The shop's three home page hero banners (#204): one per slot, in slot order. */
export default function BannersPage() {
  const toast = useToast();
  const banners = useResource(listBanners, []);
  const [editingSlot, setEditingSlot] = useState(null); // slot number or null
  const [clearingSlot, setClearingSlot] = useState(null);

  const bySlot = new Map((banners.data || []).map((b) => [b.slot, b]));

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Hero banners"
        description="The three banners shown in rotation on the shop's home page. A slot with no banner keeps its default artwork."
      />
      {banners.loading && <LoadingState label="Loading banners" />}
      {banners.error && <ErrorState error={banners.error} onRetry={banners.reload} />}
      {banners.data && (
        <div className="banner-slots">
          {SLOTS.map((slot) => {
            const banner = bySlot.get(slot);
            return (
              <section key={slot} className="card banner-slot" aria-label={`Banner slot ${slot}`}>
                <div className="banner-slot__media">
                  {banner?.image_url ? (
                    <img src={banner.image_url} alt="" />
                  ) : (
                    <span className="banner-slot__empty">No banner</span>
                  )}
                </div>
                <div className="banner-slot__body">
                  <p className="cell-sub">Slot {slot}</p>
                  {banner ? (
                    <>
                      <strong>{banner.title}</strong>
                      {banner.subtitle && <p className="muted">{banner.subtitle}</p>}
                      <p className="muted">
                        {banner.is_active ? 'Shown on the home page' : 'Hidden'}
                        {banner.button_text && ` · Button: ${banner.button_text}`}
                      </p>
                    </>
                  ) : (
                    <p className="muted">Empty — the default artwork shows instead.</p>
                  )}
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={() => setEditingSlot(slot)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                    {banner ? 'Edit' : 'Add banner'}
                  </button>
                  {banner && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Clear banner ${slot}`}
                      onClick={() => setClearingSlot(slot)}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editingSlot && (
        <BannerDialog
          slot={editingSlot}
          banner={bySlot.get(editingSlot)}
          onClose={() => setEditingSlot(null)}
          onSaved={() => {
            setEditingSlot(null);
            banners.reload();
          }}
        />
      )}
      {clearingSlot && (
        <ConfirmDialog
          title={`Clear banner ${clearingSlot}`}
          description="The slot goes back to its default artwork on the home page."
          confirmLabel="Clear banner"
          danger
          onClose={() => setClearingSlot(null)}
          onConfirm={async () => {
            await clearBanner(clearingSlot);
            toast.success(`Banner ${clearingSlot} cleared`);
            setClearingSlot(null);
            banners.reload();
          }}
        />
      )}
    </>
  );
}

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createPromoCode,
  deletePromoCode,
  listPromoCodes,
  updatePromoCode,
} from '../api/promoCodes';
import { useResource } from '../hooks/useResource';
import { useToast } from '../state/ToastContext';
import { formatMoney } from '../lib/format';
import { PageHeader } from '../components/ui/PageHeader';
import { Dialog } from '../components/ui/Dialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField } from '../components/ui/FormField';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';

const CODE_PATTERN = /^[A-Z0-9-]{3,32}$/;

const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

const emptyPromo = () => ({
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_amount: '0',
  max_discount_amount: '',
  start_date: toDateInput(new Date().toISOString()),
  end_date: '',
  usage_limit: '',
  is_active: true,
});

/** Add or edit one promo code (#205). */
function PromoCodeDialog({ promo, onClose, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState(() =>
    promo
      ? {
          code: promo.code,
          discount_type: promo.discount_type,
          discount_value: String(promo.discount_value),
          min_order_amount: String(promo.min_order_amount),
          max_discount_amount:
            promo.max_discount_amount != null ? String(promo.max_discount_amount) : '',
          start_date: toDateInput(promo.start_date),
          end_date: toDateInput(promo.end_date),
          usage_limit: promo.usage_limit != null ? String(promo.usage_limit) : '',
          is_active: promo.is_active,
        }
      : emptyPromo()
  );
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) =>
    setValues({
      ...values,
      [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
    });

  const validate = () => {
    const found = {};
    const code = values.code.trim().toUpperCase();
    if (!CODE_PATTERN.test(code)) {
      found.code = '3-32 characters: capital letters, numbers and hyphens only.';
    }
    const value = Number(values.discount_value);
    if (!Number.isFinite(value) || value <= 0) {
      found.discount_value = 'Enter a discount greater than 0.';
    } else if (values.discount_type === 'percentage' && value > 100) {
      found.discount_value = 'A percentage discount cannot exceed 100.';
    }
    const min = Number(values.min_order_amount);
    if (!Number.isFinite(min) || min < 0) found.min_order_amount = 'Enter 0 or more.';
    if (values.max_discount_amount && Number(values.max_discount_amount) < 0) {
      found.max_discount_amount = 'Enter 0 or more, or leave it empty.';
    }
    if (!values.start_date) found.start_date = 'Choose a start date.';
    if (!values.end_date) found.end_date = 'Choose an end date.';
    if (values.start_date && values.end_date && values.end_date <= values.start_date) {
      found.end_date = 'Must be after the start date.';
    }
    if (
      values.usage_limit &&
      (!Number.isInteger(Number(values.usage_limit)) || Number(values.usage_limit) < 1)
    ) {
      found.usage_limit = 'Enter a positive whole number, or leave it empty.';
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
    const payload = {
      code: values.code.trim().toUpperCase(),
      discount_type: values.discount_type,
      discount_value: Number(values.discount_value),
      min_order_amount: Number(values.min_order_amount) || 0,
      max_discount_amount: values.max_discount_amount ? Number(values.max_discount_amount) : null,
      start_date: values.start_date,
      end_date: values.end_date,
      usage_limit: values.usage_limit ? Number(values.usage_limit) : null,
      is_active: values.is_active,
    };
    try {
      if (promo) await updatePromoCode(promo.id, payload);
      else await createPromoCode(payload);
      toast.success(promo ? `${payload.code} saved` : `${payload.code} added`);
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      title={promo ? `Edit ${promo.code}` : 'New promo code'}
      description="Shoppers enter this code at checkout for a discount off their subtotal."
      onClose={onClose}
      wide
    >
      <form className="stack" onSubmit={submit} noValidate>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-grid">
          <FormField
            label="Code"
            value={values.code}
            onChange={(e) => set('code')({ target: { value: e.target.value.toUpperCase() } })}
            error={errors.code}
            maxLength={32}
            placeholder="WELCOME10"
            required
          />
          <FormField
            as="select"
            label="Discount type"
            value={values.discount_type}
            onChange={set('discount_type')}
            required
          >
            <option value="percentage">Percentage off</option>
            <option value="fixed_amount">Fixed amount off</option>
          </FormField>
          <FormField
            label={values.discount_type === 'percentage' ? 'Discount (%)' : 'Discount (LKR)'}
            type="number"
            min="0.01"
            step="0.01"
            value={values.discount_value}
            onChange={set('discount_value')}
            error={errors.discount_value}
            required
          />
          <FormField
            label="Minimum order (LKR)"
            type="number"
            min="0"
            step="0.01"
            value={values.min_order_amount}
            onChange={set('min_order_amount')}
            error={errors.min_order_amount}
          />
          <FormField
            label="Maximum discount (LKR, optional)"
            type="number"
            min="0"
            step="0.01"
            value={values.max_discount_amount}
            onChange={set('max_discount_amount')}
            error={errors.max_discount_amount}
            hint="Caps a percentage discount. Leave empty for no cap."
          />
          <FormField
            label="Usage limit (optional)"
            type="number"
            min="1"
            step="1"
            value={values.usage_limit}
            onChange={set('usage_limit')}
            error={errors.usage_limit}
            hint="Leave empty for unlimited use."
          />
          <FormField
            label="Start date"
            type="date"
            value={values.start_date}
            onChange={set('start_date')}
            error={errors.start_date}
            required
          />
          <FormField
            label="End date"
            type="date"
            value={values.end_date}
            onChange={set('end_date')}
            error={errors.end_date}
            required
          />
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={values.is_active} onChange={set('is_active')} />
          Active
        </label>
        <div className="btn-row btn-row--end">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save code'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

/** Promo codes shoppers redeem at checkout (#205). */
export default function PromoCodesPage() {
  const toast = useToast();
  const promoCodes = useResource(listPromoCodes, []);
  const [editing, setEditing] = useState(null); // { promo } or { promo: null }
  const [removing, setRemoving] = useState(null);

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Promo codes"
        description="Codes shoppers enter at checkout for a discount off their subtotal."
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setEditing({ promo: null })}
          >
            <Plus size={16} aria-hidden="true" />
            New code
          </button>
        }
      />
      <section className="card card--flush" aria-label="Promo code list">
        {promoCodes.loading && <LoadingState label="Loading promo codes" />}
        {promoCodes.error && <ErrorState error={promoCodes.error} onRetry={promoCodes.reload} />}
        {promoCodes.data && promoCodes.data.length === 0 && (
          <EmptyState title="No promo codes yet">
            Add a code for shoppers to use at checkout.
          </EmptyState>
        )}
        {promoCodes.data && promoCodes.data.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Code</th>
                  <th scope="col">Discount</th>
                  <th scope="col">Window</th>
                  <th scope="col" className="num">
                    Used
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {promoCodes.data.map((promo) => (
                  <tr key={promo.id}>
                    <td>
                      <strong>{promo.code}</strong>
                      {Number(promo.min_order_amount) > 0 && (
                        <span className="cell-sub">
                          Min order {formatMoney(promo.min_order_amount)}
                        </span>
                      )}
                    </td>
                    <td>
                      {promo.discount_type === 'percentage'
                        ? `${promo.discount_value}%`
                        : formatMoney(promo.discount_value)}
                      {promo.max_discount_amount != null && (
                        <span className="cell-sub">
                          Up to {formatMoney(promo.max_discount_amount)}
                        </span>
                      )}
                    </td>
                    <td>
                      {toDateInput(promo.start_date)} – {toDateInput(promo.end_date)}
                    </td>
                    <td className="num">
                      {promo.times_used}
                      {promo.usage_limit != null && ` / ${promo.usage_limit}`}
                    </td>
                    <td>
                      {promo.is_active ? (
                        <span className="badge badge--success">Active</span>
                      ) : (
                        <span className="badge">Inactive</span>
                      )}
                    </td>
                    <td className="num">
                      <div className="btn-row btn-row--end">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Edit ${promo.code}`}
                          onClick={() => setEditing({ promo })}
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label={`Delete ${promo.code}`}
                          onClick={() => setRemoving(promo)}
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
        <PromoCodeDialog
          promo={editing.promo}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            promoCodes.reload();
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title={`Delete ${removing.code}`}
          description="Shoppers can no longer use this code at checkout."
          confirmLabel="Delete code"
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await deletePromoCode(removing.id);
            toast.success(`${removing.code} deleted`);
            setRemoving(null);
            promoCodes.reload();
          }}
        />
      )}
    </>
  );
}
